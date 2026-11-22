import { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Check,
  CheckCircle2,
  Crown,
  Lock,
  ShieldCheck,
  Users,
} from "lucide-react";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Card, { CardBody, CardTitle } from "../../components/ui/Card";
import Tabs from "../../components/ui/Tabs";
import type { Plan, PlanVariant } from "../../domain/types";
import { PLAN_VARIANTS, PLAN_VARIANT_ACCESS_DAYS, accessDaysLabel, planAccessLabel } from "../../domain/types";
import { useAppState } from "../../store/selectors";
import { errorMessage } from "../../app/api";
import { businessApi, useBusinessData } from "../../business/BusinessDataProvider";
import {
  creationRightsCombos,
  planCanCreateGroups,
  planRecruitmentTarget,
} from "../groups/groupUtils";
import PaymentDialog, {
  type PaymentTarget,
} from "../payments/PaymentDialog";

const VARIANT_META: Record<PlanVariant, { tagline: string }> = {
  Standard: { tagline: "Core tools to launch and run your groups." },
  Pro: { tagline: "More reach, campaigns and collaboration tools." },
  "Pro+": { tagline: "The full commercial toolkit with the highest limits." },
};

/**
 * Access agreement gate. A paid plan or access fee must be settled —
 * and the agreement accepted — before the business dashboard can be entered at
 * all, and before any mandatory group can be activated. The plan the business
 * picks here decides its group-creation rights and its recruitment threshold.
 */
export default function PlanPage() {
  const state = useAppState();
  const navigate = useNavigate();
  const business = useBusinessData();
  const rules = business.plan?.rules ?? state.adminConfig.groupCreationRules;
  const [now] = useState(() => Date.now());
  const accessExpired =
    state.plan.status === "Expired" ||
    (state.plan.accessExpiresAt
      ? new Date(state.plan.accessExpiresAt).getTime() <= now
      : false);
  const hasActivePlan = state.plan.status === "Active" && !accessExpired;
  const centralAccess =
    state.plan.accessSource !== undefined &&
    state.plan.accessSource !== "local";
  const entered =
    hasActivePlan &&
    (centralAccess ||
      (state.plan.agreementAccepted &&
        (!rules.requirePaidAccess || state.plan.paid)));

  const configuredPlans = useMemo(
    () => business.plan?.plans ?? [],
    [business.plan]
  );
  const activePlans = useMemo(() => {
    const configured = configuredPlans.filter((plan) => plan.status === "Active");
    return configured;
  }, [configuredPlans]);
  const [variant, setVariant] = useState<PlanVariant>(
    entered ? state.plan.variant : "Standard"
  );
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(() =>
    entered
      ? (configuredPlans.find(
          (plan) =>
            plan.status === "Active" &&
            plan.name === state.plan.planName &&
            plan.variant === state.plan.variant
        )?.id ?? null)
      : null
  );
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const plansRef = useRef<HTMLElement>(null);
  const scrollToPlans = () =>
    plansRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  const variantPlans = useMemo(
    () =>
      activePlans
        .filter((plan) => plan.variant === variant)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [activePlans, variant]
  );
  const countsByVariant = useMemo(() => {
    const counts: Record<PlanVariant, number> = { Standard: 0, Pro: 0, "Pro+": 0 };
    activePlans.forEach((plan) => {
      counts[plan.variant] += 1;
    });
    return counts;
  }, [activePlans]);

  const defaultPlanId = variantPlans[0]?.id ?? null;
  const effectivePlanId = selectedPlanId ?? defaultPlanId;
  const selected =
    activePlans.find((plan) => plan.id === effectivePlanId) ?? variantPlans[0];
  const selectedVariant = selected?.variant ?? variant;
  const selectedPrice = selected?.priceMonthly ?? 0;
  const selectedPriceMinor = selected?.priceMinor ?? 0;
  const selectedAccessDays = PLAN_VARIANT_ACCESS_DAYS[selectedVariant];
  const selectedAccessLabel = planAccessLabel(selectedVariant);
  const eligible = (plan: Plan) =>
    planCanCreateGroups(rules, plan.name, plan.variant);
  const creationCombos = creationRightsCombos(rules);

  // A plan bought directly here is superior to a Central Hub membership/pass,
  // so the business can always upgrade or renew locally. The local plan then
  // stays in force until it expires, after which Central Hub access resumes if
  // it is still active.
  const canSubmit = Boolean(selected) && agreed;

  const selectVariant = (next: string) => {
    const nextVariant = next as PlanVariant;
    setVariant(nextVariant);
    const first = activePlans
      .filter((plan) => plan.variant === nextVariant)
      .sort((a, b) => a.name.localeCompare(b.name))[0];
    setSelectedPlanId(first?.id ?? null);
  };

  const completePlan = async () => {
    await business.refresh();
    navigate("/business/groups", { replace: true });
  };

  const submit = async () => {
    if (!selected || !canSubmit || submitting) return;
    setFeedback(null);

    if (rules.requirePaidAccess && selectedPriceMinor > 0) {
      setPaymentOpen(true);
      return;
    }

    setSubmitting(true);
    try {
      const persisted = configuredPlans.some((plan) => plan.id === selected.id);
      await businessApi.activatePlan({
        ...(persisted ? { planId: selected.id } : {}),
        variant: selected.variant,
        planName: selected.name,
        accessDays: selectedAccessDays,
        accessFee: selectedPrice,
        agreementAccepted: true,
      });
      await completePlan();
    } catch (cause) {
      setFeedback(errorMessage(cause));
    } finally {
      setSubmitting(false);
    }
  };

  const paymentTarget: PaymentTarget | null = selected
    ? {
        kind: "PLAN",
        planId: selected.id,
        planName: selected.name,
        amountPounds: selectedPriceMinor / 100,
        agreementAccepted: true,
        onPaid: completePlan,
      }
    : null;

  return (
    <div className="flex w-full flex-col items-center">
      <div className="flex w-full max-w-5xl flex-col gap-5">
        <header className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="flex size-9 items-center justify-center rounded-xl border border-gold-500/40 bg-gold-500/10 text-gold-400">
              <Crown className="size-5" />
            </span>
            <h1 className="text-lg font-bold text-white sm:text-xl">
              Choose your plan
            </h1>
          </div>
          <p className="max-w-3xl text-xs leading-relaxed text-slate-400 sm:text-sm">
            A paid plan or access fee is required before dashboard entry and before any
            mandatory group can be activated. Pick your plan, pay the access fee, and accept the
            agreement to continue.
          </p>
        </header>

        {centralAccess && hasActivePlan && (
          <div className="rounded-2xl border border-sky-500/30 bg-sky-500/10 px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-semibold text-white">
                {state.plan.accessSource === "membership"
                  ? `Included in your ${state.plan.membershipName ?? "Central Hub"} membership`
                  : state.plan.accessSource === "access_pass"
                    ? `Central Hub access pass${
                        state.plan.externalPlanId
                          ? ` · ${state.plan.externalPlanId}`
                          : ""
                      }`
                    : `Central Hub trial${
                        state.plan.trialDaysRemaining !== undefined
                          ? ` · ${state.plan.trialDaysRemaining} day${
                              state.plan.trialDaysRemaining === 1 ? "" : "s"
                            } left`
                          : ""
                      }`}
              </p>
              {state.plan.accessExpiresAt && (
                <Badge variant="info">
                  Expires {formatDate(state.plan.accessExpiresAt)}
                </Badge>
              )}
            </div>
            <p className="mt-1 text-[11px] leading-relaxed text-slate-300">
              {state.plan.planName ?? "Central Hub plan"}
              {state.plan.externalPlanId
                ? ` · plan ${state.plan.externalPlanId}`
                : ""}
              . Central Hub keeps this access active. You can still buy a plan
              directly here — a locally purchased plan takes priority until it
              expires, then this Central Hub access resumes.
            </p>
            {state.plan.programmeTasks && state.plan.programmeTasks.length > 0 && (
              <ul className="mt-2 space-y-1">
                {state.plan.programmeTasks.map((task) => (
                  <li
                    key={task.taskId}
                    className="flex items-start gap-2 text-[11px] text-slate-300"
                  >
                    <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-sky-400" />
                    <span>
                      <span className="font-semibold text-white">
                        {task.title}
                      </span>
                      {task.description ? ` — ${task.description}` : ""}
                      {task.status ? ` (${task.status})` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {!hasActivePlan && (centralAccess || state.plan.upgradeUrl) && (
          <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3">
            <p className="text-xs font-semibold text-white">
              Central Hub access is not active
            </p>
            <p className="mt-0.5 text-[11px] leading-relaxed text-slate-300">
              {state.plan.accessReason
                ? state.plan.accessReason.replaceAll("_", " ").toLowerCase()
                : "Your membership, pass or trial no longer grants access."}
              {state.plan.upgradeUrl
                ? " Renew it in Central Hub, or buy a plan directly here in Groups."
                : " Buy a plan directly here in Groups to continue."}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {state.plan.upgradeUrl && (
                <a
                  href={state.plan.upgradeUrl}
                  className="inline-block rounded-xl border border-gold-500/30 bg-gold-500/10 px-3 py-1.5 text-[11px] font-semibold text-gold-200 hover:bg-gold-500/20"
                >
                  Manage membership in Central Hub
                </a>
              )}
              <Button variant="primary" size="sm" onClick={scrollToPlans}>
                <Crown className="size-3.5" />
                Buy a plan in Groups
              </Button>
            </div>
          </div>
        )}

        {!entered && (
          <div className="rounded-2xl border border-gold-500/30 bg-gold-500/[0.08] px-4 py-3">
            <p className="text-xs font-semibold text-white">
              {hasActivePlan
                ? "Complete access activation to continue"
                : "Choose and activate a plan to continue"}
            </p>
            <p className="mt-0.5 text-[11px] leading-relaxed text-slate-300">
              The rest of the business dashboard is locked until you have an active
              plan{hasActivePlan ? "" : " and an accepted access agreement"}. If you
              already paid, your plan may have expired — choose a plan to renew it.
            </p>
          </div>
        )}

        {entered && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-success-500/30 bg-success-500/10 px-4 py-3">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="size-4 shrink-0 text-success-400" />
              <div>
                <p className="text-xs font-semibold text-white">Your plan is active</p>
                <p className="text-[11px] text-slate-400">
                  {state.plan.planName || "Plan"} · {state.plan.variant} ·{" "}
                  {accessDaysLabel(state.plan.accessDays)} access
                </p>
              </div>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate("/business/groups")}
            >
              Back to dashboard
            </Button>
          </div>
        )}

        {/* --- Entry access model ---------------------------------------- */}
        <Card>
          <CardBody className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-xl border border-white/10 bg-ink-950 text-gold-400">
                <ShieldCheck className="size-5" />
              </span>
              <div>
                <CardTitle>Plan access</CardTitle>
                <p className="mt-0.5 text-[11px] text-slate-400">
                  Access length is set by your plan: Standard 90 days, Pro 180 days, Pro+ 1 year.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="info">{selectedAccessLabel} access</Badge>
              <span className="text-xl font-bold text-white">
                £{selectedPrice}
                <span className="ml-1 text-xs font-normal text-slate-400">access fee</span>
              </span>
            </div>
          </CardBody>
        </Card>

        {/* --- Plan picker ------------------------------------------------ */}
        <section ref={plansRef} className="flex scroll-mt-24 flex-col gap-3">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold text-white">Choose your plan</h2>
              <p className="mt-1 max-w-2xl text-[11px] text-slate-400">
                Your plan decides whether you can create groups and how many members your
                groups need before they activate. Choose a variant, then pick the plan that fits
                your business.
              </p>
            </div>
            {selected && (
              <span className="text-[11px] text-slate-400">
                Selected:{" "}
                <span className="font-semibold text-gold-300">
                  {selected.name} {selected.variant}
                </span>
              </span>
            )}
          </div>

          <Tabs
            value={variant}
            onChange={selectVariant}
            items={PLAN_VARIANTS.map((item) => ({
              id: item,
              label: item,
              count: countsByVariant[item],
            }))}
          />

          <p className="text-[11px] text-slate-400">{VARIANT_META[variant].tagline}</p>

          {variantPlans.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/15 bg-ink-900/60 px-4 py-10 text-center">
              <Crown className="mx-auto size-5 text-slate-500" />
              <p className="mt-2 text-sm font-semibold text-white">
                No {variant} plans available
              </p>
              <p className="mt-1 text-xs text-slate-400">
                There are no {variant} plans published right now. Choose another tab or contact the
                administrator.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[repeat(auto-fit,minmax(210px,1fr))]">
              {variantPlans.map((plan) => {
                const selectedCard = plan.id === selected?.id;
                const canCreate = eligible(plan);
                const target = planRecruitmentTarget(rules, plan.name, plan.variant);
                const features = plan.features.filter((feature) => feature.trim().length > 0);
                const planFeatures =
                  features.length > 0
                    ? features
                    : [
                        plan.groupQuota >= 999 ? "Unlimited groups" : `${plan.groupQuota} groups`,
                        plan.circleQuota >= 999
                          ? "Unlimited circles"
                          : `${plan.circleQuota} circles`,
                        plan.revenueSharePercent > 0
                          ? `${plan.revenueSharePercent}% revenue share`
                          : "Community access",
                      ];
                const period = planAccessLabel(plan.variant);

                return (
                  <button
                    key={plan.id}
                    type="button"
                    onClick={() => setSelectedPlanId(plan.id)}
                    aria-pressed={selectedCard}
                    className={`group relative flex h-full flex-col overflow-hidden rounded-2xl border p-4 text-left transition-all ${
                      selectedCard
                        ? "border-gold-500 bg-gold-500/5 shadow-sm ring-1 ring-gold-500/30"
                        : "border-white/10 bg-ink-900 hover:border-gold-500/40 hover:shadow-sm"
                    }`}
                  >
                    <span className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-gold-500/10 to-transparent" />

                    <div className="relative flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1 rounded-full border border-gold-500/40 bg-gold-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gold-300">
                        <Crown className="size-3" />
                        {plan.name}
                      </span>
                      <span
                        className={`flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors ${
                          selectedCard
                            ? "border-gold-500 bg-gold-500 text-ink-950"
                            : "border-white/20 text-transparent"
                        }`}
                      >
                        <Check className="size-3" strokeWidth={3} />
                      </span>
                    </div>

                    <h3 className="relative mt-3 text-sm font-bold text-white">
                      {plan.name} {plan.variant}
                    </h3>

                    <div className="relative mt-1.5 flex items-baseline gap-1">
                      <span className="text-2xl font-bold tracking-tight text-white">
                        {plan.priceMonthly === 0 ? "Free" : `£${plan.priceMonthly}`}
                      </span>
                    </div>
                    <p className="relative mt-0.5 text-[10px] text-slate-500">
                      {period} access
                    </p>

                    <ul className="relative mt-3 flex flex-1 flex-col gap-1.5">
                      {planFeatures.map((feature, index) => (
                        <li
                          key={`${feature}-${index}`}
                          className="flex items-start gap-1.5 text-[11px] leading-snug text-slate-300"
                        >
                          <Check className="mt-px size-3 shrink-0 text-success-400" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>

                    <div className="relative mt-3 flex flex-wrap gap-1.5 border-t border-white/10 pt-3">
                      {canCreate ? (
                        <Badge variant="success">Creates groups</Badge>
                      ) : (
                        <Badge variant="muted">Joins platform group</Badge>
                      )}
                      {target > 0 && (
                        <Badge variant={target <= 2 ? "success" : "warning"}>
                          Recruit {target}
                        </Badge>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
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
                `Pay the £${selectedPrice} access fee before entering the dashboard. Payment and this agreement are required first — no exceptions.`,
                creationCombos.length > 0
                  ? `Only ${creationCombos.map(({ planName, variant }) => `${planName} ${variant}`).join(", ")} plans may create groups. Every other plan is placed into the platform group set by administrators.`
                  : "No plan may currently create groups — every member is placed into the platform group set by administrators.",
                "Groups stay non-functional until they reach the recruitment threshold set for your plan.",
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
                I accept the paid plan agreement and the administrator's group rules, and I
                understand that the access fee covers {selectedAccessLabel} of dashboard access.
              </span>
            </label>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="flex items-center gap-1.5 text-[11px] text-slate-400">
                <Users className="size-3.5" />
                {selected
                  ? entered
                    ? `${selected.name} selected · current plan: ${
                        state.plan.planName || "active"
                      }`
                    : `${selected.name} selected · £${selectedPrice} access fee due now`
                  : "Select a plan to continue"}
              </p>
              <Button
                variant="primary"
                size="md"
                disabled={!canSubmit || submitting}
                onClick={submit}
              >
                <CheckCircle2 className="size-4" />
                {submitting
                  ? "Activating…"
                  : entered
                    ? `Update plan · pay £${selectedPrice}`
                    : `Pay £${selectedPrice} & enter dashboard`}
              </Button>
            </div>
          </CardBody>
        </Card>

        {feedback && (
          <p className="rounded-xl border border-danger-500/30 bg-danger-500/10 px-3 py-2.5 text-xs text-danger-400">
            {feedback}
          </p>
        )}
      </div>

      <PaymentDialog
        open={paymentOpen}
        onClose={() => setPaymentOpen(false)}
        target={paymentTarget}
      />
    </div>
  );
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
