import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import type { SessionUser } from "../auth/auth.types.js";
import { PrismaService } from "../prisma/prisma.service.js";
import {
  CentralChatClient,
  type CentralConversation,
  type CentralMessage,
  type CentralUserSummary,
} from "./central-chat.client.js";

export interface ChatParticipantView {
  centralUserId: string;
  displayName: string;
  email: string | null;
  role: string | null;
  roleTitle: string | null;
  isOnline: boolean;
  isOwner: boolean;
  isViewer: boolean;
}

export interface ChatConversationView {
  id: string;
  type: string;
  title: string | null;
  avatarUrl: string | null;
  participants: ChatParticipantView[];
  lastMessageContent: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
  isMuted: boolean;
  isOnline: boolean;
  /** Central Hub id of the signed-in user, so the client can flag its own messages. */
  viewerCentralId: string;
  /** The viewer's group role: OWNER/ADMIN or MEMBER. */
  role: string | null;
  /** True when the signed-in user created the group. */
  isOwner: boolean;
  /** True when only group admins may post. */
  isAdminOnly: boolean;
  participantsCount: number;
}

export interface ChatMessageView {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderRole: string | null;
  senderAvatar: string | null;
  content: string;
  type: string;
  createdAt: string;
  isSender: boolean;
  readCount: number;
  clientTempId?: string;
}

/**
 * Central Hub chat, seen through this app.
 *
 * Every conversation, message and read receipt lives on Central Hub, so the
 * same person can be chatted with from any app in the ecosystem. This service
 * only resolves the two things the app owns — who the signed-in user is and
 * which Central Hub user a circle member maps to — and then defers to the
 * Central Hub chat API.
 */
@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly central: CentralChatClient,
  ) {}

  /** Chat is unavailable when the bridge is switched off or not configured. */
  get enabled(): boolean {
    return this.central.enabled;
  }

  /** Chat can be switched off without a redeploy. */
  private assertEnabled(): void {
    if (!this.enabled) {
      throw new ForbiddenException("Messaging is currently switched off.");
    }
  }

  // ── Credentials ────────────────────────────────────────────────────────────

  /**
   * The signed-in user's Central Hub identity. A user who never signed in
   * over SSO has no Central Hub id and therefore no chat identity.
   */
  private async centralUserId(session: SessionUser): Promise<string> {
    const identity = await this.identity(session);
    if (!identity.centralUserId) {
      throw new ForbiddenException(
        "Your Central Hub account is not connected, so messaging is unavailable.",
      );
    }
    return identity.centralUserId;
  }

  /**
   * The Central Hub id and the business id of the signed-in user.
   *
   * The business id scopes every lookup: a member can only be messaged when
   * it sits in one of the signed-in business' own circles.
   */
  private async identity(
    session: SessionUser,
  ): Promise<{ centralUserId: string | null; businessId: string | null }> {
    const user = await this.prisma.user.findUnique({
      where: { id: session.id },
      select: { mcomUserId: true, businessId: true },
    });

    return {
      centralUserId: user?.mcomUserId ?? null,
      businessId: user?.businessId ?? null,
    };
  }

  /** Short-lived socket credentials for the browser. */
  async getSocketSession(session: SessionUser) {
    this.assertEnabled();
    await this.centralUserId(session);
    return this.central.getSocketSession(session.id);
  }

  // ── Conversations ──────────────────────────────────────────────────────────

  async listConversations(session: SessionUser): Promise<ChatConversationView[]> {
    this.assertEnabled();
    const viewerCentralId = await this.centralUserId(session);
    const conversations = await this.central.listConversations(session.id);
    return conversations.map((conversation) =>
      this.mapConversation(conversation, viewerCentralId),
    );
  }

  /**
   * Opens (or reuses) the canonical one-to-one conversation with a circle
   * member.
   *
   * The member is a contact of the signed-in business. Their Central Hub user
   * id is what makes the conversation possible, so it is resolved here and
   * then cached on the contact row.
   */
  async openDirectConversation(
    session: SessionUser,
    memberId: string,
  ): Promise<ChatConversationView> {
    this.assertEnabled();
    const viewerCentralId = await this.centralUserId(session);
    const targetUserId = await this.resolveMemberCentralId(session, memberId);

    const conversation = await this.central.getOrCreateDirectConversation(
      session.id,
      targetUserId,
    );

    return this.mapConversation(conversation, viewerCentralId);
  }

  async getMessages(
    session: SessionUser,
    conversationId: string,
    cursor?: string,
    limit = 50,
  ): Promise<ChatMessageView[]> {
    this.assertEnabled();
    const viewerCentralId = await this.centralUserId(session);
    const messages = await this.central.getMessages(
      session.id,
      conversationId,
      cursor,
      limit,
    );
    return messages.map((message) => this.mapMessage(message, viewerCentralId));
  }

  async sendMessage(
    session: SessionUser,
    conversationId: string,
    content: string,
    idempotencyKey?: string,
  ): Promise<ChatMessageView> {
    this.assertEnabled();
    const viewerCentralId = await this.centralUserId(session);
    const message = await this.central.sendMessage(
      session.id,
      conversationId,
      content,
      idempotencyKey,
    );
    return this.mapMessage(message, viewerCentralId);
  }

  async markRead(
    session: SessionUser,
    conversationId: string,
    messageIds?: string[],
  ): Promise<unknown> {
    this.assertEnabled();
    await this.centralUserId(session);
    return this.central.markRead(session.id, conversationId, messageIds);
  }

  /** The Central Hub people directory, so a business can find anybody. */
  async searchDirectory(
    session: SessionUser,
    query: string,
  ): Promise<CentralUserSummary[]> {
    this.assertEnabled();
    await this.centralUserId(session);
    return this.central.searchUsers(session.id, query.trim());
  }

  /**
   * Opens the group conversation of a circle.
   *
   * The business that owns the circle creates the group, so it is the group
   * owner and admin; the circle members join as group members. Only members
   * who are real Central Hub users can take part — somebody who was merely
   * added to a list has no account to talk with yet.
   *
   * The conversation id is remembered on the circle, so the group chat is
   * opened again instead of a second group being created.
   */
  async openGroupConversation(
    session: SessionUser,
    circleId: string,
    title?: string,
  ): Promise<ChatConversationView> {
    this.assertEnabled();
    const viewerCentralId = await this.centralUserId(session);
    const { businessId } = await this.identity(session);
    if (!businessId) {
      throw new ForbiddenException(
        "Only a business account can start a circle group chat.",
      );
    }

    if (!circleId) {
      throw new BadRequestException("Provide a circleId or groupId.");
    }
    const circle = await this.prisma.circle.findFirst({
      where: { id: circleId, businessId },
      select: { id: true, config: true, memberIds: true, chatConversationId: true },
    });
    if (!circle) {
      throw new NotFoundException("That circle could not be found.");
    }

    // The group already exists — open it instead of creating a second one.
    if (circle.chatConversationId) {
      try {
        const existing = await this.central.getConversation(
          session.id,
          circle.chatConversationId,
        );
        return this.mapConversation(existing, viewerCentralId);
      } catch (error) {
        this.logger.warn(
          `The stored group conversation for circle ${circleId} is unusable: ${
            error instanceof Error ? error.message : "unknown error"
          }. Creating a new one.`,
        );
      }
    }

    const resolved = await this.resolveCircleMembers(session, circle.memberIds);
    if (resolved.length === 0) {
      throw new BadRequestException(
        "None of the members of this circle has a Central Hub account yet, so there is nobody to chat with.",
      );
    }

    const created = await this.central.createGroupConversation(session.id, {
      title: title?.trim() || this.circleTitle(circle.config),
      participantIds: resolved.map((entry) => entry.centralUserId),
    });

    await this.prisma.circle.update({
      where: { id: circle.id },
      data: { chatConversationId: created.id },
    });

    return this.mapConversation(created, viewerCentralId);
  }

  /**
   * Opens (or creates) the shared group conversation of a Group.
   *
   * Resolves all Group members (and linked Circle members) that have a Central
   * Hub account so members can communicate together in one Group Chat.
   */
  async openGroupEntityConversation(
    session: SessionUser,
    groupId: string,
    title?: string,
  ): Promise<ChatConversationView> {
    this.assertEnabled();
    const viewerCentralId = await this.centralUserId(session);
    const { businessId } = await this.identity(session);
    if (!businessId) {
      throw new ForbiddenException(
        "Only a business account can start a group chat.",
      );
    }

    const group = await this.prisma.group.findFirst({
      where: {
        id: groupId,
        OR: [
          { ownerId: businessId },
          { members: { some: { memberId: businessId } } },
        ],
      },
      include: {
        members: { select: { memberId: true } },
        linkedCircles: {
          include: { circle: { select: { memberIds: true } } },
        },
      },
    });
    if (!group) {
      throw new NotFoundException("That group could not be found.");
    }

    if (group.chatConversationId) {
      try {
        const existing = await this.central.getConversation(
          session.id,
          group.chatConversationId,
        );
        return this.mapConversation(existing, viewerCentralId);
      } catch (error) {
        this.logger.warn(
          `The stored group conversation for group ${groupId} is unusable: ${
            error instanceof Error ? error.message : "unknown error"
          }. Creating a new one.`,
        );
      }
    }

    const candidateIds = new Set<string>(
      group.members.map((member) => member.memberId),
    );
    for (const link of group.linkedCircles) {
      for (const memberId of link.circle.memberIds) {
        candidateIds.add(memberId);
      }
    }
    candidateIds.delete(businessId);

    const resolved = await this.resolveCircleMembers(session, [...candidateIds]);
    if (resolved.length === 0) {
      throw new BadRequestException(
        "None of the members of this group has a Central Hub account yet, so there is nobody to chat with.",
      );
    }

    const created = await this.central.createGroupConversation(session.id, {
      title: title?.trim() || group.name,
      participantIds: resolved.map((entry) => entry.centralUserId),
    });

    await this.prisma.group.update({
      where: { id: group.id },
      data: { chatConversationId: created.id },
    });

    return this.mapConversation(created, viewerCentralId);
  }

  /** Adds a circle member to the group conversation of the circle. */
  async addGroupParticipant(
    session: SessionUser,
    conversationId: string,
    memberId: string,
  ): Promise<ChatConversationView> {
    this.assertEnabled();
    const viewerCentralId = await this.centralUserId(session);
    const targetUserId = await this.resolveMemberCentralId(session, memberId);
    const conversation = await this.central.addParticipant(
      session.id,
      conversationId,
      targetUserId,
    );
    return this.mapConversation(conversation, viewerCentralId);
  }

  /** Removes a circle member from the group conversation of the circle. */
  async removeGroupParticipant(
    session: SessionUser,
    conversationId: string,
    memberId: string,
  ): Promise<ChatConversationView> {
    this.assertEnabled();
    const viewerCentralId = await this.centralUserId(session);
    const targetUserId = await this.resolveMemberCentralId(session, memberId);
    const conversation = await this.central.removeParticipant(
      session.id,
      conversationId,
      targetUserId,
    );
    return this.mapConversation(conversation, viewerCentralId);
  }

  /** Group settings — admins only. */
  async updateGroupSettings(
    session: SessionUser,
    conversationId: string,
    settings: {
      title?: string;
      avatarUrl?: string;
      isAdminOnly?: boolean;
    },
  ): Promise<ChatConversationView> {
    this.assertEnabled();
    const viewerCentralId = await this.centralUserId(session);
    const conversation = await this.central.updateGroupSettings(
      session.id,
      conversationId,
      settings,
    );
    return this.mapConversation(conversation, viewerCentralId);
  }

  /** Promotes a member to group admin, or demotes an admin back to member. */
  async setParticipantRole(
    session: SessionUser,
    conversationId: string,
    memberId: string,
    role: "ADMIN" | "MEMBER",
  ): Promise<ChatConversationView> {
    this.assertEnabled();
    const viewerCentralId = await this.centralUserId(session);
    const targetUserId = await this.resolveMemberCentralId(session, memberId);
    const conversation = await this.central.setParticipantRole(
      session.id,
      conversationId,
      targetUserId,
      role,
    );
    return this.mapConversation(conversation, viewerCentralId);
  }

  /** Hands the group over to another participant. */
  async transferOwnership(
    session: SessionUser,
    conversationId: string,
    memberId: string,
  ): Promise<ChatConversationView> {
    this.assertEnabled();
    const viewerCentralId = await this.centralUserId(session);
    const targetUserId = await this.resolveMemberCentralId(session, memberId);
    const conversation = await this.central.transferOwnership(
      session.id,
      conversationId,
      targetUserId,
    );
    return this.mapConversation(conversation, viewerCentralId);
  }

  /**
   * Resolves the circle members that are real Central Hub users.
   *
   * A member who was only added to a list has no account to talk with yet, so
   * they are skipped instead of breaking the whole group. The lookups are
   * batched so a large circle does not turn into a query per member.
   */
  private async resolveCircleMembers(
    session: SessionUser,
    memberIds: string[],
  ): Promise<Array<{ memberId: string; centralUserId: string }>> {
    if (memberIds.length === 0) return [];

    const [contacts, businesses, accounts] = await Promise.all([
      this.prisma.networkContact.findMany({
        where: { id: { in: memberIds } },
        select: { id: true, email: true, mcomUserId: true },
      }),
      this.prisma.business.findMany({
        where: { id: { in: memberIds } },
        select: { id: true, email: true, mcomUserId: true },
      }),
      this.prisma.user.findMany({
        where: { id: { in: memberIds } },
        select: { id: true, email: true, mcomUserId: true },
      }),
    ]);

    const known = new Map<string, string>();
    const emails = new Map<string, string>();
    for (const entry of [...contacts, ...businesses, ...accounts]) {
      if (entry.mcomUserId) {
        known.set(entry.id, entry.mcomUserId);
        continue;
      }
      const email = entry.email?.trim().toLowerCase();
      if (email && !emails.has(entry.id)) emails.set(entry.id, email);
    }

    // Contacts who signed up here already have their Central Hub id on the
    // account row, so one query resolves the rest.
    const missingEmails = [...new Set(emails.values())];
    if (missingEmails.length) {
      const localAccounts = await this.prisma.user.findMany({
        where: { email: { in: missingEmails } },
        select: { email: true, mcomUserId: true },
      });
      const byEmail = new Map(
        localAccounts
          .filter((account) => account.mcomUserId)
          .map((account) => [account.email.toLowerCase(), account.mcomUserId as string]),
      );
      for (const [memberId, email] of emails) {
        const centralUserId = byEmail.get(email);
        if (centralUserId) known.set(memberId, centralUserId);
      }
    }

    // Whoever is left may still have an account on Central Hub that we do
    // not know about yet — the directory is the last resort.
    for (const [memberId, email] of emails) {
      if (known.has(memberId)) continue;
      try {
        const centralUserId = await this.resolveCentralUserIdByEmail(
          session,
          email,
        );
        if (centralUserId) known.set(memberId, centralUserId);
      } catch (error) {
        this.logger.log(
          `Circle member ${memberId} cannot join the group chat: ${
            error instanceof Error ? error.message : "unknown error"
          }`,
        );
      }
    }

    return memberIds
      .filter((memberId) => known.has(memberId))
      .map((memberId) => ({ memberId, centralUserId: known.get(memberId)! }));
  }

  /** The circle name, used as the default group title. */
  private circleTitle(config: unknown): string {
    const record = (config ?? {}) as Record<string, unknown>;
    const name = String(record.name ?? "").trim();
    return name || "Circle group chat";
  }

  // ── Member resolution ──────────────────────────────────────────────────────

  /**
   * The Central Hub user id behind a circle member.
   *
   * A circle member is either a contact of the signed-in business or another
   * business in the network. Both are resolved to the same canonical Central
   * Hub id, which is what makes a conversation enforceable on Central Hub.
   */
  private async resolveMemberCentralId(
    session: SessionUser,
    memberId: string,
  ): Promise<string> {
    const { businessId } = await this.identity(session);
    if (!businessId) {
      throw new ForbiddenException(
        "Only a business account can message its circle members.",
      );
    }

    // The member has to sit in one of this business' circles or groups.
    const [circle, groupMember] = await Promise.all([
      this.prisma.circle.findFirst({
        where: { businessId, memberIds: { has: memberId } },
        select: { id: true },
      }),
      this.prisma.groupMember.findFirst({
        where: {
          memberId,
          group: {
            OR: [
              { ownerId: businessId },
              { members: { some: { memberId: businessId } } },
            ],
          },
        },
        select: { id: true },
      }),
    ]);
    if (!circle && !groupMember) {
      throw new ForbiddenException(
        "That member is not part of your circles or groups, so they cannot be messaged.",
      );
    }

    const contact = await this.prisma.networkContact.findFirst({
      where: { id: memberId, businessId },
      select: { id: true, email: true, mcomUserId: true },
    });
    const business = contact
      ? null
      : await this.prisma.business.findUnique({
          where: { id: memberId },
          select: { id: true, email: true, mcomUserId: true },
        });
    // A circle member can also be a platform account that joined directly.
    const member =
      contact || business
        ? null
        : await this.prisma.user.findUnique({
            where: { id: memberId },
            select: { id: true, email: true, mcomUserId: true },
          });

    if (!contact && !business && !member) {
      throw new NotFoundException(
        "That member is not part of your network, so they cannot be messaged.",
      );
    }

    const known =
      contact?.mcomUserId ??
      business?.mcomUserId ??
      member?.mcomUserId ??
      null;
    if (known) return known;

    const email = contact?.email ?? business?.email ?? member?.email ?? null;
    if (!email) {
      throw new BadRequestException(
        "This member has no email address, so they cannot be messaged yet.",
      );
    }

    const centralUserId = await this.resolveCentralUserIdByEmail(session, email);
    if (!centralUserId) {
      throw new NotFoundException(
        "This member has not created a Central Hub account yet, so messaging is not available.",
      );
    }

    if (contact) {
      await this.prisma.networkContact.update({
        where: { id: contact.id },
        data: { mcomUserId: centralUserId },
      });
    }

    return centralUserId;
  }

  /**
   * Looks a Central Hub user up by email.
   *
   * The local account is checked first because it is free; the Central Hub
   * directory is the fallback for people who have an account there but have
   * never signed into this app.
   */
  private async resolveCentralUserIdByEmail(
    session: SessionUser,
    email: string,
  ): Promise<string | null> {
    const normalized = email.trim().toLowerCase();
    if (!normalized) return null;

    const local = await this.prisma.user.findUnique({
      where: { email: normalized },
      select: { mcomUserId: true },
    });
    if (local?.mcomUserId) return local.mcomUserId;

    try {
      const matches = await this.central.searchUsers(session.id, normalized);
      const exact = matches.find(
        (match) => match.email?.trim().toLowerCase() === normalized,
      );
      return exact?.id ?? null;
    } catch (error) {
      // A failed lookup is not the same as "no account": the member may well
      // have one, so the caller must not claim otherwise.
      this.logger.warn(
        `Central Hub directory lookup failed for ${normalized}: ${
          error instanceof Error ? error.message : "unknown error"
        }`,
      );
      throw new ServiceUnavailableException(
        "The Central Hub people directory is temporarily unavailable.",
      );
    }
  }

  // ── Mapping ────────────────────────────────────────────────────────────────

  private mapConversation(
    conversation: CentralConversation,
    viewerCentralId: string,
  ): ChatConversationView {
    const participants = (conversation.participants ?? []).map(
      (participant) => ({
        centralUserId: participant.userId,
        displayName:
          participant.displayName ?? participant.email ?? "Member",
        email: participant.email ?? null,
        role: participant.role ?? null,
        roleTitle: participant.roleTitle ?? null,
        isOnline: Boolean(participant.isOnline),
        isOwner: Boolean(participant.isOwner),
        isViewer: participant.userId === viewerCentralId,
      }),
    );

    const other = participants.find((participant) => !participant.isViewer);

    return {
      id: conversation.id,
      type: conversation.type,
      title: conversation.title ?? other?.displayName ?? null,
      avatarUrl: conversation.avatarUrl ?? null,
      participants,
      lastMessageContent: conversation.lastMessageText ?? null,
      lastMessageAt: conversation.lastMessageAt ?? null,
      unreadCount: conversation.unreadCount ?? 0,
      isMuted: Boolean(conversation.isMuted),
      isOnline: Boolean(conversation.isOnline),
      viewerCentralId,
      role: conversation.role ?? null,
      isOwner: Boolean(conversation.isOwner),
      isAdminOnly: Boolean(conversation.isAdminOnly),
      participantsCount:
        conversation.participantsCount ?? participants.length,
    };
  }

  private mapMessage(
    message: CentralMessage,
    viewerCentralId: string,
  ): ChatMessageView {
    return {
      id: message.id,
      conversationId: message.conversationId,
      senderId: message.senderId,
      senderName: message.senderName ?? "Member",
      senderRole: message.senderRole ?? null,
      senderAvatar: message.senderAvatar ?? null,
      content: message.content,
      type: message.type ?? "TEXT",
      createdAt: message.createdAt,
      isSender: message.senderId === viewerCentralId,
      readCount: message.readCount ?? 0,
    };
  }
}
