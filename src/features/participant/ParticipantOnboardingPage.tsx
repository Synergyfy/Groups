import { useState, useEffect } from "react";
import {
  Building2,
  CheckCircle2,
  ArrowRight,
  Lock,
  Sparkles,
  CreditCard,
} from "lucide-react";
import ChsBusinessVerificationModal from "../../components/ui/ChsBusinessVerificationModal";
import Badge from "../../components/ui/Badge";


export default function ParticipantOnboardingPage() {
  useEffect(() => {
    document.title = "CHS Groups | Business Onboarding";
  }, []);

  const [verifyModalOpen, setVerifyModalOpen] = useState(false);

  const steps = [
    {
      step: 1,
      title: "Group Invitation Accepted",
      description: "You have claimed your invite and have Participant access to invited groups.",
      status: "completed",
    },
    {
      step: 2,
      title: "£1 Identity & Business Verification",
      description: "A quick token verification (£1 refundable authorization) to verify you represent a legitimate UK business.",
      status: "current",
      action: "Start £1 Verification",
    },
    {
      step: 3,
      title: "Complete CHS Business Profile",
      description: "Set your sector, business registration details, and target networking radius.",
      status: "locked",
    },
    {
      step: 4,
      title: "Unlock Full Business Dashboard",
      description: "Create custom groups, initiate Central Circles, manage memberships, and connect with other businesses.",
      status: "locked",
    },
  ];

  return (
    <div className="flex flex-col gap-6 pb-8">
      {/* Top Header */}
      <div>
        <div className="flex items-center gap-2">
          <Building2 className="size-5 text-amber-400" />
          <h1 className="text-xl font-bold text-white sm:text-2xl">Business Onboarding</h1>
          <Badge variant="warning">Action Required</Badge>
        </div>
        <p className="mt-1 text-xs text-slate-400">
          Complete your CHS business onboarding to transition from Participant access to the full CHS Business Dashboard.
        </p>
      </div>

      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-amber-500/40 bg-gradient-to-br from-amber-900/30 via-ink-900/90 to-indigo-900/30 p-6 shadow-xl">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="max-w-xl">
            <span className="rounded-full bg-amber-500/20 px-2.5 py-0.5 text-[11px] font-bold text-amber-300">
              Upgrade to Full Business
            </span>
            <h2 className="mt-2 text-lg font-bold text-white sm:text-xl">
              Unlock the Full CHS Business Platform
            </h2>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-300">
              You are currently connected as an <span className="font-semibold text-amber-200">Invited Business Participant</span>. Complete your £1 identity verification to list your business, create new groups, expand your partner network, and access the Business Dashboard.
            </p>
          </div>

          <div className="shrink-0">
            <button
              id="btn-onboarding-verify"
              type="button"
              onClick={() => setVerifyModalOpen(true)}
              className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-gold-500 px-5 py-3 text-xs font-bold text-ink-950 shadow-lg shadow-amber-500/20 transition-all hover:from-amber-400 hover:to-gold-400 hover:scale-105 active:scale-95"
            >
              <CreditCard className="size-4" /> Start £1 Verification
            </button>
          </div>
        </div>
      </div>

      {/* Step-by-Step Onboarding Roadmap */}
      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-bold text-white">Your Onboarding Roadmap</h3>

        <div className="flex flex-col gap-3">
          {steps.map((item) => {
            const isCompleted = item.status === "completed";
            const isCurrent = item.status === "current";

            return (
              <div
                key={item.step}
                className={`flex flex-col gap-3 rounded-xl border p-4 transition-all sm:flex-row sm:items-center sm:justify-between ${
                  isCompleted
                    ? "border-emerald-500/30 bg-emerald-500/[0.05]"
                    : isCurrent
                    ? "border-amber-500/50 bg-amber-500/[0.08] shadow-md ring-1 ring-amber-500/30"
                    : "border-white/10 bg-ink-900/40 opacity-60"
                }`}
              >
                <div className="flex items-start gap-3.5">
                  <div
                    className={`flex size-9 shrink-0 items-center justify-center rounded-xl font-bold text-xs ${
                      isCompleted
                        ? "bg-emerald-500/20 text-emerald-300"
                        : isCurrent
                        ? "bg-amber-500/20 text-amber-300 ring-1 ring-amber-500/50"
                        : "bg-white/5 text-slate-500"
                    }`}
                  >
                    {isCompleted ? <CheckCircle2 className="size-5" /> : item.step}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-white">{item.title}</p>
                      {isCompleted && (
                        <Badge variant="success">Completed</Badge>
                      )}
                      {isCurrent && (
                        <Badge variant="warning">In Progress</Badge>
                      )}
                      {item.status === "locked" && (
                        <span className="flex items-center gap-1 text-[10px] text-slate-500">
                          <Lock className="size-3" /> Locked
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-slate-400">{item.description}</p>
                  </div>
                </div>

                {isCurrent && (
                  <button
                    type="button"
                    onClick={() => setVerifyModalOpen(true)}
                    className="self-start sm:self-auto inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-amber-500 px-3.5 py-1.5 text-xs font-bold text-ink-950 transition-colors hover:bg-amber-400"
                  >
                    {item.action} <ArrowRight className="size-3" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Access Comparison Grid */}
      <div className="mt-2 flex flex-col gap-3">
        <h3 className="text-sm font-bold text-white">Participant vs Full Business Access</h3>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* Participant Access (Current) */}
          <div className="rounded-2xl border border-white/10 bg-ink-900/60 p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Current Access
              </span>
              <Badge variant="muted">Participant</Badge>
            </div>
            <p className="mt-2 text-sm font-bold text-white">What you can do right now</p>
            <ul className="mt-3 flex flex-col gap-2 text-xs text-slate-300">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-emerald-400 shrink-0" />
                Access groups you were specifically invited to
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-emerald-400 shrink-0" />
                Read group announcements &amp; feeds
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-emerald-400 shrink-0" />
                Participate in discussions &amp; vote on polls
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-emerald-400 shrink-0" />
                View member roster in joined groups
              </li>
            </ul>
          </div>

          {/* Full Business Access (Unlocked after verification) */}
          <div className="rounded-2xl border border-gold-500/30 bg-gradient-to-br from-gold-500/[0.08] to-ink-900/80 p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-gold-400">
                Full Business
              </span>
              <Badge variant="gold">Unlocked via £1 Verification</Badge>
            </div>
            <p className="mt-2 text-sm font-bold text-white">What unlocks with full status</p>
            <ul className="mt-3 flex flex-col gap-2 text-xs text-slate-300">
              <li className="flex items-center gap-2">
                <Sparkles className="size-4 text-gold-400 shrink-0" />
                Create your own Custom, Partner, &amp; Advertising Groups
              </li>
              <li className="flex items-center gap-2">
                <Sparkles className="size-4 text-gold-400 shrink-0" />
                Full Business Dashboard with analytics &amp; member management
              </li>
              <li className="flex items-center gap-2">
                <Sparkles className="size-4 text-gold-400 shrink-0" />
                Invite consumers and other businesses directly
              </li>
              <li className="flex items-center gap-2">
                <Sparkles className="size-4 text-gold-400 shrink-0" />
                Automatic Network Group expansion &amp; CHS Verified badge
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Business Verification Modal */}
      <ChsBusinessVerificationModal
        isOpen={verifyModalOpen}
        onClose={() => setVerifyModalOpen(false)}
      />
    </div>
  );
}
