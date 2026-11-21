import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service.js";

type PlanVariant = "Standard" | "Pro" | "Pro+";
type AnyRecord = Record<string, any>;

type PlanRow = {
  id: string;
  name: string;
  variant: string;
  priceMinor: number;
  status: string;
  groupQuota: number;
  circleQuota: number;
  revenueSharePercent: number;
  features: string[];
};

const VARIANT_ORDER: PlanVariant[] = ["Standard", "Pro", "Pro+"];
const VARIANT_DAYS: Record<PlanVariant, number> = {
  Standard: 90,
  Pro: 180,
  "Pro+": 365,
};
const TIER_ORDER = ["Bronze", "Silver", "Gold", "Platinum"];
const TIER_DESCRIPTIONS: Record<string, string> = {
  Bronze: "Entry-level access for local brands and new startups.",
  Silver: "Advanced tools for growing teams.",
  Gold: "Scale operations with priority access.",
  Platinum: "Tailored solutions for market leaders.",
};
const UNLIMITED = 999;

function numberOr(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toPriceMinor(value: unknown): number {
  return Math.max(0, Math.round(numberOr(value, 0) * 100));
}

function toQuota(value: unknown): number {
  if (value === -1 || value === "-1" || value === "unlimited") return UNLIMITED;
  return Math.max(0, Math.floor(numberOr(value, 0)));
}

function toPercent(value: unknown): number {
  return Math.min(100, Math.max(0, Math.floor(numberOr(value, 0))));
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function variantSlug(variant: PlanVariant): string {
  return variant === "Pro+" ? "pro-plus" : variant.toLowerCase();
}

function normalizeVariant(value: unknown): PlanVariant | null {
  const raw = String(value ?? "").trim();
  const normalized = raw.toUpperCase().replace(/[\s_-]+/g, "_");
  if (normalized === "STANDARD") return "Standard";
  if (normalized === "PRO") return "Pro";
  if (normalized === "PRO_PLUS" || normalized === "PRO+" || raw === "Pro+") {
    return "Pro+";
  }
  return null;
}

@Injectable()
export class SystemPlansService {
  constructor(private readonly prisma: PrismaService) {}

  private async familyRows(id: string): Promise<PlanRow[]> {
    const row = await this.prisma.plan.findUnique({ where: { id } });
    if (!row) throw new NotFoundException(`Plan "${id}" was not found.`);
    return this.prisma.plan.findMany({
      where: { name: row.name },
      orderBy: { variant: "asc" },
    });
  }

  private sortRows(rows: PlanRow[]): PlanRow[] {
    return [...rows].sort(
      (a, b) =>
        VARIANT_ORDER.indexOf(a.variant as PlanVariant) -
        VARIANT_ORDER.indexOf(b.variant as PlanVariant),
    );
  }

  private mapFamily(rows: PlanRow[]) {
    const sorted = this.sortRows(rows);
    const byVariant = new Map(
      sorted.map((row) => [row.variant as PlanVariant, row]),
    );
    const standard = byVariant.get("Standard") ?? sorted[0];

    const variants = sorted.map((row) => {
      const variant = row.variant as PlanVariant;
      return {
        id: row.id,
        tier: variant,
        tierLevel: { name: variant, durationDays: VARIANT_DAYS[variant] ?? 90 },
        price: row.priceMinor / 100,
        features: row.features,
        configuration: {
          quotas: {
            groupQuota: row.groupQuota >= UNLIMITED ? -1 : row.groupQuota,
            circleQuota: row.circleQuota >= UNLIMITED ? -1 : row.circleQuota,
            revenueSharePercent: row.revenueSharePercent,
          },
          featureFlags: {},
        },
        isActive: row.status === "Active",
      };
    });

    const tierPrices: Record<string, number> = {};
    const tierFeatures: Record<string, string[]> = {};
    for (const row of sorted) {
      const variant = row.variant as PlanVariant;
      tierPrices[variant] = row.priceMinor / 100;
      tierFeatures[variant] = row.features;
    }

    return {
      id: standard.id,
      name: standard.name,
      slug: slugify(standard.name),
      description: TIER_DESCRIPTIONS[standard.name] ?? null,
      variants,
      tierPrices,
      tierFeatures,
      tierDurations: VARIANT_DAYS,
      monthlyPrice: tierPrices.Standard ?? 0,
      quarterlyPrice: tierPrices.Pro ?? 0,
      annualPrice: tierPrices["Pro+"] ?? 0,
      features: tierFeatures.Standard ?? [],
      configuration: variants[0]?.configuration ?? { quotas: {}, featureFlags: {} },
      isActive: sorted.some((row) => row.status === "Active"),
      isDefault: false,
      type: "STANDARD",
    };
  }

  async listPlans() {
    const rows = await this.prisma.plan.findMany({
      orderBy: [{ name: "asc" }, { variant: "asc" }],
    });
    const grouped = new Map<string, PlanRow[]>();
    for (const row of rows) {
      const list = grouped.get(row.name) ?? [];
      list.push(row);
      grouped.set(row.name, list);
    }
    return [...grouped.values()]
      .map((family) => this.mapFamily(family))
      .sort((a, b) => {
        const ai = TIER_ORDER.indexOf(a.name);
        const bi = TIER_ORDER.indexOf(b.name);
        if (ai !== -1 || bi !== -1) return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
        return a.name.localeCompare(b.name);
      });
  }

  async getPlan(id: string) {
    return this.mapFamily(await this.familyRows(id));
  }

  async getSchema() {
    return {
      quotas: [
        {
          key: "groupQuota",
          label: "Group quota",
          type: "number" as const,
          unlimited: true,
        },
        {
          key: "circleQuota",
          label: "Circle quota",
          type: "number" as const,
          unlimited: true,
        },
        {
          key: "revenueSharePercent",
          label: "Revenue share (%)",
          type: "number" as const,
        },
      ],
      featureFlags: [],
    };
  }

  private variantConfig(
    input: AnyRecord,
    variant: PlanVariant,
  ): { price?: unknown; features?: unknown; quotas: AnyRecord; isActive?: unknown } {
    const variantEntry = Array.isArray(input.variants)
      ? input.variants.find(
          (entry: AnyRecord) => normalizeVariant(entry?.tier) === variant,
        )
      : undefined;

    const quotas =
      variantEntry?.configuration?.quotas ??
      input.configuration?.quotas ??
      {};

    return {
      price:
        variantEntry?.price ??
        (variant === "Standard"
          ? input.monthlyPrice
          : variant === "Pro"
            ? input.quarterlyPrice
            : input.annualPrice),
      features:
        variantEntry?.features ??
        input.tierFeatures?.[variant] ??
        (variant === "Standard" ? input.features : undefined),
      quotas,
      isActive: variantEntry?.isActive ?? input.isActive,
    };
  }

  private planData(
    input: AnyRecord,
    variant: PlanVariant,
    existing?: PlanRow,
  ) {
    const config = this.variantConfig(input, variant);
    const hasVariantEntry =
      Array.isArray(input.variants) &&
      input.variants.some(
        (entry: AnyRecord) => normalizeVariant(entry?.tier) === variant,
      );
    const hasTopLevel =
      input.monthlyPrice !== undefined ||
      input.quarterlyPrice !== undefined ||
      input.annualPrice !== undefined ||
      input.features !== undefined ||
      input.configuration !== undefined ||
      input.isActive !== undefined;

    if (existing && !hasVariantEntry && !hasTopLevel) {
      return {
        priceMinor: existing.priceMinor,
        groupQuota: existing.groupQuota,
        circleQuota: existing.circleQuota,
        revenueSharePercent: existing.revenueSharePercent,
        features: existing.features,
        status: existing.status,
      };
    }

    const quotas = config.quotas ?? {};
    return {
      priceMinor:
        config.price !== undefined
          ? toPriceMinor(config.price)
          : (existing?.priceMinor ?? 0),
      groupQuota:
        quotas.groupQuota !== undefined
          ? toQuota(quotas.groupQuota)
          : (existing?.groupQuota ?? 0),
      circleQuota:
        quotas.circleQuota !== undefined
          ? toQuota(quotas.circleQuota)
          : (existing?.circleQuota ?? 0),
      revenueSharePercent:
        quotas.revenueSharePercent !== undefined
          ? toPercent(quotas.revenueSharePercent)
          : (existing?.revenueSharePercent ?? 0),
      features:
        Array.isArray(config.features)
          ? config.features.map(String)
          : (existing?.features ?? []),
      status:
        config.isActive !== undefined
          ? config.isActive
            ? "Active"
            : "Draft"
          : (existing?.status ?? "Active"),
    };
  }

  async createPlan(input: AnyRecord) {
    const name = String(input?.name ?? "").trim();
    if (!name) throw new BadRequestException("A plan name is required.");

    const rows: PlanRow[] = [];
    for (const variant of VARIANT_ORDER) {
      const data = this.planData(input, variant);
      const existing = await this.prisma.plan.findUnique({
        where: { name_variant: { name, variant } },
      });
      const row = await this.prisma.plan.upsert({
        where: { name_variant: { name, variant } },
        create: {
          id: `plan-${slugify(name)}-${variantSlug(variant)}`,
          name,
          variant,
          subscriberCount: 0,
          ...data,
        },
        update: data,
      });
      rows.push(row);
    }
    return this.mapFamily(rows);
  }

  async updatePlan(id: string, input: AnyRecord) {
    const family = await this.familyRows(id);
    const oldName = family[0]?.name;
    const newName = String(input?.name ?? oldName).trim() || oldName;
    if (!oldName) throw new NotFoundException(`Plan "${id}" was not found.`);

    if (newName !== oldName) {
      await this.prisma.plan.updateMany({
        where: { name: oldName },
        data: { name: newName },
      });
    }

    for (const variant of VARIANT_ORDER) {
      const existing = family.find((row) => row.variant === variant);
      const hasData =
        (Array.isArray(input.variants) &&
          input.variants.some(
            (entry: AnyRecord) => normalizeVariant(entry?.tier) === variant,
          )) ||
        input.monthlyPrice !== undefined ||
        input.quarterlyPrice !== undefined ||
        input.annualPrice !== undefined ||
        input.features !== undefined ||
        input.configuration !== undefined ||
        input.isActive !== undefined ||
        newName !== oldName;

      if (!existing && !hasData) continue;
      if (!existing) {
        await this.prisma.plan.create({
          data: {
            id: `plan-${slugify(newName)}-${variantSlug(variant)}`,
            name: newName,
            variant,
            subscriberCount: 0,
            ...this.planData(input, variant),
          },
        });
        continue;
      }

      await this.prisma.plan.update({
        where: { id: existing.id },
        data: {
          name: newName,
          ...this.planData(input, variant, existing),
        },
      });
    }

    return this.mapFamily(await this.familyRows(id));
  }

  async deletePlan(id: string) {
    const family = await this.familyRows(id);
    const ids = family.map((row) => row.id);
    const [subscriptions, requiredByGroups] = await Promise.all([
      this.prisma.businessPlan.count({ where: { planId: { in: ids } } }),
      this.prisma.group.count({
        where: { requiredPlanIds: { hasSome: ids } },
      }),
    ]);

    if (subscriptions > 0 || requiredByGroups > 0) {
      await this.prisma.plan.updateMany({
        where: { name: family[0].name },
        data: { status: "Closed" },
      });
      return { deleted: false, archived: true };
    }

    await this.prisma.plan.deleteMany({ where: { name: family[0].name } });
    return { deleted: true, archived: false };
  }

  async listAccessPassPlans() {
    const rows = await this.prisma.plan.findMany({
      where: { status: "Active" },
      orderBy: [{ name: "asc" }, { variant: "asc" }],
    });

    return rows.map((row) => {
      const variant = row.variant as PlanVariant;
      const price = row.priceMinor / 100;
      return {
        id: row.id,
        name: `${row.name} ${row.variant}`,
        slug: `${slugify(row.name)}-${variantSlug(variant)}`,
        description: `Access to ${row.name} ${row.variant} features for ${
          VARIANT_DAYS[variant] ?? 90
        } days.`,
        price,
        currency: "GBP",
        durationDays: VARIANT_DAYS[variant] ?? 90,
        features: row.features,
        configuration: {
          quotas: {
            groupQuota: row.groupQuota >= UNLIMITED ? -1 : row.groupQuota,
            circleQuota: row.circleQuota >= UNLIMITED ? -1 : row.circleQuota,
            revenueSharePercent: row.revenueSharePercent,
          },
        },
        isActive: true,
        purchaseEnabled: price > 0,
        codeRedemptionEnabled: true,
      };
    });
  }
}
