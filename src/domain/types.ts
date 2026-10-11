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

export type CircleType =
  | "Marketing Circle"
  | "Advertising Circle"
  | "Nearby Campaign Circle"
  | "Hyperlocal Campaign Circle"
  | "National Campaign Circle"
  | "Global Campaign Circle"
  | "Smart Money Partner Finance Network Circle";

export type InteractionLevel = "read" | "message" | "collaborate";

export type CampaignDuration = 90 | 180 | 270 | 360;

export type CircleVisibility = "private" | "invite only";

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

export type GroupStatus = "Active" | "Recruiting" | "Pending Review" | "Closed";

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
  groupId: string;
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
}

export interface AdminConfigPatch {
  automaticGrouping?: Partial<AutomaticGroupConfig>;
  groupTypes?: GroupTypeConfig[];
  stageLabels?: string[];
  paymentRules?: Partial<GroupPaymentRules>;
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
