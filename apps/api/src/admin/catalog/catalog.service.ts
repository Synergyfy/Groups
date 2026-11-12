import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { randomUUID } from "node:crypto";
import type { SessionUser } from "../../auth/auth.types.js";
import { PrismaService } from "../../prisma/prisma.service.js";
import { AdminAuditService } from "../../admin/admin-audit.service.js";
import {
  mapMembershipPlan,
  mapRewardDeal,
} from "../../admin/admin.mappers.js";
import type {
  AdminListQueryDto,
  CreateMembershipPlanDto,
  CreateRewardDealDto,
  UpdateMembershipPlanDto,
  UpdateRewardDealDto,
} from "../../admin/dto/admin.dto.js";

@Injectable()
export class AdminCatalogService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AdminAuditService,
  ) {}

  // -------------------------------------------------------------------------
  // Membership plans
  // -------------------------------------------------------------------------

  async listPlans(query: AdminListQueryDto) {
    const plans = await this.prisma.membershipPlan.findMany({
      orderBy: [{ tier: "asc" }, { variant: "asc" }],
    });
    const search = query.search?.trim().toLowerCase();

    return plans
      .filter((plan) => {
        if (query.status && query.status !== "all" && plan.status !== query.status) {
          return false;
        }
        if (query.role && query.role !== "all" && plan.tier !== query.role) {
          return false;
        }
        if (search && !plan.name.toLowerCase().includes(search)) return false;
        return true;
      })
      .map(mapMembershipPlan);
  }

  async getPlanStats() {
    const plans = await this.prisma.membershipPlan.findMany();
    return {
      totalPlans: plans.length,
      activePlans: plans.filter((plan) => plan.status === "Active").length,
      totalSubscribers: plans.reduce(
        (sum, plan) => sum + plan.subscriberCount,
        0,
      ),
      monthlyRecurringRunRate: plans.reduce(
        (sum, plan) => sum + plan.priceMonthly * plan.subscriberCount,
        0,
      ),
    };
  }

  async createPlan(dto: CreateMembershipPlanDto, actor?: SessionUser) {
    const existing = await this.prisma.membershipPlan.findUnique({
      where: { tier_variant: { tier: dto.tier, variant: dto.variant } },
    });
    if (existing) {
      throw new ConflictException(
        `A ${dto.tier} ${dto.variant} plan already exists`,
      );
    }

    const plan = await this.prisma.membershipPlan.create({
      data: {
        id: randomUUID(),
        tier: dto.tier,
        variant: dto.variant,
        name: dto.name,
        priceMonthly: dto.priceMonthly ?? 0,
        billingFrequency: dto.billingFrequency ?? "Monthly",
        status: dto.status ?? "Active",
        groupQuota: dto.groupQuota ?? 0,
        circleQuota: dto.circleQuota ?? 0,
        revenueSharePercent: dto.revenueSharePercent ?? 0,
        features: dto.features ?? [],
        subscriberCount: dto.subscriberCount ?? 0,
      },
    });

    await this.audit.record(actor, {
      action: "config-updated",
      targetType: "config",
      targetId: plan.id,
      targetName: plan.name,
      detail: "Membership plan created",
    });

    return mapMembershipPlan(plan);
  }

  async updatePlan(
    id: string,
    dto: UpdateMembershipPlanDto,
    actor?: SessionUser,
  ) {
    await this.ensurePlan(id);
    const plan = await this.prisma.membershipPlan.update({
      where: { id },
      data: {
        tier: dto.tier,
        variant: dto.variant,
        name: dto.name,
        priceMonthly: dto.priceMonthly,
        billingFrequency: dto.billingFrequency,
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
      detail: "Membership plan updated",
    });

    return mapMembershipPlan(plan);
  }

  async removePlan(id: string, actor?: SessionUser) {
    const plan = await this.ensurePlan(id);
    await this.prisma.membershipPlan.delete({ where: { id } });
    await this.audit.record(actor, {
      action: "config-updated",
      targetType: "config",
      targetId: id,
      targetName: plan.name,
      detail: "Membership plan deleted",
    });
    return { ok: true };
  }

  private async ensurePlan(id: string) {
    const plan = await this.prisma.membershipPlan.findUnique({ where: { id } });
    if (!plan) throw new NotFoundException(`Membership plan ${id} not found`);
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
    const deals = await this.prisma.rewardDeal.findMany();
    return {
      totalDeals: deals.length,
      liveOnFrontend: deals.filter((deal) => deal.liveOnFrontend).length,
      totalRedemptions: deals.reduce((sum, deal) => sum + deal.claimsCount, 0),
      frontendDelivery: deals.some((deal) => deal.liveOnFrontend)
        ? "Live"
        : "Paused",
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
