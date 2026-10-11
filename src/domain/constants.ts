import type { CampaignDuration, CircleType, Tier } from "./types";

export interface CircleTypeMeta {
  type: CircleType;
  shortLabel: string;
  description: string;
  accent: string;
  accentSoft: string;
  mandatory: boolean;
  minMembers: number | null;
  maxMembers: number | null;
  requiresBanker: boolean;
}

export const CIRCLE_TYPES: CircleTypeMeta[] = [
  {
    type: "Marketing Circle",
    shortLabel: "Marketing",
    description: "Promote products and services to a curated audience from My Network.",
    accent: "#a78bfa",
    accentSoft: "rgba(167, 139, 250, 0.14)",
    mandatory: true,
    minMembers: 1,
    maxMembers: null,
    requiresBanker: false,
  },
  {
    type: "Advertising Circle",
    shortLabel: "Advertising",
    description: "Run paid placements and seasonal campaigns with partner businesses.",
    accent: "#fb7185",
    accentSoft: "rgba(251, 113, 133, 0.14)",
    mandatory: true,
    minMembers: 1,
    maxMembers: null,
    requiresBanker: false,
  },
  {
    type: "Nearby Campaign Circle",
    shortLabel: "Nearby",
    description: "Hyper-targeted campaign for businesses within your immediate area.",
    accent: "#34d399",
    accentSoft: "rgba(52, 211, 153, 0.14)",
    mandatory: false,
    minMembers: 1,
    maxMembers: null,
    requiresBanker: false,
  },
  {
    type: "Hyperlocal Campaign Circle",
    shortLabel: "Hyperlocal",
    description: "Street-level campaign focused on a single postcode or district.",
    accent: "#22d3ee",
    accentSoft: "rgba(34, 211, 238, 0.14)",
    mandatory: false,
    minMembers: 1,
    maxMembers: null,
    requiresBanker: false,
  },
  {
    type: "National Campaign Circle",
    shortLabel: "National",
    description: "Country-wide campaign coordinated across regional partners.",
    accent: "#60a5fa",
    accentSoft: "rgba(96, 165, 250, 0.14)",
    mandatory: false,
    minMembers: 1,
    maxMembers: null,
    requiresBanker: false,
  },
  {
    type: "Global Campaign Circle",
    shortLabel: "Global",
    description: "International campaign spanning multiple markets and time zones.",
    accent: "#818cf8",
    accentSoft: "rgba(129, 140, 248, 0.14)",
    mandatory: false,
    minMembers: 1,
    maxMembers: null,
    requiresBanker: false,
  },
  {
    type: "Smart Money Partner Finance Network Circle",
    shortLabel: "Smart Money",
    description: "Rotational payout circle: 6-12 members, one designated Banker, weekly contributions by tier.",
    accent: "#e6a92b",
    accentSoft: "rgba(230, 169, 43, 0.16)",
    mandatory: false,
    minMembers: 6,
    maxMembers: 12,
    requiresBanker: true,
  },
];

export function circleTypeMeta(type: CircleType): CircleTypeMeta {
  return CIRCLE_TYPES.find((meta) => meta.type === type) ?? CIRCLE_TYPES[0];
}

export const DURATIONS: CampaignDuration[] = [90, 180, 270, 360];

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
