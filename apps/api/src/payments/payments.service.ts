import {
  BadGatewayException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { randomUUID } from "node:crypto";
import * as crypto from "node:crypto";
import type { Payment } from "../generated/prisma/client.js";
import { PaymentMethod, PaymentPurpose, Prisma } from "../generated/prisma/client.js";
import { iso, jsonObject } from "../admin/admin.mappers.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { BusinessContextService } from "../business/business-context.service.js";
import {
  matchesRequiredPlans,
  normalizeVariant,
  planAccessDays,
  toPlanAccess,
} from "../business/business.rules.js";
import { mapBusinessPlan } from "../business/business.mappers.js";
import { activatePlanTx } from "../business/plan-activation.js";
import type { SessionUser } from "../auth/auth.types.js";
import type { ConfirmPaymentDto } from "./dto/confirm-payment.dto.js";
import type { CreateContributionPaymentDto } from "./dto/create-contribution-payment.dto.js";
import type { CreatePlanPaymentDto } from "./dto/create-plan-payment.dto.js";
import {
  McomPayClient,
  McomPayError,
  type McomChargeDto,
  type McomPayMethod,
} from "./mcom-pay.client.js";
import { PaymentSettlementService } from "./payment-settlement.service.js";
import {
  contributionPeriodKey,
  dayKey,
} from "./payments.utils.js";

type Payer =
  | {
      kind: "BUSINESS";
      memberId: string;
      fullName: string;
      businessName: string | null;
      category: string | null;
      location: string | null;
      role: string;
      tier: string;
      variant?: string;
      planId?: string;
      eligible: boolean;
    }
  | {
      kind: "CUSTOMER";
      memberId: string;
      fullName: string;
      businessName: null;
      category: string;
      location: string | null;
      role: string;
      tier: string;
      variant?: string;
      planId?: string;
      eligible: boolean;
    };

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly context: BusinessContextService,
    private readonly mcom: McomPayClient,
    private readonly settlement: PaymentSettlementService,
  ) {}

  // ─── PLAN ACCESS ─────────────────────────────────────────────────────────

  async createPlanPayment(user: SessionUser, dto: CreatePlanPaymentDto) {
    this.assertPaymentsEnabled();
    const ctx = await this.context.resolve(user);
    const rules = ctx.config.groupCreationRules;

    const plan = await this.prisma.plan.findUnique({
      where: { id: dto.planId },
    });
    if (!plan) throw new NotFoundException(`Plan ${dto.planId} not found`);
    if (plan.status !== "Active") {
      throw new BadRequestException(
        `${plan.name} is not available for activation.`,
      );
    }

    const variant = normalizeVariant(plan.variant);
    const accessDays = planAccessDays(variant);
    const amountMinor = BigInt(plan.priceMinor);
    const now = new Date();

    // No payment is required when the platform is configured for free access.
    if (!rules.requirePaidAccess || plan.priceMinor <= 0) {
      const activated = await this.prisma.$transaction((tx) =>
        activatePlanTx(tx, {
          businessId: ctx.business.id,
          userId: ctx.user.id,
          actorName: ctx.business.name,
          planId: plan.id,
          planName: plan.name,
          variant,
          accessDays,
          accessFeeMinor: plan.priceMinor,
          agreementAccepted: true,
          agreedAt: now,
          accessExpiresAt: new Date(
            now.getTime() + accessDays * 24 * 60 * 60 * 1000,
          ),
        }),
      );
      return {
        payment: null,
        activated: true,
        plan: mapBusinessPlan(activated),
        access: toPlanAccess(activated),
      };
    }

    const payer = await this.loadPayer(user);
    if (dto.method === PaymentMethod.WALLET && !payer.mcomUserId) {
      throw new BadRequestException(
        "MCOM Wallet requires a Central Hub user id. Sign in through MCOM SSO and try again.",
      );
    }

    const dedupeKey = `plan:${ctx.business.id}:${plan.id}:${dayKey()}:${plan.priceMinor}`;
    const existing = await this.prisma.payment.findUnique({
      where: { dedupeKey },
      include: { user: true },
    });

    if (existing) {
      if (existing.status === "PAID") {
        return this.withProviderHandle(existing, true);
      }
      if (
        existing.status === "PENDING" &&
        existing.method === dto.method
      ) {
        return this.withProviderHandle(existing, false);
      }
      await this.prisma.payment.update({
        where: { id: existing.id },
        data: { dedupeKey: null },
      });
    }

    const paymentId = randomUUID();
    const payment = await this.insertPayment({
      id: paymentId,
      purpose: PaymentPurpose.PLAN_ACCESS,
      method: dto.method,
      amountMinor,
      currency: "GBP",
      reference: `GRP-PAY-${paymentId}`,
      idempotencyKey: `mcom-group-pay-${paymentId}`,
      dedupeKey,
      businessId: ctx.business.id,
      userId: ctx.user.id,
      planId: plan.id,
      planSnapshot: {
        planId: plan.id,
        planName: plan.name,
        variant,
        accessDays,
        accessFeeMinor: plan.priceMinor,
        agreementAccepted: true,
        description: `247GBS Groups — ${plan.name} access (${accessDays} days)`,
      },
      metadata: {
        purpose: "PLAN_ACCESS",
        businessId: ctx.business.id,
        planId: plan.id,
      },
    });

    const result = await this.createCentralCharge(payment, {
      method: dto.method,
      description: `247GBS Groups — ${plan.name} access (${accessDays} days)`,
      mcomUserId: payer.mcomUserId ?? undefined,
    });
    const charge = result.charge;

    if (charge.status === "paid") {
      const settled = await this.settlement.settlePaid(payment, {
        provider: charge.provider ?? undefined,
        providerRef: charge.providerRef ?? undefined,
        mcomChargeId: charge.id,
        amountMinor: charge.amountMinor,
      });
      return this.withProviderHandle(settled, true);
    }

    return {
      payment: this.mapPayment(await this.reload(payment.id)),
      clientSecret: result.clientSecret ?? null,
      approvalUrl: result.approvalUrl ?? null,
      alreadyPaid: false,
    };
  }

  // ─── GROUP CONTRIBUTIONS ─────────────────────────────────────────────────

  async createContributionPayment(
    user: SessionUser,
    groupId: string,
    dto: CreateContributionPaymentDto,
  ) {
    this.assertPaymentsEnabled();
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
    });
    if (!group) throw new NotFoundException("Group not found");
    if (group.pricing !== "paid" || !group.contributionMinor) {
      throw new BadRequestException("This group does not require a contribution.");
    }
    if (group.status === "Closed" || group.status === "Suspended") {
      throw new ConflictException({
        code: "GROUP_NOT_JOINABLE",
        message: `The group is ${group.status.toLowerCase()} and is not accepting members.`,
      });
    }

    const payer = await this.loadPayer(user);
    if (payer.kind === "CUSTOMER" && group.visibility !== "PUBLIC") {
      throw new BadRequestException("This group requires an invitation");
    }
    if (dto.method === PaymentMethod.WALLET && !payer.mcomUserId) {
      throw new BadRequestException(
        "MCOM Wallet requires a Central Hub user id. Sign in through MCOM SSO and try again.",
      );
    }

    const existingMember = await this.prisma.groupMember.findUnique({
      where: {
        groupId_memberId: { groupId, memberId: payer.memberId },
      },
    });
    if (!existingMember && group.accessType !== "open") {
      const invitation = await this.prisma.invitation.findFirst({
        where: {
          groupId,
          status: "pending",
          OR: [
            { inviteeId: payer.memberId },
            { inviteeEmail: user.email.trim().toLowerCase() },
          ],
        },
      });
      if (!invitation) {
        throw new BadRequestException({
          code: "PAYMENT_AFTER_APPROVAL",
          message:
            "This group requires approval before payment. Pay the contribution after the owner accepts you.",
        });
      }
    }

    await this.assertGroupEligibility(group, user, payer);

    const periodKey = contributionPeriodKey(group.contributionFrequency);
    const dedupeKey = `contribution:${groupId}:${payer.memberId}:${periodKey}:${group.contributionMinor}`;
    const alreadyPaid = await this.prisma.payment.findFirst({
      where: {
        purpose: PaymentPurpose.GROUP_CONTRIBUTION,
        groupId,
        memberId: payer.memberId,
        periodKey,
        status: { in: ["PAID", "PARTIALLY_REFUNDED"] },
        deletedAt: null,
      },
      orderBy: { createdAt: "desc" },
    });
    if (alreadyPaid) return this.withProviderHandle(alreadyPaid, true);

    const existingIntent = await this.prisma.payment.findUnique({
      where: { dedupeKey },
    });
    if (existingIntent) {
      if (
        existingIntent.status === "PENDING" &&
        existingIntent.method === dto.method
      ) {
        return this.withProviderHandle(existingIntent, false);
      }
      await this.prisma.payment.update({
        where: { id: existingIntent.id },
        data: { dedupeKey: null },
      });
    }

    const amountMinor = BigInt(group.contributionMinor);
    const paymentId = randomUUID();
    const frequency = group.contributionFrequency ?? "once";
    const payment = await this.insertPayment({
      id: paymentId,
      purpose: PaymentPurpose.GROUP_CONTRIBUTION,
      method: dto.method,
      amountMinor,
      currency: "GBP",
      reference: `GRP-CONTRIB-${paymentId}`,
      idempotencyKey: `mcom-group-contrib-${paymentId}`,
      dedupeKey,
      userId: user.id,
      groupId,
      memberId: payer.memberId,
      periodKey,
      groupSnapshot: {
        groupId,
        groupName: group.name,
        memberId: payer.memberId,
        fullName: payer.fullName,
        businessName: payer.businessName,
        category: payer.category,
        location: payer.location,
        role: payer.role,
        tier: payer.tier,
        frequency,
        periodKey,
        description: `247GBS Groups — ${group.name} contribution (${periodKey})`,
      },
      metadata: {
        purpose: "GROUP_CONTRIBUTION",
        groupId,
        memberId: payer.memberId,
        periodKey,
      },
    });

    const result = await this.createCentralCharge(payment, {
      method: dto.method,
      description: `247GBS Groups — ${group.name} contribution (${periodKey})`,
      mcomUserId: payer.mcomUserId ?? undefined,
    });
    const charge = result.charge;

    if (charge.status === "paid") {
      const settled = await this.settlement.settlePaid(payment, {
        provider: charge.provider ?? undefined,
        providerRef: charge.providerRef ?? undefined,
        mcomChargeId: charge.id,
        amountMinor: charge.amountMinor,
      });
      return this.withProviderHandle(settled, true);
    }

    return {
      payment: this.mapPayment(await this.reload(payment.id)),
      clientSecret: result.clientSecret ?? null,
      approvalUrl: result.approvalUrl ?? null,
      alreadyPaid: false,
    };
  }

  // ─── CONFIRM / READ / RESUME ─────────────────────────────────────────────

  async confirmPayment(
    user: SessionUser,
    paymentId: string,
    dto: ConfirmPaymentDto,
  ) {
    this.assertPaymentsEnabled();
    const payment = await this.getOwnedPayment(user, paymentId);

    if (payment.status === "PAID") {
      return this.withProviderHandle(payment, true);
    }
    if (payment.status === "PAID_UNFULFILLED") {
      throw new ConflictException({
        code: "FULFILLMENT_FAILED",
        message:
          "Payment was received but could not be applied. Please contact support.",
      });
    }
    if (payment.status !== "PENDING") {
      throw new ConflictException(`Payment is ${payment.status.toLowerCase()}.`);
    }
    if (!payment.mcomChargeId) {
      throw new ConflictException("This payment has no MCOM charge yet.");
    }

    if (payment.method === PaymentMethod.WALLET) {
      const charge = await this.mcom.getCharge(payment.mcomChargeId);
      if (charge.status === "paid") {
        return this.withProviderHandle(
          await this.settlement.settlePaid(payment, {
            provider: charge.provider ?? undefined,
            providerRef: charge.providerRef ?? undefined,
            mcomChargeId: charge.id,
            amountMinor: charge.amountMinor,
          }),
          true,
        );
      }
      throw new ConflictException("The wallet charge has not settled yet.");
    }

    try {
      const result = await this.mcom.confirmCharge(payment.mcomChargeId, {
        paymentIntentId: dto.paymentIntentId,
        orderId: dto.orderId,
      });
      if (result.charge.status !== "paid") {
        throw new ConflictException(
          `MCOM Pay reports the charge as ${result.charge.status}.`,
        );
      }
      const settled = await this.settlement.settlePaid(payment, {
        provider: result.charge.provider ?? undefined,
        providerRef: result.charge.providerRef ?? undefined,
        mcomChargeId: result.charge.id,
        amountMinor: result.charge.amountMinor,
      });
      return this.withProviderHandle(settled, true);
    } catch (error) {
      this.throwMcomError(error);
    }
  }

  async getPayment(user: SessionUser, paymentId: string) {
    const payment = await this.getOwnedPayment(user, paymentId);
    return { payment: this.mapPayment(payment) };
  }

  async resumePayment(user: SessionUser, paymentId: string) {
    this.assertPaymentsEnabled();
    const payment = await this.getOwnedPayment(user, paymentId);
    if (payment.status !== "PENDING") {
      return this.withProviderHandle(payment, payment.status === "PAID");
    }
    return this.withProviderHandle(payment, false);
  }

  async walletBalance(user: SessionUser) {
    this.assertPaymentsEnabled();
    const mcomUserId = await this.mcomUserIdFor(user);
    if (!mcomUserId) {
      throw new BadRequestException(
        "This account is not linked to a Central Hub user yet.",
      );
    }
    try {
      return await this.mcom.getWalletBalance(mcomUserId);
    } catch (error) {
      this.throwMcomError(error);
    }
  }

  // ─── WEBHOOK ─────────────────────────────────────────────────────────────

  async handleWebhook(rawBody: string | Buffer, signature?: string) {
    const secret = this.config.get<string>("MCOM_WEBHOOK_SECRET", "");
    if (!secret) {
      this.logger.error("MCOM_WEBHOOK_SECRET is not configured.");
      throw new ServiceUnavailableException("Webhook secret is not configured.");
    }
    if (!signature) {
      throw new BadRequestException("Missing X-Mcom-Webhook-Signature header.");
    }

    const expected = crypto
      .createHmac("sha256", secret)
      .update(rawBody)
      .digest("hex");
    const received = signature.replace(/^sha256=/, "");
    const a = Buffer.from(expected, "hex");
    const b = Buffer.from(received, "hex");
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      throw new BadRequestException("Invalid webhook signature.");
    }

    const payload = JSON.parse(
      typeof rawBody === "string" ? rawBody : rawBody.toString("utf8"),
    ) as {
      event?: string;
      data?: Record<string, unknown>;
    };
    const event = payload.event;
    const data = payload.data ?? {};

    if (event === "payment.succeeded") {
      const payment = await this.findWebhookPayment(data);
      if (!payment) {
        this.logger.warn(
          `payment.succeeded webhook did not match a local payment (charge ${String(data.chargeId)})`,
        );
        return { received: true };
      }
      await this.settlement.settlePaid(payment, {
        provider: typeof data.provider === "string" ? data.provider : undefined,
        providerRef:
          typeof data.providerRef === "string" ? data.providerRef : undefined,
        mcomChargeId:
          typeof data.chargeId === "string" ? data.chargeId : undefined,
        amountMinor:
          typeof data.amountMinor === "string" ? data.amountMinor : undefined,
      });
      return { received: true };
    }

    if (event === "payment.refunded") {
      const payment = await this.findWebhookPayment(data);
      if (!payment) return { received: true };
      const totalRefunded =
        typeof data.totalRefundedMinor === "string"
          ? BigInt(data.totalRefundedMinor)
          : typeof data.amountMinor === "string"
            ? BigInt(data.amountMinor)
            : 0n;
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          refundedMinor: totalRefunded,
          status:
            totalRefunded >= payment.amountMinor
              ? "REFUNDED"
              : "PARTIALLY_REFUNDED",
        },
      });
      return { received: true };
    }

    return { received: true };
  }

  // ─── INTERNALS ───────────────────────────────────────────────────────────

  private async loadPayer(user: SessionUser): Promise<
    Payer & { mcomUserId: string | null }
  > {
    if (user.role === "BUSINESS") {
      const ctx = await this.context.resolve(user);
      return {
        kind: "BUSINESS",
        memberId: ctx.business.id,
        fullName: ctx.business.contactName,
        businessName: ctx.business.name,
        category: ctx.business.category,
        location: ctx.business.city,
        role: "peripheral",
        tier: ctx.plan.planName,
        variant: ctx.plan.variant,
        planId: ctx.plan.planId ?? undefined,
        eligible: ctx.plan.paid || ctx.plan.status === "Active",
        mcomUserId: ctx.user.mcomUserId,
      };
    }

    if (user.role === "CUSTOMER") {
      const account = await this.prisma.user.findUnique({
        where: { id: user.id },
      });
      if (!account) throw new NotFoundException("Consumer account not found");
      const tier = account.membershipTier ?? account.membershipLevel ?? "Free";
      return {
        kind: "CUSTOMER",
        memberId: account.id,
        fullName:
          account.fullName ?? account.displayName ?? user.name ?? "Member",
        businessName: null,
        category: "Consumer",
        location: account.address ?? null,
        role: "member",
        tier,
        variant: account.membershipPlanName ?? undefined,
        eligible: Boolean(tier && tier.toLowerCase() !== "free"),
        mcomUserId: account.mcomUserId,
      };
    }

    throw new ForbiddenException(
      "Only business and consumer accounts can make payments.",
    );
  }

  private async assertGroupEligibility(
    group: {
      requiredPlanIds: string[];
      accessType: string;
      visibility: string;
    },
    user: SessionUser,
    payer: Payer,
  ) {
    if (group.requiredPlanIds.length === 0) return;

    const plans = await this.prisma.plan.findMany({
      where: { id: { in: group.requiredPlanIds } },
      select: { id: true, name: true, variant: true },
    });

    const identity = {
      planId: payer.planId,
      planName: payer.tier,
      variant: payer.variant,
      active: payer.eligible,
    };

    if (!matchesRequiredPlans(group.requiredPlanIds, plans, identity)) {
      throw new ForbiddenException({
        code: "PLAN_REQUIRED",
        message:
          "This group is only open to members on selected membership plans.",
      });
    }
  }

  private async createCentralCharge(
    payment: Payment,
    input: {
      method: PaymentMethod;
      description: string;
      mcomUserId?: string;
    },
  ): Promise<{ charge: McomChargeDto; clientSecret?: string | null; approvalUrl?: string | null }> {
    try {
      const result = await this.mcom.createCharge(
        {
          amountMinor: payment.amountMinor.toString(),
          currency: payment.currency,
          method: this.centralMethod(input.method),
          reference: payment.reference,
          description: input.description,
          mcomUserId: input.mcomUserId,
          externalCustomerId: payment.userId ?? undefined,
          returnUrl: `${this.publicBaseUrl()}/payment/return?paymentId=${payment.id}`,
          cancelUrl: `${this.publicBaseUrl()}/payment/cancel?paymentId=${payment.id}`,
          metadata: {
            ...jsonObject(payment.metadata),
            paymentId: payment.id,
          },
        },
        payment.idempotencyKey,
      );

      await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          mcomChargeId: result.charge.id,
          provider: result.charge.provider ?? null,
          providerRef: result.charge.providerRef ?? null,
          feeMinor: BigInt(result.charge.feeMinor),
          netMinor: BigInt(result.charge.netMinor),
          failureCode: null,
          failureMessage: null,
        },
      });

      return result;
    } catch (error) {
      if (error instanceof McomPayError) {
        if (error.httpStatus >= 400 && error.httpStatus < 500) {
          await this.prisma.payment.update({
            where: { id: payment.id },
            data: {
              status: "FAILED",
              failureCode: error.code,
              failureMessage: error.message,
            },
          });
        } else {
          await this.prisma.payment.update({
            where: { id: payment.id },
            data: {
              failureCode: error.code,
              failureMessage: error.message,
            },
          });
        }
      }
      this.throwMcomError(error);
    }
  }

  private async withProviderHandle(payment: Payment, alreadyPaid: boolean) {
    let clientSecret: string | null = null;
    let approvalUrl: string | null = null;

    if (!alreadyPaid && payment.status === "PENDING") {
      try {
        const replay = await this.mcom.createCharge(
          this.reconstructChargeInput(payment),
          payment.idempotencyKey,
        );
        const updated = await this.prisma.payment.update({
          where: { id: payment.id },
          data: {
            mcomChargeId: replay.charge.id,
            provider: replay.charge.provider ?? null,
            providerRef: replay.charge.providerRef ?? null,
            feeMinor: BigInt(replay.charge.feeMinor),
            netMinor: BigInt(replay.charge.netMinor),
            failureCode: null,
            failureMessage: null,
          },
        });
        payment = updated;

        if (replay.charge.status === "paid") {
          const settled = await this.settlement.settlePaid(payment, {
            provider: replay.charge.provider ?? undefined,
            providerRef: replay.charge.providerRef ?? undefined,
            mcomChargeId: replay.charge.id,
            amountMinor: replay.charge.amountMinor,
          });
          return {
            payment: this.mapPayment(settled),
            clientSecret: null,
            approvalUrl: null,
            alreadyPaid: settled.status === "PAID",
          };
        }

        clientSecret = replay.clientSecret ?? null;
        approvalUrl = replay.approvalUrl ?? null;
      } catch (error) {
        if (error instanceof McomPayError) {
          this.logger.warn(
            `Could not resume provider handle for payment ${payment.id}: ${error.message}`,
          );
        }
      }
    }

    return {
      payment: this.mapPayment(payment),
      clientSecret,
      approvalUrl,
      alreadyPaid,
    };
  }

  private reconstructChargeInput(payment: Payment) {
    const snapshot = jsonObject(
      payment.purpose === "PLAN_ACCESS"
        ? payment.planSnapshot
        : payment.groupSnapshot,
    );
    return {
      amountMinor: payment.amountMinor.toString(),
      currency: payment.currency,
      method: this.centralMethod(payment.method),
      reference: payment.reference,
      description:
        typeof snapshot.description === "string"
          ? snapshot.description
          : "247GBS Groups payment",
      externalCustomerId: payment.userId ?? undefined,
      returnUrl: `${this.publicBaseUrl()}/payment/return?paymentId=${payment.id}`,
      cancelUrl: `${this.publicBaseUrl()}/payment/cancel?paymentId=${payment.id}`,
      metadata: {
        ...jsonObject(payment.metadata),
        paymentId: payment.id,
      },
    };
  }

  private async insertPayment(
    data: Prisma.PaymentUncheckedCreateInput,
  ): Promise<Payment> {
    try {
      return await this.prisma.payment.create({ data });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        const existing = await this.prisma.payment.findFirst({
          where: {
            OR: [
              { dedupeKey: data.dedupeKey ?? undefined },
              { reference: data.reference },
            ],
          },
        });
        if (existing) return existing;
      }
      throw error;
    }
  }

  private async getOwnedPayment(
    user: SessionUser,
    paymentId: string,
  ): Promise<Payment> {
    const payment = await this.prisma.payment.findFirst({
      where: { id: paymentId, userId: user.id, deletedAt: null },
    });
    if (!payment) throw new NotFoundException("Payment not found");
    return payment;
  }

  private async findWebhookPayment(data: Record<string, unknown>) {
    const chargeId =
      typeof data.chargeId === "string" ? data.chargeId : undefined;
    const reference =
      typeof data.reference === "string" ? data.reference : undefined;
    if (!chargeId && !reference) return null;
    return this.prisma.payment.findFirst({
      where: {
        deletedAt: null,
        OR: [
          ...(chargeId ? [{ mcomChargeId: chargeId }] : []),
          ...(reference ? [{ reference }] : []),
        ],
      },
    });
  }

  private async reload(id: string): Promise<Payment> {
    return this.prisma.payment.findUniqueOrThrow({ where: { id } });
  }

  private async mcomUserIdFor(user: SessionUser): Promise<string | null> {
    const account = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: { mcomUserId: true },
    });
    return account?.mcomUserId ?? null;
  }

  private assertPaymentsEnabled() {
    if (!this.mcom.enabled) {
      throw new ServiceUnavailableException(
        "MCOM Pay is disabled for this environment.",
      );
    }
  }

  private centralMethod(method: PaymentMethod): McomPayMethod {
    switch (method) {
      case PaymentMethod.STRIPE:
        return "stripe";
      case PaymentMethod.PAYPAL:
        return "paypal";
      case PaymentMethod.WALLET:
      default:
        return "wallet";
    }
  }

  private publicBaseUrl(): string {
    const configured =
      this.config.get<string>("WEB_PUBLIC_URL") ||
      this.config
        .get<string>("CORS_ORIGIN", "http://localhost:4088")
        .split(",")[0]
        .trim();
    return configured.replace(/\/+$/, "");
  }

  private mapPayment(payment: Payment) {
    return {
      id: payment.id,
      purpose: payment.purpose,
      status: payment.status,
      method: payment.method,
      amountMinor: payment.amountMinor.toString(),
      feeMinor: payment.feeMinor?.toString(),
      netMinor: payment.netMinor?.toString(),
      refundedMinor: payment.refundedMinor.toString(),
      currency: payment.currency,
      reference: payment.reference,
      mcomChargeId: payment.mcomChargeId ?? undefined,
      provider: payment.provider ?? undefined,
      providerRef: payment.providerRef ?? undefined,
      paidAt: iso(payment.paidAt),
      createdAt: iso(payment.createdAt),
      plan: payment.planSnapshot ?? undefined,
      group: payment.groupSnapshot ?? undefined,
      failure:
        payment.failureCode || payment.failureMessage
          ? {
              code: payment.failureCode ?? "PAYMENT_FAILED",
              message: payment.failureMessage ?? "Payment failed.",
            }
          : undefined,
    };
  }

  private throwMcomError(error: unknown): never {
    if (error instanceof McomPayError) {
      if (error.httpStatus === 422) {
        throw new UnprocessableEntityException({
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
      if (error.httpStatus === 409) {
        throw new ConflictException({
          code: error.code,
          message: error.message,
        });
      }
      if (error.httpStatus === 429) {
        throw new ServiceUnavailableException({
          code: "RATE_LIMITED",
          message: "Too many payment attempts. Please wait and try again.",
        });
      }
      this.logger.error(
        `MCOM Pay error ${error.httpStatus} ${error.code}: ${error.message}`,
      );
      throw new BadGatewayException(
        "MCOM Pay could not process this payment. Please try again.",
      );
    }
    this.logger.error(
      `Unexpected payment error: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    throw new BadGatewayException("Payment could not be processed.");
  }
}
