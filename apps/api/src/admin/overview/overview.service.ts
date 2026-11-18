import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service.js";
import { mapAuditLog } from "../admin.mappers.js";

@Injectable()
export class AdminOverviewService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview() {
    const [
      groupCount,
      groupsByTypeRows,
      groupsByStatusRows,
      activeMemberSum,
      businessCount,
      consumerCount,
      invitationCount,
      pendingInviteCount,
      partnerCount,
      activePartnerCount,
      ownerRows,
      recentAudit,
    ] = await Promise.all([
      this.prisma.group.count(),
      this.prisma.group.groupBy({ by: ["type"], _count: { _all: true } }),
      this.prisma.group.groupBy({ by: ["status"], _count: { _all: true } }),
      this.prisma.group.aggregate({
        where: { status: { in: ["Active", "Recruiting"] } },
        _sum: { memberCount: true },
      }),
      this.prisma.business.count(),
      this.prisma.platformAccount.count({ where: { role: "consumer" } }),
      this.prisma.invitation.count(),
      this.prisma.invitation.count({ where: { status: "pending" } }),
      this.prisma.partner.count(),
      this.prisma.partner.count({ where: { status: "Active" } }),
      this.prisma.group.groupBy({
        by: ["ownerId"],
        where: { ownerId: { not: null } },
      }),
      this.prisma.auditLog.findMany({
        orderBy: { at: "desc" },
        take: 10,
      }),
    ]);

    const statusCounts = new Map(
      groupsByStatusRows.map((row) => [row.status, row._count._all]),
    );
    const pendingReviewGroups = statusCounts.get("Pending Review") ?? 0;

    const statusColours: Record<string, string> = {
      Active: "#10b981",
      Recruiting: "#38bdf8",
      "Pending Review": "#f59e0b",
      Suspended: "#ef4444",
      Closed: "#64748b",
    };

    return {
      metrics: {
        businessOwners: Math.max(businessCount, ownerRows.length),
        consumers: consumerCount,
        totalGroups: groupCount,
        invitations: invitationCount,
        activeMemberships: activeMemberSum._sum.memberCount ?? 0,
        pendingRequests: pendingReviewGroups + pendingInviteCount,
        pendingReviewGroups,
        pendingInvites: pendingInviteCount,
        partners: partnerCount,
        activePartners: activePartnerCount,
      },
      groupsByType: groupsByTypeRows
        .map((row) => ({ label: row.type, value: row._count._all }))
        .sort((a, b) => b.value - a.value),
      groupsByStatus: groupsByStatusRows.map((row) => ({
        label: row.status,
        value: row._count._all,
        color: statusColours[row.status] ?? "#64748b",
      })),
      recentActivity: recentAudit.map(mapAuditLog),
    };
  }
}
