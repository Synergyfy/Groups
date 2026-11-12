import type {
  Business,
  BusinessMembership,
  User,
} from "../generated/prisma/client.js";

export type Tier = "Bronze" | "Silver" | "Gold" | "Platinum";
export type PlanVariant = "Standard" | "Pro" | "Pro+";
export type InteractionLevel = "read" | "message" | "collaborate";
export type GroupThreshold = 6 | 12 | 18 | 24;

export interface AutomaticGroupConfig {
  enabled: boolean;
  threshold: GroupThreshold;
  method: string;
  scope: string;
  allowCombine: boolean;
}

export interface GroupTypeConfig {
  type: string;
  enabled: boolean;
  allowCreate: boolean;
  allowJoin: boolean;
}

export interface GroupPaymentRules {
  allowPaid: boolean;
  minAmount: number;
  maxAmount: number;
  presets: number[];
  allowCustom: boolean;
}

export interface GroupCreationRules {
  allowedTiers: Tier[];
  allowedVariants: PlanVariant[];
  restrictToPlatformGroup: boolean;
  platformGroupId: string | null;
  recruitmentTargets: Record<Tier, Record<PlanVariant, number>>;
  activationEnabled: boolean;
  requirePaidAccess: boolean;
  entryAccessDays: 90 | 180;
  entryAccessFee: number;
}

export interface CircleTypeConfigEntry {
  id: string;
  type: string;
  shortLabel: string;
  description: string;
  accent: string;
  accentSoft: string;
  enabled: boolean;
  mandatory: boolean;
  minMembers: number | null;
  maxMembers: number | null;
  requiresBanker: boolean;
  allowedDurations: number[];
}

export interface MandatoryCircleRule {
  circleType: string;
  required: boolean;
  appliesToTier: "All" | "Free" | "Paid";
  minMemberCount: number;
  autoEnforce: boolean;
}

export interface MandatoryGroupRule {
  type: string;
  required: boolean;
  pricing: "owner-choice" | "paid";
}

export interface PartnerPermissions {
  canCreateGroups: boolean;
  canCreateCircles: boolean;
  canInviteMembers: boolean;
  canRemoveMembers: boolean;
  canRunPaidGroups: boolean;
  canRunFreeGroups: boolean;
  canAccessCampaigns: boolean;
  canAccessReports: boolean;
  canSeeFinancials: boolean;
  canSetContributionAmounts: boolean;
  maxGroups: number;
  maxCircles: number;
  revenueSharePercent: number;
}

export interface BusinessConfig {
  automaticGrouping: AutomaticGroupConfig;
  groupTypes: GroupTypeConfig[];
  stageLabels: string[];
  paymentRules: GroupPaymentRules;
  groupCreationRules: GroupCreationRules;
  circleTypes: CircleTypeConfigEntry[];
  mandatoryCircles: MandatoryCircleRule[];
  mandatoryGroups: MandatoryGroupRule[];
  partnerDefaults: PartnerPermissions;
  accessRules: Record<string, unknown>;
  platformSettings: Record<string, unknown>;
}

export interface MembershipAccessView {
  ownerId: string;
  tier: Tier;
  variant: PlanVariant;
  planName: string;
  status: string;
  paid: boolean;
  accessDays: number;
  accessFee: number;
  agreementAccepted: boolean;
  agreedAt?: string;
  accessExpiresAt?: string;
}

export interface BusinessContext {
  user: User;
  business: Business;
  membership: BusinessMembership;
  config: BusinessConfig;
}

export interface GroupActivationView {
  target: number;
  current: number;
  remaining: number;
  percent: number;
  active: boolean;
  gated: boolean;
  tier: Tier;
  variant: PlanVariant;
}

export interface JoinPlanView {
  action: "join" | "request" | "none";
  label: string;
  hint: string;
  disabled: boolean;
  reason:
    | "owner"
    | "member"
    | "type-disabled"
    | "request-pending"
    | "invitation-waiting"
    | "invitation-only"
    | "eligible"
    | "request-required"
    | "open";
}
