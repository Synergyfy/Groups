import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Briefcase, User, ShieldCheck } from "lucide-react";

type DemoRole = "admin" | "business" | "business-invitee" | "consumer";

const DEMO_ACCOUNTS: {
  role: DemoRole;
  label: string;
  description: string;
  destination: string;
  icon: React.ReactNode;
  email: string;
}[] = [
  {
    role: "business",
    label: "Business Owner",
    description: "Register your business and start building groups",
    destination: "/business/groups",
    icon: <Briefcase className="size-5" />,
    email: "owner@business.demo",
  },
  {
    role: "business-invitee",
    label: "Invited Business",
    description: "Accept an invitation to join a business circle",
    destination: "/participant",
    icon: <ArrowRight className="size-5" />,
    email: "invited@business.demo",
  },
  {
    role: "consumer",
    label: "Consumer",
    description: "Join a business circle as an invited customer",
    destination: "/participant",
    icon: <User className="size-5" />,
    email: "consumer@community.demo",
  },
  {
    role: "admin",
    label: "Administrator",
    description: "Access the admin dashboard and configuration",
    destination: "/admin/groups",
    icon: <ShieldCheck className="size-5" />,
    email: "admin@centralhub.demo",
  },
];

export default function GetStartedPage() {
  useEffect(() => {
    document.title = "Groups & Circles | Get Started";
  }, []);

  const navigate = useNavigate();

  const handleDemoRegister = (destination: string, role: DemoRole, email: string) => {
    const authState = { role, authenticated: true, email };
    sessionStorage.setItem("chs-auth-state", JSON.stringify(authState));
    navigate(destination, { replace: true });
  };

  return (
    <div className="flex min-h-[calc(100vh-57px)] items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white">Get Started</h1>
          <p className="mt-2 text-xs leading-relaxed text-slate-400">
            Choose a demo account type to explore the platform.
          </p>
        </div>

        <div className="mt-8 flex flex-col gap-3">
          {DEMO_ACCOUNTS.map((account) => (
            <button
              key={account.role}
              type="button"
              onClick={() => handleDemoRegister(account.destination, account.role, account.email)}
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
          Already have an account?{" "}
          <button
            type="button"
            onClick={() => navigate("/sign-in")}
            className="cursor-pointer font-medium text-gold-400 hover:text-gold-300"
          >
            Sign In
          </button>
        </p>
      </div>
    </div>
  );
}
