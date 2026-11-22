import type {
  Business,
  BusinessPlan,
  Partner,
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
  allowedPlans: string[];
  allowedVariants: PlanVariant[];
  /** Per plan+variant permission to create groups. */
  planCreationRights: Record<string, Record<PlanVariant, boolean>>;
  restrictToPlatformGroup: boolean;
  platformGroupId: string | null;
  recruitmentTargets: Record<string, Record<PlanVariant, number>>;
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

export interface PlanAccessView {
  ownerId: string;
  variant: PlanVariant;
  planName: string;
  status: string;
  paid: boolean;
  accessDays: number;
  accessFee: number;
  accessFeeMinor: number;
  agreementAccepted: boolean;
  agreedAt?: string;
  accessExpiresAt?: string;
  /** Where the access came from: local purchase or a Central Hub source. */
  accessSource: CentralAccessSource;
  externalPlanId?: string;
  membershipName?: string;
  accessReason?: string;
  upgradeUrl?: string;
  trialDaysRemaining?: number;
  programmeTasks?: CentralProgrammeTask[];
  quotas?: Record<string, unknown>;
  limits?: Record<string, unknown>;
  features?: string[];
}

export type CentralAccessSource =
  | "local"
  | "membership"
  | "access_pass"
  | "trial";

export interface CentralProgrammeTask {
  taskId: string;
  title: string;
  description: string;
  deadlineDays: number;
  status: string;
}

/** The two access sources a business may choose between, when both exist. */
export type AccessPreference = "local" | "central";

export interface PlanAccessOptionView {
  source: AccessPreference;
  /** The plan/variant this source grants. */
  planName: string;
  variant: PlanVariant;
  accessSource: CentralAccessSource;
  accessDays: number;
  accessFee: number;
  accessExpiresAt?: string;
  /** True while this source is actually gating the dashboard. */
  active: boolean;
  /** False when the plan has expired or is otherwise unusable. */
  available: boolean;
  membershipName?: string;
  externalPlanId?: string;
  tasks?: CentralProgrammeTask[];
  quotas?: Record<string, unknown>;
  limits?: Record<string, unknown>;
  features?: string[];
}

export interface PlanAccessOptionsView {
  preference: AccessPreference;
  local: PlanAccessOptionView | null;
  central: PlanAccessOptionView | null;
}

/** Snapshot of a plan bought directly in this app. */
export interface LocalPlanAccessSnapshot {
  planId: string | null;
  planName: string;
  variant: PlanVariant;
  status: string;
  paid: boolean;
  accessDays: number;
  accessFeeMinor: number;
  agreementAccepted: boolean;
  agreedAt: string | null;
  accessExpiresAt: string | null;
}

export interface BusinessContext {
  user: User;
  business: Business;
  plan: BusinessPlan;
  config: BusinessConfig;
  partner: Partner | null;
  /** Present when Central Hub granted access or gave a denial reason. */
  centralAccess?: import("../auth/entitlement-access.js").AccessDecision | null;
}


export interface GroupActivationView {
  target: number;
  current: number;
  remaining: number;
  percent: number;
  active: boolean;
  gated: boolean;
  planName: string;
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
    | "plan-required"
    | "request-pending"
    | "invitation-waiting"
    | "invitation-only"
    | "eligible"
    | "request-required"
    | "group-closed"
    | "open";
}
