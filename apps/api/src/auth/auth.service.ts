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
import { jsonObject } from "../admin/admin.mappers.js";
import { hasActiveLocalPlan } from "../business/business.rules.js";
import { McomService } from "../mcom/mcom.service.js";
import { decideAccess } from "./entitlement-access.js";
import { normalizeRole, toUserRole } from "./roles.js";
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
    let entitlement = data.entitlement ?? data.entitlements ?? null;

    if (!profile?.email) {
      throw new UnauthorizedException(
        "Central Hub did not return a user email",
      );
    }

    // The token response normally carries the entitlement. If it does not, ask
    // the introspection endpoint rather than guessing from cached data.
    if (!entitlement && (profile.id ?? profile.sub)) {
      entitlement = await this.introspectEntitlement(
        (profile.id ?? profile.sub)!,
      );
    }

    await this.enforceAccess(profile, entitlement);

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

    await this.assertAccountActive(user);

    return this.toSessionUser(user);
  }

  /**
   * Admin suspensions are stored on the Business/PlatformAccount rows, not on
   * the session User row. Check them here so a suspended account loses access
   * immediately instead of keeping a valid session.
   */
  private async assertAccountActive(user: {
    role: UserRole;
    businessId: string | null;
    email: string;
  }): Promise<void> {
    if (user.role === UserRole.BUSINESS) {
      const business = user.businessId
        ? await this.prisma.business.findUnique({
            where: { id: user.businessId },
            select: { status: true },
          })
        : await this.prisma.business.findUnique({
            where: { email: user.email.trim().toLowerCase() },
            select: { status: true },
          });
      if (business && (business.status === "Suspended" || business.status === "Closed")) {
        throw new ForbiddenException({
          code: "BUSINESS_SUSPENDED",
          message: `This business account is ${business.status.toLowerCase()}.`,
        });
      }
      return;
    }

    if (user.role === UserRole.ADMIN) return;

    const account = await this.prisma.platformAccount.findUnique({
      where: { email: user.email.trim().toLowerCase() },
      select: { status: true },
    });
    if (account?.status === "Suspended") {
      throw new ForbiddenException({
        code: "ACCOUNT_SUSPENDED",
        message: "This account is suspended.",
      });
    }
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

  private async introspectEntitlement(
    userId: string,
  ): Promise<McomEntitlement | null> {
    try {
      const entitlement = await this.mcomService.getEntitlement(userId);
      return (entitlement as McomEntitlement | null) ?? null;
    } catch (error) {
      this.logger.warn(
        `Central Hub entitlement introspection failed for ${userId}: ${
          error instanceof Error ? error.message : "unknown error"
        }`,
      );
      return null;
    }
  }

  private async enforceAccess(
    profile: McomProfile,
    entitlement: McomEntitlement | null,
  ): Promise<void> {
    const role = normalizeRole(profile.role ?? profile.profileType);

    if (role === "ADMIN") {
      throw new ForbiddenException({
        code: "ADMIN_LOCAL_LOGIN_REQUIRED",
        message:
          "Administrators must use the administrator sign-in page.",
      });
    }

    // Groups & Circles only serves business and consumer accounts. Central Hub
    // may still issue sessions for agent, consultant, account-manager and
    // partner roles, but those roles have no workspace here.
    if (role !== "BUSINESS" && role !== "CUSTOMER") {
      throw new ForbiddenException({
        code: "ACCOUNT_TYPE_NOT_SUPPORTED",
        message:
          "Groups & Circles is available to business and consumer accounts only. Sign in with a business or consumer Central Hub account.",
      });
    }

    // Consumer dashboards are free. Only business workspaces need a Central Hub
    // membership, access pass or trial.
    if (role !== "BUSINESS") {
      return;
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

    const whitelabelEnabled =
      entitlement?.whitelabel?.enabled === true ||
      this.config.get<string>("MCOM_WHITELABEL_ENABLED", "false") === "true";
    const whitelabelGranted =
      profile.profileType?.toUpperCase() === "BUSINESS" &&
      entitlement?.access?.hasAccess === true &&
      entitlement?.access?.accessType === "WHITELABEL" &&
      entitlement?.whitelabel?.granted === true;

    if (whitelabelEnabled) {
      if (!whitelabelGranted) {
        throw new ForbiddenException({
          code: "WHITELABEL_ACCESS_DENIED",
          message:
            "White-label access has not been granted for this business.",
        });
      }
      return;
    }

    // Legacy white-label grants predate the PlatformEntitlement contract and
    // carry no platform plan. Keep them working when white-label is optional.
    if (entitlement?.access?.accessType === "WHITELABEL") {
      if (whitelabelGranted) return;
      throw new ForbiddenException({
        code: "WHITELABEL_ACCESS_DENIED",
        message:
          "White-label access has not been granted for this business.",
      });
    }

    const decision = decideAccess(entitlement);
    if (!decision.allowed) {
      // A plan bought directly in this app outranks the Central Hub verdict.
      // Let the business sign in so its still-valid local plan can be used;
      // the dashboard falls back to Central Hub once that plan expires.
      if (await this.hasActiveLocalPlanFor(profile)) {
        this.logger.log(
          `Allowing ${profile.email} to sign in on an active local plan (Central Hub: ${
            decision.reason ?? "NO_ACTIVE_ENTITLEMENT"
          }).`,
        );
        return;
      }

      const reason = decision.reason ?? "NO_ACTIVE_ENTITLEMENT";
      this.logger.warn(
        `Access denied for ${profile.email}: ${reason}`,
      );

      throw new ForbiddenException({
        code: reason,
        reason,
        message: messageForAccessReason(reason),
        upgradeUrl: decision.upgradeUrl ?? null,
      });
    }
  }

  /**
   * Whether this Central Hub user already owns an active plan purchased
   * directly in this app. Sign-in enforcement cannot rely on the single
   * `BusinessPlan` winner alone at this point (the user row may not be
   * provisioned yet), so resolve the business by its immutable Central Hub id
   * or email and inspect its plan.
   */
  private async hasActiveLocalPlanFor(profile: McomProfile): Promise<boolean> {
    const centralId = profile.id ?? profile.sub ?? null;
    const email = profile.email.trim().toLowerCase();
    const business = await this.prisma.business.findFirst({
      where: {
        OR: [
          ...(centralId ? [{ mcomUserId: centralId }] : []),
          { email },
        ],
      },
      select: {
        plan: {
          select: {
            localAccess: true,
            accessSource: true,
            planId: true,
            planName: true,
            variant: true,
            status: true,
            paid: true,
            accessDays: true,
            accessFeeMinor: true,
            agreementAccepted: true,
            agreedAt: true,
            accessExpiresAt: true,
          },
        },
      },
    });
    return hasActiveLocalPlan(business?.plan ?? null);
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
    const decision = decideAccess(entitlement);

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
      membershipLevel:
        profile.membershipLevel ??
        entitlement?.membershipContext?.membershipLevel ??
        null,
      membershipTier: profile.membershipTier ?? null,
      membershipStatus:
        profile.membershipStatus ??
        entitlement?.membershipContext?.membershipStatus ??
        null,
      membershipPlanName:
        profile.membershipPlanName ??
        entitlement?.membershipContext?.membershipPlanName ??
        null,
      membershipExpiresAt: toDate(profile.membershipExpiresAt),
      trialAccessExpiresAt:
        toDate(profile.trialAccessExpiresAt) ??
        (decision.source === "trial" ? toDate(decision.expiresAt) : undefined),
      businessProfile: toJson(
        profile.businessProfile || profile.location
          ? {
              ...(profile.businessProfile ?? {}),
              ...(profile.location ? { location: profile.location } : {}),
            }
          : null,
      ),
      customerProfile: toJson(profile.customerProfile),
      agentProfile: toJson(profile.agentProfile),
      consultantProfile: toJson(profile.consultantProfile),
      accountManagerProfile: toJson(profile.accountManagerProfile),
      entitlement: toJson(entitlement),
      entitlementCheckedAt: new Date(),
      lastLoginAt: new Date(),
    };

    const centralId = profile.id ?? profile.sub ?? null;
    // The Central Hub id never changes; email does. Prefer the id so an email
    // edit in Central Hub updates the same local row instead of creating a new
    // account (or hitting the unique mcomUserId constraint).
    const existingByCentral = centralId
      ? await this.prisma.user.findUnique({
          where: { mcomUserId: centralId },
          select: {
            id: true,
            email: true,
            mcomUserId: true,
            customerProfile: true,
          },
        })
      : null;
    const existingByEmail = await this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        mcomUserId: true,
        customerProfile: true,
      },
    });
    const existing = existingByCentral ?? existingByEmail;
    const emailTakenByOther =
      existingByEmail !== null &&
      existing !== null &&
      existingByEmail.id !== existing.id;

    const existingCustomerProfile = jsonObject(existing?.customerProfile);
    const incomingCustomerProfile = jsonObject(profile.customerProfile);
    const mergedCustomerProfile = mergeDefined(
      existingCustomerProfile,
      incomingCustomerProfile,
    );
    const hasIncomingName = Boolean(
      profile.fullName?.trim() ||
        profile.name?.trim() ||
        firstName ||
        lastName,
    );

    // Central Hub is authoritative for identity and membership, but locally
    // managed consumer profile fields (location, phone, preferences) must not
    // be wiped just because the SSO payload omits them.
    const update = {
      ...common,
      mcomUserId: centralId ?? existing?.mcomUserId ?? null,
      email: emailTakenByOther ? existing!.email : email,
      ...(hasIncomingName ? { fullName, displayName } : {}),
      jobTitle: optionalText(profile.jobTitle),
      avatarUrl: optionalText(profile.avatarUrl),
      phone: optionalText(profile.phone),
      address: optionalText(profile.address),
      postcode: optionalText(profile.postcode),
      country: optionalText(profile.country),
      customerProfile:
        Object.keys(mergedCustomerProfile).length > 0
          ? (mergedCustomerProfile as Prisma.InputJsonValue)
          : undefined,
    };

    const user = existing
      ? await this.prisma.user.update({
          where: { id: existing.id },
          data: update,
        })
      : await this.prisma.user.upsert({
          // Handles two concurrent first-time SSO callbacks for the same email.
          where: { email },
          create: { email, ...common },
          update,
        });

    if (!existing) {
      const config = await this.prisma.adminConfig.findFirst({
        select: { platformSettings: true },
      });
      const settings = jsonObject(config?.platformSettings);
      if (settings.notifyOnNewRegistration !== false) {
        await this.prisma.auditLog.create({
          data: {
            action: "account-registered",
            actorId: user.id,
            actorName: user.fullName ?? user.displayName ?? user.email,
            targetType: "member",
            targetId: user.id,
            targetName: user.email,
            detail: `New ${String(user.role).toLowerCase()} registration`,
          },
        });
      }
    }

    return user;
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

function optionalText(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

/**
 * Merge a new profile payload over an existing one without letting missing or
 * null upstream values erase locally stored data.
 */
function mergeDefined(
  base: Record<string, unknown>,
  incoming: Record<string, unknown>,
): Record<string, unknown> {
  const merged: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(incoming)) {
    if (value === null || value === undefined) continue;
    if (isRecord(value) && isRecord(merged[key])) {
      merged[key] = mergeDefined(merged[key] as Record<string, unknown>, value);
    } else {
      merged[key] = value;
    }
  }
  return merged;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
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
