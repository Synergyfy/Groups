import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { Prisma } from "../generated/prisma/client.js";
import type {
  Business,
  BusinessPlan,
  User,
} from "../generated/prisma/client.js";
import { jsonObject } from "../admin/admin.mappers.js";
import type { AccessDecision } from "../auth/entitlement-access.js";
import type { SessionUser } from "../auth/auth.types.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { fromMinorPence, toMinorPence } from "../common/money.js";
import { CentralAccessService } from "./central-access.service.js";
import { BusinessLocationService } from "./business-location.service.js";
import {
  accessPreferenceFor,
  isLocalSnapshotActive,
  isPlanActive,
  localPlanSnapshot,
  normalizeTier,
  normalizeVariant,
  planAccessDays,
  toBusinessConfig,
} from "./business.rules.js";
import type {
  AccessPreference,
  BusinessConfig,
  BusinessContext,
  LocalPlanAccessSnapshot,
  PlanAccessOptionView,
  PlanAccessOptionsView,
} from "./business.types.js";

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

@Injectable()
export class BusinessContextService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly centralAccess: CentralAccessService,
    private readonly location: BusinessLocationService,
  ) {}

  async resolve(session: SessionUser): Promise<BusinessContext> {
    let user = await this.prisma.user.findUnique({
      where: { id: session.id },
    });
    if (!user) throw new NotFoundException("User account not found");
    if (user.role !== "BUSINESS") {
      throw new ForbiddenException("Business account required");
    }

    // Central Hub remains authoritative. Refresh the cached entitlement before
    // resolving the local plan so a membership/pass/trial can open access.
    const resolved = await this.centralAccess.revalidate(user);
    user = resolved.user;

    const config = await this.getConfig();
    const business = await this.findOrCreateBusiness(user);
    // Central Hub owns the location. A business that reached Groups before
    // its profile was mirrored gets its chain resolved from the postcode, so
    // it is never filed under a placeholder such as "Unspecified".
    const located = await this.location.ensureResolved(business);
    if (located.status === "Suspended" || located.status === "Closed") {
      throw new ForbiddenException({
        code: "BUSINESS_SUSPENDED",
        message: `This business account is ${located.status.toLowerCase()}. Contact an administrator.`,
      });
    }

    const plan = await this.findOrCreatePlan(
      user,
      business,
      config,
      resolved.decision,
    );
    await this.applyTemporaryAccessExpiry(user, business, plan, config);
    const partner = await this.prisma.partner.findFirst({
      where: { businessId: business.id },
    });

    return {
      user,
      business: located,
      plan,
      config,
      partner,
      centralAccess: resolved.decision,
    };
  }

  /**
   * When temporary access expires and the administrator chose "auto-leave",
   * remove the business from groups it joined. Counts are recomputed so the
   * activation rules keep operating on accurate membership.
   */
  private async applyTemporaryAccessExpiry(
    user: User,
    business: Business,
    plan: BusinessPlan,
    config: BusinessConfig,
  ): Promise<void> {
    const temporary = (config.accessRules.temporaryAccess ?? {}) as {
      duration?: string | number;
      expiryAction?: string;
    };
    if (temporary.expiryAction !== "auto-leave") return;
    if (plan.paid && !plan.accessExpiresAt) return;

    const durationDays = Number(temporary.duration ?? 0);
    const trialEnd =
      user.trialAccessExpiresAt ??
      (plan.accessSource === "trial" ? plan.accessExpiresAt : null) ??
      (user.membershipStatus?.trim().toLowerCase() === "trial" &&
      durationDays > 0
        ? new Date(
            business.joinedAt.getTime() +
              durationDays * 24 * 60 * 60 * 1000,
          )
        : null);
    if (!trialEnd || trialEnd.getTime() > Date.now()) return;

    const memberships = await this.prisma.groupMember.findMany({
      where: { memberId: business.id },
      select: {
        id: true,
        groupId: true,
        group: { select: { ownerId: true } },
      },
    });
    const leavable = memberships.filter(
      (membership) => membership.group.ownerId !== business.id,
    );
    if (leavable.length === 0) return;

    await this.prisma.$transaction(async (tx) => {
      for (const membership of leavable) {
        await tx.groupMember.delete({ where: { id: membership.id } });
        const memberCount = await tx.groupMember.count({
          where: { groupId: membership.groupId },
        });
        await tx.group.update({
          where: { id: membership.groupId },
          data: { memberCount },
        });
      }
    });
  }

  async getConfig(): Promise<BusinessConfig> {
    const row = await this.prisma.adminConfig.findFirst();
    return toBusinessConfig(row);
  }

  async uniqueSlug(base: string): Promise<string> {
    const seed =
      base
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 140) || randomUUID().slice(0, 8);
    let candidate = seed;
    let suffix = 1;
    while (await this.prisma.group.findUnique({ where: { slug: candidate } })) {
      suffix += 1;
      candidate = `${seed}-${suffix}`;
    }
    return candidate;
  }

  private async findOrCreateBusiness(user: User): Promise<Business> {
    let business = user.businessId
      ? await this.prisma.business.findUnique({ where: { id: user.businessId } })
      : null;

    // Prefer the immutable Central Hub id over the email, which can change.
    if (!business && user.mcomUserId) {
      business = await this.prisma.business.findUnique({
        where: { mcomUserId: user.mcomUserId },
      });
    }

    if (!business) {
      const byEmail = await this.prisma.business.findUnique({
        where: { email: user.email.trim().toLowerCase() },
      });
      if (byEmail) {
        business = byEmail;
      }
    }

    if (!business) {
      const profile = jsonObject(user.businessProfile);
      const location = jsonObject(profile.location);
      const name =
        firstNonEmpty(
          user.businessName,
          profile.businessName,
          user.fullName,
          user.displayName,
          user.email.split("@")[0],
        ) ?? "Business";
      const email = user.email.trim().toLowerCase();
      try {
        business = await this.prisma.business.create({
          data: {
            id: user.businessId ?? `biz-${randomUUID()}`,
            mcomUserId: user.mcomUserId ?? undefined,
            name,
            contactName:
              firstNonEmpty(user.fullName, user.displayName, name) ?? name,
            email,
            phone: user.phone,
            city:
              firstNonEmpty(
                location.city,
                profile.city,
                user.address,
                "Unspecified",
              ) ?? "Unspecified",
            localArea: firstNonEmpty(
              location.borough,
              profile.localArea,
              user.postcode,
            ),
            highStreet: firstNonEmpty(location.highStreet),
            localMallName: firstNonEmpty(location.localMall),
            postcode: firstNonEmpty(location.postcode, user.postcode),
            cityId: firstNonEmpty(location.cityId),
            boroughId: firstNonEmpty(location.boroughId),
            highStreetId: firstNonEmpty(location.highStreetId),
            localMallId: firstNonEmpty(location.localMallId),
            category: firstNonEmpty(profile.category, "General") ?? "General",
            tier: normalizeTier(user.membershipTier),
            programmeId: firstNonEmpty(profile.programmeId),
            accountManagerId: firstNonEmpty(profile.accountManagerId),
            agentId: firstNonEmpty(profile.agentId),
            consultantId: firstNonEmpty(profile.consultantId),
          },
        });
      } catch (error) {
        // Two first-time requests can race to create the row; reuse whichever
        // one won instead of failing the request.
        business = await this.prisma.business.findFirst({
          where: {
            OR: [
              ...(user.businessId ? [{ id: user.businessId }] : []),
              { email },
            ],
          },
        });
        if (!business) throw error;
      }
    }

    if (user.mcomUserId && business.mcomUserId !== user.mcomUserId) {
      try {
        business = await this.prisma.business.update({
          where: { id: business.id },
          data: { mcomUserId: user.mcomUserId },
        });
      } catch (error) {
        // Another local row already owns this Central Hub id (for example after
        // a historical email-based duplicate). Use that row instead.
        if (
          typeof error === "object" &&
          error !== null &&
          "code" in error &&
          (error as { code?: unknown }).code === "P2002"
        ) {
          const byCentralId = await this.prisma.business.findUnique({
            where: { mcomUserId: user.mcomUserId },
          });
          if (byCentralId) business = byCentralId;
        } else {
          throw error;
        }
      }
    }

    if (user.businessId !== business.id) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { businessId: business.id },
      });
    }

    return business;
  }

  private async findOrCreatePlan(
    user: User,
    business: Business,
    config: BusinessConfig,
    centralDecision: AccessDecision | null,
  ) {
    const existing = await this.prisma.businessPlan.findUnique({
      where: { businessId: business.id },
    });

    if (!existing) {
      return this.createInitialPlan(user, business, config, centralDecision);
    }

    const now = Date.now();
    const local = localPlanSnapshot(existing);
    const localActive = isLocalSnapshotActive(local, now);
    const preference = accessPreferenceFor(existing);
    const centralAllowed =
      Boolean(centralDecision?.allowed) &&
      centralDecision?.source !== "none" &&
      !isExpired(centralDecision?.expiresAt);
    const centralData = centralAllowed
      ? await this.centralPlanData(
          existing,
          centralDecision!,
          user.membershipTier,
        )
      : null;

    // The membership tier is reporting metadata and stays aligned with
    // Central Hub even when the business chooses its local plan.
    if (centralAllowed) {
      await this.syncBusinessTier(business, centralDecision!.membershipName);
    }

    // The business chooses which entitlement is active. Its preference wins;
    // when the preferred source is unavailable the other one takes over so
    // access never drops while a valid plan exists.
    const useCentral =
      Boolean(centralData) &&
      (preference === "central" || !localActive);
    const useLocal = !useCentral && localActive;

    let data: Prisma.BusinessPlanUpdateInput;
    if (useLocal && local) {
      data = {
        ...localPlanData(local),
        accessPreference: preference,
        localAccess: snapshotJson(local),
      };
    } else if (useCentral && centralData) {
      data = {
        ...centralData,
        accessPreference: preference,
        localAccess: local ? snapshotJson(local) : Prisma.JsonNull,
      };
    } else {
      const expired = expiredPlanData(
        existing,
        config,
        centralDecision,
        user,
      );
      if (!expired) return existing;
      data = {
        ...expired,
        accessPreference: preference,
        localAccess: local ? snapshotJson(local) : Prisma.JsonNull,
      };
    }

    if (!planStateChanged(existing, data)) return existing;
    return this.prisma.businessPlan.update({
      where: { businessId: business.id },
      data,
    });
  }

  /**
   * Switches the active entitlement between the locally purchased plan and
   * the Central Hub membership/pass. Both must currently be usable, so a
   * stale plan can never be selected.
   */
  async switchAccessSource(
    ctx: BusinessContext,
    source: AccessPreference,
  ): Promise<BusinessPlan> {
    const existing = await this.prisma.businessPlan.findUnique({
      where: { businessId: ctx.business.id },
    });
    if (!existing) {
      throw new BadRequestException("Activate a plan before switching access.");
    }

    const local = localPlanSnapshot(existing);
    const decision = ctx.centralAccess;
    const centralAvailable =
      Boolean(decision?.allowed) &&
      decision?.source !== "none" &&
      !isExpired(decision?.expiresAt);

    if (source === "local") {
      if (!isLocalSnapshotActive(local)) {
        throw new BadRequestException(
          "You do not have an active locally purchased plan to switch to.",
        );
      }
      const updated = await this.prisma.businessPlan.update({
        where: { businessId: ctx.business.id },
        data: {
          accessPreference: "local",
          ...localPlanData(local!),
          localAccess: snapshotJson(local!),
        },
      });
      return updated;
    }

    if (!centralAvailable) {
      throw new BadRequestException(
        "Your Central Hub membership does not currently include an active plan.",
      );
    }
    const centralData = await this.centralPlanData(
      existing,
      decision!,
      ctx.user.membershipTier,
    );
    const updated = await this.prisma.businessPlan.update({
      where: { businessId: ctx.business.id },
      data: {
        accessPreference: "central",
        ...centralData,
        localAccess: local ? snapshotJson(local) : Prisma.JsonNull,
      },
    });
    await this.syncBusinessTier(ctx.business, decision!.membershipName);
    return updated;
  }

  /** The two access sources the plan page can switch between. */
  async accessOptions(
    ctx: BusinessContext,
  ): Promise<PlanAccessOptionsView> {
    const local = localPlanSnapshot(ctx.plan);
    const localActive = isLocalSnapshotActive(local);
    const decision = ctx.centralAccess;
    const centralActive = Boolean(
      ctx.plan.accessSource !== "local" && isPlanActive(ctx.plan),
    );
    const centralAllowed =
      Boolean(decision?.allowed) &&
      decision?.source !== "none" &&
      !isExpired(decision?.expiresAt);
    const identity = centralAllowed
      ? await this.centralIdentity(decision!, ctx.user.membershipTier)
      : null;

    const localOption: PlanAccessOptionView | null = local?.paid
      ? {
          source: "local",
          planName: local.planName,
          variant: local.variant,
          accessSource: "local",
          accessDays: local.accessDays,
          accessFee: fromMinorPence(local.accessFeeMinor),
          accessExpiresAt: local.accessExpiresAt ?? undefined,
          active: ctx.plan.accessSource === "local" && isPlanActive(ctx.plan),
          available: localActive,
        }
      : null;

    const centralOption: PlanAccessOptionView | null = centralAllowed
      ? {
          source: "central",
          planName:
            ctx.plan.accessSource !== "local"
              ? ctx.plan.planName
              : identity?.planName ?? "Central Hub Access",
          variant:
            ctx.plan.accessSource !== "local"
              ? normalizeVariant(ctx.plan.variant)
              : identity?.variant ?? normalizeVariant(decision!.planName),
          accessSource: normalizeCentralSource(decision!.source),
          accessDays: ctx.plan.accessSource !== "local"
            ? ctx.plan.accessDays
            : accessDaysUntil(decision!.expiresAt),
          accessFee: 0,
          accessExpiresAt: decision!.expiresAt ?? undefined,
          active: centralActive,
          available: true,
          membershipName: decision!.membershipName ?? undefined,
          externalPlanId: decision!.planId ?? undefined,
          tasks: decision!.tasks,
          quotas: decision!.quotas,
          limits: decision!.limits,
          features: decision!.features,
        }
      : ctx.plan.accessSource !== "local"
        ? {
            source: "central",
            planName: ctx.plan.planName,
            variant: normalizeVariant(ctx.plan.variant),
            accessSource: normalizeCentralSource(ctx.plan.accessSource),
            accessDays: ctx.plan.accessDays,
            accessFee: 0,
            accessExpiresAt: ctx.plan.accessExpiresAt?.toISOString(),
            active: centralActive,
            // A definitive denial from Central Hub hides the switch even if
            // the cached expiry date is still in the future.
            available: decision
              ? centralAllowed
              : !isExpired(ctx.plan.accessExpiresAt?.toISOString()),
            membershipName: ctx.plan.membershipName ?? undefined,
            externalPlanId: ctx.plan.externalPlanId ?? undefined,
          }
        : null;

    return {
      preference: accessPreferenceFor(ctx.plan),
      local: localOption,
      central: centralOption,
    };
  }

  private async createInitialPlan(
    user: User,
    business: Business,
    config: BusinessConfig,
    centralDecision: AccessDecision | null,
  ) {
    const planName =
      (user.membershipTier ?? business.tier).trim() || "Free";
    const variant = normalizeVariant(user.membershipPlanName);
    // Central Hub is authoritative: if it denied access (for example because
    // the platform is not bundled into the membership), never infer an active
    // local plan from the membership status alone.
    const active =
      !centralDecision &&
      user.membershipStatus?.toLowerCase() === "active";
    const status = centralDecision ? "Pending" : active ? "Active" : "Pending";
    const accessDays = user.membershipPlanName?.trim()
      ? planAccessDays(variant)
      : config.groupCreationRules.entryAccessDays === 180
        ? 180
        : planAccessDays(variant);
    const matchingPlan = await this.prisma.plan.findFirst({
      where: { name: planName, variant, status: "Active" },
      select: { priceMinor: true, id: true },
    });
    const accessFeeMinor =
      matchingPlan?.priceMinor ??
      toMinorPence(config.groupCreationRules.entryAccessFee);

    try {
      return await this.prisma.businessPlan.create({
        data: {
          businessId: business.id,
          variant,
          planId: matchingPlan?.id ?? null,
          planName,
          status,
          paid: active,
          accessDays,
          accessFeeMinor,
          agreementAccepted: false,
          accessExpiresAt: active
            ? new Date(Date.now() + accessDays * 24 * 60 * 60 * 1000)
            : null,
          accessSource: "local",
          accessReason: centralDecision?.reason ?? null,
          upgradeUrl: centralDecision?.upgradeUrl ?? null,
        },
      });
    } catch (error) {
      // concurrent first request created it already
      const raced = await this.prisma.businessPlan.findUnique({
        where: { businessId: business.id },
      });
      if (raced) return raced;
      throw error;
    }
  }

  /**
   * The catalogue plan (if this app publishes a matching one) behind a Central
   * Hub grant, so the plan name and variant shown and activated always agree.
   * The external plan id identifies the plan family; for memberships the tier
   * on the user row picks the matching variant.
   */
  private async centralIdentity(
    decision: AccessDecision,
    variantHint?: string | null,
  ): Promise<{
    planId: string | null;
    planName: string;
    variant: ReturnType<typeof normalizeVariant>;
  }> {
    const catalogue = await this.findCataloguePlan(
      decision.planId,
      decision.planName,
    );
    const hinted =
      catalogue && decision.source === "membership" && variantHint?.trim()
        ? normalizeVariant(variantHint)
        : null;
    const resolved =
      catalogue &&
      hinted &&
      normalizeVariant(catalogue.variant) !== hinted
        ? ((await this.prisma.plan.findFirst({
            where: {
              name: { equals: catalogue.name, mode: "insensitive" },
              variant: hinted,
              status: "Active",
            },
          })) ?? catalogue)
        : catalogue;

    return {
      planId: resolved?.id ?? decision.planId,
      planName:
        resolved?.name?.trim() ||
        decision.planName?.trim() ||
        "Central Hub Access",
      variant: resolved
        ? normalizeVariant(resolved.variant)
        : normalizeVariant(decision.planName),
    };
  }

  private async centralPlanData(
    existing: BusinessPlan | null,
    decision: AccessDecision,
    variantHint?: string | null,
  ): Promise<Prisma.BusinessPlanUpdateInput> {
    const identity = await this.centralIdentity(decision, variantHint);
    const { variant, planName } = identity;
    const expiresAt = toDate(decision.expiresAt);
    const accessDays = expiresAt
      ? Math.max(
          1,
          Math.ceil(
            (expiresAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000),
          ),
        )
      : (existing?.accessDays ?? planAccessDays(variant));

    return {
      variant,
      planId: identity.planId,
      planName,
      status: "Active",
      // Memberships and access passes are prepaid centrally; a trial is not a
      // local purchase, and the guard recognises it through accessSource.
      paid: decision.source !== "trial",
      accessDays,
      accessFeeMinor: 0,
      accessExpiresAt: expiresAt,
      accessSource: decision.source,
      externalPlanId: decision.planId,
      membershipName: decision.membershipName,
      accessReason: decision.reason ?? null,
      upgradeUrl: decision.upgradeUrl ?? null,
      programmeTasks:
        decision.tasks.length > 0
          ? (decision.tasks as unknown as Prisma.InputJsonValue)
          : Prisma.JsonNull,
      centralQuotas: {
        quotas: decision.quotas,
        limits: decision.limits,
        features: decision.features,
      } as Prisma.InputJsonValue,
    };
  }

  /**
   * Keep Business.tier aligned with the membership tier for reporting and
   * directory filters, without touching a locally purchased plan's name.
   */
  private async syncBusinessTier(
    business: Business,
    membershipName: string | null,
  ): Promise<void> {
    const tier = membershipName?.trim();
    if (!tier || tier === business.tier) return;
    const normalized = normalizeTier(tier);
    await this.prisma.business.update({
      where: { id: business.id },
      data: { tier: normalized },
    });
    business.tier = normalized;
  }

  private async findCataloguePlan(
    planId: string | null,
    planName: string | null,
  ) {
    if (planId) {
      const byId = await this.prisma.plan.findUnique({
        where: { id: planId },
      });
      if (byId) return byId;
    }
    if (planName?.trim()) {
      return this.prisma.plan.findFirst({
        where: {
          name: { equals: planName.trim(), mode: "insensitive" },
          status: "Active",
        },
        orderBy: { variant: "asc" },
      });
    }
    return null;
  }
}

const DAY_MS = 24 * 60 * 60 * 1000;

function isExpired(
  value: string | null | undefined,
  now: number = Date.now(),
): boolean {
  if (!value) return false;
  const date = new Date(value);
  return !Number.isNaN(date.getTime()) && date.getTime() <= now;
}

function accessDaysUntil(value: string | null): number {
  if (!value) return 0;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 0;
  return Math.max(1, Math.ceil((date.getTime() - Date.now()) / DAY_MS));
}

function normalizeCentralSource(
  value: string,
): PlanAccessOptionView["accessSource"] {
  return value === "membership" || value === "access_pass" || value === "trial"
    ? value
    : "membership";
}

function snapshotJson(
  snapshot: LocalPlanAccessSnapshot,
): Prisma.InputJsonValue {
  return snapshot as unknown as Prisma.InputJsonValue;
}

/** Effective BusinessPlan columns for the locally purchased plan. */
function localPlanData(
  local: LocalPlanAccessSnapshot,
): Prisma.BusinessPlanUpdateInput {
  return {
    variant: local.variant,
    planId: local.planId,
    planName: local.planName,
    status: "Active",
    paid: local.paid,
    accessDays: local.accessDays,
    accessFeeMinor: local.accessFeeMinor,
    agreementAccepted: local.agreementAccepted,
    agreedAt: local.agreedAt ? new Date(local.agreedAt) : null,
    accessExpiresAt: local.accessExpiresAt
      ? new Date(local.accessExpiresAt)
      : null,
    accessSource: "local",
    externalPlanId: null,
    membershipName: null,
    accessReason: null,
    upgradeUrl: null,
    programmeTasks: Prisma.JsonNull,
    centralQuotas: Prisma.JsonNull,
  };
}

/**
 * Expiry fallbacks when neither source is usable. Central Hub-sourced access
 * is revoked as soon as Central Hub denies it; an expired local purchase keeps
 * the existing membership-status mirrors.
 */
function expiredPlanData(
  existing: BusinessPlan,
  config: BusinessConfig,
  decision: AccessDecision | null,
  user: User,
): Prisma.BusinessPlanUpdateInput | null {
  const now = Date.now();

  if (existing.accessSource !== "local") {
    if (!decision) {
      // Enforcement is disabled, or Central Hub returned no entitlement at
      // all. Do not destroy access we cannot verify; keep the cached row.
      return null;
    }
    return {
      status: "Expired",
      paid: false,
      accessReason: decision.reason ?? "NO_ACTIVE_ENTITLEMENT",
      upgradeUrl: decision.upgradeUrl ?? null,
      programmeTasks:
        decision.tasks.length > 0
          ? (decision.tasks as unknown as Prisma.InputJsonValue)
          : Prisma.JsonNull,
      centralQuotas: Prisma.JsonNull,
    };
  }

  const ownAccessExpired = Boolean(
    existing.accessExpiresAt &&
      existing.accessExpiresAt.getTime() <= now &&
      config.groupCreationRules.requirePaidAccess,
  );
  const membershipInactive = [
    "expired",
    "inactive",
    "suspended",
    "cancelled",
  ].includes((user.membershipStatus ?? "").trim().toLowerCase());
  const membershipExpired = Boolean(
    user.membershipExpiresAt && user.membershipExpiresAt.getTime() <= now,
  );
  const shouldExpire =
    ownAccessExpired ||
    (!existing.paid &&
      config.groupCreationRules.requirePaidAccess &&
      (membershipInactive || membershipExpired));

  if (!shouldExpire || (existing.status === "Expired" && !existing.paid)) {
    return null;
  }
  return { status: "Expired", paid: false };
}

/** Avoids writing the plan row on every dashboard request. */
function planStateChanged(
  existing: BusinessPlan,
  data: Prisma.BusinessPlanUpdateInput,
): boolean {
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined) continue;
    const current = (existing as unknown as Record<string, unknown>)[key];

    if (value instanceof Date) {
      if (!(current instanceof Date) || current.getTime() !== value.getTime()) {
        return true;
      }
      continue;
    }
    if (value === Prisma.JsonNull || value === Prisma.DbNull) {
      if (current !== null && current !== undefined) return true;
      continue;
    }
    if (value !== null && typeof value === "object") {
      if (JSON.stringify(current ?? null) !== JSON.stringify(value)) {
        return true;
      }
      continue;
    }
    if (current !== value) return true;
  }
  return false;
}
