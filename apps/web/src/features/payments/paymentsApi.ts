import { apiRequest } from "../../app/api";
import { ApiError } from "../../app/api";
import type { PlanAccess } from "../../domain/types";
import type { BusinessPlanView } from "../../business/businessApi";

export type PaymentMethod = "STRIPE" | "PAYPAL" | "WALLET";

export type PaymentStatus =
  | "PENDING"
  | "PAID"
  | "FAILED"
  | "CANCELLED"
  | "REFUNDED"
  | "PARTIALLY_REFUNDED"
  | "PAID_UNFULFILLED";

export interface PaymentView {
  id: string;
  purpose: "PLAN_ACCESS" | "GROUP_CONTRIBUTION";
  status: PaymentStatus;
  method: PaymentMethod;
  amountMinor: string;
  feeMinor?: string;
  netMinor?: string;
  refundedMinor: string;
  currency: string;
  reference: string;
  mcomChargeId?: string;
  provider?: string;
  providerRef?: string;
  paidAt?: string;
  createdAt?: string;
  plan?: Record<string, unknown>;
  group?: Record<string, unknown>;
  failure?: { code: string; message: string };
}

export interface PaymentResponse {
  payment: PaymentView | null;
  clientSecret?: string | null;
  approvalUrl?: string | null;
  alreadyPaid?: boolean;
  activated?: boolean;
  plan?: BusinessPlanView;
  access?: PlanAccess;
}

export interface WalletBalanceView {
  success: boolean;
  balance: number;
  availableBalance: number;
  status: string;
  currency: string;
}

export const paymentsApi = {
  walletBalance: () =>
    apiRequest<WalletBalanceView>("/payments/wallet/balance"),

  createPlanPayment: (body: {
    planId: string;
    method: PaymentMethod;
    agreementAccepted: boolean;
  }) =>
    apiRequest<PaymentResponse>("/payments/plan", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  createContributionPayment: (groupId: string, method: PaymentMethod) =>
    apiRequest<PaymentResponse>(
      `/payments/group/${encodeURIComponent(groupId)}`,
      {
        method: "POST",
        body: JSON.stringify({ method }),
      },
    ),

  getPayment: (id: string) =>
    apiRequest<{ payment: PaymentView }>(
      `/payments/${encodeURIComponent(id)}`,
    ),

  confirmPayment: (
    id: string,
    handle: { paymentIntentId?: string; orderId?: string },
  ) =>
    apiRequest<PaymentResponse>(
      `/payments/${encodeURIComponent(id)}/confirm`,
      {
        method: "POST",
        body: JSON.stringify(handle),
      },
    ),

  resumePayment: (id: string) =>
    apiRequest<PaymentResponse>(
      `/payments/${encodeURIComponent(id)}/resume`,
      { method: "POST" },
    ),
};

export function formatMinor(minor: string | number | null | undefined): string {
  const value = Number(minor ?? 0) / 100;
  return value.toLocaleString("en-GB", {
    style: "currency",
    currency: "GBP",
  });
}

export function amountFromPounds(pounds: number): string {
  return String(Math.round(pounds * 100));
}

export interface PaymentRequiredDetails {
  groupId: string;
  amountPounds: number;
  amountMinor?: string;
  frequency: string;
  message: string;
}

/**
 * Extracts the PAYMENT_REQUIRED payload thrown by the join/accept endpoints so
 * any page can open the same MCOM Pay dialog.
 */
export function paymentRequiredDetails(
  cause: unknown,
): PaymentRequiredDetails | null {
  if (!(cause instanceof ApiError)) return null;
  const body = cause.body as
    | {
        code?: string;
        groupId?: string;
        amount?: number;
        amountMinor?: string;
        frequency?: string;
        message?: string;
      }
    | null;
  if (body?.code !== "PAYMENT_REQUIRED" || !body.groupId) return null;
  return {
    groupId: body.groupId,
    amountPounds:
      body.amountMinor !== undefined
        ? Number(body.amountMinor) / 100
        : Number(body.amount ?? 0),
    amountMinor: body.amountMinor,
    frequency: body.frequency ?? "once",
    message: body.message ?? "This group requires a contribution.",
  };
}

export function mcomWalletTopUpUrl(): string {
  const env = import.meta.env as
    | { VITE_MCOM_WALLET_TOPUP_URL?: string }
    | undefined;
  return (
    env?.VITE_MCOM_WALLET_TOPUP_URL ??
    "http://localhost:3010/dashboard/wallet"
  );
}
