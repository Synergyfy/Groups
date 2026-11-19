import type {
  AdminConfig,
  BusinessPlan,
  Group,
  GroupMember,
  Invitation,
  Plan,
} from "../generated/prisma/client.js";
import { fromMinorPence } from "../common/money.js";
import {
  DEFAULT_ACCESS_RULES,
  DEFAULT_AUTOMATIC_GROUPING,
  DEFAULT_CIRCLE_TYPES,
  DEFAULT_GROUP_CREATION_RULES,
  DEFAULT_GROUP_TYPES,
  DEFAULT_MANDATORY_CIRCLES,
  DEFAULT_MANDATORY_GROUPS,
  DEFAULT_PAYMENT_RULES,
  FREE_PARTNER_PERMISSIONS,
  DEFAULT_PLATFORM_SETTINGS,
  DEFAULT_STAGE_LABELS,
} from "../admin/admin-defaults.js";
import { jsonObject } from "../admin/admin.mappers.js";
import type {
  AutomaticGroupConfig,
  BusinessConfig,
  CircleTypeConfigEntry,
  GroupActivationView,
  GroupCreationRules,
  GroupPaymentRules,
  GroupThreshold,
  GroupTypeConfig,
  JoinPlanView,
  MandatoryCircleRule,
  MandatoryGroupRule,
  PlanAccessView,
  PartnerPermissions,
  PlanVariant,
  Tier,
} from "./business.types.js";

const TIERS: Tier[] = ["Bronze", "Silver", "Gold", "Platinum"];
const VARIANTS: PlanVariant[] = ["Standard", "Pro", "Pro+"];

const ACCESS_LABELS = {
  open: "Anyone can join immediately.",
  request: "The owner reviews and approves each request.",
  eligibility: "Joining depends on the group's eligibility rules.",
  invitation: "Only invited members can join.",
} as const;

type GroupWithMembers = Group & { members?: GroupMember[] };

export function normalizeTier(value: string | null | undefined): Tier {
  const match = TIERS.find(
    (tier) => tier.toLowerCase() === (value ?? "").trim().toLowerCase(),
  );
  return match ?? "Bronze";
}

export function normalizeVariant(value: string | null | undefined): PlanVariant {
  const normalized = (value ?? "").toLowerCase();
  if (normalized.includes("pro+") || normalized.includes("pro plus")) {
    return "Pro+";
  }
  if (normalized.includes("pro")) {
    return "Pro";
  }
  return "Standard";
}

/**
 * Access length included with each plan variant: Standard 90 days, Pro 180
 * days and Pro+ one year.
 */
export function planAccessDays(variant: PlanVariant): 90 | 180 | 365 {
  if (variant === "Pro+") return 365;
  if (variant === "Pro") return 180;
  return 90;
}

export interface PlanIdentity {
  planId?: string | null;
  planName?: string | null;
  variant?: string | null;
  /** True once the member has actually purchased/activated a plan. */
  active: boolean;
}

/**
 * Checks whether a member satisfies a group's plan eligibility. An empty
 * `requiredPlanIds` list means the group is open to every plan.
 */
export function matchesRequiredPlans(
  requiredPlanIds: string[],
  plans: Pick<Plan, "id" | "name" | "variant">[],
  member: PlanIdentity | null,
): boolean {
  if (requiredPlanIds.length === 0) return true;
  if (!member || !member.active) return false;
  if (member.planId && requiredPlanIds.includes(member.planId)) return true;

  const rawName = member.planName?.trim();
  if (!rawName || rawName.toLowerCase() === "free") return false;
  const planName = rawName.toLowerCase();
  const variant = normalizeVariant(member.variant);
  return plans
    .filter((plan) => requiredPlanIds.includes(plan.id))
    .some(
      (plan) =>
        plan.name.trim().toLowerCase() === planName &&
        normalizeVariant(plan.variant) === variant,
    );
}

export function toPlanAccess(
  plan: BusinessPlan,
): PlanAccessView {
  return {
    ownerId: plan.businessId,
    variant: normalizeVariant(plan.variant),
    planName: plan.planName,
    status: plan.status,
    paid: plan.paid,
    accessDays: plan.accessDays,
    accessFee: fromMinorPence(plan.accessFeeMinor),
    accessFeeMinor: plan.accessFeeMinor,
    agreementAccepted: plan.agreementAccepted,
    agreedAt: plan.agreedAt?.toISOString(),
    accessExpiresAt: plan.accessExpiresAt?.toISOString(),
  };
}

export function toBusinessConfig(row: AdminConfig | null): BusinessConfig {
  const creation = {
    ...DEFAULT_GROUP_CREATION_RULES,
    ...jsonObject(row?.groupCreationRules),
  } as unknown as GroupCreationRules;
  const payment = {
    ...DEFAULT_PAYMENT_RULES,
    ...jsonObject(row?.paymentRules),
  } as unknown as GroupPaymentRules;
  const automatic = {
    ...DEFAULT_AUTOMATIC_GROUPING,
    ...jsonObject(row?.automaticGrouping),
  } as unknown as AutomaticGroupConfig;

  return {
    automaticGrouping: {
      enabled: automatic.enabled !== false,
      threshold: normalizeThreshold(automatic.threshold),
      method: String(automatic.method ?? DEFAULT_AUTOMATIC_GROUPING.method),
      scope: String(automatic.scope ?? DEFAULT_AUTOMATIC_GROUPING.scope),
      allowCombine: automatic.allowCombine === true,
    },
    groupTypes: normalizeGroupTypes(row?.groupTypes),
    stageLabels:
      Array.isArray(row?.stageLabels) && row.stageLabels.length > 0
        ? row.stageLabels.map(String)
        : DEFAULT_STAGE_LABELS,
    paymentRules: {
      allowPaid: payment.allowPaid !== false,
      minAmount: Number(payment.minAmount ?? DEFAULT_PAYMENT_RULES.minAmount),
      maxAmount: Number(payment.maxAmount ?? DEFAULT_PAYMENT_RULES.maxAmount),
      presets: Array.isArray(payment.presets)
        ? payment.presets.map(Number).filter((value) => Number.isFinite(value))
        : DEFAULT_PAYMENT_RULES.presets,
      allowCustom: payment.allowCustom !== false,
    },
    groupCreationRules: {
      allowedPlans: normalizePlanNames(
        creation.allowedPlans ??
          (creation as unknown as { allowedTiers?: unknown }).allowedTiers,
      ),
      allowedVariants: normalizeVariants(creation.allowedVariants),
      restrictToPlatformGroup: creation.restrictToPlatformGroup !== false,
      platformGroupId: creation.platformGroupId ?? null,
      recruitmentTargets: normalizeRecruitmentTargets(
        creation.recruitmentTargets,
      ),
      activationEnabled: creation.activationEnabled !== false,
      requirePaidAccess: creation.requirePaidAccess !== false,
      entryAccessDays: creation.entryAccessDays === 180 ? 180 : 90,
      entryAccessFee: Number(
        creation.entryAccessFee ??
          DEFAULT_GROUP_CREATION_RULES.entryAccessFee,
      ),
    },
    circleTypes: normalizeCircleTypes(row?.circleTypes),
    mandatoryCircles: normalizeMandatoryCircles(row?.mandatoryCircles),
    mandatoryGroups: normalizeMandatoryGroups(row?.mandatoryGroups),
    partnerDefaults: {
      ...FREE_PARTNER_PERMISSIONS,
      ...jsonObject(row?.partnerDefaults),
    } as unknown as PartnerPermissions,
    accessRules: {
      ...DEFAULT_ACCESS_RULES,
      ...jsonObject(row?.accessRules),
    },
    platformSettings: {
      ...DEFAULT_PLATFORM_SETTINGS,
      ...jsonObject(row?.platformSettings),
    },
  };
}

function normalizeThreshold(value: unknown): GroupThreshold {
  const numeric = Number(value);
  if (numeric === 6 || numeric === 12 || numeric === 18 || numeric === 24) {
    return numeric;
  }
  return 12;
}

function normalizePlanNames(value: unknown): string[] {
  if (!Array.isArray(value)) return ["Platinum"];
  const names = value
    .map((entry) => String(entry).trim())
    .filter((name) => name.length > 0)
    .filter((name, index, all) => all.indexOf(name) === index);
  return names.length > 0 ? names : ["Platinum"];
}

function normalizeVariants(value: unknown): PlanVariant[] {
  if (!Array.isArray(value)) return ["Pro+"];
  const variants = value
    .map((entry) => normalizeVariant(String(entry)))
    .filter((variant, index, all) => all.indexOf(variant) === index);
  return variants.length > 0 ? variants : ["Pro+"];
}

function normalizeGroupTypes(value: unknown): GroupTypeConfig[] {
  if (!Array.isArray(value) || value.length === 0) {
    return DEFAULT_GROUP_TYPES as GroupTypeConfig[];
  }
  return value.map((entry) => {
    const item = jsonObject(entry);
    return {
      type: String(item.type ?? "Other"),
      enabled: item.enabled !== false,
      allowCreate: item.allowCreate !== false,
      allowJoin: item.allowJoin !== false,
    };
  });
}

function normalizeRecruitmentTargets(
  value: unknown,
): Record<string, Record<PlanVariant, number>> {
  const source = jsonObject(value);
  const names = new Set([
    ...Object.keys(DEFAULT_GROUP_CREATION_RULES.recruitmentTargets),
    ...Object.keys(source),
  ]);
  const result: Record<string, Record<PlanVariant, number>> = {};
  for (const name of names) {
    const fallback =
      DEFAULT_GROUP_CREATION_RULES.recruitmentTargets[
        name as keyof typeof DEFAULT_GROUP_CREATION_RULES.recruitmentTargets
      ] ?? DEFAULT_GROUP_CREATION_RULES.recruitmentTargets.Bronze;
    const nameSource = jsonObject(source[name]);
    result[name] = {} as Record<PlanVariant, number>;
    for (const variant of VARIANTS) {
      const numeric = Number(nameSource[variant] ?? fallback[variant]);
      result[name][variant] = Number.isFinite(numeric)
        ? Math.max(0, numeric)
        : fallback[variant];
    }
  }
  return result;
}

function normalizeCircleTypes(value: unknown): CircleTypeConfigEntry[] {
  if (!Array.isArray(value) || value.length === 0) {
    return DEFAULT_CIRCLE_TYPES as CircleTypeConfigEntry[];
  }
  return value.map((entry, index) => {
    const item = jsonObject(entry);
    return {
      id: String(item.id ?? `ct-${index + 1}`),
      type: String(item.type ?? "Circle"),
      shortLabel: String(item.shortLabel ?? item.type ?? "Circle"),
      description: String(item.description ?? ""),
      accent: String(item.accent ?? "#a78bfa"),
      accentSoft: String(item.accentSoft ?? "rgba(167, 139, 250, 0.14)"),
      enabled: item.enabled !== false,
      mandatory: item.mandatory === true,
      minMembers: numberOrNull(item.minMembers),
      maxMembers: numberOrNull(item.maxMembers),
      requiresBanker: item.requiresBanker === true,
      allowedDurations: Array.isArray(item.allowedDurations)
        ? item.allowedDurations.map(Number).filter((duration) =>
            Number.isFinite(duration),
          )
        : [90],
    };
  });
}

function normalizeMandatoryCircles(value: unknown): MandatoryCircleRule[] {
  if (!Array.isArray(value) || value.length === 0) {
    return DEFAULT_MANDATORY_CIRCLES as MandatoryCircleRule[];
  }
  return value.map((entry) => {
    const item = jsonObject(entry);
    return {
      circleType: String(item.circleType ?? ""),
      required: item.required === true,
      appliesToTier:
        item.appliesToTier === "Free" || item.appliesToTier === "Paid"
          ? item.appliesToTier
          : "All",
      minMemberCount: Math.max(0, Number(item.minMemberCount ?? 0)),
      autoEnforce: item.autoEnforce === true,
    };
  });
}

function normalizeMandatoryGroups(value: unknown): MandatoryGroupRule[] {
  if (!Array.isArray(value) || value.length === 0) {
    return DEFAULT_MANDATORY_GROUPS as MandatoryGroupRule[];
  }
  return value.map((entry) => {
    const item = jsonObject(entry);
    return {
      type: String(item.type ?? "Other"),
      required: item.required === true,
      pricing: item.pricing === "paid" ? "paid" : "owner-choice",
    };
  });
}

function numberOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

export interface PlanQuotas {
  groups: number;
  circles: number;
}

/**
 * Quotas that come from the platform access rules when the plan is not
 * attached to a published plan. Paid plans use the paid caps; pending
 * (unpaid) plans use the free caps.
 */
export function accessQuotas(
  config: BusinessConfig,
  plan: BusinessPlan,
): PlanQuotas {
  const quotas = jsonObject(config.accessRules.quotas);
  const paid = plan.paid;
  const groups = numberOrNull(
    paid ? quotas.paidMaxGroups : quotas.freeMaxGroups,
  );
  const circles = numberOrNull(
    paid ? quotas.paidMaxCircles : quotas.freeMaxCircles,
  );
  return {
    groups: groups && groups > 0 ? groups : paid ? 25 : 3,
    circles: circles && circles > 0 ? circles : paid ? 15 : 2,
  };
}

export function canCreateGroups(
  plan: BusinessPlan,
  rules: GroupCreationRules,
): boolean {
  if (!plan.agreementAccepted) return false;
  if (rules.requirePaidAccess && !plan.paid) return false;
  return (
    rules.allowedPlans.some((name) => name === plan.planName) &&
    rules.allowedVariants.includes(normalizeVariant(plan.variant))
  );
}

export function creationRightsLabel(rules: GroupCreationRules): string {
  const combos = rules.allowedPlans.flatMap((planName) =>
    rules.allowedVariants.map((variant) => `${planName} ${variant}`),
  );
  if (combos.length === 0) return "No plan can create groups";
  if (combos.length > 4) {
    return `${combos.slice(0, 4).join(", ")} and ${combos.length - 4} more`;
  }
  return `${combos.join(", ")}${
    combos.length === 1 ? " plan" : " plans"
  } only`;
}

export function activationFor(
  group: GroupWithMembers,
  planName: string,
  variant: PlanVariant,
  rules: GroupCreationRules,
): GroupActivationView {
  const current = group.members?.length ?? group.memberCount;
  const fallback = Object.values(rules.recruitmentTargets)[0]?.Standard ?? 0;
  const target =
    rules.recruitmentTargets[planName]?.[variant] ?? fallback;
  const gated =
    rules.activationEnabled &&
    group.source === "user-created" &&
    group.status !== "Suspended" &&
    group.status !== "Closed";
  const active = !gated || current >= target;

  return {
    target,
    current,
    remaining: Math.max(target - current, 0),
    percent: Math.min(Math.round((current / Math.max(target, 1)) * 100), 100),
    active,
    gated,
    planName,
    variant,
  };
}

export function joinPlanFor(
  group: Group,
  typeConfig: GroupTypeConfig | undefined,
  pendingRequest: Invitation | null,
  pendingInvite: Invitation | null,
  businessId: string,
  planEligible = true,
): JoinPlanView {
  if (group.ownerId === businessId) {
    return {
      action: "none",
      label: "You own this group",
      hint: "Manage members, invitations and rules from Settings.",
      disabled: true,
      reason: "owner",
    };
  }
  if (group.status === "Closed" || group.status === "Suspended") {
    return {
      action: "none",
      label: "Group closed",
      hint: `This group is ${group.status.toLowerCase()} and is not accepting members.`,
      disabled: true,
      reason: "group-closed",
    };
  }
  if (typeConfig && (!typeConfig.enabled || !typeConfig.allowJoin)) {
    return {
      action: "none",
      label: "Joining disabled",
      hint: "Administrators turned off joining for this group type.",
      disabled: true,
      reason: "type-disabled",
    };
  }
  if (!planEligible) {
    return {
      action: "none",
      label: "Plan plan required",
      hint: "This group is only open to members on selected plan plans.",
      disabled: true,
      reason: "plan-required",
    };
  }
  if (pendingRequest) {
    return {
      action: "none",
      label: "Request pending",
      hint: "Your request to join is waiting for the owner.",
      disabled: true,
      reason: "request-pending",
    };
  }
  if (pendingInvite) {
    return {
      action: "none",
      label: "Invitation waiting",
      hint: "You have a pending invitation for this group.",
      disabled: true,
      reason: "invitation-waiting",
    };
  }
  if (group.accessType === "invitation") {
    return {
      action: "none",
      label: "Invitation only",
      hint: ACCESS_LABELS.invitation,
      disabled: true,
      reason: "invitation-only",
    };
  }
  if (group.accessType === "open") {
    return {
      action: "join",
      label: "Join group",
      hint: ACCESS_LABELS.open,
      disabled: false,
      reason: "open",
    };
  }
  const label =
    group.accessType === "eligibility" ? "Check eligibility" : "Request to join";
  return {
    action: "request",
    label,
    hint:
      ACCESS_LABELS[group.accessType as keyof typeof ACCESS_LABELS] ??
      ACCESS_LABELS.request,
    disabled: false,
    reason:
      group.accessType === "eligibility" ? "eligible" : "request-required",
  };
}

export interface GroupStatsView {
  total: number;
  mine: number;
  owned: number;
  automatic: number;
  userCreated: number;
  pendingInvites: number;
  openRequests: number;
}

export interface PlatformGroupCounts {
  total: number;
  automatic: number;
  userCreated: number;
}

export function groupStatsFor(
  platform: PlatformGroupCounts,
  myGroups: Pick<Group, "id" | "ownerId">[],
  pendingInvites: number,
  openRequests: number,
  businessId: string,
): GroupStatsView {
  const ownedIds = new Set(
    myGroups
      .filter((group) => group.ownerId === businessId)
      .map((group) => group.id),
  );

  return {
    total: platform.total,
    mine: myGroups.length,
    owned: ownedIds.size,
    automatic: platform.automatic,
    userCreated: platform.userCreated,
    pendingInvites,
    openRequests,
  };
}

export function automaticProgressFor(
  group: GroupWithMembers | null,
  config: AutomaticGroupConfig,
) {
  const current = group ? (group.members?.length ?? group.memberCount) : 0;
  return {
    group: null,
    current,
    threshold: config.threshold,
    remaining: Math.max(config.threshold - current, 0),
    percent: Math.min(
      Math.round((current / Math.max(config.threshold, 1)) * 100),
      100,
    ),
    enabled: config.enabled,
    method: config.method,
    scope: config.scope,
  };
}

export function planForOwner(
  fallbackPlanName: string | null | undefined,
  isCurrentBusiness: boolean,
  currentPlan: BusinessPlan,
): { planName: string; variant: PlanVariant } {
  if (isCurrentBusiness) {
    return {
      planName: currentPlan.planName,
      variant: normalizeVariant(currentPlan.variant),
    };
  }
  return {
    planName: fallbackPlanName?.trim() || "Free",
    variant: "Standard",
  };
}
