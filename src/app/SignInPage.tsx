import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ShieldCheck,
  Briefcase,
  UserPlus,
  User,
  ArrowRight,
} from "lucide-react";
type DemoRole = "admin" | "business" | "business-invitee" | "consumer";

const DEMO_ACCOUNTS: {
  role: DemoRole;
  label: string;
  description: string;
  destination: string;
  icon: React.ReactNode;
  authLabel: string;
}[] = [
  {
    role: "admin",
    label: "Administrator",
    description: "Full access to admin dashboard, configuration, and reports",
    destination: "/admin/groups",
    icon: <ShieldCheck className="size-5" />,
    authLabel: "admin@centralhub.demo",
  },
  {
    role: "business",
    label: "Business Owner",
    description: "Manage your groups, circles, and business connections",
    destination: "/business/groups",
    icon: <Briefcase className="size-5" />,
    authLabel: "owner@business.demo",
  },
  {
    role: "business-invitee",
    label: "Invited Business",
    description: "A business invited to join circles — free participant access",
    destination: "/participant",
    icon: <UserPlus className="size-5" />,
    authLabel: "invited@business.demo",
  },
  {
    role: "consumer",
    label: "Consumer",
    description: "Individual consumer invited to a business circle",
    destination: "/participant",
    icon: <User className="size-5" />,
    authLabel: "consumer@community.demo",
  },
];

export default function SignInPage() {
  useEffect(() => {
    document.title = "Groups & Circles | Sign In";
  }, []);

  const navigate = useNavigate();

  const handleDemoSignIn = (destination: string, role: DemoRole) => {
    const authState = {
      role,
      authenticated: true,
      email: DEMO_ACCOUNTS.find((a) => a.role === role)?.authLabel,
    };
    sessionStorage.setItem("chs-auth-state", JSON.stringify(authState));
    navigate(destination, { replace: true });
  };

  return (
    <div className="flex min-h-[calc(100vh-57px)] items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white">Sign In</h1>
          <p className="mt-2 text-xs leading-relaxed text-slate-400">
            Choose a demo account to explore the platform.
          </p>
        </div>

        <div className="mt-8 flex flex-col gap-3">
          {DEMO_ACCOUNTS.map((account) => (
            <button
              key={account.role}
              type="button"
              onClick={() => handleDemoSignIn(account.destination, account.role)}
              className="group flex w-full cursor-pointer items-center gap-4 rounded-xl border border-white/10 bg-ink-900/60 px-4 py-4 text-left transition-all hover:border-gold-500/40 hover:bg-gold-500/[0.04] focus-visible:outline-2 focus-visible:outline-gold-500"
            >
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-gold-500/10 text-gold-400 transition-colors group-hover:bg-gold-500/20">
                {account.icon}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-white">{account.label}</p>
                <p className="mt-0.5 text-[11px] leading-relaxed text-slate-400">
                  {account.description}
                </p>
              </div>
              <ArrowRight className="size-4 shrink-0 text-slate-600 transition-all group-hover:translate-x-0.5 group-hover:text-gold-400" />
            </button>
          ))}
        </div>

        <p className="mt-6 text-center text-[11px] text-slate-500">
          Don&apos;t have an account?{" "}
          <button
            type="button"
            onClick={() => navigate("/get-started")}
            className="cursor-pointer font-medium text-gold-400 hover:text-gold-300"
          >
            Get Started
          </button>
        </p>
      </div>
    </div>
  );
}
