import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import {
  ShieldCheck,
  Briefcase,
  User,
  ArrowRight,
  Sparkles,
  Info,
} from "lucide-react";
import ChsLogo from "../components/ui/ChsLogo";
import ChsAuthTransition from "../components/ui/ChsAuthTransition";
import { writeAuthSession, type AuthRole } from "./authSession";

const DEMO_ACCOUNTS: {
  role: AuthRole;
  label: string;
  description: string;
  destination: string;
  icon: React.ReactNode;
  authLabel: string;
  name: string;
  postcode?: string;
  city?: string;
  sector?: string;
}[] = [
  {
    role: "business",
    label: "Business Owner",
    description: "Manage your groups, circles, and business connections",
    destination: "/business/groups",
    icon: <Briefcase className="size-5" />,
    authLabel: "owner@business.demo",
    name: "Alex Smith",
    postcode: "B1 1AA",
    city: "Birmingham",
    sector: "Retail",
  },
  {
    role: "consumer",
    label: "Consumer Member",
    description: "Access local community circles, groups, and member activities",
    destination: "/consumer",
    icon: <User className="size-5" />,
    authLabel: "consumer@community.demo",
    name: "John Doe",
    postcode: "B1 2AB",
    city: "Birmingham",
  },
  {
    role: "admin",
    label: "Platform Administrator",
    description: "Full access to admin dashboard, configuration, and reports",
    destination: "/admin/groups",
    icon: <ShieldCheck className="size-5" />,
    authLabel: "admin@centralhub.demo",
    name: "CHS Admin",
  },
];

export default function SignInPage() {
  useEffect(() => {
    document.title = "Central Hub Solution | Sign In";
  }, []);

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const invitationId = searchParams.get("invitationId");

  const [transitioning, setTransitioning] = useState(false);
  const [targetDestination, setTargetDestination] = useState<string | null>(null);

  const handleDemoSignIn = (account: (typeof DEMO_ACCOUNTS)[number]) => {
    writeAuthSession({
      role: account.role,
      authenticated: true,
      email: account.authLabel,
      name: account.name,
      accountId: account.authLabel.split("@")[0],
      postcode: account.postcode,
      city: account.city,
      sector: account.sector,
    });

    // Destination based on role:
    // Consumer Member opens consumer dashboard (/consumer)
    // Business Owner opens business dashboard (/business/groups)
    // Admin opens admin dashboard (/admin/groups)
    let dest = account.destination;
    if (account.role === "consumer") {
      dest = "/consumer";
    } else if (account.role === "business") {
      dest = "/business/groups";
    } else if (account.role === "admin") {
      dest = "/admin/groups";
    }

    setTargetDestination(dest);
    setTransitioning(true);
  };

  const handleTransitionComplete = () => {
    if (targetDestination) {
      navigate(targetDestination, { replace: true });
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-57px)] items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        {/* CHS Branding */}
        <div className="flex justify-center mb-6">
          <ChsLogo size="md" linkTo="/" />
        </div>

        <div className="text-center">
          <h1 className="text-2xl font-bold text-white">Login with CHS</h1>
          <p className="mt-2 text-xs leading-relaxed text-slate-400">
            Sign in to access your Central Circle, group invitations, and local communities.
          </p>
        </div>

        {/* Invitation Context Banner */}
        {invitationId && (
          <div className="mt-5 rounded-xl border border-gold-500/30 bg-gold-500/10 p-3.5 text-left">
            <div className="flex items-start gap-2.5">
              <Sparkles className="mt-0.5 size-4 shrink-0 text-gold-400" />
              <div>
                <p className="text-xs font-semibold text-gold-200">
                  Invitation Ready
                </p>
                <p className="mt-0.5 text-[11px] text-slate-300">
                  Choose whether you are signing in as a Business Owner or Consumer Member to access your dashboard.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Account selection list: Business, Consumer, Admin, and Invite Flow Demo */}
        <div className="mt-6 flex flex-col gap-3">
          {DEMO_ACCOUNTS.map((account) => (
            <button
              key={account.role}
              type="button"
              onClick={() => handleDemoSignIn(account)}
              className="group flex w-full cursor-pointer items-center gap-4 rounded-xl border border-white/10 bg-ink-900/70 p-4 text-left transition-all hover:border-gold-500/40 hover:bg-gold-500/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500"
            >
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-gold-500/10 text-gold-400 transition-colors group-hover:bg-gold-500/20">
                {account.icon}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-white">{account.label}</p>
                  {account.city && (
                    <span className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-slate-400">
                      {account.city}
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-[11px] leading-relaxed text-slate-400">
                  {account.description}
                </p>
              </div>
              <ArrowRight className="size-4 shrink-0 text-slate-600 transition-all group-hover:translate-x-0.5 group-hover:text-gold-400" />
            </button>
          ))}

          {/* Invite flow demo page entry */}
          <Link
            to={invitationId ? `/groups/invitation/${encodeURIComponent(invitationId)}` : "/groups/invitation/inv-001"}
            className="group flex w-full cursor-pointer items-center gap-4 rounded-xl border border-gold-500/30 bg-gold-500/[0.06] p-4 text-left transition-all hover:border-gold-500/60 hover:bg-gold-500/[0.12] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500"
          >
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-gold-500/20 text-gold-300 transition-colors group-hover:bg-gold-500/30">
              <Sparkles className="size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-gold-200">Invite Flow (Demo)</p>
                <span className="rounded bg-gold-500/20 px-1.5 py-0.5 text-[10px] font-bold text-gold-300">
                  Recipient Flow
                </span>
              </div>
              <p className="mt-0.5 text-[11px] leading-relaxed text-slate-300">
                Experience the invitation landing flow (choose Consumer or Business and login with CHS)
              </p>
            </div>
            <ArrowRight className="size-4 shrink-0 text-gold-400 transition-all group-hover:translate-x-0.5 group-hover:text-gold-300" />
          </Link>
        </div>

        {/* Demo isolation notice */}
        <p className="mt-4 text-center text-[11px] text-slate-500">
          <Info className="inline size-3 mr-1 text-slate-500" />
          Demonstration login: simulates authentication securely in prototype mode.
        </p>

        {/* Create account prompt */}
        <p className="mt-6 text-center text-xs text-slate-400">
          Don&apos;t have an account?{" "}
          <Link
            to={invitationId ? `/register?invitationId=${encodeURIComponent(invitationId)}` : `/register`}
            className="cursor-pointer font-bold text-gold-300 hover:text-gold-200 underline underline-offset-2"
          >
            Create an account
          </Link>
        </p>
      </div>

      {/* Animated CHS Auth Transition */}
      {transitioning && (
        <ChsAuthTransition
          mode="login"
          onComplete={handleTransitionComplete}
        />
      )}
    </div>
  );
}
