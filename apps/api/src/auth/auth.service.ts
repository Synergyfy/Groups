import {
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { compare } from "bcryptjs";
import {
  Prisma,
  UserRole,
} from "../generated/prisma/client.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { McomService } from "../mcom/mcom.service.js";
import type {
  McomEntitlement,
  McomProfile,
  McomTokenResponse,
  SessionRole,
  SessionTokenPayload,
  SessionUser,
} from "./auth.types.js";

export interface McomLoginResult {
  user: SessionUser;
  entitlement: McomEntitlement | null;
  token: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
    private readonly mcomService: McomService,
  ) {}

  get sessionTtlSeconds(): number {
    return Number(
      this.config.get<string>("AUTH_SESSION_TTL_SECONDS", "28800"),
    );
  }

  buildAuthorizeUrl(state: string): string {
    const baseUrl = this.config
      .get<string>("MCOM_SOLUTIONS_URL", "http://localhost:3010")
      .replace(/\/+$/, "");
    const params = new URLSearchParams({
      client_id: this.config.getOrThrow<string>("MCOM_CLIENT_ID"),
      redirect_uri: this.config.getOrThrow<string>("MCOM_REDIRECT_URI"),
      scope: this.config.get<string>(
        "MCOM_SCOPES",
        "profile email business membership packages",
      ),
      state,
    });

    return `${baseUrl}/api/v1/auth/sso/authorize?${params.toString()}`;
  }

  async handleMcomCallback(code: string): Promise<McomLoginResult> {
    const baseUrl = this.config
      .get<string>("MCOM_SOLUTIONS_URL", "http://localhost:3010")
      .replace(/\/+$/, "");

    const response = await fetch(`${baseUrl}/api/v1/auth/sso/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_id: this.config.getOrThrow<string>("MCOM_CLIENT_ID"),
        client_secret: this.config.getOrThrow<string>(
          "MCOM_CLIENT_SECRET",
        ),
        code,
        redirect_uri: this.config.getOrThrow<string>("MCOM_REDIRECT_URI"),
      }),
      signal: AbortSignal.timeout(10000),
    });

    const text = await response.text();
    const rawData = text ? (JSON.parse(text) as McomTokenResponse) : null;
    const data = rawData?.data ?? rawData;

    if (!response.ok || !data) {
      throw new UnauthorizedException(
        (rawData as { message?: string } | null)?.message ??
          "Central Hub authorization code exchange failed",
      );
    }

    const profile = data.user ?? data.profile;
    const entitlement = data.entitlement ?? data.entitlements ?? null;

    if (!profile?.email) {
      throw new UnauthorizedException(
        "Central Hub did not return a user email",
      );
    }

    this.enforceAccess(profile, entitlement);

    const localUser = await this.upsertUser(profile, entitlement);
    const user = this.toSessionUser(localUser);
    const token = await this.signSession(user);

    return { user, entitlement, token };
  }

  async adminLogin(
    email: string,
    password: string,
  ): Promise<{ user: SessionUser; token: string }> {
    const user = await this.prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });

    if (
      !user ||
      user.role !== UserRole.ADMIN ||
      !user.passwordHash
    ) {
      throw new UnauthorizedException("Invalid administrator credentials");
    }

    const passwordMatches = await compare(password, user.passwordHash);

    if (!passwordMatches) {
      throw new UnauthorizedException("Invalid administrator credentials");
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const sessionUser = this.toSessionUser(user);
    const token = await this.signSession(sessionUser);

    return { user: sessionUser, token };
  }

  async getSessionUser(payload: SessionTokenPayload): Promise<SessionUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user) {
      throw new UnauthorizedException(
        "The account for this session no longer exists",
      );
    }

    return this.toSessionUser(user);
  }

  async signSession(user: SessionUser): Promise<string> {
    const payload: SessionTokenPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      profileType: user.profileType ?? null,
    };

    return this.jwt.signAsync(payload);
  }

  private enforceAccess(
    profile: McomProfile,
    entitlement: McomEntitlement | null,
  ): void {
    const role = normalizeRole(profile.role ?? profile.profileType);

    if (role === "ADMIN") {
      throw new ForbiddenException({
        code: "ADMIN_LOCAL_LOGIN_REQUIRED",
        message:
          "Administrators must use the administrator sign-in page.",
      });
    }

    if (
      this.config
        .get<string>("MCOM_ENFORCE_ENTITLEMENTS", "true")
        .toLowerCase() === "false"
    ) {
      this.logger.warn(
        `Entitlement enforcement is disabled — allowing ${profile.email} (${role}) without checking Central Hub access.`,
      );
      return;
    }

    if (!entitlement?.access?.hasAccess) {
      const reason =
        entitlement?.access?.reason ?? "NO_ACTIVE_ENTITLEMENT";
      this.logger.warn(
        `Access denied for ${profile.email}: ${reason}`,
      );

      throw new ForbiddenException({
        code: reason,
        reason,
        message: messageForAccessReason(reason),
        upgradeUrl: entitlement?.access?.upgradeUrl ?? null,
      });
    }

    const whitelabelEnabled =
      entitlement.whitelabel?.enabled === true ||
      this.config.get<string>("MCOM_WHITELABEL_ENABLED", "false") === "true";

    if (whitelabelEnabled) {
      const granted =
        profile.profileType?.toUpperCase() === "BUSINESS" &&
        entitlement.access.accessType === "WHITELABEL" &&
        entitlement.whitelabel?.granted === true;

      if (!granted) {
        throw new ForbiddenException({
          code: "WHITELABEL_ACCESS_DENIED",
          message:
            "White-label access has not been granted for this business.",
        });
      }
    }
  }

  private async upsertUser(
    profile: McomProfile,
    entitlement: McomEntitlement | null,
  ) {
    const email = profile.email.trim().toLowerCase();
    const firstName = profile.firstName ?? null;
    const lastName = profile.lastName ?? null;
    const fullName =
      profile.fullName?.trim() ||
      [firstName, lastName].filter(Boolean).join(" ").trim() ||
      profile.name ||
      email;
    const displayName = profile.name?.trim() || fullName;
    const role = toUserRole(profile.role ?? profile.profileType);

    const common = {
      mcomUserId: profile.id ?? profile.sub ?? null,
      firstName,
      lastName,
      fullName,
      displayName,
      jobTitle: profile.jobTitle ?? null,
      avatarUrl: profile.avatarUrl ?? null,
      phone: profile.phone ?? null,
      address: profile.address ?? null,
      postcode: profile.postcode ?? null,
      country: profile.country ?? null,
      role,
      profileType: profile.profileType ?? profile.role ?? null,
      isAffiliate: profile.isAffiliate ?? false,
      businessId: profile.businessId ?? null,
      businessName: profile.businessName ?? null,
      membershipLevel: profile.membershipLevel ?? null,
      membershipTier: profile.membershipTier ?? null,
      membershipStatus: profile.membershipStatus ?? null,
      membershipPlanName: profile.membershipPlanName ?? null,
      membershipExpiresAt: toDate(profile.membershipExpiresAt),
      trialAccessExpiresAt: toDate(profile.trialAccessExpiresAt),
      businessProfile: toJson(profile.businessProfile),
      customerProfile: toJson(profile.customerProfile),
      agentProfile: toJson(profile.agentProfile),
      consultantProfile: toJson(profile.consultantProfile),
      accountManagerProfile: toJson(profile.accountManagerProfile),
      entitlement: toJson(entitlement),
      lastLoginAt: new Date(),
    };

    return this.prisma.user.upsert({
      where: { email },
      create: { email, ...common },
      update: common,
    });
  }

  private toSessionUser(user: {
    id: string;
    email: string;
    role: UserRole;
    displayName: string | null;
    fullName: string | null;
    firstName: string | null;
    lastName: string | null;
    profileType: string | null;
    businessName: string | null;
    avatarUrl: string | null;
  }): SessionUser {
    return {
      id: user.id,
      email: user.email,
      role: user.role as SessionRole,
      name: user.displayName ?? user.fullName ?? user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      profileType: user.profileType,
      businessName: user.businessName,
      avatarUrl: user.avatarUrl,
    };
  }
}

function normalizeRole(raw: string | null | undefined): SessionRole {
  const value = (raw ?? "").trim().toUpperCase();
  const allowed: SessionRole[] = [
    "BUSINESS",
    "CUSTOMER",
    "AGENT",
    "CONSULTANT",
    "ACCOUNT_MANAGER",
    "PARTNER",
    "ADMIN",
  ];

  return allowed.includes(value as SessionRole)
    ? (value as SessionRole)
    : "CUSTOMER";
}

function toUserRole(raw: string | null | undefined): UserRole {
  switch (normalizeRole(raw)) {
    case "BUSINESS":
      return UserRole.BUSINESS;
    case "AGENT":
      return UserRole.AGENT;
    case "CONSULTANT":
      return UserRole.CONSULTANT;
    case "ACCOUNT_MANAGER":
      return UserRole.ACCOUNT_MANAGER;
    case "PARTNER":
      return UserRole.PARTNER;
    case "ADMIN":
      return UserRole.ADMIN;
    default:
      return UserRole.CUSTOMER;
  }
}

function toJson(value: unknown): Prisma.InputJsonValue | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function toDate(value: unknown): Date | undefined {
  if (!value) {
    return undefined;
  }

  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function messageForAccessReason(reason: string): string {
  switch (reason) {
    case "PLATFORM_NOT_IN_MEMBERSHIP":
      return "Your Central Hub membership is active, but it does not include Groups & Circles. Ask a Central Hub administrator to add the Groups app to your membership plan.";
    case "TRIAL_NO_TASKS":
      return "Your trial is active, but no programme tasks are configured for Groups & Circles in Central Hub.";
    case "TRIAL_EXPIRED":
      return "Your Central Hub trial has expired. Renew your membership or ask an administrator to extend access.";
    case "UNVERIFIED":
      return "Complete your business verification in Central Hub to access Groups & Circles.";
    case "MEMBERSHIP_EXPIRED":
      return "Your Central Hub membership has expired. Renew it to access Groups & Circles.";
    case "WHITELABEL_ACCESS_DENIED":
      return "White-label access has not been granted for this business.";
    case "WHITELABEL_BUSINESS_ONLY":
      return "White-label access is available to business accounts only.";
    case "NO_ACTIVE_ENTITLEMENT":
      return "No active Central Hub membership, package, or trial includes Groups & Circles. Add the Groups app to a membership plan or grant an access pass.";
    default:
      return "Your Central Hub account does not currently have access to Groups & Circles.";
  }
}
