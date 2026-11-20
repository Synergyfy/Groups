import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { randomUUID } from "node:crypto";
import type { Group, GroupMember, User } from "../generated/prisma/client.js";
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

@Injectable()
export class ConsumerService {
  constructor(private readonly prisma: PrismaService) {}

  async profile(user: SessionUser) {
    const account = await this.prisma.user.findUnique({
      where: { id: user.id },
    });
    if (!account) throw new NotFoundException("Consumer account not found");

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
      country: account.country,
      profile: account.customerProfile,
    };
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
    return this.prisma.invitation.findMany({
      where: {
        kind: "invite",
        OR: [{ inviteeId: user.id }, { inviteeEmail: user.email }],
        ...(status ? { status } : {}),
      },
      orderBy: { createdAt: "desc" },
    });
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
    memberCount: number;
    status: string;
    accessType: string;
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
      memberCount: group.memberCount,
      status: group.status,
      accessType: group.accessType,
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
