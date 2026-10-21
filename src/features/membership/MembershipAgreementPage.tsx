import { useMemo, useState } from "react";
import {
  Check,
  CheckCircle2,
  Crown,
  FileSignature,
  Lock,
  ShieldCheck,
  Users,
} from "lucide-react";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Card, { CardBody, CardTitle } from "../../components/ui/Card";
import { MEMBERSHIP_PLANS } from "../../data/membershipPlans";
import type { MembershipPlan } from "../../domain/types";
import { TIERS_ORDERED } from "../../domain/types";
import { useAppStore } from "../../store/context";

/**
 * Access agreement gate. A paid membership or access fee must be settled —
 * and the agreement accepted — before the business dashboard can be entered at
 * all, and before any mandatory group can be activated. The plan the business
 * picks here decides its group-creation rights and its recruitment threshold.
 */
export default function MembershipAgreementPage() {
  const { state, dispatch } = useAppStore();
  const rules = state.adminConfig.groupCreationRules;

  const activePlans = useMemo(
    () => MEMBERSHIP_PLANS.filter((plan) => plan.status === "Active"),
    []
  );
  const [selectedPlanId, setSelectedPlanId] = useState("plan-platinum-pro-plus");
  const [agreed, setAgreed] = useState(false);

  const selected = activePlans.find((plan) => plan.id === selectedPlanId);
  const eligible = (plan: MembershipPlan) =>
    rules.allowedTiers.includes(plan.tier) && rules.allowedVariants.includes(plan.variant);

  const canSubmit = Boolean(selected) && agreed;

  const submit = () => {
    if (!selected || !canSubmit) return;
    dispatch({
      type: "membership/activate",
      tier: selected.tier,
      variant: selected.variant,
      planName: selected.name,
      accessDays: rules.entryAccessDays,
      accessFee: rules.entryAccessFee,
    });
  };

  return (
    <div className="flex min-h-screen flex-col items-center bg-ink-950 px-4 py-8 sm:py-12">
      <div className="flex w-full max-w-5xl flex-col gap-5">
        <header className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="flex size-9 items-center justify-center rounded-xl border border-gold-500/40 bg-gold-500/10 text-gold-400">
              <FileSignature className="size-5" />
            </span>
            <h1 className="text-lg font-bold text-white sm:text-xl">
              Paid Access Agreement
            </h1>
          </div>
          <p className="max-w-3xl text-xs leading-relaxed text-slate-400 sm:text-sm">
            A paid membership or access fee is required before dashboard entry and before any
            mandatory group can be activated. Choose your membership, pay the {rules.entryAccessDays}-day
            access fee, and accept the agreement to continue.
          </p>
        </header>

        {/* --- Entry access model ---------------------------------------- */}
        <Card>
          <CardBody className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-xl border border-white/10 bg-ink-950 text-gold-400">
                <ShieldCheck className="size-5" />
              </span>
              <div>
                <CardTitle>Entry access model</CardTitle>
                <p className="mt-0.5 text-[11px] text-slate-400">
                  Administrators have set a {rules.entryAccessDays}-day paid access period for
                  dashboard entry.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="info">{rules.entryAccessDays}-day access</Badge>
              <span className="text-xl font-bold text-white">
                £{rules.entryAccessFee}
                <span className="ml-1 text-xs font-normal text-slate-400">
                  per {rules.entryAccessDays} days
                </span>
              </span>
            </div>
          </CardBody>
        </Card>

        {/* --- Plan picker ------------------------------------------------ */}
        <section className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-white">Choose your membership</h2>
            <span className="text-[11px] text-slate-400">
              Your membership decides whether you can create groups and how many members your
              groups need before they activate.
            </span>
          </div>

          <div className="flex flex-col gap-4">
            {TIERS_ORDERED.map((tier) => {
              const tierPlans = activePlans.filter((plan) => plan.tier === tier);
              if (tierPlans.length === 0) return null;
              return (
                <div key={tier} className="flex flex-col gap-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    {tier} tier
                  </p>
                  <div className="grid gap-2 sm:grid-cols-3">
                    {tierPlans.map((plan) => {
                      const selectedCard = plan.id === selectedPlanId;
                      const canCreate = eligible(plan);
                      const target =
                        rules.recruitmentTargets[plan.tier][plan.variant];
                      return (
                        <button
                          key={plan.id}
                          type="button"
                          onClick={() => setSelectedPlanId(plan.id)}
                          className={`flex flex-col gap-2 rounded-xl border p-3 text-left transition-colors ${
                            selectedCard
                              ? "border-gold-500/60 bg-gold-500/10"
                              : "border-white/10 bg-ink-900/70 hover:border-white/25"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="flex items-center gap-1.5 text-sm font-semibold text-white">
                              <Crown className="size-3.5 text-gold-400" />
                              {plan.name}
                            </span>
                            {selectedCard ? (
                              <CheckCircle2 className="size-4 shrink-0 text-gold-400" />
                            ) : (
                              <span className="size-4 shrink-0 rounded-full border border-white/20" />
                            )}
                          </div>
                          <span className="text-xs text-slate-400">
                            {plan.priceMonthly === 0 ? "Free" : `£${plan.priceMonthly}`} / month
                            plan
                          </span>
                          <div className="mt-auto flex flex-wrap gap-1.5">
                            {canCreate ? (
                              <Badge variant="success">Creates groups</Badge>
                            ) : (
                              <Badge variant="muted">Joins platform group</Badge>
                            )}
                            <Badge variant={target <= 2 ? "success" : "warning"}>
                              Recruit {target}
                            </Badge>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* --- Agreement --------------------------------------------------- */}
        <Card>
          <CardBody className="flex flex-col gap-4">
            <div className="flex items-center gap-2 border-b border-white/10 pb-3">
              <Lock className="size-5 text-gold-400" />
              <div>
                <CardTitle>What you are agreeing to</CardTitle>
                <p className="text-xs text-slate-400">
                  These rules are configured by administrators and apply from the moment you enter
                  the dashboard.
                </p>
              </div>
            </div>

            <ul className="flex flex-col gap-2 text-xs leading-relaxed text-slate-300">
              {[
                `Pay the £${rules.entryAccessFee} ${rules.entryAccessDays}-day access fee before entering the dashboard. Payment and this agreement are required first — no exceptions.`,
                rules.allowedTiers.length > 0 && rules.allowedVariants.length > 0
                  ? `Only ${rules.allowedTiers.flatMap((t) => rules.allowedVariants.map((v) => `${t} ${v}`)).join(", ")} memberships may create groups. Every other membership is placed into the platform group set by administrators.`
                  : "No membership may currently create groups — every member is placed into the platform group set by administrators.",
                "Groups stay non-functional until they reach the recruitment threshold set for your membership (Bronze ~6 recruits, Platinum ~2).",
                "Head start groups are provided pre-populated but incomplete — you recruit the remaining members to activate them.",
              ].map((text) => (
                <li key={text} className="flex items-start gap-2">
                  <Check className="mt-0.5 size-3.5 shrink-0 text-gold-400" />
                  <span>{text}</span>
                </li>
              ))}
            </ul>

            <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-white/10 bg-ink-950/60 p-3">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(event) => setAgreed(event.target.checked)}
                className="mt-0.5 size-4 accent-gold-500"
              />
              <span className="text-xs leading-relaxed text-slate-300">
                I accept the paid membership agreement and the administrator's group rules, and I
                understand that the access fee covers {rules.entryAccessDays} days of dashboard
                access.
              </span>
            </label>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="flex items-center gap-1.5 text-[11px] text-slate-400">
                <Users className="size-3.5" />
                {selected
                  ? `${selected.name} selected · £${rules.entryAccessFee} access fee due now`
                  : "Select a membership to continue"}
              </p>
              <Button variant="primary" size="md" disabled={!canSubmit} onClick={submit}>
                <CheckCircle2 className="size-4" />
                Pay £{rules.entryAccessFee} &amp; enter dashboard
              </Button>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
