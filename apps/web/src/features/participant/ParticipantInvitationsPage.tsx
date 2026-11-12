import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Check, CircleDot, Mail, Users, X } from "lucide-react";
import Badge from "../../components/ui/Badge";
import Card, { CardBody, CardTitle } from "../../components/ui/Card";
import { useAppState, useCircleTypeMeta, useGroup, useIncomingInvitations } from "../../store/selectors";
import { useAppStore } from "../../store/context";
import type { Invitation } from "../../domain/types";
import { getParticipantIdentity } from "./participantIdentity";

export default function ParticipantInvitationsPage() {
  useEffect(() => {
    document.title = "Groups & Circles | Invitations";
  }, []);

  const identity = getParticipantIdentity();
  const state = useAppState();
  const { dispatch } = useAppStore();
  const invitations = useIncomingInvitations(identity.id);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [acceptedCircleId, setAcceptedCircleId] = useState<string | null>(null);

  const handleAccept = (invitation: Invitation) => {
    dispatch({
      type: "invitation/respond",
      invitationId: invitation.id,
      accept: true,
      responder: { id: identity.id, name: identity.name },
    });
    setAcceptedCircleId(invitation.circleId ?? null);
    setFeedback("You joined the circle");
  };

  const handleDecline = (invitation: Invitation) => {
    dispatch({
      type: "invitation/respond",
      invitationId: invitation.id,
      accept: false,
      responder: { id: identity.id, name: identity.name },
    });
    setAcceptedCircleId(null);
    setFeedback("Invitation declined");
  };

  const pending = invitations.filter(
    (inv) => inv.kind === "invite" && inv.status === "pending"
  );
  const responded = state.invitations.filter(
    (inv) => inv.inviteeId === identity.id && inv.status !== "pending"
  );

  const circleCount = pending.filter((inv) => inv.circleId).length;
  const groupCount = pending.length - circleCount;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-lg font-bold text-white sm:text-xl">Invitations</h1>
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
                to={`/participant/circles/${acceptedCircleId}`}
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
            className="cursor-pointer text-gold-400 hover:text-gold-300"
            aria-label="Dismiss"
          >
            <X className="size-4" />
          </button>
        </div>
      )}

      {/* Pending */}
      {pending.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/15 bg-ink-900/40 p-10 text-center">
          <Mail className="mx-auto size-8 text-slate-600" />
          <p className="mt-3 text-sm font-medium text-slate-400">No pending invitations</p>
          <p className="mx-auto mt-1 max-w-xs text-xs text-slate-500">
            When a business invites you to a circle, the invitation will appear here.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {pending.map((invitation) =>
            invitation.circleId ? (
              <PendingCircleInvitation
                key={invitation.id}
                invitation={invitation}
                onAccept={() => handleAccept(invitation)}
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

      {/* Responded */}
      {responded.length > 0 && (
        <Card>
          <CardBody className="flex flex-col gap-3">
            <CardTitle>Previously responded</CardTitle>
            {responded.map((invitation) => {
              const group = state.groups.find((g) => g.id === invitation.groupId);
              const circle = state.circles.find((c) => c.id === invitation.circleId);
              return (
                <div
                  key={invitation.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-ink-950/60 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-white">
                      {circle?.config.name ?? group?.name ?? invitation.groupId ?? "Invitation"}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      From {invitation.invitedByName}
                      {circle && " · circle"}
                      {group && !circle && " · group"}
                    </p>
                  </div>
                  <Badge
                    variant={
                      invitation.status === "accepted"
                        ? "success"
                        : invitation.status === "declined"
                          ? "danger"
                          : "muted"
                    }
                  >
                    {invitation.status}
                  </Badge>
                </div>
              );
            })}
          </CardBody>
        </Card>
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
  const meta = useCircleTypeMeta(circle?.type ?? "");

  if (!circle) {
    return (
      <div className="rounded-xl border border-white/10 bg-ink-900/60 p-4">
        <p className="text-xs text-slate-400">This circle is no longer available.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gold-500/30 bg-ink-900/60 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <CircleDot className="size-3.5 shrink-0 text-gold-400" />
            <p className="text-sm font-semibold text-white">{circle.config.name}</p>
            <Badge variant="gold">Circle</Badge>
          </div>
          <p className="mt-0.5 text-[11px] text-slate-500">
            Invited by {invitation.invitedByName} · {invitation.createdAt.slice(0, 10)}
          </p>
        </div>
        <Badge variant="warning">Pending</Badge>
      </div>

      <p className="mt-2 text-[11px] leading-relaxed text-slate-400 line-clamp-2">
        {circle.config.description}
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold"
          style={{ backgroundColor: meta.accentSoft, color: meta.accent }}
        >
          {meta.shortLabel}
        </span>
        <span className="inline-flex items-center gap-1 text-[10px] text-slate-500">
          <Users className="size-3" /> {circle.memberIds.length} members
        </span>
        <span className="text-[10px] text-slate-500">{circle.config.duration} days</span>
        <span className="text-[10px] capitalize text-slate-500">{circle.config.visibility}</span>
      </div>

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={onAccept}
          className="inline-flex h-9 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-gold-500 px-4 text-xs font-semibold text-ink-950 transition-colors hover:bg-gold-400"
        >
          <Check className="size-3.5" /> Accept &amp; join circle
        </button>
        <button
          type="button"
          onClick={onDecline}
          className="inline-flex h-9 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-4 text-xs font-medium text-slate-300 transition-colors hover:border-white/25 hover:text-white"
        >
          <X className="size-3.5" /> Decline
        </button>
      </div>
      <p className="mt-2 text-[10px] leading-relaxed text-slate-600">
        Free participants can join any circle they are invited to. You do not need a paid plan to
        accept this invitation.
      </p>
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
          to={`/participant/invitations/${invitation.id}/review`}
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
