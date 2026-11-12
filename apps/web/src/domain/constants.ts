import type { CampaignDuration, CircleTypeConfigEntry, Tier } from "./types";

export interface CircleTypeMeta {
  type: string;
  shortLabel: string;
  description: string;
  accent: string;
  accentSoft: string;
  mandatory: boolean;
  minMembers: number | null;
  maxMembers: number | null;
  requiresBanker: boolean;
}

/**
 * Seed definitions used the first time the store initialises.
 * After that the authoritative source is `state.adminConfig.circleTypes`,
 * which the administrator creates and edits on the Circle Type Configuration
 * screen. Nothing outside this seed array hard-codes a circle type.
 */
export const SEED_CIRCLE_TYPES: CircleTypeConfigEntry[] = [
  {
    id: "ct-marketing",
    type: "Marketing Circle",
    shortLabel: "Marketing",
    description: "Promote products and services to a curated audience from My Network.",
    accent: "#a78bfa",
    accentSoft: "rgba(167, 139, 250, 0.14)",
    enabled: true,
    mandatory: true,
    minMembers: 1,
    maxMembers: null,
    requiresBanker: false,
    allowedDurations: [90, 180, 270, 360],
  },
  {
    id: "ct-advertising",
    type: "Advertising Circle",
    shortLabel: "Advertising",
    description: "Run paid placements and seasonal campaigns with partner businesses.",
    accent: "#fb7185",
    accentSoft: "rgba(251, 113, 133, 0.14)",
    enabled: true,
    mandatory: true,
    minMembers: 1,
    maxMembers: null,
    requiresBanker: false,
    allowedDurations: [90, 180, 270, 360],
  },
  {
    id: "ct-nearby",
    type: "Nearby Campaign Circle",
    shortLabel: "Nearby",
    description: "Hyper-targeted campaign for businesses within your immediate area.",
    accent: "#34d399",
    accentSoft: "rgba(52, 211, 153, 0.14)",
    enabled: true,
    mandatory: false,
    minMembers: 1,
    maxMembers: null,
    requiresBanker: false,
    allowedDurations: [90, 180],
  },
  {
    id: "ct-hyperlocal",
    type: "Hyperlocal Campaign Circle",
    shortLabel: "Hyperlocal",
    description: "Street-level campaign focused on a single postcode or district.",
    accent: "#22d3ee",
    accentSoft: "rgba(34, 211, 238, 0.14)",
    enabled: true,
    mandatory: false,
    minMembers: 1,
    maxMembers: null,
    requiresBanker: false,
    allowedDurations: [90, 180],
  },
  {
    id: "ct-national",
    type: "National Campaign Circle",
    shortLabel: "National",
    description: "Country-wide campaign coordinated across regional partners.",
    accent: "#60a5fa",
    accentSoft: "rgba(96, 165, 250, 0.14)",
    enabled: true,
    mandatory: false,
    minMembers: 1,
    maxMembers: null,
    requiresBanker: false,
    allowedDurations: [180, 270, 360],
  },
  {
    id: "ct-global",
    type: "Global Campaign Circle",
    shortLabel: "Global",
    description: "International campaign spanning multiple markets and time zones.",
    accent: "#818cf8",
    accentSoft: "rgba(129, 140, 248, 0.14)",
    enabled: true,
    mandatory: false,
    minMembers: 1,
    maxMembers: null,
    requiresBanker: false,
    allowedDurations: [270, 360],
  },
  {
    id: "ct-smart-money",
    type: "Smart Money Partner Finance Network Circle",
    shortLabel: "Smart Money",
    description: "Rotational payout circle: 6-12 members, one designated Banker, weekly contributions by tier.",
    accent: "#e6a92b",
    accentSoft: "rgba(230, 169, 43, 0.16)",
    enabled: true,
    mandatory: false,
    minMembers: 6,
    maxMembers: 12,
    requiresBanker: true,
    allowedDurations: [360],
  },
  {
    id: "ct-events",
    type: "Event / Expo Circle",
    shortLabel: "Events",
    description: "Coordinate local events, workshops and seasonal gatherings with community members.",
    accent: "#f472b6",
    accentSoft: "rgba(244, 114, 182, 0.14)",
    enabled: true,
    mandatory: false,
    minMembers: 1,
    maxMembers: null,
    requiresBanker: false,
    allowedDurations: [60, 90, 120],
  },
  {
    id: "ct-loyalty",
    type: "Loyalty & Cashback Circle",
    shortLabel: "Loyalty",
    description: "Earn cashback and loyalty rewards on purchases from participating businesses.",
    accent: "#34d399",
    accentSoft: "rgba(52, 211, 153, 0.14)",
    enabled: true,
    mandatory: false,
    minMembers: 1,
    maxMembers: null,
    requiresBanker: false,
    allowedDurations: [120, 365],
  },
];

export function circleTypeMetaFrom(entry: CircleTypeConfigEntry): CircleTypeMeta {
  return {
    type: entry.type,
    shortLabel: entry.shortLabel,
    description: entry.description,
    accent: entry.accent,
    accentSoft: entry.accentSoft,
    mandatory: entry.mandatory,
    minMembers: entry.minMembers,
    maxMembers: entry.maxMembers,
    requiresBanker: entry.requiresBanker,
  };
}

/** Fallback for a circle whose type has since been renamed or deleted. */
export function circleTypeFallback(type: string): CircleTypeMeta {
  return {
    type,
    shortLabel: type.replace(/\s*Circle$/i, "") || "Circle",
    description: "This circle type is no longer defined in configuration. The circle itself is unaffected.",
    accent: "#94a3b8",
    accentSoft: "rgba(148, 163, 184, 0.14)",
    mandatory: false,
    minMembers: 1,
    maxMembers: null,
    requiresBanker: false,
  };
}

export const DURATIONS: CampaignDuration[] = [60, 90, 120, 180, 270, 360, 365];

export const INTERACTION_LEVELS = ["read", "message", "collaborate"] as const;

export const TIERS: Record<Tier, { durationDays: CampaignDuration; weeklyAmount: number }> = {
  Bronze: { durationDays: 90, weeklyAmount: 25 },
  Silver: { durationDays: 180, weeklyAmount: 50 },
  Gold: { durationDays: 270, weeklyAmount: 75 },
  Platinum: { durationDays: 360, weeklyAmount: 100 },
};

export const TIER_ORDER: Tier[] = ["Bronze", "Silver", "Gold", "Platinum"];

export const RECOMMENDED_START = 25;

export const CORE_SHORTLIST_LIMIT = 12;

export const ROLES = ["core", "peripheral", "banker", "partner"] as const;
