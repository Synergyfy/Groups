import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as crypto from "node:crypto";

export type McomPayMethod = "stripe" | "paypal" | "wallet";

export interface McomChargeDto {
  id: string;
  appClientId: string;
  amountMinor: string;
  currency: string;
  feeMinor: string;
  netMinor: string;
  refundedMinor?: string;
  method: McomPayMethod;
  status: string;
  reference?: string | null;
  description?: string | null;
  mcomUserId?: string | null;
  externalCustomerId?: string | null;
  provider?: string | null;
  providerRef?: string | null;
  walletDebitAmount?: string | null;
  reconciliationNeeded?: boolean;
  paidAt?: string | null;
  createdAt: string;
}

export interface McomCreateChargeResponse {
  charge: McomChargeDto;
  clientSecret?: string | null;
  approvalUrl?: string | null;
}

export interface McomConfirmChargeResponse {
  charge: McomChargeDto;
  replayed?: boolean;
}

export interface McomWalletBalance {
  success: boolean;
  balance: number;
  availableBalance: number;
  status: string;
  currency: string;
}

export interface McomRefundResponse {
  charge: McomChargeDto;
  refund: {
    id: string;
    chargeId: string;
    amountMinor: string;
    feeRefundMinor: string;
    netRefundMinor: string;
    currency: string;
    provider?: string | null;
    providerRef?: string | null;
    status: string;
    reason?: string | null;
    failureReason?: string | null;
    createdAt: string;
  };
}

export class McomPayError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly httpStatus: number,
    readonly payload?: unknown,
  ) {
    super(message);
    this.name = "McomPayError";
  }
}

interface CallOptions {
  method?: "GET" | "POST";
  body?: unknown;
  idempotencyKey?: string;
}

const RETRYABLE_DELAYS_MS = [400, 1_200, 3_000];

/**
 * HMAC-signed client for Central Hub's MCOM Pay and partner wallet APIs.
 *
 * The raw body is serialized exactly once so the signature always matches the
 * bytes sent on the wire. GET requests sign the empty string, matching the
 * WalletHmacGuard on Central Hub.
 */
@Injectable()
export class McomPayClient {
  private readonly logger = new Logger(McomPayClient.name);

  constructor(private readonly config: ConfigService) {}

  get enabled(): boolean {
    return (
      this.config.get<string>("MCOM_PAY_ENABLED", "true").toLowerCase() !==
      "false"
    );
  }

  private get baseUrl(): string {
    return this.config
      .get<string>("MCOM_SOLUTIONS_URL", "http://localhost:3010")
      .replace(/\/+$/, "");
  }

  private get clientId(): string {
    return this.config.getOrThrow<string>("MCOM_CLIENT_ID");
  }

  private get hmacSecret(): string {
    return this.config.getOrThrow<string>("MCOM_HMAC_SECRET");
  }

  private sign(raw: string): string {
    return (
      "sha256=" +
      crypto.createHmac("sha256", this.hmacSecret).update(raw).digest("hex")
    );
  }

  private async call<T>(path: string, options: CallOptions = {}): Promise<T> {
    const method = options.method ?? "POST";
    const raw = method === "GET" ? "" : JSON.stringify(options.body ?? {});
    const url = `${this.baseUrl}/api/v1${path}`;

    let lastError: unknown;

    for (let attempt = 0; attempt <= RETRYABLE_DELAYS_MS.length; attempt += 1) {
      try {
        const response = await fetch(url, {
          method,
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            "X-Mcom-Client-ID": this.clientId,
            "X-Mcom-Signature": this.sign(raw),
            ...(options.idempotencyKey
              ? { "X-Idempotency-Key": options.idempotencyKey }
              : {}),
          },
          ...(method === "GET" ? {} : { body: raw }),
          signal: AbortSignal.timeout(12_000),
        });

        const text = await response.text();
        let payload: any = null;
        if (text) {
          try {
            payload = JSON.parse(text);
          } catch {
            payload = { message: text };
          }
        }

        if (!response.ok) {
          const error = this.toError(response.status, payload);
          if (attempt < RETRYABLE_DELAYS_MS.length && this.isRetryable(error)) {
            await this.sleep(RETRYABLE_DELAYS_MS[attempt]);
            lastError = error;
            continue;
          }
          throw error;
        }

        return payload as T;
      } catch (error) {
        if (error instanceof McomPayError) throw error;
        lastError = error;
        if (attempt < RETRYABLE_DELAYS_MS.length) {
          this.logger.warn(
            `MCOM Pay request ${method} ${path} failed (attempt ${attempt + 1}): ${
              error instanceof Error ? error.message : "unknown error"
            }`,
          );
          await this.sleep(RETRYABLE_DELAYS_MS[attempt]);
          continue;
        }
        throw new McomPayError(
          "MCOM_PAY_UNAVAILABLE",
          "MCOM Pay is temporarily unavailable. Please try again.",
          503,
          error,
        );
      }
    }

    throw lastError instanceof McomPayError
      ? lastError
      : new McomPayError(
          "MCOM_PAY_UNAVAILABLE",
          "MCOM Pay is temporarily unavailable. Please try again.",
          503,
          lastError,
        );
  }

  private toError(status: number, payload: any): McomPayError {
    const message =
      (typeof payload?.message === "string" && payload.message) ||
      (Array.isArray(payload?.message) && payload.message.join(", ")) ||
      `MCOM Pay request failed with ${status}`;
    const code =
      (typeof payload?.code === "string" && payload.code) ||
      (typeof payload?.error === "string" && payload.error !== "Bad Request"
        ? payload.error
        : `HTTP_${status}`);
    return new McomPayError(code, message, status, payload);
  }

  private isRetryable(error: McomPayError): boolean {
    if (error.httpStatus === 429) return true;
    if (error.httpStatus >= 500) return true;
    if (error.httpStatus === 409) {
      return error.code.includes("WALLET_LOCKED");
    }
    return false;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  createCharge(
    input: {
      amountMinor: string;
      currency?: string;
      method: McomPayMethod;
      reference: string;
      description?: string;
      mcomUserId?: string;
      externalCustomerId?: string;
      returnUrl?: string;
      cancelUrl?: string;
      metadata?: Record<string, unknown>;
    },
    idempotencyKey: string,
  ): Promise<McomCreateChargeResponse> {
    return this.call<McomCreateChargeResponse>("/app-payments/charges", {
      body: input,
      idempotencyKey,
    });
  }

  confirmCharge(
    chargeId: string,
    handle: { paymentIntentId?: string; orderId?: string },
  ): Promise<McomConfirmChargeResponse> {
    return this.call<McomConfirmChargeResponse>(
      `/app-payments/charges/${encodeURIComponent(chargeId)}/confirm`,
      { body: handle },
    );
  }

  getCharge(chargeId: string): Promise<McomChargeDto> {
    return this.call<McomChargeDto>(
      `/app-payments/charges/${encodeURIComponent(chargeId)}`,
      { method: "GET" },
    );
  }

  getWalletBalance(mcomUserId: string): Promise<McomWalletBalance> {
    return this.call<McomWalletBalance>(
      `/wallet/partner/balance/${encodeURIComponent(mcomUserId)}`,
      { method: "GET" },
    );
  }

  refundCharge(
    chargeId: string,
    input: { amountMinor?: string; reason?: string },
    idempotencyKey: string,
  ): Promise<McomRefundResponse> {
    return this.call<McomRefundResponse>(
      `/app-payments/charges/${encodeURIComponent(chargeId)}/refund`,
      { body: input, idempotencyKey },
    );
  }
}
