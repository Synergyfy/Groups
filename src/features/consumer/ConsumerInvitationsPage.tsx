import { useState } from "react";
import { Link } from "react-router-dom";
import { Mail, Check, X, Users, ArrowRight } from "lucide-react";
import Badge from "../../components/ui/Badge";
import {
  useAppState,
  useGroup,
  useIncomingInvitations,
} from "../../store/selectors";
import { useAppStore } from "../../store/context";
import { readParticipantSession } from "../../app/authSession";
import type { Invitation } from "../../domain/types";

export default function ConsumerInvitationsPage() {
  const { dispatch } = useAppStore();
  const session = readParticipantSession();
  const consumerId = session?.role === "consumer" ? (session.accountId || "cons-john") : "cons-john";
  const consumerName = (session?.role === "consumer" && session.name) ? session.name : "John Doe";

  const invitations = useIncomingInvitations(consumerId);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [acceptedCircleId, setAcceptedCircleId] = useState<string | null>(null);

  const pending = invitations.filter((inv) => inv.kind === "invite" && inv.status === "pending");
  const past = invitations.filter(
    (inv) => inv.kind === "invite" && (inv.status === "accepted" || inv.status === "declined")
  );

  const circleCount = pending.filter((inv) => inv.circleId).length;
  const groupCount = pending.length - circleCount;

  const handleDecline = (invitation: Invitation) => {
    dispatch({
      type: "invitation/respond",
      invitationId: invitation.id,
      accept: false,
      responder: { id: consumerId, name: consumerName },
    });
    setFeedback(`Declined invitation.`);
    setAcceptedCircleId(null);
  };

  const handleAcceptCircle = (invitation: Invitation) => {
    dispatch({
      type: "invitation/respond",
      invitationId: invitation.id,
      accept: true,
      responder: { id: consumerId, name: consumerName },
    });
    setFeedback(`Joined circle successfully!`);
    setAcceptedCircleId(invitation.circleId ?? null);
  };

  return (
    <div className="flex flex-col gap-6 pb-8">
      <div>
        <div className="flex items-center gap-2">
          <Mail className="size-5 text-gold-400" />
          <h1 className="text-xl font-bold text-white sm:text-2xl">Invitations</h1>
          {pending.length > 0 && (
            <span className="rounded-full bg-gold-500/20 px-2 py-0.5 text-xs font-semibold text-gold-300">
              {pending.length} pending
            </span>
          )}
        </div>
        <p className="mt-1 text-xs text-slate-400">
          Review and respond to invitations waiting for you. Group invitations open a short
          summary first — circle invitations add you to the circle straight away.
        </p>
        {pending.length > 0 && (
          <p className="mt-1.5 text-[11px] text-slate-500">
            {circleCount > 0 && `${circleCount} circle invitation${circleCount === 1 ? "" : "s"}`}
            {circleCount > 0 && groupCount > 0 && " · "}
            {groupCount > 0 && `${groupCount} group invitation${groupCount === 1 ? "" : "s"}`}
          </p>
        )}
      </div>

      {feedback && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gold-500/30 bg-gold-500/10 px-4 py-3">
          <div className="flex min-w-0 flex-col gap-1">
            <p className="text-xs font-medium text-gold-200">{feedback}</p>
            {acceptedCircleId && (
              <Link
                to={`/consumer/circles/${acceptedCircleId}`}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-gold-300 transition-colors hover:text-gold-200"
              >
                Open the circle <ArrowRight className="size-3" />
              </Link>
            )}
          </div>
          <button
            type="button"
            onClick={() => {
              setFeedback(null);
              setAcceptedCircleId(null);
            }}
            className="text-xs text-slate-400 hover:text-white"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Pending section */}
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-white">
          Awaiting response ({pending.length})
        </h2>

        {pending.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-ink-900/40 p-6 text-center text-xs text-slate-400">
            No invitations waiting for your response right now.
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {pending.map((invitation) =>
              invitation.circleId ? (
                <PendingCircleInvitation
                  key={invitation.id}
                  invitation={invitation}
                  onAccept={() => handleAcceptCircle(invitation)}
                  onDecline={() => handleDecline(invitation)}
                />
              ) : (
                <PendingGroupInvitation
                  key={invitation.id}
                  invitation={invitation}
                  onDecline={() => handleDecline(invitation)}
                />
              )
            )}
          </div>
        )}
      </section>

      {/* Past section */}
      {past.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-slate-400">
            Responded invitations ({past.length})
          </h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {past.map((invitation) => (
              <div
                key={invitation.id}
                className="flex items-center justify-between rounded-xl border border-white/5 bg-ink-900/30 p-3 text-xs"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-slate-300">
                    {invitation.circleId ? "Circle Invitation" : "Group Invitation"}
                  </p>
                  <p className="text-[10px] text-slate-500">
                    From {invitation.invitedByName}
                  </p>
                </div>
                <Badge variant={invitation.status === "accepted" ? "gold" : "muted"}>
                  {invitation.status}
                </Badge>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function PendingCircleInvitation({
  invitation,
  onAccept,
  onDecline,
}: {
  invitation: Invitation;
  onAccept: () => void;
  onDecline: () => void;
}) {
  const state = useAppState();
  const circle = state.circles.find((entry) => entry.id === invitation.circleId);

  return (
    <div className="rounded-xl border border-gold-500/30 bg-gold-500/5 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <p className="text-sm font-semibold text-white">
              {circle?.config.name ?? "Central Circle"}
            </p>
            <Badge variant="gold">Circle</Badge>
          </div>
          <p className="mt-0.5 text-[11px] text-slate-500">
            Invited by {invitation.invitedByName} · {invitation.createdAt.slice(0, 10)}
          </p>
        </div>
        <Badge variant="warning">Pending</Badge>
      </div>

      {circle?.config.description && (
        <p className="mt-2 text-[11px] leading-relaxed text-slate-400">
          {circle.config.description}
        </p>
      )}

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={onAccept}
          className="inline-flex h-9 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-gold-500 px-4 text-xs font-semibold text-ink-950 transition-colors hover:bg-gold-400"
        >
          <Check className="size-3.5" /> Accept
        </button>
        <button
          type="button"
          onClick={onDecline}
          className="inline-flex h-9 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-4 text-xs font-medium text-slate-300 transition-colors hover:border-white/25 hover:text-white"
        >
          <X className="size-3.5" /> Decline
        </button>
      </div>
    </div>
  );
}

function PendingGroupInvitation({
  invitation,
  onDecline,
}: {
  invitation: Invitation;
  onDecline: () => void;
}) {
  const group = useGroup(invitation.groupId);

  return (
    <div className="rounded-xl border border-white/10 bg-ink-900/60 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <p className="text-sm font-semibold text-white">
              {group?.name ?? invitation.groupId ?? "Group invitation"}
            </p>
            <Badge variant="info">Group</Badge>
          </div>
          <p className="mt-0.5 text-[11px] text-slate-500">
            Invited by {invitation.invitedByName} · {invitation.createdAt.slice(0, 10)}
          </p>
        </div>
        <Badge variant="warning">Pending</Badge>
      </div>

      {group?.purpose && (
        <p className="mt-2 text-[11px] leading-relaxed text-slate-400 line-clamp-2">
          {group.purpose}
        </p>
      )}

      {group && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Badge variant="info">{group.type}</Badge>
          <span className="inline-flex items-center gap-1 text-[10px] text-slate-500">
            <Users className="size-3" /> {group.memberIds.length} members
          </span>
          <span className="text-[10px] text-slate-500">
            {group.pricing === "paid" ? "Paid group" : "Free to join"}
          </span>
        </div>
      )}

      <div className="mt-4 flex gap-2">
        <Link
          to={`/consumer/invitations/${invitation.id}/review`}
          className="inline-flex h-9 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-gold-500 px-4 text-xs font-semibold text-ink-950 transition-colors hover:bg-gold-400"
        >
          <Check className="size-3.5" /> Review &amp; accept
        </Link>
        <button
          type="button"
          onClick={onDecline}
          className="inline-flex h-9 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-4 text-xs font-medium text-slate-300 transition-colors hover:border-white/25 hover:text-white"
        >
          <X className="size-3.5" /> Decline
        </button>
      </div>
      <p className="mt-2 text-[10px] leading-relaxed text-slate-600">
        You will see what this group involves — free or paid, what members can do and what
        happens when you join — before you confirm.
      </p>
    </div>
  );
}
