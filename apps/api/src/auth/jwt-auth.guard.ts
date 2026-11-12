import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import type { Request } from "express";
import { AuthService } from "./auth.service.js";
import type { SessionTokenPayload, SessionUser } from "./auth.types.js";

export interface AuthenticatedRequest extends Request {
  user?: SessionUser;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<AuthenticatedRequest>();
    const cookieName = this.config.get<string>(
      "AUTH_COOKIE_NAME",
      "chs_session",
    );
    const bearer = request.headers.authorization?.replace(
      /^Bearer\s+/i,
      "",
    );
    const token = request.cookies?.[cookieName] ?? bearer;

    if (!token) {
      throw new UnauthorizedException("Not signed in");
    }

    try {
      const payload = await this.jwt.verifyAsync<SessionTokenPayload>(token);
      request.user = await this.authService.getSessionUser(payload);
      return true;
    } catch {
      throw new UnauthorizedException("Invalid or expired session");
    }
  }
}
