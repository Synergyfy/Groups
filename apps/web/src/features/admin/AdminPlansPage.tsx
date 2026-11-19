import { useState, useMemo } from "react";
import {
  Check,
  Crown,
  Plus,
} from "lucide-react";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Card, { CardBody } from "../../components/ui/Card";
import SectionHeader from "../../components/ui/SectionHeader";
import StatCard from "../../components/ui/StatCard";
import Toast from "../../components/ui/Toast";
import Modal from "../../components/ui/Modal";
import type { Plan, PlanVariant } from "../../domain/types";
import { planAccessLabel } from "../../domain/types";
import { adminApi } from "../../admin/adminApi";
import { useAdminData } from "../../admin/AdminDataProvider";

const PLAN_VARIANTS_LIST: PlanVariant[] = ["Standard", "Pro", "Pro+"];

type PlanDraft = {
  priceMonthly: string;
  groupQuota: string;
  circleQuota: string;
  revenueSharePercent: string;
  status: Plan["status"];
  featuresText: string;
};

const EMPTY_DRAFT: PlanDraft = {
  priceMonthly: "",
  groupQuota: "",
  circleQuota: "",
  revenueSharePercent: "0",
  status: "Active",
  featuresText: "",
};

function draftFor(plan: Plan | undefined): PlanDraft {
  if (!plan) return { ...EMPTY_DRAFT };
  return {
    priceMonthly: String(plan.priceMonthly),
    groupQuota: String(plan.groupQuota),
    circleQuota: String(plan.circleQuota),
    revenueSharePercent: String(plan.revenueSharePercent),
    status: plan.status,
    featuresText: plan.features.join("\n"),
  };
}

export default function AdminPlansPage() {
  const { data, refresh } = useAdminData();
  const plans = useMemo(() => data?.plans ?? [], [data]);
  const [selectedPlan, setSelectedPlan] = useState<"All" | string>("All");
  const [selectedVariant, setSelectedVariant] = useState<"All" | PlanVariant>("All");
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Each plan is configured with all three variants together.
  const [newPlanName, setNewPlanName] = useState("");
  const [drafts, setDrafts] = useState<Record<PlanVariant, PlanDraft>>({
    Standard: { ...EMPTY_DRAFT },
    Pro: { ...EMPTY_DRAFT },
    "Pro+": { ...EMPTY_DRAFT },
  });

  const planNames = useMemo(
    () => [...new Set(plans.map((plan) => plan.name))],
    [plans],
  );

  const draftsForPlan = (planName: string): Record<PlanVariant, PlanDraft> => ({
    Standard: draftFor(plans.find((plan) => plan.name === planName && plan.variant === "Standard")),
    Pro: draftFor(plans.find((plan) => plan.name === planName && plan.variant === "Pro")),
    "Pro+": draftFor(plans.find((plan) => plan.name === planName && plan.variant === "Pro+")),
  });

  const openPlansModal = () => {
    setNewPlanName("");
    setDrafts({
      Standard: { ...EMPTY_DRAFT },
      Pro: { ...EMPTY_DRAFT },
      "Pro+": { ...EMPTY_DRAFT },
    });
    setCreateModalOpen(true);
  };

  const openExistingPlan = (planName: string) => {
    setNewPlanName(planName);
    setDrafts(draftsForPlan(planName));
    setCreateModalOpen(true);
  };

  const updateDraft = (variant: PlanVariant, patch: Partial<PlanDraft>) => {
    setDrafts((current) => ({
      ...current,
      [variant]: { ...current[variant], ...patch },
    }));
  };

  const togglePlanStatus = async (planId: string) => {
    const plan = plans.find((entry) => entry.id === planId);
    if (!plan) return;
    const next = plan.status === "Active" ? "Draft" : "Active";
    try {
      await adminApi.updatePlan(planId, { status: next });
      await refresh();
      setFeedback(`Plan "${plan.name} ${plan.variant}" set to ${next}.`);
    } catch {
      setFeedback("Could not update the plan.");
    }
  };

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();

    const planName = newPlanName.trim();
    if (!planName) {
      setFeedback("Enter a plan name.");
      return;
    }

    const missing = PLAN_VARIANTS_LIST.filter((variant) => {
      const draft = drafts[variant];
      return (
        draft.priceMonthly.trim() === "" ||
        draft.groupQuota.trim() === "" ||
        draft.circleQuota.trim() === ""
      );
    });
    if (missing.length > 0) {
      setFeedback(
        `Configure price, group quota and circle quota for ${missing.join(", ")}.`,
      );
      return;
    }

    const payloadFor = (variant: PlanVariant) => {
      const draft = drafts[variant];
      const features = draft.featuresText
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0);
      return {
        priceMonthly: Number(draft.priceMonthly),
        status: draft.status,
        groupQuota: Number(draft.groupQuota),
        circleQuota: Number(draft.circleQuota),
        revenueSharePercent: Number(draft.revenueSharePercent || 0),
        features,
      };
    };

    try {
      await adminApi.createPlan({
        name: planName,
        standard: payloadFor("Standard"),
        pro: payloadFor("Pro"),
        proPlus: payloadFor("Pro+"),
      });
      await refresh();
      setFeedback(
        `${planName} Standard, Pro and Pro+ plans saved successfully.`,
      );
      setCreateModalOpen(false);
    } catch {
      setFeedback(`Could not save the ${planName} plans. Please try again.`);
    }
  };

  // Metrics (API is the source of truth; local values are only a fallback)
  const totalSubscribers =
    data?.planStats?.totalSubscribers ??
    plans.reduce((s, p) => s + p.subscriberCount, 0);
  const activePlanCount =
    data?.planStats?.activePlans ?? plans.filter((p) => p.status === "Active").length;
  const monthlyRevenue =
    data?.planStats?.monthlyRecurringRunRate ??
    plans.reduce(
      (s, p) => s + p.priceMinor * p.subscriberCount,
      0,
    ) / 100;

  // Filtered plans
  const filteredPlans = useMemo(() => {
    return plans.filter((p) => {
      if (selectedPlan !== "All" && p.name !== selectedPlan) return false;
      if (selectedVariant !== "All" && p.variant !== selectedVariant) return false;
      return true;
    });
  }, [plans, selectedPlan, selectedVariant]);

  // Group filtered plans by plan name
  const groupedByPlan = useMemo(() => {
    const map = new Map<string, Plan[]>();
    for (const planName of planNames) {
      if (selectedPlan === "All" || selectedPlan === planName) {
        const matches = filteredPlans.filter((p) => p.name === planName);
        if (matches.length > 0) {
          map.set(planName, matches);
        }
      }
    }
    return map;
  }, [filteredPlans, planNames, selectedPlan]);

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader
        title="Plans"
        subtitle="Create plans by name. Every plan must include Standard, Pro and Pro+ variants."
        tip="Each plan is saved as a complete set: Standard, Pro and Pro+ together."
        actions={
          <Button variant="primary" size="sm" onClick={openPlansModal}>
            <Plus className="size-4" /> Configure Plans
          </Button>
        }
      />

      {/* --- Stat Cards ------------------------------------------------ */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard
          label="Total configured plans"
          value={plans.length}
          hint={`Across ${planNames.length} plan names`}
          accent="gold"
        />
        <StatCard
          label="Active plans"
          value={activePlanCount}
          hint="Available to businesses"
          accent="success"
        />
        <StatCard
          label="Total subscribers"
          value={totalSubscribers}
          hint="Enrolled business accounts"
          accent="info"
        />
        <StatCard
          label="Monthly recurring run-rate"
          value={`£${monthlyRevenue.toLocaleString("en-GB")}`}
          hint="From active plans"
          accent="gold"
        />
      </div>

      {/* --- Plan Architecture Banner ----------------------------------- */}
      <div className="flex items-start gap-3 rounded-xl border border-gold-500/30 bg-gold-500/[0.08] p-4">
        <Crown className="mt-0.5 size-5 shrink-0 text-gold-400" />
        <div>
          <p className="text-xs font-semibold text-white">
            Plan + Variant Architecture
          </p>
          <p className="mt-1 text-[11px] leading-relaxed text-slate-300">
            Every plan has a name and ships three variants:{" "}
            <strong>Standard</strong>, <strong>Pro</strong> and <strong>Pro+</strong>.
            Each combination defines precise group creation quotas, circle caps, revenue
            share percentages, and entitlements.
          </p>
        </div>
      </div>

      {/* --- Filters: By Plan & By Plan Variant ------------------------- */}
      <Card>
        <CardBody className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
            {/* Filter by Plan name */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mr-1">
                Plan:
              </span>
              {(["All", ...planNames] as const).map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => setSelectedPlan(name)}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                    selectedPlan === name
                      ? "bg-gold-500/15 text-gold-300 border border-gold-500/30 font-semibold"
                      : "text-slate-400 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  {name}
                  <span className="rounded-full bg-white/10 px-1.5 py-0.2 text-[10px] text-slate-300">
                    {name === "All"
                      ? plans.length
                      : plans.filter((p) => p.name === name).length}
                  </span>
                </button>
              ))}
            </div>

            {/* Filter by Variant */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mr-1">
                Level:
              </span>
              {(["All", "Standard", "Pro", "Pro+"] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setSelectedVariant(v)}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                    selectedVariant === v
                      ? "bg-white/15 text-white border border-white/20"
                      : "text-slate-400 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
            <span>
              Showing {filteredPlans.length} plans across {groupedByPlan.size} plan names
            </span>
            <span className="text-[11px] text-slate-500">
              Click &apos;Activate&apos; or &apos;Deactivate&apos; to toggle availability on the business portal
            </span>
          </div>
        </CardBody>
      </Card>

      {/* --- Nested Plans by Plan Name ---------------------------------- */}
      <div className="flex flex-col gap-8">
        {[...groupedByPlan.entries()].map(([planName, planVariants]) => {
          const planSubscribers = planVariants.reduce((s, p) => s + p.subscriberCount, 0);
          const planMonthly =
            planVariants.reduce(
              (s, p) => s + p.priceMinor * p.subscriberCount,
              0,
            ) / 100;
          const missingVariants = PLAN_VARIANTS_LIST.filter(
            (variant) => !planVariants.some((plan) => plan.variant === variant),
          );

          return (
            <div key={planName} className="flex flex-col gap-3">
              {/* Plan Section Header Card */}
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gold-500/30 bg-gold-500/[0.08] p-4">
                <div className="flex items-center gap-3">
                  <span className="flex size-10 items-center justify-center rounded-xl border border-gold-500/30 bg-ink-950 text-sm font-bold text-gold-300">
                    {planName.slice(0, 1).toUpperCase()}
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-white">{planName}</h3>
                      <Badge variant="gold">Plan</Badge>
                      <Badge variant={missingVariants.length > 0 ? "warning" : "success"}>
                        {planVariants.length}/3 variants
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-300 mt-0.5">
                      Standard, Pro and Pro+ variants for the {planName} plan.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs">
                  <div className="flex flex-col text-right">
                    <span className="text-slate-400 text-[11px]">Enrolled Subscribers</span>
                    <span className="font-bold text-white text-sm">{planSubscribers} businesses</span>
                  </div>
                  <div className="flex flex-col text-right">
                    <span className="text-slate-400 text-[11px]">Monthly Revenue</span>
                    <span className="font-bold text-gold-300 text-sm">
                      £{planMonthly.toLocaleString("en-GB")}/mo
                    </span>
                  </div>
                  {missingVariants.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openExistingPlan(planName)}
                    >
                      Complete plan
                    </Button>
                  )}
                </div>
              </div>

              {/* Nested Plans Grid (Standard, Pro, Pro+) */}
              <div className="grid gap-4 md:grid-cols-3">
                {planVariants.map((plan) => (
                  <Card
                    key={plan.id}
                    className={`transition-all hover:border-gold-500/40 ${
                      plan.status !== "Active" ? "opacity-75" : ""
                    }`}
                  >
                    <CardBody className="flex flex-col justify-between gap-4 h-full">
                      {/* Plan Header */}
                      <div className="flex flex-col gap-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-gold-400">
                              {plan.variant} variant
                            </span>
                            <h4 className="text-sm font-bold text-white mt-0.5">
                              {plan.name} {plan.variant}
                            </h4>
                          </div>
                          <Badge variant={plan.status === "Active" ? "success" : "muted"}>
                            {plan.status}
                          </Badge>
                        </div>

                        {/* Price */}
                        <div className="flex items-baseline gap-1.5 py-1">
                          <span className="text-2xl font-bold text-white">
                            {plan.priceMonthly === 0 ? "Free" : `£${plan.priceMonthly}`}
                          </span>
                          <span className="text-[11px] text-slate-500 ml-auto">
                            {planAccessLabel(plan.variant)} access
                          </span>
                        </div>

                        {/* Quotas & Revenue Share Badge */}
                        <div className="grid grid-cols-2 gap-2 rounded-xl border border-white/5 bg-ink-950/60 p-2.5 text-xs">
                          <div>
                            <span className="text-[10px] text-slate-400">Allowed Groups</span>
                            <p className="font-bold text-white">
                              {plan.groupQuota >= 999 ? "Unlimited" : `${plan.groupQuota} groups`}
                            </p>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400">Circles Quota</span>
                            <p className="font-bold text-white">
                              {plan.circleQuota >= 999 ? "Unlimited" : `${plan.circleQuota} circles`}
                            </p>
                          </div>
                          <div className="col-span-2 pt-1 border-t border-white/5 flex items-center justify-between">
                            <span className="text-[10px] text-slate-400">Revenue Share:</span>
                            <span className="font-semibold text-gold-300 text-[11px]">
                              {plan.revenueSharePercent > 0
                                ? `${plan.revenueSharePercent}% platform share`
                                : "0% (Standard)"}
                            </span>
                          </div>
                        </div>

                        {/* Features Checklist */}
                        <div className="flex flex-col gap-1.5 pt-1">
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                            Included Entitlements:
                          </span>
                          <ul className="flex flex-col gap-1.5">
                            {plan.features.map((feat, idx) => (
                              <li key={idx} className="flex items-start gap-2 text-xs text-slate-300">
                                <Check className="mt-0.5 size-3.5 shrink-0 text-emerald-400" />
                                <span className="leading-tight">{feat}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      {/* Footer Actions */}
                      <div className="pt-3 border-t border-white/10 flex items-center justify-between">
                        <span className="text-[11px] text-slate-400">
                          {plan.subscriberCount} subscribers
                        </span>
                        <button
                          type="button"
                          onClick={() => togglePlanStatus(plan.id)}
                          className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors ${
                            plan.status === "Active"
                              ? "border-rose-500/30 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20"
                              : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20"
                          }`}
                        >
                          {plan.status === "Active" ? "Deactivate" : "Activate"}
                        </button>
                      </div>
                    </CardBody>
                  </Card>
                ))}
                {missingVariants.map((variant) => (
                  <div
                    key={variant}
                    className="flex min-h-[240px] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-white/15 bg-ink-900/50 p-4 text-center"
                  >
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      {variant} variant
                    </p>
                    <p className="text-sm font-bold text-white">
                      {planName} {variant}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Not configured yet. Every plan must include Standard, Pro and Pro+.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openExistingPlan(planName)}
                    >
                      Configure
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* --- Configure Plans Modal ------------------------------- */}
      {createModalOpen && (
        <Modal
          open={createModalOpen}
          title={newPlanName ? `Configure ${newPlanName} plans` : "Configure plans"}
          onClose={() => setCreateModalOpen(false)}
          className="max-w-5xl"
        >
          <form onSubmit={handleCreatePlan} className="flex flex-col gap-4">
            <p className="text-xs leading-relaxed text-slate-400">
              Every plan ships all three variants. Enter a plan name, then set the price,
              quotas and features for Standard, Pro and Pro+ together — saving updates the
              complete plan.
            </p>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-slate-300">Plan name</span>
                <input
                  type="text"
                  value={newPlanName}
                  onChange={(e) => setNewPlanName(e.target.value)}
                  placeholder="e.g. Growth"
                  maxLength={120}
                  className="h-10 rounded-lg border border-white/10 bg-ink-800 px-3 text-xs text-slate-200 focus:outline-none"
                  required
                />
              </label>

              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-slate-300">Access length</span>
                <div className="flex h-10 items-center rounded-lg border border-white/10 bg-ink-950/60 px-3 text-xs text-slate-300">
                  Standard 90 days · Pro 180 days · Pro+ 1 year
                </div>
              </div>
            </div>

            <div className="grid gap-3 lg:grid-cols-3">
              {PLAN_VARIANTS_LIST.map((variant) => {
                const draft = drafts[variant];
                const exists = plans.some(
                  (plan) => plan.name === newPlanName.trim() && plan.variant === variant,
                );
                return (
                  <div
                    key={variant}
                    className="flex flex-col gap-3 rounded-xl border border-white/10 bg-ink-950/50 p-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-bold text-white">
                          {newPlanName.trim() || "Plan"} {variant}
                        </p>
                        <p className="text-[10px] uppercase tracking-wide text-slate-500">
                          {variant} variant
                        </p>
                      </div>
                      <Badge variant={exists ? "success" : "muted"}>
                        {exists ? "Existing" : "New"}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <label className="flex flex-col gap-1">
                        <span className="text-[11px] font-medium text-slate-400">
                          Price (£)
                        </span>
                        <input
                          type="number"
                          value={draft.priceMonthly}
                          onChange={(e) =>
                            updateDraft(variant, { priceMonthly: e.target.value })
                          }
                          min={0}
                          className="h-9 rounded-lg border border-white/10 bg-ink-800 px-2.5 text-xs text-white focus:outline-none"
                          required
                        />
                      </label>

                      <label className="flex flex-col gap-1">
                        <span className="text-[11px] font-medium text-slate-400">
                          Status
                        </span>
                        <select
                          value={draft.status}
                          onChange={(e) =>
                            updateDraft(variant, {
                              status: e.target.value as PlanDraft["status"],
                            })
                          }
                          className="h-9 rounded-lg border border-white/10 bg-ink-800 px-2 text-xs text-slate-200 focus:outline-none"
                        >
                          <option value="Active">Active</option>
                          <option value="Draft">Draft</option>
                          <option value="Closed">Closed</option>
                        </select>
                      </label>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <label className="flex flex-col gap-1">
                        <span className="text-[11px] font-medium text-slate-400">
                          Group quota
                        </span>
                        <input
                          type="number"
                          value={draft.groupQuota}
                          onChange={(e) =>
                            updateDraft(variant, { groupQuota: e.target.value })
                          }
                          min={0}
                          className="h-9 rounded-lg border border-white/10 bg-ink-800 px-2.5 text-xs text-white focus:outline-none"
                          required
                        />
                      </label>

                      <label className="flex flex-col gap-1">
                        <span className="text-[11px] font-medium text-slate-400">
                          Circle quota
                        </span>
                        <input
                          type="number"
                          value={draft.circleQuota}
                          onChange={(e) =>
                            updateDraft(variant, { circleQuota: e.target.value })
                          }
                          min={0}
                          className="h-9 rounded-lg border border-white/10 bg-ink-800 px-2.5 text-xs text-white focus:outline-none"
                          required
                        />
                      </label>
                    </div>

                    <label className="flex flex-col gap-1">
                      <span className="text-[11px] font-medium text-slate-400">
                        Revenue share (%)
                      </span>
                      <input
                        type="number"
                        value={draft.revenueSharePercent}
                        onChange={(e) =>
                          updateDraft(variant, {
                            revenueSharePercent: e.target.value,
                          })
                        }
                        min={0}
                        max={100}
                        className="h-9 rounded-lg border border-white/10 bg-ink-800 px-2.5 text-xs text-white focus:outline-none"
                      />
                    </label>

                    <label className="flex flex-col gap-1">
                      <span className="text-[11px] font-medium text-slate-400">
                        Features &amp; entitlements (one per line)
                      </span>
                      <textarea
                        value={draft.featuresText}
                        onChange={(e) =>
                          updateDraft(variant, { featuresText: e.target.value })
                        }
                        rows={3}
                        className="rounded-lg border border-white/10 bg-ink-800 p-2.5 text-xs text-white focus:outline-none"
                        placeholder="Priority group approval&#10;Campaign access"
                      />
                    </label>
                  </div>
                );
              })}
            </div>

            <div className="mt-2 flex justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                type="button"
                onClick={() => setCreateModalOpen(false)}
              >
                Cancel
              </Button>
              <Button variant="primary" size="sm" type="submit">
                Save all three plans
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {feedback && <Toast message={feedback} onDismiss={() => setFeedback(null)} />}
    </div>
  );
}
