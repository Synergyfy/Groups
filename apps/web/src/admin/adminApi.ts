import { apiRequest } from "../app/api";
import type {
  AdminConfig,
  AuditLogEntry,
  Group,
  GroupActivity,
  GroupCircle,
  Invitation,
  Plan,
  PlatformAccount,
} from "../domain/types";

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  status: string;
  verified: boolean;
  registeredAt?: string;
  source: string;
}

export type DealCategory = "voucher" | "gift-card" | "coupon" | "incentive";

export interface RewardDeal {
  id: string;
  title: string;
  category: DealCategory;
  discountValue: string;
  code?: string;
  targetAudience: "All Users" | "Consumers Only" | "Business Owners" | "Gold & Platinum";
  liveOnFrontend: boolean;
  status: "Active" | "Draft" | "Expired";
  expiryDate: string;
  claimsCount: number;
  maxClaims: number;
  sponsorBusiness: string;
}

export interface AdminOverview {
  metrics: {
    businessOwners: number;
    consumers: number;
    totalGroups: number;
    invitations: number;
    activeMemberships: number;
    pendingRequests: number;
    pendingReviewGroups: number;
    pendingInvites: number;
    partners: number;
    activePartners: number;
  };
  groupsByType: Array<{ label: string; value: number }>;
  groupsByStatus: Array<{ label: string; value: number; color: string }>;
  recentActivity: AuditLogEntry[];
}

export interface AdminSettingsReport {
  stats: {
    registeredEntities: number;
    totalPlanSubscribers: number;
    programmeMonthlyFees?: number;
    partnerMonthlyFees?: number;
    invitationsSent: number;
    invitationConversion: number;
  };
  growth: Array<{ label: string; value: number }>;
  invitationBreakdown: Array<{
    label: string;
    value: number;
    color: string;
  }>;
  completeness: Array<{ id: string; title: string; status: string }>;
}

export interface AdminConfigResponse extends AdminConfig {
  accessRules?: Record<string, unknown>;
  platformSettings?: Record<string, unknown>;
}

export interface AdminGroupContribution {
  groupId: string;
  pricing: string;
  amount: number;
  frequency: string;
  collected: number;
  outstanding: number;
  rows: Array<{
    memberId: string;
    fullName: string;
    status: string;
    amount: number;
    paidAt?: string | null;
  }>;
}

const query = (params: Record<string, string | undefined>) => {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "" && value !== "all") {
      search.set(key, value);
    }
  }
  const value = search.toString();
  return value ? `?${value}` : "";
};

export const adminApi = {
  overview: () => apiRequest<AdminOverview>("/admin/overview"),

  users: (search?: string) =>
    apiRequest<AdminUser[]>(`/admin/users${query({ search })}`),
  user: (id: string) => apiRequest<AdminUser>(`/admin/users/${id}`),
  updateUser: (id: string, patch: Record<string, unknown>) =>
    apiRequest<AdminUser>(`/admin/users/${id}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    }),
  registrations: () =>
    apiRequest<
      Array<{
        id: string;
        name: string;
        email: string;
        role: string;
        source: string;
        registeredAt?: string;
      }>
    >("/admin/users/registrations"),

  groups: (filters: Record<string, string | undefined> = {}) =>
    apiRequest<Group[]>(`/admin/groups${query(filters)}`),
  group: (id: string) => apiRequest<Group>(`/admin/groups/${id}`),
  groupDashboard: () => apiRequest<Record<string, unknown>>("/admin/groups/dashboard"),
  groupHub: () =>
    apiRequest<{
      groups: Group[];
      invitations: Invitation[];
      stats: Record<string, number>;
    }>("/admin/groups/hub"),
  createGroup: (body: Record<string, unknown>) =>
    apiRequest<Group>("/admin/groups", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  updateGroup: (id: string, patch: Record<string, unknown>) =>
    apiRequest<Group>(`/admin/groups/${id}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    }),
  deleteGroup: (id: string) =>
    apiRequest<{ ok: boolean }>(`/admin/groups/${id}`, { method: "DELETE" }),
  approveGroup: (id: string) =>
    apiRequest<Group>(`/admin/groups/${id}/approve`, { method: "POST" }),
  suspendGroup: (id: string) =>
    apiRequest<Group>(`/admin/groups/${id}/suspend`, { method: "POST" }),
  closeGroup: (id: string) =>
    apiRequest<Group>(`/admin/groups/${id}/close`, { method: "POST" }),
  groupMembers: (id: string) =>
    apiRequest<unknown[]>(`/admin/groups/${id}/members`),
  addGroupMember: (id: string, body: Record<string, unknown>) =>
    apiRequest<unknown>(`/admin/groups/${id}/members`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  removeGroupMember: (id: string, memberId: string) =>
    apiRequest<{ ok: boolean }>(`/admin/groups/${id}/members/${memberId}`, {
      method: "DELETE",
    }),
  updateGroupMemberContribution: (
    id: string,
    memberId: string,
    status: "paid" | "pending" | "overdue" | "n/a",
  ) =>
    apiRequest<unknown>(
      `/admin/groups/${id}/members/${encodeURIComponent(memberId)}/contribution`,
      { method: "PATCH", body: JSON.stringify({ status }) },
    ),
  circles: () => apiRequest<GroupCircle[]>("/admin/circles"),
  groupActivity: (id: string) =>
    apiRequest<GroupActivity[]>(`/admin/groups/${id}/activity`),
  groupContribution: (id: string) =>
    apiRequest<AdminGroupContribution>(`/admin/groups/${id}/contribution`),
  groupCircles: (id: string) =>
    apiRequest<GroupCircle[]>(`/admin/groups/${id}/circles`),
  groupInvitations: (id: string) =>
    apiRequest<Invitation[]>(`/admin/groups/${id}/invitations`),

  plans: () => apiRequest<Plan[]>("/admin/plans"),
  planStats: () =>
    apiRequest<{
      totalPlans: number;
      activePlans: number;
      totalSubscribers: number;
      monthlyRecurringRunRate: number;
    }>("/admin/plans/stats"),
  createPlan: (body: Record<string, unknown>) =>
    apiRequest<Plan[]>("/admin/plans", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  updatePlan: (id: string, patch: Record<string, unknown>) =>
    apiRequest<Plan>(`/admin/plans/${id}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    }),
  deletePlan: (id: string) =>
    apiRequest<{ ok: boolean }>(`/admin/plans/${id}`, {
      method: "DELETE",
    }),

  rewards: () => apiRequest<RewardDeal[]>("/admin/rewards-deals"),
  rewardStats: () =>
    apiRequest<{
      totalDeals: number;
      liveOnFrontend: number;
      totalRedemptions: number;
      frontendDelivery: string;
    }>("/admin/rewards-deals/stats"),
  createReward: (body: Record<string, unknown>) =>
    apiRequest<RewardDeal>("/admin/rewards-deals", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  updateReward: (id: string, patch: Record<string, unknown>) =>
    apiRequest<RewardDeal>(`/admin/rewards-deals/${id}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    }),
  deleteReward: (id: string) =>
    apiRequest<{ ok: boolean }>(`/admin/rewards-deals/${id}`, {
      method: "DELETE",
    }),

  invitations: () => apiRequest<Invitation[]>("/admin/invitations"),
  invitationCounts: () =>
    apiRequest<{
      total: number;
      pending: number;
      accepted: number;
      declined: number;
      cancelled: number;
    }>("/admin/invitations/counts"),
  approveInvitation: (id: string) =>
    apiRequest<Invitation>(`/admin/invitations/${id}/approve`, {
      method: "POST",
    }),
  declineInvitation: (id: string) =>
    apiRequest<Invitation>(`/admin/invitations/${id}/decline`, {
      method: "POST",
    }),
  cancelInvitation: (id: string) =>
    apiRequest<Invitation>(`/admin/invitations/${id}/cancel`, {
      method: "POST",
    }),

  config: () => apiRequest<AdminConfigResponse>("/admin/config"),
  patchConfig: (patch: Record<string, unknown>) =>
    apiRequest<AdminConfigResponse>("/admin/config", {
      method: "PATCH",
      body: JSON.stringify(patch),
    }),
  settingsReport: () =>
    apiRequest<AdminSettingsReport>("/admin/settings-reports"),
};

export type AdminAccounts = PlatformAccount[];
