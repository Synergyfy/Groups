import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  Crown,
  Loader2,
  Lock,
  Save,
  Send,
  Settings2,
  Users,
  WifiOff,
  X,
} from "lucide-react";
import Avatar from "../../components/ui/Avatar";
import type { CircleMember } from "../../domain/types";
import { useCentralChat } from "./useCentralChat";

interface ChatPanelProps {
  /** The circle member the chat was opened for. */
  member: CircleMember | null;
  /** The circle a group chat was opened for. */
  group?: {
    circleId: string;
    title: string;
    members: CircleMember[];
  } | null;
  onClose: () => void;
}

/**
 * The chat drawer of a circle member or a circle group.
 *
 * The conversation itself lives on Central Hub, so the same people can be
 * chatted with from any app in the ecosystem and the history follows the
 * person rather than this app.
 */
export default function ChatPanel({ member, group, onClose }: ChatPanelProps) {
  const chat = useCentralChat();
  const [draft, setDraft] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [groupTitle, setGroupTitle] = useState("");
  const [adminOnly, setAdminOnly] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [lastSettingsKey, setLastSettingsKey] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const targetKey = group ? `group:${group.circleId}` : `member:${member?.id}`;

  // Open the conversation as soon as a member or circle is picked.
  useEffect(() => {
    if (group) {
      void chat.openGroup(group.circleId, group.title);
      return;
    }
    if (member) {
      void chat.openMember(member.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetKey]);

  useEffect(() => {
    if (!member && !group) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [member, group, onClose]);

  // Keep the newest message in view.
  useEffect(() => {
    const node = scrollRef.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [chat.messages.length, chat.conversation?.id]);

  // The conversation is on screen, so it counts as read.
  useEffect(() => {
    if (!chat.conversation) return;
    chat.markRead();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chat.conversation?.id]);

  if (!member && !group) return null;

  const handleSend = async () => {
    const content = draft.trim();
    if (!content) return;
    setDraft("");
    const sent = await chat.send(content);
    if (!sent) setDraft(content);
  };

  const conversation = chat.conversation;
  const isAdmin = conversation?.role === "ADMIN" || conversation?.isOwner === true;
  // Only admins may post in an admin-only group.
  const readOnly = Boolean(conversation?.isAdminOnly) && !isAdmin;

  // The group settings form mirrors the live state of the conversation. It is
  // derived state, so it is adjusted during render rather than in an effect.
  const settingsKey = conversation
    ? `${conversation.id}:${conversation.title ?? ""}:${conversation.isAdminOnly}`
    : null;
  if (settingsKey && settingsKey !== lastSettingsKey) {
    setLastSettingsKey(settingsKey);
    setGroupTitle(conversation?.title ?? "");
    setAdminOnly(Boolean(conversation?.isAdminOnly));
  }

  const saveGroupSettings = async () => {
    setSavingSettings(true);
    await chat.updateGroup({
      title: groupTitle.trim() || undefined,
      isAdminOnly: adminOnly,
    });
    setSavingSettings(false);
    setSettingsOpen(false);
  };
  const heading = group
    ? (conversation?.title ?? group.title)
    : (member?.businessName || member?.fullName || "");
  const notMembersYet = group
    ? group.members.filter((entry) => entry.chatable === false)
    : [];

  const statusLabel =
    chat.status === "connected"
      ? "Live"
      : chat.status === "connecting"
        ? "Connecting…"
        : chat.status === "offline"
          ? "Reconnecting…"
          : chat.status === "error"
            ? "Unavailable"
            : "Idle";

  const subtitle = group
    ? `${statusLabel} · ${conversation?.participantsCount ?? group.members.length} members · Central Hub`
    : `${statusLabel} · Central Hub`;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={group ? `Group chat ${heading}` : `Chat with ${heading}`}
    >
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />

      <section className="relative z-10 flex h-full w-full max-w-md flex-col border-l border-white/10 bg-ink-900 shadow-2xl shadow-black/60">
        <header className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
          {group ? (
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gold-500/20 text-gold-300">
              <Users className="size-4" />
            </span>
          ) : (
            <Avatar
              id={member?.id}
              name={member?.fullName ?? ""}
              src={member?.photoUrl}
              className="size-10 shrink-0 rounded-full text-xs font-bold text-white"
            />
          )}
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-sm font-semibold text-white">{heading}</h2>
            <p className="flex items-center gap-1.5 truncate text-[11px] text-slate-400">
              <span
                className={`size-1.5 rounded-full ${
                  chat.status === "connected"
                    ? "bg-emerald-400"
                    : chat.status === "error"
                      ? "bg-danger-500"
                      : "bg-amber-400"
                }`}
              />
              {subtitle}
            </p>
          </div>
          {group && isAdmin && (
            <button
              type="button"
              onClick={() => setSettingsOpen((open) => !open)}
              aria-label="Group settings"
              className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-white/5 hover:text-white"
            >
              <Settings2 className="size-4" />
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close chat"
            className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-white/5 hover:text-white"
          >
            <X className="size-4" />
          </button>
        </header>

        {group && settingsOpen && isAdmin && (
          <div className="flex flex-col gap-3 border-b border-white/10 bg-ink-850 px-4 py-3">
            <label className="flex flex-col gap-1.5 text-[11px]">
              <span className="font-semibold text-white">Group name</span>
              <input
                value={groupTitle}
                onChange={(event) => setGroupTitle(event.target.value)}
                maxLength={100}
                className="h-9 rounded-lg border border-white/10 bg-ink-800 px-3 text-xs text-slate-200 focus:border-gold-500/50 focus:outline-none"
              />
            </label>
            <label className="flex items-start gap-2 text-[11px] text-slate-300">
              <input
                type="checkbox"
                checked={adminOnly}
                onChange={(event) => setAdminOnly(event.target.checked)}
                className="mt-0.5 size-3.5 accent-[#e6a92b]"
              />
              <span>
                <span className="font-semibold text-white">Read-only for members</span>
                <span className="mt-0.5 block text-[10px] leading-relaxed text-slate-400">
                  Everybody still reads the group and gets the notifications, but only
                  group admins can post.
                </span>
              </span>
            </label>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setSettingsOpen(false)}
                className="rounded-lg px-2.5 py-1.5 text-[11px] font-medium text-slate-400 transition-colors hover:bg-white/5 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void saveGroupSettings()}
                disabled={savingSettings}
                className="inline-flex items-center gap-1.5 rounded-lg bg-gold-500 px-3 py-1.5 text-[11px] font-semibold text-ink-950 transition-colors hover:bg-gold-400 disabled:opacity-50"
              >
                <Save className="size-3" />
                {savingSettings ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        )}

        {group && conversation && (
          <div className="border-b border-white/10 px-4 py-2.5">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold text-gold-300">
              <Crown className="size-3.5" />
              You are the group owner and admin
            </p>
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {conversation.participants.map((participant) => (
                <li
                  key={participant.centralUserId}
                  className="flex items-center gap-1.5 rounded-full bg-white/10 px-2 py-1 text-[10px] text-slate-200"
                >
                  {participant.isOwner && <Crown className="size-2.5 text-gold-400" />}
                  {participant.displayName}
                  {participant.role === "ADMIN" && !participant.isOwner && (
                    <span className="text-slate-400">· admin</span>
                  )}
                </li>
              ))}
            </ul>
            {notMembersYet.length > 0 && (
              <p className="mt-2 text-[10px] leading-relaxed text-slate-500">
                {notMembersYet.length} member
                {notMembersYet.length === 1 ? "" : "s"} cannot join the chat yet —
                they have no Central Hub account.
              </p>
            )}
          </div>
        )}

        <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
          {chat.loading && (
            <div className="flex items-center justify-center gap-2 py-10 text-xs text-slate-400">
              <Loader2 className="size-4 animate-spin" />
              Opening the conversation…
            </div>
          )}

          {!chat.loading && chat.error && (
            <div className="flex items-start gap-2 rounded-xl border border-danger-500/30 bg-danger-500/10 px-3 py-2.5 text-xs text-danger-400">
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
              <span>{chat.error}</span>
            </div>
          )}

          {!chat.loading && !chat.error && chat.messages.length === 0 && (
            <p className="py-10 text-center text-xs leading-relaxed text-slate-500">
              {group
                ? "No messages yet. Start the conversation — everybody in the circle sees it, and it is delivered through Central Hub."
                : `No messages yet. Start the conversation with ${member?.fullName} — it is delivered through Central Hub, so both of you keep the same history in every app.`}
            </p>
          )}

          {chat.messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.isSender ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-3 py-2 text-xs leading-relaxed ${
                  message.isSender
                    ? "rounded-br-sm bg-gold-500/90 text-ink-950"
                    : "rounded-bl-sm border border-white/10 bg-ink-800 text-slate-200"
                } ${message.pending ? "opacity-70" : ""} ${message.failed ? "opacity-60" : ""}`}
              >
                {group && !message.isSender && (
                  <p className="mb-1 text-[10px] font-semibold text-gold-300">
                    {message.senderName}
                  </p>
                )}
                <p className="whitespace-pre-wrap break-words">{message.content}</p>
                <p
                  className={`mt-1 text-[10px] ${
                    message.isSender ? "text-ink-900/70" : "text-slate-500"
                  }`}
                >
                  {new Date(message.createdAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                  {message.failed ? " · not delivered" : ""}
                  {message.pending ? " · sending…" : ""}
                </p>
              </div>
            </div>
          ))}

          {chat.typingUsers.length > 0 && (
            <p className="text-[11px] italic text-slate-400">
              {chat.typingUsers.join(", ")}{" "}
              {chat.typingUsers.length === 1 ? "is" : "are"} typing…
            </p>
          )}
        </div>

        <footer className="border-t border-white/10 bg-ink-850 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          {readOnly && (
            <p className="mb-2 flex items-center gap-1.5 text-[11px] text-amber-300">
              <Lock className="size-3.5" />
              This group is read-only for members — only group admins can post.
            </p>
          )}
          {chat.status === "offline" && (
            <p className="mb-2 flex items-center gap-1.5 text-[11px] text-amber-300">
              <WifiOff className="size-3.5" />
              Offline — messages are sent over HTTP until the socket is back.
            </p>
          )}
          <div className="flex items-end gap-2">
            <textarea
              value={draft}
              onChange={(event) => {
                setDraft(event.target.value);
                chat.notifyTyping();
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void handleSend();
                }
              }}
              rows={1}
              maxLength={10000}
              disabled={readOnly}
              placeholder={
                readOnly
                  ? "Only group admins can post in this group"
                  : group
                    ? `Message ${heading}…`
                    : `Message ${member?.fullName ?? ""}…`
              }
              aria-label={group ? `Message ${heading}` : `Message ${member?.fullName ?? ""}`}
              className="max-h-28 min-h-10 flex-1 resize-none rounded-xl border border-white/10 bg-ink-800 px-3 py-2.5 text-xs text-slate-200 placeholder:text-slate-500 focus:border-gold-500/50 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
            />
            <button
              type="button"
              onClick={() => void handleSend()}
              disabled={!draft.trim() || readOnly}
              aria-label="Send message"
              className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-xl bg-gold-500 text-ink-950 transition-colors hover:bg-gold-400 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Send className="size-4" />
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}
