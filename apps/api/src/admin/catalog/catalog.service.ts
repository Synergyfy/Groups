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
} from "../../admin/admin.mappers.js";
import type {
  AdminListQueryDto,
  CreatePlanDto,
  PlanVariantConfigDto,
  UpdatePlanDto,
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
    const [plans, subscriptions] = await Promise.all([
      this.prisma.plan.findMany({
        orderBy: [{ createdAt: "desc" }, { name: "asc" }, { variant: "asc" }],
      }),
      this.prisma.businessPlan.findMany({
        select: {
          planId: true,
          planName: true,
          variant: true,
          status: true,
          paid: true,
        },
      }),
    ]);
    const counts = this.subscriptionCounts(subscriptions);
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
      .map((plan) => ({
        ...mapPlan(plan),
        subscriberCount:
          counts.byNameVariant.get(`${plan.name}|${plan.variant}`) ?? 0,
      }));
  }

  async getPlanStats() {
    const [totalPlans, activePlans, plans, subscriptions] = await Promise.all([
      this.prisma.plan.count(),
      this.prisma.plan.count({ where: { status: "Active" } }),
      this.prisma.plan.findMany({
        select: { id: true, name: true, variant: true, priceMinor: true },
      }),
      this.prisma.businessPlan.findMany({
        select: {
          planId: true,
          planName: true,
          variant: true,
          status: true,
          paid: true,
        },
      }),
    ]);

    const priceByNameVariant = new Map(
      plans.map((plan) => [
        `${plan.name}|${plan.variant}`,
        plan.priceMinor,
      ]),
    );
    const activeSubscriptions = subscriptions.filter(
      (subscription) =>
        subscription.status === "Active" || subscription.paid,
    );
    const monthlyRecurringMinor = activeSubscriptions.reduce(
      (sum, subscription) =>
        sum +
        (priceByNameVariant.get(
          `${subscription.planName}|${subscription.variant}`,
        ) ?? 0),
      0,
    );

    return {
      totalPlans,
      activePlans,
      totalSubscribers: activeSubscriptions.length,
      monthlyRecurringRunRate: monthlyRecurringMinor / 100,
    };
  }

  private subscriptionCounts(
    subscriptions: Array<{
      planName: string;
      variant: string;
      status: string;
      paid: boolean;
    }>,
  ) {
    const byNameVariant = new Map<string, number>();
    for (const subscription of subscriptions) {
      if (subscription.status !== "Active" && !subscription.paid) continue;
      const key = `${subscription.planName}|${subscription.variant}`;
      byNameVariant.set(key, (byNameVariant.get(key) ?? 0) + 1);
    }
    return { byNameVariant };
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

    // One interactive transaction so the three variants and the audit entry all
    // commit together or roll back together. Each variant is a single upsert on
    // the unique (name, variant) index — a fixed number of statements, never N+1.
    const plans = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.plan.findMany({
        where: { name },
        select: { id: true, variant: true },
      });

      const written = [];
      for (const [variant, config] of configs) {
        const data = {
          name,
          priceMinor: toMinorPence(config.priceMonthly),
          status: config.status ?? "Active",
          groupQuota: config.groupQuota ?? 0,
          circleQuota: config.circleQuota ?? 0,
          revenueSharePercent: config.revenueSharePercent ?? 0,
          features: config.features ?? [],
        };
        written.push(
          await tx.plan.upsert({
            where: { name_variant: { name, variant } },
            create: {
              id: randomUUID(),
              variant,
              ...data,
            },
            update: data,
          }),
        );
      }

      await tx.auditLog.create({
        data: {
          action: "config-updated",
          actorId: actor?.id ?? "system",
          actorName: actor?.name ?? "System",
          targetType: "config",
          targetId: written[0]?.id ?? name,
          targetName: `${name} plans`,
          detail:
            existing.length > 0
              ? "Plan variants configured (Standard, Pro, Pro+)"
              : "Plan variants created (Standard, Pro, Pro+)",
        },
      });

      return written;
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
}
