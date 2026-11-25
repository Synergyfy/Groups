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
import type { LucideIcon } from "lucide-react";
import ChsLogo from "../components/ui/ChsLogo";
import { authApi } from "./api";

type AccountType = "business" | "customer";

interface AccountOption {
  id: AccountType;
  title: string;
  description: string;
  icon: LucideIcon;
  /** Where the visitor lands inside this app once Central Hub signs them in. */
  destination: string;
}

const ACCOUNT_OPTIONS: AccountOption[] = [
  {
    id: "business",
    title: "Sign up as a Business",
    description:
      "Register your company, invite your team and run your groups & circles.",
    icon: Briefcase,
    destination: "/business/groups",
  },
  {
    id: "customer",
    title: "Sign up as a Customer",
    description:
      "Create a personal account to join circles, communities and local groups.",
    icon: User,
    destination: "/consumer",
  },
];

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

  const registerHref = (option: AccountOption) => {
    const next =
      option.id === "business" && invitationId
        ? "/business/invitations"
        : option.destination;
    return authApi.mcomRegisterUrl(option.id, next);
  };

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
              Choose how you want to join. Registration is completed on MCOM
              Solutions Central Hub, and Groups &amp; Circles never stores a
              separate password for business or consumer accounts.
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

          <div className="flex flex-col gap-3">
            <p className="text-center text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              How would you like to sign up?
            </p>

            {ACCOUNT_OPTIONS.map((option) => {
              const Icon = option.icon;
              return (
                <a
                  key={option.id}
                  id={`btn-signup-${option.id}-chs`}
                  href={registerHref(option)}
                  className="group flex items-start gap-3 rounded-xl border border-white/10 bg-ink-950/70 p-4 text-left transition-all hover:border-gold-500/60 hover:bg-gold-500/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500"
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-gold-500/15 text-gold-300 transition-colors group-hover:bg-gold-500/25">
                    <Icon className="size-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-white">
                      {option.title}
                    </span>
                    <span className="mt-0.5 block text-[11px] leading-relaxed text-slate-400">
                      {option.description}
                    </span>
                  </span>
                  <ArrowRight className="mt-2 size-4 shrink-0 text-gold-400 transition-transform group-hover:translate-x-0.5" />
                </a>
              );
            })}
          </div>

          <ul className="flex flex-col gap-1.5 text-[11px] text-slate-400">
            {BENEFITS.map((benefit) => (
              <li key={benefit} className="flex items-start gap-2">
                <Check className="mt-0.5 size-3 shrink-0 text-gold-400" />
                {benefit}
              </li>
            ))}
          </ul>

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
  );
}
