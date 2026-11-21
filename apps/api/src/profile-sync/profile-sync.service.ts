import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createHmac, timingSafeEqual } from "node:crypto";
import { jsonObject } from "../admin/admin.mappers.js";
import type { McomProfile } from "../auth/auth.types.js";
import { toUserRole } from "../auth/roles.js";
import { normalizeTier } from "../business/business.rules.js";
import {
  Prisma,
  UserRole,
} from "../generated/prisma/client.js";
import type { User } from "../generated/prisma/client.js";
import { McomService } from "../mcom/mcom.service.js";
import { McomProfileLookupError } from "../mcom/mcom.types.js";
import { PrismaService } from "../prisma/prisma.service.js";
import type { ProfileUpdatedWebhookDto } from "./dto/profile-updated.dto.js";

type Tx = Prisma.TransactionClient;

const PROCESSING_STALE_MS = 5 * 60 * 1000;
const MAX_ERROR_LENGTH = 1000;

@Injectable()
export class ProfileSyncService {
  private readonly logger = new Logger(ProfileSyncService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly mcom: McomService,
  ) {}

  async handleProfileUpdated(
    rawBody: string | Buffer,
    signature: string | undefined,
    payload: ProfileUpdatedWebhookDto,
  ) {
    this.verifySignature(rawBody, signature);

    const eventId = payload.data.eventId;
    const userId = payload.data.userId;
    const claimed = await this.claimEvent(
      eventId,
      payload.event,
      userId,
      payload.platform,
    );

    if (!claimed) {
      this.logger.log(`Ignoring duplicate profile.updated event ${eventId}`);
      return { received: true, duplicate: true };
    }

    try {
      const profile = await this.mcom.getEcosystemProfile(userId);
      const centralId = profile.id ?? profile.sub ?? userId;
      const user = await this.syncProfile(profile, centralId);

      await this.prisma.mcomProfileEvent.update({
        where: { eventId },
        data: {
          status: "processed",
          processedAt: new Date(),
          error: null,
        },
      });

      return {
        received: true,
        synced: {
          userId: centralId,
          localUserId: user.id,
          role: user.role,
        },
      };
    } catch (error) {
      if (error instanceof McomProfileLookupError) {
        // Central Hub does not serve this role in Groups & Circles, or the user
        // does not exist. There is nothing to mirror, so acknowledge the event.
        if (error.status === 403 || error.status === 404) {
          await this.markIgnored(eventId, error.message);
          this.logger.warn(
            `Skipping profile.updated ${eventId}: ${error.message}`,
          );
          return { received: true, ignored: true, reason: error.message };
        }
      }

      await this.markFailed(eventId, error);
      this.logger.error(
        `profile.updated ${eventId} failed for ${userId}: ${
          error instanceof Error ? error.message : "unknown error"
        }`,
      );
      throw new ServiceUnavailableException(
        "Profile sync failed; Central Hub will retry",
      );
    }
  }

  /** Verify the HMAC over the exact bytes Central Hub sent. */
  private verifySignature(
    rawBody: string | Buffer,
    signature: string | undefined,
  ): void {
    const secret =
      this.config.get<string>("MCOM_WEBHOOK_SECRET", "").trim() ||
      this.config.get<string>("MCOM_HMAC_SECRET", "").trim();

    if (!secret) {
      this.logger.error(
        "MCOM_WEBHOOK_SECRET and MCOM_HMAC_SECRET are not configured.",
      );
      throw new ServiceUnavailableException(
        "Webhook secret is not configured.",
      );
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

  /**
   * Claim an event id exactly once. A stale PROCESSING row (crashed handler) or
   * a FAILED row may be retried, which keeps Central Hub's at-least-once
   * delivery working without duplicating side effects.
   */
  private async claimEvent(
    eventId: string,
    eventType: string,
    userId: string,
    platform: string | undefined,
  ): Promise<boolean> {
    const existing = await this.prisma.mcomProfileEvent.findUnique({
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

      await this.prisma.mcomProfileEvent.update({
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
      await this.prisma.mcomProfileEvent.create({
        data: {
          eventId,
          eventType,
          userId,
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
    await this.prisma.mcomProfileEvent.update({
      where: { eventId },
      data: {
        status: "ignored",
        processedAt: new Date(),
        error: reason.slice(0, MAX_ERROR_LENGTH),
      },
    });
  }

  private async markFailed(
    eventId: string,
    error: unknown,
  ): Promise<void> {
    const reason =
      error instanceof Error ? error.message : "unknown error";
    await this.prisma.mcomProfileEvent.update({
      where: { eventId },
      data: {
        status: "failed",
        error: reason.slice(0, MAX_ERROR_LENGTH),
      },
    });
  }

  /**
   * Upsert the canonical profile into the local mirror. The immutable Central
   * Hub user id is the primary key lookup; email is only a backfill fallback
   * because emails change over time.
   */
  private async syncProfile(
    profile: McomProfile,
    centralId: string,
  ): Promise<User> {
    return this.prisma.$transaction(async (tx) => {
      const user = await this.persistUser(tx, profile, centralId);

      if (user.role === UserRole.BUSINESS) {
        await this.persistBusiness(tx, profile, user);
      } else {
        await this.persistMemberSnapshots(tx, user);
      }

      return user;
    });
  }

  private async persistUser(
    tx: Tx,
    profile: McomProfile,
    centralId: string,
  ): Promise<User> {
    const email = profile.email.trim().toLowerCase();
    const existingByCentral = await tx.user.findUnique({
      where: { mcomUserId: centralId },
    });
    const existingByEmail = await tx.user.findUnique({ where: { email } });
    const existing = existingByCentral ?? existingByEmail;

    // An email can only belong to one local row. If it is already used by a
    // different Central Hub user, keep the old email instead of overwriting.
    const emailTakenByOther =
      existingByEmail !== null &&
      existing !== null &&
      existingByEmail.id !== existing.id;
    if (emailTakenByOther) {
      this.logger.warn(
        `Central profile ${centralId} uses email ${email}, which belongs to local user ${existingByEmail.id}; keeping the existing local email.`,
      );
    }

    const businessProfile = jsonObject(profile.businessProfile);
    const firstName = profile.firstName ?? null;
    const lastName = profile.lastName ?? null;
    const computedName =
      profile.fullName?.trim() ||
      [firstName, lastName].filter(Boolean).join(" ").trim() ||
      profile.name?.trim() ||
      null;
    const displayName = profile.name?.trim() || computedName;
    const role =
      profile.role || profile.profileType
        ? toUserRole(profile.role ?? profile.profileType)
        : (existing?.role ?? UserRole.CUSTOMER);

    const businessName =
      firstNonEmpty(
        profile.businessName,
        businessProfile.businessName,
        existing?.businessName,
      ) ?? null;

    const data = {
      mcomUserId: centralId,
      email: emailTakenByOther ? existing.email : email,
      firstName: profile.firstName ?? existing?.firstName ?? null,
      lastName: profile.lastName ?? existing?.lastName ?? null,
      ...(computedName
        ? { fullName: computedName, displayName }
        : existing
          ? {}
          : { fullName: email, displayName: email }),
      jobTitle: profile.jobTitle ?? existing?.jobTitle ?? null,
      avatarUrl: profile.avatarUrl ?? existing?.avatarUrl ?? null,
      phone: profile.phone ?? existing?.phone ?? null,
      address: profile.address ?? existing?.address ?? null,
      postcode: profile.postcode ?? existing?.postcode ?? null,
      country: profile.country ?? existing?.country ?? null,
      role,
      profileType: profile.profileType ?? profile.role ?? existing?.profileType ?? null,
      isAffiliate: profile.isAffiliate ?? existing?.isAffiliate ?? false,
      businessId: profile.businessId ?? existing?.businessId ?? null,
      businessName,
      membershipLevel:
        profile.membershipLevel ?? existing?.membershipLevel ?? null,
      membershipTier:
        profile.membershipTier ?? existing?.membershipTier ?? null,
      membershipStatus:
        profile.membershipStatus ?? existing?.membershipStatus ?? null,
      membershipPlanName:
        profile.membershipPlanName ?? existing?.membershipPlanName ?? null,
      membershipExpiresAt:
        toDate(profile.membershipExpiresAt) ??
        existing?.membershipExpiresAt ??
        null,
      trialAccessExpiresAt:
        toDate(profile.trialAccessExpiresAt) ??
        existing?.trialAccessExpiresAt ??
        null,
      businessProfile: mergeJson(
        existing?.businessProfile,
        profile.businessProfile,
      ),
      customerProfile: mergeJson(
        existing?.customerProfile,
        profile.customerProfile,
      ),
      agentProfile: mergeJson(existing?.agentProfile, profile.agentProfile),
      consultantProfile: mergeJson(
        existing?.consultantProfile,
        profile.consultantProfile,
      ),
      accountManagerProfile: mergeJson(
        existing?.accountManagerProfile,
        profile.accountManagerProfile,
      ),
    } satisfies Prisma.UserUncheckedUpdateInput;

    if (existing) {
      return tx.user.update({ where: { id: existing.id }, data });
    }

    return tx.user.create({
      data: {
        ...data,
        email,
        mcomUserId: centralId,
      },
    });
  }

  private async persistBusiness(
    tx: Tx,
    profile: McomProfile,
    user: User,
  ): Promise<void> {
    if (!user.mcomUserId) return;

    const businessProfile = jsonObject(profile.businessProfile);
    let business = await tx.business.findUnique({
      where: { mcomUserId: user.mcomUserId },
    });
    if (!business && user.businessId) {
      business = await tx.business.findUnique({ where: { id: user.businessId } });
    }
    if (!business) {
      business = await tx.business.findUnique({ where: { email: user.email } });
    }

    // The Business row is provisioned lazily on first dashboard access. If this
    // user has never signed in here yet, there is nothing to mirror.
    if (!business) return;

    const contactName =
      firstNonEmpty(user.fullName, user.displayName, business.contactName) ??
      business.contactName;
    const name =
      firstNonEmpty(
        user.businessName,
        businessProfile.businessName,
        business.name,
        contactName,
      ) ?? business.name;

    const emailOwner = await tx.business.findUnique({
      where: { email: user.email },
    });
    const email =
      emailOwner && emailOwner.id !== business.id
        ? business.email
        : user.email;

    const updated = await tx.business.update({
      where: { id: business.id },
      data: {
        mcomUserId: user.mcomUserId,
        name,
        contactName,
        email,
        phone: user.phone,
        city:
          firstNonEmpty(
            businessProfile.city,
            user.address,
            business.city,
          ) ?? business.city,
        localArea:
          firstNonEmpty(
            businessProfile.localArea,
            user.postcode,
            business.localArea,
          ) ?? business.localArea,
        category:
          firstNonEmpty(
            businessProfile.category,
            business.category,
          ) ?? business.category,
        tier: normalizeTier(
          profile.membershipTier ?? business.tier,
        ),
      },
    });

    if (user.businessId !== updated.id) {
      await tx.user.update({
        where: { id: user.id },
        data: { businessId: updated.id },
      });
    }

    await tx.group.updateMany({
      where: { ownerId: updated.id },
      data: { ownerName: updated.name },
    });
    await tx.groupMember.updateMany({
      where: { memberId: updated.id },
      data: {
        fullName: updated.contactName,
        businessName: updated.name,
        category: updated.category,
        location: updated.city,
        photoUrl: user.avatarUrl,
      },
    });
    await tx.invitation.updateMany({
      where: { inviteeId: updated.id, status: "pending" },
      data: { inviteeName: updated.contactName },
    });
  }

  /** Keep member/invitation snapshots aligned for consumer-style roles. */
  private async persistMemberSnapshots(tx: Tx, user: User): Promise<void> {
    const displayName =
      firstNonEmpty(user.fullName, user.displayName, user.email) ?? user.email;

    await tx.groupMember.updateMany({
      where: { memberId: user.id },
      data: {
        fullName: displayName,
        photoUrl: user.avatarUrl,
      },
    });
    await tx.invitation.updateMany({
      where: { inviteeId: user.id, status: "pending" },
      data: { inviteeName: displayName },
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

function mergeJson(
  existing: unknown,
  incoming: unknown,
): Prisma.InputJsonValue | undefined {
  const merged = mergeDefined(jsonObject(existing), jsonObject(incoming));
  return Object.keys(merged).length > 0
    ? (merged as Prisma.InputJsonValue)
    : undefined;
}

function mergeDefined(
  base: Record<string, unknown>,
  incoming: Record<string, unknown>,
): Record<string, unknown> {
  const merged: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(incoming)) {
    if (value === null || value === undefined) continue;
    if (isRecord(value) && isRecord(merged[key])) {
      merged[key] = mergeDefined(
        merged[key] as Record<string, unknown>,
        value,
      );
    } else {
      merged[key] = value;
    }
  }
  return merged;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "P2002"
  );
}
