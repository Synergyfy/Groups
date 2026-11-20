import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import type { SessionUser } from "../../auth/auth.types.js";
import { Prisma } from "../../generated/prisma/client.js";
import { PrismaService } from "../../prisma/prisma.service.js";
import { AdminAuditService } from "../../admin/admin-audit.service.js";
import { mapInvitation } from "../../admin/admin.mappers.js";
import type { AdminListQueryDto } from "../../admin/dto/admin.dto.js";

@Injectable()
export class AdminOperationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AdminAuditService,
  ) {}

  // -------------------------------------------------------------------------
  // Invitations
  // -------------------------------------------------------------------------

  async listInvitations(query: AdminListQueryDto) {
    const where: Prisma.InvitationWhereInput = {};
    if (query.status && query.status !== "all") where.status = query.status;
    if (query.search?.trim()) {
      const search = query.search.trim();
      where.OR = [
        { inviteeName: { contains: search, mode: "insensitive" } },
        { inviteeEmail: { contains: search, mode: "insensitive" } },
        { invitedByName: { contains: search, mode: "insensitive" } },
      ];
    }

    const invitations = await this.prisma.invitation.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });
    return invitations.map(mapInvitation);
  }

  async getInvitationCounts() {
    const grouped = await this.prisma.invitation.groupBy({
      by: ["status"],
      _count: { _all: true },
    });
    const counts = new Map(
      grouped.map((row) => [row.status, row._count._all]),
    );
    const total = grouped.reduce((sum, row) => sum + row._count._all, 0);
    return {
      total,
      pending: counts.get("pending") ?? 0,
      accepted: counts.get("accepted") ?? 0,
      declined: counts.get("declined") ?? 0,
      cancelled: counts.get("cancelled") ?? 0,
    };
  }

  async respondToInvitation(
    id: string,
    accept: boolean,
    actor?: SessionUser,
  ) {
    const invitation = await this.prisma.invitation.findUnique({
      where: { id },
    });
    if (!invitation) throw new NotFoundException(`Invitation ${id} not found`);
    if (invitation.status !== "pending") {
      throw new ConflictException(
        `Invitation ${id} is already ${invitation.status}`,
      );
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.invitation.update({
        where: { id },
        data: {
          status: accept ? "accepted" : "declined",
          respondedAt: new Date(),
        },
      });

      if (accept && invitation.groupId) {
        const memberId =
          invitation.inviteeId ??
          invitation.claimedByAccountId ??
          invitation.inviteeEmail ??
          invitation.id;
        const existing = await tx.groupMember.findUnique({
          where: {
            groupId_memberId: {
              groupId: invitation.groupId,
              memberId,
            },
          },
        });
        if (!existing) {
          const group = await tx.group.findUnique({
            where: { id: invitation.groupId },
            select: { pricing: true, ownerId: true },
          });
          await tx.groupMember.create({
            data: {
              groupId: invitation.groupId,
              memberId,
              fullName: invitation.inviteeName,
              businessName: invitation.inviteeName,
              status: "active",
              role: "peripheral",
              tier: "Free",
              contributionStatus:
                group?.pricing === "paid" ? "pending" : "n/a",
            },
          });
          await tx.group.update({
            where: { id: invitation.groupId },
            data: { memberCount: { increment: 1 } },
          });
          await tx.groupActivity.create({
            data: {
              groupId: invitation.groupId,
              actorName: actor?.name ?? "Administrator",
              kind: "join",
              message: `${invitation.inviteeName} joined via invitation`,
            },
          });
        }
        // A member only needs one accepted invitation into the same group.
        const siblingWhere: Prisma.InvitationWhereInput = {
          groupId: invitation.groupId,
          status: "pending",
          id: { not: id },
        };
        if (invitation.inviteeId) {
          siblingWhere.inviteeId = invitation.inviteeId;
        } else if (invitation.claimedByAccountId) {
          siblingWhere.claimedByAccountId = invitation.claimedByAccountId;
        } else if (invitation.inviteeEmail) {
          siblingWhere.inviteeEmail = invitation.inviteeEmail;
        } else {
          return result;
        }
        await tx.invitation.updateMany({
          where: siblingWhere,
          data: { status: "cancelled", respondedAt: new Date() },
        });
      }

      return result;
    });

    await this.audit.record(actor, {
      action: accept ? "invitation-approved" : "invitation-declined",
      targetType: "invitation",
      targetId: id,
      targetName: invitation.inviteeName,
      detail: accept ? "Invitation approved" : "Invitation declined",
    });

    return mapInvitation(updated);
  }

  async cancelInvitation(id: string, actor?: SessionUser) {
    const invitation = await this.prisma.invitation.findUnique({
      where: { id },
    });
    if (!invitation) throw new NotFoundException(`Invitation ${id} not found`);
    if (invitation.status !== "pending") {
      throw new ConflictException(
        `Invitation ${id} is already ${invitation.status}`,
      );
    }

    const updated = await this.prisma.invitation.update({
      where: { id },
      data: { status: "cancelled", respondedAt: new Date() },
    });

    await this.audit.record(actor, {
      action: "invitation-cancelled",
      targetType: "invitation",
      targetId: id,
      targetName: invitation.inviteeName,
      detail: "Invitation cancelled",
    });

    return mapInvitation(updated);
  }

  async getSettingsReport() {
    const [
      groups,
      businessCount,
      accountCount,
      invitationGroups,
      planSubscribers,
      config,
      rewardCount,
      campaignCount,
      programmes,
      programmeMemberships,
      partnerFees,
    ] = await Promise.all([
      this.prisma.group.findMany({ select: { createdAt: true } }),
      this.prisma.business.count(),
      this.prisma.platformAccount.count(),
      this.prisma.invitation.groupBy({
        by: ["status"],
        _count: { _all: true },
      }),
      this.prisma.businessPlan.count({
        where: { OR: [{ status: "Active" }, { paid: true }] },
      }),
      this.prisma.adminConfig.findUnique({ where: { id: "default" } }),
      this.prisma.rewardDeal.count(),
      this.prisma.campaign.count(),
      this.prisma.programme.findMany({
        where: { status: "Active" },
        select: { id: true, monthlyFeeMinor: true },
      }),
      this.prisma.business.findMany({
        where: { programmeId: { not: null } },
        select: { programmeId: true },
      }),
      this.prisma.partner.findMany({
        where: { status: "Active" },
        select: { feeMonthlyMinor: true },
      }),
    ]);

    const invitationCounts = new Map(
      invitationGroups.map((row) => [row.status, row._count._all]),
    );
    const accepted = invitationCounts.get("accepted") ?? 0;
    const pending = invitationCounts.get("pending") ?? 0;
    const declined = invitationCounts.get("declined") ?? 0;
    const totalInvitations =
      accepted +
      pending +
      declined +
      (invitationCounts.get("cancelled") ?? 0);

    const accessRules = (config?.accessRules ?? {}) as Record<string, unknown>;
    const groupTypes = Array.isArray(config?.groupTypes)
      ? (config.groupTypes as unknown[])
      : [];
    const mandatoryGroups = Array.isArray(config?.mandatoryGroups)
      ? (config.mandatoryGroups as unknown[])
      : [];
    const partnerDefaults = (config?.partnerDefaults ?? {}) as Record<
      string,
      unknown
    >;
    const verified = (condition: boolean) =>
      condition ? "Verified" : "Needs attention";
    const feeByProgramme = new Map(
      programmes.map((programme) => [
        programme.id,
        programme.monthlyFeeMinor,
      ]),
    );
    const programmeMonthlyFees =
      programmeMemberships.reduce(
        (sum, membership) =>
          sum +
          (membership.programmeId
            ? (feeByProgramme.get(membership.programmeId) ?? 0)
            : 0),
        0,
      ) / 100;
    const partnerMonthlyFees =
      partnerFees.reduce(
        (sum, partner) => sum + partner.feeMonthlyMinor,
        0,
      ) / 100;

    return {
      stats: {
        registeredEntities: businessCount + accountCount,
        totalPlanSubscribers: planSubscribers,
        programmeMonthlyFees,
        partnerMonthlyFees,
        invitationsSent: totalInvitations,
        invitationConversion:
          totalInvitations === 0
            ? 0
            : Math.round((accepted / totalInvitations) * 100),
      },
      growth: (() => {
        const byMonth = new Map<string, number>();
        for (const group of groups) {
          const month = group.createdAt.toISOString().slice(0, 7);
          byMonth.set(month, (byMonth.get(month) ?? 0) + 1);
        }
        return [...byMonth.entries()]
          .map(([label, value]) => ({ label, value }))
          .sort((a, b) => a.label.localeCompare(b.label))
          .slice(-6);
      })(),
      invitationBreakdown: [
        { label: "Accepted", value: accepted, color: "#10b981" },
        { label: "Pending", value: pending, color: "#f59e0b" },
        { label: "Declined", value: declined, color: "#ef4444" },
      ],
      completeness: [
        {
          id: "rule-1",
          title: "Invitation-first onboarding without prior account",
          status: verified(
            accessRules.joiningPolicy === "invitation-first" &&
              totalInvitations > 0,
          ),
        },
        {
          id: "rule-2",
          title: "Business owner and consumer role & permission separation",
          status: verified(
            Object.keys(partnerDefaults).length > 0 &&
              businessCount + accountCount > 0,
          ),
        },
        {
          id: "rule-3",
          title: "Mandatory business groups & full group type management",
          status: verified(groupTypes.length > 0 && mandatoryGroups.length > 0),
        },
        {
          id: "rule-4",
          title: "Plan entitlements and temporary-access rules",
          status: verified(
            Boolean(accessRules.temporaryAccess) &&
              Boolean(accessRules.quotas),
          ),
        },
        {
          id: "rule-5",
          title: "Admin-controlled rewards, deals and campaigns",
          status: verified(rewardCount > 0 && campaignCount > 0),
        },
      ],
    };
  }
}
