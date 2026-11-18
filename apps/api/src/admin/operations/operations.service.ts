import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import type { SessionUser } from "../../auth/auth.types.js";
import { Prisma } from "../../generated/prisma/client.js";
import { PrismaService } from "../../prisma/prisma.service.js";
import { AdminAuditService } from "../../admin/admin-audit.service.js";
import { DEFAULT_CONTENT_SECTIONS } from "../../admin/admin-defaults.js";
import {
  mapAuditLog,
  mapContentSection,
  mapGroup,
  mapInvitation,
  mapReportSchedule,
} from "../../admin/admin.mappers.js";
import type {
  AdminListQueryDto,
  CreateLocationAreaDto,
  CreateLocationCityDto,
  UpdateContentSectionDto,
  UpdateLocationDto,
} from "../../admin/dto/admin.dto.js";

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

  // -------------------------------------------------------------------------
  // Pending review
  // -------------------------------------------------------------------------

  async listPendingReview() {
    const groups = await this.prisma.group.findMany({
      where: { status: "Pending Review" },
      include: { members: { select: { memberId: true } } },
      orderBy: { createdAt: "desc" },
    });
    return groups.map(mapGroup);
  }

  async approvePendingGroup(id: string, actor?: SessionUser) {
    return this.decidePendingGroup(id, true, actor);
  }

  async rejectPendingGroup(id: string, actor?: SessionUser) {
    return this.decidePendingGroup(id, false, actor);
  }

  private async decidePendingGroup(
    id: string,
    approve: boolean,
    actor?: SessionUser,
  ) {
    const group = await this.prisma.group.findUnique({ where: { id } });
    if (!group) throw new NotFoundException(`Group ${id} not found`);
    if (group.status !== "Pending Review") {
      throw new ConflictException(
        `Group ${id} is not waiting for review (status: ${group.status})`,
      );
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.group.update({
        where: { id },
        data: { status: approve ? "Active" : "Closed" },
        include: { members: { select: { memberId: true } } },
      });
      await tx.groupActivity.create({
        data: {
          groupId: id,
          actorName: actor?.name ?? "Administrator",
          kind: "settings",
          message: approve
            ? `${group.name} approved`
            : `${group.name} rejected`,
        },
      });
      return result;
    });

    await this.audit.record(actor, {
      action: approve ? "group-approved" : "group-rejected",
      targetType: "group",
      targetId: id,
      targetName: group.name,
      detail: approve ? "Group approved" : "Group rejected",
    });

    return mapGroup(updated);
  }

  // -------------------------------------------------------------------------
  // Audit log
  // -------------------------------------------------------------------------

  async listAuditLog(query: AdminListQueryDto) {
    const where: Prisma.AuditLogWhereInput = {};
    if (query.action && query.action !== "all") where.action = query.action;
    if (query.targetType && query.targetType !== "all") {
      where.targetType = query.targetType;
    }
    if (query.search?.trim()) {
      const search = query.search.trim();
      where.OR = [
        { actorName: { contains: search, mode: "insensitive" } },
        { targetName: { contains: search, mode: "insensitive" } },
        { detail: { contains: search, mode: "insensitive" } },
      ];
    }

    const entries = await this.prisma.auditLog.findMany({
      where,
      orderBy: { at: "desc" },
      take: 500,
    });
    return entries.map(mapAuditLog);
  }

  // -------------------------------------------------------------------------
  // Content
  // -------------------------------------------------------------------------

  private contentReady: Promise<void> | null = null;

  private async ensureContent() {
    this.contentReady ??= this.prisma.contentSection
      .createMany({
        data: DEFAULT_CONTENT_SECTIONS.map((section) => ({
          id: section.id,
          label: section.label,
          draft: {},
          published: {},
          status: "draft",
        })),
        skipDuplicates: true,
      })
      .then(() => undefined);
    await this.contentReady;
  }

  async listContent() {
    await this.ensureContent();
    const sections = await this.prisma.contentSection.findMany({
      orderBy: { id: "asc" },
    });
    return sections.map(mapContentSection);
  }

  async getContentSection(id: string) {
    await this.ensureContent();
    const section = await this.prisma.contentSection.findUnique({
      where: { id },
    });
    if (!section) throw new NotFoundException(`Content section ${id} not found`);
    return mapContentSection(section);
  }

  async updateContentSection(
    id: string,
    dto: UpdateContentSectionDto,
    actor?: SessionUser,
  ) {
    await this.getContentSection(id);
    const section = await this.prisma.contentSection.update({
      where: { id },
      data: {
        draft: dto.draft as Prisma.InputJsonValue | undefined,
        published: dto.published as Prisma.InputJsonValue | undefined,
      },
    });
    await this.audit.record(actor, {
      action: "content-published",
      targetType: "content",
      targetId: id,
      targetName: section.label,
      detail: `${section.label} draft saved`,
    });
    return mapContentSection(section);
  }

  async publishContentSection(id: string, actor?: SessionUser) {
    const existing = await this.getContentSection(id);
    const draft = existing.draft as Record<string, unknown>;
    if (!draft || Object.keys(draft).length === 0) {
      throw new ConflictException(
        `Content section ${id} has no draft changes to publish`,
      );
    }
    const section = await this.prisma.contentSection.update({
      where: { id },
      data: {
        published: existing.draft as Prisma.InputJsonValue,
        status: "published",
        publishedAt: new Date(),
      },
    });
    await this.audit.record(actor, {
      action: "content-published",
      targetType: "content",
      targetId: id,
      targetName: section.label,
      detail: `${section.label} published`,
    });
    return mapContentSection(section);
  }

  async publishAllContent(actor?: SessionUser) {
    await this.ensureContent();
    const sections = await this.prisma.contentSection.findMany();
    const publishable = sections.filter((section) => {
      const draft = section.draft as Record<string, unknown> | null;
      return draft && Object.keys(draft).length > 0;
    });
    if (publishable.length > 0) {
      await this.prisma.$transaction(
        publishable.map((section) =>
          this.prisma.contentSection.update({
            where: { id: section.id },
            data: {
              published: section.draft as Prisma.InputJsonValue,
              status: "published",
              publishedAt: new Date(),
            },
          }),
        ),
      );
    }
    await this.audit.record(actor, {
      action: "content-published",
      targetType: "content",
      targetId: "all",
      targetName: "Public website",
      detail: `Published ${publishable.length} content section(s) with draft changes`,
    });
    return { ok: true, published: publishable.length };
  }

  async getContentStatus() {
    await this.ensureContent();
    const sections = await this.prisma.contentSection.findMany();
    const published = sections.filter((section) => section.status === "published");
    return {
      published: published.length === sections.length && sections.length > 0,
      total: sections.length,
      publishedCount: published.length,
      lastPublishedAt: published
        .map((section) => section.publishedAt)
        .filter(Boolean)
        .sort((a, b) => (b?.getTime() ?? 0) - (a?.getTime() ?? 0))[0],
    };
  }

  // -------------------------------------------------------------------------
  // Locations
  // -------------------------------------------------------------------------

  async getLocations() {
    const cities = await this.prisma.locationCity.findMany({
      orderBy: { name: "asc" },
      include: { areas: { orderBy: { name: "asc" } } },
    });
    return {
      nationalCommunity: "National Community",
      cities: cities.map((city) => ({
        id: city.id,
        name: city.name,
        areas: city.areas.map((area) => ({ id: area.id, name: area.name })),
      })),
    };
  }

  async createCity(dto: CreateLocationCityDto) {
    return this.prisma.locationCity.create({
      data: { id: randomUUID(), name: dto.name },
      include: { areas: true },
    });
  }

  async updateCity(id: string, dto: UpdateLocationDto) {
    await this.ensureCity(id);
    return this.prisma.locationCity.update({
      where: { id },
      data: { name: dto.name },
      include: { areas: true },
    });
  }

  async removeCity(id: string) {
    await this.ensureCity(id);
    await this.prisma.locationCity.delete({ where: { id } });
    return { ok: true };
  }

  async createArea(cityId: string, dto: CreateLocationAreaDto) {
    await this.ensureCity(cityId);
    return this.prisma.locationArea.create({
      data: { id: randomUUID(), cityId, name: dto.name },
    });
  }

  async updateArea(id: string, dto: UpdateLocationDto) {
    await this.ensureArea(id);
    return this.prisma.locationArea.update({
      where: { id },
      data: { name: dto.name },
    });
  }

  async removeArea(id: string) {
    await this.ensureArea(id);
    await this.prisma.locationArea.delete({ where: { id } });
    return { ok: true };
  }

  private async ensureCity(id: string) {
    const city = await this.prisma.locationCity.findUnique({ where: { id } });
    if (!city) throw new NotFoundException(`City ${id} not found`);
    return city;
  }

  private async ensureArea(id: string) {
    const area = await this.prisma.locationArea.findUnique({ where: { id } });
    if (!area) throw new NotFoundException(`Area ${id} not found`);
    return area;
  }

  // -------------------------------------------------------------------------
  // Reports
  // -------------------------------------------------------------------------

  async getGroupReport() {
    const [groups, businesses] = await Promise.all([
      this.prisma.group.findMany({
        select: {
          id: true,
          type: true,
          city: true,
          source: true,
          memberCount: true,
          createdAt: true,
        },
      }),
      this.prisma.business.findMany({
        select: { id: true, city: true },
      }),
    ]);

    const byType = new Map<string, number>();
    const byCity = new Map<string, number>();
    const growth = new Map<string, number>();
    const origin = new Map<string, number>();
    const typeOrigins = new Map<string, { total: number; automatic: number }>();

    for (const group of groups) {
      byType.set(group.type, (byType.get(group.type) ?? 0) + 1);
      const city = group.city ?? "Unassigned";
      byCity.set(city, (byCity.get(city) ?? 0) + 1);
      origin.set(group.source, (origin.get(group.source) ?? 0) + 1);
      const month = group.createdAt.toISOString().slice(0, 7);
      growth.set(month, (growth.get(month) ?? 0) + 1);

      const typeEntry = typeOrigins.get(group.type) ?? { total: 0, automatic: 0 };
      typeEntry.total += 1;
      if (group.source === "automatic") typeEntry.automatic += 1;
      typeOrigins.set(group.type, typeEntry);
    }

    const cities = new Set(
      [
        ...groups.map((group) => group.city),
        ...businesses.map((business) => business.city),
      ].filter(Boolean),
    );

    return {
      stats: {
        groups: groups.length,
        members: groups.reduce((sum, group) => sum + group.memberCount, 0),
        businesses: businesses.length,
        citiesCovered: cities.size,
      },
      originDistribution: [...origin.entries()].map(([label, value]) => ({
        label,
        value,
      })),
      growth: [...growth.entries()]
        .map(([label, value]) => ({ label, value }))
        .sort((a, b) => a.label.localeCompare(b.label))
        .slice(-6),
      groupsByType: [...byType.entries()].map(([label, value]) => ({
        label,
        value,
      })),
      groupsByCity: [...byCity.entries()].map(([label, value]) => ({
        label,
        value,
      })),
      typeTotals: [...typeOrigins.entries()].map(([type, entry]) => ({
        type,
        total: entry.total,
        origin: {
          automatic: entry.automatic,
          userCreated: entry.total - entry.automatic,
        },
      })),
    };
  }

  async listReportSchedules() {
    const schedules = await this.prisma.reportSchedule.findMany({
      orderBy: { createdAt: "desc" },
    });
    return schedules.map(mapReportSchedule);
  }

  async createReportSchedule(
    body: {
      name?: string;
      type?: string;
      frequency?: string;
      recipients?: string[];
      status?: string;
    },
    actor?: SessionUser,
  ) {
    const schedule = await this.prisma.reportSchedule.create({
      data: {
        id: randomUUID(),
        name: body.name ?? "Untitled report",
        type: body.type ?? "groups",
        frequency: body.frequency ?? "monthly",
        recipients: body.recipients ?? [],
        status: body.status ?? "Active",
      },
    });
    await this.audit.record(actor, {
      action: "config-updated",
      targetType: "config",
      targetId: schedule.id,
      targetName: schedule.name,
      detail: "Report schedule created",
    });
    return mapReportSchedule(schedule);
  }

  async updateReportSchedule(
    id: string,
    body: {
      name?: string;
      type?: string;
      frequency?: string;
      recipients?: string[];
      status?: string;
    },
  ) {
    await this.ensureSchedule(id);
    const schedule = await this.prisma.reportSchedule.update({
      where: { id },
      data: {
        name: body.name,
        type: body.type,
        frequency: body.frequency,
        recipients: body.recipients,
        status: body.status,
      },
    });
    return mapReportSchedule(schedule);
  }

  async removeReportSchedule(id: string) {
    await this.ensureSchedule(id);
    await this.prisma.reportSchedule.delete({ where: { id } });
    return { ok: true };
  }

  private async ensureSchedule(id: string) {
    const schedule = await this.prisma.reportSchedule.findUnique({
      where: { id },
    });
    if (!schedule) throw new NotFoundException(`Report ${id} not found`);
    return schedule;
  }

  async getSettingsReport() {
    const [groups, businessCount, accountCount, invitationGroups, plans, config, rewardCount, campaignCount] =
      await Promise.all([
        this.prisma.group.findMany({ select: { createdAt: true } }),
        this.prisma.business.count(),
        this.prisma.platformAccount.count(),
        this.prisma.invitation.groupBy({
          by: ["status"],
          _count: { _all: true },
        }),
        this.prisma.membershipPlan.aggregate({
          _sum: { subscriberCount: true },
        }),
        this.prisma.adminConfig.findUnique({ where: { id: "default" } }),
        this.prisma.rewardDeal.count(),
        this.prisma.campaign.count(),
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

    return {
      stats: {
        registeredEntities: businessCount + accountCount,
        totalMemberships: plans._sum.subscriberCount ?? 0,
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
          title: "Membership entitlements and temporary-access rules",
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
