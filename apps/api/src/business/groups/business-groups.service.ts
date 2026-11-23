import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { randomUUID } from "node:crypto";
import type {
  Business,
  Group,
  GroupMember,
  Invitation,
} from "../../generated/prisma/client.js";
import { Prisma } from "../../generated/prisma/client.js";
import {
  mapBusiness,
  mapCampaign,
  mapGroup,
  mapGroupActivity,
  mapGroupCircle,
  mapGroupMember,
  mapInvitation,
  mapInvitationForBusiness,
  mapProgramme,
  mapRelationship,
} from "../../admin/admin.mappers.js";
import { PrismaService } from "../../prisma/prisma.service.js";
import { BusinessContextService } from "../business-context.service.js";
import { contributionPeriodKey } from "../../payments/payments.utils.js";
import { fromMinorPence, toMinorPence } from "../../common/money.js";
import {
  accessQuotas,
  activationFor,
  applicableMandatoryCircles,
  automaticProgressFor,
  canCreateGroups,
  creationRightsLabel,
  unsatisfiedMandatoryCircles,
  groupStatsFor,
  joinPlanFor,
  matchesRequiredPlans,
  planForOwner,
  normalizeVariant,
  recruitmentTargetFor,
} from "../business.rules.js";
import { syncGroupActivationStatus } from "../group-activation.js";
import {
  assertCampaignsAvailable,
  assertLocation,
  assertPartnerPermission,
  assertStageLabel,
  partnerPermissionsFor,
} from "../business.validation.js";
import { isUuid } from "../business.utils.js";
import { GeographyService } from "../../geography/geography.service.js";
import type {
  BusinessContext,
  GroupActivationView,
  JoinPlanView,
  PlanVariant,
} from "../business.types.js";
import type {
  BusinessGroupQueryDto,
  CreateBusinessGroupDto,
  CreateGroupActivityDto,
  InviteMembersDto,
  UpdateBusinessGroupDto,
} from "../dto/business.dto.js";

type GroupWithMembers = Group & { members?: GroupMember[] };

export interface DecoratedGroup {
  id: string;
  name: string;
  slug: string;
  description?: string;
  type: string;
  source: string;
  headStart: boolean;
  purpose: string;
  ownerId?: string;
  ownerName: string;
  memberIds: string[];
  memberCount: number;
  location?: {
    city?: string;
    localArea?: string;
    highStreet?: string;
    localMall?: string;
    cityId?: string;
    boroughId?: string;
    highStreetId?: string;
    localMallId?: string;
  };
  requiredSize?: number;
  stage?: string;
  status: string;
  accessType: string;
  visibility: string;
  interactionLevel?: string;
  pricing: string;
  requiredPlanIds: string[];
  contribution?: number;
  contributionFrequency?: string;
  createdAt?: string;
  campaignIds: string[];
  programmeId?: string;
  accountManagerId?: string;
  agentId?: string;
  consultantId?: string;
  isOwner: boolean;
  isMember: boolean;
  role: "owner" | "member" | "none";
  activation: GroupActivationView;
  joinPlan?: JoinPlanView;
}

@Injectable()
export class BusinessGroupsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly context: BusinessContextService,
    private readonly geography: GeographyService,
  ) {}

  async getDashboard(ctx: BusinessContext) {
    const sections = await this.getMineSections(ctx);
    const ownedIds = new Set(
      sections.groups.filter((group) => group.isOwner).map((group) => group.id),
    );
    const groupIds = sections.groups.map((group) => group.id);

    const [invitations, activity] = await Promise.all([
      this.prisma.invitation.findMany({
        where: {
          OR: [
            { inviteeId: ctx.business.id },
            { invitedById: ctx.business.id },
            { groupId: { in: [...ownedIds] } },
          ],
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      groupIds.length > 0
        ? this.prisma.groupActivity.findMany({
            where: { groupId: { in: groupIds } },
            orderBy: { at: "desc" },
            take: 25,
            include: { group: { select: { name: true } } },
          })
        : Promise.resolve([]),
    ]);

    return {
      ...sections,
      invitations: invitations.map((invitation) =>
        mapInvitationForBusiness(
          invitation,
          ctx.business.id,
          ctx.business.email,
        ),
      ),
      recentActivity: activity.map((entry) => ({
        ...mapGroupActivity(entry),
        groupName: entry.group.name,
      })),
    };
  }

  async getMineSections(ctx: BusinessContext) {
    const businessId = ctx.business.id;
    await this.ensurePlatformMembership(ctx);
    await this.ensureAutomaticNetworkMembership(ctx);
    const myGroups = await this.prisma.group.findMany({
      where: {
        OR: [
          { ownerId: businessId },
          { members: { some: { memberId: businessId } } },
        ],
      },
      include: { members: true },
      orderBy: { createdAt: "desc" },
    });

    const ownedIds = myGroups
      .filter((group) => group.ownerId === businessId)
      .map((group) => group.id);

    const [
      platformTotal,
      platformAutomatic,
      platformUserCreated,
      pendingInvites,
      openRequests,
      headStartGroups,
      automaticGroup,
    ] = await Promise.all([
      this.prisma.group.count(),
      this.prisma.group.count({ where: { source: "automatic" } }),
      this.prisma.group.count({ where: { source: "user-created" } }),
      this.prisma.invitation.count({
        where: {
          kind: "invite",
          status: "pending",
          OR: [
            { inviteeId: businessId },
            { inviteeEmail: ctx.business.email.trim().toLowerCase() },
          ],
        },
      }),
      this.prisma.invitation.count({
        where: {
          kind: "request",
          status: "pending",
          groupId: { in: ownedIds },
        },
      }),
      this.prisma.group.findMany({
        where: { ownerId: businessId, headStart: true },
        include: { members: true },
        orderBy: { createdAt: "asc" },
      }),
      this.prisma.group.findFirst({
        where: {
          source: "automatic",
          type: "Network",
          members: { some: { memberId: businessId } },
        },
        include: { members: true },
      }),
    ]);

    const ownerPlans = await this.ownerPlanMap(myGroups, ctx);
    const groups = myGroups.map((group) =>
      this.decorateGroup(group, ctx, ownerPlans.get(group.ownerId ?? "")),
    );
    const headStart = headStartGroups.map((group) =>
      this.decorateGroup(group, ctx, ownerPlans.get(group.ownerId ?? "")),
    );
    const automatic = groups.filter(
      (group) => group.source === "automatic" && group.isMember,
    );
    const created = groups.filter((group) => group.isOwner);
    const joined = groups.filter((group) => !group.isOwner && group.isMember);

    const platformGroupId = ctx.config.groupCreationRules.platformGroupId;
    const platformGroup =
      platformGroupId && isUuid(platformGroupId)
        ? await this.prisma.group.findUnique({
            where: { id: platformGroupId },
            include: { members: true },
          })
        : null;

    const stats = groupStatsFor(
      {
        total: platformTotal,
        automatic: platformAutomatic,
        userCreated: platformUserCreated,
      },
      myGroups,
      pendingInvites,
      openRequests,
      businessId,
    );
    const progressBase = automaticProgressFor(
      automaticGroup,
      ctx.config.automaticGrouping,
    );

    return {
      business: mapBusiness(ctx.business),
      plan: {
        variant: ctx.plan.variant,
        planName: ctx.plan.planName,
        status: ctx.plan.status,
        paid: ctx.plan.paid,
        agreementAccepted: ctx.plan.agreementAccepted,
        accessDays: ctx.plan.accessDays,
        accessFee: fromMinorPence(ctx.plan.accessFeeMinor),
        accessFeeMinor: ctx.plan.accessFeeMinor,
      },
      canCreateGroups: canCreateGroups(
        ctx.plan,
        ctx.config.groupCreationRules,
      ),
      creationRightsLabel: creationRightsLabel(
        ctx.config.groupCreationRules,
      ),
      stats,
      automaticProgress: {
        ...progressBase,
        group: automaticGroup
          ? this.decorateGroup(
              automaticGroup,
              ctx,
              ownerPlans.get(automaticGroup.ownerId ?? ""),
            )
          : null,
      },
      mandatoryGroups: this.mandatoryGroupStatuses(ctx, myGroups),
      headStartGroups: headStart,
      platformGroup: platformGroup
        ? this.decorateGroup(
            platformGroup,
            ctx,
            ownerPlans.get(platformGroup.ownerId ?? ""),
          )
        : null,
      automatic,
      created,
      joined,
      groups,
    };
  }

  async getMineSection(ctx: BusinessContext, section: string) {
    const sections = await this.getMineSections(ctx);
    const allowed = {
      automatic: sections.automatic,
      created: sections.created,
      joined: sections.joined,
      "head-start": sections.headStartGroups,
      all: sections.groups,
    } as const;

    if (!(section in allowed)) {
      throw new BadRequestException(
        `Unknown group section "${section}". Use automatic, created, joined, head-start or all.`,
      );
    }

    return {
      business: sections.business,
      plan: sections.plan,
      section,
      items: allowed[section as keyof typeof allowed],
      counts: {
        automatic: sections.automatic.length,
        created: sections.created.length,
        joined: sections.joined.length,
        headStart: sections.headStartGroups.length,
        all: sections.groups.length,
      },
    };
  }

  async explore(ctx: BusinessContext, query: BusinessGroupQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    const needle = query.search?.trim().toLowerCase();

    const groups = await this.prisma.group.findMany({
      where: {
        ownerId: { not: ctx.business.id },
        status: { in: ["Active", "Recruiting"] },
        NOT: { members: { some: { memberId: ctx.business.id } } },
        OR: [
          { directoryVisibility: null },
          { directoryVisibility: "directory" },
        ],
      },
      include: { members: true },
      orderBy: { createdAt: "desc" },
    });

    const ownerIds = [
      ...new Set(
        groups
          .map((group) => group.ownerId)
          .filter((id): id is string => Boolean(id)),
      ),
    ];
    const owners = ownerIds.length
      ? await this.prisma.business.findMany({
          where: { id: { in: ownerIds } },
          select: { id: true, status: true, verified: true },
        })
      : [];
    const hiddenOwners = new Set(
      owners
        .filter((owner) => owner.status !== "Active" || !owner.verified)
        .map((owner) => owner.id),
    );

    const filtered = groups.filter((group) => {
      if (group.ownerId && hiddenOwners.has(group.ownerId)) return false;
      if (query.type && group.type !== query.type) return false;
      if (query.city && group.city !== query.city) return false;
      if (query.localArea && group.localArea !== query.localArea) return false;
      if (query.status && group.status !== query.status) return false;
      if (query.pricing && (group.pricing ?? "free") !== query.pricing) {
        return false;
      }
      if (needle) {
        const haystack =
          `${group.name} ${group.purpose} ${group.type} ${group.ownerName}`.toLowerCase();
        if (!haystack.includes(needle)) return false;
      }
      return true;
    });

    const paged = filtered.slice((page - 1) * limit, page * limit);
    const ids = paged.map((group) => group.id);
    const pending = ids.length
      ? await this.prisma.invitation.findMany({
          where: {
            groupId: { in: ids },
            inviteeId: ctx.business.id,
            status: "pending",
          },
        })
      : [];
    const typeByType = new Map(
      ctx.config.groupTypes.map((entry) => [entry.type, entry]),
    );
    const ownerPlans = await this.ownerPlanMap(paged, ctx);
    const planEligibility = await this.planEligibilityMap(paged, ctx);

    return {
      items: paged.map((group) => {
        const request =
          pending.find(
            (entry) =>
              entry.groupId === group.id && entry.kind === "request",
          ) ?? null;
        const invite =
          pending.find(
            (entry) =>
              entry.groupId === group.id && entry.kind === "invite",
          ) ?? null;
        const decorated = this.decorateGroup(
          group,
          ctx,
          ownerPlans.get(group.ownerId ?? ""),
        );
        return {
          ...decorated,
          joinPlan: joinPlanFor(
            group,
            typeByType.get(group.type),
            request,
            invite,
            ctx.business.id,
            planEligibility.get(group.id) ?? true,
          ),
        };
      }),
      total: filtered.length,
      page,
      pageSize: limit,
    };
  }

  async getNetwork(ctx: BusinessContext) {
    await this.ensureAutomaticNetworkMembership(ctx);
    const automaticGroup = await this.prisma.group.findFirst({
      where: {
        source: "automatic",
        type: "Network",
        members: { some: { memberId: ctx.business.id } },
      },
      include: { members: true },
    });
    const [networkGroups, communities, automaticGroups] = await Promise.all([
      this.prisma.group.count({ where: { type: "Network" } }),
      this.prisma.group.count({ where: { type: "National Community" } }),
      this.prisma.group.findMany({
        where: { source: "automatic" },
        include: { members: true },
        orderBy: { createdAt: "asc" },
      }),
    ]);

    const ownerPlans = await this.ownerPlanMap(
      automaticGroups,
      ctx,
    );
    const progressBase = automaticProgressFor(
      automaticGroup,
      ctx.config.automaticGrouping,
    );

    return {
      group: automaticGroup
        ? this.decorateGroup(
            automaticGroup,
            ctx,
            ownerPlans.get(automaticGroup.ownerId ?? ""),
          )
        : null,
      progress: {
        ...progressBase,
        group: automaticGroup
          ? this.decorateGroup(
              automaticGroup,
              ctx,
              ownerPlans.get(automaticGroup.ownerId ?? ""),
            )
          : null,
      },
      stats: {
        networkGroups,
        nationalCommunities: communities,
        automaticMembers: automaticGroups.reduce(
          (sum, group) => sum + group.members.length,
          0,
        ),
        threshold: ctx.config.automaticGrouping.threshold,
        nextThresholdAt: ctx.config.automaticGrouping.threshold,
      },
      groups: automaticGroups.map((group) =>
        this.decorateGroup(group, ctx, ownerPlans.get(group.ownerId ?? "")),
      ),
    };
  }

  async getGroup(ctx: BusinessContext, groupId: string) {
    const group = await this.findGroup(groupId);
    this.assertCanView(group, ctx.business.id);

    const isMember =
      group.ownerId === ctx.business.id ||
      (group.members?.some(
        (member) => member.memberId === ctx.business.id,
      ) ??
        false);
    if (!isMember && !["Active", "Recruiting"].includes(group.status)) {
      throw new NotFoundException("Group not found");
    }

    const [owner, programme, campaigns, relationships, activity, pending] =
      await Promise.all([
        group.ownerId
          ? this.prisma.business.findUnique({ where: { id: group.ownerId } })
          : null,
        group.programmeId
          ? this.prisma.programme.findUnique({
              where: { id: group.programmeId },
            })
          : null,
        this.prisma.campaign.findMany({
          where: { groupIds: { has: group.id } },
        }),
        this.prisma.relationship.findMany({
          where: {
            id: {
              in: [
                group.accountManagerId,
                group.agentId,
                group.consultantId,
              ].filter((id): id is string => Boolean(id)),
            },
          },
        }),
        this.prisma.groupActivity.findMany({
          where: { groupId: group.id },
          orderBy: { at: "desc" },
          take: 20,
        }),
        this.prisma.invitation.findMany({
          where: {
            groupId: group.id,
            status: "pending",
            OR: [
              { inviteeId: ctx.business.id },
              { inviteeEmail: ctx.business.email.trim().toLowerCase() },
            ],
          },
        }),
      ]);

    if (
      !isMember &&
      owner &&
      (owner.status !== "Active" || !owner.verified)
    ) {
      throw new NotFoundException("Group not found");
    }

    const pendingRequest =
      pending.find((entry) => entry.kind === "request") ?? null;
    const pendingInvite =
      pending.find((entry) => entry.kind === "invite") ?? null;
    const typeConfig = ctx.config.groupTypes.find(
      (entry) => entry.type === group.type,
    );
    const ownerPlan = (await this.ownerPlanMap([group], ctx)).get(
      group.ownerId ?? "",
    );
    const decorated = this.decorateGroup(group, ctx, ownerPlan);
    const planEligibility = await this.planEligibilityMap([group], ctx);
    const byId = new Map(relationships.map((entry) => [entry.id, entry]));
    const relationshipFor = (relationshipId: string | null) => {
      if (!relationshipId) return null;
      const relationship = byId.get(relationshipId);
      return relationship ? mapRelationship(relationship) : null;
    };

    return {
      group: {
        ...decorated,
        joinPlan: joinPlanFor(
          group,
          typeConfig,
          pendingRequest,
          pendingInvite,
          ctx.business.id,
          planEligibility.get(group.id) ?? true,
        ),
      },
      owner: owner ? mapBusiness(owner) : null,
      programme: programme ? mapProgramme(programme) : null,
      campaigns: campaigns.map(mapCampaign),
      relationships: {
        accountManager: relationshipFor(group.accountManagerId),
        agent: relationshipFor(group.agentId),
        consultant: relationshipFor(group.consultantId),
      },
      activity: activity.map(mapGroupActivity),
      counts: {
        members: decorated.memberCount,
        activity: activity.length,
        pendingInvitations: await this.prisma.invitation.count({
          where: { groupId: group.id, kind: "invite", status: "pending" },
        }),
        pendingRequests: await this.prisma.invitation.count({
          where: { groupId: group.id, kind: "request", status: "pending" },
        }),
        circles: await this.prisma.groupCircle.count({
          where: { groupId: group.id },
        }),
      },
      circles: await this.prisma.groupCircle
        .findMany({ where: { groupId: group.id }, orderBy: { createdAt: "asc" } })
        .then((circles) => circles.map(mapGroupCircle)),
    };
  }

  async getMembers(ctx: BusinessContext, groupId: string) {
    const group = await this.findGroup(groupId);
    this.assertCanView(group, ctx.business.id);

    const ownerPlan = (await this.ownerPlanMap([group], ctx)).get(
      group.ownerId ?? "",
    );
    const members = group.members ?? [];
    return {
      group: this.decorateGroup(group, ctx, ownerPlan),
      members: members.map(mapGroupMember),
      stats: {
        total: members.length,
        active: members.filter((member) => member.status === "active").length,
        core: members.filter((member) => member.role === "core").length,
        peripheral: members.filter((member) => member.role === "peripheral")
          .length,
        bankers: members.filter((member) => member.role === "banker").length,
        pendingInvitations: await this.prisma.invitation.count({
          where: { groupId, kind: "invite", status: "pending" },
        }),
      },
    };
  }

  async getActivity(ctx: BusinessContext, groupId: string) {
    const group = await this.findGroup(groupId);
    this.assertCanView(group, ctx.business.id);
    const activity = await this.prisma.groupActivity.findMany({
      where: { groupId },
      orderBy: { at: "desc" },
    });
    return activity.map(mapGroupActivity);
  }

  async postActivity(
    ctx: BusinessContext,
    groupId: string,
    dto: CreateGroupActivityDto,
  ) {
    const group = await this.findGroup(groupId);
    const isMember =
      group.ownerId === ctx.business.id ||
      (group.members?.some(
        (member) => member.memberId === ctx.business.id,
      ) ??
        false);
    if (!isMember) {
      throw new ForbiddenException("Only group members can post activity.");
    }
    if (!["Active", "Recruiting"].includes(group.status)) {
      throw new ConflictException(
        "This group is not accepting activity right now.",
      );
    }
    if ((group.interactionLevel ?? "message") === "read") {
      throw new ForbiddenException({
        code: "GROUP_READ_ONLY",
        message: "This group is configured as read-only.",
      });
    }

    const activity = await this.prisma.groupActivity.create({
      data: {
        groupId,
        actorName: ctx.business.name,
        kind: "update",
        message: dto.message.trim(),
      },
    });
    return mapGroupActivity(activity);
  }

  async getGroupInvitations(ctx: BusinessContext, groupId: string) {
    const group = await this.findGroup(groupId);
    this.assertOwner(group, ctx.business.id);
    const invitations = await this.prisma.invitation.findMany({
      where: { groupId },
      orderBy: { createdAt: "desc" },
    });
    return invitations.map((invitation) =>
      mapInvitationForBusiness(
        invitation,
        ctx.business.id,
        ctx.business.email,
      ),
    );
  }

  async create(ctx: BusinessContext, dto: CreateBusinessGroupDto) {
    if (!canCreateGroups(ctx.plan, ctx.config.groupCreationRules)) {
      throw new ForbiddenException({
        code: "GROUP_CREATION_NOT_ALLOWED",
        message:
          "Your plan does not allow creating groups. Complete the paid access agreement or contact an administrator.",
      });
    }

    const partnerPermissions = partnerPermissionsFor(
      ctx.partner,
      ctx.config.partnerDefaults,
    );
    assertPartnerPermission(
      partnerPermissions,
      "canCreateGroups",
      "Your partner permissions do not allow creating groups.",
    );
    if (dto.type === "Partner" && !ctx.business.isPartner) {
      throw new ForbiddenException(
        "Only partner businesses can create Partner groups.",
      );
    }

    const settings = ctx.config.platformSettings as {
      defaultRequiredSize?: number;
      defaultPricing?: string;
      defaultVisibility?: string;
    };
    const pricing =
      dto.pricing ??
      (settings.defaultPricing === "paid" ? "paid" : "free");
    const visibility =
      dto.visibility ??
      (settings.defaultVisibility === "members" ? "members" : "directory");
    const requiredSize =
      dto.requiredSize ?? Number(settings.defaultRequiredSize ?? 0);
    const accessType = dto.accessType ?? this.defaultAccessType(ctx);

    assertPartnerPermission(
      partnerPermissions,
      pricing === "paid" ? "canRunPaidGroups" : "canRunFreeGroups",
      `Your partner permissions do not allow ${pricing} groups.`,
    );
    if (pricing === "paid" || dto.contribution !== undefined) {
      assertPartnerPermission(
        partnerPermissions,
        "canSetContributionAmounts",
        "Your partner permissions do not allow setting contribution amounts.",
      );
    }

    assertStageLabel(dto.stage, ctx.config.stageLabels);
    const location = await assertLocation(this.geography, {
      city: dto.city,
      localArea: dto.localArea,
      highStreet: dto.highStreet,
      localMall: dto.localMall,
    });
    await assertCampaignsAvailable(this.prisma, dto.campaignIds);

    this.assertGroupType(ctx, dto.type);
    this.assertPaymentRules(ctx, pricing, dto.contribution);

    const creationRules = ctx.config.groupCreationRules;
    const recruitmentTarget = Math.max(
      recruitmentTargetFor(
        creationRules,
        ctx.plan.planName,
        normalizeVariant(ctx.plan.variant),
      ),
      Math.max(0, requiredSize),
    );
    // The owner is the first member, so a target of 0 or 1 is already met.
    const initialStatus =
      !creationRules.activationEnabled || recruitmentTarget <= 1
        ? "Active"
        : "Recruiting";

    const owned = await this.prisma.group.findMany({
      where: { ownerId: ctx.business.id },
      select: { type: true },
    });
    const missingMandatory = ctx.config.mandatoryGroups.filter(
      (rule) =>
        rule.required && !owned.some((group) => group.type === rule.type),
    );
    if (
      missingMandatory.length > 0 &&
      !missingMandatory.some((rule) => rule.type === dto.type)
    ) {
      throw new ConflictException({
        code: "MANDATORY_GROUPS_REQUIRED",
        message: `Create the required group types first: ${missingMandatory
          .map((rule) => rule.type)
          .join(", ")}`,
        requiredTypes: missingMandatory.map((rule) => rule.type),
      });
    }

    const mandatoryCircles = applicableMandatoryCircles(
      ctx.config.mandatoryCircles,
      ctx.plan.paid,
    );
    if (mandatoryCircles.length > 0) {
      const circles = await this.prisma.circle.findMany({
        where: { businessId: ctx.business.id },
        select: { type: true, memberIds: true },
      });
      const missingCircles = unsatisfiedMandatoryCircles(
        mandatoryCircles,
        circles,
      );
      if (missingCircles.length > 0) {
        throw new ConflictException({
          code: "MANDATORY_CIRCLES_REQUIRED",
          message: `Set up the required circles first: ${missingCircles
            .map((entry) => entry.rule.circleType)
            .join(", ")}`,
          requiredCircles: missingCircles.map((entry) => ({
            type: entry.rule.circleType,
            current: entry.current,
            required: entry.required,
          })),
        });
      }
    }

    const mandatoryRule = ctx.config.mandatoryGroups.find(
      (rule) => rule.type === dto.type,
    );
    if (mandatoryRule?.pricing === "paid" && pricing !== "paid") {
      throw new BadRequestException(
        `The ${dto.type} group is configured as a paid group.`,
      );
    }
    if (pricing === "paid" && dto.contribution === undefined) {
      throw new BadRequestException(
        "A contribution amount is required for a paid group.",
      );
    }

    const planQuota = await this.groupQuota(ctx);
    const quota = partnerPermissions
      ? Math.min(planQuota, partnerPermissions.maxGroups)
      : planQuota;
    if (owned.length >= quota) {
      throw new ForbiddenException({
        code: "GROUP_QUOTA_REACHED",
        message: `Your plan allows ${quota} groups.`,
      });
    }

    const slug = await this.context.uniqueSlug(dto.name);
    const created = await this.prisma.$transaction(async (tx) => {
      const group = await tx.group.create({
        data: {
          name: dto.name,
          slug,
          description: dto.description ?? dto.purpose,
          type: dto.type,
          source: "user-created",
          headStart: false,
          purpose: dto.purpose,
          ownerId: ctx.business.id,
          ownerName: ctx.business.name,
          memberCount: 1,
          city: location.city ?? dto.city,
          localArea: location.borough ?? dto.localArea,
          highStreet: location.highStreet ?? dto.highStreet,
          localMallName: location.localMall ?? dto.localMall,
          cityId: location.cityId,
          boroughId: location.boroughId,
          highStreetId: location.highStreetId,
          localMallId: location.localMallId,
          requiredSize,
          stage: dto.stage,
          status: initialStatus,
          accessType,
          directoryVisibility: visibility,
          interactionLevel: dto.interactionLevel ?? "message",
          pricing,
          contributionMinor:
            pricing === "paid" && dto.contribution !== undefined
              ? toMinorPence(dto.contribution)
              : null,
          contributionFrequency:
            pricing === "paid"
              ? (dto.contributionFrequency ?? "once")
              : null,
          campaignIds: dto.campaignIds ?? [],
          visibility:
            (dto.visibility ?? "directory") === "directory"
              ? "PUBLIC"
              : "PRIVATE",
        },
        include: { members: true },
      });

      await tx.groupMember.create({
        data: {
          groupId: group.id,
          memberId: ctx.business.id,
          fullName: ctx.business.contactName,
          businessName: ctx.business.name,
          category: ctx.business.category,
          location: ctx.business.city,
          status: "active",
          role: "owner",
          tier: ctx.business.tier,
        },
      });

      await tx.groupActivity.create({
        data: {
          groupId: group.id,
          actorName: ctx.business.name,
          kind: "created",
          message: `${ctx.business.name} created ${group.name}`,
        },
      });

      await tx.auditLog.create({
        data: {
          action: "group-created",
          actorId: ctx.user.id,
          actorName: ctx.business.name,
          targetType: "group",
          targetId: group.id,
          targetName: group.name,
          detail: "Group created from the business dashboard",
        },
      });

      return group;
    });

    const withMember = await this.findGroup(created.id);
    return this.decorateGroup(withMember, ctx);
  }

  async update(
    ctx: BusinessContext,
    groupId: string,
    dto: UpdateBusinessGroupDto,
  ) {
    const group = await this.findGroup(groupId);
    this.assertOwner(group, ctx.business.id);

    const partnerPermissions = partnerPermissionsFor(
      ctx.partner,
      ctx.config.partnerDefaults,
    );
    if (dto.pricing !== undefined) {
      assertPartnerPermission(
        partnerPermissions,
        dto.pricing === "paid" ? "canRunPaidGroups" : "canRunFreeGroups",
        `Your partner permissions do not allow ${dto.pricing} groups.`,
      );
    }
    if (dto.contribution !== undefined || dto.pricing === "paid") {
      assertPartnerPermission(
        partnerPermissions,
        "canSetContributionAmounts",
        "Your partner permissions do not allow setting contribution amounts.",
      );
    }
    assertStageLabel(dto.stage, ctx.config.stageLabels);
    const location =
      dto.city !== undefined ||
      dto.localArea !== undefined ||
      dto.highStreet !== undefined ||
      dto.localMall !== undefined
        ? await assertLocation(this.geography, {
            city: dto.city ?? group.city,
            localArea: dto.localArea ?? group.localArea,
            highStreet: dto.highStreet ?? group.highStreet,
            localMall: dto.localMall ?? group.localMallName,
          })
        : null;
    await assertCampaignsAvailable(this.prisma, dto.campaignIds);

    const currentVisibility =
      group.directoryVisibility ??
      (group.visibility === "PRIVATE" ? "members" : "directory");
    const changesOperation =
      (dto.status !== undefined && dto.status !== "Closed") ||
      (dto.accessType !== undefined && dto.accessType !== group.accessType) ||
      (dto.visibility !== undefined && dto.visibility !== currentVisibility) ||
      (dto.interactionLevel !== undefined &&
        dto.interactionLevel !== group.interactionLevel) ||
      (dto.pricing !== undefined && dto.pricing !== group.pricing) ||
      (dto.contribution !== undefined &&
        toMinorPence(dto.contribution) !== group.contributionMinor) ||
      (dto.contributionFrequency !== undefined &&
        dto.contributionFrequency !== group.contributionFrequency) ||
      (dto.campaignIds !== undefined &&
        dto.campaignIds.join(",") !== group.campaignIds.join(","));

    if (changesOperation && dto.status !== "Closed") {
      this.assertGroupOperational(group, ctx);
    }

    if (dto.pricing === "paid") {
      this.assertPaymentRules(
        ctx,
        "paid",
        dto.contribution ??
          (group.contributionMinor != null
            ? fromMinorPence(group.contributionMinor)
            : undefined),
      );
    }
    if (
      dto.pricing === "free" &&
      group.pricing === "paid" &&
      dto.contribution !== undefined
    ) {
      throw new BadRequestException(
        "A free group cannot have a contribution amount.",
      );
    }

    const data: Prisma.GroupUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.purpose !== undefined) data.purpose = dto.purpose;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.status !== undefined) {
      // Owners may close their own group, but only the activation sync (or an
      // administrator) may mark it Active again.
      if (dto.status !== "Closed") {
        throw new BadRequestException(
          "Only closing a group is allowed from the business dashboard.",
        );
      }
      data.status = "Closed";
    }
    if (dto.accessType !== undefined) data.accessType = dto.accessType;
    if (dto.visibility !== undefined) {
      data.directoryVisibility = dto.visibility;
      data.visibility = dto.visibility === "directory" ? "PUBLIC" : "PRIVATE";
    }
    if (dto.interactionLevel !== undefined) {
      data.interactionLevel = dto.interactionLevel;
    }
    if (dto.pricing !== undefined) data.pricing = dto.pricing;
    if (dto.contribution !== undefined) {
      data.contributionMinor = toMinorPence(dto.contribution);
    }
    if (dto.contributionFrequency !== undefined) {
      data.contributionFrequency = dto.contributionFrequency;
    }
    if (location) {
      data.city = location.city;
      data.localArea = location.borough;
      data.highStreet = location.highStreet;
      data.localMallName = location.localMall;
      data.cityId = location.cityId;
      data.boroughId = location.boroughId;
      data.highStreetId = location.highStreetId;
      data.localMallId = location.localMallId;
    }
    if (dto.requiredSize !== undefined) data.requiredSize = dto.requiredSize;
    if (dto.stage !== undefined) data.stage = dto.stage.trim() || null;
    if (dto.campaignIds !== undefined) data.campaignIds = dto.campaignIds;

    if (Object.keys(data).length === 0) {
      return this.decorateGroup(group, ctx);
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.group.update({
        where: { id: groupId },
        data,
        include: { members: true },
      });
      await tx.groupActivity.create({
        data: {
          groupId,
          actorName: ctx.business.name,
          kind: "settings",
          message: `${ctx.business.name} updated ${result.name} settings`,
        },
      });
      await tx.auditLog.create({
        data: {
          action: "group-updated",
          actorId: ctx.user.id,
          actorName: ctx.business.name,
          targetType: "group",
          targetId: groupId,
          targetName: result.name,
          detail: "Group settings updated from the business dashboard",
        },
      });
      return result;
    });

    return this.decorateGroup(updated, ctx);
  }

  async join(ctx: BusinessContext, groupId: string) {
    const group = await this.findGroup(groupId);
    if (group.ownerId === ctx.business.id) {
      throw new ConflictException("You already own this group");
    }
    if (group.members?.some((member) => member.memberId === ctx.business.id)) {
      throw new ConflictException("You are already a member of this group");
    }
    if (!["Active", "Recruiting"].includes(group.status)) {
      throw new ConflictException({
        code: "GROUP_NOT_JOINABLE",
        message: `The group is ${group.status.toLowerCase()} and is not accepting members.`,
      });
    }
    if (group.ownerId) {
      const owner = await this.prisma.business.findUnique({
        where: { id: group.ownerId },
        select: { status: true, verified: true },
      });
      if (owner && (owner.status !== "Active" || !owner.verified)) {
        throw new ForbiddenException(
          "This group is not currently available.",
        );
      }
    }
    const typeConfig = ctx.config.groupTypes.find(
      (entry) => entry.type === group.type,
    );
    if (typeConfig && (!typeConfig.enabled || !typeConfig.allowJoin)) {
      throw new ForbiddenException("Joining is disabled for this group type");
    }
    if (group.accessType === "invitation") {
      throw new ForbiddenException("This group is invitation-only");
    }

    await this.assertPlanEligibility(group, ctx);

    if (group.accessType === "open" && group.pricing === "paid") {
      const periodKey = contributionPeriodKey(group.contributionFrequency);
      const paid = await this.prisma.payment.findFirst({
        where: {
          purpose: "GROUP_CONTRIBUTION",
          groupId,
          memberId: ctx.business.id,
          periodKey,
          status: "PAID",
          deletedAt: null,
        },
      });
      if (!paid) {
        throw new ConflictException({
          code: "PAYMENT_REQUIRED",
          message: `This group requires a £${fromMinorPence(group.contributionMinor)} contribution.`,
          groupId,
          amountMinor: (group.contributionMinor ?? 0).toString(),
          amount: fromMinorPence(group.contributionMinor),
          frequency: group.contributionFrequency ?? "once",
          periodKey,
        });
      }
    }

    if (group.accessType === "open") {
      await this.prisma.$transaction(async (tx) => {
        await tx.groupMember.create({
          data: {
            groupId,
            memberId: ctx.business.id,
            fullName: ctx.business.contactName,
            businessName: ctx.business.name,
            category: ctx.business.category,
            location: ctx.business.city,
            status: "active",
            role: "peripheral",
            tier: ctx.business.tier,
          },
        });
        const result = await tx.group.update({
          where: { id: groupId },
          data: { memberCount: { increment: 1 } },
          include: { members: true },
        });
        await tx.groupActivity.create({
          data: {
            groupId,
            actorName: ctx.business.name,
            kind: "join",
            message: `${ctx.business.name} joined the group`,
          },
        });
        await tx.auditLog.create({
          data: {
            action: "member-added",
            actorId: ctx.user.id,
            actorName: ctx.business.name,
            targetType: "member",
            targetId: ctx.business.id,
            targetName: ctx.business.name,
            detail: `Joined group ${group.name}`,
          },
        });
        return result;
      });
      await syncGroupActivationStatus(
        this.prisma,
        groupId,
        ctx.config.groupCreationRules,
      );
      const refreshed = await this.findGroup(groupId);
      const ownerPlan = (await this.ownerPlanMap([refreshed], ctx)).get(
        refreshed.ownerId ?? "",
      );
      return {
        status: "joined" as const,
        group: this.decorateGroup(refreshed, ctx, ownerPlan),
      };
    }

    const existing = await this.prisma.invitation.findFirst({
      where: {
        groupId,
        inviteeId: ctx.business.id,
        kind: "request",
        status: "pending",
      },
    });
    if (existing) {
      return {
        status: "requested" as const,
        invitation: mapInvitationForBusiness(
          existing,
          ctx.business.id,
          ctx.business.email,
        ),
      };
    }

    const invitation = await this.prisma.$transaction(async (tx) => {
      const created = await tx.invitation.create({
        data: {
          id: randomUUID(),
          groupId,
          direction: "outgoing",
          kind: "request",
          inviteeId: ctx.business.id,
          inviteeName: ctx.business.name,
          inviteeEmail: ctx.business.email,
          inviteeRole: "business-invitee",
          invitedById: ctx.business.id,
          invitedByName: ctx.business.name,
          status: "pending",
        },
      });
      await tx.groupActivity.create({
        data: {
          groupId,
          actorName: ctx.business.name,
          kind: "update",
          message: `${ctx.business.name} requested to join ${group.name}`,
        },
      });
      return created;
    });

    return {
      status: "requested" as const,
      invitation: mapInvitationForBusiness(
        invitation,
        ctx.business.id,
        ctx.business.email,
      ),
    };
  }

  async leave(ctx: BusinessContext, groupId: string) {
    const group = await this.findGroup(groupId);
    if (group.ownerId === ctx.business.id) {
      throw new BadRequestException(
        "Group owners cannot leave their own group. Close the group or transfer ownership instead.",
      );
    }
    const membership = group.members?.find(
      (member) => member.memberId === ctx.business.id,
    );
    if (!membership) {
      throw new NotFoundException("You are not a member of this group");
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.groupMember.delete({ where: { id: membership.id } });
      await tx.group.update({
        where: { id: groupId },
        data: { memberCount: { decrement: 1 } },
      });
      await tx.groupActivity.create({
        data: {
          groupId,
          actorName: ctx.business.name,
          kind: "leave",
          message: `${ctx.business.name} left the group`,
        },
      });
      await tx.auditLog.create({
        data: {
          action: "member-removed",
          actorId: ctx.user.id,
          actorName: ctx.business.name,
          targetType: "member",
          targetId: ctx.business.id,
          targetName: ctx.business.name,
          detail: `Left group ${group.name}`,
        },
      });
    });

    await syncGroupActivationStatus(
      this.prisma,
      groupId,
      ctx.config.groupCreationRules,
    );
    return { ok: true };
  }

  async removeMember(
    ctx: BusinessContext,
    groupId: string,
    memberId: string,
  ) {
    const group = await this.findGroup(groupId);
    this.assertOwner(group, ctx.business.id);
    assertPartnerPermission(
      partnerPermissionsFor(ctx.partner, ctx.config.partnerDefaults),
      "canRemoveMembers",
      "Your partner permissions do not allow removing members.",
    );
    if (memberId === ctx.business.id || memberId === group.ownerId) {
      throw new BadRequestException("The group owner cannot be removed");
    }
    const member = group.members?.find((entry) => entry.memberId === memberId);
    if (!member) {
      throw new NotFoundException("Member not found in this group");
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.groupMember.delete({ where: { id: member.id } });
      await tx.group.update({
        where: { id: groupId },
        data: { memberCount: { decrement: 1 } },
      });
      await tx.groupActivity.create({
        data: {
          groupId,
          actorName: ctx.business.name,
          kind: "update",
          message: `${ctx.business.name} removed ${member.fullName} from ${group.name}`,
        },
      });
      await tx.auditLog.create({
        data: {
          action: "member-removed",
          actorId: ctx.user.id,
          actorName: ctx.business.name,
          targetType: "member",
          targetId: memberId,
          targetName: member.fullName,
          detail: `Removed from group ${group.name}`,
        },
      });
    });

    await syncGroupActivationStatus(
      this.prisma,
      groupId,
      ctx.config.groupCreationRules,
    );
    return { ok: true };
  }

  async invite(
    ctx: BusinessContext,
    groupId: string,
    dto: InviteMembersDto,
  ) {
    const group = await this.findGroup(groupId);
    const invitingPolicy = String(
      ctx.config.accessRules.invitingPolicy ?? "owners-only",
    );
    const isOwner = group.ownerId === ctx.business.id;
    const isMember =
      group.members?.some(
        (member) => member.memberId === ctx.business.id,
      ) ?? false;
    if (!isOwner && (invitingPolicy === "owners-only" || !isMember)) {
      throw new ForbiddenException(
        "Only the group owner can invite members.",
      );
    }
    assertPartnerPermission(
      partnerPermissionsFor(ctx.partner, ctx.config.partnerDefaults),
      "canInviteMembers",
      "Your partner permissions do not allow inviting members.",
    );

    const settings = ctx.config.platformSettings as {
      defaultGreeting?: string;
      smsFallback?: boolean;
    };
    const greeting = settings.defaultGreeting?.trim();
    const smsFallback = settings.smsFallback !== false;

    const created: Invitation[] = [];
    let skipped = 0;

    await this.prisma.$transaction(async (tx) => {
      for (const entry of dto.entries) {
        if (!entry.inviteeId && !entry.inviteeEmail && !entry.inviteePhone) {
          throw new BadRequestException(
            `Invitation for ${entry.inviteeName} needs an invitee, email or phone number`,
          );
        }
        if (!entry.inviteeEmail && entry.inviteePhone && !smsFallback) {
          throw new BadRequestException(
            "SMS fallback is disabled, so phone-only invitations cannot be sent.",
          );
        }
        const emailInvitee = entry.inviteeEmail
          ? await tx.business.findUnique({
              where: { email: entry.inviteeEmail.trim().toLowerCase() },
            })
          : null;
        const inviteeBusinessId = entry.inviteeId ?? emailInvitee?.id;
        const alreadyMember =
          Boolean(inviteeBusinessId) &&
          (inviteeBusinessId === group.ownerId ||
            (group.members ?? []).some(
              (member) => member.memberId === inviteeBusinessId,
            ));
        if (alreadyMember) {
          skipped += 1;
          continue;
        }
        const duplicate = await tx.invitation.findFirst({
          where: {
            groupId,
            status: "pending",
            OR: [
              ...(entry.inviteeId
                ? [{ inviteeId: entry.inviteeId }]
                : []),
              ...(entry.inviteeEmail
                ? [{ inviteeEmail: entry.inviteeEmail }]
                : []),
              ...(entry.inviteePhone
                ? [{ inviteePhone: entry.inviteePhone }]
                : []),
            ],
          },
        });
        if (duplicate) {
          skipped += 1;
          continue;
        }

        const invitation = await tx.invitation.create({
          data: {
            id: randomUUID(),
            groupId,
            direction: "outgoing",
            kind: "invite",
            inviteeId: entry.inviteeId,
            inviteeName: entry.inviteeName,
            inviteeEmail: entry.inviteeEmail,
            inviteePhone: entry.inviteePhone,
            inviteeRole: entry.inviteeRole ?? "business-invitee",
            invitedById: ctx.business.id,
            invitedByName: ctx.business.name,
            status: "pending",
          },
        });
        created.push(invitation);
        await tx.groupActivity.create({
          data: {
            groupId,
            actorName: ctx.business.name,
            kind: "invite",
            message: greeting
              ? `${ctx.business.name} invited ${entry.inviteeName}: ${greeting}`
              : `${ctx.business.name} invited ${entry.inviteeName}`,
          },
        });
      }
    });

    if (created.length > 0) {
      await this.prisma.auditLog.create({
        data: {
          action: "invitation-approved",
          actorId: ctx.user.id,
          actorName: ctx.business.name,
          targetType: "invitation",
          targetId: created[0].id,
          targetName: `${created.length} invitation${
            created.length === 1 ? "" : "s"
          }`,
          detail: `Invitations sent from group ${group.name}`,
        },
      });
    }

    return {
      invitations: created.map(mapInvitation),
      created: created.length,
      skipped,
    };
  }

  mandatoryGroupStatuses(ctx: BusinessContext, owned: GroupWithMembers[]) {
    return ctx.config.mandatoryGroups.map((rule) => {
      const group = owned.find(
        (entry) =>
          entry.ownerId === ctx.business.id && entry.type === rule.type,
      );
      return {
        type: rule.type,
        required: rule.required,
        pricing: rule.pricing,
        satisfied: Boolean(group),
        group: group ? mapGroup(group) : undefined,
      };
    });
  }

  private decorateGroup(
    group: GroupWithMembers,
    ctx: BusinessContext,
    ownerPlan?: { planName: string; variant: string },
  ): DecoratedGroup {
    const base = mapGroup(group);
    const isOwner = base.ownerId === ctx.business.id;
    const isMember =
      group.members?.some(
        (member) => member.memberId === ctx.business.id,
      ) ?? false;
    const plan = ownerPlan
      ? {
          planName: ownerPlan.planName,
          variant: ownerPlan.variant as PlanVariant,
        }
      : planForOwner(
          ctx.business.tier,
          true,
          ctx.plan,
        );

    return {
      ...base,
      isOwner,
      isMember,
      role: isOwner ? "owner" : isMember ? "member" : "none",
      activation: activationFor(
        group,
        plan.planName,
        plan.variant,
        ctx.config.groupCreationRules,
      ),
    };
  }

  private async planEligibilityMap(
    groups: Pick<Group, "id" | "requiredPlanIds">[],
    ctx: BusinessContext,
  ): Promise<Map<string, boolean>> {
    const planIds = [
      ...new Set(groups.flatMap((group) => group.requiredPlanIds)),
    ];
    if (planIds.length === 0) return new Map();

    const plans = await this.prisma.plan.findMany({
      where: { id: { in: planIds } },
      select: { id: true, name: true, variant: true },
    });
    const member = {
      planId: ctx.plan.planId,
      planName: ctx.plan.planName,
      variant: ctx.plan.variant,
      active: ctx.plan.paid || ctx.plan.status === "Active",
    };

    return new Map(
      groups.map((group) => [
        group.id,
        matchesRequiredPlans(group.requiredPlanIds, plans, member),
      ]),
    );
  }

  private async assertPlanEligibility(
    group: Pick<Group, "requiredPlanIds">,
    ctx: BusinessContext,
  ): Promise<void> {
    if (group.requiredPlanIds.length === 0) return;

    const plans = await this.prisma.plan.findMany({
      where: { id: { in: group.requiredPlanIds } },
      select: { id: true, name: true, variant: true },
    });
    const eligible = matchesRequiredPlans(group.requiredPlanIds, plans, {
      planId: ctx.plan.planId,
      planName: ctx.plan.planName,
      variant: ctx.plan.variant,
      active: ctx.plan.paid || ctx.plan.status === "Active",
    });
    if (!eligible) {
      throw new ForbiddenException({
        code: "PLAN_REQUIRED",
        message:
          "This group is only open to members on selected plans. Upgrade your plan to join.",
      });
    }
  }

  private async ownerPlanMap(
    groups: Pick<Group, "ownerId">[],
    ctx: BusinessContext,
  ): Promise<Map<string, { planName: string; variant: string }>> {
    const ids = [
      ...new Set(
        groups
          .map((group) => group.ownerId)
          .filter((id): id is string => Boolean(id) && id !== ctx.business.id),
      ),
    ];
    if (ids.length === 0) return new Map();
    const [owners, plans] = await Promise.all([
      this.prisma.business.findMany({
        where: { id: { in: ids } },
        select: { id: true, tier: true },
      }),
      this.prisma.businessPlan.findMany({
        where: { businessId: { in: ids } },
        select: { businessId: true, planName: true, variant: true },
      }),
    ]);
    const planByBusiness = new Map(
      plans.map((plan) => [plan.businessId, plan]),
    );
    return new Map(
      owners.map((owner) => {
        const plan = planByBusiness.get(owner.id);
        return [
          owner.id,
          {
            planName: plan?.planName?.trim() || owner.tier,
            variant: normalizeVariant(plan?.variant),
          },
        ];
      }),
    );
  }

  /**
   * Adds a business that cannot create its own groups to the platform group
   * chosen by the administrator. Runs on dashboard entry and is idempotent.
   */
  private async ensurePlatformMembership(ctx: BusinessContext): Promise<void> {
    const rules = ctx.config.groupCreationRules;
    const platformGroupId = rules.platformGroupId;
    const accessExpired = Boolean(
      ctx.plan.accessExpiresAt &&
        ctx.plan.accessExpiresAt.getTime() <= Date.now(),
    );
    const central = ctx.plan.accessSource !== "local";
    if (
      (!central && !ctx.plan.agreementAccepted) ||
      (!central && rules.requirePaidAccess && (!ctx.plan.paid || accessExpired)) ||
      !rules.restrictToPlatformGroup ||
      !platformGroupId ||
      !isUuid(platformGroupId) ||
      canCreateGroups(ctx.plan, rules)
    ) {
      return;
    }

    const group = await this.prisma.group.findUnique({
      where: { id: platformGroupId },
      select: {
        id: true,
        name: true,
        ownerId: true,
        status: true,
        pricing: true,
        requiredPlanIds: true,
      },
    });
    if (
      !group ||
      group.ownerId === ctx.business.id ||
      group.status === "Closed" ||
      group.status === "Suspended" ||
      group.pricing === "paid"
    ) {
      return;
    }

    // A platform group can still be plan-gated. Do not auto-place a business
    // into a group whose required plans it does not hold.
    if (group.requiredPlanIds.length > 0) {
      const plans = await this.prisma.plan.findMany({
        where: { id: { in: group.requiredPlanIds } },
        select: { id: true, name: true, variant: true },
      });
      const eligible = matchesRequiredPlans(
        group.requiredPlanIds,
        plans,
        {
          planId: ctx.plan.planId,
          planName: ctx.plan.planName,
          variant: ctx.plan.variant,
          active: ctx.plan.paid || ctx.plan.status === "Active",
        },
      );
      if (!eligible) return;
    }

    const existing = await this.prisma.groupMember.findUnique({
      where: {
        groupId_memberId: {
          groupId: group.id,
          memberId: ctx.business.id,
        },
      },
      select: { id: true },
    });
    if (existing) return;

    try {
      await this.prisma.$transaction(async (tx) => {
        const raced = await tx.groupMember.findUnique({
          where: {
            groupId_memberId: {
              groupId: group.id,
              memberId: ctx.business.id,
            },
          },
          select: { id: true },
        });
        if (raced) return;

        await tx.groupMember.create({
          data: {
            groupId: group.id,
            memberId: ctx.business.id,
            fullName: ctx.business.contactName,
            businessName: ctx.business.name,
            category: ctx.business.category,
            location: ctx.business.city,
            status: "active",
            role: "peripheral",
            tier: ctx.business.tier,
            contributionStatus: "n/a",
          },
        });
        await tx.group.update({
          where: { id: group.id },
          data: { memberCount: { increment: 1 } },
        });
        await tx.groupActivity.create({
          data: {
            groupId: group.id,
            actorName: "Platform",
            kind: "join",
            message: `${ctx.business.name} was placed into ${group.name}`,
          },
        });
      });
      await syncGroupActivationStatus(this.prisma, group.id, rules);
    } catch (error) {
      // A concurrent first dashboard load may have inserted the membership
      // already; the unique (groupId, memberId) constraint makes that harmless.
      if ((error as { code?: string }).code !== "P2002") throw error;
    }
  }

  /**
   * Places a business in the automatic network group for its location.
   *
   * Automatic groups are system-owned and location-based: a business is
   * assigned once (never twice), fills the oldest group for its level until
   * the configured threshold is reached, and then a new group is started.
   * A transaction-scoped advisory lock serialises concurrent first requests
   * (the dashboard and network endpoints load in parallel).
   */
  private async ensureAutomaticNetworkMembership(
    ctx: BusinessContext,
  ): Promise<void> {
    const config = ctx.config.automaticGrouping;
    if (!config.enabled) return;

    const level = automaticNetworkLevel(ctx.business, config.scope);
    if (!level) return;

    const existing = await this.prisma.groupMember.findFirst({
      where: {
        memberId: ctx.business.id,
        group: { source: "automatic", type: "Network" },
      },
      select: { id: true },
    });
    if (existing) return;

    const threshold = Math.max(1, Number(config.threshold) || 1);
    const baseName = automaticNetworkName(ctx.business, level);
    const lockKey = `automatic-network:${baseName}`.toLowerCase();
    const where = automaticNetworkWhere(ctx.business, level);

    await this.prisma.$transaction(async (tx) => {
      // `IS NULL` gives Prisma a serializable boolean while still taking the
      // transaction-scoped lock (the function itself returns void).
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${lockKey})::bigint) IS NULL AS locked`;

      // Another request may have assigned the business while we waited.
      const alreadyAssigned = await tx.groupMember.findFirst({
        where: {
          memberId: ctx.business.id,
          group: { source: "automatic", type: "Network" },
        },
        select: { id: true },
      });
      if (alreadyAssigned) return;

      const candidates = await tx.group.findMany({
        where: {
          source: "automatic",
          type: "Network",
          ...where,
        },
        include: { members: { select: { id: true } } },
        orderBy: { createdAt: "asc" },
      });
      const open = candidates.find(
        (group) => group.members.length < threshold,
      );

      if (open) {
        await tx.groupMember.create({
          data: automaticNetworkMemberData(ctx.business, open.id),
        });
        await tx.group.update({
          where: { id: open.id },
          data: { memberCount: { increment: 1 } },
        });
        await tx.groupActivity.create({
          data: {
            groupId: open.id,
            actorName: "System",
            kind: "join",
            message: `${ctx.business.name} was assigned to ${open.name} by automatic grouping`,
          },
        });
        return;
      }

      const name =
        candidates.length === 0
          ? baseName
          : `${baseName} ${candidates.length + 1}`;
      const slug = await this.context.uniqueSlug(name);
      const label = automaticNetworkLabel(ctx.business, level);

      const created = await tx.group.create({
        data: {
          name,
          slug,
          description: `Automatic network group for businesses trading in ${label}.`,
          type: "Network",
          source: "automatic",
          headStart: false,
          purpose: `System-created network of businesses trading in ${label}. Membership is assigned automatically and cannot be edited.`,
          ownerId: "system",
          ownerName: "System",
          memberCount: 1,
          city: ctx.business.city,
          localArea: ctx.business.localArea,
          highStreet: ctx.business.highStreet,
          localMallName: ctx.business.localMallName,
          cityId: ctx.business.cityId,
          boroughId: ctx.business.boroughId,
          highStreetId: ctx.business.highStreetId,
          localMallId: ctx.business.localMallId,
          requiredSize: threshold,
          status: "Active",
          accessType: "open",
          directoryVisibility: "members",
          interactionLevel: "message",
          pricing: "free",
          visibility: "PRIVATE",
        },
      });

      await tx.groupMember.create({
        data: automaticNetworkMemberData(ctx.business, created.id, "member"),
      });
      await tx.groupActivity.create({
        data: {
          groupId: created.id,
          actorName: "System",
          kind: "created",
          message: `${created.name} created and ${ctx.business.name} assigned automatically`,
        },
      });
    });
  }

  private async findGroup(groupId: string): Promise<GroupWithMembers> {
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
      include: { members: true },
    });
    if (!group) throw new NotFoundException(`Group ${groupId} not found`);
    return group;
  }

  private assertCanView(group: GroupWithMembers, businessId: string) {
    const isMember =
      group.ownerId === businessId ||
      (group.members?.some((member) => member.memberId === businessId) ??
        false);
    if (!isMember && group.directoryVisibility === "members") {
      throw new ForbiddenException(
        "This group is only visible to its members",
      );
    }
  }

  private assertOwner(group: Group, businessId: string) {
    if (group.ownerId !== businessId) {
      throw new ForbiddenException("Only the group owner can do this");
    }
  }

  /**
   * Blocks operational changes while a user-created group is still below the
   * recruitment target configured for the owner's plan. Recruiting itself
   * (joining and inviting) stays open.
   */
  private assertGroupOperational(group: GroupWithMembers, ctx: BusinessContext) {
    if (
      group.source !== "user-created" ||
      group.status !== "Recruiting" ||
      !ctx.config.groupCreationRules.activationEnabled
    ) {
      return;
    }

    const activation = activationFor(
      group,
      ctx.plan.planName,
      normalizeVariant(ctx.plan.variant),
      ctx.config.groupCreationRules,
    );
    throw new ConflictException({
      code: "GROUP_NOT_ACTIVE",
      message: `This group is still recruiting (${activation.current} of ${activation.target} members). It can operate once it reaches its recruitment target.`,
      target: activation.target,
      current: activation.current,
      remaining: activation.remaining,
    });
  }

  private defaultAccessType(ctx: BusinessContext): string {
    const policy = String(
      ctx.config.accessRules.joiningPolicy ?? "invitation-first",
    );
    if (policy === "open") return "open";
    if (policy === "approval") return "request";
    return "invitation";
  }

  private assertGroupType(ctx: BusinessContext, type: string) {
    const entry = ctx.config.groupTypes.find((groupType) => groupType.type === type);
    if (!entry) {
      throw new ForbiddenException(`Group type "${type}" is not configured`);
    }
    if (!entry.enabled || !entry.allowCreate) {
      throw new ForbiddenException(
        `Creating "${type}" groups is disabled by the administrator`,
      );
    }
  }

  private assertPaymentRules(
    ctx: BusinessContext,
    pricing: string | undefined,
    contribution: number | undefined,
  ) {
    if (pricing !== "paid") return;
    const rules = ctx.config.paymentRules;
    if (!rules.allowPaid) {
      throw new ForbiddenException("Paid groups are disabled");
    }
    if (contribution === undefined || !Number.isFinite(contribution)) {
      throw new BadRequestException("A contribution amount is required");
    }
    if (contribution < rules.minAmount || contribution > rules.maxAmount) {
      throw new BadRequestException(
        `Contribution must be between ${rules.minAmount} and ${rules.maxAmount}`,
      );
    }
  }

  private async groupQuota(ctx: BusinessContext): Promise<number> {
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
    // Only fall back when the business is not attached to a published plan.
    if (plan) return Math.max(0, plan.groupQuota);
    return accessQuotas(ctx.config, ctx.plan).groups;
  }
}

type AutomaticNetworkLevel = "city" | "borough" | "highStreet" | "localMall";

/**
 * The location level an automatic group is built from. The configured scope
 * can narrow it (city / high street / local mall); otherwise businesses are
 * grouped by city + borough ("local area"), which is what the dashboard copy
 * promises. Missing finer levels fall back to the borough.
 */
function automaticNetworkLevel(
  business: Business,
  scope: string,
): AutomaticNetworkLevel | null {
  const normalized = scope.trim().toLowerCase();
  if (normalized.includes("mall") && business.localMallName) {
    return "localMall";
  }
  if (normalized.includes("street") && business.highStreet) {
    return "highStreet";
  }
  if (normalized.includes("city") && business.city) {
    return "city";
  }
  if (business.localArea) return "borough";
  if (business.city) return "city";
  return null;
}

function automaticNetworkName(
  business: Business,
  level: AutomaticNetworkLevel,
): string {
  switch (level) {
    case "localMall":
      return `${business.localMallName} Network`;
    case "highStreet":
      return `${business.highStreet} Network`;
    case "city":
      return `${business.city} Network`;
    default:
      return `${business.city} — ${business.localArea} Network`;
  }
}

function automaticNetworkLabel(
  business: Business,
  level: AutomaticNetworkLevel,
): string {
  switch (level) {
    case "localMall":
      return `${business.localMallName}, ${business.localArea ?? business.city}`;
    case "highStreet":
      return `${business.highStreet}, ${business.localArea ?? business.city}`;
    case "city":
      return business.city;
    default:
      return `${business.localArea}, ${business.city}`;
  }
}

/** Restricts candidate groups to the same location at the chosen level. */
function automaticNetworkWhere(
  business: Business,
  level: AutomaticNetworkLevel,
): Prisma.GroupWhereInput {
  const where: Prisma.GroupWhereInput = {};
  if (business.city) {
    where.city = { equals: business.city, mode: "insensitive" };
  }
  if (level !== "city" && business.localArea) {
    where.localArea = { equals: business.localArea, mode: "insensitive" };
  }
  if (
    (level === "highStreet" || level === "localMall") &&
    business.highStreet
  ) {
    where.highStreet = { equals: business.highStreet, mode: "insensitive" };
  }
  if (level === "localMall" && business.localMallName) {
    where.localMallName = {
      equals: business.localMallName,
      mode: "insensitive",
    };
  }
  return where;
}

function automaticNetworkMemberData(
  business: Business,
  groupId: string,
  role = "member",
) {
  return {
    groupId,
    memberId: business.id,
    fullName: business.contactName,
    businessName: business.name,
    category: business.category,
    location: business.city,
    geography: [business.localArea, business.highStreet, business.localMallName]
      .filter((entry): entry is string => Boolean(entry))
      .join(" · "),
    status: "active",
    role,
    tier: business.tier,
    contributionStatus: "n/a",
  };
}
