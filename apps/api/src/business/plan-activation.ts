import type { Prisma } from "../generated/prisma/client.js";

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
