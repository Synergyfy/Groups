import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { randomUUID } from "node:crypto";
import type { SessionUser } from "../../auth/auth.types.js";
import { Prisma } from "../../generated/prisma/client.js";
import { PrismaService } from "../../prisma/prisma.service.js";
import { AdminAuditService } from "../../admin/admin-audit.service.js";
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
import type {
  AddGroupMemberDto,
  AdminGroupQueryDto,
  CreateGroupAdminDto,
  UpdateGroupAdminDto,
  UpdateGroupRelationshipsDto,
} from "../../admin/dto/admin.dto.js";

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 140);
}

@Injectable()
export class AdminGroupsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AdminAuditService,
  ) {}

  async list(query: AdminGroupQueryDto) {
    const where: Prisma.GroupWhereInput = {};
    const set = (field: keyof AdminGroupQueryDto, column: keyof Prisma.GroupWhereInput) => {
      const value = query[field];
      if (value && value !== "all") {
        (where as unknown as Record<string, unknown>)[column] = value;
      }
    };

    set("type", "type");
    set("city", "city");
    set("localArea", "localArea");
    set("status", "status");
    set("stage", "stage");
    set("owner", "ownerName");
    set("programme", "programmeId");
    set("source", "source");
    set("pricing", "pricing");

    const needle = query.query?.trim();
    if (needle) {
      where.OR = [
        { name: { contains: needle, mode: "insensitive" } },
        { purpose: { contains: needle, mode: "insensitive" } },
        { ownerName: { contains: needle, mode: "insensitive" } },
        { type: { contains: needle, mode: "insensitive" } },
      ];
    }

    const groups = await this.prisma.group.findMany({
      where,
      include: { members: { select: { memberId: true } } },
      orderBy: { createdAt: "desc" },
    });

    return groups.map(mapGroup);
  }

  async getHub() {
    const [groups, invitations] = await Promise.all([
      this.prisma.group.findMany({
        include: { members: { select: { memberId: true } } },
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.invitation.findMany({ orderBy: { createdAt: "desc" } }),
    ]);

    const pendingInvitations = invitations.filter(
      (invitation) => invitation.status === "pending",
    );

    return {
      groups: groups.map(mapGroup),
      invitations: invitations.map(mapInvitation),
      stats: {
        totalGroups: groups.length,
        adminCreated: groups.filter((group) => group.source === "automatic").length,
        businessCreated: groups.filter((group) => group.source !== "automatic")
          .length,
        pendingReview: groups.filter((group) => group.status === "Pending Review")
          .length,
        activeGroups: groups.filter(
          (group) => group.status === "Active" || group.status === "Recruiting",
        ).length,
        suspendedGroups: groups.filter((group) => group.status === "Suspended")
          .length,
        totalMembers: groups.reduce((sum, group) => sum + group.memberCount, 0),
        pendingInvitations: pendingInvitations.length,
      },
    };
  }

  async getDashboard() {
    const groups = await this.prisma.group.findMany({
      select: {
        id: true,
        type: true,
        city: true,
        status: true,
        source: true,
        memberCount: true,
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
    });

    const byType = new Map<string, number>();
    const byCity = new Map<string, number>();
    const byStatus = new Map<string, number>();
    const growth = new Map<string, number>();

    for (const group of groups) {
      byType.set(group.type, (byType.get(group.type) ?? 0) + 1);
      const city = group.city ?? "Unassigned";
      byCity.set(city, (byCity.get(city) ?? 0) + 1);
      byStatus.set(group.status, (byStatus.get(group.status) ?? 0) + 1);

      const key = group.createdAt.toISOString().slice(0, 7);
      growth.set(key, (growth.get(key) ?? 0) + 1);
    }

    return {
      stats: {
        totalGroups: groups.length,
        totalMembers: groups.reduce((sum, group) => sum + group.memberCount, 0),
        networkGroups: groups.filter((group) => group.type === "Network").length,
        nationalCommunities: groups.filter(
          (group) => group.type === "National Community",
        ).length,
        automatic: groups.filter((group) => group.source === "automatic").length,
        userCreated: groups.filter((group) => group.source !== "automatic")
          .length,
        active: groups.filter((group) => group.status === "Active").length,
        recruiting: groups.filter((group) => group.status === "Recruiting")
          .length,
        pendingReview: groups.filter((group) => group.status === "Pending Review")
          .length,
        suspended: groups.filter((group) => group.status === "Suspended").length,
      },
      originDistribution: [
        {
          label: "Automatic",
          value: groups.filter((group) => group.source === "automatic").length,
        },
        {
          label: "User-created",
          value: groups.filter((group) => group.source === "user-created").length,
        },
      ],
      groupsByType: [...byType.entries()].map(([label, value]) => ({
        label,
        value,
      })),
      groupsByCity: [...byCity.entries()].map(([label, value]) => ({
        label,
        value,
      })),
      groupsByStatus: [...byStatus.entries()].map(([label, value]) => ({
        label,
        value,
      })),
      growth: [...growth.entries()]
        .map(([month, value]) => ({ label: month, value }))
        .sort((a, b) => a.label.localeCompare(b.label))
        .slice(-6),
    };
  }

  async findOne(id: string) {
    const [group, activity] = await Promise.all([
      this.prisma.group.findUnique({
        where: { id },
        include: { members: { select: { memberId: true } } },
      }),
      this.prisma.groupActivity.findMany({
        where: { groupId: id },
        orderBy: { at: "desc" },
        take: 20,
      }),
    ]);
    if (!group) throw new NotFoundException(`Group ${id} not found`);

    return { ...mapGroup(group), activity: activity.map(mapGroupActivity) };
  }

  async create(dto: CreateGroupAdminDto, actor?: SessionUser) {
    const baseSlug = slugify(dto.slug ?? dto.name);
    const slug = await this.uniqueSlug(baseSlug);

    const group = await this.prisma.group.create({
      data: {
        name: dto.name,
        slug,
        description: dto.description,
        type: dto.type ?? "Other",
        source: dto.source ?? "user-created",
        purpose: dto.purpose ?? "",
        ownerId: dto.ownerId,
        ownerName: dto.ownerName ?? "",
        status: dto.status ?? "Active",
        accessType: dto.accessType ?? "open",
        directoryVisibility: dto.visibility ?? "directory",
        city: dto.city,
        localArea: dto.localArea,
        requiredSize: dto.requiredSize,
        stage: dto.stage,
        pricing: dto.pricing ?? "free",
        contribution: dto.contribution,
        contributionFrequency: dto.contributionFrequency,
        interactionLevel: dto.interactionLevel,
        programmeId: dto.programmeId,
        campaignIds: dto.campaignIds ?? [],
        accountManagerId: dto.accountManagerId,
        agentId: dto.agentId,
        consultantId: dto.consultantId,
        visibility: "PUBLIC",
      },
      include: { members: { select: { memberId: true } } },
    });

    await this.addActivity(
      group.id,
      actor?.name ?? "Administrator",
      "created",
      `Group "${group.name}" created`,
    );
    await this.audit.record(actor, {
      action: "group-created",
      targetType: "group",
      targetId: group.id,
      targetName: group.name,
      detail: "Group created from the admin console",
    });

    return mapGroup(group);
  }

  async update(id: string, dto: UpdateGroupAdminDto, actor?: SessionUser) {
    await this.ensureGroup(id);

    const group = await this.prisma.group.update({
      where: { id },
      data: {
        name: dto.name,
        slug: dto.slug,
        description: dto.description,
        type: dto.type,
        source: dto.source,
        purpose: dto.purpose,
        ownerId: dto.ownerId,
        ownerName: dto.ownerName,
        status: dto.status,
        accessType: dto.accessType,
        directoryVisibility: dto.visibility,
        city: dto.city,
        localArea: dto.localArea,
        requiredSize: dto.requiredSize,
        stage: dto.stage,
        pricing: dto.pricing,
        contribution: dto.contribution,
        contributionFrequency: dto.contributionFrequency,
        interactionLevel: dto.interactionLevel,
        programmeId: dto.programmeId,
        campaignIds: dto.campaignIds,
        accountManagerId: dto.accountManagerId,
        agentId: dto.agentId,
        consultantId: dto.consultantId,
      },
      include: { members: { select: { memberId: true } } },
    });

    await this.addActivity(
      id,
      actor?.name ?? "Administrator",
      "update",
      `Group "${group.name}" updated`,
    );
    await this.audit.record(actor, {
      action: "group-updated",
      targetType: "group",
      targetId: group.id,
      targetName: group.name,
      detail: "Group updated from the admin console",
    });

    return mapGroup(group);
  }

  async remove(id: string, actor?: SessionUser) {
    const group = await this.ensureGroup(id);
    await this.prisma.group.delete({ where: { id } });
    await this.audit.record(actor, {
      action: "group-deleted",
      targetType: "group",
      targetId: id,
      targetName: group.name,
      detail: "Group deleted from the admin console",
    });
    return { ok: true };
  }

  async setStatus(
    id: string,
    status: string,
    action: string,
    detail: string,
    actor?: SessionUser,
  ) {
    const group = await this.ensureGroup(id);
    const updated = await this.prisma.group.update({
      where: { id },
      data: { status },
      include: { members: { select: { memberId: true } } },
    });
    await this.addActivity(id, actor?.name ?? "Administrator", "settings", detail);
    await this.audit.record(actor, {
      action,
      targetType: "group",
      targetId: id,
      targetName: group.name,
      detail,
    });
    return mapGroup(updated);
  }

  async listMembers(id: string) {
    await this.ensureGroup(id);
    const members = await this.prisma.groupMember.findMany({
      where: { groupId: id },
      orderBy: [{ role: "asc" }, { joinedAt: "asc" }],
    });
    return members.map(mapGroupMember);
  }

  async addMember(
    id: string,
    dto: AddGroupMemberDto,
    actor?: SessionUser,
  ) {
    const group = await this.ensureGroup(id);
    const existing = await this.prisma.groupMember.findUnique({
      where: { groupId_memberId: { groupId: id, memberId: dto.memberId } },
    });
    if (existing) {
      throw new ConflictException(`${dto.fullName} is already a member`);
    }

    const member = await this.prisma.$transaction(async (tx) => {
      const created = await tx.groupMember.create({
        data: {
          groupId: id,
          memberId: dto.memberId,
          fullName: dto.fullName,
          businessName: dto.businessName,
          category: dto.category,
          location: dto.location,
          geography: dto.geography,
          status: dto.status ?? "active",
          role: dto.role ?? "peripheral",
          tier: dto.tier ?? "Free",
          contributionStatus: group.pricing === "paid" ? "pending" : "n/a",
        },
      });

      await tx.group.update({
        where: { id },
        data: { memberCount: { increment: 1 } },
      });
      await tx.groupActivity.create({
        data: {
          groupId: id,
          actorName: actor?.name ?? "Administrator",
          kind: "join",
          message: `${dto.fullName} added to ${group.name}`,
        },
      });
      return created;
    });

    await this.audit.record(actor, {
      action: "member-added",
      targetType: "member",
      targetId: dto.memberId,
      targetName: dto.fullName,
      detail: `Added to group ${group.name}`,
    });

    return mapGroupMember(member);
  }

  async removeMember(
    id: string,
    memberId: string,
    actor?: SessionUser,
  ) {
    const group = await this.ensureGroup(id);
    const member = await this.prisma.groupMember.findUnique({
      where: { groupId_memberId: { groupId: id, memberId } },
    });
    if (!member) {
      throw new NotFoundException(`Member ${memberId} not found in group`);
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.groupMember.delete({ where: { id: member.id } });
      await tx.group.updateMany({
        where: { id, memberCount: { gt: 0 } },
        data: { memberCount: { decrement: 1 } },
      });
      await tx.groupActivity.create({
        data: {
          groupId: id,
          actorName: actor?.name ?? "Administrator",
          kind: "leave",
          message: `${member.fullName} removed from ${group.name}`,
        },
      });
    });

    await this.audit.record(actor, {
      action: "member-removed",
      targetType: "member",
      targetId: memberId,
      targetName: member.fullName,
      detail: `Removed from group ${group.name}`,
    });

    return { ok: true };
  }

  async updateMemberContribution(
    id: string,
    memberId: string,
    status: string,
    actor?: SessionUser,
  ) {
    const group = await this.ensureGroup(id);
    const member = await this.prisma.groupMember.findUnique({
      where: { groupId_memberId: { groupId: id, memberId } },
    });
    if (!member) {
      throw new NotFoundException(`Member ${memberId} not found in group`);
    }
    if (group.pricing !== "paid") {
      throw new ConflictException("This group is not a paid group");
    }

    const updated = await this.prisma.groupMember.update({
      where: { id: member.id },
      data: {
        contributionStatus: status,
        contributionPaidAt: status === "paid" ? new Date() : null,
      },
    });

    await this.prisma.groupActivity.create({
      data: {
        groupId: id,
        actorName: actor?.name ?? "Administrator",
        kind: "settings",
        message: `Contribution for ${member.fullName} marked ${status}`,
      },
    });
    await this.audit.record(actor, {
      action: "contribution-updated",
      targetType: "member",
      targetId: memberId,
      targetName: member.fullName,
      detail: `Contribution marked ${status} in ${group.name}`,
    });

    return mapGroupMember(updated);
  }

  async listActivity(id: string) {
    await this.ensureGroup(id);
    const activity = await this.prisma.groupActivity.findMany({
      where: { groupId: id },
      orderBy: { at: "desc" },
      take: 500,
    });
    return activity.map(mapGroupActivity);
  }

  async getRelationships(id: string) {
    const group = await this.prisma.group.findUnique({
      where: { id },
      include: { members: { select: { memberId: true } } },
    });
    if (!group) throw new NotFoundException(`Group ${id} not found`);

    const relationshipIds = [
      group.accountManagerId,
      group.agentId,
      group.consultantId,
    ].filter((value): value is string => Boolean(value));

    const [owner, programme, campaignIds, relationships] = await Promise.all([
      group.ownerId
        ? this.prisma.business.findUnique({ where: { id: group.ownerId } })
        : null,
      group.programmeId
        ? this.prisma.programme.findUnique({ where: { id: group.programmeId } })
        : null,
      this.prisma.campaign.findMany({
        where: { groupIds: { has: group.id } },
      }),
      relationshipIds.length
        ? this.prisma.relationship.findMany({
            where: { id: { in: relationshipIds } },
          })
        : [],
    ]);

    const resolve = (relationshipId?: string | null) => {
      if (!relationshipId) return null;
      const found = relationships.find((entry) => entry.id === relationshipId);
      return found ? mapRelationship(found) : null;
    };

    return {
      group: mapGroup(group),
      owner: owner ? mapBusiness(owner) : null,
      programme: programme ? mapProgramme(programme) : null,
      campaigns: campaignIds.map(mapCampaign),
      accountManager: resolve(group.accountManagerId),
      agent: resolve(group.agentId),
      consultant: resolve(group.consultantId),
      location: {
        city: group.city ?? null,
        localArea: group.localArea ?? null,
      },
    };
  }

  async updateRelationships(
    id: string,
    dto: UpdateGroupRelationshipsDto,
    actor?: SessionUser,
  ) {
    const group = await this.ensureGroup(id);
    const updated = await this.prisma.group.update({
      where: { id },
      data: {
        accountManagerId: dto.accountManagerId,
        agentId: dto.agentId,
        consultantId: dto.consultantId,
        programmeId: dto.programmeId,
        city: dto.city,
        localArea: dto.localArea,
      },
      include: { members: { select: { memberId: true } } },
    });
    await this.audit.record(actor, {
      action: "relationship-assigned",
      targetType: "group",
      targetId: id,
      targetName: group.name,
      detail: "Group relationships updated",
    });
    return mapGroup(updated);
  }

  async getContribution(id: string) {
    const group = await this.ensureGroup(id);
    const members = await this.prisma.groupMember.findMany({
      where: { groupId: id },
      orderBy: { joinedAt: "asc" },
    });

    if (group.pricing !== "paid" || !group.contribution) {
      return {
        groupId: id,
        pricing: group.pricing,
        amount: group.contribution ?? 0,
        frequency: group.contributionFrequency ?? "once",
        collected: 0,
        outstanding: 0,
        rows: members.map((member) => ({
          memberId: member.memberId,
          fullName: member.fullName,
          status: "n/a",
          amount: 0,
          paidAt: null,
        })),
      };
    }

    const amount = group.contribution;
    const rows = members.map((member) => ({
      memberId: member.memberId,
      fullName: member.fullName,
      status: member.contributionStatus,
      amount,
      paidAt: member.contributionPaidAt?.toISOString() ?? null,
    }));

    const collected = rows
      .filter((row) => row.status === "paid")
      .reduce((sum, row) => sum + row.amount, 0);
    const outstanding = rows
      .filter((row) => row.status !== "paid")
      .reduce((sum, row) => sum + row.amount, 0);

    return {
      groupId: id,
      pricing: group.pricing,
      amount,
      frequency: group.contributionFrequency ?? "once",
      collected,
      outstanding,
      rows,
    };
  }

  async listCircles(id: string) {
    await this.ensureGroup(id);
    const circles = await this.prisma.groupCircle.findMany({
      where: { groupId: id },
      orderBy: { createdAt: "asc" },
    });
    return circles.map(mapGroupCircle);
  }

  async listAllCircles() {
    const [groupCircles, businessCircles, groups] = await Promise.all([
      this.prisma.groupCircle.findMany({ orderBy: { createdAt: "desc" } }),
      this.prisma.circle.findMany({ orderBy: { createdAt: "desc" } }),
      this.prisma.group.findMany({ select: { id: true, name: true } }),
    ]);
    const groupNames = new Map(groups.map((group) => [group.id, group.name]));

    return [
      ...groupCircles.map((circle) => ({
        ...mapGroupCircle(circle),
        groupId: circle.groupId,
        groupName: groupNames.get(circle.groupId) ?? null,
      })),
      ...businessCircles.map((circle) => ({
        id: circle.id,
        type: circle.type,
        config: circle.config as Record<string, unknown>,
        memberIds: circle.memberIds,
        sourceListIds: circle.sourceListIds,
        createdAt: circle.createdAt.toISOString(),
        status: circle.status,
        businessId: circle.businessId,
        groupId: null as string | null,
        groupName: null as string | null,
      })),
    ];
  }

  async listInvitations(id: string) {
    await this.ensureGroup(id);
    const invitations = await this.prisma.invitation.findMany({
      where: { groupId: id },
      orderBy: { createdAt: "desc" },
    });
    return invitations.map(mapInvitation);
  }

  private async ensureGroup(id: string) {
    const group = await this.prisma.group.findUnique({ where: { id } });
    if (!group) throw new NotFoundException(`Group ${id} not found`);
    return group;
  }

  private async uniqueSlug(base: string): Promise<string> {
    const seed = base || randomUUID().slice(0, 8);
    let candidate = seed;
    let suffix = 1;
    while (await this.prisma.group.findUnique({ where: { slug: candidate } })) {
      suffix += 1;
      candidate = `${seed}-${suffix}`;
    }
    return candidate;
  }

  private async addActivity(
    groupId: string,
    actorName: string,
    kind: string,
    message: string,
  ) {
    await this.prisma.groupActivity.create({
      data: { groupId, actorName, kind, message },
    });
  }
}
