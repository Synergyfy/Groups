import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Building2,
  Check,
  CheckCircle2,
  CreditCard,
  Lock,
  ShieldCheck,
  Sparkles,
  X,
  ArrowRight,
  Loader2,
} from "lucide-react";
import ChsAuthTransition from "./ChsAuthTransition";
import { readAuthSession, writeAuthSession } from "../../app/authSession";

const SECTORS = [
  "Retail & Wholesale",
  "Professional Services",
  "Food & Hospitality",
  "Technology & Software",
  "Creative & Media",
  "Health & Wellbeing",
  "Construction & Trades",
  "Finance & Insurance",
  "Other Business",
];

interface ChsBusinessVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function ChsBusinessVerificationModal({
  isOpen,
  onClose,
  onSuccess,
}: ChsBusinessVerificationModalProps) {
  const navigate = useNavigate();
  const currentSession = readAuthSession();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [businessName, setBusinessName] = useState(
    currentSession?.businessName || currentSession?.name || "Smith Business Ltd"
  );
  const [sector, setSector] = useState(currentSession?.sector || SECTORS[0]);
  const [postcode, setPostcode] = useState(currentSession?.postcode || "B1 1AA");
  const [city, setCity] = useState(currentSession?.city || "Birmingham");

  // Payment state for Step 2
  const cardNumber = "•••• •••• •••• 4242";
  const expiry = "12/28";
  const cvc = "•••";
  const [isAuthorizing, setIsAuthorizing] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);

  // Step 3 Terms
  const [agreedTerms, setAgreedTerms] = useState(true);
  const [transitioning, setTransitioning] = useState(false);

  if (!isOpen) return null;

  const handleStep1Submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessName.trim()) return;
    setStep(2);
  };

  const handleAuthorize1Gbp = () => {
    setIsAuthorizing(true);
    setTimeout(() => {
      setIsAuthorizing(false);
      setIsAuthorized(true);
      setTimeout(() => {
        setStep(3);
      }, 900);
    }, 1200);
  };

  const handleCompleteOnboarding = () => {
    // Write full verified business session
    writeAuthSession({
      role: "business",
      authenticated: true,
      email: currentSession?.email || "owner@business.demo",
      name: currentSession?.name || "Business Owner",
      businessName: businessName.trim(),
      accountId: currentSession?.accountId || "owner",
      postcode: postcode.trim().toUpperCase(),
      city: city.trim(),
      sector,
      verifiedBusiness: true,
    });

    setTransitioning(true);
  };

  const handleTransitionComplete = () => {
    if (onSuccess) {
      onSuccess();
    }
    navigate("/business/groups", { replace: true });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-gold-500/30 bg-ink-900 shadow-2xl">
        {/* Modal Top Gold Accent Line */}
        <div className="h-1.5 w-full bg-gradient-to-r from-gold-500 via-amber-400 to-emerald-400" />

        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-white/10 p-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex size-6 items-center justify-center rounded-lg bg-gold-500/20 text-gold-300">
                <Sparkles className="size-3.5" />
              </span>
              <p className="text-xs font-bold text-gold-300 uppercase tracking-wider">
                CHS Business Onboarding
              </p>
            </div>
            <h2 className="mt-1 text-lg font-bold text-white">
              {step === 1 && "1. Verify Business Trading Details"}
              {step === 2 && "2. £1.00 Nominal Identity Verification"}
              {step === 3 && "3. Complete Network Onboarding"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-lg p-1 text-slate-400 hover:text-white"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Progress Stepper */}
        <div className="flex items-center justify-between border-b border-white/5 bg-ink-950/60 px-6 py-2.5 text-xs">
          <div className="flex items-center gap-2">
            <span
              className={`flex size-5 items-center justify-center rounded-full text-[10px] font-bold ${
                step >= 1 ? "bg-gold-500 text-ink-950" : "bg-white/10 text-slate-400"
              }`}
            >
              1
            </span>
            <span className={step >= 1 ? "text-white font-medium" : "text-slate-500"}>
              Profile
            </span>
          </div>
          <div className="h-px w-8 bg-white/10" />
          <div className="flex items-center gap-2">
            <span
              className={`flex size-5 items-center justify-center rounded-full text-[10px] font-bold ${
                step >= 2 ? "bg-gold-500 text-ink-950" : "bg-white/10 text-slate-400"
              }`}
            >
              2
            </span>
            <span className={step >= 2 ? "text-white font-medium" : "text-slate-500"}>
              £1 Verification
            </span>
          </div>
          <div className="h-px w-8 bg-white/10" />
          <div className="flex items-center gap-2">
            <span
              className={`flex size-5 items-center justify-center rounded-full text-[10px] font-bold ${
                step === 3 ? "bg-gold-500 text-ink-950" : "bg-white/10 text-slate-400"
              }`}
            >
              3
            </span>
            <span className={step === 3 ? "text-white font-medium" : "text-slate-500"}>
              Onboard
            </span>
          </div>
        </div>

        {/* Step 1: Business Profile */}
        {step === 1 && (
          <form onSubmit={handleStep1Submit} className="flex flex-col gap-4 p-6">
            <p className="text-xs text-slate-300 leading-relaxed">
              To upgrade from an invited participant to a full verified business, confirm your organization details for the Central Hub register.
            </p>

            <div className="flex flex-col gap-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-300">
                  Business / Trading Name
                </label>
                <div className="relative">
                  <Building2 className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    required
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="e.g. Smith Business Ltd"
                    className="w-full rounded-xl border border-white/10 bg-ink-950 py-2.5 pl-9 pr-3 text-xs text-white placeholder-slate-500 outline-none focus:border-gold-500"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-300">
                  Business Industry Sector
                </label>
                <select
                  value={sector}
                  onChange={(e) => setSector(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-ink-950 px-3 py-2.5 text-xs text-white outline-none focus:border-gold-500"
                >
                  {SECTORS.map((s) => (
                    <option key={s} value={s} className="bg-ink-900 text-white">
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-300">
                    City / Area
                  </label>
                  <input
                    type="text"
                    required
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="e.g. Birmingham"
                    className="w-full rounded-xl border border-white/10 bg-ink-950 px-3 py-2.5 text-xs text-white outline-none focus:border-gold-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-300">
                    Postcode
                  </label>
                  <input
                    type="text"
                    required
                    value={postcode}
                    onChange={(e) => setPostcode(e.target.value)}
                    placeholder="e.g. B1 1AA"
                    className="w-full rounded-xl border border-white/10 bg-ink-950 px-3 py-2.5 text-xs text-white uppercase outline-none focus:border-gold-500"
                  />
                </div>
              </div>
            </div>

            <div className="mt-2 flex items-center justify-between border-t border-white/10 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-white/10 px-4 py-2 text-xs font-medium text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-xl bg-gold-500 px-5 py-2 text-xs font-bold text-ink-950 transition-colors hover:bg-gold-400"
              >
                Continue to Verification <ArrowRight className="size-3.5" />
              </button>
            </div>
          </form>
        )}

        {/* Step 2: 1 GBP Verification */}
        {step === 2 && (
          <div className="flex flex-col gap-4 p-6">
            <div className="rounded-xl border border-gold-500/30 bg-gold-500/10 p-3.5">
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 size-5 shrink-0 text-gold-400" />
                <div>
                  <p className="text-xs font-bold text-gold-200">
                    Nominal £1.00 Identity Authorization
                  </p>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-slate-300">
                    Central Hub Solution verifies genuine businesses via a £1.00 nominal authorization to establish anti-fraud compliance and verified merchant identity.
                  </p>
                </div>
              </div>
            </div>

            {/* Payment Summary Box */}
            <div className="flex flex-col gap-3 rounded-xl border border-white/10 bg-ink-950/70 p-4">
              <div className="flex items-center justify-between border-b border-white/5 pb-2 text-xs">
                <span className="text-slate-400">CHS Business Verification</span>
                <span className="font-bold text-white">£1.00 GBP</span>
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-medium text-slate-400">
                  Verification Card
                </label>
                <div className="relative">
                  <CreditCard className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    value={cardNumber}
                    readOnly
                    className="w-full rounded-lg border border-white/10 bg-ink-900 py-2 pl-9 pr-3 text-xs text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="mb-1 block text-[11px] text-slate-400">Expires</label>
                  <input
                    type="text"
                    value={expiry}
                    readOnly
                    className="w-full rounded-lg border border-white/10 bg-ink-900 px-3 py-2 text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] text-slate-400">Security CVC</label>
                  <input
                    type="text"
                    value={cvc}
                    readOnly
                    className="w-full rounded-lg border border-white/10 bg-ink-900 px-3 py-2 text-xs text-white font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-500">
              <Lock className="size-3 text-emerald-400" />
              <span>256-bit encrypted authentication &bull; Instant verification</span>
            </div>

            <div className="mt-2 flex items-center justify-between border-t border-white/10 pt-4">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="rounded-xl border border-white/10 px-4 py-2 text-xs font-medium text-slate-400 hover:text-white"
              >
                &larr; Back
              </button>

              <button
                type="button"
                onClick={handleAuthorize1Gbp}
                disabled={isAuthorizing || isAuthorized}
                className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-gold-500 px-5 py-2.5 text-xs font-bold text-ink-950 transition-colors hover:bg-gold-400 disabled:opacity-50"
              >
                {isAuthorizing ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" /> Verifying £1.00...
                  </>
                ) : isAuthorized ? (
                  <>
                    <Check className="size-4 text-ink-950" /> £1.00 Verified!
                  </>
                ) : (
                  <>Authorize £1.00 &amp; Verify Identity</>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Complete Onboarding */}
        {step === 3 && (
          <div className="flex flex-col gap-4 p-6">
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-center">
              <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                <CheckCircle2 className="size-7" />
              </div>
              <h3 className="mt-3 text-sm font-bold text-emerald-200">
                £1.00 Business Verification Complete
              </h3>
              <p className="mt-1 text-xs text-emerald-300/80">
                {businessName} has been authenticated as a verified business entity on Central Hub Solution.
              </p>
            </div>

            <div className="rounded-xl border border-white/10 bg-ink-950/60 p-4 text-xs text-slate-300">
              <p className="font-semibold text-white">Your Full Business Access Unlocked:</p>
              <ul className="mt-2 flex flex-col gap-1.5 text-slate-400">
                <li className="flex items-center gap-2">
                  <Check className="size-3.5 text-gold-400" />
                  <span>Access the Main Business Dashboard &amp; Network Groups</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="size-3.5 text-gold-400" />
                  <span>Create custom business groups and host commercial circles</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="size-3.5 text-gold-400" />
                  <span>Connect with B2B trade partners and manage members</span>
                </li>
              </ul>
            </div>

            <label className="flex items-start gap-3 rounded-xl border border-white/10 bg-ink-950/40 p-3 text-xs text-slate-400 cursor-pointer">
              <input
                type="checkbox"
                checked={agreedTerms}
                onChange={(e) => setAgreedTerms(e.target.checked)}
                className="mt-0.5 size-4 accent-gold-500"
              />
              <span>
                I confirm I am an authorized representative of <strong className="text-white">{businessName}</strong> and agree to the CHS Business Ecosystem Charter.
              </span>
            </label>

            <div className="mt-2 border-t border-white/10 pt-4 text-right">
              <button
                type="button"
                onClick={handleCompleteOnboarding}
                disabled={!agreedTerms}
                className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-gold-500 px-6 py-2.5 text-xs font-bold text-ink-950 transition-colors hover:bg-gold-400 disabled:opacity-40"
              >
                Complete Onboarding &amp; Enter Business Dashboard <ArrowRight className="size-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Transition Animation to Main Business Dashboard */}
      {transitioning && (
        <ChsAuthTransition
          mode="login"
          onComplete={handleTransitionComplete}
        />
      )}
    </div>
  );
}
