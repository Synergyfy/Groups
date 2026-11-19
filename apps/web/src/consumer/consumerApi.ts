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
  memberCount: number;
  status: string;
  accessType: string;
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
  country?: string | null;
}

export interface ConsumerDashboard {
  profile: ConsumerProfile;
  groups: ConsumerGroupResponse[];
  invitations: ConsumerInvitationResponse[];
  stats: { joinedGroups: number; pendingInvitations: number };
}

export const consumerApi = {
  profile: () => apiRequest<ConsumerProfile>("/consumer/profile"),
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
  join: (id: string) =>
    apiRequest<ConsumerGroupDetail>(`/consumer/groups/${encodeURIComponent(id)}/join`, {
      method: "PATCH",
    }),
  leave: (id: string) =>
    apiRequest<{ ok: boolean }>(`/consumer/groups/${encodeURIComponent(id)}/leave`, {
      method: "DELETE",
    }),
  invitations: (status?: string) =>
    apiRequest<ConsumerInvitationResponse[]>(
      `/consumer/invitations${status ? `?status=${encodeURIComponent(status)}` : ""}`,
    ),
  respondInvitation: (id: string, accept: boolean) =>
    apiRequest<ConsumerInvitationResponse>(
      `/consumer/invitations/${encodeURIComponent(id)}/respond`,
      { method: "PATCH", body: JSON.stringify({ accept }) },
    ),
};
