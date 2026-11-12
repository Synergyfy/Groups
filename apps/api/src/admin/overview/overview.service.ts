import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service.js";
import { mapAuditLog } from "../admin.mappers.js";

@Injectable()
export class AdminOverviewService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview() {
    const [groups, businesses, accounts, invitations, partners, recentAudit] =
      await Promise.all([
        this.prisma.group.findMany({
          select: {
            id: true,
            type: true,
            status: true,
            ownerId: true,
            memberCount: true,
          },
        }),
        this.prisma.business.findMany({ select: { id: true } }),
        this.prisma.platformAccount.findMany({ select: { role: true } }),
        this.prisma.invitation.findMany({ select: { id: true, status: true } }),
        this.prisma.partner.findMany({ select: { id: true, status: true } }),
        this.prisma.auditLog.findMany({
          orderBy: { at: "desc" },
          take: 10,
        }),
      ]);

    const pendingReviewGroups = groups.filter(
      (group) => group.status === "Pending Review",
    ).length;
    const pendingInvites = invitations.filter(
      (invitation) => invitation.status === "pending",
    ).length;

    const byType = new Map<string, number>();
    for (const group of groups) {
      byType.set(group.type, (byType.get(group.type) ?? 0) + 1);
    }

    const byStatus = new Map<string, number>();
    for (const group of groups) {
      byStatus.set(group.status, (byStatus.get(group.status) ?? 0) + 1);
    }

    const statusColours: Record<string, string> = {
      Active: "#10b981",
      Recruiting: "#38bdf8",
      "Pending Review": "#f59e0b",
      Suspended: "#ef4444",
      Closed: "#64748b",
    };

    return {
      metrics: {
        businessOwners: Math.max(
          businesses.length,
          new Set(groups.map((group) => group.ownerId).filter(Boolean)).size,
        ),
        consumers: accounts.filter((account) => account.role === "consumer")
          .length,
        totalGroups: groups.length,
        invitations: invitations.length,
        activeMemberships: groups
          .filter(
            (group) =>
              group.status === "Active" || group.status === "Recruiting",
          )
          .reduce((sum, group) => sum + group.memberCount, 0),
        pendingRequests: pendingReviewGroups + pendingInvites,
        pendingReviewGroups,
        pendingInvites,
        partners: partners.length,
        activePartners: partners.filter((partner) => partner.status === "Active")
          .length,
      },
      groupsByType: [...byType.entries()]
        .map(([label, value]) => ({ label, value }))
        .sort((a, b) => b.value - a.value),
      groupsByStatus: [...byStatus.entries()].map(([label, value]) => ({
        label,
        value,
        color: statusColours[label] ?? "#64748b",
      })),
      recentActivity: recentAudit.map(mapAuditLog),
    };
  }
}
