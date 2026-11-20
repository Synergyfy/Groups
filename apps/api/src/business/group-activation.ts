import type { PrismaClient } from "../generated/prisma/client.js";
import type { GroupCreationRules, PlanVariant } from "./business.types.js";
import {
  normalizeVariant,
  recruitmentTargetFor,
  toBusinessConfig,
} from "./business.rules.js";

/**
 * Statuses that activation sync is allowed to move between. Admin-controlled
 * lifecycle states (Suspended, Closed, Pending Review) are never overwritten.
 */
const OPEN_STATUSES = ["Active", "Recruiting"];

interface OwnerPlan {
  planName: string;
  variant: PlanVariant;
}

export async function loadGroupCreationRules(
  prisma: PrismaClient,
): Promise<GroupCreationRules> {
  const row = await prisma.adminConfig.findFirst();
  return toBusinessConfig(row).groupCreationRules;
}

async function ownerPlansFor(
  prisma: PrismaClient,
  ownerIds: string[],
): Promise<Map<string, OwnerPlan>> {
  const unique = [...new Set(ownerIds.filter(Boolean))];
  if (unique.length === 0) return new Map();

  const [plans, businesses] = await Promise.all([
    prisma.businessPlan.findMany({
      where: { businessId: { in: unique } },
      select: { businessId: true, planName: true, variant: true },
    }),
    prisma.business.findMany({
      where: { id: { in: unique } },
      select: { id: true, tier: true },
    }),
  ]);

  const planByBusiness = new Map(
    plans.map((plan) => [plan.businessId, plan]),
  );
  const businessById = new Map(
    businesses.map((business) => [business.id, business]),
  );

  return new Map(
    unique.map((id) => {
      const plan = planByBusiness.get(id);
      const business = businessById.get(id);
      return [
        id,
        {
          planName: plan?.planName?.trim() || business?.tier || "Free",
          variant: normalizeVariant(plan?.variant),
        },
      ];
    }),
  );
}

function statusFor(
  memberCount: number,
  plan: OwnerPlan,
  rules: GroupCreationRules,
  requiredSize: number | null = null,
): "Active" | "Recruiting" {
  if (!rules.activationEnabled) return "Active";
  const target = Math.max(
    recruitmentTargetFor(rules, plan.planName, plan.variant),
    Math.max(0, requiredSize ?? 0),
  );
  return memberCount >= target ? "Active" : "Recruiting";
}

/**
 * Recomputes the persisted lifecycle status of one user-created group. Call
 * this after any membership change so a group switches on as soon as it reaches
 * its plan's recruitment target. Activation is a one-way gate: once a group is
 * Active it is never demoted by a later membership drop or rule change, and
 * administrator-controlled states are left untouched.
 */
export async function syncGroupActivationStatus(
  prisma: PrismaClient,
  groupId: string,
  rules?: GroupCreationRules,
): Promise<void> {
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    select: {
      id: true,
      ownerId: true,
      source: true,
      status: true,
      memberCount: true,
      requiredSize: true,
    },
  });
  if (
    !group ||
    group.source !== "user-created" ||
    group.status !== "Recruiting"
  ) {
    return;
  }

  const creationRules = rules ?? (await loadGroupCreationRules(prisma));
  const plans = await ownerPlansFor(
    prisma,
    group.ownerId ? [group.ownerId] : [],
  );
  const plan = plans.get(group.ownerId ?? "") ?? {
    planName: "Free",
    variant: "Standard" as PlanVariant,
  };
  const next = statusFor(
    group.memberCount,
    plan,
    creationRules,
    group.requiredSize,
  );

  if (next !== group.status) {
    await prisma.group.update({
      where: { id: group.id },
      data: { status: next },
    });
  }
}

/**
 * Recomputes every open, user-created group. Used when the administrator
 * changes the activation toggle, the recruitment matrix, or a plan.
 */
export async function syncAllGroupActivations(
  prisma: PrismaClient,
  rules?: GroupCreationRules,
): Promise<void> {
  const creationRules = rules ?? (await loadGroupCreationRules(prisma));
  const groups = await prisma.group.findMany({
    where: {
      source: "user-created",
      status: { in: OPEN_STATUSES },
    },
    select: {
      id: true,
      ownerId: true,
      status: true,
      memberCount: true,
      requiredSize: true,
    },
  });
  if (groups.length === 0) return;

  const plans = await ownerPlansFor(
    prisma,
    groups
      .map((group) => group.ownerId)
      .filter((id): id is string => Boolean(id)),
  );

  const updates = groups.flatMap((group) => {
    if (group.status !== "Recruiting") return [];
    const plan = plans.get(group.ownerId ?? "") ?? {
      planName: "Free",
      variant: "Standard" as PlanVariant,
    };
    const next = statusFor(
      group.memberCount,
      plan,
      creationRules,
      group.requiredSize,
    );
    return next === "Active"
      ? [prisma.group.update({ where: { id: group.id }, data: { status: next } })]
      : [];
  });

  if (updates.length > 0) {
    await prisma.$transaction(updates);
  }
}
