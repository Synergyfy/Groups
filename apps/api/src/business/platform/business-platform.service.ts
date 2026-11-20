import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { Business } from "../../generated/prisma/client.js";
import { Prisma } from "../../generated/prisma/client.js";
import { ConfigService } from "@nestjs/config";
import { toMinorPence } from "../../common/money.js";
import {
  mapBusiness,
  mapCampaign,
  mapGroup,
  mapPlan,
  mapProgramme,
  mapRelationship,
  mapRewardDeal,
} from "../../admin/admin.mappers.js";
import { PrismaService } from "../../prisma/prisma.service.js";
import { BusinessContextService } from "../business-context.service.js";
import { activatePlanTx } from "../plan-activation.js";
import { BusinessGroupsService } from "../groups/business-groups.service.js";
import {
  accessQuotas,
  canCreateGroups,
  creationRightsLabel,
  normalizeVariant,
  planAccessDays,
  toPlanAccess,
} from "../business.rules.js";
import {
  assertPartnerPermission,
  partnerPermissionsFor,
} from "../business.validation.js";
import { mapBusinessPlan, mapBusinessDirectoryEntry } from "../business.mappers.js";
import type { BusinessContext } from "../business.types.js";
import type {
  ActivatePlanDto,
  BusinessCampaignsQueryDto,
  BusinessDirectoryQueryDto,
  BusinessRewardsQueryDto,
  UpdateBusinessProfileDto,
} from "../dto/business.dto.js";
import {
  pageParams,
  pageResult,
} from "../business.utils.js";

@Injectable()
export class BusinessPlatformService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly context: BusinessContextService,
    private readonly groups: BusinessGroupsService,
    private readonly config: ConfigService,
  ) {}

  async getOverview(ctx: BusinessContext) {
    const [dashboard, lists, circles, programmes, relationships] =
      await Promise.all([
        this.groups.getDashboard(ctx),
        this.prisma.networkList.findMany({
          where: { businessId: ctx.business.id },
          include: { contacts: { select: { id: true, confirmation: true } } },
        }),
        this.prisma.circle.findMany({
          where: { businessId: ctx.business.id },
          select: { id: true, type: true, memberIds: true },
        }),
        this.prisma.programme.findMany({
          where: { status: "Active" },
          orderBy: { monthlyFeeMinor: "desc" },
        }),
        this.relationshipsFor(ctx.business),
      ]);

    const contacts = lists.flatMap((list) => list.contacts);
    const currentProgramme = ctx.business.programmeId
      ? programmes.find((entry) => entry.id === ctx.business.programmeId)
      : undefined;

    return {
      business: mapBusiness(ctx.business),
      plan: mapBusinessPlan(ctx.plan),
      access: toPlanAccess(ctx.plan),
      canCreateGroups: canCreateGroups(
        ctx.plan,
        ctx.config.groupCreationRules,
      ),
      creationRightsLabel: creationRightsLabel(
        ctx.config.groupCreationRules,
      ),
      stats: {
        ...dashboard.stats,
        networkLists: lists.length,
        networkContacts: contacts.length,
        pendingContacts: contacts.filter(
          (contact) => contact.confirmation === "pending",
        ).length,
        circles: circles.length,
        programmes: programmes.length,
      },
      mandatoryGroups: dashboard.mandatoryGroups,
      mandatoryCircles: this.mandatoryCircleStatuses(ctx, circles),
      automaticProgress: dashboard.automaticProgress,
      headStartGroups: dashboard.headStartGroups,
      platformGroup: dashboard.platformGroup,
      recentActivity: dashboard.recentActivity,
      invitations: dashboard.invitations,
      programme: currentProgramme ? mapProgramme(currentProgramme) : null,
      relationships,
    };
  }

  async getProfile(ctx: BusinessContext) {
    const [programme, relationships] = await Promise.all([
      ctx.business.programmeId
        ? this.prisma.programme.findFirst({
            where: {
              id: ctx.business.programmeId,
              status: "Active",
            },
          })
        : null,
      this.relationshipsFor(ctx.business),
    ]);

    return {
      business: mapBusiness(ctx.business),
      user: {
        id: ctx.user.id,
        email: ctx.user.email,
        name: ctx.user.fullName ?? ctx.user.displayName,
        firstName: ctx.user.firstName,
        lastName: ctx.user.lastName,
        avatarUrl: ctx.user.avatarUrl,
      },
      plan: mapBusinessPlan(ctx.plan),
      access: toPlanAccess(ctx.plan),
      programme: programme ? mapProgramme(programme) : null,
      relationships,
      location: {
        city: ctx.business.city,
        localArea: ctx.business.localArea,
      },
      joinedAt: ctx.business.joinedAt.toISOString(),
      nationalCommunity: {
        name: "National Community",
        status: "Member",
        joinedAt: ctx.business.joinedAt.toISOString(),
      },
    };
  }

  async updateProfile(
    ctx: BusinessContext,
    dto: UpdateBusinessProfileDto,
  ) {
    if (dto.businessProfile) {
      const current = (ctx.user.businessProfile ?? {}) as Record<
        string,
        unknown
      >;
      await this.prisma.user.update({
        where: { id: ctx.user.id },
        data: {
          businessProfile: {
            ...current,
            ...dto.businessProfile,
          } as Prisma.InputJsonValue,
          ...(dto.name ? { businessName: dto.name } : {}),
          ...(dto.contactName ? { fullName: dto.contactName } : {}),
          ...(dto.phone ? { phone: dto.phone } : {}),
        },
      });
    } else if (dto.name || dto.contactName || dto.phone) {
      await this.prisma.user.update({
        where: { id: ctx.user.id },
        data: {
          ...(dto.name ? { businessName: dto.name } : {}),
          ...(dto.contactName ? { fullName: dto.contactName } : {}),
          ...(dto.phone ? { phone: dto.phone } : {}),
        },
      });
    }

    const hasBusinessField = [
      dto.name,
      dto.contactName,
      dto.phone,
      dto.city,
      dto.localArea,
      dto.category,
    ].some((value) => value !== undefined);
    if (hasBusinessField) {
      await this.prisma.business.update({
        where: { id: ctx.business.id },
        data: {
          name: dto.name,
          contactName: dto.contactName,
          phone: dto.phone,
          city: dto.city,
          localArea: dto.localArea,
          category: dto.category,
        },
      });
    }

    await this.prisma.auditLog.create({
      data: {
        action: "business-updated",
        actorId: ctx.user.id,
        actorName: ctx.business.name,
        targetType: "business",
        targetId: ctx.business.id,
        targetName: dto.name ?? ctx.business.name,
        detail: "Business profile updated from the business dashboard",
      },
    });

    const user = await this.prisma.user.findUnique({
      where: { id: ctx.user.id },
    });
    const business = await this.prisma.business.findUnique({
      where: { id: ctx.business.id },
    });
    if (!business || !user) {
      throw new NotFoundException("Business profile not found");
    }

    // Return the same shape as GET /business/profile so the client can use the
    // response directly instead of re-fetching everything.
    ctx.user = user;
    ctx.business = business;
    return this.getProfile(ctx);
  }

  getConfig(ctx: BusinessContext) {
    return {
      automaticGrouping: ctx.config.automaticGrouping,
      groupTypes: ctx.config.groupTypes,
      stageLabels: ctx.config.stageLabels,
      paymentRules: ctx.config.paymentRules,
      groupCreationRules: ctx.config.groupCreationRules,
      circleTypes: ctx.config.circleTypes,
      mandatoryCircles: ctx.config.mandatoryCircles,
      mandatoryGroups: ctx.config.mandatoryGroups,
      partnerDefaults: ctx.config.partnerDefaults,
      accessRules: ctx.config.accessRules,
      platformSettings: ctx.config.platformSettings,
      plan: mapBusinessPlan(ctx.plan),
      access: toPlanAccess(ctx.plan),
      canCreateGroups: canCreateGroups(
        ctx.plan,
        ctx.config.groupCreationRules,
      ),
      creationRightsLabel: creationRightsLabel(
        ctx.config.groupCreationRules,
      ),
    };
  }

  async getPlan(ctx: BusinessContext) {
    const [plans, groupQuota, circleQuota] = await Promise.all([
      this.prisma.plan.findMany({
        where: { status: "Active" },
        orderBy: [{ name: "asc" }, { variant: "asc" }],
      }),
      this.groupQuota(ctx),
      this.circleQuota(ctx),
    ]);

    return {
      plan: mapBusinessPlan(ctx.plan),
      access: toPlanAccess(ctx.plan),
      canCreateGroups: canCreateGroups(
        ctx.plan,
        ctx.config.groupCreationRules,
      ),
      creationRightsLabel: creationRightsLabel(
        ctx.config.groupCreationRules,
      ),
      rules: ctx.config.groupCreationRules,
      paymentRules: ctx.config.paymentRules,
      plans: plans.map(mapPlan),
      quotas: { groups: groupQuota, circles: circleQuota },
      mandatoryGroups: ctx.config.mandatoryGroups,
      mandatoryCircles: ctx.config.mandatoryCircles,
    };
  }

  async activatePlan(
    ctx: BusinessContext,
    dto: ActivatePlanDto,
  ) {
    if (!dto.agreementAccepted) {
      throw new BadRequestException(
        "The plan access agreement must be accepted before activation.",
      );
    }

    const plan = dto.planId
      ? await this.prisma.plan.findUnique({
          where: { id: dto.planId },
        })
      : null;
    if (dto.planId && !plan) {
      throw new NotFoundException(`Plan ${dto.planId} not found`);
    }
    if (plan && plan.status !== "Active") {
      throw new BadRequestException(
        `${plan.name} is not available for activation.`,
      );
    }

    const rules = ctx.config.groupCreationRules;
    const requestedVariant = plan?.variant ?? dto.variant;
    const accessDays = requestedVariant
      ? planAccessDays(normalizeVariant(requestedVariant))
      : dto.accessDays === 90 || dto.accessDays === 180 || dto.accessDays === 365
        ? dto.accessDays
        : rules.entryAccessDays;
    const variant = plan
      ? normalizeVariant(plan.variant)
      : normalizeVariant(dto.variant ?? ctx.plan.variant);
    const planName =
      plan?.name ?? dto.planName ?? ctx.plan.planName ?? "Plan";
    const now = new Date();
    const expiresAt = new Date(
      now.getTime() + accessDays * 24 * 60 * 60 * 1000,
    );

    const accessFeeMinor =
      plan?.priceMinor ??
      toMinorPence(dto.accessFee ?? rules.entryAccessFee);
    const paymentsEnabled =
      this.config.get<string>("MCOM_PAY_ENABLED", "true").toLowerCase() !==
      "false";
    if (
      paymentsEnabled &&
      rules.requirePaidAccess &&
      accessFeeMinor > 0
    ) {
      throw new ConflictException({
        code: "PAYMENT_REQUIRED",
        message:
          "The plan access fee must be paid through MCOM Pay before the plan can be activated.",
      });
    }

    const activated = await this.prisma.$transaction((tx) =>
      activatePlanTx(tx, {
        businessId: ctx.business.id,
        userId: ctx.user.id,
        actorName: ctx.business.name,
        planId: plan?.id ?? dto.planId ?? null,
        planName,
        variant,
        accessDays,
        accessFeeMinor,
        agreementAccepted: true,
        agreedAt: now,
        accessExpiresAt: expiresAt,
      }),
    );

    return {
      plan: mapBusinessPlan(activated),
      access: toPlanAccess(activated),
      canCreateGroups: canCreateGroups(
        activated,
        ctx.config.groupCreationRules,
      ),
    };
  }

  async getDirectory(
    ctx: BusinessContext,
    query: BusinessDirectoryQueryDto,
  ) {
    const params = pageParams(query.page, query.limit, 25);
    const search = query.search?.trim();
    const where: Prisma.BusinessWhereInput = {
      status: "Active",
      verified: true,
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { contactName: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } },
              { city: { contains: search, mode: "insensitive" } },
              { category: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
      ...(query.city ? { city: query.city } : {}),
      ...(query.category ? { category: query.category } : {}),
    };

    if (query.excludeGroupId) {
      const group = await this.prisma.group.findFirst({
        where: {
          id: query.excludeGroupId,
          OR: [
            { ownerId: ctx.business.id },
            { members: { some: { memberId: ctx.business.id } } },
          ],
        },
        include: { members: { select: { memberId: true } } },
      });
      if (!group) {
        throw new NotFoundException(
          `Group ${query.excludeGroupId} not found`,
        );
      }
      const pending = await this.prisma.invitation.findMany({
        where: {
          groupId: group.id,
          kind: "invite",
          status: "pending",
        },
        select: { inviteeId: true },
      });
      const excluded = new Set([
        ...group.members.map((member) => member.memberId),
        ...pending
          .map((invitation) => invitation.inviteeId)
          .filter((id): id is string => Boolean(id)),
      ]);
      const candidates = await this.prisma.business.findMany({
        where: {
          ...where,
          id: { notIn: [ctx.business.id, ...excluded] },
        },
        orderBy: { joinedAt: "desc" },
        skip: params.skip,
        take: params.limit,
      });
      const total = await this.prisma.business.count({
        where: {
          ...where,
          id: { notIn: [ctx.business.id, ...excluded] },
        },
      });
      return pageResult(
        candidates.map(mapBusinessDirectoryEntry),
        total,
        params,
      );
    }

    const [total, businesses] = await Promise.all([
      this.prisma.business.count({
        where: { ...where, id: { not: ctx.business.id } },
      }),
      this.prisma.business.findMany({
        where: { ...where, id: { not: ctx.business.id } },
        orderBy: { joinedAt: "desc" },
        skip: params.skip,
        take: params.limit,
      }),
    ]);

    return pageResult(
      businesses.map(mapBusinessDirectoryEntry),
      total,
      params,
    );
  }

  async getLocations(ctx: BusinessContext) {
    const cities = await this.prisma.locationCity.findMany({
      include: { areas: { orderBy: { name: "asc" } } },
      orderBy: { name: "asc" },
    });

    return {
      nationalCommunity: "National Community",
      current: {
        city: ctx.business.city,
        localArea: ctx.business.localArea,
        joinedAt: ctx.business.joinedAt.toISOString(),
      },
      cities: cities.map((city) => ({
        id: city.id,
        name: city.name,
        areas: city.areas.map((area) => ({ id: area.id, name: area.name })),
      })),
      totalCities: cities.length,
      totalAreas: cities.reduce((sum, city) => sum + city.areas.length, 0),
    };
  }

  async getProgrammes(ctx: BusinessContext) {
    const programmes = await this.prisma.programme.findMany({
      where: { status: "Active" },
      orderBy: { monthlyFeeMinor: "desc" },
    });
    const current = ctx.business.programmeId
      ? programmes.find((entry) => entry.id === ctx.business.programmeId)
      : undefined;

    return {
      items: programmes.map(mapProgramme),
      current: current ? mapProgramme(current) : null,
      plan: mapBusinessPlan(ctx.plan),
      stats: {
        total: programmes.length,
        active: programmes.filter((entry) => entry.status === "Active").length,
        currentPlan: ctx.plan.planName,
      },
    };
  }

  async getCampaigns(
    ctx: BusinessContext,
    query: BusinessCampaignsQueryDto,
  ) {
    assertPartnerPermission(
      partnerPermissionsFor(ctx.partner, ctx.config.partnerDefaults),
      "canAccessCampaigns",
      "Your partner permissions do not allow campaign access.",
    );
    const params = pageParams(query.page, query.limit, 25);
    const myGroups = await this.prisma.group.findMany({
      where: {
        OR: [
          { ownerId: ctx.business.id },
          { members: { some: { memberId: ctx.business.id } } },
        ],
      },
      select: { id: true, name: true, ownerId: true },
    });
    const myGroupIds = myGroups.map((group) => group.id);
    const now = new Date();
    const where: Prisma.CampaignWhereInput = {
      status: "Active",
      ...(query.groupId ? { groupIds: { has: query.groupId } } : {}),
      AND: [
        { OR: [{ startDate: null }, { startDate: { lte: now } }] },
        { OR: [{ endDate: null }, { endDate: { gte: now } }] },
      ],
    };

    const [total, campaigns] = await Promise.all([
      this.prisma.campaign.count({ where }),
      this.prisma.campaign.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: params.skip,
        take: params.limit,
      }),
    ]);

    const referencedIds = [
      ...new Set(campaigns.flatMap((campaign) => campaign.groupIds)),
    ];
    const referencedGroups = referencedIds.length
      ? await this.prisma.group.findMany({
          where: { id: { in: referencedIds } },
          select: { id: true, name: true, type: true, ownerId: true },
        })
      : [];
    const groupById = new Map(
      referencedGroups.map((group) => [group.id, group]),
    );

    return {
      ...pageResult(
        campaigns.map((campaign) => ({
          ...mapCampaign(campaign),
          groups: campaign.groupIds
            .map((id) => groupById.get(id))
            .filter((group): group is (typeof referencedGroups)[number] =>
              Boolean(group),
            )
            .map((group) => ({
              id: group.id,
              name: group.name,
              type: group.type,
              isMine: group.ownerId === ctx.business.id,
            })),
          isMine: campaign.groupIds.some(
            (id) =>
              myGroups.find((group) => group.id === id)?.ownerId ===
              ctx.business.id,
          ),
        })),
        total,
        params,
      ),
      stats: {
        total,
        active: campaigns.filter((campaign) => campaign.status === "Active")
          .length,
        touchingMyGroups: campaigns.filter((campaign) =>
          campaign.groupIds.some((id) => myGroupIds.includes(id)),
        ).length,
      },
    };
  }

  async getRewards(
    ctx: BusinessContext,
    query: BusinessRewardsQueryDto,
  ) {
    const params = pageParams(query.page, query.limit, 25);
    const search = query.search?.trim();
    const now = new Date();
    const audience = ["All Users", "Business Owners"];
    if (["Gold", "Platinum"].includes(ctx.plan.planName)) {
      audience.push("Gold & Platinum");
    }
    const where: Prisma.RewardDealWhereInput = {
      status: "Active",
      liveOnFrontend: true,
      expiryDate: { gte: now },
      targetAudience: { in: audience },
      ...(query.category ? { category: query.category } : {}),
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: "insensitive" } },
              { sponsorBusiness: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const [programmes, plans, totalDeals, deals, campaigns] =
      await Promise.all([
        this.prisma.programme.findMany({
          where: { status: "Active" },
          orderBy: { monthlyFeeMinor: "desc" },
        }),
        this.prisma.plan.findMany({
          where: { status: "Active" },
          orderBy: [{ name: "asc" }, { variant: "asc" }],
        }),
        this.prisma.rewardDeal.count({ where }),
        this.prisma.rewardDeal.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip: params.skip,
          take: params.limit,
        }),
        this.prisma.campaign.findMany({
          where: {
            status: "Active",
            AND: [
              { OR: [{ startDate: null }, { startDate: { lte: now } }] },
              { OR: [{ endDate: null }, { endDate: { gte: now } }] },
            ],
          },
          orderBy: { createdAt: "desc" },
          take: 25,
        }),
      ]);

    const currentProgramme = ctx.business.programmeId
      ? programmes.find((entry) => entry.id === ctx.business.programmeId)
      : undefined;

    return {
      plan: mapBusinessPlan(ctx.plan),
      access: toPlanAccess(ctx.plan),
      currentProgramme: currentProgramme
        ? mapProgramme(currentProgramme)
        : null,
      programmes: programmes.map(mapProgramme),
      plans: plans.map(mapPlan),
      rewardDeals: pageResult(deals.map(mapRewardDeal), totalDeals, params),
      campaigns: campaigns.map(mapCampaign),
      stats: {
        programmes: programmes.length,
        activeProgrammes: programmes.filter(
          (entry) => entry.status === "Active",
        ).length,
        currentPlan: ctx.plan.planName,
        rewardDeals: totalDeals,
        liveDeals: deals.filter((deal) => deal.liveOnFrontend).length,
        campaigns: campaigns.length,
      },
    };
  }

  async claimReward(ctx: BusinessContext, id: string) {
    const deal = await this.prisma.rewardDeal.findUnique({ where: { id } });
    if (!deal) throw new NotFoundException(`Reward deal ${id} not found`);
    if (
      deal.status !== "Active" ||
      !deal.liveOnFrontend ||
      deal.expiryDate.getTime() <= Date.now()
    ) {
      throw new ConflictException("This reward is no longer available.");
    }
    const audience = ["All Users", "Business Owners"];
    if (["Gold", "Platinum"].includes(ctx.plan.planName)) {
      audience.push("Gold & Platinum");
    }
    if (!audience.includes(deal.targetAudience)) {
      throw new ConflictException(
        "This reward is not available on your plan.",
      );
    }

    const claimed = await this.prisma.$transaction(async (tx) => {
      if (deal.maxClaims > 0) {
        const updated = await tx.rewardDeal.updateMany({
          where: {
            id,
            claimsCount: { lt: deal.maxClaims },
            status: "Active",
          },
          data: { claimsCount: { increment: 1 } },
        });
        if (updated.count === 0) {
          throw new ConflictException("This reward has been fully claimed.");
        }
      } else {
        await tx.rewardDeal.update({
          where: { id },
          data: { claimsCount: { increment: 1 } },
        });
      }
      const current = await tx.rewardDeal.findUniqueOrThrow({
        where: { id },
      });
      if (current.maxClaims > 0 && current.claimsCount >= current.maxClaims) {
        await tx.rewardDeal.update({
          where: { id },
          data: { status: "Expired" },
        });
      }
      await tx.auditLog.create({
        data: {
          action: "config-updated",
          actorId: ctx.user.id,
          actorName: ctx.business.name,
          targetType: "config",
          targetId: id,
          targetName: current.title,
          detail: "Reward deal claimed",
        },
      });
      return current;
    });

    return mapRewardDeal(claimed);
  }

  async getCommunity(ctx: BusinessContext) {
    const [communityGroups, lists, circles] = await Promise.all([
      this.prisma.group.findMany({
        where: { type: "National Community" },
        include: { members: true },
        orderBy: { createdAt: "asc" },
      }),
      this.prisma.networkList.count({
        where: { businessId: ctx.business.id },
      }),
      this.prisma.circle.count({ where: { businessId: ctx.business.id } }),
    ]);

    return {
      community: {
        name: "National Community",
        status: "Member",
        joinedAt: ctx.business.joinedAt.toISOString(),
        city: ctx.business.city,
        localArea: ctx.business.localArea,
      },
      groups: communityGroups.map((group) => mapGroup(group)),
      plan: mapBusinessPlan(ctx.plan),
      stats: {
        communityGroups: communityGroups.length,
        membersAcross: communityGroups.reduce(
          (sum, group) => sum + (group.members?.length ?? group.memberCount),
          0,
        ),
        myGroups: communityGroups.filter((group) =>
          group.members?.some((member) => member.memberId === ctx.business.id),
        ).length,
        networkLists: lists,
        circles,
      },
    };
  }

  async getLocation(ctx: BusinessContext) {
    const city = ctx.business.city;
    const localArea = ctx.business.localArea;
    const [cityGroups, areaGroups, cities] = await Promise.all([
      this.prisma.group.findMany({
        where: { city },
        include: { members: true },
        orderBy: { createdAt: "desc" },
      }),
      localArea
        ? this.prisma.group.findMany({
            where: { localArea },
            include: { members: true },
            orderBy: { createdAt: "desc" },
          })
        : Promise.resolve([]),
      this.prisma.locationCity.findMany({
        include: { areas: { orderBy: { name: "asc" } } },
        orderBy: { name: "asc" },
      }),
    ]);

    return {
      current: {
        city,
        localArea,
        joinedAt: ctx.business.joinedAt.toISOString(),
      },
      cityGroups: cityGroups.map((group) => mapGroup(group)),
      areaGroups: areaGroups.map((group) => mapGroup(group)),
      hierarchy: cities.map((entry) => ({
        id: entry.id,
        name: entry.name,
        areas: entry.areas.map((area) => ({ id: area.id, name: area.name })),
      })),
      stats: {
        groupsInCity: cityGroups.length,
        groupsInArea: areaGroups.length,
        membersInCity: cityGroups.reduce(
          (sum, group) => sum + (group.members?.length ?? group.memberCount),
          0,
        ),
        myGroups: cityGroups.filter((group) =>
          group.members?.some((member) => member.memberId === ctx.business.id),
        ).length,
      },
    };
  }

  async getJourney(ctx: BusinessContext) {
    const ownedGroups = await this.prisma.group.findMany({
      where: { ownerId: ctx.business.id },
      include: { members: true },
    });
    const [joinedGroups, automaticGroups, invitations, lists, circles, campaigns] =
      await Promise.all([
        this.prisma.group.findMany({
          where: { members: { some: { memberId: ctx.business.id } } },
          select: { id: true, type: true, source: true },
        }),
        this.prisma.group.findMany({
          where: {
            source: "automatic",
            type: "Network",
            members: { some: { memberId: ctx.business.id } },
          },
          include: { members: true },
        }),
        this.prisma.invitation.findMany({
          where: {
            OR: [
              { invitedById: ctx.business.id },
              { inviteeId: ctx.business.id },
              { groupId: { in: ownedGroups.map((group) => group.id) } },
            ],
          },
          select: { kind: true, status: true, invitedById: true },
        }),
        this.prisma.networkList.count({
          where: { businessId: ctx.business.id },
        }),
        this.prisma.circle.count({ where: { businessId: ctx.business.id } }),
        this.prisma.campaign.count({
          where: {
            status: "Active",
            AND: [
              {
                OR: [
                  { startDate: null },
                  { startDate: { lte: new Date() } },
                ],
              },
              {
                OR: [
                  { endDate: null },
                  { endDate: { gte: new Date() } },
                ],
              },
            ],
          },
        }),
      ]);

    const automatic = automaticGroups[0];
    const automaticCount = automatic?.members.length ?? 0;
    const threshold = ctx.config.automaticGrouping.threshold;
    const ownedWithMembers = ownedGroups.filter(
      (group) => group.members.length > 1,
    ).length;

    const steps = [
      {
        id: "community",
        title: "Confirm your National Community membership",
        route: "/business/community",
        done: true,
      },
      {
        id: "location",
        title: "Set the place your business trades from",
        route: "/business/location",
        done: Boolean(ctx.business.city && ctx.business.localArea),
      },
      {
        id: "network",
        title: "Meet your automatic network group",
        route: "/business/groups/network",
        done: Boolean(automatic),
      },
      {
        id: "explore",
        title: "See what else exists",
        route: "/business/groups/explore",
        done: joinedGroups.length > 0,
      },
      {
        id: "join",
        title: "Join a group that matters to you",
        route: "/business/groups/explore",
        done: joinedGroups.some(
          (group) => group.source !== "automatic",
        ),
      },
      {
        id: "create",
        title: "Lead: create a group of your own",
        route: "/business/groups/create",
        done: ownedGroups.length > 0,
      },
      {
        id: "invite",
        title: "Fill your group",
        route: "/business/groups/mine",
        done: invitations.some(
          (invitation) =>
            invitation.kind === "invite" &&
            invitation.invitedById === ctx.business.id,
        ),
      },
      {
        id: "inbox",
        title: "Answer what is coming the other way",
        route: "/business/invitations",
        done: invitations.some(
          (invitation) => invitation.status !== "pending",
        ),
      },
      {
        id: "members",
        title: "Run the group: members and activity",
        route: "/business/groups/mine",
        done: ownedWithMembers > 0,
      },
      {
        id: "grow",
        title: "Grow the network group to its threshold",
        route: "/business/groups/network",
        done:
          ctx.config.automaticGrouping.enabled &&
          automaticCount >= threshold,
      },
      {
        id: "lists",
        title: "Feed the machine: build your network lists",
        route: "/business/network/lists",
        done: lists > 0,
      },
      {
        id: "circles",
        title: "Build a circle from your lists",
        route: "/business/circles",
        done: circles > 0,
      },
      {
        id: "campaigns",
        title: "Review campaigns and rewards",
        route: "/business/campaigns",
        done: campaigns > 0,
      },
      {
        id: "access",
        title: "Activate your paid access",
        route: "/business/plan",
        done:
          ctx.plan.accessSource !== "local" ||
          (ctx.plan.paid && ctx.plan.agreementAccepted),
      },
    ];

    const doneCount = steps.filter((step) => step.done).length;
    const current =
      steps.find((step) => !step.done) ?? steps[steps.length - 1];

    return {
      steps,
      done: Object.fromEntries(steps.map((step) => [step.id, step.done])),
      doneCount,
      total: steps.length,
      percent: Math.round((doneCount / steps.length) * 100),
      current,
      allDone: doneCount === steps.length,
      automaticProgress: {
        current: automaticCount,
        threshold,
        remaining: Math.max(threshold - automaticCount, 0),
      },
    };
  }

  // -------------------------------------------------------------------------
  // Internals
  // -------------------------------------------------------------------------

  private async relationshipsFor(business: Business) {
    const ids = [
      business.accountManagerId,
      business.agentId,
      business.consultantId,
    ].filter((id): id is string => Boolean(id));
    if (ids.length === 0) {
      return { accountManager: null, agent: null, consultant: null };
    }
    const relationships = await this.prisma.relationship.findMany({
      where: { id: { in: ids } },
    });
    const byId = new Map(
      relationships.map((relationship) => [relationship.id, relationship]),
    );
    const pick = (id: string | null) =>
      id ? byId.get(id) : undefined;
    return {
      accountManager: pick(business.accountManagerId)
        ? mapRelationship(pick(business.accountManagerId)!)
        : null,
      agent: pick(business.agentId)
        ? mapRelationship(pick(business.agentId)!)
        : null,
      consultant: pick(business.consultantId)
        ? mapRelationship(pick(business.consultantId)!)
        : null,
    };
  }

  private async groupQuota(ctx: BusinessContext) {
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
    if (plan) return Math.max(0, plan.groupQuota);
    return accessQuotas(ctx.config, ctx.plan).groups;
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
    if (plan) return Math.max(0, plan.circleQuota);
    return accessQuotas(ctx.config, ctx.plan).circles;
  }

  private mandatoryCircleStatuses(
    ctx: BusinessContext,
    circles: { id: string; type: string; memberIds: string[] }[],
  ) {
    return ctx.config.mandatoryCircles
      .filter((rule) => rule.required)
      .map((rule) => {
        const circle = circles.find((entry) => entry.type === rule.circleType);
        return {
          ...rule,
          satisfied: Boolean(circle),
          circleId: circle?.id,
          current: circle?.memberIds.length ?? 0,
          totalCircles: circles.length,
        };
      });
  }
}
