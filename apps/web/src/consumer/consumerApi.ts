import { apiRequest } from "../app/api";

export interface ConsumerGroupResponse {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  visibility: string;
  location: string | null;
  type: string;
  purpose: string;
  city: string | null;
  localArea: string | null;
  ownerId: string | null;
  ownerName: string;
  requiredSize: number | null;
  memberCount: number;
  status: string;
  accessType: string;
  directoryVisibility: string | null;
  interactionLevel: string | null;
  pricing?: string;
  contribution?: number | null;
  contributionMinor?: number | null;
  contributionFrequency?: string | null;
  requiredPlanIds?: string[];
  createdAt: string;
  membership?: {
    memberId: string;
    groupId: string;
    role: string;
    joinedAt: string;
    status: string;
  };
}

export interface ConsumerGroupDetail extends ConsumerGroupResponse {
  members: Array<{
    id: string;
    memberId: string;
    fullName: string;
    role: string;
    status: string;
    joinedAt: string;
  }>;
  joined: boolean;
}

export interface ConsumerGroupActivity {
  id: string;
  groupId: string;
  actorName: string;
  kind: string;
  message: string;
  at: string;
}

export interface ConsumerInvitationResponse {
  id: string;
  groupId: string | null;
  circleId: string | null;
  direction: string;
  kind: string;
  inviteeId: string | null;
  inviteeName: string;
  inviteeEmail: string | null;
  inviteePhone: string | null;
  inviteeRole: string | null;
  invitedById: string;
  invitedByName: string;
  status: string;
  createdAt: string;
  respondedAt: string | null;
  groupName?: string | null;
  circleName?: string | null;
  circleBusinessName?: string | null;
}

export interface ConsumerInvitationDetail extends ConsumerInvitationResponse {
  group: ConsumerGroupResponse | null;
}

export interface ConsumerCircleResponse {
  id: string;
  type: string;
  name: string;
  config: Record<string, unknown>;
  memberIds: string[];
  memberCount: number;
  businessId: string | null;
  businessName: string | null;
  createdAt: string;
}

export interface ConsumerCircleDetail extends ConsumerCircleResponse {
  members: Array<{
    id: string;
    name: string;
    avatarUrl?: string | null;
  }>;
  activities: Array<{
    id: string;
    circleId: string;
    memberId: string | null;
    kind: string;
    message: string;
    at: string;
  }>;
}

export interface ConsumerProfilePreferences {
  emailUpdates: boolean;
  localDiscovery: boolean;
  profileVisible: boolean;
}

export interface ConsumerProfile {
  id: string;
  email: string;
  name: string;
  firstName?: string | null;
  lastName?: string | null;
  avatarUrl?: string | null;
  phone?: string | null;
  address?: string | null;
  postcode?: string | null;
  city?: string | null;
  country?: string | null;
  preferences: ConsumerProfilePreferences;
}

/** Local-only communication preferences; identity data is owned by Central Hub. */
export type ConsumerPreferencesUpdate = Partial<ConsumerProfilePreferences>;

export interface ConsumerDashboard {
  profile: ConsumerProfile;
  groups: ConsumerGroupResponse[];
  invitations: ConsumerInvitationResponse[];
  stats: { joinedGroups: number; pendingInvitations: number };
}

export interface PublicInvitationResponse {
  id: string;
  status: string;
  kind: string;
  invitedById: string;
  invitedByName: string;
  inviteeRole: string | null;
  createdAt: string;
  respondedAt: string | null;
  group: ConsumerGroupResponse | null;
  circle: {
    id: string;
    name: string;
    type: string;
    businessId: string;
    businessName: string;
    memberCount: number;
    createdAt: string;
  } | null;
}

export const consumerApi = {
  profile: () => apiRequest<ConsumerProfile>("/consumer/profile"),
  updatePreferences: (body: ConsumerPreferencesUpdate) =>
    apiRequest<ConsumerProfile>("/consumer/preferences", {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  dashboard: () => apiRequest<ConsumerDashboard>("/consumer/dashboard"),
  groups: () => apiRequest<ConsumerGroupResponse[]>("/consumer/groups"),
  explore: (params: { city?: string; search?: string } = {}) => {
    const query = new URLSearchParams();
    if (params.city) query.set("city", params.city);
    if (params.search) query.set("search", params.search);
    const suffix = query.toString() ? `?${query.toString()}` : "";
    return apiRequest<ConsumerGroupResponse[]>(`/consumer/groups/explore${suffix}`);
  },
  group: (id: string) =>
    apiRequest<ConsumerGroupDetail>(`/consumer/groups/${encodeURIComponent(id)}`),
  groupActivity: (id: string) =>
    apiRequest<ConsumerGroupActivity[]>(
      `/consumer/groups/${encodeURIComponent(id)}/activity`,
    ),
  join: (id: string) =>
    apiRequest<ConsumerGroupDetail>(`/consumer/groups/${encodeURIComponent(id)}/join`, {
      method: "PATCH",
    }),
  leave: (id: string) =>
    apiRequest<{ ok: boolean }>(`/consumer/groups/${encodeURIComponent(id)}/leave`, {
      method: "DELETE",
    }),
  postActivity: (id: string, message: string) =>
    apiRequest<ConsumerGroupActivity>(
      `/consumer/groups/${encodeURIComponent(id)}/activity`,
      { method: "POST", body: JSON.stringify({ message }) },
    ),
  invitations: (status?: string) =>
    apiRequest<ConsumerInvitationResponse[]>(
      `/consumer/invitations${status ? `?status=${encodeURIComponent(status)}` : ""}`,
    ),
  invitation: (id: string) =>
    apiRequest<ConsumerInvitationDetail>(
      `/consumer/invitations/${encodeURIComponent(id)}`,
    ),
  respondInvitation: (id: string, accept: boolean) =>
    apiRequest<ConsumerInvitationResponse>(
      `/consumer/invitations/${encodeURIComponent(id)}/respond`,
      { method: "PATCH", body: JSON.stringify({ accept }) },
    ),
  circles: () => apiRequest<ConsumerCircleResponse[]>("/consumer/circles"),
  circle: (id: string) =>
    apiRequest<ConsumerCircleDetail>(`/consumer/circles/${encodeURIComponent(id)}`),
};

export const publicInvitationApi = {
  get: (id: string) =>
    apiRequest<PublicInvitationResponse>(
      `/invitations/public/${encodeURIComponent(id)}`,
    ),
};
