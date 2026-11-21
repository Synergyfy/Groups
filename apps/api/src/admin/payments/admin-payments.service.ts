import {
  BadGatewayException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import type { SessionUser } from "../../auth/auth.types.js";
import type { Payment } from "../../generated/prisma/client.js";
import { Prisma } from "../../generated/prisma/client.js";
import { PrismaService } from "../../prisma/prisma.service.js";
import {
  McomPayClient,
  McomPayError,
  type McomAppBalance,
  type McomChargeSplits,
} from "../../payments/mcom-pay.client.js";
import { AdminAuditService } from "../admin-audit.service.js";
import { jsonObject } from "../admin.mappers.js";
import type {
  AdminPaymentQueryDto,
  AdminRefundPaymentDto,
} from "../dto/admin.dto.js";

type PaymentWithRelations = Payment & {
  user?: {
    id: string;
    fullName: string | null;
    displayName: string | null;
    email: string;
  } | null;
  group?: { id: string; name: string } | null;
};

/**
 * Admin view of MCOM Pay: the app payable balance, local payment ledger and
 * refunds. Refunds always go through MCOM's /refund endpoint; we never mutate
 * the central ledger locally.
 */
@Injectable()
export class AdminPaymentsService {
  private readonly logger = new Logger(AdminPaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mcom: McomPayClient,
    private readonly audit: AdminAuditService,
  ) {}

  async overview() {
    const [balance, grouped, recent] = await Promise.all([
      this.loadBalance(),
      this.prisma.payment.groupBy({
        by: ["status"],
        where: { deletedAt: null },
        _count: { _all: true },
        _sum: { amountMinor: true, refundedMinor: true },
      }),
      this.prisma.payment.findMany({
        where: { deletedAt: null },
        orderBy: { createdAt: "desc" },
        take: 10,
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              displayName: true,
              email: true,
            },
          },
          group: { select: { id: true, name: true } },
        },
      }),
    ]);

    const byStatus = grouped.map((row) => ({
      status: row.status,
      count: row._count._all,
      amountMinor: (row._sum.amountMinor ?? 0n).toString(),
      refundedMinor: (row._sum.refundedMinor ?? 0n).toString(),
    }));

    const settledStatuses = ["PAID", "PARTIALLY_REFUNDED", "REFUNDED"];
    const grossMinor = grouped
      .filter((row) => settledStatuses.includes(row.status))
      .reduce((sum, row) => sum + (row._sum.amountMinor ?? 0n), 0n);
    const refundedMinor = grouped.reduce(
      (sum, row) => sum + (row._sum.refundedMinor ?? 0n),
      0n,
    );
    const netMinor =
      grossMinor > refundedMinor ? grossMinor - refundedMinor : 0n;

    const settlements = await Promise.all(
      recent.map(async (payment) => {
        if (!this.mcom.enabled) return null;
        if (!payment.mcomChargeId || !this.hasSplits(payment)) return null;
        try {
          return (await this.mcom.getChargeSplits(payment.mcomChargeId))
            .settlementState;
        } catch {
          return null;
        }
      }),
    );

    return {
      balance,
      summary: {
        grossMinor: grossMinor.toString(),
        refundedMinor: refundedMinor.toString(),
        netMinor: netMinor.toString(),
        currency: "GBP",
      },
      byStatus,
      recent: recent.map((payment, index) => ({
        ...this.map(payment),
        settlementState: settlements[index],
      })),
    };
  }

  async list(query: AdminPaymentQueryDto) {
    const page = query.page ?? 1;
    const limit = Math.min(100, query.limit ?? 25);
    const where: Prisma.PaymentWhereInput = { deletedAt: null };

    if (query.status && query.status !== "all") {
      where.status = query.status as Payment["status"];
    }
    if (query.purpose && query.purpose !== "all") {
      where.purpose = query.purpose as Payment["purpose"];
    }
    if (query.search?.trim()) {
      const search = query.search.trim();
      where.OR = [
        { reference: { contains: search, mode: "insensitive" } },
        { mcomChargeId: { contains: search, mode: "insensitive" } },
        { providerRef: { contains: search, mode: "insensitive" } },
        { user: { email: { contains: search, mode: "insensitive" } } },
        { user: { fullName: { contains: search, mode: "insensitive" } } },
        { group: { name: { contains: search, mode: "insensitive" } } },
      ];
    }

    const [total, payments] = await Promise.all([
      this.prisma.payment.count({ where }),
      this.prisma.payment.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              displayName: true,
              email: true,
            },
          },
          group: { select: { id: true, name: true } },
        },
      }),
    ]);

    return {
      data: payments.map((payment) => this.map(payment)),
      page,
      limit,
      total,
    };
  }

  async splits(paymentId: string): Promise<McomChargeSplits> {
    this.assertEnabled();
    const payment = await this.loadPayment(paymentId);
    if (!payment.mcomChargeId) {
      throw new ConflictException("This payment has no MCOM charge yet.");
    }
    try {
      return await this.mcom.getChargeSplits(payment.mcomChargeId);
    } catch (error) {
      this.throwMcomError(error);
    }
  }

  async refund(
    paymentId: string,
    dto: AdminRefundPaymentDto,
    actor?: SessionUser,
  ) {
    this.assertEnabled();
    const payment = await this.loadPayment(paymentId);
    if (!payment.mcomChargeId) {
      throw new ConflictException("This payment has no MCOM charge yet.");
    }
    if (
      payment.status !== "PAID" &&
      payment.status !== "PARTIALLY_REFUNDED"
    ) {
      throw new ConflictException(
        `Only paid payments can be refunded (current status ${payment.status}).`,
      );
    }

    const remaining = payment.amountMinor - payment.refundedMinor;
    if (remaining <= 0n) {
      throw new ConflictException("This payment is already fully refunded.");
    }

    const amountMinor = dto.amountMinor
      ? this.parseMinor(dto.amountMinor, "amountMinor")
      : remaining;
    if (amountMinor <= 0n || amountMinor > remaining) {
      throw new BadRequestException(
        `Refund amount must be between 1 and ${remaining.toString()} minor units.`,
      );
    }

    const totalAfter = payment.refundedMinor + amountMinor;
    const idempotencyKey = `mcom-group-refund-${payment.id}-${totalAfter.toString()}`;

    try {
      const result = await this.mcom.refundCharge(
        payment.mcomChargeId,
        { amountMinor: amountMinor.toString(), reason: dto.reason },
        idempotencyKey,
      );
      const reported = result.charge.refundedMinor
        ? this.parseMinor(result.charge.refundedMinor, "refundedMinor")
        : totalAfter;
      const capped =
        reported > payment.amountMinor ? payment.amountMinor : reported;

      const updated = await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          refundedMinor: capped,
          status:
            capped >= payment.amountMinor ? "REFUNDED" : "PARTIALLY_REFUNDED",
        },
      });

      await this.audit.record(actor, {
        action: "payment-refund",
        targetType: "payment",
        targetId: payment.id,
        targetName: payment.reference,
        detail: `Refunded ${amountMinor.toString()} minor units on charge ${payment.mcomChargeId}.`,
      });

      return {
        payment: this.map(updated),
        refund: result.refund,
      };
    } catch (error) {
      this.throwMcomError(error);
    }
  }

  private assertEnabled() {
    if (!this.mcom.enabled) {
      throw new ServiceUnavailableException(
        "MCOM Pay is disabled for this environment.",
      );
    }
  }

  private async loadPayment(paymentId: string): Promise<Payment> {
    const payment = await this.prisma.payment.findFirst({
      where: { id: paymentId, deletedAt: null },
    });
    if (!payment) throw new NotFoundException("Payment not found");
    return payment;
  }

  private async loadBalance(): Promise<
    | { available: true; data: McomAppBalance }
    | { available: false; data: null; message: string }
  > {
    if (!this.mcom.enabled) {
      return {
        available: false,
        data: null,
        message: "MCOM Pay is disabled for this environment.",
      };
    }
    try {
      return { available: true, data: await this.mcom.getAppBalance() };
    } catch (error) {
      this.logger.warn(
        `Could not load MCOM Pay balance: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return {
        available: false,
        data: null,
        message:
          error instanceof McomPayError
            ? error.message
            : "MCOM Pay balance is unavailable.",
      };
    }
  }

  private parseMinor(value: string, field: string): bigint {
    const trimmed = value.trim();
    if (!/^[0-9]+$/.test(trimmed)) {
      throw new BadRequestException(
        `${field} must be a positive integer minor-unit string.`,
      );
    }
    return BigInt(trimmed);
  }

  private hasSplits(payment: Payment): boolean {
    const mcomPay = jsonObject(jsonObject(payment.metadata).mcomPay);
    return Array.isArray(mcomPay.splits) && mcomPay.splits.length > 0;
  }

  private map(payment: PaymentWithRelations) {
    const metadata = jsonObject(payment.metadata);
    const mcomPay = jsonObject(metadata.mcomPay);
    const payee = jsonObject(mcomPay.payee);
    const plan = jsonObject(payment.planSnapshot);
    const group = payment.group;
    const user = payment.user;

    return {
      id: payment.id,
      purpose: payment.purpose,
      status: payment.status,
      method: payment.method,
      amountMinor: payment.amountMinor.toString(),
      feeMinor: payment.feeMinor?.toString() ?? null,
      netMinor: payment.netMinor?.toString() ?? null,
      refundedMinor: payment.refundedMinor.toString(),
      currency: payment.currency,
      reference: payment.reference,
      mcomChargeId: payment.mcomChargeId,
      provider: payment.provider,
      providerRef: payment.providerRef,
      intent: typeof mcomPay.intent === "string" ? mcomPay.intent : null,
      payee:
        typeof payee.id === "string" && typeof payee.name === "string"
          ? {
              type: typeof payee.type === "string" ? payee.type : "external",
              id: payee.id,
              name: payee.name,
            }
          : null,
      payer: user
        ? {
            id: user.id,
            name: user.fullName ?? user.displayName ?? user.email,
            email: user.email,
          }
        : null,
      group: group ? { id: group.id, name: group.name } : null,
      planName: typeof plan.planName === "string" ? plan.planName : null,
      failureCode: payment.failureCode,
      failureMessage: payment.failureMessage,
      paidAt: payment.paidAt?.toISOString() ?? null,
      createdAt: payment.createdAt.toISOString(),
    };
  }

  private throwMcomError(error: unknown): never {
    if (error instanceof McomPayError) {
      if (error.httpStatus === 400 || error.httpStatus === 422) {
        throw new BadRequestException({
          code: error.code,
          message: error.message,
        });
      }
      if (error.httpStatus === 403) {
        throw new ForbiddenException({
          code: error.code,
          message: error.message,
        });
      }
      if (error.httpStatus === 404) {
        throw new NotFoundException(error.message);
      }
      if (error.httpStatus === 409) {
        throw new ConflictException({
          code: error.code,
          message: error.message,
        });
      }
      if (error.httpStatus === 429) {
        throw new ServiceUnavailableException({
          code: "RATE_LIMITED",
          message: "MCOM Pay is rate limiting requests. Please try again shortly.",
        });
      }
      this.logger.error(
        `MCOM Pay refund error ${error.httpStatus} ${error.code}: ${error.message}`,
      );
      throw new BadGatewayException(
        "MCOM Pay could not complete this operation. Please try again.",
      );
    }
    this.logger.error(
      `Unexpected MCOM Pay admin error: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    throw new BadGatewayException("MCOM Pay could not complete this operation.");
  }
}
