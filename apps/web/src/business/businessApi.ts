import { apiRequest } from "../app/api";
import type {
  AdminConfig,
  CampaignRecord,
  CircleTypeConfigEntry,
  Group,
  GroupActivity,
  GroupCircle,
  Invitation,
  PlanAccess,
  Plan,
  NetworkContact,
  NetworkList,
  PlanVariant,
  ProgrammeRecord,
  RelationshipRecord,
} from "../domain/types";

export interface RewardDealView {
  id: string;
  title: string;
  category: string;
  discountValue: string;
  code?: string;
  targetAudience: string;
  liveOnFrontend: boolean;
  status: string;
  expiryDate?: string;
  claimsCount: number;
  maxClaims: number;
  sponsorBusiness: string;
}

// ---------------------------------------------------------------------------
// API response shapes
// ---------------------------------------------------------------------------

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

/** A group as returned by the business dashboard (domain fields + view state). */
export interface BusinessGroup extends Group {
  slug?: string;
  description?: string;
  isOwner: boolean;
  isMember: boolean;
  role: "owner" | "member" | "none";
  activation: GroupActivationView;
  joinPlan?: JoinPlanView;
}

export interface BusinessMember {
  id: string;
  membershipId: string;
  fullName: string;
  businessName?: string;
  category?: string;
  location?: string;
  geography?: string;
  status: string;
  role: string;
  tier: string;
  contributionStatus?: string;
  contributionPaidAt?: string;
  joinedAt?: string;
  lastActiveAt?: string;
  photoUrl?: string;
}

export interface BusinessConfig extends Omit<AdminConfig, "auditLog"> {
  auditLog?: never;
}

export interface BusinessRecordView {
  id: string;
  name: string;
  contactName: string;
  email: string;
  phone?: string;
  city: string;
  localArea?: string;
  category: string;
  status: string;
  verified: boolean;
  tier: string;
  joinedAt?: string;
  programmeId?: string;
  accountManagerId?: string;
  agentId?: string;
  consultantId?: string;
  isPartner: boolean;
}

export interface BusinessProfileView {
  business: BusinessRecordView;
  user: {
    id: string;
    email: string;
    name?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    avatarUrl?: string | null;
  };
  plan: BusinessPlanView;
  access: PlanAccess;
  programme: ProgrammeRecord | null;
  relationships: {
    accountManager: RelationshipRecord | null;
    agent: RelationshipRecord | null;
    consultant: RelationshipRecord | null;
  };
  location: { city: string; localArea?: string };
  joinedAt: string;
  nationalCommunity: { name: string; status: "Member"; joinedAt: string };
}

export interface BusinessPlanView {
  id: string;
  businessId: string;
  variant: string;
  planId?: string;
  planName: string;
  status: string;
  paid: boolean;
  accessDays: number;
  accessFee: number;
  accessFeeMinor: number;
  agreementAccepted: boolean;
  agreedAt?: string;
  accessExpiresAt?: string;
  accessSource?: string;
  externalPlanId?: string;
  membershipName?: string;
  accessReason?: string;
  upgradeUrl?: string;
}

export interface GroupStatsView {
  total: number;
  mine: number;
  owned: number;
  automatic: number;
  userCreated: number;
  pendingInvites: number;
  openRequests: number;
}

export interface AutomaticProgressView {
  group: BusinessGroup | null;
  current: number;
  threshold: number;
  remaining: number;
  percent: number;
  enabled: boolean;
  method: string;
  scope: string;
}

export interface MandatoryGroupStatusView {
  type: string;
  required: boolean;
  pricing: "owner-choice" | "paid";
  satisfied: boolean;
  group?: Group;
}

export interface BusinessDashboard {
  business: BusinessRecordView;
  plan: {
    variant: string;
    planName: string;
    status: string;
    paid: boolean;
    agreementAccepted: boolean;
    accessDays: number;
    accessFee: number;
    accessFeeMinor: number;
  };
  canCreateGroups: boolean;
  creationRightsLabel: string;
  stats: GroupStatsView;
  automaticProgress: AutomaticProgressView;
  mandatoryGroups: MandatoryGroupStatusView[];
  headStartGroups: BusinessGroup[];
  platformGroup: BusinessGroup | null;
  automatic: BusinessGroup[];
  created: BusinessGroup[];
  joined: BusinessGroup[];
  groups: BusinessGroup[];
  invitations: Invitation[];
  recentActivity: Array<GroupActivity & { groupName: string }>;
  explore: ExploreGroupsResponse;
  network: NetworkGroupResponse;
}

export interface ExploreGroupsResponse {
  items: BusinessGroup[];
  total: number;
  page: number;
  pageSize: number;
}

export interface NetworkGroupResponse {
  group: BusinessGroup | null;
  progress: AutomaticProgressView;
  stats: {
    networkGroups: number;
    nationalCommunities: number;
    automaticMembers: number;
    threshold: number;
    nextThresholdAt: number;
  };
  groups: BusinessGroup[];
}

export interface PageResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface InvitationCounts {
  incoming: number;
  outgoing: number;
  requests: number;
  ownerRequests: number;
  pending: number;
}

export interface InvitationListResponse extends PageResult<Invitation> {
  tab: string;
  counts: InvitationCounts;
}

export interface InvitationDetailResponse {
  invitation: Invitation;
  group: BusinessGroup | null;
  circle: BusinessCircle | null;
  inviter: BusinessRecordView | null;
  invitee: BusinessRecordView | null;
  responderRole: string;
  canRespond: boolean;
}

export interface BusinessCircle extends GroupCircle {
  status?: string;
  memberCount?: number;
  activityCount?: number;
  typeConfig?: CircleTypeConfigEntry;
}

export interface CircleMemberView {
  id: string;
  fullName: string;
  businessName: string;
  category: string;
  location: string;
  geography: string;
  status: string;
  role: string;
  tier: string;
  confirmation?: string;
  joinedAt?: string;
  lastActiveAt?: string;
  photoUrl?: string;
}

export interface CircleActivityView {
  id: string;
  circleId: string;
  memberId?: string;
  kind: string;
  message: string;
  at?: string;
}

export interface CircleListResponse extends PageResult<BusinessCircle> {
  types: CircleTypeConfigEntry[];
  quota: number;
  mandatoryCircles: Array<{
    circleType: string;
    required: boolean;
    satisfied: boolean;
    circleId?: string;
    current: number;
  }>;
}

export interface CircleDetailResponse {
  circle: BusinessCircle;
  members: CircleMemberView[];
  sourceLists: NetworkList[];
  activity: CircleActivityView[];
  stats: {
    total: number;
    active: number;
    core: number;
    peripheral: number;
    bankers: number;
    pending: number;
  };
  quota: number;
}

export interface NetworkListResponse extends NetworkList {
  contactCount: number;
  pendingCount?: number;
  confirmedCount?: number;
  stats?: { pending: number; confirmed: number };
  contacts?: NetworkContact[];
  createdAt?: string;
}

export interface NetworkListsResponse {
  items: NetworkListResponse[];
  stats: {
    lists: number;
    activeLists: number;
    contacts: number;
    b2bLists: number;
    b2cLists: number;
    pending: number;
    confirmed: number;
    sources: string[];
  };
  total: number;
}

export interface BusinessCommunityResponse {
  community: {
    name: string;
    status: "Member";
    joinedAt: string;
    city: string;
    localArea?: string;
  };
  groups: Group[];
  plan: BusinessPlanView;
  stats: {
    communityGroups: number;
    membersAcross: number;
    myGroups: number;
    networkLists: number;
    circles: number;
  };
}

export interface BusinessLocationResponse {
  current: { city: string; localArea?: string; joinedAt: string };
  cityGroups: Group[];
  areaGroups: Group[];
  hierarchy: Array<{ id: string; name: string; areas: Array<{ id: string; name: string }> }>;
  stats: {
    groupsInCity: number;
    groupsInArea: number;
    membersInCity: number;
    myGroups: number;
  };
}

export interface BusinessLocationsResponse {
  nationalCommunity: string;
  current: { city: string; localArea?: string; joinedAt: string };
  cities: Array<{ id: string; name: string; areas: Array<{ id: string; name: string }> }>;
  totalCities: number;
  totalAreas: number;
}

export interface BusinessCampaign extends CampaignRecord {
  groups: Array<{ id: string; name: string; type: string; isMine: boolean }>;
  isMine: boolean;
}

export interface BusinessCampaignsResponse extends PageResult<BusinessCampaign> {
  stats: { total: number; active: number; touchingMyGroups: number };
}

export interface BusinessRewardsResponse {
  plan: BusinessPlanView;
  access: PlanAccess;
  currentProgramme: ProgrammeRecord | null;
  programmes: ProgrammeRecord[];
  plans: Plan[];
  rewardDeals: PageResult<RewardDealView>;
  campaigns: CampaignRecord[];
  stats: {
    programmes: number;
    activeProgrammes: number;
    currentPlan: string;
    rewardDeals: number;
    liveDeals: number;
    campaigns: number;
  };
}

export interface BusinessProgrammesResponse {
  items: ProgrammeRecord[];
  current: ProgrammeRecord | null;
  plan: BusinessPlanView;
  stats: { total: number; active: number; currentPlan: string };
}

export interface BusinessPlanResponse {
  plan: BusinessPlanView;
  access: PlanAccess;
  canCreateGroups: boolean;
  creationRightsLabel: string;
  rules: AdminConfig["groupCreationRules"];
  paymentRules: AdminConfig["paymentRules"];
  plans: Plan[];
  quotas: { groups: number; circles: number };
  mandatoryGroups: AdminConfig["mandatoryGroups"];
  mandatoryCircles: AdminConfig["mandatoryCircles"];
}

export interface BusinessJourneyResponse {
  steps: Array<{ id: string; title: string; route: string; done: boolean }>;
  done: Record<string, boolean>;
  doneCount: number;
  total: number;
  percent: number;
  current: { id: string; title: string; route: string; done: boolean };
  allDone: boolean;
  automaticProgress: { current: number; threshold: number; remaining: number };
}

export interface BusinessOverviewResponse {
  business: BusinessRecordView;
  plan: BusinessPlanView;
  access: PlanAccess;
  canCreateGroups: boolean;
  creationRightsLabel: string;
  stats: GroupStatsView & {
    networkLists: number;
    networkContacts: number;
    pendingContacts: number;
    circles: number;
    programmes: number;
  };
  mandatoryGroups: MandatoryGroupStatusView[];
  mandatoryCircles: Array<{
    circleType: string;
    required: boolean;
    satisfied: boolean;
    circleId?: string;
    current: number;
    totalCircles: number;
  }>;
  automaticProgress: AutomaticProgressView;
  headStartGroups: BusinessGroup[];
  platformGroup: BusinessGroup | null;
  recentActivity: Array<GroupActivity & { groupName: string }>;
  invitations: Invitation[];
  programme: ProgrammeRecord | null;
  relationships: {
    accountManager: RelationshipRecord | null;
    agent: RelationshipRecord | null;
    consultant: RelationshipRecord | null;
  };
}

// ---------------------------------------------------------------------------
// Requests
// ---------------------------------------------------------------------------

function queryString(params: Record<string, string | number | undefined>): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") query.set(key, String(value));
  }
  const serialized = query.toString();
  return serialized ? `?${serialized}` : "";
}

export const businessApi = {
  // Groups
  dashboard: () => apiRequest<Omit<BusinessDashboard, "explore" | "network">>(
    "/business/groups/dashboard",
  ),
  mine: (section?: string) =>
    apiRequest<
      | { section: string; items: BusinessGroup[]; counts: Record<string, number> }
      | BusinessDashboard
    >(section ? `/business/groups/mine/${section}` : "/business/groups/mine"),
  explore: (params: {
    search?: string;
    type?: string;
    city?: string;
    localArea?: string;
    pricing?: string;
    status?: string;
    page?: number;
    limit?: number;
  } = {}) =>
    apiRequest<ExploreGroupsResponse>(
      `/business/groups/explore${queryString(params)}`,
    ),
  network: () => apiRequest<NetworkGroupResponse>("/business/groups/network"),
  createGroup: (body: Record<string, unknown>) =>
    apiRequest<BusinessGroup>("/business/groups", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  group: (id: string) =>
    apiRequest<{
      group: BusinessGroup;
      owner: BusinessRecordView | null;
      programme: ProgrammeRecord | null;
      campaigns: CampaignRecord[];
      relationships: {
        accountManager: RelationshipRecord | null;
        agent: RelationshipRecord | null;
        consultant: RelationshipRecord | null;
      };
      activity: GroupActivity[];
      counts: {
        members: number;
        activity: number;
        pendingInvitations: number;
        pendingRequests: number;
        circles: number;
      };
      circles: GroupCircle[];
    }>(`/business/groups/${id}`),
  updateGroup: (id: string, body: Record<string, unknown>) =>
    apiRequest<BusinessGroup>(`/business/groups/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  joinGroup: (id: string) =>
    apiRequest<
      | { status: "joined"; group: BusinessGroup }
      | { status: "requested"; invitation: Invitation }
    >(`/business/groups/${id}/join`, { method: "POST" }),
  leaveGroup: (id: string) =>
    apiRequest<{ ok: boolean }>(`/business/groups/${id}/leave`, { method: "POST" }),
  groupMembers: (id: string) =>
    apiRequest<{
      group: BusinessGroup;
      members: BusinessMember[];
      stats: {
        total: number;
        active: number;
        core: number;
        peripheral: number;
        bankers: number;
        pendingInvitations: number;
      };
    }>(`/business/groups/${id}/members`),
  removeGroupMember: (id: string, memberId: string) =>
    apiRequest<{ ok: boolean }>(
      `/business/groups/${id}/members/${encodeURIComponent(memberId)}`,
      { method: "DELETE" },
    ),
  groupActivity: (id: string) =>
    apiRequest<GroupActivity[]>(`/business/groups/${id}/activity`),
  groupInvitations: (id: string) =>
    apiRequest<Invitation[]>(`/business/groups/${id}/invitations`),
  invite: (
    id: string,
    entries: Array<{
      inviteeId?: string;
      inviteeName: string;
      inviteeEmail?: string;
      inviteePhone?: string;
      inviteeRole?: string;
    }>,
  ) =>
    apiRequest<{ invitations: Invitation[]; created: number; skipped: number }>(
      `/business/groups/${id}/invitations`,
      { method: "POST", body: JSON.stringify({ entries }) },
    ),

  // Invitations
  invitations: (params: {
    tab?: string;
    status?: string;
    groupId?: string;
    page?: number;
    limit?: number;
  } = {}) =>
    apiRequest<InvitationListResponse>(
      `/business/invitations${queryString(params)}`,
    ),
  invitation: (id: string) =>
    apiRequest<InvitationDetailResponse>(
      `/business/invitations/${encodeURIComponent(id)}`,
    ),
  respondInvitation: (id: string, accept: boolean) =>
    apiRequest<{
      invitation: Invitation;
      group: Group | null;
      circle: BusinessCircle | null;
    }>(`/business/invitations/${encodeURIComponent(id)}/respond`, {
      method: "POST",
      body: JSON.stringify({ accept }),
    }),
  cancelInvitation: (id: string) =>
    apiRequest<{ invitation: Invitation; ok: boolean }>(
      `/business/invitations/${encodeURIComponent(id)}/cancel`,
      { method: "POST" },
    ),
  resendInvitation: (id: string) =>
    apiRequest<{ invitation: Invitation; resent: boolean }>(
      `/business/invitations/${encodeURIComponent(id)}/resend`,
      { method: "POST" },
    ),

  // Network lists / contacts
  networkLists: () =>
    apiRequest<NetworkListsResponse>("/business/network/lists"),
  networkList: (id: string) =>
    apiRequest<NetworkListResponse>(
      `/business/network/lists/${encodeURIComponent(id)}`,
    ),
  createNetworkList: (body: Record<string, unknown>) =>
    apiRequest<NetworkListResponse>("/business/network/lists", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  updateNetworkList: (id: string, body: Record<string, unknown>) =>
    apiRequest<NetworkListResponse>(
      `/business/network/lists/${encodeURIComponent(id)}`,
      { method: "PATCH", body: JSON.stringify(body) },
    ),
  removeNetworkList: (id: string) =>
    apiRequest<{ ok: boolean }>(
      `/business/network/lists/${encodeURIComponent(id)}`,
      { method: "DELETE" },
    ),
  contacts: (params: {
    listId?: string;
    search?: string;
    confirmation?: string;
    page?: number;
    limit?: number;
  } = {}) =>
    apiRequest<PageResult<NetworkContact>>(
      `/business/network/contacts${queryString(params)}`,
    ),
  createContact: (body: Record<string, unknown>) =>
    apiRequest<NetworkContact>("/business/network/contacts", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  confirmContact: (id: string, consent?: boolean) =>
    apiRequest<NetworkContact>(
      `/business/network/contacts/${encodeURIComponent(id)}/confirm`,
      { method: "POST", body: JSON.stringify({ consent }) },
    ),
  removeContact: (id: string) =>
    apiRequest<{ ok: boolean }>(
      `/business/network/contacts/${encodeURIComponent(id)}`,
      { method: "DELETE" },
    ),
  networkStats: () =>
    apiRequest<NetworkListsResponse["stats"]>("/business/network/stats"),

  // Circles
  circles: (params: {
    search?: string;
    type?: string;
    status?: string;
    page?: number;
    limit?: number;
  } = {}) =>
    apiRequest<CircleListResponse>(
      `/business/circles${queryString(params)}`,
    ),
  circle: (id: string) =>
    apiRequest<CircleDetailResponse>(
      `/business/circles/${encodeURIComponent(id)}`,
    ),
  createCircle: (body: Record<string, unknown>) =>
    apiRequest<CircleDetailResponse>("/business/circles", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  updateCircle: (id: string, body: Record<string, unknown>) =>
    apiRequest<CircleDetailResponse>(
      `/business/circles/${encodeURIComponent(id)}`,
      { method: "PATCH", body: JSON.stringify(body) },
    ),
  removeCircle: (id: string) =>
    apiRequest<{ ok: boolean }>(
      `/business/circles/${encodeURIComponent(id)}`,
      { method: "DELETE" },
    ),
  circleActivity: (id: string) =>
    apiRequest<CircleActivityView[]>(
      `/business/circles/${encodeURIComponent(id)}/activity`,
    ),
  addCircleMember: (id: string, memberId: string) =>
    apiRequest<CircleDetailResponse>(
      `/business/circles/${encodeURIComponent(id)}/members`,
      { method: "POST", body: JSON.stringify({ memberId }) },
    ),
  removeCircleMember: (id: string, memberId: string) =>
    apiRequest<CircleDetailResponse>(
      `/business/circles/${encodeURIComponent(id)}/members/${encodeURIComponent(memberId)}`,
      { method: "DELETE" },
    ),

  // Platform / account
  overview: () => apiRequest<BusinessOverviewResponse>("/business/overview"),
  profile: () => apiRequest<BusinessProfileView>("/business/profile"),
  config: () => apiRequest<BusinessConfig>("/business/config"),
  plan: () =>
    apiRequest<BusinessPlanResponse>("/business/plan"),
  activatePlan: (body: Record<string, unknown>) =>
    apiRequest<{
      plan: BusinessPlanView;
      access: PlanAccess;
      canCreateGroups: boolean;
    }>("/business/plan/activate", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  journey: () => apiRequest<BusinessJourneyResponse>("/business/journey"),
  directory: (params: {
    search?: string;
    city?: string;
    category?: string;
    excludeGroupId?: string;
    page?: number;
    limit?: number;
  } = {}) =>
    apiRequest<
      PageResult<{
        id: string;
        name: string;
        contactName: string;
        email: string;
        city: string;
        category: string;
        joinedAt?: string;
      }>
    >(`/business/directory${queryString(params)}`),
  locations: () =>
    apiRequest<BusinessLocationsResponse>("/business/locations"),
  programmes: () =>
    apiRequest<BusinessProgrammesResponse>("/business/programmes"),
  campaigns: (params: { status?: string; groupId?: string; page?: number; limit?: number } = {}) =>
    apiRequest<BusinessCampaignsResponse>(
      `/business/campaigns${queryString(params)}`,
    ),
  rewards: (params: { category?: string; search?: string; page?: number; limit?: number } = {}) =>
    apiRequest<BusinessRewardsResponse>(
      `/business/rewards${queryString(params)}`,
    ),
  claimReward: (id: string) =>
    apiRequest<RewardDealView>(`/business/rewards/${encodeURIComponent(id)}/claim`, {
      method: "POST",
    }),
  community: () =>
    apiRequest<BusinessCommunityResponse>("/business/community"),
  location: () => apiRequest<BusinessLocationResponse>("/business/location"),
};
