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
}

export type ContactConfirmation = "pending" | "confirmed";

export type ContactIntakeMethod = "manual" | "join-link";

export interface NetworkContact {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  listId: string;
  confirmation: ContactConfirmation;
  intake: ContactIntakeMethod;
  consentAt: string;
  addedAt: string;
  addedByName: string;
}

// Circle types are admin-defined: the name is created on the Circle Type
// Configuration screen and flows through to every business dashboard.
export type CircleType = string;

export type InteractionLevel = "read" | "message" | "collaborate";

export type CampaignDuration = 60 | 90 | 120 | 180 | 270 | 360 | 365;

export type CircleVisibility = "private" | "invite only" | "public";

export interface CircleConfig {
  name: string;
  description: string;
  duration: CampaignDuration;
  visibility: CircleVisibility;
  interactionLevel: InteractionLevel;
}

export type MemberRole = "core" | "peripheral" | "banker" | "partner";

export type ActivityStatus = "active" | "inactive";

export type Tier = "Bronze" | "Silver" | "Gold" | "Platinum";

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
}

export interface GroupCircle {
  id: string;
  type: CircleType;
  config: CircleConfig;
  memberIds: string[];
  sourceListIds: string[];
  createdAt: string;
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
}

export type GroupPricingMode = "free" | "paid";

export type ContributionFrequency = "once" | "daily" | "weekly" | "monthly";

export interface Group {
  id: string;
  name: string;
  type: GroupType;
  source: GroupSource;
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
  contribution?: number;
  contributionFrequency?: ContributionFrequency;
  createdAt: string;
  campaignIds?: string[];
  programmeId?: string;
  accountManagerId?: string;
  agentId?: string;
  consultantId?: string;
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
  invitedById: string;
  invitedByName: string;
  status: InvitationStatus;
  createdAt: string;
  respondedAt?: string;
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

export interface AdminConfig {
  automaticGrouping: AutomaticGroupConfig;
  groupTypes: GroupTypeConfig[];
  stageLabels: string[];
  paymentRules: GroupPaymentRules;
  circleTypes: CircleTypeConfigEntry[];
  mandatoryCircles: MandatoryCircleRule[];
  partnerDefaults: PartnerPermissions;
  auditLog: AuditLogEntry[];
}

export interface AdminConfigPatch {
  automaticGrouping?: Partial<AutomaticGroupConfig>;
  groupTypes?: GroupTypeConfig[];
  stageLabels?: string[];
  paymentRules?: Partial<GroupPaymentRules>;
  circleTypes?: CircleTypeConfigEntry[];
  mandatoryCircles?: MandatoryCircleRule[];
  partnerDefaults?: Partial<PartnerPermissions>;
  auditLog?: AuditLogEntry[];
}

export interface AdminGroupFilters {
  type: string;
  city: string;
  localArea: string;
  status: string;
  stage: string;
  owner: string;
  programme: string;
  source: "all" | GroupSource;
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
  | "group-suspended"
  | "group-closed"
  | "group-deleted"
  | "member-added"
  | "member-removed"
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
