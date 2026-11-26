import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { CentralSessionService } from "../auth/central-session.service.js";

export interface CentralChatSession {
  accessToken: string;
  expiresIn: number;
  socketToken: string;
  socketExpiresIn: number;
  userId: string;
}

export interface ChatSocketSession {
  socketUrl: string;
  socketToken: string;
  expiresIn: number;
  transport: "websocket";
}

export interface CentralParticipant {
  userId: string;
  role?: string;
  isOwner?: boolean;
  displayName?: string;
  email?: string;
  roleTitle?: string;
  isOnline?: boolean;
  lastReadAt?: string | null;
}

export interface CentralConversation {
  id: string;
  type: string;
  title?: string | null;
  avatarUrl?: string | null;
  /** The viewer's own group role: OWNER/ADMIN or MEMBER. */
  role?: string | null;
  /** True when the viewer created the group. */
  isOwner?: boolean;
  /** True when only admins may post in this group. */
  isAdminOnly?: boolean;
  participantsCount?: number;
  createdAt?: string;
  lastMessageAt?: string | null;
  lastMessageText?: string | null;
  lastMessageSenderId?: string | null;
  unreadCount?: number;
  isMuted?: boolean;
  isOnline?: boolean;
  participants?: CentralParticipant[];
}

export interface CentralMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderName?: string;
  senderRole?: string;
  senderAvatar?: string | null;
  content: string;
  type?: string;
  metadata?: unknown;
  idempotencyKey?: string | null;
  createdAt: string;
  isSender?: boolean;
  readCount?: number;
  isReadByMe?: boolean;
}

export interface CentralUserSummary {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  role?: string;
  businessName?: string | null;
  isOnline?: boolean;
}

/**
 * Server-to-server client for the Central Hub chat backbone.
 *
 * Central Hub owns every conversation, message, block and read receipt. This
 * app never stores a message: it mints scoped chat credentials for the
 * signed-in user, proxies the REST calls and hands the browser a single-use,
 * 90-second socket token for the `/chat` namespace.
 */
@Injectable()
export class CentralChatClient {
  private readonly logger = new Logger(CentralChatClient.name);
  private readonly sessionCache = new Map<
    string,
    { accessToken: string; expiresAt: number }
  >();

  constructor(
    private readonly config: ConfigService,
    private readonly centralSession: CentralSessionService,
  ) {}

  // ── Configuration ──────────────────────────────────────────────────────────

  private get baseUrl(): string {
    return this.config
      .get<string>("MCOM_SOLUTIONS_URL", "http://localhost:3010")
      .replace(/\/+$/, "");
  }

  private get clientId(): string {
    return this.config.get<string>("MCOM_CLIENT_ID", "");
  }

  private get clientSecret(): string {
    return this.config.get<string>("MCOM_CLIENT_SECRET", "");
  }

  /** Chat can be switched off without a redeploy. */
  get enabled(): boolean {
    if (
      this.config.get<string>("MCOM_CHAT_ENABLED", "true").toLowerCase() ===
      "false"
    ) {
      return false;
    }
    return Boolean(this.baseUrl && this.clientId && this.clientSecret);
  }

  private get basicAuth(): string {
    return `Basic ${Buffer.from(`${this.clientId}:${this.clientSecret}`).toString(
      "base64",
    )}`;
  }

  /** The Socket.IO namespace Central Hub exposes — no `/api/v1` suffix. */
  get socketUrl(): string {
    const configured = this.config
      .get<string>("MCOM_CENTRAL_SOCKET_URL", "")
      .trim();
    if (configured) return configured.replace(/\/+$/, "");
    return `${this.baseUrl}/chat`;
  }

  // ── Credentials ────────────────────────────────────────────────────────────

  /**
   * Exchanges the user's Central Hub SSO token for scoped chat credentials.
   *
   * Central Hub verifies the SSO token and confirms a live SSO session exists
   * for this user on this app, so a registered app can never mint chat
   * credentials for somebody who never signed into it.
   */
  private async mintSession(userId: string): Promise<CentralChatSession> {
    const subjectToken = await this.centralSession.getValidAccessToken(userId);

    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}/api/v1/chat/session`, {
        method: "POST",
        headers: {
          Authorization: this.basicAuth,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ subject_token: subjectToken }),
        signal: AbortSignal.timeout(10000),
      });
    } catch (error) {
      const reason = error instanceof Error ? error.message : "unknown error";
      this.logger.warn(`Central Hub chat session request failed: ${reason}`);
      throw new ServiceUnavailableException(
        "Central Hub messaging is unavailable right now.",
      );
    }

    const text = await response.text();
    const data = text ? (JSON.parse(text) as Record<string, unknown>) : {};

    if (!response.ok) {
      const message =
        (data.message as string | undefined) ??
        `Central Hub rejected the chat session request (${response.status}).`;
      this.logger.warn(
        `Chat session mint failed for user ${userId} (${response.status}): ${message}`,
      );
      throw this.mapError(response.status, message);
    }

    const accessToken = data.accessToken as string | undefined;
    const socketToken = data.socketToken as string | undefined;
    if (!accessToken || !socketToken) {
      throw new ServiceUnavailableException(
        "Central Hub returned an incomplete chat session.",
      );
    }

    return {
      accessToken,
      expiresIn: Number(data.expiresIn ?? 900),
      socketToken,
      socketExpiresIn: Number(data.socketExpiresIn ?? 90),
      userId: (data.userId as string | undefined) ?? userId,
    };
  }

  private async ensureAccessToken(userId: string): Promise<string> {
    const cached = this.sessionCache.get(userId);
    if (cached && cached.expiresAt > Date.now() + 30_000) {
      return cached.accessToken;
    }

    const session = await this.mintSession(userId);
    this.cacheSession(
      userId,
      session.accessToken,
      Date.now() + Math.max(60, session.expiresIn - 60) * 1000,
    );
    return session.accessToken;
  }

  private cacheSession(
    userId: string,
    accessToken: string,
    expiresAt: number,
  ): void {
    if (this.sessionCache.size > 5000) {
      const oldest = this.sessionCache.keys().next().value;
      if (oldest) this.sessionCache.delete(oldest);
    }
    this.sessionCache.set(userId, { accessToken, expiresAt });
  }

  /**
   * Short-lived, single-use socket credentials for the browser.
   *
   * Reuses the cached chat access token and calls the lightweight
   * `/chat/socket-token` endpoint, so browser reconnects never re-run the
   * client-credential check on Central Hub.
   */
  async getSocketSession(userId: string): Promise<ChatSocketSession> {
    let token = await this.ensureAccessToken(userId);

    let response = await this.postSocketToken(token);
    if (response.status === 401) {
      // The cached access token expired between calls — mint a fresh session.
      this.sessionCache.delete(userId);
      token = await this.ensureAccessToken(userId);
      response = await this.postSocketToken(token);
    }

    if (!response.ok) {
      const message = await readMessage(response);
      this.logger.warn(
        `Socket token mint failed for user ${userId}: ${message}`,
      );
      throw this.mapError(response.status, message);
    }

    const data = (await response.json()) as {
      socketToken?: string;
      expiresIn?: number;
    };

    if (!data.socketToken) {
      throw new ServiceUnavailableException(
        "Central Hub returned an incomplete socket session.",
      );
    }

    return {
      socketUrl: this.socketUrl,
      socketToken: data.socketToken,
      expiresIn: Number(data.expiresIn ?? 90),
      transport: "websocket",
    };
  }

  private async postSocketToken(accessToken: string): Promise<Response> {
    try {
      return await fetch(`${this.baseUrl}/api/v1/chat/socket-token`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({}),
        signal: AbortSignal.timeout(10000),
      });
    } catch (error) {
      const reason = error instanceof Error ? error.message : "unknown error";
      this.logger.warn(`Central Hub socket-token request failed: ${reason}`);
      throw new ServiceUnavailableException(
        "Central Hub messaging is unavailable right now.",
      );
    }
  }

  // ── REST proxy ─────────────────────────────────────────────────────────────

  private async request<T>(
    userId: string,
    method: "GET" | "POST" | "PATCH" | "DELETE",
    path: string,
    body?: unknown,
    allowRetry = true,
  ): Promise<T> {
    const token = await this.ensureAccessToken(userId);

    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}/api/v1${path}`, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
          ...(body === undefined
            ? {}
            : { "Content-Type": "application/json" }),
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        signal: AbortSignal.timeout(12000),
      });
    } catch (error) {
      const reason = error instanceof Error ? error.message : "unknown error";
      this.logger.warn(
        `Central chat request failed [${method} ${path}] for ${userId}: ${reason}`,
      );
      throw new ServiceUnavailableException(
        "Central Hub messaging is unavailable right now.",
      );
    }

    if (response.status === 401 && allowRetry) {
      this.sessionCache.delete(userId);
      return this.request<T>(userId, method, path, body, false);
    }

    if (!response.ok) {
      const message = await readMessage(response);
      this.logger.warn(
        `Central chat request failed [${method} ${path}] for ${userId}: ${message}`,
      );
      throw this.mapError(response.status, message);
    }

    const text = await response.text();
    return (text ? JSON.parse(text) : null) as T;
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  listConversations(userId: string): Promise<CentralConversation[]> {
    return this.request<CentralConversation[]>(
      userId,
      "GET",
      "/chat/conversations",
    );
  }

  getOrCreateDirectConversation(
    userId: string,
    targetUserId: string,
  ): Promise<CentralConversation> {
    return this.request<CentralConversation>(
      userId,
      "POST",
      "/chat/conversations/direct",
      { targetUserId },
    );
  }

  /**
   * Creates a group conversation.
   *
   * The creator becomes the owner and an ADMIN; everybody else joins as a
   * MEMBER. Central Hub enforces that split on every send.
   */
  createGroupConversation(
    userId: string,
    input: { title: string; participantIds: string[]; avatarUrl?: string },
  ): Promise<CentralConversation> {
    return this.request<CentralConversation>(
      userId,
      "POST",
      "/chat/conversations/group",
      input,
    );
  }

  getConversation(
    userId: string,
    conversationId: string,
  ): Promise<CentralConversation> {
    return this.request<CentralConversation>(
      userId,
      "GET",
      `/chat/conversations/${encodeURIComponent(conversationId)}`,
    );
  }

  /** Group settings — title, photo and the admin-only (read-only) mode. */
  updateGroupSettings(
    userId: string,
    conversationId: string,
    settings: {
      title?: string;
      avatarUrl?: string;
      isAdminOnly?: boolean;
    },
  ): Promise<CentralConversation> {
    return this.request<CentralConversation>(
      userId,
      "PATCH",
      `/chat/conversations/${encodeURIComponent(conversationId)}`,
      settings,
    );
  }

  /** Promotes a member to group admin, or demotes an admin back to member. */
  setParticipantRole(
    userId: string,
    conversationId: string,
    targetUserId: string,
    role: "ADMIN" | "MEMBER",
  ): Promise<CentralConversation> {
    return this.request<CentralConversation>(
      userId,
      "PATCH",
      `/chat/conversations/${encodeURIComponent(conversationId)}/participants/${encodeURIComponent(targetUserId)}`,
      { role },
    );
  }

  /** Hands the group over to another participant. */
  transferOwnership(
    userId: string,
    conversationId: string,
    targetUserId: string,
  ): Promise<CentralConversation> {
    return this.request<CentralConversation>(
      userId,
      "POST",
      `/chat/conversations/${encodeURIComponent(conversationId)}/transfer-ownership`,
      { userId: targetUserId },
    );
  }

  addParticipant(
    userId: string,
    conversationId: string,
    targetUserId: string,
  ): Promise<CentralConversation> {
    return this.request<CentralConversation>(
      userId,
      "POST",
      `/chat/conversations/${encodeURIComponent(conversationId)}/participants`,
      { userId: targetUserId },
    );
  }

  removeParticipant(
    userId: string,
    conversationId: string,
    targetUserId: string,
  ): Promise<CentralConversation> {
    return this.request<CentralConversation>(
      userId,
      "DELETE",
      `/chat/conversations/${encodeURIComponent(conversationId)}/participants/${encodeURIComponent(targetUserId)}`,
    );
  }

  getMessages(
    userId: string,
    conversationId: string,
    cursor?: string,
    limit = 50,
  ): Promise<CentralMessage[]> {
    const query = new URLSearchParams();
    if (cursor) query.set("cursor", cursor);
    query.set("limit", String(limit));
    return this.request<CentralMessage[]>(
      userId,
      "GET",
      `/chat/conversations/${encodeURIComponent(conversationId)}/messages?${query.toString()}`,
    );
  }

  sendMessage(
    userId: string,
    conversationId: string,
    content: string,
    idempotencyKey?: string,
  ): Promise<CentralMessage> {
    return this.request<CentralMessage>(
      userId,
      "POST",
      `/chat/conversations/${encodeURIComponent(conversationId)}/messages`,
      { content, idempotencyKey },
    );
  }

  markRead(
    userId: string,
    conversationId: string,
    messageIds?: string[],
  ): Promise<unknown> {
    return this.request<unknown>(
      userId,
      "POST",
      `/chat/conversations/${encodeURIComponent(conversationId)}/read`,
      { messageIds },
    );
  }

  searchUsers(userId: string, query: string): Promise<CentralUserSummary[]> {
    const suffix = query ? `?q=${encodeURIComponent(query)}` : "";
    return this.request<CentralUserSummary[]>(
      userId,
      "GET",
      `/chat/users${suffix}`,
    );
  }

  private mapError(status: number, message: string): Error {
    if (status === 401 || status === 403) {
      return new ForbiddenException(message);
    }
    if (status === 404) {
      return new NotFoundException(message);
    }
    if (status === 400) {
      return new ForbiddenException(message);
    }
    return new ServiceUnavailableException(message);
  }
}

async function readMessage(response: Response): Promise<string> {
  try {
    const text = await response.text();
    if (!text) return `Central Hub request failed with ${response.status}.`;
    const parsed = JSON.parse(text) as { message?: unknown };
    if (typeof parsed.message === "string") return parsed.message;
    if (Array.isArray(parsed.message)) return parsed.message.map(String).join(", ");
    return `Central Hub request failed with ${response.status}.`;
  } catch {
    return `Central Hub request failed with ${response.status}.`;
  }
}
