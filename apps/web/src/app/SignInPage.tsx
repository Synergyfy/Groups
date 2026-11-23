import { useEffect, useState } from "react";
import {
  ArrowRight,
  Info,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import ChsLogo from "../components/ui/ChsLogo";
import { authApi } from "./api";
import {
  destinationForSession,
  readAuthSession,
} from "./authSession";
import { useSessionVerification } from "./useSessionVerification";

export default function SignInPage() {
  useEffect(() => {
    document.title = "Central Hub Solution | Sign In";
  }, []);

  const [searchParams] = useSearchParams();
  const [redirecting, setRedirecting] = useState(false);
  const invitationId = searchParams.get("invitationId");
  const nextParam = searchParams.get("next");
  const errorParam = searchParams.get("error");
  const sessionCheck = useSessionVerification();
  const session = readAuthSession();

  if (sessionCheck === "checking") {
    return (
      <div className="flex min-h-[calc(100vh-57px)] flex-col items-center justify-center gap-4 px-4 py-10">
        <div className="relative flex size-16 items-center justify-center">
          <div className="absolute inset-0 rounded-full border-2 border-gold-500/20 border-t-gold-400 animate-spin" />
          <ShieldCheck className="size-6 text-gold-400" />
        </div>
        <p className="text-xs text-slate-400">Checking your session…</p>
      </div>
    );
  }

  if (sessionCheck === "valid" && session) {
    return <Navigate to={destinationForSession(session)} replace />;
  }

  const next =
    nextParam ??
    (invitationId
      ? `/groups/invitation/${encodeURIComponent(invitationId)}`
      : undefined);

  const handleMcomLogin = () => {
    setRedirecting(true);
    window.location.assign(authApi.mcomLoginUrl(next));
  };

  return (
    <div className="flex min-h-[calc(100vh-57px)] items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-6">
          <ChsLogo size="md" linkTo="/" />
        </div>

        <div className="text-center">
          <h1 className="text-2xl font-bold text-white">Login with CHS</h1>
          <p className="mt-2 text-xs leading-relaxed text-slate-400">
            Sign in securely through MCOM Solutions Central Hub to access your
            groups, invitations, and local communities.
          </p>
        </div>

        {invitationId && (
          <div className="mt-5 rounded-xl border border-gold-500/30 bg-gold-500/10 p-3.5 text-left">
            <div className="flex items-start gap-2.5">
              <Sparkles className="mt-0.5 size-4 shrink-0 text-gold-400" />
              <div>
                <p className="text-xs font-semibold text-gold-200">
                  Invitation Ready
                </p>
                <p className="mt-0.5 text-[11px] text-slate-300">
                  Sign in with Central Hub to continue to your invitation.
                </p>
              </div>
            </div>
          </div>
        )}

        {errorParam && (
          <div className="mt-5 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3.5 text-left">
            <p className="text-xs font-semibold text-rose-200">
              Could not complete sign-in
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-rose-300/90">
              {errorParam}
            </p>
          </div>
        )}

        <div className="mt-6 flex flex-col gap-3">
          <button
            type="button"
            onClick={handleMcomLogin}
            disabled={redirecting}
            className="group flex w-full cursor-pointer items-center gap-4 rounded-xl border border-gold-500/30 bg-gold-500/[0.08] p-4 text-left transition-all hover:border-gold-500/60 hover:bg-gold-500/[0.14] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 disabled:cursor-wait disabled:opacity-70"
          >
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-gold-500/20 text-gold-300 transition-colors group-hover:bg-gold-500/30">
              <ShieldCheck className="size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white">
                {redirecting
                  ? "Connecting to Central Hub..."
                  : "Continue with MCOM Central Hub"}
              </p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-slate-400">
                Single sign-on for business and consumer accounts.
              </p>
            </div>
            <ArrowRight className="size-4 shrink-0 text-gold-400 transition-all group-hover:translate-x-0.5" />
          </button>
        </div>

        <p className="mt-4 text-center text-[11px] text-slate-500">
          <Info className="inline size-3 mr-1 text-slate-500" />
          Authentication is handled by MCOM Solutions Central Hub.
        </p>

        <p className="mt-6 text-center text-xs text-slate-400">
          Don&apos;t have an account?{" "}
          <Link
            to={
              invitationId
                ? `/register?invitationId=${encodeURIComponent(invitationId)}`
                : "/register"
            }
            className="cursor-pointer font-bold text-gold-300 hover:text-gold-200 underline underline-offset-2"
          >
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
