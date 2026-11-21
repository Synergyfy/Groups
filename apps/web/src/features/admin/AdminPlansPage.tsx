import { useState, useMemo } from "react";
import {
  Check,
  Coins,
  Crown,
  Gauge,
  KeyRound,
  Layers,
  Plus,
  Rocket,
  Save,
  Users,
} from "lucide-react";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Card, { CardBody } from "../../components/ui/Card";
import SectionHeader from "../../components/ui/SectionHeader";
import StatCard from "../../components/ui/StatCard";
import Toast from "../../components/ui/Toast";
import Modal from "../../components/ui/Modal";
import type { GroupCreationRules, Plan, PlanVariant } from "../../domain/types";
import { PLAN_VARIANTS, planAccessLabel } from "../../domain/types";
import { adminApi } from "../../admin/adminApi";
import { useAdminData } from "../../admin/AdminDataProvider";
import { errorMessage } from "../../app/api";
import { useAppState } from "../../store/selectors";
import {
  planCanCreateGroups,
  planRecruitmentTarget,
} from "../groups/groupUtils";

const PLAN_VARIANTS_LIST: PlanVariant[] = ["Standard", "Pro", "Pro+"];

type PlanDraft = {
  priceMonthly: string;
  groupQuota: string;
  circleQuota: string;
  revenueSharePercent: string;
  status: Plan["status"];
  featuresText: string;
  canCreateGroup: boolean;
  recruitmentTarget: string;
};

const EMPTY_DRAFT: PlanDraft = {
  priceMonthly: "",
  groupQuota: "",
  circleQuota: "",
  revenueSharePercent: "0",
  status: "Active",
  featuresText: "",
  canCreateGroup: false,
  recruitmentTarget: "0",
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
    canCreateGroup: false,
    recruitmentTarget: "0",
  };
}

/** Build the per-variant save payload from the plan+variant rights. */
function buildGroupConfig(
  rules: GroupCreationRules,
  planNames: string[],
  overrides?: {
    planName: string;
    drafts: Record<PlanVariant, PlanDraft>;
  },
): {
  allowedPlans: string[];
  allowedVariants: PlanVariant[];
  planCreationRights: Record<string, Record<PlanVariant, boolean>>;
  recruitmentTargets: Record<string, Record<PlanVariant, number>>;
} {
  const names = [
    ...new Set([
      ...planNames,
      ...(overrides ? [overrides.planName] : []),
    ]),
  ].filter((name) => name.trim().length > 0);

  const planCreationRights: Record<string, Record<PlanVariant, boolean>> = {};
  const recruitmentTargets: Record<string, Record<PlanVariant, number>> = {};

  for (const name of names) {
    const isOverride = overrides?.planName === name;
    planCreationRights[name] = {} as Record<PlanVariant, boolean>;
    recruitmentTargets[name] = {} as Record<PlanVariant, number>;
    for (const variant of PLAN_VARIANTS_LIST) {
      if (isOverride) {
        planCreationRights[name][variant] =
          overrides.drafts[variant].canCreateGroup;
        recruitmentTargets[name][variant] = Math.max(
          0,
          Math.min(50, Number(overrides.drafts[variant].recruitmentTarget) || 0),
        );
      } else {
        planCreationRights[name][variant] = planCanCreateGroups(
          rules,
          name,
          variant,
        );
        recruitmentTargets[name][variant] = planRecruitmentTarget(
          rules,
          name,
          variant,
        );
      }
    }
  }

  return {
    planCreationRights,
    recruitmentTargets,
    allowedPlans: names.filter((name) =>
      PLAN_VARIANTS_LIST.some((variant) => planCreationRights[name][variant]),
    ),
    allowedVariants: PLAN_VARIANTS_LIST.filter((variant) =>
      names.some((name) => planCreationRights[name][variant]),
    ),
  };
}

export default function AdminPlansPage() {
  const { data, refresh } = useAdminData();
  const state = useAppState();
  const rules = state.adminConfig.groupCreationRules;
  const plans = useMemo(() => data?.plans ?? [], [data]);
  const [selectedPlan, setSelectedPlan] = useState<"All" | string>("All");
  const [selectedVariant, setSelectedVariant] = useState<"All" | PlanVariant>("All");
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [groupRulesModalOpen, setGroupRulesModalOpen] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [savingRules, setSavingRules] = useState(false);

  // Platform-wide group rules moved here from the old Group Rules screen.
  const [activationEnabled, setActivationEnabled] = useState(rules.activationEnabled);
  const [restrictToPlatformGroup, setRestrictToPlatformGroup] = useState(
    rules.restrictToPlatformGroup,
  );
  const [platformGroupId, setPlatformGroupId] = useState(
    rules.platformGroupId &&
      state.groups.some((group) => group.id === rules.platformGroupId)
      ? rules.platformGroupId
      : "",
  );
  const [requirePaidAccess, setRequirePaidAccess] = useState(rules.requirePaidAccess);
  const [entryAccessFee, setEntryAccessFee] = useState(rules.entryAccessFee);

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

  const draftsForPlan = (planName: string): Record<PlanVariant, PlanDraft> => {
    const build = (variant: PlanVariant): PlanDraft => {
      const plan = plans.find(
        (entry) => entry.name === planName && entry.variant === variant,
      );
      return {
        ...draftFor(plan),
        canCreateGroup: planCanCreateGroups(rules, planName, variant),
        recruitmentTarget: String(
          planRecruitmentTarget(rules, planName, variant),
        ),
      };
    };
    return {
      Standard: build("Standard"),
      Pro: build("Pro"),
      "Pro+": build("Pro+"),
    };
  };

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

  const platformRulesPayload = () => ({
    activationEnabled,
    restrictToPlatformGroup,
    platformGroupId: platformGroupId || null,
    requirePaidAccess,
    entryAccessFee: Math.max(0, Number(entryAccessFee) || 0),
  });

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

    const groupConfig = buildGroupConfig(rules, planNames, {
      planName,
      drafts,
    });

    try {
      await adminApi.createPlan({
        name: planName,
        standard: payloadFor("Standard"),
        pro: payloadFor("Pro"),
        proPlus: payloadFor("Pro+"),
      });
      await adminApi.patchConfig({
        groupCreationRules: groupConfig,
      });
      await refresh();

      const creatable = PLAN_VARIANTS_LIST.filter(
        (variant) => groupConfig.planCreationRights[planName]?.[variant],
      );
      setFeedback(
        creatable.length > 0
          ? `${planName} plans saved — ${creatable.join(", ")} may create groups.`
          : `${planName} plans saved — all variants join the platform group.`,
      );
      setCreateModalOpen(false);
    } catch (cause) {
      setFeedback(errorMessage(cause));
    }
  };

  const saveGroupRules = async () => {
    setSavingRules(true);
    try {
      await adminApi.patchConfig({
        groupCreationRules: platformRulesPayload(),
      });
      await refresh();
      setGroupRulesModalOpen(false);
      setFeedback("Group creation rules saved.");
    } catch (cause) {
      setFeedback(errorMessage(cause));
    } finally {
      setSavingRules(false);
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
  const creatableVariantCount = plans.filter((plan) =>
    planCanCreateGroups(rules, plan.name, plan.variant),
  ).length;

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
        title="Plans & Group Rules"
        subtitle="Create plans by name with Standard, Pro and Pro+ variants, and configure for each variant whether it may create groups and how many members it must recruit."
        tip="Plan details and group creation settings are saved together, so every variant has its own group rules."
        actions={
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setGroupRulesModalOpen(true)}
            >
              <Gauge className="size-4" /> Group Rules
            </Button>
            <Button variant="primary" size="sm" onClick={openPlansModal}>
              <Plus className="size-4" /> Configure Plans
            </Button>
          </div>
        }
      />

      {/* --- Stat Cards ------------------------------------------------ */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
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
          label="Variants that create groups"
          value={`${creatableVariantCount} of ${plans.length}`}
          hint="Set per plan variant"
          accent="info"
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
            Each combination defines group creation rights, its own recruitment target,
            group and circle quotas, revenue share, and entitlements.
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
                {planVariants.map((plan) => {
                  const canCreate = planCanCreateGroups(
                    rules,
                    plan.name,
                    plan.variant,
                  );
                  const target = planRecruitmentTarget(
                    rules,
                    plan.name,
                    plan.variant,
                  );
                  return (
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

                        {/* Group creation configuration */}
                        <div className="rounded-xl border border-gold-500/20 bg-gold-500/[0.04] p-2.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                              <Users className="size-3.5 text-gold-400" />
                              Group creation
                            </span>
                            <Badge variant={canCreate ? "success" : "muted"}>
                              {canCreate ? "Allowed" : "Platform group"}
                            </Badge>
                          </div>
                          <p className="mt-1 text-[11px] text-slate-300">
                            {canCreate
                              ? target > 0
                                ? `Recruits ${target} member${target === 1 ? "" : "s"} before groups activate.`
                                : "Groups are functional immediately."
                              : "Placed into the admin platform group instead."}
                          </p>
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
                      <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-2">
                        <span className="text-[11px] text-slate-400">
                          {plan.subscriberCount} subscribers
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => openExistingPlan(plan.name)}
                            className="rounded-lg border border-white/10 px-2.5 py-1 text-xs font-medium text-slate-300 transition-colors hover:bg-white/5 hover:text-white"
                          >
                            Edit
                          </button>
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
                      </div>
                    </CardBody>
                  </Card>
                  );
                })}
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

      {/* --- Platform group rules modal ---------------------------- */}
      {groupRulesModalOpen && (
        <Modal
          open={groupRulesModalOpen}
          title="Platform group rules"
          onClose={() => setGroupRulesModalOpen(false)}
          className="max-w-4xl"
          footer={
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setGroupRulesModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={saveGroupRules}
                disabled={savingRules}
              >
                <Save className="size-4" />
                {savingRules ? "Saving…" : "Save group rules"}
              </Button>
            </>
          }
        >
          <div className="flex flex-col gap-4">
            <p className="text-xs leading-relaxed text-slate-400">
              These settings apply to every plan. Per-variant creation rights and
              recruitment targets are configured in the plan editor.
            </p>

            <div className="grid gap-3 lg:grid-cols-2">
              <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-white/10 bg-ink-950/60 p-3">
                <input
                  type="checkbox"
                  checked={activationEnabled}
                  onChange={(event) => setActivationEnabled(event.target.checked)}
                  className="mt-0.5 size-4 accent-gold-500"
                />
                <span className="text-xs text-slate-300">
                  <span className="font-semibold text-white">
                    Keep groups non-functional until their threshold is reached
                  </span>
                  <span className="mt-0.5 block text-[11px] text-slate-400">
                    Each plan variant recruits to its own target before its groups
                    become functional. Automatic network groups keep their own split
                    threshold.
                  </span>
                </span>
              </label>

              <div className="flex flex-col gap-2 rounded-lg border border-white/10 bg-ink-950/60 p-3">
                <label className="flex cursor-pointer items-start gap-2.5">
                  <input
                    type="checkbox"
                    checked={restrictToPlatformGroup}
                    onChange={(event) =>
                      setRestrictToPlatformGroup(event.target.checked)
                    }
                    className="mt-0.5 size-4 accent-gold-500"
                  />
                  <span className="text-xs text-slate-300">
                    <span className="font-semibold text-white">
                      Place other plans into a platform group
                    </span>
                    <span className="mt-0.5 block text-[11px] text-slate-400">
                      Variants without creation rights are added to the group below on
                      dashboard entry.
                    </span>
                  </span>
                </label>
                <select
                  value={platformGroupId}
                  onChange={(event) => setPlatformGroupId(event.target.value)}
                  disabled={!restrictToPlatformGroup}
                  aria-label="Platform group"
                  className="h-9 rounded-md border border-white/10 bg-ink-800 px-2 text-xs text-white focus:outline-none disabled:opacity-50"
                >
                  <option value="">No platform group selected</option>
                  {state.groups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name} — {group.ownerName}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid gap-3 lg:grid-cols-2">
              <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-white/10 bg-ink-950/60 p-3">
                <input
                  type="checkbox"
                  checked={requirePaidAccess}
                  onChange={(event) => setRequirePaidAccess(event.target.checked)}
                  className="mt-0.5 size-4 accent-gold-500"
                />
                <span className="text-xs text-slate-300">
                  <span className="flex items-center gap-1.5 font-semibold text-white">
                    <Coins className="size-3.5 text-gold-400" />
                    Require paid access before dashboard entry
                  </span>
                  <span className="mt-0.5 block text-[11px] text-slate-400">
                    No dashboard loads until the access fee is paid and the agreement
                    is accepted.
                  </span>
                </span>
              </label>

              <div className="flex flex-col gap-2 rounded-lg border border-white/10 bg-ink-950/60 p-3">
                <span className="text-[11px] font-semibold text-white">
                  Default access fee (£)
                </span>
                <input
                  type="number"
                  min={0}
                  value={entryAccessFee}
                  onChange={(event) =>
                    setEntryAccessFee(Math.max(0, Number(event.target.value) || 0))
                  }
                  className="h-9 rounded-md border border-white/10 bg-ink-800 px-2 text-xs text-white focus:outline-none"
                />
                <p className="text-[10px] leading-relaxed text-slate-500">
                  Fallback fee used only when no published plan price applies. A
                  selected plan variant’s price always takes priority.
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {PLAN_VARIANTS.map((variant) => (
                    <div
                      key={variant}
                      className="rounded-md border border-white/10 bg-ink-950/60 px-2 py-1.5"
                    >
                      <p className="text-[11px] font-semibold text-white">
                        {variant}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {planAccessLabel(variant)} access
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-start gap-2 rounded-xl border border-gold-500/30 bg-gold-500/[0.08] p-3">
              <Layers className="mt-0.5 size-4 shrink-0 text-gold-400" />
              <p className="text-[11px] leading-relaxed text-slate-300">
                <Badge variant="gold">Step 1</Badge> Pay the selected plan’s price (or
                the £{entryAccessFee} default fee when no plan price applies) and
                accept the agreement to enter.{" "}
                <Badge variant="gold">Step 2</Badge> Each plan variant uses the
                create-group switch saved in the plan editor; variants without it join
                the platform group.{" "}
                <Badge variant="gold">Step 3</Badge>{" "}
                {activationEnabled
                  ? "Groups then recruit to their variant target before becoming functional."
                  : "Groups are functional immediately."}
              </p>
            </div>

            <div className="flex items-center gap-2 text-[11px] text-slate-400">
              <Rocket className="size-3.5" />
              {activationEnabled
                ? "Recruiting continues while a group is inactive — only operating stops."
                : "Groups are functional as soon as they are created."}
            </div>
          </div>
        </Modal>
      )}

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
              quotas, entitlements and group rules for Standard, Pro and Pro+ together —
              saving updates the complete plan and its per-variant group configuration.
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

                    <div className="flex flex-col gap-2 rounded-lg border border-gold-500/20 bg-gold-500/[0.04] p-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="flex items-center gap-1.5 text-[11px] font-semibold text-white">
                          <KeyRound className="size-3.5 text-gold-400" />
                          Group creation
                        </span>
                        <label className="flex cursor-pointer items-center gap-1.5 text-[11px] text-slate-300">
                          <input
                            type="checkbox"
                            checked={draft.canCreateGroup}
                            onChange={(e) =>
                              updateDraft(variant, {
                                canCreateGroup: e.target.checked,
                              })
                            }
                            className="size-4 accent-gold-500"
                          />
                          May create
                        </label>
                      </div>

                      <label className="flex flex-col gap-1">
                        <span className="text-[10px] text-slate-400">
                          Recruitment target (members, 0–50)
                        </span>
                        <input
                          type="number"
                          min={0}
                          max={50}
                          value={draft.recruitmentTarget}
                          onChange={(e) =>
                            updateDraft(variant, {
                              recruitmentTarget: e.target.value,
                            })
                          }
                          disabled={!draft.canCreateGroup}
                          className="h-9 rounded-lg border border-white/10 bg-ink-800 px-2.5 text-xs text-white focus:outline-none disabled:opacity-50"
                        />
                      </label>

                      <p className="text-[10px] text-slate-500">
                        {draft.canCreateGroup
                          ? "Groups activate after this many members join."
                          : "This variant joins the platform group instead."}
                      </p>
                    </div>

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
