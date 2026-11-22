import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { randomUUID } from "node:crypto";
import { jsonObject } from "../admin/admin.mappers.js";
import {
  hasActiveLocalPlan,
  normalizeTier,
  normalizeVariant,
  planAccessDays,
} from "../business/business.rules.js";
import {
  Prisma,
  UserRole,
} from "../generated/prisma/client.js";
import type {
  Business,
  BusinessPlan,
  User,
} from "../generated/prisma/client.js";
import { McomProfileLookupError } from "../mcom/mcom.types.js";
import { verifyMcomWebhookSignature } from "../mcom/webhook-signature.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { ProfileSyncService } from "../profile-sync/profile-sync.service.js";
import type {
  MembershipUpdatedEventDataDto,
  MembershipUpdatedWebhookDto,
} from "./dto/membership-updated.dto.js";

const PROCESSING_STALE_MS = 5 * 60 * 1000;
const MAX_ERROR_LENGTH = 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

export interface ApplyResult {
  ignored?: string;
  userId?: string;
  localUserId?: string;
  businessId?: string;
  planId?: string | null;
  planName?: string;
  status?: string;
  expiresAt?: string | null;
  revoked?: boolean;
}

/**
 * Applies Central Hub `membership.updated` events.
 *
 * A membership purchase in Central Hub bundles this app's package and pushes a
 * signed event. The event only carries ids and plan metadata, so this service
 * maps `package.externalPlanId` (or the package/membership name) onto the local
 * plan catalogue and activates the matching `BusinessPlan` until the membership
 * expires. `expired`/`cancelled`/`inactive` events revoke the same access.
 */
@Injectable()
export class MembershipSyncService {
  private readonly logger = new Logger(MembershipSyncService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly profileSync: ProfileSyncService,
  ) {}

  async handleMembershipUpdated(
    rawBody: string | Buffer,
    signature: string | undefined,
    payload: MembershipUpdatedWebhookDto,
  ) {
    verifyMcomWebhookSignature(
      this.config,
      rawBody,
      signature,
      this.logger,
    );

    const data = payload.data;
    const claimed = await this.claimEvent(
      data.eventId,
      payload.event,
      data.userId,
      data.businessId,
      payload.platform,
    );

    if (!claimed) {
      this.logger.log(
        `Ignoring duplicate membership.updated event ${data.eventId}`,
      );
      return { received: true, duplicate: true };
    }

    try {
      const result = await this.applyMembership(data);

      if (result.ignored) {
        await this.markIgnored(data.eventId, result.ignored);
        this.logger.warn(
          `Skipping membership.updated ${data.eventId}: ${result.ignored}`,
        );
        return { received: true, ignored: true, reason: result.ignored };
      }

      await this.prisma.mcomMembershipEvent.update({
        where: { eventId: data.eventId },
        data: {
          status: "processed",
          processedAt: new Date(),
          error: null,
        },
      });

      return { received: true, synced: result };
    } catch (error) {
      if (
        error instanceof McomProfileLookupError &&
        (error.status === 403 || error.status === 404)
      ) {
        // Central Hub does not serve this role in this app, or the user no
        // longer exists. There is nothing to apply, so acknowledge the event.
        await this.markIgnored(data.eventId, error.message);
        this.logger.warn(
          `Skipping membership.updated ${data.eventId}: ${error.message}`,
        );
        return { received: true, ignored: true, reason: error.message };
      }

      await this.markFailed(data.eventId, error);
      this.logger.error(
        `membership.updated ${data.eventId} failed for ${data.userId}: ${
          error instanceof Error ? error.message : "unknown error"
        }`,
      );
      throw new ServiceUnavailableException(
        "Membership sync failed; Central Hub will retry",
      );
    }
  }

  private async applyMembership(
    data: MembershipUpdatedEventDataDto,
  ): Promise<ApplyResult> {
    const membership = data.membership;
    const pkg = data.package;
    const status = (
      membership?.status ??
      pkg?.status ??
      ""
    )
      .trim()
      .toLowerCase();
    const expiresAt = toDate(
      membership?.expiresAt ?? pkg?.expiresAt ?? null,
    );
    const isActive =
      status === "active" &&
      (!expiresAt || expiresAt.getTime() > Date.now());

    // Pull the canonical profile if this business has never signed in here so
    // the membership can be applied before its first login.
    let user = await this.prisma.user.findUnique({
      where: { mcomUserId: data.userId },
    });
    if (!user) {
      user = await this.profileSync.syncCentralUser(data.userId);
    }

    if (user.role !== UserRole.BUSINESS) {
      return {
        ignored: `Central Hub user ${data.userId} is ${user.role}; membership.updated only applies to BUSINESS accounts.`,
      };
    }

    const business = await this.findOrCreateBusiness(user, data);
    if (!business) {
      return {
        ignored: `No local business workspace could be resolved for Central Hub user ${data.userId}.`,
      };
    }

    const existing = await this.prisma.businessPlan.findUnique({
      where: { businessId: business.id },
    });
    const externalPlanId = pkg?.externalPlanId?.trim() || null;
    const packageName = pkg?.packageName?.trim() || null;
    const membershipPlanName = membership?.planName?.trim() || null;
    const catalogue = await this.resolveCataloguePlan(
      externalPlanId,
      membershipPlanName,
      packageName,
      membership?.tier ?? membership?.level,
    );

    const planName =
      catalogue?.name?.trim() ||
      packageName ||
      membershipPlanName ||
      existing?.planName ||
      "Central Hub Membership";
    const variant = catalogue
      ? normalizeVariant(catalogue.variant)
      : normalizeVariant(
          membership?.tier ??
            membership?.level ??
            membershipPlanName ??
            packageName,
        );

    let plan: BusinessPlan | null = null;
    let revoked = false;

    if (isActive) {
      if (existing && hasActiveLocalPlan(existing)) {
        // The business bought a plan directly in this app, and it is still
        // valid. That plan is superior to the membership package, so keep it
        // in place. The membership details below are still mirrored onto the
        // user row and the next entitlement revalidation applies them as soon
        // as the local plan expires.
        plan = existing;
      } else {
        plan = await this.activatePlan({
          business,
          existing,
          catalogue,
          planName,
          variant,
          externalPlanId,
          membershipName: firstNonEmpty(
            membership?.level,
            membership?.tier,
            membershipPlanName,
          ),
          expiresAt,
          limits: pkg?.limits,
        });
      }
    } else if (
      existing &&
      existing.accessSource !== "local" &&
      this.planMatchesEvent(existing, {
        externalPlanId,
        planName,
      })
    ) {
      // Revoke only the Central Hub plan this event refers to. A late expiry
      // for an old package must not remove a newer membership — and must never
      // revoke a locally purchased plan.
      plan = await this.prisma.businessPlan.update({
        where: { businessId: business.id },
        data: {
          status: "Expired",
          paid: false,
          accessReason: `MEMBERSHIP_${(status || "inactive").toUpperCase()}`,
          upgradeUrl: null,
          centralQuotas: Prisma.JsonNull,
        },
      });
      revoked = true;
    }

    if (isActive) {
      await this.syncBusinessTier(
        business,
        membership?.level ?? membership?.tier,
      );
    }

    // Refresh the local user mirror. Clearing entitlementCheckedAt makes the
    // next dashboard request re-read Central Hub immediately rather than
    // waiting for the 5-minute cache window.
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        businessId: business.id !== user.businessId ? business.id : undefined,
        membershipLevel:
          membership?.level?.trim() || user.membershipLevel,
        membershipTier: membership?.tier?.trim() || user.membershipTier,
        membershipStatus: status || user.membershipStatus,
        membershipPlanName:
          membershipPlanName || user.membershipPlanName,
        membershipExpiresAt: expiresAt ?? user.membershipExpiresAt,
        entitlementCheckedAt: null,
      },
    });

    return {
      userId: data.userId,
      localUserId: user.id,
      businessId: business.id,
      planId: plan?.planId ?? catalogue?.id ?? externalPlanId ?? null,
      planName: plan?.planName ?? planName,
      status: plan?.status ?? (status || "inactive"),
      expiresAt: plan?.accessExpiresAt?.toISOString() ?? null,
      revoked,
    };
  }

  private async activatePlan(input: {
    business: Business;
    existing: BusinessPlan | null;
    catalogue: {
      id: string;
      name: string;
      variant: string;
    } | null;
    planName: string;
    variant: ReturnType<typeof normalizeVariant>;
    externalPlanId: string | null;
    membershipName: string | null;
    expiresAt: Date | null;
    limits: Record<string, unknown> | undefined;
  }): Promise<BusinessPlan> {
    const accessDays = input.expiresAt
      ? Math.max(
          1,
          Math.ceil(
            (input.expiresAt.getTime() - Date.now()) / DAY_MS,
          ),
        )
      : planAccessDays(input.variant);
    const limits = input.limits ?? {};
    const centralQuotas =
      Object.keys(limits).length > 0
        ? ({
            quotas: limits,
            limits,
          } as Prisma.InputJsonValue)
        : Prisma.JsonNull;

    const data = {
      variant: input.variant,
      planId: input.catalogue?.id ?? input.externalPlanId,
      planName: input.planName,
      status: "Active",
      paid: true,
      accessDays,
      accessFeeMinor: 0,
      accessExpiresAt: input.expiresAt,
      accessSource: "membership",
      externalPlanId: input.externalPlanId,
      membershipName: input.membershipName,
      accessReason: null,
      upgradeUrl: null,
      centralQuotas,
    };

    return this.prisma.businessPlan.upsert({
      where: { businessId: input.business.id },
      update: data,
      create: {
        businessId: input.business.id,
        agreementAccepted: input.existing?.agreementAccepted ?? false,
        agreedAt: input.existing?.agreedAt ?? null,
        ...data,
      },
    });
  }

  private planMatchesEvent(
    existing: BusinessPlan,
    event: { externalPlanId: string | null; planName: string },
  ): boolean {
    if (!existing.externalPlanId) return true;
    if (!event.externalPlanId) return true;
    if (existing.externalPlanId === event.externalPlanId) return true;
    return (
      existing.planName.trim().toLowerCase() ===
      event.planName.trim().toLowerCase()
    );
  }

  /**
   * Match the Central package to this app's published plan catalogue. The
   * external plan id is the reliable key; names are a best-effort fallback.
   */
  private async resolveCataloguePlan(
    externalPlanId: string | null,
    membershipPlanName: string | null,
    packageName: string | null,
    variantHint: string | null | undefined,
  ) {
    const select = {
      id: true,
      name: true,
      variant: true,
    } as const;

    if (externalPlanId) {
      const byId = await this.prisma.plan.findUnique({
        where: { id: externalPlanId },
        select,
      });
      if (byId) return byId;
    }

    const variants = variantHint
      ? [normalizeVariant(variantHint)]
      : (["Standard", "Pro", "Pro+"] as const);

    for (const name of [membershipPlanName, packageName]) {
      if (!name) continue;

      for (const variant of variants) {
        const byName = await this.prisma.plan.findFirst({
          where: {
            name: { equals: name, mode: "insensitive" },
            variant,
            status: "Active",
          },
          select,
        });
        if (byName) return byName;
      }

      const anyVariant = await this.prisma.plan.findFirst({
        where: {
          name: { equals: name, mode: "insensitive" },
          status: "Active",
        },
        orderBy: { variant: "asc" },
        select,
      });
      if (anyVariant) return anyVariant;
    }

    return null;
  }

  private async syncBusinessTier(
    business: Business,
    tier: string | null | undefined,
  ): Promise<void> {
    const value = tier?.trim();
    if (!value) return;

    const normalized = normalizeTier(value);
    if (normalized === business.tier) return;

    await this.prisma.business.update({
      where: { id: business.id },
      data: { tier: normalized },
    });
    business.tier = normalized;
  }

  /**
   * Resolve the local business workspace for a Central Hub user. Mirrors the
   * lazy provisioning done on first dashboard access so a membership can be
   * applied before that first login.
   */
  private async findOrCreateBusiness(
    user: User,
    data: MembershipUpdatedEventDataDto,
  ): Promise<Business | null> {
    if (data.businessId) {
      const byEventId = await this.prisma.business.findUnique({
        where: { id: data.businessId },
      });
      if (byEventId) return byEventId;
    }

    if (user.businessId) {
      const byUserId = await this.prisma.business.findUnique({
        where: { id: user.businessId },
      });
      if (byUserId) return byUserId;
    }

    if (user.mcomUserId) {
      const byCentralId = await this.prisma.business.findUnique({
        where: { mcomUserId: user.mcomUserId },
      });
      if (byCentralId) return byCentralId;
    }

    const byEmail = await this.prisma.business.findUnique({
      where: { email: user.email.trim().toLowerCase() },
    });
    if (byEmail) return byEmail;

    if (user.role !== UserRole.BUSINESS) return null;

    const profile = jsonObject(user.businessProfile);
    const name =
      firstNonEmpty(
        user.businessName,
        profile.businessName,
        user.fullName,
        user.displayName,
        user.email.split("@")[0],
      ) ?? "Business";

    try {
      return await this.prisma.business.create({
        data: {
          id: user.businessId ?? data.businessId ?? `biz-${randomUUID()}`,
          mcomUserId: user.mcomUserId ?? undefined,
          name,
          contactName:
            firstNonEmpty(user.fullName, user.displayName, name) ?? name,
          email: user.email.trim().toLowerCase(),
          phone: user.phone,
          city:
            firstNonEmpty(profile.city, user.address, "Unspecified") ??
            "Unspecified",
          localArea: firstNonEmpty(profile.localArea, user.postcode),
          category: firstNonEmpty(profile.category, "General") ?? "General",
          tier: normalizeTier(user.membershipTier),
          programmeId: firstNonEmpty(profile.programmeId),
          accountManagerId: firstNonEmpty(profile.accountManagerId),
          agentId: firstNonEmpty(profile.agentId),
          consultantId: firstNonEmpty(profile.consultantId),
        },
      });
    } catch (error) {
      if (!isUniqueConstraintError(error)) throw error;

      // Two events (or a first dashboard request) raced to create the row.
      const raced = await this.prisma.business.findFirst({
        where: {
          OR: [
            ...(data.businessId ? [{ id: data.businessId }] : []),
            ...(user.businessId ? [{ id: user.businessId }] : []),
            { email: user.email.trim().toLowerCase() },
          ],
        },
      });
      if (raced) return raced;
      throw error;
    }
  }

  /**
   * Claim an event id exactly once. A stale PROCESSING row (crashed handler) or
   * a FAILED row may be retried, which keeps Central Hub's at-least-once
   * delivery working without duplicating side effects.
   */
  private async claimEvent(
    eventId: string,
    eventType: string,
    userId: string,
    businessId: string | undefined,
    platform: string | undefined,
  ): Promise<boolean> {
    const existing = await this.prisma.mcomMembershipEvent.findUnique({
      where: { eventId },
    });

    if (existing) {
      if (existing.status === "processed" || existing.status === "ignored") {
        return false;
      }
      if (
        existing.status === "processing" &&
        existing.receivedAt.getTime() > Date.now() - PROCESSING_STALE_MS
      ) {
        return false;
      }

      await this.prisma.mcomMembershipEvent.update({
        where: { eventId },
        data: {
          status: "processing",
          attempts: { increment: 1 },
          error: null,
        },
      });
      return true;
    }

    try {
      await this.prisma.mcomMembershipEvent.create({
        data: {
          eventId,
          eventType,
          userId,
          businessId: businessId ?? null,
          platform: platform ?? null,
          status: "processing",
        },
      });
      return true;
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        return false;
      }
      throw error;
    }
  }

  private async markIgnored(eventId: string, reason: string): Promise<void> {
    await this.prisma.mcomMembershipEvent.update({
      where: { eventId },
      data: {
        status: "ignored",
        processedAt: new Date(),
        error: reason.slice(0, MAX_ERROR_LENGTH),
      },
    });
  }

  private async markFailed(eventId: string, error: unknown): Promise<void> {
    const reason =
      error instanceof Error ? error.message : "unknown error";
    await this.prisma.mcomMembershipEvent.update({
      where: { eventId },
      data: {
        status: "failed",
        error: reason.slice(0, MAX_ERROR_LENGTH),
      },
    });
  }
}

function firstNonEmpty(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  return null;
}

function toDate(value: unknown): Date | null {
  if (!value) return null;
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "P2002"
  );
}
