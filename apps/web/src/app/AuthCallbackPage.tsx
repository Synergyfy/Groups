import { useEffect, useRef, useState } from "react";
import { AlertTriangle, LoaderCircle, ShieldCheck } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import ChsLogo from "../components/ui/ChsLogo";
import { authApi, ApiError, errorMessage } from "./api";
import {
  destinationForSession,
  sessionFromApiUser,
  writeAuthSession,
} from "./authSession";

interface CallbackError {
  message: string;
  upgradeUrl?: string;
}

export default function AuthCallbackPage() {
  useEffect(() => {
    document.title = "Central Hub Solution | Signing In";
  }, []);

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const missingCode = !code || !state;
  const [error, setError] = useState<CallbackError | null>(() =>
    missingCode
      ? {
          message:
            searchParams.get("error_description") ??
            "Central Hub did not return an authorization code.",
        }
      : null,
  );
  const started = useRef(false);

  useEffect(() => {
    if (started.current) {
      return;
    }
    started.current = true;

    if (missingCode || !code || !state) {
      return;
    }

    authApi
      .mcomCallback(code, state)
      .then((result) => {
        const session = sessionFromApiUser(result.user);
        writeAuthSession(session);
        navigate(
          result.redirectTo || destinationForSession(session),
          { replace: true },
        );
      })
      .catch((requestError) => {
        setError({
          message: errorMessage(requestError),
          upgradeUrl:
            requestError instanceof ApiError
              ? readUpgradeUrl(requestError.body)
              : undefined,
        });
      });
  }, [code, missingCode, navigate, state]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-950 px-4 py-10">
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-ink-900/95 p-6 text-center shadow-2xl">
        <div className="mb-6 flex justify-center">
          <ChsLogo size="lg" linkTo="" />
        </div>

        {error ? (
          <div className="flex flex-col items-center gap-3">
            <div className="flex size-12 items-center justify-center rounded-full bg-rose-500/15 text-rose-300 ring-2 ring-rose-500/30">
              <AlertTriangle className="size-6" />
            </div>
            <h1 className="text-sm font-bold text-white">
              Sign-in could not be completed
            </h1>
            <p className="text-xs leading-relaxed text-rose-200/90">
              {error.message}
            </p>
            {error.upgradeUrl && (
              <a
                href={error.upgradeUrl}
                className="rounded-xl border border-gold-500/30 bg-gold-500/10 px-4 py-2 text-xs font-semibold text-gold-200 transition-colors hover:bg-gold-500/20"
              >
                Manage membership in Central Hub
              </a>
            )}
            <Link
              to="/login"
              className="mt-1 rounded-xl bg-gold-500 px-4 py-2 text-xs font-bold text-ink-950 transition-colors hover:bg-gold-400"
            >
              Return to sign in
            </Link>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <div className="relative flex size-16 items-center justify-center">
              <div className="absolute inset-0 rounded-full border-2 border-gold-500/20 border-t-gold-400 animate-spin" />
              <ShieldCheck className="size-6 text-gold-400" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-white">
                Verifying your Central Hub session
              </h1>
              <p className="mt-1 text-xs text-slate-400">
                Exchanging your authorization code and checking entitlements...
              </p>
            </div>
            <LoaderCircle className="size-4 animate-spin text-gold-400" />
          </div>
        )}
      </div>
    </div>
  );
}

function readUpgradeUrl(body: unknown): string | undefined {
  if (!body || typeof body !== "object" || !("upgradeUrl" in body)) {
    return undefined;
  }

  const value = (body as { upgradeUrl?: unknown }).upgradeUrl;
  return typeof value === "string" ? value : undefined;
}
