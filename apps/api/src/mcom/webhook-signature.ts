import {
  BadRequestException,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common";
import type { ConfigService } from "@nestjs/config";
import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Verify the HMAC-SHA256 signature Central Hub sends with every webhook.
 *
 * The signature always covers the exact bytes of the request body, so callers
 * must pass the raw body captured by Nest (`rawBody: true`), never the parsed
 * DTO. `MCOM_WEBHOOK_SECRET` is the per-app secret; `MCOM_HMAC_SECRET` is kept
 * as a fallback for older Central Hub installations.
 */
export function verifyMcomWebhookSignature(
  config: ConfigService,
  rawBody: string | Buffer,
  signature: string | undefined,
  logger: Logger = new Logger("McomWebhook"),
): void {
  const secret =
    config.get<string>("MCOM_WEBHOOK_SECRET", "").trim() ||
    config.get<string>("MCOM_HMAC_SECRET", "").trim();

  if (!secret) {
    logger.error(
      "MCOM_WEBHOOK_SECRET and MCOM_HMAC_SECRET are not configured.",
    );
    throw new ServiceUnavailableException("Webhook secret is not configured.");
  }

  if (!signature) {
    throw new BadRequestException(
      "Missing X-Mcom-Webhook-Signature header.",
    );
  }

  const expected = `sha256=${createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex")}`;
  const received = signature.startsWith("sha256=")
    ? signature
    : `sha256=${signature}`;
  const a = Buffer.from(expected);
  const b = Buffer.from(received);

  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw new UnauthorizedException("Invalid webhook signature.");
  }
}
