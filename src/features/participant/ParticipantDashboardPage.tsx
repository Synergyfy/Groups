import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Users,
  Inbox,
  Building2,
  Lock,
  ExternalLink,
  CheckCircle2,
} from "lucide-react";
import Badge from "../../components/ui/Badge";
import {
  selectMyGroups,
  useAppState,
  useIncomingInvitations,
} from "../../store/selectors";
import { getParticipantIdentity } from "./participantIdentity";
import { readParticipantSession } from "../../app/authSession";
import ChsBusinessVerificationModal from "../../components/ui/ChsBusinessVerificationModal";

export default function ParticipantDashboardPage() {
  useEffect(() => {
    document.title = "CHS Groups | Participant Overview";
  }, []);

  const state = useAppState();
  const identity = getParticipantIdentity();
  const invitations = useIncomingInvitations(identity.id);
  const [verifyModalOpen, setVerifyModalOpen] = useState(false);

  const session = readParticipantSession();
  const businessName = session?.businessName || (session?.role === "business-invitee" ? session.name : "Invited Business");
  const city = session?.city || "Birmingham";

  const myGroups = selectMyGroups(state, identity.id).filter(
    (group) => group.ownerId !== "system" || group.memberIds.includes(identity.id)
  );

  const pendingInvites = invitations.filter((inv) => inv.kind === "invite" && inv.status === "pending");

  return (
    <div className="flex flex-col gap-6 pb-8">
      {/* ── BUSINESS INVITEE UPGRADE BANNER ─────────────────────────────── */}
      <div
        className="relative overflow-hidden rounded-2xl border border-amber-500/40 bg-gradient-to-br from-amber-900/30 via-ink-900/80 to-indigo-900/20 p-5 shadow-lg"
        role="alert"
        aria-label="Invited Business – action required"
      >
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-400 via-gold-500 to-indigo-400 rounded-t-2xl" />

        <div className="flex flex-col gap-4 pt-1 sm:flex-row sm:items-start sm:gap-5">
          {/* Icon */}
          <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 ring-1 ring-amber-500/30">
            <Building2 className="size-6 text-amber-300" />
          </div>

          {/* Text */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-bold text-amber-200">Invited Business &bull; Participant Dashboard Access</p>
              <Badge variant="warning">Verification Required</Badge>
            </div>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-300">
              You accepted an invitation and currently have <span className="font-semibold text-amber-200">Participant-level access</span>. Participate in your invited group now — but to unlock the full <span className="font-semibold text-white">CHS Business Dashboard</span> and list your business on the platform, complete the £1 identity verification and onboarding below.
            </p>

            {/* Progress steps */}
            <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-green-500/10 px-2.5 py-1 text-green-300 ring-1 ring-green-500/20">
                <CheckCircle2 className="size-3" /> Invite accepted
              </span>
              <span className="text-slate-600">›</span>
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500/10 px-2.5 py-1 text-amber-300 ring-1 ring-amber-500/20">
                <Lock className="size-3" /> £1 Verification &amp; Onboarding
              </span>
              <span className="text-slate-600">›</span>
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-white/5 px-2.5 py-1 text-slate-500">
                <ExternalLink className="size-3" /> Business Dashboard
              </span>
            </div>
          </div>

          {/* CTA */}
          <div className="shrink-0">
            <button
              id="btn-upgrade-to-business"
              type="button"
              onClick={() => setVerifyModalOpen(true)}
              className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-gold-500 px-4 py-2.5 text-xs font-bold text-ink-950 shadow-md transition-all hover:from-amber-400 hover:to-gold-400 hover:shadow-amber-500/20 active:scale-95"
            >
              Complete £1 Verification <ArrowRight className="size-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Participant Overview Card */}
      <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-gradient-to-r from-ink-900/90 via-ink-900/60 to-amber-500/10 p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Badge variant="warning">Business Participant</Badge>
            <span className="text-xs text-slate-400">&bull; {city}</span>
          </div>
          <Link
            to="/participant/onboarding"
            className="text-xs font-semibold text-amber-400 hover:text-amber-300"
          >
            View Onboarding Guide &rarr;
          </Link>
        </div>

        <div>
          <h1 className="text-xl font-bold text-white sm:text-2xl">
            Welcome, {businessName}
          </h1>
          <p className="mt-1 text-xs text-slate-300">
            You are currently interacting with invited groups under limited Participant permissions.
          </p>
        </div>

        {/* Quick summary stats */}
        <div className="mt-2 grid grid-cols-2 gap-3 border-t border-white/10 pt-3 sm:grid-cols-3">
          <Link
            to="/participant/groups"
            className="flex flex-col rounded-xl bg-white/5 p-3 transition-colors hover:bg-white/10"
          >
            <span className="text-base font-bold text-white">{myGroups.length}</span>
            <span className="text-[11px] text-slate-400">Invited Groups</span>
          </Link>
          <Link
            to="/participant/onboarding"
            className="flex flex-col rounded-xl bg-white/5 p-3 transition-colors hover:bg-white/10"
          >
            <span className="text-base font-bold text-amber-300">Step 2 of 4</span>
            <span className="text-[11px] text-slate-400">Onboarding Status</span>
          </Link>
          <div className="flex flex-col rounded-xl bg-white/5 p-3">
            <span className="text-base font-bold text-slate-300">Participant</span>
            <span className="text-[11px] text-slate-500">Access Level</span>
          </div>
        </div>
      </div>

      {/* Pending Invitations Alert */}
      {pendingInvites.length > 0 && (
        <section className="flex flex-col gap-3 rounded-2xl border border-gold-500/40 bg-gold-500/[0.08] p-4 sm:p-5">
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gold-500/20 text-gold-300">
              <Inbox className="size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-gold-200">
                {pendingInvites.length} invitation{pendingInvites.length === 1 ? "" : "s"} waiting for your response
              </p>
              <p className="text-xs text-gold-300/80">
                Accept invitations to join additional business circles or project groups.
              </p>
            </div>
            <Link
              to="/participant/invitations"
              className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-gold-500 px-3.5 py-2 text-xs font-bold text-ink-950 transition-colors hover:bg-gold-400"
            >
              Review <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </section>
      )}

      {/* Main Content: Invited Groups & Onboarding Action */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column (2 cols): Your Invited Groups */}
        <section className="flex flex-col gap-4 lg:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white">Your Invited Groups</h2>
              <p className="text-xs text-slate-400">
                Groups you can collaborate with as an invited business participant
              </p>
            </div>
            <Link
              to="/participant/groups"
              className="text-xs font-semibold text-amber-400 hover:text-amber-300"
            >
              View all ({myGroups.length}) &rarr;
            </Link>
          </div>

          {myGroups.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-ink-900/50 p-6 text-center">
              <Users className="mx-auto size-8 text-slate-500" />
              <p className="mt-2 text-sm font-semibold text-white">No active invited groups</p>
              <p className="mt-1 text-xs text-slate-400">
                When other businesses invite you to their groups, they will appear here.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {myGroups.map((group) => (
                <div
                  key={group.id}
                  className="flex flex-col justify-between rounded-xl border border-white/10 bg-ink-900/70 p-4 transition-all hover:border-amber-500/30 hover:bg-ink-900"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant="gold">{group.type}</Badge>
                      <span className="text-[10px] text-amber-300/80">Participant Access</span>
                    </div>
                    <Link
                      to={`/participant/groups/${group.id}`}
                      className="mt-2 block font-semibold text-white hover:text-amber-300"
                    >
                      {group.name}
                    </Link>
                    <p className="mt-1 line-clamp-2 text-xs text-slate-400">
                      {group.purpose}
                    </p>
                  </div>

                  <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-2 text-[11px]">
                    <span className="text-slate-500">
                      {group.memberIds.length} members
                    </span>
                    <Link
                      to={`/participant/groups/${group.id}`}
                      className="font-medium text-amber-400 hover:text-amber-300"
                    >
                      Open group &rarr;
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Right Column (1 col): Onboarding Callout Card */}
        <aside className="flex flex-col gap-4">
          <div className="flex flex-col gap-3.5 rounded-2xl border border-amber-500/30 bg-gradient-to-b from-amber-500/[0.08] to-ink-900/60 p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                CHS Business Status
              </span>
              <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
                Pending Verification
              </span>
            </div>

            <div>
              <p className="text-sm font-bold text-white">£1 Verification Required</p>
              <p className="mt-1 text-xs text-slate-300 leading-relaxed">
                Unlock your own Business Dashboard, invite business partners, and create unlimited custom and partner groups.
              </p>
            </div>

            <div className="flex flex-col gap-2 border-t border-amber-500/20 pt-3">
              <button
                type="button"
                onClick={() => setVerifyModalOpen(true)}
                className="w-full rounded-xl bg-gradient-to-r from-amber-500 to-gold-500 py-2.5 text-center text-xs font-bold text-ink-950 transition-all hover:from-amber-400 hover:to-gold-400"
              >
                Verify Business (£1)
              </button>
              <Link
                to="/participant/onboarding"
                className="rounded-xl border border-white/10 bg-white/5 py-2 text-center text-xs font-medium text-slate-300 transition-colors hover:bg-white/10"
              >
                How Verification Works
              </Link>
            </div>
          </div>
        </aside>
      </div>

      {/* Business Verification Modal */}
      <ChsBusinessVerificationModal
        isOpen={verifyModalOpen}
        onClose={() => setVerifyModalOpen(false)}
      />
    </div>
  );
}
