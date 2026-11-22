import {
  CanActivate,
  ExecutionContext,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { timingSafeEqual } from "node:crypto";
import type { Request } from "express";

/**
 * Authenticates MCOM Solutions Central's billing connector. Central sends the
 * shared `MCOM_API_KEY` in `x-mcom-solution-api-key` (older clients use
 * `x-api-key`). The webhook HMAC secret is not used here.
 */
@Injectable()
export class McomApiKeyGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const expected = this.config.get<string>("MCOM_API_KEY", "").trim();
    if (!expected) {
      throw new InternalServerErrorException(
        "MCOM_API_KEY is not configured on this service.",
      );
    }

    const request = context.switchToHttp().getRequest<Request>();
    const provided =
      firstHeader(request.headers["x-mcom-solution-api-key"]) ??
      firstHeader(request.headers["x-api-key"]);

    if (!provided || !safeEqual(provided, expected)) {
      throw new UnauthorizedException(
        "Unauthorized: Invalid MCOM API Key",
      );
    }
    return true;
  }
}

function firstHeader(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) return false;
  return timingSafeEqual(leftBuffer, rightBuffer);
}
