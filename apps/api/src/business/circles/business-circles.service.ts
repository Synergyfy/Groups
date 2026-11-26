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
import {
  centralHubPhotos,
  type CentralHubPhotos,
} from "../business.photos.js";
import { BusinessMediaService } from "../business.media.js";
import {
  accessQuotas,
  applicableMandatoryCircles,
  unsatisfiedMandatoryCircles,
} from "../business.rules.js";
import {
  assertPartnerPermission,
  partnerPermissionsFor,
} from "../business.validation.js";
import type {
  AddCircleMemberDto,
  BusinessCircleQueryDto,
  CreateCircleDto,
  UpdateCircleDto,
} from "../dto/business.dto.js";
import { pageParams, pageResult, slicePage } from "../business.utils.js";

/** The Central Hub location chain a circle inherits from its business. */
type CircleLocation = {
  city: string | null;
  borough: string | null;
  highStreet: string | null;
  localMall: string | null;
  cityId: string | null;
  boroughId: string | null;
  highStreetId: string | null;
  localMallId: string | null;
};

@Injectable()
export class BusinessCirclesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly context: BusinessContextService,
    private readonly media: BusinessMediaService,
  ) {}

  async list(ctx: BusinessContext, query: BusinessCircleQueryDto) {
    await this.ensureMandatoryCircles(ctx);
    const params = pageParams(query.page, query.limit, 25);
    const circles = await this.prisma.circle.findMany({
      where: {
        businessId: ctx.business.id,
        ...(query.type ? { type: query.type } : {}),
        status: query.status ?? "Active",
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
            include: { _count: { select: { contacts: true } } },
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

    // A member can also be a platform account that joined the circle.
    const businessIdSet = new Set(businesses.map((business) => business.id));
    const accountIds = circle.memberIds.filter(
      (id) => !contactIds.has(id) && !businessIdSet.has(id),
    );
    const accounts = accountIds.length
      ? await this.prisma.user.findMany({
          where: { id: { in: accountIds } },
          select: {
            id: true,
            fullName: true,
            displayName: true,
            email: true,
            avatarUrl: true,
            mcomUserId: true,
            createdAt: true,
            updatedAt: true,
          },
        })
      : [];

    const photos = await this.memberPhotos(contacts, businesses);

    const contactsById = new Map(contacts.map((contact) => [contact.id, contact]));
    const businessesById = new Map(
      businesses.map((business) => [business.id, business]),
    );
    const accountsById = new Map(accounts.map((account) => [account.id, account]));
    const members = circle.memberIds.map((memberId) => {
      const contact = contactsById.get(memberId);
      if (contact) {
        return this.memberFromContact(contact, photos.byContactId.get(contact.id));
      }
      const business = businessesById.get(memberId);
      if (business) {
        return this.memberFromBusiness(
          business,
          photos.byBusinessId.get(business.id),
        );
      }
      const account = accountsById.get(memberId);
      if (account) {
        return this.memberFromAccount(account);
      }
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
        chatable: false,
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
        contactIds: [],
        contactCount: list._count.contacts,
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
    assertPartnerPermission(
      partnerPermissionsFor(ctx.partner, ctx.config.partnerDefaults),
      "canCreateCircles",
      "Your partner permissions do not allow creating circles.",
    );
    const typeConfig = this.requireType(ctx, dto.type);
    await this.assertMandatoryCirclesOrder(ctx, typeConfig.type);
    const sourceLists = await this.resolveLists(ctx, dto.sourceListIds ?? []);
    const memberIds = await this.resolveMemberIds(
      ctx,
      sourceLists.map((list) => list.id),
      dto.memberIds ?? [],
    );
    this.assertCapacity(typeConfig, memberIds, 0);
    await this.assertBanker(ctx, typeConfig, memberIds);
    await this.assertQuota(ctx);

    const circle = await this.prisma.circle.create({
      data: {
        businessId: ctx.business.id,
        type: typeConfig.type,
        config: this.configJson(dto, typeConfig, this.businessLocation(ctx)),
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
    assertPartnerPermission(
      partnerPermissionsFor(ctx.partner, ctx.config.partnerDefaults),
      "canCreateCircles",
      "Your partner permissions do not allow managing circles.",
    );
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
      include: { _count: { select: { contacts: true, memberships: true } } },
    });
    if (lists.length !== unique.length) {
      throw new NotFoundException("One or more source lists were not found.");
    }
    const inactive = lists.filter((list) => list.status !== "Active");
    if (inactive.length > 0) {
      throw new BadRequestException(
        `Inactive lists cannot be used as circle sources: ${inactive
          .map((list) => list.name)
          .join(", ")}`,
      );
    }
    const empty = lists.filter(
      (list) => list._count.contacts + list._count.memberships < 1,
    );
    if (empty.length > 0) {
      throw new BadRequestException(
        `Empty lists cannot be used as circle sources: ${empty
          .map((list) => list.name)
          .join(", ")}`,
      );
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
        where: {
          businessId: ctx.business.id,
          confirmation: { in: ["confirmed", "pending"] },
          OR: [
            { listId: { in: sourceListIds } },
            { memberships: { some: { listId: { in: sourceListIds } } } },
          ],
        },
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
    if (count >= quota) {
      throw new ForbiddenException({
        code: "CIRCLE_QUOTA_REACHED",
        message: `Your plan allows ${quota} circles.`,
      });
    }
  }

  /**
   * When the administrator has configured required circles that are not yet
   * satisfied, only those required circle types may be created. Other circle
   * types remain blocked until every required circle exists with its minimum
   * member count.
   */
  private async assertMandatoryCirclesOrder(
    ctx: BusinessContext,
    requestedType: string,
  ) {
    const mandatoryCircles = applicableMandatoryCircles(
      ctx.config.mandatoryCircles,
      ctx.plan.paid,
    );
    if (mandatoryCircles.length === 0) return;

    const existing = await this.prisma.circle.findMany({
      where: { businessId: ctx.business.id },
      select: { type: true, memberIds: true },
    });
    const missing = unsatisfiedMandatoryCircles(mandatoryCircles, existing);
    if (
      missing.length > 0 &&
      !missing.some((entry) => entry.rule.circleType === requestedType)
    ) {
      throw new ConflictException({
        code: "MANDATORY_CIRCLES_REQUIRED",
        message: `Create the required circle types first: ${missing
          .map((entry) => entry.rule.circleType)
          .join(", ")}`,
        requiredCircles: missing.map((entry) => ({
          type: entry.rule.circleType,
          current: entry.current,
          required: entry.required,
        })),
      });
    }
  }

  private async circleQuota(ctx: BusinessContext) {
    const plan = ctx.plan.planId
      ? await this.prisma.plan.findUnique({
          where: { id: ctx.plan.planId },
        })
      : await this.prisma.plan.findFirst({
          where: {
            name: ctx.plan.planName,
            variant: ctx.plan.variant,
            status: "Active",
          },
        });
    // A published plan's quota is authoritative, including an explicit 0.
    const planQuota = plan
      ? Math.max(0, plan.circleQuota)
      : accessQuotas(ctx.config, ctx.plan).circles;
    const partner = partnerPermissionsFor(
      ctx.partner,
      ctx.config.partnerDefaults,
    );
    return partner
      ? Math.min(planQuota, partner.maxCircles)
      : planQuota;
  }

  /**
   * Creates mandatory circles that the administrator marked "auto-enforce"
   * once the business has enough confirmed network contacts to satisfy the
   * configured minimum. Required but non-auto rules are left to the business.
   */
  private async ensureMandatoryCircles(ctx: BusinessContext): Promise<void> {
    const applicable = applicableMandatoryCircles(
      ctx.config.mandatoryCircles,
      ctx.plan.paid,
    ).filter((rule) => rule.autoEnforce);
    if (applicable.length === 0) return;

    const existing = await this.prisma.circle.findMany({
      where: { businessId: ctx.business.id },
      select: { type: true },
    });
    const missing = applicable.filter(
      (rule) => !existing.some((circle) => circle.type === rule.circleType),
    );
    if (missing.length === 0) return;

    const contacts = await this.prisma.networkContact.findMany({
      where: {
        businessId: ctx.business.id,
        confirmation: "confirmed",
      },
      select: { id: true },
      take: 100,
    });

    // Mandatory circles are still circles. Do not auto-create past the plan
    // (or partner) quota; the unsatisfied mandatory rule remains visible so the
    // business can upgrade or tidy existing circles first.
    const quota = await this.circleQuota(ctx);
    let current = existing.length;

    for (const rule of missing) {
      if (current >= quota) break;
      const typeConfig = ctx.config.circleTypes.find(
        (entry) => entry.type === rule.circleType,
      );
      if (!typeConfig || !typeConfig.enabled) continue;
      const needed = Math.max(0, rule.minMemberCount);
      if (contacts.length < needed) continue;

      const circle = await this.prisma.circle.create({
        data: {
          businessId: ctx.business.id,
          type: rule.circleType,
          config: {
            name: rule.circleType,
            description: "Auto-enforced mandatory circle",
            duration: typeConfig.allowedDurations[0] ?? 90,
            visibility: "private",
            interactionLevel: "message",
          },
          memberIds: contacts.slice(0, needed).map((contact) => contact.id),
          sourceListIds: [],
          status: "Active",
        },
      });
      await this.prisma.circleActivity.create({
        data: {
          circleId: circle.id,
          kind: "update",
          message: "Mandatory circle created automatically",
        },
      });
      current += 1;
    }
  }

  private mandatoryStatuses(ctx: BusinessContext, circles: Circle[]) {
    return applicableMandatoryCircles(
      ctx.config.mandatoryCircles,
      ctx.plan.paid,
    ).map((rule) => {
      const circle = circles.find((entry) => entry.type === rule.circleType);
      return {
        ...rule,
        satisfied:
          Boolean(circle) &&
          (circle?.memberIds.length ?? 0) >= rule.minMemberCount,
        circleId: circle?.id,
        current: circle?.memberIds.length ?? 0,
      };
    });
  }

  /**
   * A circle always belongs to the business that owns it, so it inherits the
   * business's Central Hub location chain: city, borough, high street and
   * local mall. The chain is mirrored onto the circle so the workspace can
   * show where the circle operates.
   */
  private businessLocation(ctx: BusinessContext): CircleLocation {
    return {
      city: ctx.business.city || null,
      borough: ctx.business.localArea || null,
      highStreet: ctx.business.highStreet || null,
      localMall: ctx.business.localMallName || null,
      cityId: ctx.business.cityId || null,
      boroughId: ctx.business.boroughId || null,
      highStreetId: ctx.business.highStreetId || null,
      localMallId: ctx.business.localMallId || null,
    };
  }

  private configJson(
    dto: CreateCircleDto,
    _typeConfig: CircleTypeConfigEntry,
    location: CircleLocation,
  ) {
    return {
      name: dto.config.name.trim(),
      description: dto.config.description?.trim() ?? "",
      visibility: dto.config.visibility ?? "private",
      interactionLevel: dto.config.interactionLevel ?? "message",
      location,
    } satisfies Prisma.InputJsonObject;
  }

  private configJsonFrom(circle: Circle) {
    const config = (circle.config ?? {}) as Record<string, unknown>;
    return {
      name: String(config.name ?? ""),
      description: String(config.description ?? ""),
      visibility: String(config.visibility ?? "private"),
      interactionLevel: String(config.interactionLevel ?? "message"),
      location: (config.location ?? null) as Prisma.InputJsonValue,
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

  private memberFromContact(contact: NetworkContact, photoUrl?: string) {
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
      // A contact only becomes a chat-able member once they are a real
      // Central Hub user. Somebody who was only added to the list has no
      // account to talk to yet.
      chatable: Boolean(contact.mcomUserId),
      joinedAt: contact.createdAt.toISOString(),
      lastActiveAt: contact.updatedAt.toISOString(),
      photoUrl: photoUrl ?? null,
    };
  }

  /**
   * A member who is a platform account rather than a network contact — they
   * signed up themselves, so they are a real Central Hub user and can be
   * messaged.
   */
  private memberFromAccount(account: {
    id: string;
    fullName: string | null;
    displayName: string | null;
    email: string;
    avatarUrl: string | null;
    mcomUserId: string | null;
    createdAt: Date;
    updatedAt: Date;
  }) {
    const name = account.displayName ?? account.fullName ?? account.email;
    return {
      id: account.id,
      fullName: name,
      businessName: name,
      category: "Member",
      location: "",
      geography: "National",
      status: "active",
      role: "peripheral",
      tier: "Bronze",
      confirmation: "confirmed",
      chatable: Boolean(account.mcomUserId),
      joinedAt: account.createdAt.toISOString(),
      lastActiveAt: account.updatedAt.toISOString(),
      photoUrl: account.avatarUrl ?? null,
    };
  }

  private memberFromBusiness(
    business: {
      id: string;
      name: string;
      contactName: string;
      category: string;
      city: string;
      tier: string;
      joinedAt: Date;
      updatedAt: Date;
      mcomUserId?: string | null;
    },
    photoUrl?: string,
  ) {
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
      chatable: Boolean(business.mcomUserId),
      joinedAt: business.joinedAt.toISOString(),
      lastActiveAt: business.updatedAt.toISOString(),
      photoUrl: photoUrl ?? null,
    };
  }

  /**
   * Central Hub owns the member logos, so Groups only mirrors them.
   *
   * A business member shows the logo from its Central Hub business profile; a
   * contact shows the avatar of the Central Hub user behind their email
   * address. Members without one keep the initials fallback on the client.
   */
  private async memberPhotos(
    contacts: NetworkContact[],
    businesses: Array<{ id: string }>,
  ): Promise<CentralHubPhotos> {
    return centralHubPhotos(this.prisma, this.media, contacts, businesses);
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
