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
  CentralProgrammeTask,
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
  const expired = Boolean(
    plan.accessExpiresAt && plan.accessExpiresAt.getTime() <= Date.now(),
  );
  const accessSource = normalizeAccessSource(plan.accessSource);
  const trialDaysRemaining =
    accessSource === "trial" && plan.accessExpiresAt
      ? Math.max(
          0,
          Math.ceil(
            (plan.accessExpiresAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000),
          ),
        )
      : undefined;

  return {
    ownerId: plan.businessId,
    variant: normalizeVariant(plan.variant),
    planName: plan.planName,
    status: expired ? "Expired" : plan.status,
    paid: plan.paid,
    accessDays: plan.accessDays,
    accessFee: fromMinorPence(plan.accessFeeMinor),
    accessFeeMinor: plan.accessFeeMinor,
    agreementAccepted: plan.agreementAccepted,
    agreedAt: plan.agreedAt?.toISOString(),
    accessExpiresAt: plan.accessExpiresAt?.toISOString(),
    accessSource,
    externalPlanId: plan.externalPlanId ?? undefined,
    membershipName: plan.membershipName ?? undefined,
    accessReason: plan.accessReason ?? undefined,
    upgradeUrl: plan.upgradeUrl ?? undefined,
    trialDaysRemaining,
    programmeTasks: Array.isArray(plan.programmeTasks)
      ? (plan.programmeTasks as unknown as CentralProgrammeTask[])
      : undefined,
    quotas: centralQuotas(plan).quotas,
    limits: centralQuotas(plan).limits,
    features: centralQuotas(plan).features,
  };
}

function centralQuotas(plan: BusinessPlan): {
  quotas?: Record<string, unknown>;
  limits?: Record<string, unknown>;
  features?: string[];
} {
  if (plan.accessSource === "local") return {};
  const stored = jsonObject(plan.centralQuotas);
  const quotas = jsonObject(stored.quotas);
  const limits = jsonObject(stored.limits);
  return {
    quotas: Object.keys(quotas).length > 0 ? quotas : undefined,
    limits: Object.keys(limits).length > 0 ? limits : undefined,
    features: Array.isArray(stored.features)
      ? stored.features.map(String)
      : undefined,
  };
}

function normalizeAccessSource(value: string | null | undefined): PlanAccessView["accessSource"] {
  return value === "membership" ||
    value === "access_pass" ||
    value === "trial"
    ? value
    : "local";
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
  const allowedPlans = normalizePlanNames(
    creation.allowedPlans ??
      (creation as unknown as { allowedTiers?: unknown }).allowedTiers,
  );
  const allowedVariants = normalizeVariants(creation.allowedVariants);

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
      allowedPlans,
      allowedVariants,
      planCreationRights: normalizePlanCreationRights(
        creation.planCreationRights,
        allowedPlans,
        allowedVariants,
      ),
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

/**
 * Per plan+variant creation rights. Older saved configurations only have the
 * allowedPlans/allowedVariants cross-product, so those are expanded into the
 * same shape and every consumer can read one representation.
 */
function normalizePlanCreationRights(
  value: unknown,
  allowedPlans: string[],
  allowedVariants: PlanVariant[],
): Record<string, Record<PlanVariant, boolean>> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return Object.fromEntries(
      allowedPlans.map((planName) => [
        planName,
        Object.fromEntries(
          VARIANTS.map((variant) => [
            variant,
            allowedVariants.includes(variant),
          ]),
        ) as Record<PlanVariant, boolean>,
      ]),
    );
  }

  const source = jsonObject(value);
  const result: Record<string, Record<PlanVariant, boolean>> = {};
  for (const [planName, raw] of Object.entries(source)) {
    const entry = jsonObject(raw);
    result[planName] = Object.fromEntries(
      VARIANTS.map((variant) => [variant, entry[variant] === true]),
    ) as Record<PlanVariant, boolean>;
  }
  return result;
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
  // Read exactly what the administrator saved. Missing entries mean "no
  // requirement" (0) instead of silently falling back to another plan's target,
  // so the matrix shown in the admin console mirrors runtime enforcement.
  const source = jsonObject(value);
  const result: Record<string, Record<PlanVariant, number>> = {};
  for (const [name, raw] of Object.entries(source)) {
    const nameSource = jsonObject(raw);
    result[name] = {} as Record<PlanVariant, number>;
    for (const variant of VARIANTS) {
      const numeric = Number(nameSource[variant] ?? 0);
      result[name][variant] = Number.isFinite(numeric)
        ? Math.max(0, numeric)
        : 0;
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

  // A Central Hub membership/pass/trial may publish its own quotas. Honour
  // them when present; otherwise fall back to this app's paid/free caps.
  if (plan.accessSource !== "local") {
    const central = jsonObject(
      jsonObject(plan.centralQuotas).quotas,
    );
    const centralGroups = numberOrNull(
      central.maxGroups ?? central.groups ?? central.groupLimit,
    );
    const centralCircles = numberOrNull(
      central.maxCircles ?? central.circles ?? central.circleLimit,
    );
    if (centralGroups !== null || centralCircles !== null) {
      return {
        groups:
          centralGroups && centralGroups > 0
            ? centralGroups
            : plan.paid
              ? 25
              : config.groupCreationRules.requirePaidAccess
                ? 3
                : 25,
        circles:
          centralCircles && centralCircles > 0
            ? centralCircles
            : plan.paid
              ? 15
              : 2,
      };
    }
  }

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

/**
 * A business may use dashboard features only while its plan is Active and its
 * paid access period has not elapsed. Pending/new businesses must choose and
 * activate a plan first.
 */
export function isPlanActive(
  plan: Pick<BusinessPlan, "status" | "accessExpiresAt">,
  now: number = Date.now(),
): boolean {
  if (plan.status !== "Active") return false;
  return !plan.accessExpiresAt || plan.accessExpiresAt.getTime() > now;
}

export function canCreateGroups(
  plan: BusinessPlan,
  rules: GroupCreationRules,
): boolean {
  // Central Hub access has already passed its own gate (membership/pass paid,
  // or a live trial window), so the local agreement/fee does not apply.
  const central = plan.accessSource !== "local";
  if (!central && !plan.agreementAccepted) return false;
  if (!central && rules.requirePaidAccess && !plan.paid) return false;
  const variant = normalizeVariant(plan.variant);
  const rights = rules.planCreationRights?.[plan.planName];
  if (rights) return rights[variant] === true;
  return (
    rules.allowedPlans.some((name) => name === plan.planName) &&
    rules.allowedVariants.includes(variant)
  );
}

export function creationRightsLabel(rules: GroupCreationRules): string {
  const combos = rules.planCreationRights
    ? Object.entries(rules.planCreationRights).flatMap(([planName, variants]) =>
        VARIANTS.filter((variant) => variants[variant] === true).map(
          (variant) => `${planName} ${variant}`,
        ),
      )
    : rules.allowedPlans.flatMap((planName) =>
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

/**
 * The recruitment target configured for a plan/variant pair. A missing entry
 * means "no requirement" rather than silently borrowing another plan's target,
 * so the number shown in the admin matrix is the number that is enforced.
 */
export function recruitmentTargetFor(
  rules: GroupCreationRules,
  planName: string,
  variant: PlanVariant,
): number {
  const configured = rules.recruitmentTargets[planName]?.[variant];
  const target = Number(configured);
  return Number.isFinite(target) ? Math.max(0, target) : 0;
}

/**
 * Mandatory circle rules that apply to the business's current tier. A "Free"
 * rule applies while the plan is unpaid, "Paid" when it is paid, "All" always.
 */
export function applicableMandatoryCircles(
  rules: MandatoryCircleRule[],
  paid: boolean,
): MandatoryCircleRule[] {
  const tier = paid ? "Paid" : "Free";
  return rules.filter(
    (rule) =>
      rule.required &&
      (rule.appliesToTier === "All" || rule.appliesToTier === tier),
  );
}

export function unsatisfiedMandatoryCircles(
  rules: MandatoryCircleRule[],
  circles: Array<{ type: string; memberIds: string[] }>,
): Array<{ rule: MandatoryCircleRule; current: number; required: number }> {
  return rules.flatMap((rule) => {
    const circle = circles.find((entry) => entry.type === rule.circleType);
    const current = circle?.memberIds.length ?? 0;
    if (circle && current >= rule.minMemberCount) return [];
    return [{ rule, current, required: rule.minMemberCount }];
  });
}

export function activationFor(
  group: GroupWithMembers,
  planName: string,
  variant: PlanVariant,
  rules: GroupCreationRules,
): GroupActivationView {
  const current = group.members?.length ?? group.memberCount;
  const target = Math.max(
    recruitmentTargetFor(rules, planName, variant),
    Math.max(0, group.requiredSize ?? 0),
  );
  // Activation is a one-way gate: the persisted Recruiting status is the
  // source of truth, so an Active (or admin-approved) group stays operational.
  const gated =
    rules.activationEnabled &&
    group.source === "user-created" &&
    group.status === "Recruiting";
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
  if (!["Active", "Recruiting"].includes(group.status)) {
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
