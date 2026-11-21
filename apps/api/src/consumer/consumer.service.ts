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
  Prisma,
  User,
} from "../generated/prisma/client.js";
import type { SessionUser } from "../auth/auth.types.js";
import {
  matchesRequiredPlans,
  toBusinessConfig,
} from "../business/business.rules.js";
import { syncGroupActivationStatus } from "../business/group-activation.js";
import type { BusinessConfig } from "../business/business.types.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { contributionPeriodKey } from "../payments/payments.utils.js";
import { fromMinorPence } from "../common/money.js";
import { jsonObject } from "../admin/admin.mappers.js";
import type { UpdateConsumerPreferencesDto } from "./dto/consumer.dto.js";

@Injectable()
export class ConsumerService {
  constructor(private readonly prisma: PrismaService) {}

  async profile(user: SessionUser) {
    const account = await this.prisma.user.findUnique({
      where: { id: user.id },
    });
    if (!account) throw new NotFoundException("Consumer account not found");

    return this.profileFromAccount(account, user);
  }

  async updatePreferences(
    user: SessionUser,
    dto: UpdateConsumerPreferencesDto,
  ) {
    const account = await this.prisma.user.findUnique({
      where: { id: user.id },
    });
    if (!account) throw new NotFoundException("Consumer account not found");

    const existingProfile = jsonObject(account.customerProfile);
    const existingPreferences = jsonObject(existingProfile.preferences);
    const nextProfile = {
      ...existingProfile,
      preferences: {
        ...existingPreferences,
        ...(dto.emailUpdates !== undefined
          ? { emailUpdates: dto.emailUpdates }
          : {}),
        ...(dto.localDiscovery !== undefined
          ? { localDiscovery: dto.localDiscovery }
          : {}),
        ...(dto.profileVisible !== undefined
          ? { profileVisible: dto.profileVisible }
          : {}),
      },
    };

    const updated = await this.prisma.user.update({
      where: { id: user.id },
      data: { customerProfile: nextProfile as Prisma.InputJsonValue },
    });

    return this.profileFromAccount(updated, user);
  }

  async dashboard(user: SessionUser) {
    const [groups, invitations] = await Promise.all([
      this.groups(user),
      this.invitations(user, "pending"),
    ]);

    return {
      profile: await this.profile(user),
      groups,
      invitations,
      stats: {
        joinedGroups: groups.length,
        pendingInvitations: invitations.length,
      },
    };
  }

  async discover(city?: string, search?: string) {
    const normalizedSearch = search?.trim().toLowerCase();
    const groups = await this.prisma.group.findMany({
      where: {
        visibility: "PUBLIC",
        status: { in: ["Active", "Recruiting"] },
        ...(city ? { city } : {}),
        ...(normalizedSearch
          ? {
              OR: [
                { name: { contains: normalizedSearch, mode: "insensitive" } },
                {
                  description: {
                    contains: normalizedSearch,
                    mode: "insensitive",
                  },
                },
                {
                  purpose: {
                    contains: normalizedSearch,
                    mode: "insensitive",
                  },
                },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: "desc" },
    });

    const config = await this.loadConfig();
    const ownerIds = [
      ...new Set(
        groups.map((group) => group.ownerId).filter((id): id is string => Boolean(id)),
      ),
    ];
    const owners = ownerIds.length
      ? await this.prisma.business.findMany({
          where: { id: { in: ownerIds } },
          select: { id: true, status: true, verified: true },
        })
      : [];
    const ownerById = new Map(owners.map((owner) => [owner.id, owner]));

    return groups
      .filter((group) => {
        const typeConfig = config.groupTypes.find(
          (entry) => entry.type === group.type,
        );
        if (typeConfig && (!typeConfig.enabled || !typeConfig.allowJoin)) {
          return false;
        }
        if (!group.ownerId) return true;
        const owner = ownerById.get(group.ownerId);
        // Only active, verified businesses publish discoverable groups.
        return owner
          ? owner.status === "Active" && owner.verified
          : true;
      })
      .map((group) => this.mapGroup(group));
  }

  async groups(user: SessionUser) {
    const memberships = await this.prisma.groupMember.findMany({
      where: { memberId: user.id },
      include: { group: true },
      orderBy: { joinedAt: "desc" },
    });

    return memberships.map(({ group, ...membership }) => ({
      ...this.mapGroup(group),
      membership,
    }));
  }

  async group(user: SessionUser, id: string) {
    const group = await this.prisma.group.findUnique({
      where: { id },
      include: { members: { orderBy: { joinedAt: "asc" } } },
    });
    if (!group) throw new NotFoundException("Group not found");

    const joined = group.members.some((member) => member.memberId === user.id);
    if (!joined) {
      if (group.visibility !== "PUBLIC") {
        throw new ForbiddenException("This group is only visible to its members.");
      }
      if (!["Active", "Recruiting"].includes(group.status)) {
        throw new NotFoundException("Group not found");
      }
      const owner = group.ownerId
        ? await this.prisma.business.findUnique({
            where: { id: group.ownerId },
            select: { status: true, verified: true },
          })
        : null;
      if (owner && (owner.status !== "Active" || !owner.verified)) {
        throw new NotFoundException("Group not found");
      }
    }

    return {
      ...this.mapGroup(group),
      members: group.members,
      joined,
    };
  }

  async groupActivity(user: SessionUser, id: string) {
    const group = await this.prisma.group.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!group) throw new NotFoundException("Group not found");

    const membership = await this.prisma.groupMember.findUnique({
      where: { groupId_memberId: { groupId: id, memberId: user.id } },
      select: { id: true },
    });
    if (!membership) {
      throw new ForbiddenException("Join the group to view its activity.");
    }

    return this.prisma.groupActivity.findMany({
      where: { groupId: id },
      orderBy: { at: "desc" },
      take: 50,
    });
  }

  async circles(user: SessionUser) {
    const circles = await this.prisma.circle.findMany({
      where: { memberIds: { has: user.id } },
      include: { business: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
    });

    return circles.map((circle) => this.mapCircle(circle));
  }

  async circle(user: SessionUser, id: string) {
    const circle = await this.prisma.circle.findUnique({
      where: { id },
      include: {
        business: { select: { id: true, name: true } },
        activities: { orderBy: { at: "desc" }, take: 50 },
      },
    });
    if (!circle) throw new NotFoundException("Circle not found");
    if (!circle.memberIds.includes(user.id)) {
      throw new ForbiddenException("You are not a member of this circle.");
    }

    const members = await this.prisma.user.findMany({
      where: { id: { in: circle.memberIds } },
      select: {
        id: true,
        fullName: true,
        displayName: true,
        email: true,
        avatarUrl: true,
      },
    });

    return {
      ...this.mapCircle(circle),
      members: members.map((member) => ({
        id: member.id,
        name: member.fullName ?? member.displayName ?? member.email,
        avatarUrl: member.avatarUrl,
      })),
      activities: circle.activities,
    };
  }

  async join(user: SessionUser, id: string) {
    const group = await this.prisma.group.findUnique({
      where: { id },
      include: { members: true },
    });
    if (!group) throw new NotFoundException("Group not found");
    if (group.visibility !== "PUBLIC") {
      throw new ForbiddenException("This group requires an invitation");
    }
    if (!["Active", "Recruiting"].includes(group.status)) {
      throw new ConflictException({
        code: "GROUP_NOT_JOINABLE",
        message: `The group is ${group.status.toLowerCase()} and is not accepting members.`,
      });
    }

    const config = await this.loadConfig();
    const typeConfig = config.groupTypes.find(
      (entry) => entry.type === group.type,
    );
    if (typeConfig && (!typeConfig.enabled || !typeConfig.allowJoin)) {
      throw new ForbiddenException("Joining is disabled for this group type");
    }
    await this.assertOwnerActive(group.ownerId);

    const account = await this.prisma.user.findUnique({
      where: { id: user.id },
    });
    if (!account) throw new NotFoundException("Consumer account not found");

    await this.assertPlanEligibility(group, account);

    const existing = group.members.find(
      (member) => member.memberId === user.id,
    );
    if (existing) return this.group(user, id);

    if (group.accessType === "invitation") {
      throw new ForbiddenException({
        code: "INVITATION_REQUIRED",
        message: "This group is invitation-only. Accept your invitation to join.",
      });
    }

    const requiresApproval =
      group.accessType === "request" ||
      group.accessType === "eligibility" ||
      config.accessRules.joiningPolicy === "approval";
    if (requiresApproval) {
      const existingRequest = await this.prisma.invitation.findFirst({
        where: {
          groupId: id,
          inviteeId: user.id,
          kind: "request",
          status: "pending",
        },
      });
      if (!existingRequest) {
        await this.prisma.$transaction(async (tx) => {
          await tx.invitation.create({
            data: {
              id: randomUUID(),
              groupId: id,
              direction: "outgoing",
              kind: "request",
              inviteeId: user.id,
              inviteeName: user.name,
              inviteeEmail: user.email.trim().toLowerCase(),
              inviteeRole: "consumer",
              invitedById: user.id,
              invitedByName: user.name,
              status: "pending",
            },
          });
          await tx.groupActivity.create({
            data: {
              groupId: id,
              actorName: user.name,
              kind: "update",
              message: `${user.name} requested to join ${group.name}`,
            },
          });
        });
      }
      const detail = await this.group(user, id);
      return { ...detail, requested: true };
    }

    if (group.pricing === "paid") {
      await this.assertConsumerVerified(user);
      const periodKey = contributionPeriodKey(group.contributionFrequency);
      const paid = await this.prisma.payment.findFirst({
        where: {
          purpose: "GROUP_CONTRIBUTION",
          groupId: id,
          memberId: user.id,
          periodKey,
          status: "PAID",
          deletedAt: null,
        },
      });
      if (!paid) {
        throw new ConflictException({
          code: "PAYMENT_REQUIRED",
          message: `This group requires a £${fromMinorPence(group.contributionMinor)} contribution.`,
          groupId: id,
          amountMinor: (group.contributionMinor ?? 0).toString(),
          amount: fromMinorPence(group.contributionMinor),
          frequency: group.contributionFrequency ?? "once",
          periodKey,
        });
      }
    }

    await this.addMember(user, group, account);
    return this.group(user, id);
  }

  async leave(user: SessionUser, id: string) {
    const membership = await this.prisma.groupMember.findUnique({
      where: { groupId_memberId: { groupId: id, memberId: user.id } },
    });
    if (!membership) throw new NotFoundException("Group membership not found");

    await this.prisma.groupMember.delete({ where: { id: membership.id } });
    await this.prisma.group.update({
      where: { id },
      data: { memberCount: { decrement: 1 } },
    });
    await syncGroupActivationStatus(this.prisma, id);

    return { ok: true };
  }

  async postActivity(user: SessionUser, id: string, message: string) {
    const text = String(message ?? "").trim();
    if (!text || text.length > 2000) {
      throw new BadRequestException(
        "A message between 1 and 2000 characters is required.",
      );
    }
    const group = await this.findGroupForMember(id);
    const isMember = group.members.some(
      (member) => member.memberId === user.id,
    );
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

    return this.prisma.groupActivity.create({
      data: {
        groupId: id,
        actorName: user.name,
        kind: "update",
        message: text,
      },
    });
  }

  async invitations(user: SessionUser, status?: string) {
    const invitations = await this.prisma.invitation.findMany({
      where: {
        kind: "invite",
        OR: [{ inviteeId: user.id }, { inviteeEmail: user.email }],
        ...(status ? { status } : {}),
      },
      orderBy: { createdAt: "desc" },
    });

    return this.withInvitationTargets(invitations);
  }

  async invitation(user: SessionUser, id: string) {
    const invitation = await this.prisma.invitation.findFirst({
      where: {
        id,
        kind: "invite",
        OR: [{ inviteeId: user.id }, { inviteeEmail: user.email }],
      },
    });
    if (!invitation) throw new NotFoundException("Invitation not found");

    const [withTargets] = await this.withInvitationTargets([invitation]);
    const group = invitation.groupId
      ? await this.prisma.group.findUnique({
          where: { id: invitation.groupId },
        })
      : null;

    return {
      ...withTargets,
      group: group ? this.mapGroup(group) : null,
    };
  }

  /**
   * Public invitation preview used by the invite link before the visitor has
   * signed in. Only non-sensitive group/circle metadata is returned.
   */
  async publicInvitation(id: string) {
    const invitation = await this.prisma.invitation.findUnique({
      where: { id },
    });
    if (!invitation) throw new NotFoundException("Invitation not found");

    const group = invitation.groupId
      ? await this.prisma.group.findUnique({
          where: { id: invitation.groupId },
        })
      : null;
    const circle = invitation.circleId
      ? await this.prisma.circle.findUnique({
          where: { id: invitation.circleId },
          include: { business: { select: { id: true, name: true } } },
        })
      : null;

    return {
      id: invitation.id,
      status: invitation.status,
      kind: invitation.kind,
      invitedById: invitation.invitedById,
      invitedByName: invitation.invitedByName,
      inviteeRole: invitation.inviteeRole,
      createdAt: invitation.createdAt.toISOString(),
      respondedAt: invitation.respondedAt?.toISOString() ?? null,
      group: group ? this.mapGroup(group) : null,
      circle: circle
        ? {
            id: circle.id,
            name:
              typeof jsonObject(circle.config).name === "string"
                ? String(jsonObject(circle.config).name)
                : `${circle.type} Circle`,
            type: circle.type,
            businessId: circle.businessId,
            businessName: circle.business.name,
            memberCount: circle.memberIds.length,
            createdAt: circle.createdAt.toISOString(),
          }
        : null,
    };
  }

  async respondInvitation(user: SessionUser, id: string, accept: boolean) {
    const invitation = await this.prisma.invitation.findFirst({
      where: {
        id,
        kind: "invite",
        OR: [{ inviteeId: user.id }, { inviteeEmail: user.email }],
        status: "pending",
      },
    });
    if (!invitation) throw new NotFoundException("Invitation not found");

    let group: Awaited<ReturnType<ConsumerService["findGroupForMember"]>> | null =
      null;

    if (accept && invitation.groupId) {
      group = await this.findGroupForMember(invitation.groupId);
      if (!["Active", "Recruiting"].includes(group.status)) {
        throw new ConflictException({
          code: "GROUP_NOT_JOINABLE",
          message: `The group is ${group.status.toLowerCase()} and is not accepting members.`,
        });
      }

      const config = await this.loadConfig();
      const typeConfig = config.groupTypes.find(
        (entry) => entry.type === group!.type,
      );
      if (typeConfig && (!typeConfig.enabled || !typeConfig.allowJoin)) {
        throw new ForbiddenException("Joining is disabled for this group type");
      }
      await this.assertOwnerActive(group.ownerId);

      const account = await this.prisma.user.findUnique({
        where: { id: user.id },
      });
      if (!account) throw new NotFoundException("Consumer account not found");

      await this.assertPlanEligibility(group, account);

      if (group.pricing === "paid") {
        await this.assertConsumerVerified(user);
        const existing = group.members.find(
          (member) => member.memberId === user.id,
        );
        if (existing?.contributionStatus !== "paid") {
          const periodKey = contributionPeriodKey(
            group.contributionFrequency,
          );
          const paid = await this.prisma.payment.findFirst({
            where: {
              purpose: "GROUP_CONTRIBUTION",
              groupId: group.id,
              memberId: user.id,
              periodKey,
              status: "PAID",
              deletedAt: null,
            },
          });
          if (!paid) {
            throw new ConflictException({
              code: "PAYMENT_REQUIRED",
              message: `This group requires a £${fromMinorPence(group.contributionMinor)} contribution.`,
              groupId: group.id,
              amountMinor: (group.contributionMinor ?? 0).toString(),
              amount: fromMinorPence(group.contributionMinor),
              frequency: group.contributionFrequency ?? "once",
              periodKey,
            });
          }
        }
      }

      await this.addMember(user, group, account);
    }

    if (accept && invitation.circleId) {
      const circle = await this.prisma.circle.findUnique({
        where: { id: invitation.circleId },
      });
      if (!circle) throw new NotFoundException("Circle not found");
      if (circle.status !== "Active") {
        throw new ConflictException({
          code: "CIRCLE_NOT_JOINABLE",
          message: `The circle is ${circle.status.toLowerCase()} and is not accepting members.`,
        });
      }
      if (!circle.memberIds.includes(user.id)) {
        await this.prisma.$transaction([
          this.prisma.circle.update({
            where: { id: circle.id },
            data: { memberIds: { push: user.id } },
          }),
          this.prisma.circleActivity.create({
            data: {
              circleId: circle.id,
              memberId: user.id,
              kind: "join",
              message: `${user.name} accepted the invitation and joined the circle`,
            },
          }),
        ]);
      }
    }

    const updated = await this.prisma.invitation.update({
      where: { id },
      data: {
        status: accept ? "accepted" : "declined",
        inviteeId: user.id,
        respondedAt: new Date(),
      },
    });

    if (accept && group) {
      await this.prisma.groupActivity.create({
        data: {
          groupId: group.id,
          actorName: user.name,
          kind: "join",
          message: `${user.name} accepted the invitation and joined ${group.name}`,
        },
      });
    }

    return updated;
  }

  private async withInvitationTargets<
    T extends { groupId: string | null; circleId: string | null },
  >(invitations: T[]) {
    const groupIds = [
      ...new Set(
        invitations
          .map((invitation) => invitation.groupId)
          .filter((id): id is string => Boolean(id)),
      ),
    ];
    const circleIds = [
      ...new Set(
        invitations
          .map((invitation) => invitation.circleId)
          .filter((id): id is string => Boolean(id)),
      ),
    ];
    const [groups, circles] = await Promise.all([
      groupIds.length
        ? this.prisma.group.findMany({
            where: { id: { in: groupIds } },
            select: { id: true, name: true },
          })
        : [],
      circleIds.length
        ? this.prisma.circle.findMany({
            where: { id: { in: circleIds } },
            select: {
              id: true,
              type: true,
              config: true,
              business: { select: { name: true } },
            },
          })
        : [],
    ]);
    const groupById = new Map(groups.map((group) => [group.id, group]));
    const circleById = new Map(circles.map((circle) => [circle.id, circle]));

    return invitations.map((invitation) => {
      const group = invitation.groupId
        ? groupById.get(invitation.groupId)
        : undefined;
      const circle = invitation.circleId
        ? circleById.get(invitation.circleId)
        : undefined;
      const circleConfig = jsonObject(circle?.config);
      return {
        ...invitation,
        groupName: group?.name ?? null,
        circleName:
          typeof circleConfig.name === "string" && circleConfig.name.length > 0
            ? circleConfig.name
            : circle
              ? `${circle.type} Circle`
              : null,
        circleBusinessName: circle?.business.name ?? null,
      };
    });
  }

  private async loadConfig(): Promise<BusinessConfig> {
    const row = await this.prisma.adminConfig.findFirst();
    return toBusinessConfig(row);
  }

  private async findGroupForMember(
    id: string,
  ): Promise<Group & { members: GroupMember[] }> {
    const group = await this.prisma.group.findUnique({
      where: { id },
      include: { members: true },
    });
    if (!group) throw new NotFoundException("Group not found");
    return group;
  }

  private async assertOwnerActive(ownerId: string | null): Promise<void> {
    if (!ownerId) return;
    const owner = await this.prisma.business.findUnique({
      where: { id: ownerId },
      select: { status: true, verified: true },
    });
    if (owner && (owner.status !== "Active" || !owner.verified)) {
      throw new ForbiddenException("This group is not currently available.");
    }
  }

  private async assertConsumerVerified(user: SessionUser): Promise<void> {
    const account = await this.prisma.platformAccount.findUnique({
      where: { email: user.email.trim().toLowerCase() },
      select: { verified: true, status: true },
    });
    if (
      account &&
      (!account.verified || account.status === "Suspended")
    ) {
      throw new ForbiddenException({
        code: "ACCOUNT_UNVERIFIED",
        message: "Verify your account before joining paid groups.",
      });
    }
  }

  private async addMember(
    user: SessionUser,
    group: Group,
    account: User,
  ): Promise<void> {
    const existing = await this.prisma.groupMember.findUnique({
      where: {
        groupId_memberId: { groupId: group.id, memberId: user.id },
      },
      select: { id: true },
    });
    if (existing) {
      await this.prisma.groupMember.update({
        where: { id: existing.id },
        data: { lastActiveAt: new Date() },
      });
      return;
    }

    await this.prisma.groupMember.create({
      data: {
        groupId: group.id,
        memberId: user.id,
        fullName: account.fullName ?? account.displayName ?? user.name,
        category: "Consumer",
        location: account.address ?? undefined,
        status: "active",
        role: "member",
        tier: account.membershipTier ?? "Free",
      },
    });
    await this.prisma.group.update({
      where: { id: group.id },
      data: { memberCount: { increment: 1 } },
    });
    await syncGroupActivationStatus(this.prisma, group.id);
  }

  private profileFromAccount(account: User, user: SessionUser) {
    const customer = jsonObject(account.customerProfile);
    const preferences = jsonObject(customer.preferences);
    return {
      id: account.id,
      email: account.email,
      name: account.fullName ?? account.displayName ?? user.name,
      firstName: account.firstName,
      lastName: account.lastName,
      avatarUrl: account.avatarUrl,
      phone: account.phone,
      address: account.address,
      postcode: account.postcode,
      city:
        typeof customer.city === "string" && customer.city.length > 0
          ? customer.city
          : null,
      country: account.country,
      preferences: {
        emailUpdates: preferences.emailUpdates !== false,
        localDiscovery: preferences.localDiscovery !== false,
        profileVisible: preferences.profileVisible !== false,
      },
      profile: account.customerProfile,
    };
  }

  private mapCircle(circle: {
    id: string;
    type: string;
    config: Prisma.JsonValue;
    memberIds: string[];
    createdAt: Date;
    business?: { id: string; name: string } | null;
  }) {
    const config = jsonObject(circle.config);
    return {
      id: circle.id,
      type: circle.type,
      name:
        typeof config.name === "string" && config.name.length > 0
          ? config.name
          : `${circle.type} Circle`,
      config: circle.config,
      memberIds: circle.memberIds,
      memberCount: circle.memberIds.length,
      businessId: circle.business?.id ?? null,
      businessName: circle.business?.name ?? null,
      createdAt: circle.createdAt.toISOString(),
    };
  }

  private mapGroup(group: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    visibility: string;
    location: string | null;
    type: string;
    purpose: string;
    city: string | null;
    localArea: string | null;
    ownerId: string | null;
    ownerName: string;
    requiredSize: number | null;
    memberCount: number;
    status: string;
    accessType: string;
    directoryVisibility: string | null;
    interactionLevel: string | null;
    requiredPlanIds: string[];
    pricing: string;
    contributionMinor: number | null;
    contributionFrequency: string | null;
    createdAt: Date;
  }) {
    return {
      id: group.id,
      name: group.name,
      slug: group.slug,
      description: group.description,
      visibility: group.visibility,
      location: group.location,
      type: group.type,
      purpose: group.purpose,
      city: group.city,
      localArea: group.localArea,
      ownerId: group.ownerId,
      ownerName: group.ownerName,
      requiredSize: group.requiredSize,
      memberCount: group.memberCount,
      status: group.status,
      accessType: group.accessType,
      directoryVisibility: group.directoryVisibility,
      interactionLevel: group.interactionLevel,
      pricing: group.pricing,
      contribution:
        group.contributionMinor != null
          ? fromMinorPence(group.contributionMinor)
          : null,
      contributionMinor: group.contributionMinor,
      contributionFrequency: group.contributionFrequency,
      requiredPlanIds: group.requiredPlanIds,
      createdAt: group.createdAt.toISOString(),
    };
  }

  private async assertPlanEligibility(
    group: { requiredPlanIds: string[] },
    account: {
      membershipTier: string | null;
      membershipLevel: string | null;
      membershipPlanName: string | null;
    },
  ): Promise<void> {
    if (group.requiredPlanIds.length === 0) return;

    const plans = await this.prisma.plan.findMany({
      where: { id: { in: group.requiredPlanIds } },
      select: { id: true, name: true, variant: true },
    });
    const planName = account.membershipTier ?? account.membershipLevel;
    const eligible = matchesRequiredPlans(group.requiredPlanIds, plans, {
      planName,
      variant: account.membershipPlanName,
      active: Boolean(planName && planName.trim().toLowerCase() !== "free"),
    });
    if (!eligible) {
      throw new ForbiddenException({
        code: "PLAN_REQUIRED",
        message:
          "This group is only open to members on selected membership plans.",
      });
    }
  }
}
