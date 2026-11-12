import { useEffect, useState } from "react";
import { CheckCircle2, Sparkles } from "lucide-react";
import ChsLogo from "./ChsLogo";

export interface ChsAuthTransitionProps {
  mode: "login" | "register";
  onComplete: () => void;
  error?: string | null;
  onRetry?: () => void;
}

export default function ChsAuthTransition({
  mode,
  onComplete,
  error,
  onRetry,
}: ChsAuthTransitionProps) {
  const [stage, setStage] = useState<"processing" | "success">("processing");

  useEffect(() => {
    if (error) return;

    // Check prefers-reduced-motion
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReducedMotion) {
      setStage("success");
      const immediateTimer = setTimeout(() => {
        onComplete();
      }, 400);
      return () => clearTimeout(immediateTimer);
    }

    // Step 1: Processing -> Success state after 1.1s
    const step1Timer = setTimeout(() => {
      setStage("success");
    }, 1100);

    // Step 2: Navigate after showing success message for 800ms
    const step2Timer = setTimeout(() => {
      onComplete();
    }, 1900);

    return () => {
      clearTimeout(step1Timer);
      clearTimeout(step2Timer);
    };
  }, [error, onComplete]);

  const titles = {
    login: {
      processingHeading: "Connecting to Central Hub Solution...",
      processingSupport: "Preparing your groups and invitations.",
      successMessage: "Login successful",
    },
    register: {
      processingHeading: "Setting up your CHS access...",
      processingSupport: "Preparing your community and groups.",
      successMessage: "Account created successfully",
    },
  }[mode];

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/95 px-4 backdrop-blur-md"
    >
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-ink-900/95 p-6 text-center shadow-2xl">
        {/* CHS Logo */}
        <div className="flex justify-center mb-6">
          <ChsLogo size="lg" linkTo="" />
        </div>

        {error ? (
          <div className="flex flex-col items-center gap-3 py-4">
            <div className="flex size-12 items-center justify-center rounded-full bg-rose-500/15 text-rose-400 ring-2 ring-rose-500/30">
              <span className="text-xl font-bold">!</span>
            </div>
            <h3 className="text-sm font-bold text-white">Authentication issue</h3>
            <p className="text-xs text-rose-300/90 leading-relaxed">{error}</p>
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="mt-2 rounded-lg bg-white/10 px-4 py-2 text-xs font-semibold text-white hover:bg-white/15 transition-colors"
              >
                Try again
              </button>
            )}
          </div>
        ) : stage === "processing" ? (
          <div className="flex flex-col items-center gap-4 py-2">
            {/* Circular orbital indicator */}
            <div className="relative flex size-16 items-center justify-center">
              <div className="absolute inset-0 rounded-full border-2 border-gold-500/20 border-t-gold-400 animate-spin" />
              <div className="size-8 rounded-full bg-gold-500/10 flex items-center justify-center">
                <Sparkles className="size-4 text-gold-400 animate-pulse" />
              </div>
            </div>

            <div>
              <h3 className="text-sm font-bold text-white transition-opacity duration-300">
                {titles.processingHeading}
              </h3>
              <p className="mt-1 text-xs text-slate-400">
                {titles.processingSupport}
              </p>
            </div>

            <div className="flex items-center justify-center gap-1.5 pt-2">
              <span className="size-1.5 rounded-full bg-gold-400 animate-ping" />
              <span className="text-[11px] text-slate-500">Secure simulated session</span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 py-2 animate-in fade-in zoom-in-95 duration-200">
            {/* Success state icon */}
            <div className="flex size-16 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400 ring-2 ring-emerald-500/30">
              <CheckCircle2 className="size-8 animate-bounce" />
            </div>

            <div>
              <h3 className="text-base font-bold text-white">
                {titles.successMessage}
              </h3>
              <p className="mt-1 text-xs text-slate-300">
                Redirecting to your Group Access Dashboard...
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
