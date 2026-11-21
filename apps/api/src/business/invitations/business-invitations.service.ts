import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type {
  Circle,
  Group,
  Invitation,
} from "../../generated/prisma/client.js";
import { Prisma } from "../../generated/prisma/client.js";
import {
  mapBusiness,
  mapGroup,
  mapInvitationForBusiness,
} from "../../admin/admin.mappers.js";
import { PrismaService } from "../../prisma/prisma.service.js";
import { BusinessContextService } from "../business-context.service.js";
import type { BusinessContext } from "../business.types.js";
import { mapCircle as mapBusinessCircle } from "../business.mappers.js";
import type { BusinessInvitationQueryDto } from "../dto/business.dto.js";
import { pageParams, pageResult } from "../business.utils.js";
import { contributionPeriodKey } from "../../payments/payments.utils.js";
import { fromMinorPence } from "../../common/money.js";
import { syncGroupActivationStatus } from "../group-activation.js";

interface InvitationWithTarget {
  invitation: Invitation;
  group: Group | null;
  circle: Circle | null;
}

@Injectable()
export class BusinessInvitationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly context: BusinessContextService,
  ) {}

  async list(ctx: BusinessContext, query: BusinessInvitationQueryDto) {
    const params = pageParams(query.page, query.limit, 25);
    const ownedGroupIds = await this.ownedGroupIds(ctx.business.id);
    const where = this.whereFor(ctx, query, ownedGroupIds);
    const statusWhere = query.status ? { status: query.status } : {};

    const [total, rows] = await Promise.all([
      this.prisma.invitation.count({ where }),
      this.prisma.invitation.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: params.skip,
        take: params.limit,
      }),
    ]);

    const items = await this.decorateMany(rows, ctx);
    const [counts] = await Promise.all([
      this.counts(ctx, ownedGroupIds, statusWhere),
    ]);

    return {
      ...pageResult(items, total, params),
      tab: query.tab ?? "incoming",
      counts,
    };
  }

  async get(ctx: BusinessContext, invitationId: string) {
    const target = await this.findVisible(ctx, invitationId);
    const [inviter, invitee] = await Promise.all([
      target.invitation.invitedById
        ? this.prisma.business.findUnique({
            where: { id: target.invitation.invitedById },
          })
        : null,
      target.invitation.inviteeId
        ? this.prisma.business.findUnique({
            where: { id: target.invitation.inviteeId },
          })
        : null,
    ]);

    return {
      invitation: mapInvitationForBusiness(
        target.invitation,
        ctx.business.id,
        ctx.business.email,
      ),
      group: target.group ? mapGroup(target.group) : null,
      circle: target.circle ? mapBusinessCircle(target.circle) : null,
      inviter: inviter ? mapBusiness(inviter) : null,
      invitee: invitee ? mapBusiness(invitee) : null,
      responderRole: await this.responderRole(ctx, target),
      canRespond:
        target.invitation.status === "pending" &&
        (await this.canRespond(ctx, target)),
    };
  }

  async respond(
    ctx: BusinessContext,
    invitationId: string,
    accept: boolean,
  ) {
    const target = await this.findVisible(ctx, invitationId);
    const invitation = target.invitation;
    if (invitation.status !== "pending") {
      throw new ConflictException(
        `This invitation is already ${invitation.status}.`,
      );
    }
    if (!(await this.canRespond(ctx, target))) {
      throw new ForbiddenException(
        "You are not allowed to respond to this invitation.",
      );
    }

    const memberId = this.memberIdFor(ctx, invitation);
    if (accept && target.group) {
      if (!["Active", "Recruiting"].includes(target.group.status)) {
        throw new ConflictException({
          code: "GROUP_NOT_JOINABLE",
          message: `The group is ${target.group.status.toLowerCase()} and is not accepting members.`,
        });
      }
      const typeConfig = ctx.config.groupTypes.find(
        (entry) => entry.type === target.group!.type,
      );
      if (typeConfig && (!typeConfig.enabled || !typeConfig.allowJoin)) {
        throw new ForbiddenException(
          "Joining is disabled for this group type",
        );
      }
    }

    if (accept && target.group?.pricing === "paid") {
      const periodKey = contributionPeriodKey(
        target.group.contributionFrequency,
      );
      const paid = await this.prisma.payment.findFirst({
        where: {
          purpose: "GROUP_CONTRIBUTION",
          groupId: target.group.id,
          memberId,
          periodKey,
          status: "PAID",
          deletedAt: null,
        },
      });
      if (!paid) {
        throw new ConflictException({
          code: "PAYMENT_REQUIRED",
          message: `This group requires a £${fromMinorPence(target.group.contributionMinor)} contribution.`,
          groupId: target.group.id,
          amountMinor: (target.group.contributionMinor ?? 0).toString(),
          amount: fromMinorPence(target.group.contributionMinor),
          frequency: target.group.contributionFrequency ?? "once",
          periodKey,
        });
      }
    }
    if (accept) {
      if (invitation.kind === "request") {
        if (!target.group) {
          throw new BadRequestException(
            "A join request must target a group.",
          );
        }
        await this.addGroupMember(ctx, target.group, memberId, invitation);
      } else if (target.group) {
        await this.addGroupMember(ctx, target.group, memberId, invitation);
      } else if (target.circle) {
        await this.addCircleMember(ctx, target.circle, memberId, invitation);
      }
      if (target.group) {
        await syncGroupActivationStatus(
          this.prisma,
          target.group.id,
          ctx.config.groupCreationRules,
        );
      }
    }

    const updated = await this.prisma.invitation.update({
      where: { id: invitation.id },
      data: {
        status: accept ? "accepted" : "declined",
        respondedAt: new Date(),
      },
    });

    if (target.group) {
      await this.prisma.groupActivity.create({
        data: {
          groupId: target.group.id,
          actorName: ctx.business.name,
          kind: accept ? "join" : "update",
          message: accept
            ? `${invitation.inviteeName} ${
                invitation.kind === "request"
                  ? "joined after the owner accepted their request"
                  : "accepted the invitation"
              }`
            : `${invitation.inviteeName}'s ${
                invitation.kind === "request" ? "request" : "invitation"
              } was declined`,
        },
      });
    }

    await this.prisma.auditLog.create({
      data: {
        action: accept ? "invitation-approved" : "invitation-declined",
        actorId: ctx.user.id,
        actorName: ctx.business.name,
        targetType: "invitation",
        targetId: invitation.id,
        targetName: invitation.inviteeName,
        detail: `${
          invitation.kind === "request" ? "Join request" : "Invitation"
        } ${accept ? "accepted" : "declined"} from the business dashboard`,
      },
    });

    return {
      invitation: mapInvitationForBusiness(
        updated,
        ctx.business.id,
        ctx.business.email,
      ),
      group: target.group ? mapGroup(target.group) : null,
      circle: target.circle ? mapBusinessCircle(target.circle) : null,
    };
  }

  async cancel(ctx: BusinessContext, invitationId: string) {
    const target = await this.findVisible(ctx, invitationId);
    const invitation = target.invitation;
    if (invitation.status !== "pending") {
      throw new ConflictException(
        `This invitation is already ${invitation.status}.`,
      );
    }
    if (!(await this.canManage(ctx, target))) {
      throw new ForbiddenException(
        "Only the sender or the group owner can cancel this invitation.",
      );
    }

    const updated = await this.prisma.invitation.update({
      where: { id: invitation.id },
      data: { status: "cancelled", respondedAt: new Date() },
    });

    if (target.group) {
      await this.prisma.groupActivity.create({
        data: {
          groupId: target.group.id,
          actorName: ctx.business.name,
          kind: "update",
          message: `${ctx.business.name} cancelled the invitation to ${invitation.inviteeName}`,
        },
      });
    }

    await this.prisma.auditLog.create({
      data: {
        action: "invitation-cancelled",
        actorId: ctx.user.id,
        actorName: ctx.business.name,
        targetType: "invitation",
        targetId: invitation.id,
        targetName: invitation.inviteeName,
        detail: "Invitation cancelled from the business dashboard",
      },
    });

    return {
      invitation: mapInvitationForBusiness(
        updated,
        ctx.business.id,
        ctx.business.email,
      ),
      ok: true,
    };
  }

  async resend(ctx: BusinessContext, invitationId: string) {
    const target = await this.findVisible(ctx, invitationId);
    const invitation = target.invitation;
    if (!(await this.canManage(ctx, target))) {
      throw new ForbiddenException(
        "Only the sender or the group owner can resend this invitation.",
      );
    }
    if (invitation.kind !== "invite") {
      throw new BadRequestException("Only invitations can be resent.");
    }
    if (invitation.status === "accepted") {
      throw new ConflictException("An accepted invitation cannot be resent.");
    }

    const updated = await this.prisma.invitation.update({
      where: { id: invitation.id },
      data: { status: "pending", respondedAt: null, createdAt: new Date() },
    });

    if (target.group) {
      await this.prisma.groupActivity.create({
        data: {
          groupId: target.group.id,
          actorName: ctx.business.name,
          kind: "invite",
          message: `${ctx.business.name} resent the invitation to ${invitation.inviteeName}`,
        },
      });
    }

    return {
      invitation: mapInvitationForBusiness(
        updated,
        ctx.business.id,
        ctx.business.email,
      ),
      resent: true,
    };
  }

  // -------------------------------------------------------------------------
  // Internals
  // -------------------------------------------------------------------------

  private whereFor(
    ctx: BusinessContext,
    query: BusinessInvitationQueryDto,
    ownedGroupIds: string[],
  ): Prisma.InvitationWhereInput {
    const base: Prisma.InvitationWhereInput = {};
    if (query.status) base.status = query.status;
    if (query.groupId) base.groupId = query.groupId;

    const businessId = ctx.business.id;
    const email = ctx.business.email.trim().toLowerCase();

    switch (query.tab ?? "incoming") {
      case "incoming":
        return {
          ...base,
          kind: "invite",
          OR: [
            { inviteeId: businessId },
            ...(email ? [{ inviteeEmail: email }] : []),
          ],
        };
      case "outgoing":
        return {
          ...base,
          kind: "invite",
          invitedById: businessId,
          // Email-only invitations have no inviteeId, and Prisma's NOT/NULL
          // semantics would drop them from the list.
          OR: [{ inviteeId: null }, { inviteeId: { not: businessId } }],
        };
      case "requests":
        return {
          ...base,
          kind: "request",
          OR: [
            { inviteeId: businessId },
            { invitedById: businessId },
          ],
        };
      case "owner-requests":
        return {
          ...base,
          kind: "request",
          groupId: { in: ownedGroupIds },
          NOT: { inviteeId: businessId },
        };
      case "all":
      default:
        return {
          ...base,
          OR: [
            { inviteeId: businessId },
            { invitedById: businessId },
            ...(email ? [{ inviteeEmail: email }] : []),
            { groupId: { in: ownedGroupIds } },
          ],
        };
    }
  }

  private async counts(
    ctx: BusinessContext,
    ownedGroupIds: string[],
    statusWhere: Prisma.InvitationWhereInput,
  ) {
    const businessId = ctx.business.id;
    const email = ctx.business.email.trim().toLowerCase();
    const [incoming, outgoing, requests, ownerRequests, pending] =
      await Promise.all([
        this.prisma.invitation.count({
          where: {
            ...statusWhere,
            kind: "invite",
            OR: [
              { inviteeId: businessId },
              ...(email ? [{ inviteeEmail: email }] : []),
            ],
          },
        }),
        this.prisma.invitation.count({
          where: {
            ...statusWhere,
            kind: "invite",
            invitedById: businessId,
            OR: [{ inviteeId: null }, { inviteeId: { not: businessId } }],
          },
        }),
        this.prisma.invitation.count({
          where: {
            ...statusWhere,
            kind: "request",
            OR: [{ inviteeId: businessId }, { invitedById: businessId }],
          },
        }),
        this.prisma.invitation.count({
          where: {
            kind: "request",
            status: "pending",
            groupId: { in: ownedGroupIds },
            NOT: { inviteeId: businessId },
          },
        }),
        this.prisma.invitation.count({
          where: {
            status: "pending",
            OR: [
              { inviteeId: businessId },
              { invitedById: businessId },
              ...(email ? [{ inviteeEmail: email }] : []),
              { groupId: { in: ownedGroupIds } },
            ],
          },
        }),
      ]);

    return { incoming, outgoing, requests, ownerRequests, pending };
  }

  private async findVisible(
    ctx: BusinessContext,
    invitationId: string,
  ): Promise<InvitationWithTarget> {
    const invitation = await this.prisma.invitation.findUnique({
      where: { id: invitationId },
    });
    if (!invitation) {
      throw new NotFoundException(`Invitation ${invitationId} not found`);
    }

    const group = invitation.groupId
      ? await this.prisma.group.findUnique({ where: { id: invitation.groupId } })
      : null;
    const circle = invitation.circleId
      ? await this.prisma.circle.findUnique({
          where: { id: invitation.circleId },
        })
      : null;

    const isVisible =
      invitation.inviteeId === ctx.business.id ||
      invitation.invitedById === ctx.business.id ||
      this.emailMatches(ctx, invitation) ||
      group?.ownerId === ctx.business.id ||
      circle?.businessId === ctx.business.id;

    if (!isVisible) {
      throw new ForbiddenException("This invitation is not addressed to you.");
    }

    return { invitation, group, circle };
  }

  private async decorateMany(rows: Invitation[], ctx: BusinessContext) {
    const groupIds = [
      ...new Set(rows.map((row) => row.groupId).filter((id): id is string => Boolean(id))),
    ];
    const circleIds = [
      ...new Set(
        rows.map((row) => row.circleId).filter((id): id is string => Boolean(id)),
      ),
    ];
    const [groups, circles] = await Promise.all([
      groupIds.length
        ? this.prisma.group.findMany({
            where: { id: { in: groupIds } },
            select: { id: true, name: true, type: true, ownerId: true },
          })
        : Promise.resolve([]),
      circleIds.length
        ? this.prisma.circle.findMany({
            where: { id: { in: circleIds } },
            select: { id: true, type: true, config: true, businessId: true },
          })
        : Promise.resolve([]),
    ]);

    const groupById = new Map(groups.map((group) => [group.id, group]));
    const circleById = new Map(circles.map((circle) => [circle.id, circle]));
    const circleName = (circle: (typeof circles)[number]) => {
      const config = (circle.config ?? {}) as Record<string, unknown>;
      return typeof config.name === "string" ? config.name : circle.type;
    };

    return rows.map((row) => {
      const group = row.groupId ? groupById.get(row.groupId) : undefined;
      const circle = row.circleId ? circleById.get(row.circleId) : undefined;
      return {
        ...mapInvitationForBusiness(row, ctx.business.id, ctx.business.email),
        groupName: group?.name,
        groupType: group?.type,
        circleName: circle ? circleName(circle) : undefined,
        circleType: circle?.type,
      };
    });
  }

  private async canRespond(
    ctx: BusinessContext,
    target: InvitationWithTarget,
  ) {
    const invitation = target.invitation;
    if (invitation.kind === "request") {
      return target.group?.ownerId === ctx.business.id;
    }
    return (
      invitation.inviteeId === ctx.business.id ||
      (!invitation.inviteeId && this.emailMatches(ctx, invitation))
    );
  }

  private async canManage(
    ctx: BusinessContext,
    target: InvitationWithTarget,
  ) {
    return (
      target.invitation.invitedById === ctx.business.id ||
      target.group?.ownerId === ctx.business.id ||
      target.circle?.businessId === ctx.business.id
    );
  }

  private async responderRole(
    ctx: BusinessContext,
    target: InvitationWithTarget,
  ) {
    if (target.invitation.kind === "request") {
      return target.group?.ownerId === ctx.business.id ? "owner" : "none";
    }
    if (
      target.invitation.inviteeId === ctx.business.id ||
      this.emailMatches(ctx, target.invitation)
    ) {
      return "invitee";
    }
    return target.group?.ownerId === ctx.business.id ? "owner" : "none";
  }

  private emailMatches(ctx: BusinessContext, invitation: Invitation) {
    const email = ctx.business.email.trim().toLowerCase();
    return Boolean(
      email &&
        invitation.inviteeEmail &&
        invitation.inviteeEmail.trim().toLowerCase() === email,
    );
  }

  private memberIdFor(ctx: BusinessContext, invitation: Invitation) {
    return invitation.inviteeId ?? ctx.business.id;
  }

  private async addGroupMember(
    ctx: BusinessContext,
    group: Group,
    memberId: string,
    invitation: Invitation,
  ) {
    const existing = await this.prisma.groupMember.findUnique({
      where: { groupId_memberId: { groupId: group.id, memberId } },
    });
    if (existing) return existing;

    const business = await this.prisma.business.findUnique({
      where: { id: memberId },
    });
    const member = await this.prisma.$transaction(async (tx) => {
      const created = await tx.groupMember.create({
        data: {
          groupId: group.id,
          memberId,
          fullName:
            business?.contactName ?? invitation.inviteeName ?? "Member",
          businessName: business?.name ?? invitation.inviteeName,
          category: business?.category ?? null,
          location: business?.city ?? null,
          status: "active",
          role: "peripheral",
          tier: business?.tier ?? "Bronze",
        },
      });
      const memberCount = await tx.groupMember.count({
        where: { groupId: group.id },
      });
      await tx.group.update({
        where: { id: group.id },
        data: { memberCount },
      });
      return created;
    });

    await this.prisma.auditLog.create({
      data: {
        action: "member-added",
        actorId: ctx.user.id,
        actorName: ctx.business.name,
        targetType: "member",
        targetId: memberId,
        targetName: member.fullName,
        detail: `Added to group ${group.name} after invitation acceptance`,
      },
    });

    return member;
  }

  private async addCircleMember(
    ctx: BusinessContext,
    circle: Circle,
    memberId: string,
    invitation: Invitation,
  ) {
    if (circle.memberIds.includes(memberId)) return;
    const typeConfig = ctx.config.circleTypes.find(
      (entry) => entry.type === circle.type,
    );
    if (
      typeConfig?.maxMembers !== null &&
      typeConfig?.maxMembers !== undefined &&
      circle.memberIds.length >= typeConfig.maxMembers
    ) {
      throw new ConflictException(
        `This circle is full (${typeConfig.maxMembers} members).`,
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.circle.update({
        where: { id: circle.id },
        data: { memberIds: { push: memberId } },
      });
      await tx.circleActivity.create({
        data: {
          circleId: circle.id,
          memberId,
          kind: "join",
          message: `${invitation.inviteeName} joined the circle`,
        },
      });
    });
  }

  private async ownedGroupIds(businessId: string) {
    const groups = await this.prisma.group.findMany({
      where: { ownerId: businessId },
      select: { id: true },
    });
    return groups.map((group) => group.id);
  }
}
