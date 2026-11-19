import { useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  Briefcase,
  Check,
  ShieldCheck,
  Sparkles,
  User,
} from "lucide-react";
import ChsLogo from "../components/ui/ChsLogo";

const BENEFITS = [
  "Central Hub Solution manages identity verification, billing and privacy compliance",
  "One secure account across every Central Hub service",
  "Business accounts choose a plan after Central Hub onboarding",
];

export default function GetStartedPage() {
  useEffect(() => {
    document.title = "Central Hub Solution | Create an account";
  }, []);

  const [searchParams] = useSearchParams();
  const invitationId = searchParams.get("invitationId");
  const next = invitationId
    ? `/business/invitations`
    : "/business/groups";
  const registerHref = `/api/auth/mcom/register?next=${encodeURIComponent(next)}`;
  const loginHref = invitationId
    ? `/login?invitationId=${encodeURIComponent(invitationId)}`
    : "/login";

  return (
    <div className="flex min-h-[calc(100vh-57px)] items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <ChsLogo size="md" linkTo="/" />
        </div>

        <div className="flex flex-col gap-6 rounded-2xl border border-white/10 bg-ink-900/90 p-6 shadow-2xl backdrop-blur-md sm:p-7">
          <div className="text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-gold-500/15 px-3 py-1 text-xs font-semibold text-gold-300 ring-1 ring-gold-500/30">
              <ShieldCheck className="size-3.5 text-gold-400" /> CHS Single Sign-On
            </span>
            <h1 className="mt-3 text-2xl font-bold text-white">
              Create your Central Hub account
            </h1>
            <p className="mt-2 text-xs leading-relaxed text-slate-300">
              Registration is completed on MCOM Solutions Central Hub. Groups &amp;
              Circles never stores a separate password for business or consumer
              accounts.
            </p>
          </div>

          {invitationId && (
            <div className="rounded-xl border border-gold-500/30 bg-gold-500/10 p-3.5 text-left">
              <div className="flex items-start gap-2.5">
                <Sparkles className="mt-0.5 size-4 shrink-0 text-gold-400" />
                <div>
                  <p className="text-xs font-semibold text-gold-200">
                    Joining via Invitation
                  </p>
                  <p className="mt-0.5 text-[11px] text-slate-300">
                    Your invitation is preserved while Central Hub creates your
                    account, and you are returned here afterwards.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 rounded-xl border border-white/10 bg-ink-950/70 p-1.5">
            <div className="flex items-center justify-center gap-2 rounded-lg py-2.5 text-xs font-semibold text-gold-300">
              <User className="size-4" /> Consumer
            </div>
            <div className="flex items-center justify-center gap-2 rounded-lg py-2.5 text-xs font-semibold text-gold-300">
              <Briefcase className="size-4" /> Business Owner
            </div>
          </div>

          <ul className="flex flex-col gap-1.5 text-[11px] text-slate-400">
            {BENEFITS.map((benefit) => (
              <li key={benefit} className="flex items-start gap-2">
                <Check className="mt-0.5 size-3 shrink-0 text-gold-400" />
                {benefit}
              </li>
            ))}
          </ul>

          <div className="flex flex-col gap-3">
            <a
              href={registerHref}
              id="btn-signup-chs"
              className="group relative flex w-full items-center justify-center gap-2.5 rounded-xl bg-gradient-to-r from-gold-500 via-amber-400 to-gold-500 py-3 text-center text-sm font-bold text-ink-950 shadow-lg shadow-gold-500/20 transition-all hover:brightness-105 active:scale-[0.98]"
            >
              <span>Continue to Central Hub registration</span>
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </a>

            <div className="text-center">
              <span className="text-xs text-slate-400">
                Already have an account?{" "}
              </span>
              <Link
                to={loginHref}
                className="text-xs font-semibold text-gold-400 hover:text-gold-300 hover:underline"
              >
                Sign in with Central Hub
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
