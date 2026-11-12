import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { randomUUID } from "node:crypto";
import type {
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
  mapProgramme,
  mapRelationship,
} from "../../admin/admin.mappers.js";
import { PrismaService } from "../../prisma/prisma.service.js";
import { BusinessContextService } from "../business-context.service.js";
import {
  accessQuotas,
  activationFor,
  automaticProgressFor,
  canCreateGroups,
  creationRightsLabel,
  groupStatsFor,
  joinPlanFor,
  membershipTierForOwner,
} from "../business.rules.js";
import { isUuid } from "../business.utils.js";
import type {
  BusinessContext,
  GroupActivationView,
  JoinPlanView,
  PlanVariant,
  Tier,
} from "../business.types.js";
import type {
  BusinessGroupQueryDto,
  CreateBusinessGroupDto,
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
  location?: { city?: string; localArea?: string };
  requiredSize?: number;
  stage?: string;
  status: string;
  accessType: string;
  visibility: string;
  interactionLevel?: string;
  pricing: string;
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
      invitations: invitations.map(mapInvitation),
      recentActivity: activity.map((entry) => ({
        ...mapGroupActivity(entry),
        groupName: entry.group.name,
      })),
    };
  }

  async getMineSections(ctx: BusinessContext) {
    const membershipId = ctx.business.id;
    const myGroups = await this.prisma.group.findMany({
      where: {
        OR: [
          { ownerId: membershipId },
          { members: { some: { memberId: membershipId } } },
        ],
      },
      include: { members: true },
      orderBy: { createdAt: "desc" },
    });

    const ownedIds = myGroups
      .filter((group) => group.ownerId === membershipId)
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
          direction: "incoming",
          kind: "invite",
          status: "pending",
          inviteeId: membershipId,
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
        where: { ownerId: membershipId, headStart: true },
        include: { members: true },
        orderBy: { createdAt: "asc" },
      }),
      this.prisma.group.findFirst({
        where: {
          source: "automatic",
          type: "Network",
          members: { some: { memberId: membershipId } },
        },
        include: { members: true },
      }),
    ]);

    const ownerTiers = await this.ownerTierMap(myGroups, ctx);
    const groups = myGroups.map((group) =>
      this.decorateGroup(group, ctx, ownerTiers.get(group.ownerId ?? "")),
    );
    const headStart = headStartGroups.map((group) =>
      this.decorateGroup(group, ctx, ownerTiers.get(group.ownerId ?? "")),
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
      membershipId,
    );
    const progressBase = automaticProgressFor(
      automaticGroup,
      ctx.config.automaticGrouping,
    );

    return {
      business: mapBusiness(ctx.business),
      membership: {
        tier: ctx.membership.tier,
        variant: ctx.membership.variant,
        planName: ctx.membership.planName,
        status: ctx.membership.status,
        paid: ctx.membership.paid,
        agreementAccepted: ctx.membership.agreementAccepted,
        accessDays: ctx.membership.accessDays,
        accessFee: ctx.membership.accessFee,
      },
      canCreateGroups: canCreateGroups(
        ctx.membership,
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
              ownerTiers.get(automaticGroup.ownerId ?? ""),
            )
          : null,
      },
      mandatoryGroups: this.mandatoryGroupStatuses(ctx, myGroups),
      headStartGroups: headStart,
      platformGroup: platformGroup
        ? this.decorateGroup(
            platformGroup,
            ctx,
            ownerTiers.get(platformGroup.ownerId ?? ""),
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
      membership: sections.membership,
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
        status: { not: "Closed" },
        NOT: { members: { some: { memberId: ctx.business.id } } },
        OR: [
          { directoryVisibility: null },
          { directoryVisibility: "directory" },
        ],
      },
      include: { members: true },
      orderBy: { createdAt: "desc" },
    });

    const filtered = groups.filter((group) => {
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
    const ownerTiers = await this.ownerTierMap(paged, ctx);

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
          ownerTiers.get(group.ownerId ?? ""),
        );
        return {
          ...decorated,
          joinPlan: joinPlanFor(
            group,
            typeByType.get(group.type),
            request,
            invite,
            ctx.business.id,
          ),
        };
      }),
      total: filtered.length,
      page,
      pageSize: limit,
    };
  }

  async getNetwork(ctx: BusinessContext) {
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

    const ownerTiers = await this.ownerTierMap(
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
            ownerTiers.get(automaticGroup.ownerId ?? ""),
          )
        : null,
      progress: {
        ...progressBase,
        group: automaticGroup
          ? this.decorateGroup(
              automaticGroup,
              ctx,
              ownerTiers.get(automaticGroup.ownerId ?? ""),
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
        this.decorateGroup(group, ctx, ownerTiers.get(group.ownerId ?? "")),
      ),
    };
  }

  async getGroup(ctx: BusinessContext, groupId: string) {
    const group = await this.findGroup(groupId);
    this.assertCanView(group, ctx.business.id);

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
            inviteeId: ctx.business.id,
            status: "pending",
          },
        }),
      ]);

    const pendingRequest =
      pending.find((entry) => entry.kind === "request") ?? null;
    const pendingInvite =
      pending.find((entry) => entry.kind === "invite") ?? null;
    const typeConfig = ctx.config.groupTypes.find(
      (entry) => entry.type === group.type,
    );
    const ownerTier =
      owner?.id === ctx.business.id
        ? undefined
        : { tier: owner?.tier ?? "Bronze", variant: "Standard" };
    const decorated = this.decorateGroup(group, ctx, ownerTier);
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

    const members = group.members ?? [];
    return {
      group: this.decorateGroup(group, ctx),
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

  async getGroupInvitations(ctx: BusinessContext, groupId: string) {
    const group = await this.findGroup(groupId);
    this.assertOwner(group, ctx.business.id);
    const invitations = await this.prisma.invitation.findMany({
      where: { groupId },
      orderBy: { createdAt: "desc" },
    });
    return invitations.map(mapInvitation);
  }

  async create(ctx: BusinessContext, dto: CreateBusinessGroupDto) {
    if (!canCreateGroups(ctx.membership, ctx.config.groupCreationRules)) {
      throw new ForbiddenException({
        code: "GROUP_CREATION_NOT_ALLOWED",
        message:
          "Your membership does not allow creating groups. Complete the paid access agreement or contact an administrator.",
      });
    }

    this.assertGroupType(ctx, dto.type);
    this.assertPaymentRules(ctx, dto.pricing, dto.contribution);

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

    const mandatoryRule = ctx.config.mandatoryGroups.find(
      (rule) => rule.type === dto.type,
    );
    const pricing = dto.pricing ?? "free";
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

    const quota = await this.groupQuota(ctx);
    if (owned.length >= quota) {
      throw new ForbiddenException({
        code: "GROUP_QUOTA_REACHED",
        message: `Your membership allows ${quota} groups.`,
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
          city: dto.city,
          localArea: dto.localArea,
          requiredSize: dto.requiredSize,
          stage: dto.stage,
          status: "Recruiting",
          accessType: dto.accessType,
          directoryVisibility: dto.visibility ?? "directory",
          interactionLevel: dto.interactionLevel ?? "message",
          pricing,
          contribution: pricing === "paid" ? dto.contribution : null,
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
          tier: ctx.membership.tier,
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

    if (dto.pricing === "paid") {
      this.assertPaymentRules(
        ctx,
        "paid",
        dto.contribution ?? group.contribution ?? undefined,
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
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.accessType !== undefined) data.accessType = dto.accessType;
    if (dto.visibility !== undefined) {
      data.directoryVisibility = dto.visibility;
      data.visibility = dto.visibility === "directory" ? "PUBLIC" : "PRIVATE";
    }
    if (dto.interactionLevel !== undefined) {
      data.interactionLevel = dto.interactionLevel;
    }
    if (dto.pricing !== undefined) data.pricing = dto.pricing;
    if (dto.contribution !== undefined) data.contribution = dto.contribution;
    if (dto.contributionFrequency !== undefined) {
      data.contributionFrequency = dto.contributionFrequency;
    }
    if (dto.city !== undefined) data.city = dto.city;
    if (dto.localArea !== undefined) data.localArea = dto.localArea;
    if (dto.requiredSize !== undefined) data.requiredSize = dto.requiredSize;
    if (dto.stage !== undefined) data.stage = dto.stage;
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
    if (group.status === "Closed" || group.status === "Suspended") {
      throw new ConflictException({
        code: "GROUP_NOT_JOINABLE",
        message: `The group is ${group.status.toLowerCase()} and is not accepting members.`,
      });
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

    if (group.accessType === "open") {
      const updated = await this.prisma.$transaction(async (tx) => {
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
            tier: ctx.membership.tier,
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
      return {
        status: "joined" as const,
        group: this.decorateGroup(updated, ctx),
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
        invitation: mapInvitation(existing),
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
      invitation: mapInvitation(invitation),
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

    return { ok: true };
  }

  async removeMember(
    ctx: BusinessContext,
    groupId: string,
    memberId: string,
  ) {
    const group = await this.findGroup(groupId);
    this.assertOwner(group, ctx.business.id);
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

    return { ok: true };
  }

  async invite(
    ctx: BusinessContext,
    groupId: string,
    dto: InviteMembersDto,
  ) {
    const group = await this.findGroup(groupId);
    this.assertOwner(group, ctx.business.id);

    const created: Invitation[] = [];
    let skipped = 0;

    await this.prisma.$transaction(async (tx) => {
      for (const entry of dto.entries) {
        if (!entry.inviteeId && !entry.inviteeEmail && !entry.inviteePhone) {
          throw new BadRequestException(
            `Invitation for ${entry.inviteeName} needs an invitee, email or phone number`,
          );
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
            message: `${ctx.business.name} invited ${entry.inviteeName}`,
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
    ownerTier?: { tier: string; variant: string },
  ): DecoratedGroup {
    const base = mapGroup(group);
    const isOwner = base.ownerId === ctx.business.id;
    const isMember =
      group.members?.some(
        (member) => member.memberId === ctx.business.id,
      ) ?? false;
    const membership = ownerTier
      ? {
          tier: ownerTier.tier as Tier,
          variant: ownerTier.variant as PlanVariant,
        }
      : membershipTierForOwner(
          ctx.business.tier,
          true,
          ctx.membership,
        );

    return {
      ...base,
      isOwner,
      isMember,
      role: isOwner ? "owner" : isMember ? "member" : "none",
      activation: activationFor(
        group,
        membership.tier,
        membership.variant,
        ctx.config.groupCreationRules,
      ),
    };
  }

  private async ownerTierMap(
    groups: Pick<Group, "ownerId">[],
    ctx: BusinessContext,
  ): Promise<Map<string, { tier: string; variant: string }>> {
    const ids = [
      ...new Set(
        groups
          .map((group) => group.ownerId)
          .filter((id): id is string => Boolean(id) && id !== ctx.business.id),
      ),
    ];
    if (ids.length === 0) return new Map();
    const owners = await this.prisma.business.findMany({
      where: { id: { in: ids } },
      select: { id: true, tier: true },
    });
    return new Map(
      owners.map((owner) => [
        owner.id,
        { tier: owner.tier, variant: "Standard" },
      ]),
    );
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
    if (plan && plan.groupQuota > 0) return plan.groupQuota;
    return accessQuotas(ctx.config, ctx.membership).groups;
  }
}
