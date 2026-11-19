import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { randomUUID } from "node:crypto";
import type { SessionUser } from "../../auth/auth.types.js";
import { PrismaService } from "../../prisma/prisma.service.js";
import { toMinorPence } from "../../common/money.js";
import { AdminAuditService } from "../../admin/admin-audit.service.js";
import {
  mapPlan,
  mapRewardDeal,
} from "../../admin/admin.mappers.js";
import type {
  AdminListQueryDto,
  CreatePlanDto,
  CreateRewardDealDto,
  PlanVariantConfigDto,
  UpdatePlanDto,
  UpdateRewardDealDto,
} from "../../admin/dto/admin.dto.js";

type PlanVariant = "Standard" | "Pro" | "Pro+";

@Injectable()
export class AdminCatalogService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AdminAuditService,
  ) {}

  // -------------------------------------------------------------------------
  // Plans
  // -------------------------------------------------------------------------

  async listPlans(query: AdminListQueryDto) {
    const plans = await this.prisma.plan.findMany({
      orderBy: [{ name: "asc" }, { variant: "asc" }],
    });
    const search = query.search?.trim().toLowerCase();

    return plans
      .filter((plan) => {
        if (query.status && query.status !== "all" && plan.status !== query.status) {
          return false;
        }
        if (query.role && query.role !== "all" && plan.name !== query.role) {
          return false;
        }
        if (
          search &&
          !`${plan.name} ${plan.variant}`.toLowerCase().includes(search)
        ) {
          return false;
        }
        return true;
      })
      .map(mapPlan);
  }

  async getPlanStats() {
    const [totalPlans, activePlans, aggregate] = await Promise.all([
      this.prisma.plan.count(),
      this.prisma.plan.count({ where: { status: "Active" } }),
      this.prisma.plan.findMany({
        select: { priceMinor: true, subscriberCount: true },
      }),
    ]);
    return {
      totalPlans,
      activePlans,
      totalSubscribers: aggregate.reduce(
        (sum, plan) => sum + plan.subscriberCount,
        0,
      ),
      monthlyRecurringRunRate: aggregate.reduce(
        (sum, plan) => sum + plan.priceMinor * plan.subscriberCount,
        0,
      ) / 100,
    };
  }

  async createPlans(dto: CreatePlanDto, actor?: SessionUser) {
    const configs: Array<[PlanVariant, PlanVariantConfigDto]> = [
      ["Standard", dto.standard],
      ["Pro", dto.pro],
      ["Pro+", dto.proPlus],
    ];

    if (configs.some(([, config]) => !config)) {
      throw new BadRequestException(
        "A plan must be configured with Standard, Pro and Pro+ variants together.",
      );
    }

    const name = dto.name.trim();
    if (!name) {
      throw new BadRequestException("A plan name is required.");
    }

    const existing = await this.prisma.plan.findMany({
      where: { name },
      select: { id: true, variant: true },
    });

    const plans = await this.prisma.$transaction(
      configs.map(([variant, config]) => {
        const data = {
          name,
          priceMinor: toMinorPence(config.priceMonthly),
          status: config.status ?? "Active",
          groupQuota: config.groupQuota ?? 0,
          circleQuota: config.circleQuota ?? 0,
          revenueSharePercent: config.revenueSharePercent ?? 0,
          features: config.features ?? [],
        };
        return this.prisma.plan.upsert({
          where: { name_variant: { name, variant } },
          create: {
            id: randomUUID(),
            variant,
            ...data,
          },
          update: data,
        });
      }),
    );

    await this.audit.record(actor, {
      action: "config-updated",
      targetType: "config",
      targetId: plans[0]?.id ?? name,
      targetName: `${name} plans`,
      detail:
        existing.length > 0
          ? "Plan variants configured (Standard, Pro, Pro+)"
          : "Plan variants created (Standard, Pro, Pro+)",
    });

    return plans.map(mapPlan);
  }

  async updatePlan(
    id: string,
    dto: UpdatePlanDto,
    actor?: SessionUser,
  ) {
    await this.ensurePlan(id);
    const plan = await this.prisma.plan.update({
      where: { id },
      data: {
        variant: dto.variant,
        name: dto.name,
        priceMinor:
          dto.priceMonthly !== undefined
            ? toMinorPence(dto.priceMonthly)
            : undefined,
        status: dto.status,
        groupQuota: dto.groupQuota,
        circleQuota: dto.circleQuota,
        revenueSharePercent: dto.revenueSharePercent,
        features: dto.features,
        subscriberCount: dto.subscriberCount,
      },
    });

    await this.audit.record(actor, {
      action: "config-updated",
      targetType: "config",
      targetId: plan.id,
      targetName: plan.name,
      detail: "Plan updated",
    });

    return mapPlan(plan);
  }

  async removePlan(id: string, actor?: SessionUser) {
    const plan = await this.ensurePlan(id);
    await this.prisma.plan.delete({ where: { id } });
    await this.audit.record(actor, {
      action: "config-updated",
      targetType: "config",
      targetId: id,
      targetName: plan.name,
      detail: "Plan deleted",
    });
    return { ok: true };
  }

  private async ensurePlan(id: string) {
    const plan = await this.prisma.plan.findUnique({ where: { id } });
    if (!plan) throw new NotFoundException(`Plan ${id} not found`);
    return plan;
  }

  // -------------------------------------------------------------------------
  // Rewards & deals
  // -------------------------------------------------------------------------

  async listRewards(query: AdminListQueryDto) {
    const deals = await this.prisma.rewardDeal.findMany({
      orderBy: { createdAt: "desc" },
    });
    const search = query.search?.trim().toLowerCase();

    return deals
      .filter((deal) => {
        if (query.category && query.category !== "all" && deal.category !== query.category) {
          return false;
        }
        if (query.status && query.status !== "all" && deal.status !== query.status) {
          return false;
        }
        if (search && !deal.title.toLowerCase().includes(search)) return false;
        return true;
      })
      .map(mapRewardDeal);
  }

  async getRewardStats() {
    const [totalDeals, liveOnFrontend, aggregate] = await Promise.all([
      this.prisma.rewardDeal.count(),
      this.prisma.rewardDeal.count({ where: { liveOnFrontend: true } }),
      this.prisma.rewardDeal.aggregate({ _sum: { claimsCount: true } }),
    ]);
    return {
      totalDeals,
      liveOnFrontend,
      totalRedemptions: aggregate._sum.claimsCount ?? 0,
      frontendDelivery: liveOnFrontend > 0 ? "Live" : "Paused",
    };
  }

  async createReward(dto: CreateRewardDealDto, actor?: SessionUser) {
    const deal = await this.prisma.rewardDeal.create({
      data: {
        id: randomUUID(),
        title: dto.title,
        category: dto.category,
        discountValue: dto.discountValue,
        code: dto.code,
        targetAudience: dto.targetAudience,
        liveOnFrontend: dto.liveOnFrontend ?? false,
        status: dto.status ?? "Draft",
        expiryDate: new Date(dto.expiryDate),
        claimsCount: dto.claimsCount ?? 0,
        maxClaims: dto.maxClaims ?? 0,
        sponsorBusiness: dto.sponsorBusiness ?? "Central Solution Admin",
      },
    });

    await this.audit.record(actor, {
      action: "config-updated",
      targetType: "config",
      targetId: deal.id,
      targetName: deal.title,
      detail: "Reward or deal created",
    });

    return mapRewardDeal(deal);
  }

  async updateReward(
    id: string,
    dto: UpdateRewardDealDto,
    actor?: SessionUser,
  ) {
    await this.ensureReward(id);
    const deal = await this.prisma.rewardDeal.update({
      where: { id },
      data: {
        title: dto.title,
        category: dto.category,
        discountValue: dto.discountValue,
        code: dto.code,
        targetAudience: dto.targetAudience,
        liveOnFrontend: dto.liveOnFrontend,
        status: dto.status,
        expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : undefined,
        claimsCount: dto.claimsCount,
        maxClaims: dto.maxClaims,
        sponsorBusiness: dto.sponsorBusiness,
      },
    });

    await this.audit.record(actor, {
      action: "config-updated",
      targetType: "config",
      targetId: deal.id,
      targetName: deal.title,
      detail: "Reward or deal updated",
    });

    return mapRewardDeal(deal);
  }

  async removeReward(id: string, actor?: SessionUser) {
    const deal = await this.ensureReward(id);
    await this.prisma.rewardDeal.delete({ where: { id } });
    await this.audit.record(actor, {
      action: "config-updated",
      targetType: "config",
      targetId: id,
      targetName: deal.title,
      detail: "Reward or deal deleted",
    });
    return { ok: true };
  }

  private async ensureReward(id: string) {
    const deal = await this.prisma.rewardDeal.findUnique({ where: { id } });
    if (!deal) throw new NotFoundException(`Reward deal ${id} not found`);
    return deal;
  }
}
