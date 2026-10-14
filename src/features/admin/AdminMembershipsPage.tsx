import { useState, useMemo } from "react";
import {
  Check,
  Crown,
  Plus,
} from "lucide-react";
import Badge, { type BadgeVariant } from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Card, { CardBody } from "../../components/ui/Card";
import SectionHeader from "../../components/ui/SectionHeader";
import StatCard from "../../components/ui/StatCard";
import Toast from "../../components/ui/Toast";
import Modal from "../../components/ui/Modal";
import type { Tier } from "../../domain/types";

export type PlanVariant = "Standard" | "Pro" | "Pro+";

export interface MembershipPlan {
  id: string;
  tier: Tier;
  variant: PlanVariant;
  name: string; // e.g. "Bronze Standard", "Gold Pro+"
  priceMonthly: number;
  billingFrequency: "Monthly" | "Annual";
  status: "Active" | "Draft" | "Closed";
  groupQuota: number;
  circleQuota: number;
  revenueSharePercent: number;
  features: string[];
  subscriberCount: number;
}

const TIER_META: Record<
  Tier,
  {
    label: string;
    description: string;
    badgeVariant: BadgeVariant;
    color: string;
    bgGlow: string;
    border: string;
  }
> = {
  Bronze: {
    label: "Bronze Level",
    description: "Foundational membership tier for new businesses and local group organizers.",
    badgeVariant: "muted",
    color: "text-amber-400",
    bgGlow: "bg-amber-500/10",
    border: "border-amber-700/30",
  },
  Silver: {
    label: "Silver Level",
    description: "Growth tier for businesses expanding groups and marketing campaigns.",
    badgeVariant: "default",
    color: "text-slate-300",
    bgGlow: "bg-slate-400/10",
    border: "border-slate-500/30",
  },
  Gold: {
    label: "Gold Level",
    description: "Commercial tier with revenue sharing, paid contributions, and priority tools.",
    badgeVariant: "gold",
    color: "text-gold-300",
    bgGlow: "bg-gold-500/10",
    border: "border-gold-500/30",
  },
  Platinum: {
    label: "Platinum Level",
    description: "Enterprise tier with Banker privileges, executive advisory, and maximum scale.",
    badgeVariant: "gold",
    color: "text-gold-200",
    bgGlow: "bg-gold-500/15",
    border: "border-gold-400/40",
  },
};

const INITIAL_PLANS: MembershipPlan[] = [
  // --- BRONZE TIER (Standard, Pro, Pro+) ---
  {
    id: "plan-bronze-std",
    tier: "Bronze",
    variant: "Standard",
    name: "Bronze Standard",
    priceMonthly: 0,
    billingFrequency: "Monthly",
    status: "Active",
    groupQuota: 3,
    circleQuota: 2,
    revenueSharePercent: 0,
    features: [
      "Up to 3 business groups",
      "Up to 2 circles",
      "Join unlimited consumer & partner groups",
      "Basic business directory listing",
    ],
    subscriberCount: 24,
  },
  {
    id: "plan-bronze-pro",
    tier: "Bronze",
    variant: "Pro",
    name: "Bronze Pro",
    priceMonthly: 19,
    billingFrequency: "Monthly",
    status: "Active",
    groupQuota: 5,
    circleQuota: 4,
    revenueSharePercent: 0,
    features: [
      "Up to 5 business groups",
      "Up to 4 circles",
      "Highlighted directory placement",
      "Extended 14-day temporary access periods",
    ],
    subscriberCount: 16,
  },
  {
    id: "plan-bronze-pro-plus",
    tier: "Bronze",
    variant: "Pro+",
    name: "Bronze Pro+",
    priceMonthly: 39,
    billingFrequency: "Monthly",
    status: "Active",
    groupQuota: 8,
    circleQuota: 6,
    revenueSharePercent: 2,
    features: [
      "Up to 8 business groups",
      "Up to 6 circles",
      "2% platform revenue share",
      "Group analytics & engagement reports",
    ],
    subscriberCount: 9,
  },

  // --- SILVER TIER (Standard, Pro, Pro+) ---
  {
    id: "plan-silver-std",
    tier: "Silver",
    variant: "Standard",
    name: "Silver Standard",
    priceMonthly: 29,
    billingFrequency: "Monthly",
    status: "Active",
    groupQuota: 10,
    circleQuota: 6,
    revenueSharePercent: 5,
    features: [
      "Up to 10 business groups",
      "Up to 6 circles",
      "5% platform revenue share",
      "Access to promotional campaigns",
      "Priority group moderation",
    ],
    subscriberCount: 18,
  },
  {
    id: "plan-silver-pro",
    tier: "Silver",
    variant: "Pro",
    name: "Silver Pro",
    priceMonthly: 59,
    billingFrequency: "Monthly",
    status: "Active",
    groupQuota: 15,
    circleQuota: 10,
    revenueSharePercent: 7,
    features: [
      "Up to 15 business groups",
      "Up to 10 circles",
      "7% platform revenue share",
      "Campaign syndication tools",
      "Direct member contact intake",
    ],
    subscriberCount: 11,
  },
  {
    id: "plan-silver-pro-plus",
    tier: "Silver",
    variant: "Pro+",
    name: "Silver Pro+",
    priceMonthly: 89,
    billingFrequency: "Monthly",
    status: "Active",
    groupQuota: 20,
    circleQuota: 12,
    revenueSharePercent: 8,
    features: [
      "Up to 20 business groups",
      "Up to 12 circles",
      "8% platform revenue share",
      "Custom branding & badge on groups",
      "Priority telephone & email support",
    ],
    subscriberCount: 7,
  },

  // --- GOLD TIER (Standard, Pro, Pro+) ---
  {
    id: "plan-gold-std",
    tier: "Gold",
    variant: "Standard",
    name: "Gold Standard",
    priceMonthly: 79,
    billingFrequency: "Monthly",
    status: "Active",
    groupQuota: 25,
    circleQuota: 15,
    revenueSharePercent: 10,
    features: [
      "Up to 25 business groups",
      "Run paid groups & set contributions",
      "10% platform revenue share",
      "Full analytics & financial reporting",
      "Dedicated account manager",
    ],
    subscriberCount: 14,
  },
  {
    id: "plan-gold-pro",
    tier: "Gold",
    variant: "Pro",
    name: "Gold Pro",
    priceMonthly: 119,
    billingFrequency: "Monthly",
    status: "Active",
    groupQuota: 35,
    circleQuota: 20,
    revenueSharePercent: 12,
    features: [
      "Up to 35 business groups",
      "Up to 20 circles",
      "12% platform revenue share",
      "Automated grouping rules access",
      "Fast-track partner verification",
    ],
    subscriberCount: 8,
  },
  {
    id: "plan-gold-pro-plus",
    tier: "Gold",
    variant: "Pro+",
    name: "Gold Pro+",
    priceMonthly: 159,
    billingFrequency: "Monthly",
    status: "Active",
    groupQuota: 50,
    circleQuota: 30,
    revenueSharePercent: 14,
    features: [
      "Up to 50 business groups",
      "Up to 30 circles",
      "14% platform revenue share",
      "VIP partner networking directory",
      "Executive quarterly review",
    ],
    subscriberCount: 5,
  },

  // --- PLATINUM TIER (Standard, Pro, Pro+) ---
  {
    id: "plan-platinum-std",
    tier: "Platinum",
    variant: "Standard",
    name: "Platinum Standard",
    priceMonthly: 149,
    billingFrequency: "Monthly",
    status: "Active",
    groupQuota: 60,
    circleQuota: 35,
    revenueSharePercent: 15,
    features: [
      "Up to 60 business groups",
      "Up to 35 circles",
      "15% platform revenue share",
      "Smart Money Banker eligibility",
      "Growth consultant support",
    ],
    subscriberCount: 6,
  },
  {
    id: "plan-platinum-pro",
    tier: "Platinum",
    variant: "Pro",
    name: "Platinum Pro",
    priceMonthly: 249,
    billingFrequency: "Monthly",
    status: "Active",
    groupQuota: 100,
    circleQuota: 50,
    revenueSharePercent: 18,
    features: [
      "Up to 100 business groups",
      "Up to 50 circles",
      "18% platform revenue share",
      "Syndicate Banker with rotational payouts",
      "Dedicated enterprise success manager",
    ],
    subscriberCount: 4,
  },
  {
    id: "plan-platinum-pro-plus",
    tier: "Platinum",
    variant: "Pro+",
    name: "Platinum Pro+",
    priceMonthly: 399,
    billingFrequency: "Monthly",
    status: "Active",
    groupQuota: 999, // Unlimited
    circleQuota: 999, // Unlimited
    revenueSharePercent: 20,
    features: [
      "Unlimited group & circle creation",
      "20% maximum platform revenue share",
      "Custom API webhooks & data sync",
      "Direct board-level ecosystem partnership",
      "Custom white-label group portal option",
    ],
    subscriberCount: 3,
  },
];

const TIERS_LIST: Tier[] = ["Bronze", "Silver", "Gold", "Platinum"];

export default function AdminMembershipsPage() {
  const [plans, setPlans] = useState<MembershipPlan[]>(INITIAL_PLANS);
  const [selectedTier, setSelectedTier] = useState<"All" | Tier>("All");
  const [selectedVariant, setSelectedVariant] = useState<"All" | PlanVariant>("All");
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Create form state
  const [newTier, setNewTier] = useState<Tier>("Bronze");
  const [newVariant, setNewVariant] = useState<PlanVariant>("Standard");
  const [newPrice, setNewPrice] = useState(49);
  const [newGroupQuota, setNewGroupQuota] = useState(10);
  const [newCircleQuota, setNewCircleQuota] = useState(5);
  const [newRevenueShare, setNewRevenueShare] = useState(5);
  const [newFrequency, setNewFrequency] = useState<"Monthly" | "Annual">("Monthly");
  const [newFeaturesText, setNewFeaturesText] = useState(
    "Custom group allocations\nFull analytics reporting\nDedicated support"
  );

  const togglePlanStatus = (planId: string) => {
    setPlans((prev) =>
      prev.map((p) => {
        if (p.id === planId) {
          const next = p.status === "Active" ? "Draft" : "Active";
          setFeedback(`Plan "${p.name}" set to ${next}.`);
          return { ...p, status: next };
        }
        return p;
      })
    );
  };

  const handleCreatePlan = (e: React.FormEvent) => {
    e.preventDefault();
    const planName = `${newTier} ${newVariant}`;
    const featureLines = newFeaturesText
      .split("\n")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    const created: MembershipPlan = {
      id: `plan-${Date.now()}`,
      tier: newTier,
      variant: newVariant,
      name: planName,
      priceMonthly: Number(newPrice),
      billingFrequency: newFrequency,
      status: "Active",
      groupQuota: Number(newGroupQuota),
      circleQuota: Number(newCircleQuota),
      revenueSharePercent: Number(newRevenueShare),
      features: featureLines.length > 0 ? featureLines : ["Standard membership features"],
      subscriberCount: 0,
    };

    setPlans((prev) => [created, ...prev]);
    setFeedback(`Membership plan "${planName}" created successfully!`);
    setCreateModalOpen(false);
  };

  // Metrics
  const totalSubscribers = plans.reduce((s, p) => s + p.subscriberCount, 0);
  const activePlanCount = plans.filter((p) => p.status === "Active").length;
  const monthlyRevenue = plans.reduce((s, p) => s + p.priceMonthly * p.subscriberCount, 0);

  // Filtered plans
  const filteredPlans = useMemo(() => {
    return plans.filter((p) => {
      if (selectedTier !== "All" && p.tier !== selectedTier) return false;
      if (selectedVariant !== "All" && p.variant !== selectedVariant) return false;
      return true;
    });
  }, [plans, selectedTier, selectedVariant]);

  // Group filtered plans by Tier
  const groupedByTier = useMemo(() => {
    const map = new Map<Tier, MembershipPlan[]>();
    for (const tier of TIERS_LIST) {
      if (selectedTier === "All" || selectedTier === tier) {
        const matches = filteredPlans.filter((p) => p.tier === tier);
        if (matches.length > 0) {
          map.set(tier, matches);
        }
      }
    }
    return map;
  }, [filteredPlans, selectedTier]);

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader
        title="Memberships & Plans"
        subtitle="Manage Bronze, Silver, Gold and Platinum membership levels with nested Standard, Pro, and Pro+ subscription plans; status, entitlements, quotas and renewals."
        tip="Admin can create, edit and activate plans inside each membership tier (e.g. Bronze Standard, Silver Pro, Gold Pro+)."
        actions={
          <Button variant="primary" size="sm" onClick={() => setCreateModalOpen(true)}>
            <Plus className="size-4" /> Create Membership Plan
          </Button>
        }
      />

      {/* --- Stat Cards ------------------------------------------------ */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard
          label="Total configured plans"
          value={plans.length}
          hint="Across Bronze, Silver, Gold, Platinum"
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
          hint="From active membership plans"
          accent="gold"
        />
      </div>

      {/* --- Tier Hierarchy Architecture Banner ------------------------- */}
      <div className="flex items-start gap-3 rounded-xl border border-gold-500/30 bg-gold-500/[0.08] p-4">
        <Crown className="mt-0.5 size-5 shrink-0 text-gold-400" />
        <div>
          <p className="text-xs font-semibold text-white">
            Tier-Nested Plan Architecture (Bronze · Silver · Gold · Platinum)
          </p>
          <p className="mt-1 text-[11px] leading-relaxed text-slate-300">
            Standard, Pro, and Pro+ are nested directly within each membership level, creating specific packages:{" "}
            <strong>Bronze Standard/Pro/Pro+</strong>, <strong>Silver Standard/Pro/Pro+</strong>,{" "}
            <strong>Gold Standard/Pro/Pro+</strong>, and <strong>Platinum Standard/Pro/Pro+</strong>.
            Each combination defines precise group creation quotas, circle caps, revenue share percentages, and entitlements.
          </p>
        </div>
      </div>

      {/* --- Filters: By Tier & By Plan Variant ------------------------- */}
      <Card>
        <CardBody className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
            {/* Filter by Tier */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mr-1">
                Tier:
              </span>
              {(["All", "Bronze", "Silver", "Gold", "Platinum"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setSelectedTier(t)}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                    selectedTier === t
                      ? "bg-gold-500/15 text-gold-300 border border-gold-500/30 font-semibold"
                      : "text-slate-400 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  {t}
                  <span className="rounded-full bg-white/10 px-1.5 py-0.2 text-[10px] text-slate-300">
                    {t === "All"
                      ? plans.length
                      : plans.filter((p) => p.tier === t).length}
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
              Showing {filteredPlans.length} plans across {groupedByTier.size} active membership levels
            </span>
            <span className="text-[11px] text-slate-500">
              Click &apos;Activate&apos; or &apos;Deactivate&apos; to toggle availability on the business portal
            </span>
          </div>
        </CardBody>
      </Card>

      {/* --- Nested Plans by Tier Display ------------------------------- */}
      <div className="flex flex-col gap-8">
        {[...groupedByTier.entries()].map(([tier, tierPlans]) => {
          const meta = TIER_META[tier];
          const tierSubscribers = tierPlans.reduce((s, p) => s + p.subscriberCount, 0);
          const tierMonthly = tierPlans.reduce((s, p) => s + p.priceMonthly * p.subscriberCount, 0);

          return (
            <div key={tier} className="flex flex-col gap-3">
              {/* Tier Section Header Card */}
              <div
                className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl border ${meta.border} ${meta.bgGlow} p-4`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`flex size-10 items-center justify-center rounded-xl border ${meta.border} bg-ink-950 text-sm font-bold ${meta.color}`}
                  >
                    {tier.slice(0, 1)}
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-white">{meta.label}</h3>
                      <Badge variant={meta.badgeVariant}>{tier} Level</Badge>
                    </div>
                    <p className="text-xs text-slate-300 mt-0.5">{meta.description}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs">
                  <div className="flex flex-col text-right">
                    <span className="text-slate-400 text-[11px]">Enrolled Subscribers</span>
                    <span className="font-bold text-white text-sm">{tierSubscribers} businesses</span>
                  </div>
                  <div className="flex flex-col text-right">
                    <span className="text-slate-400 text-[11px]">Monthly Revenue</span>
                    <span className="font-bold text-gold-300 text-sm">
                      £{tierMonthly.toLocaleString("en-GB")}/mo
                    </span>
                  </div>
                </div>
              </div>

              {/* Nested Plans Grid (Standard, Pro, Pro+) */}
              <div className="grid gap-4 md:grid-cols-3">
                {tierPlans.map((plan) => (
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
                              {plan.variant} Tier
                            </span>
                            <h4 className="text-sm font-bold text-white mt-0.5">{plan.name}</h4>
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
                          {plan.priceMonthly > 0 && (
                            <span className="text-xs text-slate-400">/ month</span>
                          )}
                          <span className="text-[11px] text-slate-500 ml-auto">
                            {plan.billingFrequency}
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
              </div>
            </div>
          );
        })}
      </div>

      {/* --- Create Membership Plan Modal ------------------------------- */}
      {createModalOpen && (
        <Modal
          open={createModalOpen}
          title="Create New Membership Plan"
          onClose={() => setCreateModalOpen(false)}
        >
          <form onSubmit={handleCreatePlan} className="flex flex-col gap-4">
            <p className="text-xs text-slate-400">
              Configure a plan nested under Bronze, Silver, Gold, or Platinum with its specific level (Standard, Pro, Pro+).
            </p>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-slate-300">Membership Tier</span>
                <select
                  value={newTier}
                  onChange={(e) => setNewTier(e.target.value as Tier)}
                  className="h-10 rounded-lg border border-white/10 bg-ink-800 px-3 text-xs text-slate-200 focus:outline-none"
                >
                  <option value="Bronze">Bronze Level</option>
                  <option value="Silver">Silver Level</option>
                  <option value="Gold">Gold Level</option>
                  <option value="Platinum">Platinum Level</option>
                </select>
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-slate-300">Plan Variant / Level</span>
                <select
                  value={newVariant}
                  onChange={(e) => setNewVariant(e.target.value as PlanVariant)}
                  className="h-10 rounded-lg border border-white/10 bg-ink-800 px-3 text-xs text-slate-200 focus:outline-none"
                >
                  <option value="Standard">Standard</option>
                  <option value="Pro">Pro</option>
                  <option value="Pro+">Pro+</option>
                </select>
              </label>
            </div>

            {/* Generated Plan Name Preview */}
            <div className="rounded-lg border border-gold-500/30 bg-gold-500/10 p-3">
              <span className="text-[11px] text-gold-300">Plan Display Name Preview:</span>
              <p className="text-sm font-bold text-white mt-0.5">
                {newTier} {newVariant}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-slate-300">Monthly Price (£)</span>
                <input
                  type="number"
                  value={newPrice}
                  onChange={(e) => setNewPrice(Number(e.target.value))}
                  min={0}
                  className="h-10 rounded-lg border border-white/10 bg-ink-800 px-3 text-xs text-white focus:outline-none"
                  required
                />
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-slate-300">Billing Frequency</span>
                <select
                  value={newFrequency}
                  onChange={(e) => setNewFrequency(e.target.value as any)}
                  className="h-10 rounded-lg border border-white/10 bg-ink-800 px-3 text-xs text-slate-200 focus:outline-none"
                >
                  <option value="Monthly">Monthly</option>
                  <option value="Annual">Annual (with 15% discount)</option>
                </select>
              </label>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-slate-300">Group Quota</span>
                <input
                  type="number"
                  value={newGroupQuota}
                  onChange={(e) => setNewGroupQuota(Number(e.target.value))}
                  min={1}
                  className="h-10 rounded-lg border border-white/10 bg-ink-800 px-3 text-xs text-white focus:outline-none"
                  required
                />
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-slate-300">Circle Quota</span>
                <input
                  type="number"
                  value={newCircleQuota}
                  onChange={(e) => setNewCircleQuota(Number(e.target.value))}
                  min={1}
                  className="h-10 rounded-lg border border-white/10 bg-ink-800 px-3 text-xs text-white focus:outline-none"
                  required
                />
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-slate-300">Revenue Share (%)</span>
                <input
                  type="number"
                  value={newRevenueShare}
                  onChange={(e) => setNewRevenueShare(Number(e.target.value))}
                  min={0}
                  max={50}
                  className="h-10 rounded-lg border border-white/10 bg-ink-800 px-3 text-xs text-white focus:outline-none"
                  required
                />
              </label>
            </div>

            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-slate-300">
                Features &amp; Entitlements (one per line)
              </span>
              <textarea
                value={newFeaturesText}
                onChange={(e) => setNewFeaturesText(e.target.value)}
                rows={4}
                className="rounded-lg border border-white/10 bg-ink-800 p-3 text-xs text-white focus:outline-none"
                placeholder="e.g. Priority group approval&#10;Access to promotional campaigns&#10;Dedicated account manager"
              />
            </label>

            <div className="mt-2 flex justify-end gap-2">
              <Button variant="ghost" size="sm" type="button" onClick={() => setCreateModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" type="submit">
                Create &amp; Publish Plan
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {feedback && <Toast message={feedback} onDismiss={() => setFeedback(null)} />}
    </div>
  );
}
