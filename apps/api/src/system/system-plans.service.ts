import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { fromMinorPence, toMinorPence } from "../common/money.js";
import type { Plan } from "../generated/prisma/client.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { planAccessDays } from "../business/business.rules.js";
import type {
  CreateSystemPlanDto,
  ExternalPlanVariantDto,
  UpdateSystemPlanDto,
} from "./dto/system-plan.dto.js";

const TIERS = ["Standard", "Pro", "Pro+"] as const;
type Tier = (typeof TIERS)[number];

const TIER_API: Record<Tier, string> = {
  Standard: "STANDARD",
  Pro: "PRO",
  "Pro+": "PRO_PLUS",
};

const TIER_ORDER: Record<Tier, number> = {
  Standard: 0,
  Pro: 1,
  "Pro+": 2,
};

/** The app treats quotas at or above this value as unlimited. */
const UNLIMITED_QUOTA = 999;

interface VariantInput {
  price?: number;
  features?: string[];
  quotas?: Record<string, unknown>;
  isActive?: boolean;
}

export interface ExternalPlanVariantView {
  id: string;
  tier: string;
  tierLevel: {
    name: string;
    durationDays: number;
    isCalendarYear: boolean;
  };
  price: number;
  features: string[];
  configuration: {
    quotas: Record<string, number>;
    featureFlags: Record<string, boolean>;
  };
  isActive: boolean;
}

export interface ExternalPlanView {
  id: string;
  name: string;
  slug: string;
  monthlyPrice: number;
  quarterlyPrice: number;
  annualPrice: number;
  features: string[];
  quotas: Record<string, number>;
  configuration: {
    quotas: Record<string, number>;
    featureFlags: Record<string, boolean>;
  };
  tierPrices: Record<string, number>;
  tierFeatures: Record<string, string[]>;
  tierDurations: Record<string, number>;
  variants: ExternalPlanVariantView[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Billing connector used by MCOM Solutions Central to manage this app's
 * subscription plans. The local `Plan` catalogue is the source of truth: each
 * plan family (name) is exposed as one external plan with Standard/Pro/Pro+
 * variants, so plans created in Central are immediately available here.
 */
@Injectable()
export class SystemPlansService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<ExternalPlanView[]> {
    const plans = await this.prisma.plan.findMany({
      orderBy: [{ name: "asc" }, { variant: "asc" }],
    });

    const families = new Map<string, Plan[]>();
    for (const plan of plans) {
      const family = families.get(plan.name) ?? [];
      family.push(plan);
      families.set(plan.name, family);
    }

    return [...families.values()]
      .filter((family) => family.some((plan) => plan.status !== "Closed"))
      .map((family) => this.toExternalPlan(family));
  }

  async findOne(id: string): Promise<ExternalPlanView> {
    const plan = await this.prisma.plan.findUnique({ where: { id } });
    if (!plan) {
      throw new NotFoundException(`Plan ${id} not found`);
    }

    const family = await this.familyFor(plan.name);
    if (family.every((entry) => entry.status === "Closed")) {
      throw new NotFoundException(`Plan ${id} not found`);
    }
    return this.toExternalPlan(family);
  }

  async create(dto: CreateSystemPlanDto): Promise<ExternalPlanView> {
    const name = dto.name?.trim();
    if (!name) {
      throw new BadRequestException("A plan name is required.");
    }

    const existing = await this.prisma.plan.findFirst({
      where: { name: { equals: name, mode: "insensitive" } },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException(`A plan named "${name}" already exists.`);
    }

    const inputs = this.variantInputsFromDto(dto, null);
    const standardId = this.standardIdFor(dto);
    const idTaken = await this.prisma.plan.findUnique({
      where: { id: standardId },
      select: { id: true },
    });
    if (idTaken) {
      throw new ConflictException(`Plan ${standardId} already exists.`);
    }

    const rows = await this.prisma
      .$transaction(
        TIERS.map((tier) => {
          const input = inputs[tier];
          const quotas = this.quotasFor(input.quotas) ?? {
            groups: 0,
            circles: 0,
          };
          return this.prisma.plan.create({
            data: {
              id: tier === "Standard" ? standardId : randomUUID(),
              name,
              variant: tier,
              priceMinor: toMinorPence(input.price ?? 0),
              status: this.statusFor(input.isActive),
              groupQuota: quotas.groups,
              circleQuota: quotas.circles,
              revenueSharePercent: 0,
              features: input.features ?? [],
            },
          });
        }),
      )
      .catch((error: unknown) => {
        if (isUniqueViolation(error)) {
          throw new ConflictException(`A plan named "${name}" already exists.`);
        }
        throw error;
      });

    await this.audit(standardId, name, `Plan created via MCOM Central`);
    return this.toExternalPlan(rows);
  }

  async update(id: string, dto: UpdateSystemPlanDto): Promise<ExternalPlanView> {
    const target = await this.prisma.plan.findUnique({ where: { id } });
    if (!target) {
      throw new NotFoundException(`Plan ${id} not found`);
    }

    const family = await this.familyFor(target.name);
    if (family.every((plan) => plan.status === "Closed")) {
      throw new NotFoundException(`Plan ${id} not found`);
    }

    const name = dto.name?.trim() || target.name;
    if (name !== target.name) {
      const conflict = await this.prisma.plan.findFirst({
        where: {
          name: { equals: name, mode: "insensitive" },
          NOT: { name: target.name },
        },
        select: { id: true },
      });
      if (conflict) {
        throw new ConflictException(`A plan named "${name}" already exists.`);
      }
    }

    const inputs = this.variantInputsFromDto(dto, family);
    const rows = await this.prisma
      .$transaction(
        TIERS.map((tier) => {
          const existing = family.find(
            (plan) => normalizeTier(plan.variant) === tier,
          );
          const input = inputs[tier];
          const quotas = this.quotasFor(input.quotas);
          const data = {
            name,
            priceMinor:
              input.price !== undefined
                ? toMinorPence(input.price)
                : existing?.priceMinor ?? 0,
            status: this.statusFor(input.isActive, existing?.status),
            groupQuota: quotas?.groups ?? existing?.groupQuota ?? 0,
            circleQuota: quotas?.circles ?? existing?.circleQuota ?? 0,
            features: input.features ?? existing?.features ?? [],
          };

          if (existing) {
            return this.prisma.plan.update({
              where: { id: existing.id },
              data,
            });
          }
          return this.prisma.plan.create({
            data: {
              ...data,
              id: randomUUID(),
              variant: tier,
            },
          });
        }),
      )
      .catch((error: unknown) => {
        if (isUniqueViolation(error)) {
          throw new ConflictException(`A plan named "${name}" already exists.`);
        }
        throw error;
      });

    const standard = rows.find((plan) => plan.variant === "Standard") ?? rows[0];
    await this.audit(standard.id, name, "Plan updated via MCOM Central");
    return this.toExternalPlan(rows);
  }

  async remove(id: string): Promise<void> {
    const target = await this.prisma.plan.findUnique({ where: { id } });
    if (!target) {
      throw new NotFoundException(`Plan ${id} not found`);
    }

    const family = await this.familyFor(target.name);
    if (family.every((plan) => plan.status === "Closed")) {
      throw new NotFoundException(`Plan ${id} not found`);
    }

    // Archive rather than delete: business plans and group eligibility rules
    // may still reference the variant ids.
    await this.prisma.plan.updateMany({
      where: { name: target.name },
      data: { status: "Closed" },
    });
    await this.audit(target.id, target.name, "Plan archived via MCOM Central");
  }

  private async familyFor(name: string): Promise<Plan[]> {
    return this.prisma.plan.findMany({
      where: { name },
      orderBy: { variant: "asc" },
    });
  }

  /**
   * Normalises the flat price fields and the 3-variant matrix into one input
   * per local variant. Central always sends `variants`, but the documented
   * flat contract still works.
   */
  private variantInputsFromDto(
    dto: CreateSystemPlanDto | UpdateSystemPlanDto,
    existing: Plan[] | null,
  ): Record<Tier, VariantInput> {
    const provided = new Map<Tier, ExternalPlanVariantDto>();
    for (const variant of dto.variants ?? []) {
      const tier = normalizeTier(variant.tier);
      if (!tier) {
        throw new BadRequestException(
          `Unknown plan tier "${variant.tier}". Use Standard, Pro or Pro+.`,
        );
      }
      provided.set(tier, variant);
    }

    const globalQuotas =
      configurationQuotas(dto.configuration) ?? dto.quotas ?? undefined;

    return Object.fromEntries(
      TIERS.map((tier) => {
        const current = existing?.find(
          (plan) => normalizeTier(plan.variant) === tier,
        );
        const variant = provided.get(tier);
        const flatPrice =
          tier === "Standard"
            ? dto.monthlyPrice ?? dto.quarterlyPrice ?? dto.annualPrice
            : tier === "Pro"
              ? dto.quarterlyPrice ?? dto.monthlyPrice ?? dto.annualPrice
              : dto.annualPrice ?? dto.quarterlyPrice ?? dto.monthlyPrice;

        return [
          tier,
          {
            price:
              variant?.price ??
              flatPrice ??
              (current ? fromMinorPence(current.priceMinor) : undefined),
            features: variant?.features ?? dto.features ?? current?.features,
            quotas:
              configurationQuotas(variant?.configuration) ??
              globalQuotas ??
              undefined,
            isActive: variant?.isActive ?? dto.isActive,
          } satisfies VariantInput,
        ];
      }),
    ) as Record<Tier, VariantInput>;
  }

  private standardIdFor(dto: CreateSystemPlanDto): string {
    const candidate = (dto.planId ?? dto.slug)?.trim();
    if (!candidate) return randomUUID();
    const sanitized = candidate
      .replace(/[^a-zA-Z0-9._-]+/g, "-")
      .replace(/^-+|-+$/g, "");
    return sanitized || randomUUID();
  }

  private statusFor(active?: boolean, fallback?: string): string {
    if (active === true) return "Active";
    if (active === false) return "Draft";
    return fallback ?? "Active";
  }

  private quotasFor(
    quotas: Record<string, unknown> | undefined,
  ): { groups: number; circles: number } | null {
    if (!quotas) return null;
    const groups = quotaNumber(quotas, [
      "maxGroups",
      "groups",
      "groupQuota",
      "groupQuotaLimit",
    ]);
    const circles = quotaNumber(quotas, [
      "maxCircles",
      "circles",
      "circleQuota",
      "circleQuotaLimit",
    ]);
    return {
      groups: groups ?? 0,
      circles: circles ?? 0,
    };
  }

  private quotasView(plan: Plan): Record<string, number> {
    return {
      maxGroups:
        plan.groupQuota >= UNLIMITED_QUOTA ? -1 : plan.groupQuota,
      maxCircles:
        plan.circleQuota >= UNLIMITED_QUOTA ? -1 : plan.circleQuota,
    };
  }

  private toExternalPlan(plans: Plan[]): ExternalPlanView {
    const sorted = [...plans].sort((a, b) => {
      const aTier = normalizeTier(a.variant) ?? "Standard";
      const bTier = normalizeTier(b.variant) ?? "Standard";
      return TIER_ORDER[aTier] - TIER_ORDER[bTier];
    });
    const standard =
      sorted.find((plan) => normalizeTier(plan.variant) === "Standard") ??
      sorted[0];
    const byTier = new Map(
      sorted.map((plan) => [
        normalizeTier(plan.variant) ?? "Standard",
        plan,
      ]),
    );
    const pro = byTier.get("Pro");
    const proPlus = byTier.get("Pro+");
    const standardQuotas = this.quotasView(standard);
    const createdAt = Math.min(
      ...sorted.map((plan) => plan.createdAt.getTime()),
    );
    const updatedAt = Math.max(
      ...sorted.map((plan) => plan.updatedAt.getTime()),
    );
    const tierPrices: Record<string, number> = {};
    const tierFeatures: Record<string, string[]> = {};
    const tierDurations: Record<string, number> = {};
    for (const plan of sorted) {
      const tier = normalizeTier(plan.variant) ?? "Standard";
      tierPrices[tier] = fromMinorPence(plan.priceMinor);
      tierFeatures[tier] = plan.features;
      tierDurations[tier] = planAccessDays(tier);
    }

    return {
      id: standard.id,
      name: standard.name,
      slug: slugify(standard.name),
      monthlyPrice: fromMinorPence(standard.priceMinor),
      quarterlyPrice: fromMinorPence(
        (pro ?? standard).priceMinor,
      ),
      annualPrice: fromMinorPence(
        (proPlus ?? pro ?? standard).priceMinor,
      ),
      features: standard.features,
      quotas: standardQuotas,
      configuration: {
        quotas: standardQuotas,
        featureFlags: {},
      },
      tierPrices,
      tierFeatures,
      tierDurations,
      variants: sorted.map((plan) => {
        const tier = normalizeTier(plan.variant) ?? "Standard";
        return {
          id: plan.id,
          tier: TIER_API[tier],
          tierLevel: {
            name: tier,
            durationDays: planAccessDays(tier),
            isCalendarYear: tier === "Pro+",
          },
          price: fromMinorPence(plan.priceMinor),
          features: plan.features,
          configuration: {
            quotas: this.quotasView(plan),
            featureFlags: {},
          },
          isActive: plan.status === "Active",
        };
      }),
      isActive: sorted.some((plan) => plan.status === "Active"),
      createdAt: new Date(createdAt).toISOString(),
      updatedAt: new Date(updatedAt).toISOString(),
    };
  }

  private async audit(
    id: string,
    name: string,
    detail: string,
  ): Promise<void> {
    await this.prisma.auditLog
      .create({
        data: {
          action: "config-updated",
          actorId: "mcom-central",
          actorName: "MCOM Central",
          targetType: "config",
          targetId: id,
          targetName: name,
          detail,
        },
      })
      .catch(() => undefined);
  }
}

function normalizeTier(value: string | null | undefined): Tier | null {
  const normalized = (value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
  if (normalized === "standard") return "Standard";
  if (normalized === "pro") return "Pro";
  if (
    normalized === "pro+" ||
    normalized === "pro plus" ||
    normalized === "proplus"
  ) {
    return "Pro+";
  }
  return null;
}

function configurationQuotas(
  configuration: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined {
  if (!configuration) return undefined;
  const quotas = configuration.quotas;
  if (!quotas || typeof quotas !== "object" || Array.isArray(quotas)) {
    return undefined;
  }
  return quotas as Record<string, unknown>;
}

function quotaNumber(
  quotas: Record<string, unknown>,
  keys: string[],
): number | null {
  for (const key of keys) {
    const raw = quotas[key];
    if (raw === undefined || raw === null || raw === "") continue;
    const numeric = Number(raw);
    if (!Number.isFinite(numeric)) continue;
    if (numeric < 0) return UNLIMITED_QUOTA;
    return Math.max(0, Math.round(numeric));
  }
  return null;
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "P2002"
  );
}

function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "plan"
  );
}
