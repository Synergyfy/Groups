import { Prisma } from "../generated/prisma/client.js";

export interface PlanActivationInput {
  businessId: string;
  userId: string;
  actorName: string;
  planId: string | null;
  planName: string;
  variant: string;
  accessDays: number;
  accessFeeMinor: number;
  agreementAccepted: boolean;
  agreedAt: Date;
  accessExpiresAt: Date;
}

/**
 * Apply a paid plan selection. Shared by the legacy activation path and MCOM
 * Pay settlement so both write exactly the same rows.
 */
export async function activatePlanTx(
  tx: Prisma.TransactionClient,
  input: PlanActivationInput,
) {
  const previous = await tx.businessPlan.findUnique({
    where: { businessId: input.businessId },
    select: { planId: true },
  });

  const updated = await tx.businessPlan.upsert({
    where: { businessId: input.businessId },
    update: {
      variant: input.variant,
      planId: input.planId,
      planName: input.planName,
      status: "Active",
      paid: true,
      accessDays: input.accessDays,
      accessFeeMinor: input.accessFeeMinor,
      agreementAccepted: input.agreementAccepted,
      agreedAt: input.agreedAt,
      accessExpiresAt: input.accessExpiresAt,
      accessSource: "local",
      externalPlanId: null,
      membershipName: null,
      accessReason: null,
      upgradeUrl: null,
      programmeTasks: Prisma.JsonNull,
      centralQuotas: Prisma.JsonNull,
    },
    create: {
      businessId: input.businessId,
      variant: input.variant,
      planId: input.planId,
      planName: input.planName,
      status: "Active",
      paid: true,
      accessDays: input.accessDays,
      accessFeeMinor: input.accessFeeMinor,
      agreementAccepted: input.agreementAccepted,
      agreedAt: input.agreedAt,
      accessExpiresAt: input.accessExpiresAt,
    },
  });

  // Keep Plan.subscriberCount aligned with the BusinessPlan rows that drive
  // plan stats and MRR.
  const previousPlanId = previous?.planId ?? null;
  const nextPlanId = input.planId ?? null;
  if (previousPlanId && previousPlanId !== nextPlanId) {
    await tx.plan.updateMany({
      where: { id: previousPlanId, subscriberCount: { gt: 0 } },
      data: { subscriberCount: { decrement: 1 } },
    });
  }
  if (nextPlanId && previousPlanId !== nextPlanId) {
    await tx.plan.updateMany({
      where: { id: nextPlanId },
      data: { subscriberCount: { increment: 1 } },
    });
  }

  await tx.auditLog.create({
    data: {
      action: "business-updated",
      actorId: input.userId,
      actorName: input.actorName,
      targetType: "business",
      targetId: input.businessId,
      targetName: input.actorName,
      detail: `Plan activated (${input.planName}, ${input.accessDays}-day access)`,
    },
  });

  return updated;
}
