import { config } from "dotenv";
import { resolve } from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.js";

config({
  path: [
    resolve(import.meta.dirname, "../../../.env"),
    resolve(import.meta.dirname, "../.env"),
  ],
});

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DATABASE_URL,
  }),
});

type SeedPlan = {
  id: string;
  name: string;
  variant: string;
  priceMinor: number;
  groupQuota: number;
  circleQuota: number;
  revenueSharePercent: number;
  features: string[];
};

/**
 * Canonical twelve published plans — four tiers (Bronze, Silver, Gold,
 * Platinum), each with Standard, Pro and Pro+ variants.
 */
const PLANS: SeedPlan[] = [
  {
    id: "plan-bronze-std",
    name: "Bronze",
    variant: "Standard",
    priceMinor: 0,
    groupQuota: 3,
    circleQuota: 2,
    revenueSharePercent: 0,
    features: [
      "Up to 3 business groups",
      "Up to 2 circles",
      "Join unlimited consumer & partner groups",
      "Basic business directory listing",
    ],
  },
  {
    id: "plan-bronze-pro",
    name: "Bronze",
    variant: "Pro",
    priceMinor: 1900,
    groupQuota: 5,
    circleQuota: 4,
    revenueSharePercent: 0,
    features: [
      "Up to 5 business groups",
      "Up to 4 circles",
      "Highlighted directory placement",
      "Extended 14-day temporary access periods",
    ],
  },
  {
    id: "plan-bronze-pro-plus",
    name: "Bronze",
    variant: "Pro+",
    priceMinor: 3900,
    groupQuota: 8,
    circleQuota: 6,
    revenueSharePercent: 2,
    features: [
      "Up to 8 business groups",
      "Up to 6 circles",
      "2% platform revenue share",
      "Group analytics & engagement reports",
    ],
  },
  {
    id: "plan-silver-std",
    name: "Silver",
    variant: "Standard",
    priceMinor: 2900,
    groupQuota: 10,
    circleQuota: 6,
    revenueSharePercent: 5,
    features: [
      "Up to 10 business groups",
      "Up to 6 circles",
      "5% platform revenue share",
      "Access to promotional campaigns",
      "Priority group moderation",
    ],
  },
  {
    id: "plan-silver-pro",
    name: "Silver",
    variant: "Pro",
    priceMinor: 5900,
    groupQuota: 15,
    circleQuota: 10,
    revenueSharePercent: 7,
    features: [
      "Up to 15 business groups",
      "Up to 10 circles",
      "7% platform revenue share",
      "Campaign syndication tools",
      "Direct member contact intake",
    ],
  },
  {
    id: "plan-silver-pro-plus",
    name: "Silver",
    variant: "Pro+",
    priceMinor: 8900,
    groupQuota: 20,
    circleQuota: 12,
    revenueSharePercent: 8,
    features: [
      "Up to 20 business groups",
      "Up to 12 circles",
      "8% platform revenue share",
      "Custom branding & badge on groups",
      "Priority telephone & email support",
    ],
  },
  {
    id: "plan-gold-std",
    name: "Gold",
    variant: "Standard",
    priceMinor: 7900,
    groupQuota: 25,
    circleQuota: 15,
    revenueSharePercent: 10,
    features: [
      "Up to 25 business groups",
      "Run paid groups & set contributions",
      "10% platform revenue share",
      "Full analytics & financial reporting",
      "Dedicated account manager",
    ],
  },
  {
    id: "plan-gold-pro",
    name: "Gold",
    variant: "Pro",
    priceMinor: 11900,
    groupQuota: 35,
    circleQuota: 20,
    revenueSharePercent: 12,
    features: [
      "Up to 35 business groups",
      "Up to 20 circles",
      "12% platform revenue share",
      "Automated grouping rules access",
      "Fast-track partner verification",
    ],
  },
  {
    id: "plan-gold-pro-plus",
    name: "Gold",
    variant: "Pro+",
    priceMinor: 15900,
    groupQuota: 50,
    circleQuota: 30,
    revenueSharePercent: 14,
    features: [
      "Up to 50 business groups",
      "Up to 30 circles",
      "14% platform revenue share",
      "VIP partner networking directory",
      "Executive quarterly review",
    ],
  },
  {
    id: "plan-platinum-std",
    name: "Platinum",
    variant: "Standard",
    priceMinor: 14900,
    groupQuota: 60,
    circleQuota: 35,
    revenueSharePercent: 15,
    features: [
      "Up to 60 business groups",
      "Up to 35 circles",
      "15% platform revenue share",
      "Smart Money Banker eligibility",
      "Growth consultant support",
    ],
  },
  {
    id: "plan-platinum-pro",
    name: "Platinum",
    variant: "Pro",
    priceMinor: 24900,
    groupQuota: 100,
    circleQuota: 50,
    revenueSharePercent: 18,
    features: [
      "Up to 100 business groups",
      "Up to 50 circles",
      "18% platform revenue share",
      "Syndicate Banker with rotational payouts",
      "Dedicated enterprise success manager",
    ],
  },
  {
    id: "plan-platinum-pro-plus",
    name: "Platinum",
    variant: "Pro+",
    priceMinor: 39900,
    groupQuota: 999,
    circleQuota: 999,
    revenueSharePercent: 20,
    features: [
      "Unlimited group & circle creation",
      "20% maximum platform revenue share",
      "Custom API webhooks & data sync",
      "Direct board-level ecosystem partnership",
      "Custom white-label group portal option",
    ],
  },
];

try {
  for (const plan of PLANS) {
    await prisma.plan.upsert({
      where: { name_variant: { name: plan.name, variant: plan.variant } },
      create: { ...plan, status: "Active", subscriberCount: 0 },
      update: {
        priceMinor: plan.priceMinor,
        status: "Active",
        groupQuota: plan.groupQuota,
        circleQuota: plan.circleQuota,
        revenueSharePercent: plan.revenueSharePercent,
        features: plan.features,
      },
    });
  }
  const total = await prisma.plan.count();
  console.log(`Seeded ${PLANS.length} plans. Total plans in database: ${total}.`);
} finally {
  await prisma.$disconnect();
}
