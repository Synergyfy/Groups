import { useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Users, ChevronRight, Mail, Inbox, Sparkles } from "lucide-react";
import Badge from "../../components/ui/Badge";
import { useCircleTypeMeta, useCircles, useIncomingInvitations } from "../../store/selectors";
import { getParticipantIdentity } from "./participantIdentity";

export default function ParticipantDashboardPage() {
  useEffect(() => {
    document.title = "Groups & Circles | My Circles";
  }, []);

  const identity = getParticipantIdentity();
  const circles = useCircles();
  const invitations = useIncomingInvitations(identity.id);

  const myCircles = circles.filter((circle) => circle.memberIds.includes(identity.id));

  const pendingInvites = invitations.filter((inv) => inv.kind === "invite");
  const pendingCircles = pendingInvites.filter((inv) => inv.circleId);
  const pendingGroups = pendingInvites.length - pendingCircles.length;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-lg font-bold text-white sm:text-xl">My Circles</h1>
        <p className="mt-1 text-xs text-slate-400">
          Circles you have joined, plus anything still waiting for your answer.
        </p>
        <p className="mt-0.5 text-[11px] text-slate-500">
          {myCircles.length} joined · {pendingInvites.length} awaiting your response
        </p>
      </div>

      {/* Pending invitations */}
      {pendingInvites.length > 0 && (
        <section className="flex flex-col gap-2 rounded-2xl border border-gold-500/30 bg-gold-500/[0.07] p-4">
          <div className="flex items-center gap-3">
            <Inbox className="size-5 shrink-0 text-gold-400" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-gold-200">
                {pendingInvites.length} invitation{pendingInvites.length === 1 ? "" : "s"} waiting
                for you
              </p>
              <p className="text-[11px] text-gold-300/70">
                {pendingCircles.length > 0 &&
                  `${pendingCircles.length} circle${pendingCircles.length === 1 ? "" : "s"}`}
                {pendingCircles.length > 0 && pendingGroups > 0 && " · "}
                {pendingGroups > 0 && `${pendingGroups} group${pendingGroups === 1 ? "" : "s"}`} —
                accept to join, or decline to pass
              </p>
            </div>
            <Link
              to="/participant/invitations"
              className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-gold-500/40 bg-gold-500/10 px-3 py-2 text-[11px] font-semibold text-gold-200 transition-colors hover:bg-gold-500/20"
            >
              Review <ArrowRight className="size-3" />
            </Link>
          </div>

          <ul className="flex flex-col gap-1.5 border-t border-gold-500/20 pt-2.5">
            {pendingInvites.slice(0, 4).map((invitation) => {
              const circle = invitation.circleId
                ? circles.find((entry) => entry.id === invitation.circleId)
                : undefined;
              const group = invitation.groupId;
              return (
                <li key={invitation.id}>
                  <Link
                    to="/participant/invitations"
                    className="flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-white/5"
                  >
                    <span className="min-w-0 truncate text-[11px] text-slate-300">
                      {circle?.config.name ?? group ?? "Invitation"}
                    </span>
                    <span className="flex shrink-0 items-center gap-1.5">
                      <Badge variant={invitation.circleId ? "gold" : "info"}>
                        {invitation.circleId ? "Circle" : "Group"}
                      </Badge>
                      <ChevronRight className="size-3 text-slate-600" />
                    </span>
                  </Link>
                </li>
              );
            })}
            {pendingInvites.length > 4 && (
              <li className="px-2 text-[10px] text-slate-500">
                +{pendingInvites.length - 4} more
              </li>
            )}
          </ul>
        </section>
      )}

      {/* My circles */}
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-semibold text-white">Joined circles</h2>
        <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-slate-300">
          {myCircles.length}
        </span>
      </div>

      {myCircles.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/15 bg-ink-900/40 p-10 text-center">
          <Mail className="mx-auto size-8 text-slate-600" />
          <p className="mt-3 text-sm font-medium text-slate-400">No circles yet</p>
          <p className="mx-auto mt-1 max-w-xs text-xs text-slate-500">
            When a business invites you to a circle, it will appear here once you accept.
          </p>
          {pendingInvites.length > 0 && (
            <Link
              to="/participant/invitations"
              className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-gold-300 hover:text-gold-200"
            >
              Review your pending invitations <ArrowRight className="size-3" />
            </Link>
          )}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {myCircles.map((circle) => (
            <CircleCard key={circle.id} circleId={circle.id} />
          ))}
        </div>
      )}

      {/* Info */}
      <div className="rounded-xl border border-white/10 bg-ink-900/40 p-4">
        <p className="text-[11px] leading-relaxed text-slate-500">
          You are accessing Groups &amp; Circles as a free {identity.role === "consumer" ? "consumer" : "participant"} invited by a business.
          You can view and interact with the circles you have been invited to. Creating your own
          circles requires a paid plan.
        </p>
      </div>
    </div>
  );
}

function CircleCard({ circleId }: { circleId: string }) {
  const circles = useCircles();
  const meta = useCircleTypeMeta(circles.find((c) => c.id === circleId)?.type ?? "");
  const circle = circles.find((c) => c.id === circleId);
  if (!circle) return null;

  return (
    <Link
      to={`/participant/circles/${circle.id}`}
      className="group rounded-xl border border-white/10 bg-ink-900/60 p-4 transition-all hover:border-gold-500/30"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white group-hover:text-gold-200">
            {circle.config.name}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-500">
            {meta.shortLabel}
          </p>
        </div>
        <ChevronRight className="size-4 shrink-0 text-slate-600 transition-all group-hover:translate-x-0.5 group-hover:text-gold-400" />
      </div>
      <p className="mt-2 line-clamp-2 text-[11px] leading-relaxed text-slate-400">
        {circle.config.description}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1 text-[10px] text-slate-500">
          <Users className="size-3" /> {circle.memberIds.length} members
        </span>
        <span className="inline-flex items-center gap-1 text-[10px] text-slate-500">
          <Sparkles className="size-3" /> {circle.config.duration}-day campaign
        </span>
      </div>
    </Link>
  );
}
