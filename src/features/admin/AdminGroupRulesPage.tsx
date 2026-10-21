import { useState } from "react";
import {
  ArrowDown,
  CheckCircle2,
  Coins,
  Crown,
  Gauge,
  KeyRound,
  Layers,
  Rocket,
  Save,
  Users,
} from "lucide-react";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Card, { CardBody, CardTitle } from "../../components/ui/Card";
import SectionHeader from "../../components/ui/SectionHeader";
import StatCard from "../../components/ui/StatCard";
import Toast from "../../components/ui/Toast";
import { DEFAULT_GROUP_CREATION_RULES } from "../../data/adminData";
import { MEMBERSHIP_PLANS } from "../../data/membershipPlans";
import type { GroupCreationRules, PlanVariant, Tier } from "../../domain/types";
import { PLAN_VARIANTS, TIERS_ORDERED } from "../../domain/types";
import { useAppStore } from "../../store/context";

const TARGET_FIELD_CLASS =
  "h-9 w-full rounded-md border border-white/10 bg-ink-800 px-2 text-center text-xs text-white focus:border-gold-500/50 focus:outline-none";

function copyTargets(
  source: GroupCreationRules["recruitmentTargets"]
): GroupCreationRules["recruitmentTargets"] {
  return {
    Bronze: { ...source.Bronze },
    Silver: { ...source.Silver },
    Gold: { ...source.Gold },
    Platinum: { ...source.Platinum },
  };
}

/**
 * Administrator control over how businesses create groups: which memberships
 * may create (by default only Platinum Pro+), the inverse-scaled recruitment
 * threshold per membership, the paid entry access model, and the platform
 * group everyone else is placed into.
 */
export default function AdminGroupRulesPage() {
  const { state, dispatch } = useAppStore();
  const rules = state.adminConfig.groupCreationRules ?? DEFAULT_GROUP_CREATION_RULES;

  const [allowedTiers, setAllowedTiers] = useState<Tier[]>([...rules.allowedTiers]);
  const [allowedVariants, setAllowedVariants] = useState<PlanVariant[]>([
    ...rules.allowedVariants,
  ]);
  const [targets, setTargets] = useState(copyTargets(rules.recruitmentTargets));
  const [activationEnabled, setActivationEnabled] = useState(rules.activationEnabled);
  const [restrictToPlatformGroup, setRestrictToPlatformGroup] = useState(
    rules.restrictToPlatformGroup
  );
  const [platformGroupId, setPlatformGroupId] = useState(rules.platformGroupId ?? "");
  const [requirePaidAccess, setRequirePaidAccess] = useState(rules.requirePaidAccess);
  const [entryAccessDays, setEntryAccessDays] = useState<90 | 180>(rules.entryAccessDays);
  const [entryAccessFee, setEntryAccessFee] = useState(rules.entryAccessFee);
  const [feedback, setFeedback] = useState<string | null>(null);

  const toggleTier = (tier: Tier) => {
    setAllowedTiers((prev) =>
      prev.includes(tier) ? prev.filter((entry) => entry !== tier) : [...prev, tier]
    );
  };
  const toggleVariant = (variant: PlanVariant) => {
    setAllowedVariants((prev) =>
      prev.includes(variant) ? prev.filter((entry) => entry !== variant) : [...prev, variant]
    );
  };
  const setTarget = (tier: Tier, variant: PlanVariant, value: number) => {
    const clamped = Math.max(1, Math.min(50, value));
    setTargets((prev) => ({ ...prev, [tier]: { ...prev[tier], [variant]: clamped } }));
  };

  const eligiblePlans = MEMBERSHIP_PLANS.filter(
    (plan) => allowedTiers.includes(plan.tier) && allowedVariants.includes(plan.variant)
  );
  const eligibleLabel =
    eligiblePlans.length === 0
      ? "No membership"
      : eligiblePlans.map((plan) => plan.name).join(", ");

  const save = () => {
    dispatch({
      type: "admin/update-config",
      patch: {
        groupCreationRules: {
          allowedTiers,
          allowedVariants,
          recruitmentTargets: copyTargets(targets),
          activationEnabled,
          restrictToPlatformGroup,
          platformGroupId: platformGroupId || null,
          requirePaidAccess,
          entryAccessDays,
          entryAccessFee,
        },
      },
    });
    setFeedback(
      `Group creation rules saved — ${eligibleLabel} may create groups; every other membership joins the platform group.`
    );
  };

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader
        title="Group Creation Rules"
        subtitle="Decide which memberships may create a group (by default only Platinum Pro+), set the recruitment threshold each membership must reach before its groups activate, and configure the paid access fee required for dashboard entry."
        tip="Recruitment requirements scale inversely with the membership level: Bronze needs the most recruits, Platinum the fewest."
        actions={
          <Button variant="primary" size="sm" onClick={save}>
            <Save className="size-4" /> Save Group Rules
          </Button>
        }
      />

      {/* --- Stat cards --------------------------------------------------- */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard
          label="May create groups"
          value={eligiblePlans.length === 0 ? "None" : `${eligiblePlans.length} plans`}
          hint={eligibleLabel}
          accent="gold"
        />
        <StatCard
          label="Recruitment spread"
          value={`${targets.Bronze.Standard} → ${targets.Platinum["Pro+"]}`}
          hint="Bronze Standard down to Platinum Pro+"
          accent="info"
        />
        <StatCard
          label="Entry access model"
          value={`${entryAccessDays} days`}
          hint={`£${entryAccessFee} access fee before dashboard entry`}
          accent="success"
        />
        <StatCard
          label="Activation threshold"
          value={activationEnabled ? "Enforced" : "Off"}
          hint={activationEnabled ? "Groups stay off until their target" : "Groups work immediately"}
          accent={activationEnabled ? "warning" : "info"}
        />
      </div>

      {/* --- Who can create groups ---------------------------------------- */}
      <Card>
        <CardBody className="flex flex-col gap-4">
          <div className="flex items-center gap-2 border-b border-white/10 pb-3">
            <KeyRound className="size-5 text-gold-400" />
            <div>
              <CardTitle>Who can create a group</CardTitle>
              <p className="text-xs text-slate-400">
                Only the selected memberships may run the Create Group wizard. Every other
                membership joins the platform group set below instead.
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-white">Membership tiers</label>
              <div className="grid grid-cols-2 gap-2">
                {TIERS_ORDERED.map((tier) => {
                  const checked = allowedTiers.includes(tier);
                  return (
                    <label
                      key={tier}
                      className={`flex cursor-pointer items-center gap-2.5 rounded-lg border p-2.5 text-xs transition-colors ${
                        checked
                          ? "border-gold-500/40 bg-gold-500/10 text-white"
                          : "border-white/10 bg-ink-950/60 text-slate-300 hover:bg-white/5"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleTier(tier)}
                        className="size-4 accent-gold-500"
                      />
                      <span className="font-semibold">{tier}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-white">Plan levels</label>
              <div className="grid grid-cols-3 gap-2">
                {PLAN_VARIANTS.map((variant) => {
                  const checked = allowedVariants.includes(variant);
                  return (
                    <label
                      key={variant}
                      className={`flex cursor-pointer items-center gap-2 rounded-lg border p-2.5 text-xs transition-colors ${
                        checked
                          ? "border-gold-500/40 bg-gold-500/10 text-white"
                          : "border-white/10 bg-ink-950/60 text-slate-300 hover:bg-white/5"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleVariant(variant)}
                        className="size-4 accent-gold-500"
                      />
                      <span className="font-semibold">{variant}</span>
                    </label>
                  );
                })}
              </div>
              <p className="text-[11px] leading-relaxed text-slate-400">
                Current selection:{" "}
                <span className="font-semibold text-gold-300">{eligibleLabel}</span>
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-2">
              <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-white/10 bg-ink-950/60 p-3">
                <input
                  type="checkbox"
                  checked={restrictToPlatformGroup}
                  onChange={(event) => setRestrictToPlatformGroup(event.target.checked)}
                  className="mt-0.5 size-4 accent-gold-500"
                />
                <span className="text-xs text-slate-300">
                  <span className="font-semibold text-white">
                    Place other memberships into a platform group
                  </span>
                  <span className="mt-0.5 block text-[11px] text-slate-400">
                    Members without creation rights are added to the group below on dashboard
                    entry instead of creating their own.
                  </span>
                </span>
              </label>
            </div>

            <label className="flex flex-col gap-1.5 rounded-lg border border-white/10 bg-ink-950/60 p-3">
              <span className="text-[11px] text-slate-400">Admin-set platform group</span>
              <select
                value={platformGroupId}
                onChange={(event) => setPlatformGroupId(event.target.value)}
                disabled={!restrictToPlatformGroup}
                className="h-9 rounded-md border border-white/10 bg-ink-800 px-2 text-xs text-white focus:outline-none disabled:opacity-50"
              >
                <option value="">No platform group selected</option>
                {state.groups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name} — {group.ownerName}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </CardBody>
      </Card>

      {/* --- Recruitment matrix ------------------------------------------- */}
      <Card>
        <CardBody className="flex flex-col gap-4">
          <div className="flex items-center gap-2 border-b border-white/10 pb-3">
            <ArrowDown className="size-5 text-gold-400" />
            <div>
              <CardTitle>Recruitment requirements per membership</CardTitle>
              <p className="text-xs text-slate-400">
                Requirements scale inversely with the membership level — Bronze recruits the most,
                Platinum the fewest. Groups remain non-functional until they reach the number set
                here.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] border-separate border-spacing-0">
              <thead>
                <tr>
                  <th className="border-b border-white/10 pb-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    Tier ↓ / Level →
                  </th>
                  {PLAN_VARIANTS.map((variant) => (
                    <th
                      key={variant}
                      className="border-b border-white/10 pb-2 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-500"
                    >
                      {variant}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {TIERS_ORDERED.map((tier) => (
                  <tr key={tier}>
                    <td className="border-b border-white/5 py-2 pr-3 text-xs font-semibold text-white">
                      <span className="flex items-center gap-1.5">
                        <Crown className="size-3.5 text-gold-400" />
                        {tier}
                      </span>
                    </td>
                    {PLAN_VARIANTS.map((variant) => (
                      <td key={variant} className="border-b border-white/5 p-1.5">
                        <input
                          type="number"
                          min={1}
                          max={50}
                          aria-label={`${tier} ${variant} recruits needed`}
                          value={targets[tier][variant]}
                          onChange={(event) =>
                            setTarget(tier, variant, Number(event.target.value))
                          }
                          className={TARGET_FIELD_CLASS}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-start gap-2 rounded-xl border border-gold-500/30 bg-gold-500/[0.08] p-3">
            <Users className="mt-0.5 size-4 shrink-0 text-gold-400" />
            <p className="text-[11px] leading-relaxed text-slate-300">
              Example: a Bronze Standard business must recruit{" "}
              <strong>{targets.Bronze.Standard} members</strong> before its groups switch on,
              while a Platinum Pro+ business only needs{" "}
              <strong>{targets.Platinum["Pro+"]} members</strong>. Head start groups in the
              dashboard are measured against exactly these numbers.
            </p>
          </div>
        </CardBody>
      </Card>

      {/* --- Activation + entry access ------------------------------------ */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardBody className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Gauge className="size-4 text-gold-400" />
              <CardTitle>Group activation</CardTitle>
            </div>
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
                  While this is on, every user-created group shows its recruitment progress and
                  stays inactive until it hits the target above. Automatic network groups keep
                  their own split threshold.
                </span>
              </span>
            </label>
            <div className="flex items-center gap-2 text-[11px] text-slate-400">
              <Rocket className="size-3.5" />
              {activationEnabled
                ? "Recruiting continues while a group is inactive — only operating stops."
                : "Groups are functional as soon as they are created."}
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Coins className="size-4 text-gold-400" />
              <CardTitle>Paid entry &amp; agreement</CardTitle>
            </div>
            <p className="text-[11px] text-slate-400">
              Paid access is required before dashboard entry and before mandatory group activation.
              Businesses pay this fee and accept the access agreement on first entry.
            </p>

            <div className="grid grid-cols-2 gap-2">
              {([90, 180] as const).map((days) => (
                <button
                  key={days}
                  type="button"
                  onClick={() => setEntryAccessDays(days)}
                  className={`flex items-center justify-between rounded-lg border p-3 text-left transition-colors ${
                    entryAccessDays === days
                      ? "border-gold-500/50 bg-gold-500/10 text-white"
                      : "border-white/10 bg-ink-950/60 text-slate-300 hover:bg-white/5"
                  }`}
                >
                  <span className="text-xs font-semibold">{days}-day access</span>
                  {entryAccessDays === days ? (
                    <CheckCircle2 className="size-3.5 text-gold-400" />
                  ) : (
                    <span className="size-3.5 rounded-full border border-white/20" />
                  )}
                </button>
              ))}
            </div>

            <label className="flex flex-col gap-1.5 rounded-lg border border-white/10 bg-ink-950/60 p-3">
              <span className="text-[11px] text-slate-400">
                Access fee for {entryAccessDays} days (£)
              </span>
              <input
                type="number"
                min={0}
                value={entryAccessFee}
                onChange={(event) => setEntryAccessFee(Math.max(0, Number(event.target.value)))}
                className="h-9 rounded-md border border-white/10 bg-ink-800 px-2 text-xs text-white focus:outline-none"
              />
            </label>

            <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-white/10 bg-ink-950/60 p-3">
              <input
                type="checkbox"
                checked={requirePaidAccess}
                onChange={(event) => setRequirePaidAccess(event.target.checked)}
                className="mt-0.5 size-4 accent-gold-500"
              />
              <span className="text-xs text-slate-300">
                <span className="font-semibold text-white">
                  Require paid access before dashboard entry
                </span>
                <span className="mt-0.5 block text-[11px] text-slate-400">
                  With this on, no dashboard loads until the access fee is paid and the agreement
                  accepted.
                </span>
              </span>
            </label>
          </CardBody>
        </Card>
      </div>

      {/* --- Summary strip ------------------------------------------------- */}
      <div className="flex items-start gap-3 rounded-xl border border-gold-500/30 bg-gold-500/[0.08] p-4">
        <Layers className="mt-0.5 size-5 shrink-0 text-gold-400" />
        <div>
          <p className="text-xs font-semibold text-white">How the rules combine</p>
          <p className="mt-1 text-[11px] leading-relaxed text-slate-300">
            <Badge variant="gold">Step 1</Badge> Pay the £{entryAccessFee} {entryAccessDays}-day
            access fee and accept the agreement to enter.{" "}
            <Badge variant="gold">Step 2</Badge>{" "}
            {eligiblePlans.length === 0
              ? "No membership may create groups"
              : `${eligibleLabel} ${eligiblePlans.length === 1 ? "runs" : "run"} the Create Group wizard`}
            ; every other membership is placed into{" "}
            {state.groups.find((group) => group.id === platformGroupId)?.name ?? "the platform group"}
            . <Badge variant="gold">Step 3</Badge>{" "}
            {activationEnabled
              ? "Each group then recruits to its membership threshold before it becomes functional."
              : "Groups are functional immediately."}
          </p>
        </div>
      </div>

      {feedback && <Toast message={feedback} onDismiss={() => setFeedback(null)} />}
    </div>
  );
}
