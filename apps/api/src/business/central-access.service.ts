import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { User } from "../generated/prisma/client.js";
import { McomService } from "../mcom/mcom.service.js";
import { PrismaService } from "../prisma/prisma.service.js";
import type { McomEntitlement } from "../auth/auth.types.js";
import { decideAccess, type AccessDecision } from "../auth/entitlement-access.js";

/** Revalidate at most this often; Central Hub is authoritative but not on every click. */
const REVALIDATE_AFTER_MS = 5 * 60 * 1000;
/** Retry sooner after a transient introspection failure. */
const RETRY_AFTER_MS = 60 * 1000;

@Injectable()
export class CentralAccessService {
  private readonly logger = new Logger(CentralAccessService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mcom: McomService,
    private readonly config: ConfigService,
  ) {}

  private get enforcementEnabled(): boolean {
    return (
      this.config
        .get<string>("MCOM_ENFORCE_ENTITLEMENTS", "true")
        .toLowerCase() !== "false"
    );
  }

  /**
   * The entitlement cached on the user row, without calling Central Hub.
   * Used to explain a denial (reason + upgrade URL) without another round trip.
   */
  storedDecision(user: Pick<User, "entitlement">): AccessDecision | null {
    const entitlement = parseEntitlement(user.entitlement);
    return entitlement ? decideAccess(entitlement) : null;
  }

  /**
   * Refresh the user's Central Hub entitlement when the cached copy is stale,
   * then return the access decision. Returns `null` when enforcement is off or
   * the user has no Central Hub entitlement, so local plan rules still apply.
   */
  async revalidate(user: User): Promise<{
    user: User;
    decision: AccessDecision | null;
  }> {
    const cached = parseEntitlement(user.entitlement);

    if (!this.enforcementEnabled) {
      // Development bypass: still provision a Central Hub grant captured at
      // login, but never deny local access or call Central Hub on every request.
      return {
        user,
        decision: cached ? decideAccess(cached) : null,
      };
    }

    const checkedAt = user.entitlementCheckedAt?.getTime() ?? 0;
    const age = Date.now() - checkedAt;

    if (cached && age < REVALIDATE_AFTER_MS) {
      return { user, decision: decideAccess(cached) };
    }

    const subject = user.mcomUserId ?? user.businessId ?? null;
    if (!subject) {
      return {
        user,
        decision: cached ? decideAccess(cached) : null,
      };
    }

    try {
      const fresh = (await this.mcom.getEntitlement(subject)) as
        | McomEntitlement
        | null;
      if (!fresh) {
        return {
          user,
          decision: cached ? decideAccess(cached) : null,
        };
      }

      const decision = decideAccess(fresh);
      const updated = await this.persist(user, fresh, decision);
      return { user: updated, decision };
    } catch (error) {
      this.logger.warn(
        `Central Hub entitlement revalidation failed for ${user.email}: ${
          error instanceof Error ? error.message : "unknown error"
        }`,
      );
      // Keep the last known verdict, but retry shortly instead of every request.
      const updated = await this.prisma.user.update({
        where: { id: user.id },
        data: {
          entitlementCheckedAt: new Date(Date.now() - (REVALIDATE_AFTER_MS - RETRY_AFTER_MS)),
        },
      });
      return {
        user: updated,
        decision: cached ? decideAccess(cached) : null,
      };
    }
  }

  private async persist(
    user: User,
    entitlement: McomEntitlement,
    decision: AccessDecision,
  ): Promise<User> {
    const trialExpiresAt =
      decision.source === "trial"
        ? toDate(decision.expiresAt)
        : (toDate(user.trialAccessExpiresAt) ?? undefined);

    return this.prisma.user.update({
      where: { id: user.id },
      data: {
        entitlement: JSON.parse(
          JSON.stringify(entitlement),
        ) as import("../generated/prisma/client.js").Prisma.InputJsonValue,
        entitlementCheckedAt: new Date(),
        membershipLevel:
          entitlement.membershipContext?.membershipLevel ??
          user.membershipLevel,
        membershipStatus:
          entitlement.membershipContext?.membershipStatus ??
          user.membershipStatus,
        membershipPlanName:
          entitlement.membershipContext?.membershipPlanName ??
          user.membershipPlanName,
        trialAccessExpiresAt: trialExpiresAt,
      },
    });
  }
}

function parseEntitlement(value: unknown): McomEntitlement | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as McomEntitlement;
}

function toDate(value: unknown): Date | null {
  if (!value) return null;
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
}
