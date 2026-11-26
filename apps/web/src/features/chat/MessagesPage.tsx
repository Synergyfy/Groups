import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  CheckCheck,
  Lock,
  Megaphone,
  MessageSquare,
  Plus,
  Search,
  Send,
  Users,
  Wifi,
  WifiOff,
} from "lucide-react";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Card, { CardBody } from "../../components/ui/Card";
import EmptyState from "../../components/ui/EmptyState";
import Modal from "../../components/ui/Modal";
import SectionHeader from "../../components/ui/SectionHeader";
import { errorMessage } from "../../app/api";
import { useBusinessData } from "../../business/BusinessDataProvider";
import { useAppState } from "../../store/selectors";
import { relativeTime } from "../../lib/time";
import {
  chatApi,
  type ChatConversation,
  type ChatDirectoryEntry,
} from "./chatApi";
import { useCentralChat } from "./useCentralChat";

function conversationTitle(conv: ChatConversation): string {
  if (conv.title?.trim()) return conv.title.trim();
  const others = conv.participants.filter((p) => !p.isViewer);
  if (others.length > 0) {
    return others.map((p) => p.displayName).join(", ");
  }
  return "Conversation";
}

function isGroupConversation(conv: ChatConversation): boolean {
  return conv.type.toUpperCase() === "GROUP" || conv.participantsCount > 2;
}

export default function MessagesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { circles } = useBusinessData();
  const { groups } = useAppState();
  const chat = useCentralChat();

  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  const [newChatOpen, setNewChatOpen] = useState(false);
  const [dirQuery, setDirQuery] = useState("");
  const [dirResults, setDirResults] = useState<ChatDirectoryEntry[]>([]);
  const [searchingDir, setSearchingDir] = useState(false);

  const [broadcastOpen, setBroadcastOpen] = useState(false);
  const [broadcastText, setBroadcastText] = useState("");
  const [sendingBroadcast, setSendingBroadcast] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const loadConversations = useCallback(async () => {
    setLoadingList(true);
    setListError(null);
    try {
      const list = await chatApi.conversations();
      setConversations(list);
      return list;
    } catch (cause) {
      setListError(errorMessage(cause));
      return [];
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    void loadConversations().then((list) => {
      const targetGroupId = searchParams.get("groupId");
      const targetCircleId = searchParams.get("circleId");
      const targetConvId = searchParams.get("conversationId");
      if (targetGroupId) {
        void chat.openGroupForGroup(targetGroupId);
      } else if (targetCircleId) {
        void chat.openGroup(targetCircleId);
      } else if (targetConvId) {
        const match = list.find((c) => c.id === targetConvId);
        if (match) void chat.openConversation(match);
      } else if (list.length > 0 && !chat.conversation) {
        void chat.openConversation(list[0]);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (chat.conversation?.id) {
      chat.markRead();
    }
  }, [chat.conversation?.id, chat.messages.length, chat]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat.messages.length]);

  const filteredConversations = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter((conv) => {
      const title = conversationTitle(conv).toLowerCase();
      const last = (conv.lastMessageContent ?? "").toLowerCase();
      const names = conv.participants
        .map((p) => `${p.displayName} ${p.email ?? ""}`.toLowerCase())
        .join(" ");
      return title.includes(q) || last.includes(q) || names.includes(q);
    });
  }, [conversations, search]);

  const active = chat.conversation;
  const isGroup = active ? isGroupConversation(active) : false;
  const isAdmin =
    Boolean(active?.isOwner) || active?.role?.toUpperCase() === "ADMIN";
  const readOnly = Boolean(active?.isAdminOnly) && !isAdmin;

  const handleSelectConversation = (conv: ChatConversation) => {
    setSearchParams({ conversationId: conv.id }, { replace: true });
    void chat.openConversation(conv);
  };

  const handleSend = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!draft.trim() || sending || readOnly) return;
    setSending(true);
    const text = draft;
    setDraft("");
    const ok = await chat.send(text);
    setSending(false);
    if (!ok) setDraft(text);
    void loadConversations();
  };

  const handleSearchDirectory = async (q: string) => {
    setDirQuery(q);
    if (q.trim().length < 2) {
      setDirResults([]);
      return;
    }
    setSearchingDir(true);
    try {
      const results = await chatApi.directory(q.trim());
      setDirResults(results);
    } catch {
      setDirResults([]);
    } finally {
      setSearchingDir(false);
    }
  };

  const handleSendBroadcast = async () => {
    if (!active || !broadcastText.trim() || sendingBroadcast) return;
    setSendingBroadcast(true);
    try {
      await chat.send(`[Announcement] ${broadcastText.trim()}`);
      setBroadcastText("");
      setBroadcastOpen(false);
      void loadConversations();
    } finally {
      setSendingBroadcast(false);
    }
  };

  const circleList = circles?.items ?? [];

  return (
    <div className="flex flex-col gap-4">
      <SectionHeader
        title="Messages"
        subtitle="Direct chats, Group Chats, and announcements powered by Central Hub."
        actions={
          <Button size="sm" onClick={() => setNewChatOpen(true)}>
            <Plus className="size-4" /> New Chat
          </Button>
        }
      />

      {listError && (
        <div className="rounded-xl border border-warning-500/30 bg-warning-500/10 px-4 py-3 text-xs text-warning-200">
          {listError}
        </div>
      )}

      <div className="grid min-h-[540px] gap-4 lg:grid-cols-[320px_1fr]">
        {/* Left: Conversations list */}
        <Card className="flex flex-col overflow-hidden">
          <CardBody className="flex flex-1 flex-col gap-3 p-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-slate-500" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search conversations…"
                className="h-9 w-full rounded-lg border border-white/10 bg-ink-800 pl-8 pr-3 text-xs text-slate-200 placeholder:text-slate-500 focus:border-gold-500/50 focus:outline-none"
              />
            </div>

            <div className="flex flex-1 flex-col gap-1 overflow-y-auto pr-1">
              {loadingList ? (
                <p className="py-8 text-center text-xs text-slate-500">
                  Loading conversations…
                </p>
              ) : filteredConversations.length === 0 ? (
                <p className="py-8 text-center text-xs text-slate-500">
                  No conversations yet. Start a direct chat or open a Group Chat.
                </p>
              ) : (
                filteredConversations.map((conv) => {
                  const selected = active?.id === conv.id;
                  const groupConv = isGroupConversation(conv);
                  return (
                    <button
                      key={conv.id}
                      type="button"
                      onClick={() => handleSelectConversation(conv)}
                      className={`flex items-start gap-2.5 rounded-xl border p-2.5 text-left transition-colors ${
                        selected
                          ? "border-gold-500/40 bg-gold-500/10"
                          : "border-transparent hover:bg-white/5"
                      }`}
                    >
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-ink-800 text-xs font-semibold text-gold-300">
                        {groupConv ? (
                          <Users className="size-4" />
                        ) : (
                          conversationTitle(conv).slice(0, 2).toUpperCase()
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <p className="truncate text-xs font-semibold text-white">
                            {conversationTitle(conv)}
                          </p>
                          {conv.lastMessageAt && (
                            <span className="shrink-0 text-[10px] text-slate-500">
                              {relativeTime(conv.lastMessageAt)}
                            </span>
                          )}
                        </div>
                        <div className="mt-0.5 flex items-center justify-between gap-1">
                          <p className="truncate text-[11px] text-slate-400">
                            {conv.lastMessageContent ?? "No messages yet"}
                          </p>
                          {conv.unreadCount > 0 && (
                            <span className="inline-flex min-w-[18px] items-center justify-center rounded-full bg-gold-500 px-1.5 py-0.5 text-[10px] font-bold text-ink-950">
                              {conv.unreadCount}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </CardBody>
        </Card>

        {/* Right: Active conversation */}
        <Card className="flex flex-col overflow-hidden">
          {!active ? (
            <CardBody className="flex flex-1 items-center justify-center p-6">
              <EmptyState
                title="Select a conversation"
                description="Choose a conversation from the left or start a new chat with a contact, circle, or group."
                icon={<MessageSquare className="size-6" />}
                action={
                  <Button size="sm" onClick={() => setNewChatOpen(true)}>
                    <Plus className="size-4" /> Start a chat
                  </Button>
                }
              />
            </CardBody>
          ) : (
            <div className="flex h-[540px] flex-col">
              {/* Conversation Header */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-4 py-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="truncate text-sm font-semibold text-white">
                      {conversationTitle(active)}
                    </h2>
                    {isGroup && (
                      <Badge variant="info">
                        Group · {active.participantsCount}
                      </Badge>
                    )}
                    {active.isAdminOnly && (
                      <Badge variant="warning">Broadcast only</Badge>
                    )}
                  </div>
                  <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-slate-400">
                    {chat.status === "connected" ? (
                      <>
                        <Wifi className="size-3 text-success-400" /> Live
                      </>
                    ) : (
                      <>
                        <WifiOff className="size-3 text-slate-500" />{" "}
                        {chat.status}
                      </>
                    )}
                    {chat.typingUsers.length > 0 && (
                      <span className="text-gold-300">
                        · {chat.typingUsers.join(", ")} typing…
                      </span>
                    )}
                  </p>
                </div>

                {isGroup && isAdmin && (
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setBroadcastOpen(true)}
                    >
                      <Megaphone className="size-3.5" /> Announcement
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        void chat.updateGroup({
                          isAdminOnly: !active.isAdminOnly,
                        })
                      }
                    >
                      <Lock className="size-3.5" />{" "}
                      {active.isAdminOnly ? "Allow replies" : "Admins only"}
                    </Button>
                  </div>
                )}
              </div>

              {/* Messages */}
              <div className="flex-1 space-y-3 overflow-y-auto p-4">
                {chat.loading ? (
                  <p className="py-10 text-center text-xs text-slate-500">
                    Loading message history…
                  </p>
                ) : chat.messages.length === 0 ? (
                  <p className="py-10 text-center text-xs text-slate-500">
                    No messages in this conversation yet. Say hello below.
                  </p>
                ) : (
                  chat.messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${
                        msg.isSender ? "items-end" : "items-start"
                      }`}
                    >
                      {!msg.isSender && isGroup && (
                        <span className="mb-1 text-[10px] font-medium text-slate-400">
                          {msg.senderName}
                        </span>
                      )}
                      <div
                        className={`max-w-[78%] rounded-2xl px-3.5 py-2 text-xs leading-relaxed ${
                          msg.isSender
                            ? "bg-gold-500 text-ink-950"
                            : "border border-white/10 bg-ink-800 text-slate-200"
                        }`}
                      >
                        <p className="whitespace-pre-wrap break-words">
                          {msg.content}
                        </p>
                        <div
                          className={`mt-1 flex items-center justify-end gap-1 text-[10px] ${
                            msg.isSender ? "text-ink-950/70" : "text-slate-500"
                          }`}
                        >
                          <span>{relativeTime(msg.createdAt)}</span>
                          {msg.isSender && msg.readCount > 0 && (
                            <CheckCheck className="size-3" />
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Composer */}
              <form
                onSubmit={handleSend}
                className="flex items-center gap-2 border-t border-white/10 p-3"
              >
                {readOnly ? (
                  <p className="flex-1 py-1.5 text-center text-xs text-slate-400">
                    Only group admins can post announcements in this channel.
                  </p>
                ) : (
                  <>
                    <input
                      type="text"
                      value={draft}
                      onChange={(e) => {
                        setDraft(e.target.value);
                        chat.notifyTyping();
                      }}
                      placeholder="Write a message…"
                      className="h-10 flex-1 rounded-xl border border-white/10 bg-ink-800 px-3 text-xs text-slate-200 placeholder:text-slate-500 focus:border-gold-500/50 focus:outline-none"
                    />
                    <Button
                      type="submit"
                      size="sm"
                      disabled={!draft.trim() || sending}
                    >
                      <Send className="size-3.5" /> Send
                    </Button>
                  </>
                )}
              </form>
            </div>
          )}
        </Card>
      </div>

      {/* New Chat Modal */}
      <Modal
        open={newChatOpen}
        title="Start a Conversation"
        onClose={() => setNewChatOpen(false)}
      >
        <div className="flex flex-col gap-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-white">
              Search Central Hub Directory (Private Chat)
            </label>
            <input
              type="search"
              value={dirQuery}
              onChange={(e) => void handleSearchDirectory(e.target.value)}
              placeholder="Search by name or email…"
              className="h-10 w-full rounded-lg border border-white/10 bg-ink-800 px-3 text-xs text-slate-200 placeholder:text-slate-500 focus:border-gold-500/50 focus:outline-none"
            />
            {searchingDir && (
              <p className="mt-1.5 text-[11px] text-slate-400">Searching…</p>
            )}
            {dirResults.length > 0 && (
              <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto">
                {dirResults.map((entry) => (
                  <li key={entry.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setNewChatOpen(false);
                        void chat.openMember(entry.id).then(() => {
                          void loadConversations();
                        });
                      }}
                      className="flex w-full items-center justify-between rounded-lg border border-white/10 bg-ink-950/60 px-3 py-2 text-left text-xs hover:border-gold-500/40"
                    >
                      <span className="font-medium text-white">
                        {entry.businessName ||
                          [entry.firstName, entry.lastName]
                            .filter(Boolean)
                            .join(" ") ||
                          entry.email}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {entry.email}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {groups.length > 0 && (
            <div>
              <p className="mb-1.5 text-xs font-semibold text-white">
                Open a Group Chat
              </p>
              <div className="flex max-h-36 flex-col gap-1.5 overflow-y-auto">
                {groups.slice(0, 10).map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => {
                      setNewChatOpen(false);
                      void chat.openGroupForGroup(g.id, g.name).then(() => {
                        void loadConversations();
                      });
                    }}
                    className="flex items-center justify-between rounded-lg border border-white/10 bg-ink-950/60 px-3 py-2 text-left text-xs hover:border-gold-500/40"
                  >
                    <span className="font-medium text-white">{g.name}</span>
                    <Badge variant="muted">{g.type}</Badge>
                  </button>
                ))}
              </div>
            </div>
          )}

          {circleList.length > 0 && (
            <div>
              <p className="mb-1.5 text-xs font-semibold text-white">
                Open a Circle Chat
              </p>
              <div className="flex max-h-36 flex-col gap-1.5 overflow-y-auto">
                {circleList.slice(0, 10).map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setNewChatOpen(false);
                      void chat.openGroup(c.id, c.config.name).then(() => {
                        void loadConversations();
                      });
                    }}
                    className="flex items-center justify-between rounded-lg border border-white/10 bg-ink-950/60 px-3 py-2 text-left text-xs hover:border-gold-500/40"
                  >
                    <span className="font-medium text-white">
                      {c.config.name || c.type}
                    </span>
                    <Badge variant="info">{c.type}</Badge>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Broadcast Announcement Modal */}
      <Modal
        open={broadcastOpen}
        title="Send Group Announcement (Broadcast)"
        onClose={() => setBroadcastOpen(false)}
        footer={
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setBroadcastOpen(false)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!broadcastText.trim() || sendingBroadcast}
              onClick={() => void handleSendBroadcast()}
            >
              <Megaphone className="size-3.5" /> Send Announcement
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-2">
          <p className="text-xs text-slate-400">
            Broadcast an announcement to all members of{" "}
            <span className="font-semibold text-white">
              {active ? conversationTitle(active) : "this group"}
            </span>
            .
          </p>
          <textarea
            rows={4}
            value={broadcastText}
            onChange={(e) => setBroadcastText(e.target.value)}
            placeholder="Write your announcement…"
            className="w-full rounded-lg border border-white/10 bg-ink-800 p-3 text-xs text-slate-200 placeholder:text-slate-500 focus:border-gold-500/50 focus:outline-none"
          />
        </div>
      </Modal>
    </div>
  );
}
