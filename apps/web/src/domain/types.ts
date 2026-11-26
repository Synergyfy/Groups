export type Geography = "Nearby" | "Hyperlocal" | "National" | "Global";

export type ListType = "B2B" | "B2C";

export type ListStatus = "Active" | "Inactive";

export type NetworkListSource =
  | "Manual Contacts"
  | "QR Plaque Scans"
  | "Affiliate Signups"
  | "Traffic & Leads Directory";

export interface NetworkList {
  id: string;
  name: string;
  type: ListType;
  geography: Geography;
  status: ListStatus;
  source: NetworkListSource;
  contactIds: string[];
  contactCount?: number;
}

export type ContactConfirmation = "pending" | "confirmed" | "inactive" | "declined";
export type ContactIntakeMethod = "manual" | "join-link";

export interface NetworkContact {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  listId: string;
  listIds?: string[];
  mcomUserId?: string;
  confirmation: ContactConfirmation;
  intake: ContactIntakeMethod;
  consentAt: string;
  addedAt: string;
  addedByName: string;
  /** Central Hub avatar of the user behind this contact, when there is one. */
  photoUrl?: string | null;
}

// Circle types are admin-defined: the name is created on the Circle Type
// Configuration screen and flows through to every business dashboard.
export type CircleType = string;

export type InteractionLevel = "read" | "message" | "collaborate";

export type CampaignDuration = 60 | 90 | 120 | 180 | 270 | 360 | 365;

export type CircleVisibility = "private" | "invite only" | "public";

/** The Central Hub location chain a circle inherits from its business. */
export interface CircleLocation {
  city: string | null;
  borough: string | null;
  highStreet: string | null;
  localMall: string | null;
  cityId: string | null;
  boroughId: string | null;
  highStreetId: string | null;
  localMallId: string | null;
}

export interface CircleConfig {
  name: string;
  description: string;
  duration: CampaignDuration;
  visibility: CircleVisibility;
  interactionLevel: InteractionLevel;
  /** Where the circle operates — copied from the owning business's location. */
  location?: CircleLocation | null;
}

export type MemberRole = "core" | "peripheral" | "banker" | "partner";

export type ActivityStatus = "active" | "inactive";

export type Tier = "Bronze" | "Silver" | "Gold" | "Platinum";

export const TIERS_ORDERED: Tier[] = ["Bronze", "Silver", "Gold", "Platinum"];

/** Every plan ships three subscription variants. */
export type PlanVariant = "Standard" | "Pro" | "Pro+";

export const PLAN_VARIANTS: PlanVariant[] = ["Standard", "Pro", "Pro+"];

/** Access length included with each plan variant. */
export const PLAN_VARIANT_ACCESS_DAYS: Record<PlanVariant, number> = {
  Standard: 90,
  Pro: 180,
  "Pro+": 365,
};

export function planAccessLabel(variant: PlanVariant): string {
  return variant === "Pro+" ? "1 year" : `${PLAN_VARIANT_ACCESS_DAYS[variant]} days`;
}

/** Display label for a plan, including its variant (e.g. "Gold Pro"). */
export function planDisplayName(plan: Pick<Plan, "name" | "variant">): string {
  return `${plan.name} ${plan.variant}`;
}

export function accessDaysLabel(days: number): string {
  return days >= 365 ? "1 year" : `${days} days`;
}

/** A subscription plan as published on the Plans screen. */
export interface Plan {
  id: string;
  /** The plan's name. Each plan publishes Standard, Pro and Pro+ variants. */
  name: string;
  variant: PlanVariant;
  /** Display value in pounds, derived from priceMinor. */
  priceMonthly: number;
  /** Integer pence — the source of truth for MCOM Pay. */
  priceMinor: number;
  status: "Active" | "Draft" | "Closed";
  groupQuota: number;
  circleQuota: number;
  revenueSharePercent: number;
  features: string[];
  subscriberCount: number;
}

export interface CircleMember {
  id: string;
  fullName: string;
  businessName: string;
  category: string;
  location: string;
  geography: Geography;
  status: ActivityStatus;
  role: MemberRole;
  tier: Tier;
  joinedAt: string;
  lastActiveAt: string;
  photoUrl?: string;
  /**
   * True when the member is a real Central Hub user and can therefore be
   * messaged. Somebody who was only added to a network list has no account to
   * talk with yet.
   */
  chatable?: boolean;
}

export interface GroupCircle {
  id: string;
  type: CircleType;
  config: CircleConfig;
  memberIds: string[];
  sourceListIds: string[];
  createdAt: string;
  /** Server view fields (business circles). */
  status?: string;
  memberCount?: number;
  activityCount?: number;
  typeConfig?: CircleTypeConfigEntry;
}

export type ActivityEventKind = "join" | "message" | "update";

export interface ActivityEvent {
  id: string;
  circleId: string;
  memberId?: string;
  kind: ActivityEventKind;
  message: string;
  at: string;
}

// ---------------------------------------------------------------------------
// Group Building (Central Solution)
// ---------------------------------------------------------------------------

export type UserGroupType =
  | "Marketing"
  | "Advertising"
  | "Partner"
  | "Affiliate"
  | "B2B"
  | "Event / Expo"
  | "Other";

export type SystemGroupType = "National Community" | "Network";

export type GroupType = UserGroupType | SystemGroupType;

export type GroupSource = "automatic" | "user-created";

export type GroupStatus = "Active" | "Recruiting" | "Pending Review" | "Suspended" | "Closed";

export type GroupAccessType = "open" | "request" | "eligibility" | "invitation";

export type GroupVisibility = "directory" | "members";

export const GROUP_VISIBILITY_LABELS: Record<GroupVisibility, string> = {
  directory: "Platform directory",
  members: "Members only",
};

export interface GroupLocation {
  city?: string;
  localArea?: string;
  highStreet?: string;
  localMall?: string;
  cityId?: string;
  boroughId?: string;
  highStreetId?: string;
  localMallId?: string;
}

export type GroupPricingMode = "free" | "paid";

export type ContributionFrequency = "once" | "daily" | "weekly" | "monthly";

export interface Group {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  chatConversationId?: string;
  circleIds?: string[];
  type: GroupType;
  source: GroupSource;
  /**
   * Set on the pre-populated, incomplete groups a business finds waiting in
   * its dashboard on entry ("head start" groups). They are still owned by the
   * business — they simply arrive half-built and must be recruited up to the
   * administrator's activation threshold before they become functional.
   */
  headStart?: boolean;
  purpose: string;
  ownerId: string;
  ownerName: string;
  memberIds: string[];
  memberCount?: number;
  location?: GroupLocation;
  requiredSize?: number;
  stage?: string;
  status: GroupStatus;
  accessType: GroupAccessType;
  visibility?: GroupVisibility;
  interactionLevel?: InteractionLevel;
  pricing?: GroupPricingMode;
  /** Membership plans allowed to join. Empty means any plan. */
  requiredPlanIds?: string[];
  contribution?: number;
  contributionMinor?: number;
  contributionFrequency?: ContributionFrequency;
  createdAt: string;
  campaignIds?: string[];
  programmeId?: string;
  accountManagerId?: string;
  agentId?: string;
  consultantId?: string;
  /** Server-resolved view state for the signed-in business. */
  isOwner?: boolean;
  isMember?: boolean;
  role?: "owner" | "member" | "none";
  activation?: GroupActivationView;
  joinPlan?: JoinPlanView;
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
  reason: string;
}

export type MembershipRole = "owner" | "member";

export interface Membership {
  id: string;
  memberId: string;
  groupId: string;
  role: MembershipRole;
  joinedAt: string;
  status: "active" | "pending";
}

export type InvitationDirection = "incoming" | "outgoing";

export type InvitationStatus = "pending" | "accepted" | "declined" | "cancelled";

export type InvitationKind = "invite" | "request";

/**
 * The role an invited person gets when they accept. Determined by the
 * invitation (the owner chooses it when inviting) — never inferred from the
 * group, and never owner/admin. An invited consumer stays a consumer.
 */
export type ParticipantRole = "business-invitee" | "consumer";

export interface Invitation {
  id: string;
  /** Target group. Absent when the invitation targets a circle instead. */
  groupId?: string;
  /** Target circle. Present for circle invitations sent to free participants. */
  circleId?: string;
  direction: InvitationDirection;
  kind: InvitationKind;
  inviteeId?: string;
  inviteeName: string;
  inviteeEmail?: string;
  /** Alternative delivery channel — the invitation was sent by SMS. */
  inviteePhone?: string;
  /** Role the invitee receives on acceptance. Absent for legacy/demo rows. */
  inviteeRole?: ParticipantRole;
  /**
   * Set once a pending invitation has been bound to a platform account through
   * the public invite link. A second account cannot claim the same invitation.
   */
  claimedByAccountId?: string;
  invitedById: string;
  invitedByName: string;
  status: InvitationStatus;
  createdAt: string;
  respondedAt?: string;
  /** Server-resolved target names for invitations that have not been opened. */
  groupName?: string;
  circleName?: string;
  circleBusinessName?: string;
}

/**
 * A registered platform account. Created through the invitation-first
 * onboarding flow (or seeded) — email and phone are unique across accounts.
 */
export interface PlatformAccount {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: ParticipantRole;
  createdAt: string;
}

export type GroupActivityKind =
  | "join"
  | "leave"
  | "invite"
  | "created"
  | "message"
  | "update"
  | "settings";

export interface GroupActivity {
  id: string;
  groupId: string;
  actorName: string;
  kind: GroupActivityKind;
  message: string;
  at: string;
}

export interface BusinessProfile {
  id: string;
  businessName: string;
  contactName: string;
  email: string;
  category: string;
  city: string;
  localArea: string;
  joinedAt: string;
  nationalCommunity: { name: string; status: "Member"; joinedAt: string };
  accountManagerId?: string;
  agentId?: string;
  consultantId?: string;
  programmeId?: string;
}

export interface LocalArea {
  id: string;
  name: string;
}

export interface CityArea {
  id: string;
  name: string;
  areas: LocalArea[];
}

export interface LocationHierarchy {
  nationalCommunity: string;
  cities: CityArea[];
}

export type RelationshipKind = "account-manager" | "agent" | "consultant";

export interface Relationship {
  id: string;
  kind: RelationshipKind;
  name: string;
  role: string;
  email?: string;
  phone?: string;
}

export interface CampaignRef {
  id: string;
  name: string;
  platform: "FundOrDonate";
  status: "Draft" | "Active" | "Completed";
  groupIds?: string[];
}

export interface MembershipProgramme {
  id: string;
  name: string;
  tier: Tier;
  status: "Active" | "Expired" | "Pending";
}

export type GroupThreshold = 6 | 12 | 18 | 24;

export interface GroupTypeConfig {
  type: UserGroupType;
  enabled: boolean;
  allowCreate: boolean;
  allowJoin: boolean;
}

export interface AutomaticGroupConfig {
  enabled: boolean;
  threshold: GroupThreshold;
  method: string;
  scope: string;
  allowCombine: boolean;
}

export interface GroupPaymentRules {
  allowPaid: boolean;
  minAmount: number;
  maxAmount: number;
  presets: number[];
  allowCustom: boolean;
}

/**
 * Administrator rules for how businesses create groups.
 *
 * - `planCreationRights` decides, per plan name and variant, whether that plan
 *   combination may create a group. Everyone else is placed into the admin-set
 *   platform group instead.
 * - `allowedPlans` / `allowedVariants` mirror the older cross-product form of
 *   the same rights and are kept for compatibility with older saved configs.
 * - `recruitmentTargets` is the recruitment requirement per plan variant.
 *   Groups stay non-functional until they reach their target.
 * - `entryAccessDays` / `entryAccessFee` are the paid access models (90-day or
 *   180-day) that must be paid — and agreed to — before dashboard entry.
 */
export interface GroupCreationRules {
  allowedPlans: string[];
  allowedVariants: PlanVariant[];
  /** Per plan+variant permission to create groups. */
  planCreationRights?: Record<string, Record<PlanVariant, boolean>>;
  /** Place members without creation rights into the admin platform group. */
  restrictToPlatformGroup: boolean;
  /** The group administrators assign those members to. */
  platformGroupId: string | null;
  /** Members needed per plan before a group becomes functional. */
  recruitmentTargets: Record<string, Record<PlanVariant, number>>;
  /** When off, groups are functional immediately regardless of size. */
  activationEnabled: boolean;
  /** Paid access (the entry fee below) is required before dashboard entry. */
  requirePaidAccess: boolean;
  /** Length of the paid access period — 90-day or 180-day access model. */
  entryAccessDays: 90 | 180;
  /** Fee charged for that access period. */
  entryAccessFee: number;
}

/**
 * The signed-in business's paid access: its plan, whether the access fee has
 * been paid, and whether the mandatory access agreement has been accepted.
 * Both the fee and the agreement are required before dashboard entry.
 */
export interface PlanAccess {
  ownerId: string;
  variant: PlanVariant;
  planName: string;
  status: "Active" | "Pending" | "Expired";
  paid: boolean;
  /** Length of the paid access period, in days. */
  accessDays: number;
  /** Access fee settled on activation, in pounds for display. */
  accessFee: number;
  /** Access fee in integer pence. */
  accessFeeMinor: number;
  agreementAccepted: boolean;
  agreedAt?: string;
  /** End of the paid access period, when one has been set. */
  accessExpiresAt?: string;
  /** Where access came from: a local purchase or a Central Hub grant. */
  accessSource?: "local" | "membership" | "access_pass" | "trial";
  externalPlanId?: string;
  membershipName?: string;
  accessReason?: string;
  upgradeUrl?: string;
  trialDaysRemaining?: number;
  programmeTasks?: Array<{
    taskId: string;
    title: string;
    description: string;
    deadlineDays: number;
    status: string;
  }>;
  quotas?: Record<string, unknown>;
  limits?: Record<string, unknown>;
  features?: string[];
}

export interface AdminConfig {
  automaticGrouping: AutomaticGroupConfig;
  groupTypes: GroupTypeConfig[];
  stageLabels: string[];
  paymentRules: GroupPaymentRules;
  groupCreationRules: GroupCreationRules;
  circleTypes: CircleTypeConfigEntry[];
  mandatoryCircles: MandatoryCircleRule[];
  mandatoryGroups: MandatoryGroupRule[];
  partnerDefaults: PartnerPermissions;
  auditLog: AuditLogEntry[];
  /** Admin access-rule settings, stored server-side with the config. */
  accessRules?: Record<string, unknown>;
  /** Platform settings (invitation defaults, notifications), stored server-side. */
  platformSettings?: Record<string, unknown>;
}

export interface AdminConfigPatch {
  automaticGrouping?: Partial<AutomaticGroupConfig>;
  groupTypes?: GroupTypeConfig[];
  stageLabels?: string[];
  paymentRules?: Partial<GroupPaymentRules>;
  groupCreationRules?: Partial<GroupCreationRules>;
  circleTypes?: CircleTypeConfigEntry[];
  mandatoryCircles?: MandatoryCircleRule[];
  mandatoryGroups?: MandatoryGroupRule[];
  partnerDefaults?: Partial<PartnerPermissions>;
  accessRules?: Record<string, unknown>;
  platformSettings?: Record<string, unknown>;
  auditLog?: AuditLogEntry[];
}

export interface AdminGroupFilters {
  type: string;
  city: string;
  localArea: string;
  highStreet: string;
  localMall: string;
  status: string;
  stage: string;
  owner: string;
  programme: string;
  source: "all" | GroupSource;
  pricing?: "all" | GroupPricingMode;
  query: string;
}

export interface BusinessDirectoryEntry {
  id: string;
  name: string;
  contactName: string;
  city: string;
  category: string;
  joinedAt?: string;
}

// ---------------------------------------------------------------------------
// Admin: audit log, moderation, partner administration
// ---------------------------------------------------------------------------

export type AuditActionKind =
  | "group-created"
  | "group-updated"
  | "group-approved"
  | "group-rejected"
  | "group-suspended"
  | "group-closed"
  | "group-deleted"
  | "member-added"
  | "member-removed"
  | "contribution-updated"
  | "invitation-approved"
  | "invitation-declined"
  | "invitation-cancelled"
  | "config-updated"
  | "partner-updated"
  | "business-updated"
  | "programme-updated"
  | "campaign-updated"
  | "relationship-assigned"
  | "circle-type-created"
  | "circle-type-updated"
  | "circle-type-deleted"
  | "content-published";

export interface AuditLogEntry {
  id: string;
  action: AuditActionKind;
  actorId: string;
  actorName: string;
  targetType: "group" | "member" | "invitation" | "config" | "partner" | "business" | "programme" | "campaign" | "content" | "circle-type";
  targetId: string;
  targetName: string;
  detail: string;
  at: string;
}

export type PartnerStatus = "Active" | "Suspended" | "Pending" | "Closed";
export type PartnerTier = "Free" | "Bronze" | "Silver" | "Gold" | "Platinum";

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

export interface PartnerRecord {
  id: string;
  businessId: string;
  businessName: string;
  tier: PartnerTier;
  status: PartnerStatus;
  joinedAt: string;
  programmeId?: string;
  feeMonthly: number;
  feeMonthlyMinor: number;
  permissions: PartnerPermissions;
  notes?: string;
}

export type BusinessStatus = "Active" | "Pending" | "Suspended" | "Closed";

export interface BusinessRecord {
  id: string;
  name: string;
  contactName: string;
  email: string;
  phone?: string;
  city: string;
  localArea?: string;
  category: string;
  status: BusinessStatus;
  verified: boolean;
  tier: PartnerTier;
  joinedAt: string;
  programmeId?: string;
  accountManagerId?: string;
  agentId?: string;
  consultantId?: string;
  isPartner: boolean;
}

export interface ProgrammeRecord {
  id: string;
  name: string;
  tier: PartnerTier;
  status: "Active" | "Draft" | "Closed";
  description: string;
  monthlyFee: number;
  monthlyFeeMinor: number;
  benefits: string[];
  groupCount: number;
}

export interface CampaignRecord {
  id: string;
  name: string;
  platform: string;
  status: "Active" | "Draft" | "Closed";
  groupIds: string[];
  budget?: number;
  budgetMinor?: number;
  startDate?: string;
  endDate?: string;
}

export interface RelationshipRecord {
  id: string;
  kind: "account-manager" | "agent" | "consultant";
  name: string;
  role: string;
  email: string;
  phone?: string;
  activeGroups: number;
}

// ---------------------------------------------------------------------------
// Circle admin configuration
// ---------------------------------------------------------------------------

export interface CircleTypeConfigEntry {
  /** Stable identifier — never changes once created. */
  id: string;
  /** The admin-authored circle type name businesses select. */
  type: CircleType;
  /** Short display label used in dense UI (cards, chips, sidebars). */
  shortLabel: string;
  /** One-line explanation shown to businesses when they pick this type. */
  description: string;
  /** Accent hex used for the type dot / border. */
  accent: string;
  /** Translucent accent used for type backgrounds. */
  accentSoft: string;
  enabled: boolean;
  mandatory: boolean;
  minMembers: number | null;
  maxMembers: number | null;
  requiresBanker: boolean;
  allowedDurations: CampaignDuration[];
}

export interface MandatoryCircleRule {
  circleType: CircleType;
  required: boolean;
  appliesToTier: "All" | "Free" | "Paid";
  minMemberCount: number;
  autoEnforce: boolean;
}

// ---------------------------------------------------------------------------
// Mandatory groups a business owner must create first
// ---------------------------------------------------------------------------

/**
 * How a mandatory group is priced when the owner creates it.
 *
 * - "owner-choice" — the owner picks free or paid in the wizard, but the paid
 *   option only appears while the administrator's Allow paid groups switch is
 *   on. Used by the required Marketing and Advertising groups.
 * - "paid" — the administrator's switch that makes this required group a paid
 *   group. Used by the Partner group, on by default.
 */
export type MandatoryGroupPricing = "owner-choice" | "paid";

export interface MandatoryGroupRule {
  /** The group type the owner is required to create. */
  type: UserGroupType;
  /** Admin switch — when on, the owner must create this group before any other type. */
  required: boolean;
  /** How the group is priced when it is created. */
  pricing: MandatoryGroupPricing;
  /** Creation sequence order (1, 2, 3...). */
  order?: number;
  /** Allowed contribution frequencies for paid required groups. */
  allowedFrequencies?: string[];
}
