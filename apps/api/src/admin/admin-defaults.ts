export const DEFAULT_AUTOMATIC_GROUPING = {
  enabled: true,
  threshold: 12,
  method: "Joining order",
  scope: "National network",
  allowCombine: false,
};

export const DEFAULT_GROUP_TYPES = [
  { type: "Marketing", enabled: true, allowCreate: true, allowJoin: true },
  { type: "Advertising", enabled: true, allowCreate: true, allowJoin: true },
  { type: "B2B", enabled: true, allowCreate: true, allowJoin: true },
  { type: "Partner", enabled: true, allowCreate: true, allowJoin: true },
  { type: "Affiliate", enabled: true, allowCreate: true, allowJoin: true },
  { type: "Event / Expo", enabled: true, allowCreate: true, allowJoin: true },
  { type: "Other", enabled: true, allowCreate: true, allowJoin: true },
];

export const DEFAULT_STAGE_LABELS = ["Stage 1", "Stage 2", "Stage 3"];

export const DEFAULT_PAYMENT_RULES = {
  allowPaid: true,
  minAmount: 5,
  maxAmount: 500,
  presets: [10, 25, 50, 100],
  allowCustom: true,
};

export const DEFAULT_GROUP_CREATION_RULES = {
  allowedPlans: ["Platinum"],
  allowedVariants: ["Pro+"],
  restrictToPlatformGroup: true,
  platformGroupId: "grp-local-partners",
  recruitmentTargets: {
    Bronze: { Standard: 6, Pro: 5, "Pro+": 4 },
    Silver: { Standard: 5, Pro: 4, "Pro+": 3 },
    Gold: { Standard: 4, Pro: 3, "Pro+": 2 },
    Platinum: { Standard: 3, Pro: 2, "Pro+": 2 },
  },
  activationEnabled: true,
  requirePaidAccess: true,
  entryAccessDays: 90,
  entryAccessFee: 25,
};

export const DEFAULT_CIRCLE_TYPES = [
  {
    id: "ct-marketing",
    type: "Marketing Circle",
    shortLabel: "Marketing",
    description:
      "Promote products and services to a curated audience from My Network.",
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
    description:
      "Run paid placements and seasonal campaigns with partner businesses.",
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
    description:
      "Hyper-targeted campaign for businesses within your immediate area.",
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
    allowedDurations: [180, 270, 360],
  },
];

export const DEFAULT_MANDATORY_CIRCLES = [
  {
    circleType: "Marketing Circle",
    required: true,
    appliesToTier: "All",
    minMemberCount: 1,
    autoEnforce: false,
  },
  {
    circleType: "Advertising Circle",
    required: true,
    appliesToTier: "All",
    minMemberCount: 1,
    autoEnforce: false,
  },
  {
    circleType: "Smart Money Partner Finance Network Circle",
    required: false,
    appliesToTier: "Paid",
    minMemberCount: 6,
    autoEnforce: false,
  },
];

export const DEFAULT_MANDATORY_GROUPS = [
  { type: "Marketing", required: true, pricing: "owner-choice" },
  { type: "Advertising", required: true, pricing: "owner-choice" },
  { type: "Partner", required: true, pricing: "paid" },
];

export const FREE_PARTNER_PERMISSIONS = {
  canCreateGroups: true,
  canCreateCircles: true,
  canInviteMembers: true,
  canRemoveMembers: false,
  canRunPaidGroups: false,
  canRunFreeGroups: true,
  canAccessCampaigns: false,
  canAccessReports: false,
  canSeeFinancials: false,
  canSetContributionAmounts: false,
  maxGroups: 3,
  maxCircles: 2,
  revenueSharePercent: 0,
};

export const PAID_PARTNER_PERMISSIONS = {
  canCreateGroups: true,
  canCreateCircles: true,
  canInviteMembers: true,
  canRemoveMembers: true,
  canRunPaidGroups: true,
  canRunFreeGroups: true,
  canAccessCampaigns: true,
  canAccessReports: true,
  canSeeFinancials: true,
  canSetContributionAmounts: true,
  maxGroups: 25,
  maxCircles: 15,
  revenueSharePercent: 15,
};

export const DEFAULT_ACCESS_RULES = {
  temporaryAccess: {
    duration: "14",
    interactionLevel: "message",
    expiryAction: "auto-leave",
    requirePaymentForPermanent: true,
  },
  joiningPolicy: "invitation-first",
  invitingPolicy: "owners-only",
  quotas: {
    freeMaxGroups: 3,
    paidMaxGroups: 25,
    freeMaxCircles: 2,
    paidMaxCircles: 15,
  },
};

export const DEFAULT_PLATFORM_SETTINGS = {
  defaultRequiredSize: 12,
  defaultPricing: "free",
  defaultVisibility: "directory",
  defaultGreeting:
    "You have been invited to join this group on Groups & Circles, the group platform from Central Hub Solution.",
  smsFallback: true,
  notifyOnNewRegistration: true,
  notifyOnModerationQueue: true,
};

export const DEFAULT_CONTENT_SECTIONS = [
  { id: "hero", label: "Homepage Hero" },
  { id: "cta", label: "Primary & Secondary CTAs" },
  { id: "product", label: "Product Introduction" },
  { id: "group-types", label: "Group Type Descriptions" },
  { id: "how-it-works", label: "How It Works Steps" },
  { id: "connected-products", label: "Connected Products" },
  { id: "faqs", label: "FAQs" },
  { id: "notices", label: "Public Notices & Announcements" },
  { id: "navigation", label: "Navigation Visibility" },
];
