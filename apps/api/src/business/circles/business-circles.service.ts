import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type {
  Circle,
  NetworkContact,
} from "../../generated/prisma/client.js";
import { Prisma } from "../../generated/prisma/client.js";
import { PrismaService } from "../../prisma/prisma.service.js";
import { BusinessContextService } from "../business-context.service.js";
import type {
  BusinessContext,
  CircleTypeConfigEntry,
} from "../business.types.js";
import { mapCircle, mapCircleActivity } from "../business.mappers.js";
import { accessQuotas } from "../business.rules.js";
import type {
  AddCircleMemberDto,
  BusinessCircleQueryDto,
  CreateCircleDto,
  UpdateCircleDto,
} from "../dto/business.dto.js";
import { pageParams, pageResult, slicePage } from "../business.utils.js";

@Injectable()
export class BusinessCirclesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly context: BusinessContextService,
  ) {}

  async list(ctx: BusinessContext, query: BusinessCircleQueryDto) {
    const params = pageParams(query.page, query.limit, 25);
    const circles = await this.prisma.circle.findMany({
      where: {
        businessId: ctx.business.id,
        ...(query.type ? { type: query.type } : {}),
        ...(query.status ? { status: query.status } : {}),
      },
      include: { _count: { select: { activities: true } } },
      orderBy: { createdAt: "desc" },
    });

    const search = query.search?.trim().toLowerCase();
    const filtered = search
      ? circles.filter((circle) => {
          const config = (circle.config ?? {}) as Record<string, unknown>;
          return `${String(config.name ?? "")} ${circle.type}`
            .toLowerCase()
            .includes(search);
        })
      : circles;

    const paged = slicePage(filtered, params);
    return {
      ...pageResult(
        paged.map((circle) => ({
          ...mapCircle(circle),
          activityCount: circle._count.activities,
          memberCount: circle.memberIds.length,
          typeConfig: this.typeConfig(ctx, circle.type),
        })),
        filtered.length,
        params,
      ),
      types: ctx.config.circleTypes.filter((entry) => entry.enabled),
      quota: await this.circleQuota(ctx),
      mandatoryCircles: this.mandatoryStatuses(ctx, circles),
    };
  }

  async get(ctx: BusinessContext, circleId: string) {
    const circle = await this.findCircle(ctx, circleId);
    const [activities, contacts, lists] = await Promise.all([
      this.prisma.circleActivity.findMany({
        where: { circleId },
        orderBy: { at: "desc" },
        take: 100,
      }),
      circle.memberIds.length
        ? this.prisma.networkContact.findMany({
            where: {
              businessId: ctx.business.id,
              id: { in: circle.memberIds },
            },
          })
        : Promise.resolve([]),
      circle.sourceListIds.length
        ? this.prisma.networkList.findMany({
            where: {
              businessId: ctx.business.id,
              id: { in: circle.sourceListIds },
            },
          })
        : Promise.resolve([]),
    ]);

    const contactIds = new Set(contacts.map((contact) => contact.id));
    const businessIds = circle.memberIds.filter((id) => !contactIds.has(id));
    const businesses = businessIds.length
      ? await this.prisma.business.findMany({
          where: { id: { in: businessIds } },
        })
      : [];

    const contactsById = new Map(contacts.map((contact) => [contact.id, contact]));
    const businessesById = new Map(
      businesses.map((business) => [business.id, business]),
    );
    const members = circle.memberIds.map((memberId) => {
      const contact = contactsById.get(memberId);
      if (contact) return this.memberFromContact(contact);
      const business = businessesById.get(memberId);
      if (business) return this.memberFromBusiness(business);
      return {
        id: memberId,
        fullName: memberId,
        businessName: memberId,
        category: "Unknown",
        location: "",
        geography: "National",
        status: "inactive",
        role: "peripheral",
        tier: "Bronze",
        joinedAt: undefined,
        lastActiveAt: undefined,
        photoUrl: undefined,
      };
    });

    return {
      circle: {
        ...mapCircle(circle),
        activityCount: activities.length,
        memberCount: circle.memberIds.length,
        typeConfig: this.typeConfig(ctx, circle.type),
      },
      members,
      sourceLists: lists.map((list) => ({
        id: list.id,
        name: list.name,
        type: list.type,
        geography: list.geography,
        status: list.status,
        source: list.source,
      })),
      activity: activities.map(mapCircleActivity),
      stats: {
        total: members.length,
        active: members.filter((member) => member.status === "active").length,
        core: members.filter((member) => member.role === "core").length,
        peripheral: members.filter((member) => member.role === "peripheral")
          .length,
        bankers: members.filter((member) => member.role === "banker").length,
        pending: contacts.filter((contact) => contact.confirmation === "pending")
          .length,
      },
      quota: await this.circleQuota(ctx),
    };
  }

  async create(ctx: BusinessContext, dto: CreateCircleDto) {
    const typeConfig = this.requireType(ctx, dto.type);
    const sourceLists = await this.resolveLists(ctx, dto.sourceListIds ?? []);
    const memberIds = await this.resolveMemberIds(
      ctx,
      sourceLists.map((list) => list.id),
      dto.memberIds ?? [],
    );
    this.assertCapacity(typeConfig, memberIds, 0);
    await this.assertBanker(ctx, typeConfig, memberIds);
    this.assertDuration(typeConfig, dto.config.duration ?? 90);
    await this.assertQuota(ctx);

    const circle = await this.prisma.circle.create({
      data: {
        businessId: ctx.business.id,
        type: typeConfig.type,
        config: this.configJson(dto, typeConfig),
        memberIds,
        sourceListIds: sourceLists.map((list) => list.id),
        status: "Active",
      },
    });

    await this.prisma.circleActivity.create({
      data: {
        circleId: circle.id,
        kind: "update",
        message: `Circle created with ${memberIds.length} member${
          memberIds.length === 1 ? "" : "s"
        }`,
      },
    });
    await this.audit(ctx, "circle-created", circle.id, this.circleName(circle));

    return this.get(ctx, circle.id);
  }

  async update(ctx: BusinessContext, circleId: string, dto: UpdateCircleDto) {
    const circle = await this.findCircle(ctx, circleId);
    const typeConfig = this.requireType(ctx, circle.type, true);

    const sourceListIds =
      dto.sourceListIds !== undefined
        ? dto.sourceListIds
        : circle.sourceListIds;
    const sourceLists = await this.resolveLists(ctx, sourceListIds);
    let memberIds = circle.memberIds;
    if (dto.memberIds !== undefined || dto.sourceListIds !== undefined) {
      memberIds = await this.resolveMemberIds(
        ctx,
        sourceLists.map((list) => list.id),
        dto.memberIds ?? circle.memberIds,
      );
      this.assertCapacity(typeConfig, memberIds, 0);
      await this.assertBanker(ctx, typeConfig, memberIds);
    }

    const config = {
      ...this.configJsonFrom(circle),
      ...this.definedConfig(dto.config),
    };
    if (dto.config?.duration !== undefined) {
      this.assertDuration(typeConfig, dto.config.duration);
    }
    if (!String(config.name ?? "").trim()) {
      throw new BadRequestException("A circle must have a name.");
    }

    const updated = await this.prisma.circle.update({
      where: { id: circleId },
      data: {
        config: config as Prisma.InputJsonValue,
        memberIds,
        sourceListIds: sourceLists.map((list) => list.id),
        status: dto.status ?? circle.status,
      },
    });

    await this.prisma.circleActivity.create({
      data: {
        circleId,
        kind: "update",
        message: `${ctx.business.name} updated the circle configuration`,
      },
    });
    await this.audit(ctx, "circle-updated", updated.id, this.circleName(updated));

    return this.get(ctx, circleId);
  }

  async remove(ctx: BusinessContext, circleId: string) {
    const circle = await this.findCircle(ctx, circleId);
    await this.prisma.circle.delete({ where: { id: circleId } });
    await this.audit(ctx, "circle-deleted", circleId, this.circleName(circle));
    return { ok: true };
  }

  async addMember(
    ctx: BusinessContext,
    circleId: string,
    dto: AddCircleMemberDto,
  ) {
    const circle = await this.findCircle(ctx, circleId);
    if (circle.memberIds.includes(dto.memberId)) {
      throw new ConflictException("This member is already in the circle.");
    }
    const typeConfig = this.requireType(ctx, circle.type, true);
    const memberIds = [...circle.memberIds, dto.memberId];
    this.assertCapacity(typeConfig, memberIds, 0);

    const exists =
      (await this.prisma.networkContact.findFirst({
        where: { id: dto.memberId, businessId: ctx.business.id },
      })) ??
      (await this.prisma.business.findUnique({
        where: { id: dto.memberId },
      }));
    if (!exists) {
      throw new NotFoundException(`Member ${dto.memberId} not found`);
    }
    await this.assertBanker(ctx, typeConfig, memberIds);

    await this.prisma.$transaction(async (tx) => {
      await tx.circle.update({
        where: { id: circleId },
        data: { memberIds: { push: dto.memberId } },
      });
      await tx.circleActivity.create({
        data: {
          circleId,
          memberId: dto.memberId,
          kind: "join",
          message: `${ctx.business.name} added a member to the circle`,
        },
      });
    });

    return this.get(ctx, circleId);
  }

  async removeMember(
    ctx: BusinessContext,
    circleId: string,
    memberId: string,
  ) {
    const circle = await this.findCircle(ctx, circleId);
    if (!circle.memberIds.includes(memberId)) {
      throw new NotFoundException("This member is not in the circle.");
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.circle.update({
        where: { id: circleId },
        data: {
          memberIds: circle.memberIds.filter((id) => id !== memberId),
        },
      });
      await tx.circleActivity.create({
        data: {
          circleId,
          memberId,
          kind: "leave",
          message: `${ctx.business.name} removed a member from the circle`,
        },
      });
    });

    return this.get(ctx, circleId);
  }

  async activity(ctx: BusinessContext, circleId: string) {
    await this.findCircle(ctx, circleId);
    const activity = await this.prisma.circleActivity.findMany({
      where: { circleId },
      orderBy: { at: "desc" },
      take: 200,
    });
    return activity.map(mapCircleActivity);
  }

  // -------------------------------------------------------------------------
  // Internals
  // -------------------------------------------------------------------------

  private async findCircle(ctx: BusinessContext, circleId: string) {
    const circle = await this.prisma.circle.findFirst({
      where: { id: circleId, businessId: ctx.business.id },
    });
    if (!circle) throw new NotFoundException(`Circle ${circleId} not found`);
    return circle;
  }

  private requireType(
    ctx: BusinessContext,
    type: string,
    allowDisabled = false,
  ): CircleTypeConfigEntry {
    const entry = ctx.config.circleTypes.find((item) => item.type === type);
    if (!entry) {
      throw new ForbiddenException(`Circle type "${type}" is not configured.`);
    }
    if (!entry.enabled && !allowDisabled) {
      throw new ForbiddenException(`Circle type "${type}" is disabled.`);
    }
    return entry;
  }

  private async resolveLists(ctx: BusinessContext, ids: string[]) {
    if (ids.length === 0) return [];
    const unique = [...new Set(ids)];
    const lists = await this.prisma.networkList.findMany({
      where: { businessId: ctx.business.id, id: { in: unique } },
    });
    if (lists.length !== unique.length) {
      throw new NotFoundException("One or more source lists were not found.");
    }
    return lists;
  }

  private async resolveMemberIds(
    ctx: BusinessContext,
    sourceListIds: string[],
    explicit: string[],
  ) {
    const ids = new Set(explicit);
    if (sourceListIds.length > 0) {
      const contacts = await this.prisma.networkContact.findMany({
        where: { businessId: ctx.business.id, listId: { in: sourceListIds } },
        select: { id: true },
      });
      for (const contact of contacts) ids.add(contact.id);
    }
    return [...ids];
  }

  private assertCapacity(
    typeConfig: CircleTypeConfigEntry,
    memberIds: string[],
    added: number,
  ) {
    if (
      typeConfig.minMembers !== null &&
      memberIds.length < typeConfig.minMembers
    ) {
      throw new BadRequestException(
        `${typeConfig.shortLabel} circles need at least ${typeConfig.minMembers} members — ${memberIds.length} selected.`,
      );
    }
    if (
      typeConfig.maxMembers !== null &&
      memberIds.length + added > typeConfig.maxMembers
    ) {
      throw new ConflictException(
        `${typeConfig.shortLabel} circles allow at most ${typeConfig.maxMembers} members.`,
      );
    }
  }

  private assertDuration(typeConfig: CircleTypeConfigEntry, duration: number) {
    if (
      typeConfig.allowedDurations.length > 0 &&
      !typeConfig.allowedDurations.includes(duration)
    ) {
      throw new BadRequestException(
        `${typeConfig.shortLabel} circles allow ${typeConfig.allowedDurations.join(
          ", ",
        )} day durations.`,
      );
    }
  }

  private async assertBanker(
    ctx: BusinessContext,
    typeConfig: CircleTypeConfigEntry,
    memberIds: string[],
  ) {
    if (!typeConfig.requiresBanker) return;
    const banker = await this.prisma.networkContact.findFirst({
      where: {
        businessId: ctx.business.id,
        id: { in: memberIds },
        role: "banker",
      },
    });
    if (!banker) {
      throw new BadRequestException(
        `${typeConfig.shortLabel} circles require a designated Banker.`,
      );
    }
  }

  private async assertQuota(ctx: BusinessContext) {
    const [count, quota] = await Promise.all([
      this.prisma.circle.count({ where: { businessId: ctx.business.id } }),
      this.circleQuota(ctx),
    ]);
    if (quota > 0 && count >= quota) {
      throw new ForbiddenException({
        code: "CIRCLE_QUOTA_REACHED",
        message: `Your membership allows ${quota} circles.`,
      });
    }
  }

  private async circleQuota(ctx: BusinessContext) {
    const plan = ctx.membership.planId
      ? await this.prisma.membershipPlan.findUnique({
          where: { id: ctx.membership.planId },
        })
      : await this.prisma.membershipPlan.findFirst({
          where: {
            tier: ctx.membership.tier,
            variant: ctx.membership.variant,
            status: "Active",
          },
        });
    if (plan && plan.circleQuota > 0) return plan.circleQuota;
    return accessQuotas(ctx.config, ctx.membership).circles;
  }

  private mandatoryStatuses(ctx: BusinessContext, circles: Circle[]) {
    return ctx.config.mandatoryCircles
      .filter((rule) => rule.required)
      .map((rule) => {
        const circle = circles.find((entry) => entry.type === rule.circleType);
        return {
          ...rule,
          satisfied: Boolean(circle),
          circleId: circle?.id,
          current: circle?.memberIds.length ?? 0,
        };
      });
  }

  private configJson(dto: CreateCircleDto, typeConfig: CircleTypeConfigEntry) {
    return {
      name: dto.config.name.trim(),
      description: dto.config.description?.trim() ?? "",
      duration: dto.config.duration ?? typeConfig.allowedDurations[0] ?? 90,
      visibility: dto.config.visibility ?? "private",
      interactionLevel: dto.config.interactionLevel ?? "message",
    } satisfies Prisma.InputJsonObject;
  }

  private configJsonFrom(circle: Circle) {
    const config = (circle.config ?? {}) as Record<string, unknown>;
    return {
      name: String(config.name ?? ""),
      description: String(config.description ?? ""),
      duration: Number(config.duration ?? 90),
      visibility: String(config.visibility ?? "private"),
      interactionLevel: String(config.interactionLevel ?? "message"),
    };
  }

  private definedConfig(config: UpdateCircleDto["config"]) {
    if (!config) return {};
    return Object.fromEntries(
      Object.entries(config).filter(([, value]) => value !== undefined),
    );
  }

  private typeConfig(ctx: BusinessContext, type: string) {
    return ctx.config.circleTypes.find((entry) => entry.type === type);
  }

  private circleName(circle: Circle) {
    const config = (circle.config ?? {}) as Record<string, unknown>;
    return String(config.name ?? circle.type);
  }

  private memberFromContact(contact: NetworkContact) {
    return {
      id: contact.id,
      fullName: contact.fullName,
      businessName: contact.fullName,
      category: contact.category ?? "General",
      location: contact.location ?? "",
      geography: contact.geography ?? "National",
      status: contact.confirmation === "confirmed" ? "active" : "inactive",
      role: contact.role,
      tier: contact.tier,
      confirmation: contact.confirmation,
      joinedAt: contact.createdAt.toISOString(),
      lastActiveAt: contact.updatedAt.toISOString(),
      photoUrl: undefined,
    };
  }

  private memberFromBusiness(business: {
    id: string;
    name: string;
    contactName: string;
    category: string;
    city: string;
    tier: string;
    joinedAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: business.id,
      fullName: business.contactName,
      businessName: business.name,
      category: business.category,
      location: business.city,
      geography: "National",
      status: "active",
      role: "partner",
      tier: business.tier === "Free" ? "Bronze" : business.tier,
      confirmation: "confirmed",
      joinedAt: business.joinedAt.toISOString(),
      lastActiveAt: business.updatedAt.toISOString(),
      photoUrl: undefined,
    };
  }

  private async audit(
    ctx: BusinessContext,
    action: string,
    targetId: string,
    targetName: string,
  ) {
    await this.prisma.auditLog.create({
      data: {
        action,
        actorId: ctx.user.id,
        actorName: ctx.business.name,
        targetType: "business",
        targetId,
        targetName,
        detail: "Circle change from the business dashboard",
      },
    });
  }
}
