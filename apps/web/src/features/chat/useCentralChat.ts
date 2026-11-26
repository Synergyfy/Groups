import { useCallback, useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { errorMessage } from "../../app/api";
import {
  chatApi,
  type ChatConversation,
  type ChatMessage,
} from "./chatApi";

export type ChatStatus = "idle" | "connecting" | "connected" | "offline" | "error";

interface SocketAck {
  success?: boolean;
  error?: string;
  message?: ChatMessage;
  clientTempId?: string | null;
}

interface NewMessageEvent extends Omit<ChatMessage, "clientTempId"> {
  clientTempId?: string | null;
}

interface TypingUser {
  userId?: string;
  /** Central Hub sends the display name of the typing person. */
  userName?: string;
  name?: string;
}

interface TypingEvent {
  conversationId: string;
  typingUsers: Array<string | TypingUser>;
}

interface ReadEvent {
  conversationId: string;
  readerUserId: string;
  readMessageIds?: string[];
  readAt?: string;
}

interface ConversationUpdatedEvent {
  conversationId: string;
  isAdminOnly?: boolean;
  title?: string | null;
  avatarUrl?: string | null;
}

/**
 * Central Hub chat, wired to the socket.
 *
 * Central Hub owns the conversation and the messages; this hook keeps a live
 * view of one conversation and talks to Central Hub through the app backend.
 * The socket token is single-use, so a fresh one is minted for every connect
 * and reconnect.
 */
export function useCentralChat() {
  const socketRef = useRef<Socket | null>(null);
  const conversationIdRef = useRef<string | null>(null);
  const typingTimerRef = useRef<number | null>(null);
  const typingActiveRef = useRef(false);
  const openingRef = useRef<{ target: string; promise: Promise<void> } | null>(
    null,
  );

  const [status, setStatus] = useState<ChatStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [conversation, setConversation] = useState<ChatConversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const applyMessage = useCallback((incoming: ChatMessage) => {
    setMessages((current) => {
      // The same message can arrive twice: once as the optimistic bubble and
      // once as the persisted message echoed back by the socket.
      const byId = current.findIndex((message) => message.id === incoming.id);
      if (byId !== -1) {
        const next = [...current];
        next[byId] = { ...next[byId], ...incoming, pending: false, failed: false };
        return next;
      }

      const byTempId = incoming.clientTempId
        ? current.findIndex(
            (message) => message.clientTempId === incoming.clientTempId,
          )
        : -1;
      if (byTempId !== -1) {
        const next = [...current];
        next[byTempId] = { ...next[byTempId], ...incoming, pending: false, failed: false };
        return next;
      }

      return [...current, incoming];
    });
  }, []);

  const joinConversation = useCallback((id: string) => {
    const socket = socketRef.current;
    if (!socket || !socket.connected) return;

    socket.emit("join_conversation", { conversationId: id }, (ack: unknown) => {
      const result = ack as { success?: boolean; error?: string } | undefined;
      if (result && !result.success) {
        setError(result.error ?? "This conversation cannot be opened.");
      }
    });
    socket.emit("viewing_conversation", { conversationId: id });
  }, []);

  /**
   * Opens the socket to Central Hub.
   *
   * The `auth` callback asks the app backend for a fresh socket token every
   * time a handshake happens, because Central Hub consumes each token once.
   */
  const connect = useCallback(async () => {
    if (socketRef.current) return;

    setStatus("connecting");
    setError(null);

    let socketUrl: string;
    let firstToken: string | null = null;
    try {
      const session = await chatApi.session();
      socketUrl = session.socketUrl;
      firstToken = session.socketToken;
    } catch (cause) {
      setStatus("error");
      setError(errorMessage(cause));
      return;
    }

    const socket = io(socketUrl, {
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 15000,
      randomizationFactor: 0.5,
      auth: (cb) => {
        // Central Hub consumes every socket token, so the first handshake
        // uses the token that came with the session and every reconnect mints
        // a fresh one.
        if (firstToken) {
          const token = firstToken;
          firstToken = null;
          cb({ token });
          return;
        }
        chatApi
          .session()
          .then((session) => cb({ token: session.socketToken }))
          .catch(() => cb({}));
      },
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      setStatus("connected");
      setError(null);
      const current = conversationIdRef.current;
      if (current) joinConversation(current);
    });

    socket.on("connect_error", (err: Error) => {
      setStatus("error");
      setError(
        err.message.includes("Origin not allowed")
          ? "This app is not allowed to use Central Hub messaging yet. Add its address to the CORS origins in the MCOM Console."
          : err.message || "Central Hub messaging is unavailable.",
      );
    });

    socket.on("disconnect", (reason: string) => {
      if (reason === "io client disconnect") return;
      setStatus("offline");
    });

    socket.on("new_message", (event: NewMessageEvent) => {
      if (event.conversationId !== conversationIdRef.current) return;
      applyMessage({
        ...event,
        clientTempId: event.clientTempId ?? undefined,
      });
    });

    socket.on("typing_update", (event: TypingEvent) => {
      if (event.conversationId !== conversationIdRef.current) return;
      const names = (event.typingUsers ?? [])
        .map((entry) =>
          typeof entry === "string"
            ? entry
            : (entry.userName ?? entry.name ?? entry.userId ?? ""),
        )
        .filter(Boolean);
      setTypingUsers(names);
    });

    socket.on("messages_read", (event: ReadEvent) => {
      if (event.conversationId !== conversationIdRef.current) return;
      const read = new Set(event.readMessageIds ?? []);
      if (read.size === 0) return;
      setMessages((current) =>
        current.map((message) =>
          read.has(message.id) ? { ...message, readCount: message.readCount + 1 } : message,
        ),
      );
    });

    socket.on("inbox_update", (event: { conversationId: string }) => {
      if (event.conversationId !== conversationIdRef.current) return;
      setConversation((current) =>
        current ? { ...current, unreadCount: 0 } : current,
      );
    });

    // An admin changed the group settings — switch the composer to read-only
    // straight away instead of waiting for the next refresh.
    socket.on(
      "conversation_updated",
      (event: ConversationUpdatedEvent) => {
        if (event.conversationId !== conversationIdRef.current) return;
        setConversation((current) =>
          current
            ? {
                ...current,
                isAdminOnly: event.isAdminOnly ?? current.isAdminOnly,
                title: event.title ?? current.title,
                avatarUrl: event.avatarUrl ?? current.avatarUrl,
              }
            : current,
        );
      },
    );
  }, [applyMessage, joinConversation]);

  /** Opens a conversation and loads its history. */
  const openConversation = useCallback(
    async (resolve: () => Promise<ChatConversation>) => {
      setLoading(true);
      setError(null);
      setMessages([]);
      setTypingUsers([]);

      try {
        const opened = await resolve();
        setConversation(opened);
        conversationIdRef.current = opened.id;

        const history = await chatApi.messages(opened.id);
        setMessages(history);

        await connect();
        joinConversation(opened.id);
      } catch (cause) {
        setConversation(null);
        conversationIdRef.current = null;
        setError(errorMessage(cause));
      } finally {
        setLoading(false);
      }
    },
    [connect, joinConversation],
  );

  /**
   * Opens a conversation.
   *
   * The panel can ask for the same target twice (a re-render, a second
   * click); the open conversation is reused instead of fetched again.
   */
  const open = useCallback(
    async (
      target: string,
      resolve: () => Promise<ChatConversation>,
    ): Promise<void> => {
      if (openingRef.current?.target === target) {
        return openingRef.current.promise;
      }

      const promise = openConversation(resolve);
      openingRef.current = { target, promise };
      try {
        await promise;
      } finally {
        if (openingRef.current?.target === target) {
          openingRef.current = null;
        }
      }
    },
    [openConversation],
  );

  /** Opens the conversation with a circle member. */
  const openMember = useCallback(
    (memberId: string) =>
      open(`member:${memberId}`, () => chatApi.openDirect(memberId)),
    [open],
  );

  /**
   * Opens the group conversation of a circle. The business that owns the
   * circle is the group owner and admin; the members join as group members.
   */
  const openGroup = useCallback(
    (circleId: string, title?: string) =>
      open(`group:${circleId}`, () => chatApi.openGroup(circleId, title)),
    [open],
  );

  /** Re-reads the conversation, e.g. after a group setting changed. */
  const refreshConversation = useCallback(async () => {
    const conversationId = conversationIdRef.current;
    if (!conversationId) return;
    try {
      const refreshed = await chatApi.conversations();
      const found = refreshed.find((entry) => entry.id === conversationId);
      if (found) setConversation(found);
    } catch {
      // A failed refresh leaves the current view in place.
    }
  }, []);

  /** Group settings — admins only. */
  const updateGroup = useCallback(
    async (settings: { title?: string; isAdminOnly?: boolean }) => {
      const conversationId = conversationIdRef.current;
      if (!conversationId) return;
      try {
        const updated = await chatApi.updateGroup(conversationId, settings);
        setConversation(updated);
      } catch (cause) {
        setError(errorMessage(cause));
      }
    },
    [],
  );

  /**
   * Sends a message.
   *
   * The socket is preferred; the REST endpoint is the fallback when the
   * socket is down. Both use the same idempotency key, so a retry can never
   * post the message twice.
   */
  const send = useCallback(
    async (content: string): Promise<boolean> => {
      const trimmed = content.trim();
      const conversationId = conversationIdRef.current;
      if (!trimmed || !conversationId) return false;

      const clientTempId = crypto.randomUUID();
      const optimistic: ChatMessage = {
        id: clientTempId,
        conversationId,
        senderId: conversation?.viewerCentralId ?? "",
        senderName: "You",
        senderRole: null,
        senderAvatar: null,
        content: trimmed,
        type: "TEXT",
        createdAt: new Date().toISOString(),
        isSender: true,
        readCount: 0,
        clientTempId,
        pending: true,
      };

      setMessages((current) => [...current, optimistic]);

      const socket = socketRef.current;
      if (socket?.connected) {
        const delivered = await new Promise<boolean>((resolve) => {
          let settled = false;
          const timer = window.setTimeout(() => {
            if (settled) return;
            settled = true;
            resolve(false);
          }, 8000);

          socket.emit(
            "send_message",
            {
              conversationId,
              content: trimmed,
              idempotencyKey: clientTempId,
            },
            (ack: SocketAck) => {
              if (settled) return;
              settled = true;
              window.clearTimeout(timer);

              if (ack?.success && ack.message) {
                applyMessage({ ...ack.message, clientTempId });
                resolve(true);
                return;
              }

              if (ack?.error) {
                setError(ack.error);
                setMessages((current) =>
                  current.map((message) =>
                    message.clientTempId === clientTempId
                      ? { ...message, pending: false, failed: true }
                      : message,
                  ),
                );
                resolve(false);
                return;
              }

              resolve(false);
            },
          );
        });

        if (delivered) return true;
        // Fall through to the HTTP fallback, reusing the same idempotency key.
      }

      try {
        const sent = await chatApi.sendMessage(conversationId, trimmed, clientTempId);
        applyMessage(sent);
        return true;
      } catch (cause) {
        setError(errorMessage(cause));
        setMessages((current) =>
          current.map((message) =>
            message.clientTempId === clientTempId
              ? { ...message, pending: false, failed: true }
              : message,
          ),
        );
        return false;
      }
    },
    [applyMessage, conversation],
  );

  /**
   * Tells the other side that the user is typing.
   *
   * Central Hub rate-limits typing events, so the start is emitted once per
   * burst and stopped after a short pause.
   */
  const notifyTyping = useCallback(() => {
    const socket = socketRef.current;
    const conversationId = conversationIdRef.current;
    if (!socket?.connected || !conversationId) return;

    if (!typingActiveRef.current) {
      typingActiveRef.current = true;
      socket.emit("typing_start", { conversationId });
    }

    if (typingTimerRef.current !== null) {
      window.clearTimeout(typingTimerRef.current);
    }
    typingTimerRef.current = window.setTimeout(() => {
      typingTimerRef.current = null;
      typingActiveRef.current = false;
      socket.emit("typing_stop", { conversationId });
    }, 3000);
  }, []);

  /** Marks the conversation as read. */
  const markRead = useCallback(() => {
    const socket = socketRef.current;
    const conversationId = conversationIdRef.current;
    if (!conversationId) return;

    if (socket?.connected) {
      socket.emit("mark_read", { conversationId });
      return;
    }
    void chatApi.markRead(conversationId).catch(() => undefined);
  }, []);

  useEffect(() => {
    return () => {
      if (typingTimerRef.current !== null) {
        window.clearTimeout(typingTimerRef.current);
        typingTimerRef.current = null;
      }
      typingActiveRef.current = false;
      const socket = socketRef.current;
      socket?.removeAllListeners();
      socket?.disconnect();
      socketRef.current = null;
    };
  }, []);

  return {
    status,
    error,
    conversation,
    messages,
    typingUsers,
    loading,
    openMember,
    openGroup,
    updateGroup,
    refreshConversation,
    send,
    notifyTyping,
    markRead,
  };
}
