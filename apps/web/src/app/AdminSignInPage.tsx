import { useEffect, useState, type FormEvent } from "react";
import {
  ArrowRight,
  LoaderCircle,
  LockKeyhole,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import ChsLogo from "../components/ui/ChsLogo";
import { authApi, errorMessage } from "./api";
import {
  readAuthSession,
  sessionFromApiUser,
  writeAuthSession,
} from "./authSession";
import { useSessionVerification } from "./useSessionVerification";

export default function AdminSignInPage() {
  useEffect(() => {
    document.title = "Central Hub Solution | Administrator Sign In";
  }, []);

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const nextParam = searchParams.get("next");
  const next =
    nextParam?.startsWith("/") && !nextParam.startsWith("//")
      ? nextParam
      : "/admin/groups";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const sessionCheck = useSessionVerification();
  const session = readAuthSession();

  if (sessionCheck === "checking") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink-950 px-4 py-10">
        <div className="flex flex-col items-center gap-4">
          <div className="relative flex size-16 items-center justify-center">
            <div className="absolute inset-0 rounded-full border-2 border-gold-500/20 border-t-gold-400 animate-spin" />
            <LoaderCircle className="size-6 text-gold-400" />
          </div>
          <p className="text-xs text-slate-400">Checking your session…</p>
        </div>
      </div>
    );
  }

  if (sessionCheck === "valid" && session?.role === "admin") {
    return <Navigate to={next} replace />;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!email.trim() || !password) {
      setError("Enter your administrator email and password.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const result = await authApi.adminLogin(email.trim(), password);
      writeAuthSession(sessionFromApiUser(result.user));
      navigate(result.redirectTo || next, { replace: true });
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-950 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-6">
          <ChsLogo size="md" linkTo="/" />
        </div>

        <div className="rounded-2xl border border-white/10 bg-ink-900/80 p-6 shadow-2xl shadow-black/40">
          <div className="text-center">
            <div className="mx-auto mb-3 flex size-11 items-center justify-center rounded-xl bg-gold-500/15 text-gold-300">
              <ShieldCheck className="size-5" />
            </div>
            <h1 className="text-xl font-bold text-white">
              Administrator sign-in
            </h1>
            <p className="mt-2 text-xs leading-relaxed text-slate-400">
              This portal is restricted to platform administrators. All other
              accounts must sign in through MCOM Central Hub.
            </p>
          </div>

          {error && (
            <div
              role="alert"
              className="mt-5 flex items-start gap-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-left"
            >
              <ShieldAlert className="mt-0.5 size-4 shrink-0 text-rose-300" />
              <p className="text-[11px] leading-relaxed text-rose-200">
                {error}
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                Administrator email
              </span>
              <input
                type="email"
                autoComplete="username"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="admin@247gbs.local"
                className="rounded-xl border border-white/10 bg-ink-950 px-3.5 py-2.5 text-sm text-white outline-none transition-colors placeholder:text-slate-600 focus:border-gold-500/50 focus:ring-2 focus:ring-gold-500/20"
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                Password
              </span>
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter your password"
                className="rounded-xl border border-white/10 bg-ink-950 px-3.5 py-2.5 text-sm text-white outline-none transition-colors placeholder:text-slate-600 focus:border-gold-500/50 focus:ring-2 focus:ring-gold-500/20"
              />
            </label>

            <button
              type="submit"
              disabled={submitting}
              className="mt-1 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-gold-500 px-4 py-2.5 text-sm font-bold text-ink-950 transition-colors hover:bg-gold-400 disabled:cursor-wait disabled:opacity-70"
            >
              <LockKeyhole className="size-4" />
              {submitting ? "Signing in..." : "Sign in as administrator"}
            </button>
          </form>

          <div className="mt-5 border-t border-white/10 pt-4">
            <Link
              to="/login"
              className="group flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-3 transition-colors hover:border-gold-500/30 hover:bg-gold-500/[0.06]"
            >
              <span>
                <span className="block text-xs font-semibold text-white">
                  Not an administrator?
                </span>
                <span className="mt-0.5 block text-[11px] text-slate-400">
                  Continue with MCOM Central Hub SSO.
                </span>
              </span>
              <ArrowRight className="size-4 shrink-0 text-slate-500 transition-transform group-hover:translate-x-0.5 group-hover:text-gold-300" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
