import { apiRequest } from "../../app/api";

export interface ChatParticipant {
  centralUserId: string;
  displayName: string;
  email: string | null;
  role: string | null;
  roleTitle: string | null;
  isOnline: boolean;
  isOwner: boolean;
  isViewer: boolean;
}

export interface ChatConversation {
  id: string;
  type: string;
  title: string | null;
  avatarUrl: string | null;
  participants: ChatParticipant[];
  lastMessageContent: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
  isMuted: boolean;
  isOnline: boolean;
  viewerCentralId: string;
  /** The viewer's group role: OWNER/ADMIN or MEMBER. */
  role: string | null;
  /** True when the signed-in user created the group. */
  isOwner: boolean;
  /** True when only group admins may post. */
  isAdminOnly: boolean;
  participantsCount: number;
}

export interface ChatMessage {
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
  /** Set on optimistic bubbles until Central Hub confirms the message. */
  clientTempId?: string;
  /** True while an optimistic bubble is still waiting for its confirmation. */
  pending?: boolean;
  failed?: boolean;
}

export interface ChatSocketSession {
  socketUrl: string;
  socketToken: string;
  expiresIn: number;
  transport: "websocket";
}

export interface ChatDirectoryEntry {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  role?: string;
  businessName?: string | null;
  isOnline?: boolean;
}

/**
 * The app's own chat API.
 *
 * Everything here is proxied by the app backend, which holds the Central Hub
 * chat credentials. The browser only ever receives the single-use socket
 * token from `session()`.
 */
export const chatApi = {
  session: () => apiRequest<ChatSocketSession>("/chat/session"),

  conversations: () => apiRequest<ChatConversation[]>("/chat/conversations"),

  openDirect: (memberId: string) =>
    apiRequest<ChatConversation>("/chat/conversations/direct", {
      method: "POST",
      body: JSON.stringify({ memberId }),
    }),

  /**
   * Opens (or creates) the group conversation of a circle. The business that
   * owns the circle is the group owner and admin.
   */
  openGroup: (circleId: string, title?: string) =>
    apiRequest<ChatConversation>("/chat/conversations/group", {
      method: "POST",
      body: JSON.stringify({ circleId, ...(title ? { title } : {}) }),
    }),

  /**
   * Opens (or creates) the shared group conversation of a Group.
   */
  openGroupForGroup: (groupId: string, title?: string) =>
    apiRequest<ChatConversation>("/chat/conversations/group", {
      method: "POST",
      body: JSON.stringify({ groupId, ...(title ? { title } : {}) }),
    }),

  addGroupParticipant: (conversationId: string, memberId: string) =>
    apiRequest<ChatConversation>(
      `/chat/conversations/${encodeURIComponent(conversationId)}/participants`,
      { method: "POST", body: JSON.stringify({ memberId }) },
    ),

  removeGroupParticipant: (conversationId: string, memberId: string) =>
    apiRequest<ChatConversation>(
      `/chat/conversations/${encodeURIComponent(conversationId)}/participants/${encodeURIComponent(memberId)}`,
      { method: "DELETE" },
    ),

  /** Group settings — admins only. */
  updateGroup: (
    conversationId: string,
    settings: { title?: string; isAdminOnly?: boolean },
  ) =>
    apiRequest<ChatConversation>(
      `/chat/conversations/${encodeURIComponent(conversationId)}`,
      { method: "PATCH", body: JSON.stringify(settings) },
    ),

  setParticipantRole: (
    conversationId: string,
    memberId: string,
    role: "ADMIN" | "MEMBER",
  ) =>
    apiRequest<ChatConversation>(
      `/chat/conversations/${encodeURIComponent(conversationId)}/participants/${encodeURIComponent(memberId)}`,
      { method: "PATCH", body: JSON.stringify({ role }) },
    ),

  transferOwnership: (conversationId: string, memberId: string) =>
    apiRequest<ChatConversation>(
      `/chat/conversations/${encodeURIComponent(conversationId)}/transfer-ownership`,
      { method: "POST", body: JSON.stringify({ memberId }) },
    ),

  messages: (conversationId: string, cursor?: string, limit = 50) => {
    const query = new URLSearchParams();
    if (cursor) query.set("cursor", cursor);
    query.set("limit", String(limit));
    return apiRequest<ChatMessage[]>(
      `/chat/conversations/${encodeURIComponent(conversationId)}/messages?${query.toString()}`,
    );
  },

  sendMessage: (
    conversationId: string,
    content: string,
    idempotencyKey?: string,
  ) =>
    apiRequest<ChatMessage>(
      `/chat/conversations/${encodeURIComponent(conversationId)}/messages`,
      {
        method: "POST",
        body: JSON.stringify({ content, idempotencyKey }),
      },
    ),

  markRead: (conversationId: string, messageIds?: string[]) =>
    apiRequest<unknown>(
      `/chat/conversations/${encodeURIComponent(conversationId)}/read`,
      {
        method: "POST",
        body: JSON.stringify({ messageIds }),
      },
    ),

  directory: (q: string) =>
    apiRequest<ChatDirectoryEntry[]>(
      `/chat/directory${q ? `?q=${encodeURIComponent(q)}` : ""}`,
    ),
};
