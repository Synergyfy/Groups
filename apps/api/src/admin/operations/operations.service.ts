import { Injectable, NotFoundException } from "@nestjs/common";
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
    const invitations = await this.prisma.invitation.findMany({
      orderBy: { createdAt: "desc" },
    });
    const search = query.search?.trim().toLowerCase();

    return invitations
      .filter((invitation) => {
        if (query.status && query.status !== "all" && invitation.status !== query.status) {
          return false;
        }
        if (search) {
          const haystack =
            `${invitation.inviteeName} ${invitation.inviteeEmail ?? ""} ${invitation.invitedByName}`.toLowerCase();
          if (!haystack.includes(search)) return false;
        }
        return true;
      })
      .map(mapInvitation);
  }

  async getInvitationCounts() {
    const invitations = await this.prisma.invitation.findMany({
      select: { status: true },
    });
    return {
      total: invitations.length,
      pending: invitations.filter((item) => item.status === "pending").length,
      accepted: invitations.filter((item) => item.status === "accepted").length,
      declined: invitations.filter((item) => item.status === "declined").length,
      cancelled: invitations.filter((item) => item.status === "cancelled").length,
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

    const updated = await this.prisma.invitation.update({
      where: { id },
      data: {
        status: accept ? "accepted" : "declined",
        respondedAt: new Date(),
      },
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
      include: { members: true },
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

    const updated = await this.prisma.group.update({
      where: { id },
      data: { status: approve ? "Active" : "Closed" },
      include: { members: true },
    });

    await this.prisma.groupActivity.create({
      data: {
        groupId: id,
        actorName: actor?.name ?? "Administrator",
        kind: "settings",
        message: approve
          ? `${group.name} approved`
          : `${group.name} rejected`,
      },
    });

    await this.audit.record(actor, {
      action: approve ? "group-approved" : "group-closed",
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
    const entries = await this.prisma.auditLog.findMany({
      orderBy: { at: "desc" },
      take: 500,
    });
    const search = query.search?.trim().toLowerCase();

    return entries
      .filter((entry) => {
        if (query.action && query.action !== "all" && entry.action !== query.action) {
          return false;
        }
        if (
          query.targetType &&
          query.targetType !== "all" &&
          entry.targetType !== query.targetType
        ) {
          return false;
        }
        if (search) {
          const haystack =
            `${entry.actorName} ${entry.targetName} ${entry.detail}`.toLowerCase();
          if (!haystack.includes(search)) return false;
        }
        return true;
      })
      .map(mapAuditLog);
  }

  // -------------------------------------------------------------------------
  // Content
  // -------------------------------------------------------------------------

  private async ensureContent() {
    for (const section of DEFAULT_CONTENT_SECTIONS) {
      await this.prisma.contentSection.upsert({
        where: { id: section.id },
        update: {},
        create: {
          id: section.id,
          label: section.label,
          draft: {},
          published: {},
          status: "draft",
        },
      });
    }
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
    for (const section of sections) {
      await this.prisma.contentSection.update({
        where: { id: section.id },
        data: {
          published: section.draft as Prisma.InputJsonValue,
          status: "published",
          publishedAt: new Date(),
        },
      });
    }
    await this.audit.record(actor, {
      action: "content-published",
      targetType: "content",
      targetId: "all",
      targetName: "Public website",
      detail: "All content sections published",
    });
    return { ok: true, published: sections.length };
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
    const groups = await this.prisma.group.findMany({
      include: { members: true },
    });
    const businesses = await this.prisma.business.findMany({
      select: { id: true, city: true },
    });

    const byType = new Map<string, number>();
    const byCity = new Map<string, number>();
    const growth = new Map<string, number>();
    const origin = new Map<string, number>();

    for (const group of groups) {
      byType.set(group.type, (byType.get(group.type) ?? 0) + 1);
      const city = group.city ?? "Unassigned";
      byCity.set(city, (byCity.get(city) ?? 0) + 1);
      origin.set(group.source, (origin.get(group.source) ?? 0) + 1);
      const month = group.createdAt.toISOString().slice(0, 7);
      growth.set(month, (growth.get(month) ?? 0) + 1);
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
        members: groups.reduce(
          (sum, group) => sum + group.members.length,
          0,
        ),
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
      typeTotals: [...byType.entries()].map(([type, total]) => ({
        type,
        total,
        origin: (() => {
          const automatic = groups.filter(
            (group) => group.type === type && group.source === "automatic",
          ).length;
          return { automatic, userCreated: total - automatic };
        })(),
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
    const [groups, businesses, accounts, invitations, plans] = await Promise.all([
      this.prisma.group.findMany({ include: { members: true } }),
      this.prisma.business.count(),
      this.prisma.platformAccount.count(),
      this.prisma.invitation.findMany({ select: { status: true } }),
      this.prisma.membershipPlan.findMany(),
    ]);

    const accepted = invitations.filter(
      (invitation) => invitation.status === "accepted",
    ).length;
    const totalInvitations = invitations.length;

    return {
      stats: {
        registeredEntities: businesses + accounts,
        totalMemberships: plans.reduce(
          (sum, plan) => sum + plan.subscriberCount,
          0,
        ),
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
        {
          label: "Accepted",
          value: accepted,
          color: "#10b981",
        },
        {
          label: "Pending",
          value: invitations.filter((item) => item.status === "pending").length,
          color: "#f59e0b",
        },
        {
          label: "Declined",
          value: invitations.filter((item) => item.status === "declined").length,
          color: "#ef4444",
        },
      ],
      completeness: [
        {
          id: "rule-1",
          title: "Invitation-first onboarding without prior account",
          status: "Verified",
        },
        {
          id: "rule-2",
          title: "Business owner and consumer role & permission separation",
          status: "Verified",
        },
        {
          id: "rule-3",
          title: "Mandatory business groups & full group type management",
          status: "Verified",
        },
        {
          id: "rule-4",
          title: "Membership entitlements and temporary-access rules",
          status: "Verified",
        },
        {
          id: "rule-5",
          title: "Admin-controlled rewards, deals and campaigns",
          status: "Verified",
        },
      ],
    };
  }
}
