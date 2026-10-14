import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import {
  Briefcase,
  User,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  ShieldCheck,
  Check,
} from "lucide-react";
import ChsLogo from "../components/ui/ChsLogo";

export default function GetStartedPage() {
  useEffect(() => {
    document.title = "Central Hub Solution | Sign Up with CHS";
  }, []);

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const invitationId = searchParams.get("invitationId");

  const [accountType, setAccountType] = useState<"consumer" | "business">("consumer");
  const [isCreating, setIsCreating] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [countdown, setCountdown] = useState(3);

  const loginDestination = invitationId
    ? `/login?invitationId=${encodeURIComponent(invitationId)}`
    : "/login";

  const handleSignUpWithChs = () => {
    setIsCreating(true);

    // Simulate CHS single sign-on / onboarding provisioning
    setTimeout(() => {
      setIsCreating(false);
      setIsSuccess(true);
    }, 1200);
  };

  // Auto-redirect to login page after success
  useEffect(() => {
    if (!isSuccess) return;

    if (countdown <= 0) {
      navigate(loginDestination, { replace: true });
      return;
    }

    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [isSuccess, countdown, navigate, loginDestination]);

  const handleGoToLogin = () => {
    navigate(loginDestination, { replace: true });
  };

  return (
    <div className="flex min-h-[calc(100vh-57px)] items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        {/* CHS Branding */}
        <div className="mb-6 flex justify-center">
          <ChsLogo size="md" linkTo="/" />
        </div>

        {!isSuccess ? (
          <div className="flex flex-col gap-6 rounded-2xl border border-white/10 bg-ink-900/90 p-6 shadow-2xl backdrop-blur-md sm:p-7">
            {/* Header Titles */}
            <div className="text-center">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-gold-500/15 px-3 py-1 text-xs font-semibold text-gold-300 ring-1 ring-gold-500/30">
                <ShieldCheck className="size-3.5 text-gold-400" /> CHS Single Sign-On
              </span>
              <h1 className="mt-3 text-2xl font-bold text-white">Sign up with CHS</h1>
              <p className="mt-2 text-xs leading-relaxed text-slate-300">
                Central Hub Solution takes care of your verification and onboarding. No lengthy forms needed.
              </p>
            </div>

            {/* Invitation Notice */}
            {invitationId && (
              <div className="rounded-xl border border-gold-500/30 bg-gold-500/10 p-3.5 text-left">
                <div className="flex items-start gap-2.5">
                  <Sparkles className="mt-0.5 size-4 shrink-0 text-gold-400" />
                  <div>
                    <p className="text-xs font-semibold text-gold-200">
                      Joining via Invitation
                    </p>
                    <p className="mt-0.5 text-[11px] text-slate-300">
                      Your invitation is preserved and will link automatically upon sign-in.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Account Type Selector */}
            <div className="flex flex-col gap-2">
              <span className="text-xs font-semibold text-slate-300">
                Select your member profile:
              </span>
              <div className="grid grid-cols-2 gap-2 rounded-xl border border-white/10 bg-ink-950/70 p-1.5">
                <button
                  type="button"
                  onClick={() => setAccountType("consumer")}
                  className={`flex items-center justify-center gap-2 rounded-lg py-2.5 text-xs font-semibold transition-all ${
                    accountType === "consumer"
                      ? "border border-gold-500/40 bg-gold-500/20 text-gold-300 shadow-sm"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <User className="size-4" /> Consumer
                </button>
                <button
                  type="button"
                  onClick={() => setAccountType("business")}
                  className={`flex items-center justify-center gap-2 rounded-lg py-2.5 text-xs font-semibold transition-all ${
                    accountType === "business"
                      ? "border border-gold-500/40 bg-gold-500/20 text-gold-300 shadow-sm"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <Briefcase className="size-4" /> Business Owner
                </button>
              </div>
            </div>

            {/* Benefits summary callout */}
            <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3.5 text-left">
              <p className="text-[11px] font-semibold text-slate-300">
                {accountType === "consumer"
                  ? "Consumer Member access includes:"
                  : "Business Owner access includes:"}
              </p>
              <ul className="mt-2 flex flex-col gap-1.5 text-[11px] text-slate-400">
                <li className="flex items-center gap-2">
                  <Check className="size-3 text-gold-400" />
                  {accountType === "consumer"
                    ? "Instant access to local community circles and joined groups"
                    : "Create, manage, and scale business groups and network circles"}
                </li>
                <li className="flex items-center gap-2">
                  <Check className="size-3 text-gold-400" />
                  CHS manages all identity verification and privacy compliance
                </li>
                <li className="flex items-center gap-2">
                  <Check className="size-3 text-gold-400" />
                  Single sign-on across the entire Central Hub ecosystem
                </li>
              </ul>
            </div>

            {/* Sign up with CHS Button */}
            <div className="flex flex-col gap-3">
              <button
                type="button"
                id="btn-signup-chs"
                onClick={handleSignUpWithChs}
                disabled={isCreating}
                className="group relative flex w-full cursor-pointer items-center justify-center gap-2.5 overflow-hidden rounded-xl bg-gradient-to-r from-gold-500 via-amber-400 to-gold-500 py-3 text-center text-sm font-bold text-ink-950 shadow-lg shadow-gold-500/20 transition-all hover:brightness-105 active:scale-[0.98] disabled:opacity-75"
              >
                {isCreating ? (
                  <>
                    <svg className="size-4 animate-spin text-ink-950" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    <span>Connecting to CHS...</span>
                  </>
                ) : (
                  <>
                    <span>Sign up with CHS</span>
                    <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                  </>
                )}
              </button>

              <div className="text-center">
                <span className="text-xs text-slate-400">Already have an account? </span>
                <Link
                  to={loginDestination}
                  className="text-xs font-semibold text-gold-400 hover:text-gold-300 hover:underline"
                >
                  Log in
                </Link>
              </div>
            </div>
          </div>
        ) : (
          /* Success Screen */
          <div className="flex flex-col items-center gap-5 rounded-2xl border border-emerald-500/40 bg-gradient-to-b from-ink-900/95 via-ink-900/90 to-emerald-950/20 p-7 text-center shadow-2xl backdrop-blur-md">
            {/* Animated Check Icon */}
            <div className="flex size-16 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-400 ring-2 ring-emerald-500/40">
              <CheckCircle2 className="size-9" />
            </div>

            <div>
              <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-300">
                Central Hub Solution
              </span>
              <h2 className="mt-2 text-xl font-bold text-white sm:text-2xl">
                Account created successfully!
              </h2>
              <p className="mt-2 text-xs leading-relaxed text-slate-300">
                Your CHS account has been provisioned. Central Hub Solution takes care of the onboarding. Please log in to access your dashboard.
              </p>
            </div>

            {/* Account Details confirmation box */}
            <div className="w-full rounded-xl border border-white/10 bg-ink-950/70 p-3.5 text-left text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Account Type</span>
                <span className="font-semibold text-gold-300 capitalize">
                  {accountType === "business" ? "Business Owner" : "Consumer Member"}
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between border-t border-white/5 pt-2">
                <span className="text-slate-400">Status</span>
                <span className="inline-flex items-center gap-1 font-semibold text-emerald-400">
                  <span className="size-1.5 rounded-full bg-emerald-400" /> Ready to Log In
                </span>
              </div>
            </div>

            {/* Action Button & Auto-redirect countdown */}
            <div className="flex w-full flex-col gap-2.5">
              <button
                type="button"
                id="btn-goto-login"
                onClick={handleGoToLogin}
                className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-gold-500 py-3 text-sm font-bold text-ink-950 transition-all hover:bg-gold-400 active:scale-[0.98]"
              >
                <span>Log In Now</span>
                <ArrowRight className="size-4" />
              </button>

              <p className="text-[11px] text-slate-400">
                Redirecting you to the login page in <span className="font-bold text-white">{countdown}</span> seconds...
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
