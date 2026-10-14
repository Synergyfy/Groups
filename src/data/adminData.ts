import { SEED_CIRCLE_TYPES } from "../domain/constants";
import type {
  AdminConfig,
  BusinessRecord,
  CampaignRecord,
  CircleTypeConfigEntry,
  MandatoryCircleRule,
  MandatoryGroupRule,
  PartnerPermissions,
  PartnerRecord,
  PlatformAccount,
  ProgrammeRecord,
  RelationshipRecord,
} from "../domain/types";

// ---------------------------------------------------------------------------
// Seeded platform accounts
//
// These exist so the invitation-first onboarding flow has something to find:
// an invitee who opens /invite/:id can sign in with one of these emails (or
// hit the duplicate guard when registering with them), and anyone else can
// register a brand-new account.
// ---------------------------------------------------------------------------

export const PLATFORM_ACCOUNTS: PlatformAccount[] = [
  {
    id: "acc-westside",
    name: "Westside Events",
    email: "events@westside.example",
    phone: "+44 7700 900700",
    role: "business-invitee",
    createdAt: "2026-09-20T09:00:00",
  },
  {
    id: "cons-john",
    name: "John Doe",
    email: "john.doe@example.com",
    phone: "+44 7700 900800",
    role: "consumer",
    createdAt: "2026-09-21T10:00:00",
  },
];

// ---------------------------------------------------------------------------
// Default partner permissions
// ---------------------------------------------------------------------------

export const FREE_PARTNER_PERMISSIONS: PartnerPermissions = {
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

export const PAID_PARTNER_PERMISSIONS: PartnerPermissions = {
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

// ---------------------------------------------------------------------------
// Default circle type configuration
//
// Circle types are administrator-authored: the seed below is only what the
// store starts with. Everything a business sees in its dashboard is read from
// `state.adminConfig.circleTypes`, which the admin creates and edits on the
// Circle Type Configuration screen.
// ---------------------------------------------------------------------------

export const DEFAULT_CIRCLE_TYPES: CircleTypeConfigEntry[] = SEED_CIRCLE_TYPES.map((entry) => ({
  ...entry,
  allowedDurations: [...entry.allowedDurations],
}));

export const DEFAULT_MANDATORY_CIRCLES: MandatoryCircleRule[] = [
  { circleType: "Marketing Circle", required: true, appliesToTier: "All", minMemberCount: 1, autoEnforce: false },
  { circleType: "Advertising Circle", required: true, appliesToTier: "All", minMemberCount: 1, autoEnforce: false },
  { circleType: "Smart Money Partner Finance Network Circle", required: false, appliesToTier: "Paid", minMemberCount: 6, autoEnforce: false },
];

// ---------------------------------------------------------------------------
// Mandatory groups every business owner creates first
//
// Marketing and Advertising are priced by the owner — free or paid — which is
// only offered while the Allow paid groups switch below is on.
//
// Partner defaults to a paid group: the administrator's switch is on unless it
// is explicitly turned off. The global Allow paid groups switch still wins —
// with it off, no group (Partner included) can be created as paid.
// ---------------------------------------------------------------------------

export const DEFAULT_MANDATORY_GROUPS: MandatoryGroupRule[] = [
  { type: "Marketing", required: true, pricing: "owner-choice" },
  { type: "Advertising", required: true, pricing: "owner-choice" },
  { type: "Partner", required: true, pricing: "paid" },
];

// ---------------------------------------------------------------------------
// Default admin config
// ---------------------------------------------------------------------------

export const DEFAULT_ADMIN_CONFIG: AdminConfig = {
  automaticGrouping: {
    enabled: true,
    threshold: 12,
    method: "Joining order",
    scope: "National network",
    allowCombine: false,
  },
  groupTypes: [
    { type: "Marketing", enabled: true, allowCreate: true, allowJoin: true },
    { type: "Advertising", enabled: true, allowCreate: true, allowJoin: true },
    { type: "B2B", enabled: true, allowCreate: true, allowJoin: true },
    { type: "Partner", enabled: true, allowCreate: true, allowJoin: true },
    { type: "Affiliate", enabled: true, allowCreate: true, allowJoin: true },
    { type: "Event / Expo", enabled: true, allowCreate: true, allowJoin: true },
    { type: "Other", enabled: true, allowCreate: true, allowJoin: true },
  ],
  stageLabels: ["Stage 1", "Stage 2", "Stage 3"],
  paymentRules: {
    allowPaid: true,
    minAmount: 5,
    maxAmount: 500,
    presets: [10, 25, 50, 100],
    allowCustom: true,
  },
  circleTypes: DEFAULT_CIRCLE_TYPES.map((entry) => ({ ...entry, allowedDurations: [...entry.allowedDurations] })),
  mandatoryCircles: DEFAULT_MANDATORY_CIRCLES.map((entry) => ({ ...entry })),
  mandatoryGroups: DEFAULT_MANDATORY_GROUPS.map((entry) => ({ ...entry })),
  partnerDefaults: { ...FREE_PARTNER_PERMISSIONS },
  auditLog: [],
};

// ---------------------------------------------------------------------------
// Partner records
// ---------------------------------------------------------------------------

export const PARTNERS: PartnerRecord[] = [
  {
    id: "partner-001",
    businessId: "biz-urban-events",
    businessName: "Urban Events",
    tier: "Gold",
    status: "Active",
    joinedAt: "2026-03-15",
    programmeId: "prog-partner",
    feeMonthly: 49,
    permissions: { ...PAID_PARTNER_PERMISSIONS, revenueSharePercent: 20 },
  },
  {
    id: "partner-002",
    businessId: "biz-central-retail",
    businessName: "Central Retail",
    tier: "Silver",
    status: "Active",
    joinedAt: "2026-05-20",
    programmeId: "prog-partner",
    feeMonthly: 29,
    permissions: { ...PAID_PARTNER_PERMISSIONS, revenueSharePercent: 12, maxGroups: 10, maxCircles: 6 },
  },
  {
    id: "partner-003",
    businessId: "biz-green-market",
    businessName: "Green Market",
    tier: "Free",
    status: "Active",
    joinedAt: "2026-07-01",
    feeMonthly: 0,
    permissions: { ...FREE_PARTNER_PERMISSIONS },
  },
  {
    id: "partner-004",
    businessId: "biz-city-foods",
    businessName: "City Foods",
    tier: "Bronze",
    status: "Active",
    joinedAt: "2026-06-10",
    programmeId: "prog-partner",
    feeMonthly: 9,
    permissions: { ...PAID_PARTNER_PERMISSIONS, revenueSharePercent: 5, maxGroups: 5, maxCircles: 3, canAccessReports: false, canSeeFinancials: false },
  },
  {
    id: "partner-005",
    businessId: "biz-fresh-living",
    businessName: "Fresh Living",
    tier: "Free",
    status: "Suspended",
    joinedAt: "2026-04-22",
    feeMonthly: 0,
    permissions: { ...FREE_PARTNER_PERMISSIONS, canCreateGroups: false, canCreateCircles: false },
    notes: "Suspended for repeated policy violations on contribution amounts.",
  },
];

// ---------------------------------------------------------------------------
// Business records
// ---------------------------------------------------------------------------

export const BUSINESSES: BusinessRecord[] = [
  { id: "biz-smith", name: "Smith Business Ltd", contactName: "Alex Smith", email: "alex@smithbusiness.example", phone: "+44 7700 900200", city: "Birmingham", localArea: "Birmingham City Centre", category: "Professional Services", status: "Active", verified: true, tier: "Gold", joinedAt: "2026-03-12", programmeId: "prog-247", accountManagerId: "rel-am-jane", agentId: "rel-agent-john", consultantId: "rel-consultant-sarah", isPartner: false },
  { id: "biz-urban-events", name: "Urban Events", contactName: "Noah Grant", email: "noah@urbanevents.example", phone: "+44 7700 900300", city: "London", localArea: "Camden", category: "Events", status: "Active", verified: true, tier: "Gold", joinedAt: "2026-03-15", programmeId: "prog-partner", accountManagerId: "rel-am-jane", isPartner: true },
  { id: "biz-central-retail", name: "Central Retail", contactName: "Mia Fraser", email: "mia@centralretail.example", city: "Leeds", localArea: "Leeds City Centre", category: "Retail", status: "Active", verified: true, tier: "Silver", joinedAt: "2026-05-20", programmeId: "prog-partner", isPartner: true },
  { id: "biz-green-market", name: "Green Market", contactName: "Ola Bank", email: "ola@greenmarket.example", city: "Birmingham", localArea: "Birmingham City Centre", category: "Retail", status: "Active", verified: true, tier: "Free", joinedAt: "2026-07-01", isPartner: true },
  { id: "biz-city-foods", name: "City Foods", contactName: "Tariq Ahmed", email: "tariq@cityfoods.example", phone: "+44 7700 900400", city: "Birmingham", localArea: "Birmingham City Centre", category: "Hospitality", status: "Active", verified: true, tier: "Bronze", joinedAt: "2026-06-10", programmeId: "prog-partner", isPartner: true },
  { id: "biz-fresh-living", name: "Fresh Living", contactName: "Nina Patel", email: "nina@freshliving.example", city: "Birmingham", localArea: "Edgbaston", category: "Retail", status: "Suspended", verified: false, tier: "Free", joinedAt: "2026-04-22", isPartner: true },
  { id: "biz-urban-retail", name: "Urban Retail", contactName: "Owen Blake", email: "owen@urbanretail.example", city: "London", localArea: "Islington", category: "Retail", status: "Active", verified: true, tier: "Silver", joinedAt: "2026-02-18", isPartner: false },
];

// ---------------------------------------------------------------------------
// Programme records
// ---------------------------------------------------------------------------

export const PROGRAMMES_ADMIN: ProgrammeRecord[] = [
  {
    id: "prog-247",
    name: "247 GBS Business Programme",
    tier: "Gold",
    status: "Active",
    description: "Full business programme with account management, campaign access and premium support.",
    monthlyFee: 79,
    benefits: ["Account manager", "Campaign access", "Priority support", "Analytics dashboard", "Unlimited groups"],
    groupCount: 3,
  },
  {
    id: "prog-partner",
    name: "Partner Membership Programme",
    tier: "Silver",
    status: "Active",
    description: "Partner programme with revenue share, co-marketing and shared campaign tools.",
    monthlyFee: 29,
    benefits: ["Revenue share", "Co-marketing", "Partner badge", "Basic analytics"],
    groupCount: 4,
  },
  {
    id: "prog-free",
    name: "Free Community Access",
    tier: "Free",
    status: "Active",
    description: "Free tier for community members. Limited groups and circles, no paid features.",
    monthlyFee: 0,
    benefits: ["Join open groups", "Free circles", "Community access"],
    groupCount: 2,
  },
];

// ---------------------------------------------------------------------------
// Campaign records
// ---------------------------------------------------------------------------

export const CAMPAIGNS_ADMIN: CampaignRecord[] = [
  { id: "camp-001", name: "Community Business Campaign", platform: "FundOrDonate", status: "Active", groupIds: ["grp-birmingham-biz", "grp-smith-marketing"], budget: 5000, startDate: "2026-09-01", endDate: "2026-12-31" },
  { id: "camp-002", name: "Winter Support Drive", platform: "FundOrDonate", status: "Draft", groupIds: [], budget: 2500 },
  { id: "camp-003", name: "Expo 2026 Promo", platform: "Central Hub", status: "Active", groupIds: ["grp-expo-2026"], budget: 12000, startDate: "2026-09-15", endDate: "2026-11-30" },
];

// ---------------------------------------------------------------------------
// Relationship records
// ---------------------------------------------------------------------------

export const RELATIONSHIPS_ADMIN: RelationshipRecord[] = [
  { id: "rel-am-jane", kind: "account-manager", name: "Jane Smith", role: "Account Manager", email: "jane.smith@centralhub.example", phone: "+44 7700 900111", activeGroups: 5 },
  { id: "rel-agent-john", kind: "agent", name: "John Smith", role: "Supporting Agent", email: "john.smith@centralhub.example", activeGroups: 3 },
  { id: "rel-consultant-sarah", kind: "consultant", name: "Sarah Cole", role: "Business Mentor", email: "sarah.cole@centralhub.example", activeGroups: 2 },
  { id: "rel-am-david", kind: "account-manager", name: "David Okafor", role: "Account Manager", email: "david.okafor@centralhub.example", phone: "+44 7700 900222", activeGroups: 4 },
  { id: "rel-agent-priya", kind: "agent", name: "Priya Sharma", role: "Supporting Agent", email: "priya.sharma@centralhub.example", activeGroups: 1 },
];
