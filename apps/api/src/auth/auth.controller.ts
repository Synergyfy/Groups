import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import type { CookieOptions, Request, Response } from "express";
import { randomBytes } from "node:crypto";
import { AuthService } from "./auth.service.js";
import type {
  SessionRole,
  SessionTokenPayload,
  SessionUser,
} from "./auth.types.js";
import { CurrentUser } from "./current-user.decorator.js";
import { AdminLoginDto } from "./dto/admin-login.dto.js";
import { McomCallbackDto } from "./dto/mcom-callback.dto.js";
import { JwtAuthGuard } from "./jwt-auth.guard.js";

const OAUTH_COOKIE = "mcom_oauth";
const OAUTH_COOKIE_TTL_MS = 10 * 60 * 1000;

/**
 * The account types a visitor can sign up for from this app. Each one has a
 * matching registration page on Central Hub Solution.
 */
export type RegisterAccountType = "business" | "customer";

const REGISTER_TARGET_PATHS: Record<RegisterAccountType, string> = {
  business: "/getstarted/business",
  customer: "/register/customer",
};

interface OauthStateCookie {
  state: string;
  next: string | null;
}

@Controller("auth")
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
    private readonly jwt: JwtService,
  ) {}

  @Get("mcom/login")
  mcomLogin(
    @Query("next") next: string | undefined,
    @Res() response: Response,
  ) {
    const state = randomBytes(32).toString("hex");
    const cookie: OauthStateCookie = {
      state,
      next: normalizeNext(next),
    };

    response.cookie(OAUTH_COOKIE, JSON.stringify(cookie), {
      ...this.cookieBase(),
      maxAge: OAUTH_COOKIE_TTL_MS,
    });

    return response.redirect(this.authService.buildAuthorizeUrl(state));
  }

  @Get("mcom/register")
  mcomRegister(
    @Query("type") type: string | undefined,
    @Query("next") next: string | undefined,
    @Query("email") email: string | undefined,
    @Query("name") name: string | undefined,
    @Res() response: Response,
  ) {
    const state = randomBytes(32).toString("hex");
    const accountType = normalizeRegisterType(type);
    const cookie: OauthStateCookie = {
      state,
      next: normalizeNext(next),
    };

    response.cookie(OAUTH_COOKIE, JSON.stringify(cookie), {
      ...this.cookieBase(),
      maxAge: OAUTH_COOKIE_TTL_MS,
    });

    const frontendUrl = this.config
      .get<string>("MCOM_FRONTEND_URL", "http://localhost:3000")
      .replace(/\/+$/, "");
    const params = new URLSearchParams({
      client_id: this.config.getOrThrow<string>("MCOM_CLIENT_ID"),
      redirect_uri: this.config.getOrThrow<string>("MCOM_REDIRECT_URI"),
      scope: this.config.get<string>(
        "MCOM_SCOPES",
        "profile email business membership packages",
      ),
      state,
      role: accountType,
    });

    // Pre-fill the registration form with what the inviting business already
    // knows, so the person only has to confirm their details.
    const prefilledEmail = email?.trim();
    if (prefilledEmail) {
      params.set("email", prefilledEmail);
    }
    const prefilledName = name?.trim();
    if (prefilledName) {
      params.set("name", prefilledName);
    }

    // Business sign-ups continue on the Central Hub business onboarding flow,
    // customer sign-ups on the Central Hub customer registration flow.
    return response.redirect(
      `${frontendUrl}${REGISTER_TARGET_PATHS[accountType]}?${params.toString()}`,
    );
  }

  @Post("mcom/callback")
  @HttpCode(HttpStatus.OK)
  async mcomCallback(
    @Body() dto: McomCallbackDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const stored = parseOauthCookie(request.cookies?.[OAUTH_COOKIE]);

    if (!stored || stored.state !== dto.state) {
      throw new BadRequestException("Invalid OAuth state parameter");
    }

    try {
      const result = await this.authService.handleMcomCallback(dto.code);

      response.clearCookie(OAUTH_COOKIE, { path: "/" });
      response.cookie(
        this.sessionCookieName,
        result.token,
        this.sessionCookieOptions(),
      );

      return {
        user: result.user,
        entitlement: result.entitlement,
        redirectTo: stored.next ?? redirectForRole(result.user.role),
      };
    } catch (error) {
      response.clearCookie(OAUTH_COOKIE, { path: "/" });
      throw error;
    }
  }

  @Post("admin/login")
  @HttpCode(HttpStatus.OK)
  async adminLogin(
    @Body() dto: AdminLoginDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.adminLogin(
      dto.email,
      dto.password,
    );

    response.cookie(
      this.sessionCookieName,
      result.token,
      this.sessionCookieOptions(),
    );

    return {
      user: result.user,
      redirectTo: "/admin/groups",
    };
  }

  @Get("me")
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: SessionUser) {
    return { user };
  }

  @Post("logout")
  @HttpCode(HttpStatus.OK)
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    // Drop the stored Central Hub SSO credentials so a signed-out session can
    // never be used to mint chat credentials. A broken cookie is not an error.
    const token = request.cookies?.[this.sessionCookieName];
    if (typeof token === "string" && token) {
      try {
        const payload = await this.jwt.verify<SessionTokenPayload>(token);
        if (payload?.sub) {
          await this.authService.clearCentralSession(payload.sub);
        }
      } catch {
        // The session was already invalid — nothing to clean up.
      }
    }

    response.clearCookie(this.sessionCookieName, { path: "/" });
    response.clearCookie(OAUTH_COOKIE, { path: "/" });
    return { ok: true };
  }

  private get sessionCookieName(): string {
    return this.config.get<string>("AUTH_COOKIE_NAME", "chs_session");
  }

  private cookieBase(): CookieOptions {
    return {
      httpOnly: true,
      sameSite: "lax",
      secure: this.config.get<string>("NODE_ENV") === "production",
      path: "/",
    };
  }

  private sessionCookieOptions(): CookieOptions {
    return {
      ...this.cookieBase(),
      maxAge: this.authService.sessionTtlSeconds * 1000,
    };
  }
}

function normalizeNext(next?: string): string | null {
  if (!next) {
    return null;
  }

  return next.startsWith("/") && !next.startsWith("//") ? next : null;
}

/**
 * Map the account type requested by the visitor to the Central Hub Solution
 * registration page that serves it. Unknown values fall back to business so
 * the historic single-button sign-up keeps working.
 */
function normalizeRegisterType(type?: string): RegisterAccountType {
  const normalized = (type ?? "").trim().toLowerCase();

  if (
    normalized === "customer" ||
    normalized === "consumer" ||
    normalized === "client"
  ) {
    return "customer";
  }

  return "business";
}

function parseOauthCookie(raw: unknown): OauthStateCookie | null {
  if (typeof raw !== "string") {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<OauthStateCookie>;
    if (typeof parsed.state !== "string") {
      return null;
    }

    return {
      state: parsed.state,
      next: typeof parsed.next === "string" ? parsed.next : null,
    };
  } catch {
    return null;
  }
}

export function redirectForRole(role: SessionRole): string {
  switch (role) {
    case "BUSINESS":
      return "/business/groups";
    case "ADMIN":
      return "/admin/groups";
    case "CUSTOMER":
    case "AGENT":
    case "CONSULTANT":
    case "ACCOUNT_MANAGER":
    case "PARTNER":
    default:
      return "/consumer";
  }
}
