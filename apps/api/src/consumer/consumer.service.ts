import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { SessionUser } from "../auth/auth.types.js";
import { PrismaService } from "../prisma/prisma.service.js";

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

    return groups.map((group) => this.mapGroup(group));
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

    return {
      ...this.mapGroup(group),
      members: group.members,
      joined: group.members.some((member) => member.memberId === user.id),
    };
  }

  async join(user: SessionUser, id: string) {
    const group = await this.prisma.group.findUnique({ where: { id } });
    if (!group) throw new NotFoundException("Group not found");
    if (group.visibility !== "PUBLIC") {
      throw new BadRequestException("This group requires an invitation");
    }

    const account = await this.prisma.user.findUnique({
      where: { id: user.id },
    });
    if (!account) throw new NotFoundException("Consumer account not found");

    const existing = await this.prisma.groupMember.findUnique({
      where: { groupId_memberId: { groupId: id, memberId: user.id } },
    });
    await this.prisma.groupMember.upsert({
      where: { groupId_memberId: { groupId: id, memberId: user.id } },
      update: { lastActiveAt: new Date() },
      create: {
        groupId: id,
        memberId: user.id,
        fullName: account.fullName ?? account.displayName ?? user.name,
        category: "Consumer",
        location: account.address ?? undefined,
        status: "active",
        role: "member",
        tier: account.membershipTier ?? "Free",
      },
    });

    if (!existing) {
      await this.prisma.group.update({
        where: { id },
        data: { memberCount: { increment: 1 } },
      });
    }

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

    return { ok: true };
  }

  async invitations(user: SessionUser, status?: string) {
    return this.prisma.invitation.findMany({
      where: {
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
        OR: [{ inviteeId: user.id }, { inviteeEmail: user.email }],
        status: "pending",
      },
    });
    if (!invitation) throw new NotFoundException("Invitation not found");

    const updated = await this.prisma.invitation.update({
      where: { id },
      data: {
        status: accept ? "accepted" : "declined",
        inviteeId: user.id,
        respondedAt: new Date(),
      },
    });

    if (accept && invitation.groupId) {
      await this.join(user, invitation.groupId);
    }

    return updated;
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
      createdAt: group.createdAt.toISOString(),
    };
  }
}
