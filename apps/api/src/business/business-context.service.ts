import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { randomUUID } from "node:crypto";
import type { Business, User } from "../generated/prisma/client.js";
import { jsonObject } from "../admin/admin.mappers.js";
import type { SessionUser } from "../auth/auth.types.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { toMinorPence } from "../common/money.js";
import { toBusinessConfig, normalizeTier, normalizeVariant, planAccessDays } from "./business.rules.js";
import type { BusinessContext, BusinessConfig } from "./business.types.js";

function firstNonEmpty(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  return null;
}

@Injectable()
export class BusinessContextService {
  constructor(private readonly prisma: PrismaService) {}

  async resolve(session: SessionUser): Promise<BusinessContext> {
    const user = await this.prisma.user.findUnique({
      where: { id: session.id },
    });
    if (!user) throw new NotFoundException("User account not found");
    if (user.role !== "BUSINESS") {
      throw new ForbiddenException("Business account required");
    }

    const config = await this.getConfig();
    const business = await this.findOrCreateBusiness(user);
    const plan = await this.findOrCreatePlan(
      user,
      business,
      config,
    );

    return { user, business, plan, config };
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
  ) {
    const existing = await this.prisma.businessPlan.findUnique({
      where: { businessId: business.id },
    });
    if (existing) return existing;

    const planName =
      (user.membershipTier ?? business.tier).trim() || "Free";
    const variant = normalizeVariant(user.membershipPlanName);
    const active = user.membershipStatus?.toLowerCase() === "active";
    const status = active ? "Active" : "Pending";
    const accessDays = planAccessDays(variant);
    const matchingPlan = await this.prisma.plan.findFirst({
      where: { name: planName, variant, status: "Active" },
      select: { priceMinor: true },
    });
    const accessFeeMinor =
      matchingPlan?.priceMinor ??
      toMinorPence(config.groupCreationRules.entryAccessFee);

    try {
      return await this.prisma.businessPlan.create({
        data: {
          businessId: business.id,
          variant,
          planName,
          status,
          paid: active,
          accessDays,
          accessFeeMinor,
          agreementAccepted: false,
          accessExpiresAt: active
            ? new Date(Date.now() + accessDays * 24 * 60 * 60 * 1000)
            : null,
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
}
