import { Injectable, Logger } from "@nestjs/common";
import type { Payment } from "../generated/prisma/client.js";
import { Prisma } from "../generated/prisma/client.js";
import { jsonObject } from "../admin/admin.mappers.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { activatePlanTx } from "../business/plan-activation.js";
import { addDays } from "./payments.utils.js";

export interface SettlementHandle {
  provider?: string | null;
  providerRef?: string | null;
  mcomChargeId?: string | null;
  /** Amount reported by Central Hub, in minor units. */
  amountMinor?: string | null;
}

/**
 * Applies a paid MCOM charge exactly once.
 *
 * `confirm` and the provider webhook can race; the conditional PENDING → PAID
 * update is the claim. Only the caller that wins applies the entitlement.
 */
@Injectable()
export class PaymentSettlementService {
  private readonly logger = new Logger(PaymentSettlementService.name);

  constructor(private readonly prisma: PrismaService) {}

  async settlePaid(
    payment: Payment,
    handle: SettlementHandle = {},
  ): Promise<Payment> {
    if (handle.amountMinor && BigInt(handle.amountMinor) !== payment.amountMinor) {
      this.logger.error(
        `Amount mismatch for payment ${payment.id}: local=${payment.amountMinor.toString()} central=${handle.amountMinor}`,
      );
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: "PAID_UNFULFILLED",
          failureCode: "AMOUNT_MISMATCH",
          failureMessage: `Central Hub reported ${handle.amountMinor} but the local amount is ${payment.amountMinor.toString()}.`,
        },
      });
      return this.reload(payment.id);
    }

    try {
      const settled = await this.prisma.$transaction(async (tx) => {
        const claimed = await tx.payment.updateMany({
          where: {
            id: payment.id,
            status: { in: ["PENDING", "FAILED"] },
          },
          data: {
            status: "PAID",
            paidAt: new Date(),
            ...(handle.provider ? { provider: handle.provider } : {}),
            ...(handle.providerRef ? { providerRef: handle.providerRef } : {}),
            ...(handle.mcomChargeId
              ? { mcomChargeId: handle.mcomChargeId }
              : {}),
          },
        });

        if (claimed.count === 0) {
          const current = await tx.payment.findUnique({
            where: { id: payment.id },
          });
          return { payment: current ?? payment, applied: false };
        }

        const current = await tx.payment.findUniqueOrThrow({
          where: { id: payment.id },
        });

        if (current.purpose === "PLAN_ACCESS") {
          await this.applyPlanAccess(tx, current);
        } else if (current.purpose === "GROUP_CONTRIBUTION") {
          await this.applyGroupContribution(tx, current);
        }

        const updated = await tx.payment.findUniqueOrThrow({
          where: { id: payment.id },
        });
        return { payment: updated, applied: true };
      });

      if (!settled.applied) {
        this.logger.log(
          `Payment ${payment.id} was already settled (status ${settled.payment.status}).`,
        );
      }
      return settled.payment;
    } catch (error) {
      this.logger.error(
        `Payment ${payment.id} was captured but fulfilment failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: "PAID_UNFULFILLED",
          failureCode: "FULFILLMENT_FAILED",
          failureMessage:
            error instanceof Error ? error.message : "Fulfilment failed.",
        },
      });
      return this.reload(payment.id);
    }
  }

  private async applyPlanAccess(
    tx: Prisma.TransactionClient,
    payment: Payment,
  ) {
    const snapshot = jsonObject(payment.planSnapshot);
    if (!payment.businessId || !payment.userId) {
      throw new Error("Plan payment is missing its business or user.");
    }

    const business = await tx.business.findUnique({
      where: { id: payment.businessId },
    });
    if (!business) throw new Error("Business for this payment no longer exists.");

    const now = new Date();
    const accessDays = Number(snapshot.accessDays ?? 90);

    await activatePlanTx(tx, {
      businessId: payment.businessId,
      userId: payment.userId,
      actorName: business.name,
      planId:
        typeof snapshot.planId === "string" ? snapshot.planId : payment.planId,
      planName: String(snapshot.planName ?? "Plan"),
      variant: String(snapshot.variant ?? "Standard"),
      accessDays,
      accessFeeMinor: Number(snapshot.accessFeeMinor ?? 0),
      agreementAccepted: snapshot.agreementAccepted !== false,
      agreedAt: now,
      accessExpiresAt: addDays(now, accessDays),
    });

    await tx.auditLog.create({
      data: {
        action: "plan-payment",
        actorId: payment.userId,
        actorName: business.name,
        targetType: "payment",
        targetId: payment.id,
        targetName: String(snapshot.planName ?? "Plan"),
        detail: `MCOM Pay ${payment.method} payment of ${(Number(payment.amountMinor) / 100).toFixed(2)} GBP for ${String(
          snapshot.planName ?? "plan",
        )} access (${accessDays} days)`,
      },
    });
  }

  private async applyGroupContribution(
    tx: Prisma.TransactionClient,
    payment: Payment,
  ) {
    const snapshot = jsonObject(payment.groupSnapshot);
    const groupId = payment.groupId;
    const memberId = payment.memberId;
    if (!groupId || !memberId) {
      throw new Error("Contribution payment is missing its group or member.");
    }

    const group = await tx.group.findUnique({ where: { id: groupId } });
    if (!group) throw new Error("The group for this payment no longer exists.");

    const existing = await tx.groupMember.findUnique({
      where: { groupId_memberId: { groupId, memberId } },
    });
    const paidAt = new Date();

    if (existing) {
      await tx.groupMember.update({
        where: { id: existing.id },
        data: {
          status: "active",
          contributionStatus: "paid",
          contributionPaidAt: paidAt,
          lastActiveAt: paidAt,
        },
      });
    } else {
      await tx.groupMember.create({
        data: {
          groupId,
          memberId,
          fullName: String(snapshot.fullName ?? "Member"),
          businessName:
            typeof snapshot.businessName === "string"
              ? snapshot.businessName
              : null,
          category:
            typeof snapshot.category === "string" ? snapshot.category : null,
          location:
            typeof snapshot.location === "string" ? snapshot.location : null,
          status: "active",
          role: String(snapshot.role ?? "peripheral"),
          tier: String(snapshot.tier ?? "Free"),
          contributionStatus: "paid",
          contributionPaidAt: paidAt,
        },
      });
      await tx.group.update({
        where: { id: groupId },
        data: { memberCount: { increment: 1 } },
      });
    }

    await tx.groupActivity.create({
      data: {
        groupId,
        actorName: String(snapshot.fullName ?? "Member"),
        kind: existing ? "contribution" : "join",
        message: existing
          ? `${String(snapshot.fullName ?? "Member")} paid their contribution`
          : `${String(snapshot.fullName ?? "Member")} joined the group`,
      },
    });

    await tx.auditLog.create({
      data: {
        action: existing ? "contribution-updated" : "member-added",
        actorId: payment.userId ?? memberId,
        actorName: String(snapshot.fullName ?? "Member"),
        targetType: "member",
        targetId: memberId,
        targetName: String(snapshot.fullName ?? "Member"),
        detail: existing
          ? `Contribution paid for ${group.name} (${payment.periodKey ?? "once"})`
          : `Joined ${group.name} after paying the contribution`,
      },
    });
  }

  private async reload(id: string): Promise<Payment> {
    return this.prisma.payment.findUniqueOrThrow({ where: { id } });
  }
}
