import {
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
import { toMinorPence } from "../common/money.js";
import { CentralAccessService } from "./central-access.service.js";
import {
  hasActiveLocalPlan,
  normalizeTier,
  normalizeVariant,
  planAccessDays,
  toBusinessConfig,
} from "./business.rules.js";
import type { BusinessContext, BusinessConfig } from "./business.types.js";

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
    if (
      business.status === "Suspended" ||
      business.status === "Closed"
    ) {
      throw new ForbiddenException({
        code: "BUSINESS_SUSPENDED",
        message: `This business account is ${business.status.toLowerCase()}. Contact an administrator.`,
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
      business,
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

    // A plan purchased directly in this app is the superior entitlement. Keep
    // it until it actually expires, even when Central Hub also reports an
    // active membership/pass/trial. The Central Hub verdict stays cached on the
    // user row, so it becomes the fallback on the first request after expiry.
    if (existing && hasActiveLocalPlan(existing)) {
      return existing;
    }

    // No active local purchase: mirror Central Hub access (membership, access
    // pass or trial) onto the local row so quotas, group creation and the API
    // guard keep working unchanged.
    if (centralDecision?.allowed && centralDecision.source !== "none") {
      return this.applyCentralAccess(
        user,
        business,
        existing,
        centralDecision,
      );
    }

    if (existing) {
      // A Central Hub-sourced plan is revoked as soon as Central Hub says the
      // membership/pass/trial is no longer valid. Locally purchased plans are
      // left to the local expiry rules below.
      if (existing.accessSource !== "local") {
        if (!centralDecision) {
          // Enforcement is disabled, or Central Hub returned no entitlement at
          // all. Do not destroy access we cannot verify; keep the cached row.
          return existing;
        }

        return this.prisma.businessPlan.update({
          where: { businessId: business.id },
          data: {
            status: "Expired",
            paid: false,
            accessReason:
              centralDecision.reason ?? "NO_ACTIVE_ENTITLEMENT",
            upgradeUrl: centralDecision.upgradeUrl ?? null,
            programmeTasks:
              centralDecision.tasks.length > 0
                ? (centralDecision.tasks as unknown as Prisma.InputJsonValue)
                : Prisma.JsonNull,
            centralQuotas: Prisma.JsonNull,
          },
        });
      }

      const now = Date.now();
      const ownAccessExpired = Boolean(
        existing.accessExpiresAt &&
          existing.accessExpiresAt.getTime() <= now &&
          config.groupCreationRules.requirePaidAccess,
      );
      const membershipInactive = ["expired", "inactive", "suspended", "cancelled"].includes(
        (user.membershipStatus ?? "").trim().toLowerCase(),
      );
      const membershipExpired = Boolean(
        user.membershipExpiresAt &&
          user.membershipExpiresAt.getTime() <= now,
      );
      const shouldExpire =
        ownAccessExpired ||
        (!existing.paid &&
          config.groupCreationRules.requirePaidAccess &&
          (membershipInactive || membershipExpired));

      if (shouldExpire && (existing.status !== "Expired" || existing.paid)) {
        return this.prisma.businessPlan.update({
          where: { businessId: business.id },
          data: { status: "Expired", paid: false },
        });
      }

      return existing;
    }

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
   * Mirror a Central Hub grant onto the local BusinessPlan row. The external
   * plan id is kept as the catalogue key; if the same id exists in this app's
   * published plans its name, variant and quotas win.
   */
  private async applyCentralAccess(
    user: User,
    business: Business,
    existing: BusinessPlan | null,
    decision: AccessDecision,
  ): Promise<BusinessPlan> {
    const catalogue = await this.findCataloguePlan(
      decision.planId,
      decision.planName,
    );
    const variant = catalogue
      ? normalizeVariant(catalogue.variant)
      : normalizeVariant(decision.planName);
    const planName =
      catalogue?.name?.trim() ||
      decision.planName?.trim() ||
      "Central Hub Access";
    const expiresAt = toDate(decision.expiresAt);
    const accessDays = expiresAt
      ? Math.max(
          1,
          Math.ceil(
            (expiresAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000),
          ),
        )
      : (existing?.accessDays ?? planAccessDays(variant));

    const data = {
      variant,
      planId: catalogue?.id ?? decision.planId,
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
    } satisfies Prisma.BusinessPlanUpdateInput;

    const plan = await this.prisma.businessPlan.upsert({
      where: { businessId: business.id },
      update: data,
      create: {
        businessId: business.id,
        agreementAccepted: existing?.agreementAccepted ?? false,
        agreedAt: existing?.agreedAt ?? null,
        ...data,
      },
    });

    // Keep Business.tier aligned with the membership tier for reporting and
    // directory filters, without touching a locally purchased plan's name.
    const tier = decision.membershipName?.trim();
    if (tier && tier !== business.tier) {
      await this.prisma.business.update({
        where: { id: business.id },
        data: { tier: normalizeTier(tier) },
      });
      business.tier = normalizeTier(tier);
    }

    return plan;
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
