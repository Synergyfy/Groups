import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { timingSafeEqual } from "node:crypto";

/**
 * Authenticates MCOM Central Hub server-to-server calls with the app API key
 * issued in the MCOM Console (`x-mcom-solution-api-key`).
 */
@Injectable()
export class SystemApiKeyGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const provided = String(
      request.headers["x-mcom-solution-api-key"] ?? "",
    ).trim();
    const expected = (this.config.get<string>("MCOM_API_KEY") ?? "").trim();

    if (!provided || !expected) {
      throw new UnauthorizedException("Missing API key");
    }

    const providedBuffer = Buffer.from(provided);
    const expectedBuffer = Buffer.from(expected);
    if (
      providedBuffer.length !== expectedBuffer.length ||
      !timingSafeEqual(providedBuffer, expectedBuffer)
    ) {
      throw new UnauthorizedException("Invalid API key");
    }

    return true;
  }
}
