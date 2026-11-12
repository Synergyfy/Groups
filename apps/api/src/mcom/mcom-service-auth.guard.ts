import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";
import type { Request } from "express";
import { McomService } from "./mcom.service.js";
import type { AuthenticatedServiceRequest } from "./mcom.types.js";

@Injectable()
export class McomServiceAuthGuard implements CanActivate {
  private readonly jwks: ReturnType<typeof createRemoteJWKSet>;

  constructor(
    private readonly config: ConfigService,
    private readonly mcomService: McomService,
  ) {
    const mcomUrl = this.config
      .get<string>("MCOM_SOLUTIONS_URL", "http://localhost:3010")
      .replace(/\/+$/, "");
    this.jwks = createRemoteJWKSet(
      new URL(`${mcomUrl}/.well-known/jwks.json`),
    );
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<AuthenticatedServiceRequest & Request>();
    const authHeader = request.headers.authorization;
    const token = authHeader?.replace(/^Bearer\s+/i, "");

    if (!token) {
      throw new UnauthorizedException(
        "Missing Bearer service token",
      );
    }

    try {
      const { payload } = await jwtVerify(token, this.jwks, {
        issuer: "mcom-solutions",
        audience: this.config.getOrThrow<string>("MCOM_CLIENT_ID"),
      });

      const isDelegated = payload.typ === "delegated";
      const act = payload.act as { sub?: string } | undefined;
      const callerAppId = act?.sub ?? (payload.sub as string);

      const allowedCallers = await this.mcomService.getAllowedCallers();
      const permitted =
        allowedCallers.includes("*") || allowedCallers.includes(callerAppId);

      if (!permitted) {
        throw new ForbiddenException(
          `Caller "${callerAppId}" is not permitted to call this service`,
        );
      }

      request.serviceCaller = {
        callerAppId,
        isDelegated,
        userId: isDelegated ? (payload.sub as string) : undefined,
        scopes: this.parseScopes(payload),
        payload,
      };

      return true;
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }

      throw new UnauthorizedException(
        error instanceof Error
          ? `Invalid or expired service token: ${error.message}`
          : "Invalid or expired service token",
      );
    }
  }

  private parseScopes(payload: JWTPayload): string[] {
    if (typeof payload.scope === "string") {
      return payload.scope.split(" ").filter(Boolean);
    }

    if (Array.isArray(payload.scp)) {
      return payload.scp.map(String);
    }

    return [];
  }
}
