import type {
  McomEntitlement,
  PlatformEntitlementTask,
} from "./auth.types.js";

/** How the signed-in business reached this platform. */
export type AccessSource = "membership" | "access_pass" | "trial" | "none";

export interface AccessDecision {
  allowed: boolean;
  source: AccessSource;
  planId: string | null;
  planName: string | null;
  membershipName: string | null;
  expiresAt: string | null;
  quotas: Record<string, unknown>;
  limits: Record<string, unknown>;
  features: string[];
  trialDaysRemaining: number;
  tasks: PlatformEntitlementTask[];
  reason?: string;
  upgradeUrl?: string;
}

function sourceFor(accessType: string | undefined): AccessSource {
  switch (accessType) {
    case "PAID_MEMBERSHIP":
      return "membership";
    case "DIRECT_PACKAGE":
      return "access_pass";
    case "TRIAL_PROGRAMME":
      return "trial";
    default:
      return "none";
  }
}

function denied(
  entitlement: McomEntitlement | null | undefined,
  reason: string,
  extra: Partial<AccessDecision> = {},
): AccessDecision {
  const { trialContext } = entitlement ?? {};
  return {
    allowed: false,
    source: "none",
    planId: null,
    planName: null,
    membershipName:
      entitlement?.membershipContext?.membershipPlanName ?? null,
    expiresAt: null,
    quotas: {},
    limits: {},
    features: [],
    trialDaysRemaining: Number(trialContext?.daysRemaining ?? 0) || 0,
    tasks: trialContext?.programmeTasks ?? [],
    reason,
    upgradeUrl: entitlement?.access?.upgradeUrl,
    ...extra,
  };
}

/**
 * Reference implementation of the MCOM Central access decision. Applies the
 * contract exactly as published in the Ecosystem Access Verification skill:
 * `access.hasAccess` is authoritative, and an expired/cancelled plan is denied
 * even if the cached entitlement still claims access.
 */
export function decideAccess(
  entitlement: McomEntitlement | null | undefined,
): AccessDecision {
  if (!entitlement?.access?.hasAccess) {
    return denied(
      entitlement,
      entitlement?.access?.reason ?? "NO_ACTIVE_ENTITLEMENT",
    );
  }

  const plan = entitlement.plan;
  if (!plan) {
    return denied(entitlement, "NO_ACTIVE_ENTITLEMENT");
  }

  const { access, membershipContext, trialContext } = entitlement;

  if (
    (plan.expiresAt && new Date(plan.expiresAt).getTime() <= Date.now()) ||
    plan.status === "expired" ||
    plan.status === "cancelled"
  ) {
    return denied(entitlement, "NO_ACTIVE_ENTITLEMENT", {
      expiresAt: plan.expiresAt ?? null,
      trialDaysRemaining: 0,
      tasks: [],
    });
  }

  const source = sourceFor(access.accessType);
  if (source === "none") {
    return denied(entitlement, "NO_ACTIVE_ENTITLEMENT");
  }

  return {
    allowed: true,
    source,
    planId: plan.planId ?? null,
    planName: plan.planName ?? null,
    membershipName: membershipContext?.membershipPlanName ?? null,
    expiresAt:
      source === "trial"
        ? (plan.expiresAt ?? trialContext?.trialExpiresAt ?? null)
        : (plan.expiresAt ?? null),
    quotas: plan.quotas ?? {},
    limits: plan.limits ?? {},
    features: plan.features ?? [],
    trialDaysRemaining:
      source === "trial" ? Number(trialContext?.daysRemaining ?? 0) || 0 : 0,
    tasks: source === "trial" ? (trialContext?.programmeTasks ?? []) : [],
    reason: access.reason,
    upgradeUrl: access.upgradeUrl,
  };
}
