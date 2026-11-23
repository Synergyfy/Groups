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

export interface AdminGeographyLocalMall {
  id: string;
  cityId: string | null;
  boroughId: string | null;
  highStreetId: string | null;
  name: string;
  slug: string;
  borough: string;
  postcodes: string[];
  status: string;
}

export interface AdminGeographyHighStreet {
  id: string;
  cityId: string | null;
  boroughId: string | null;
  name: string;
  borough: string;
  lat: number | null;
  lng: number | null;
  gssCode: string | null;
  localMalls: AdminGeographyLocalMall[];
}

export interface AdminGeographyBorough {
  id: string;
  cityId: string | null;
  name: string;
  gssCode: string | null;
  highStreetCount: number;
  localMallCount: number;
}

export interface AdminGeographyBoroughDetail {
  available: boolean;
  boroughId: string;
  highStreets: AdminGeographyHighStreet[];
  localMalls: AdminGeographyLocalMall[];
}

export interface AdminGeographyCity {
  id: string;
  name: string;
  region: string | null;
  country: string;
  gssCode: string | null;
  boroughs: AdminGeographyBorough[];
}

export interface AdminGeographyResponse {
  available: boolean;
  version: number | null;
  syncedAt: string | null;
  counts: {
    cities: number;
    boroughs: number;
    highStreets: number;
    localMalls: number;
  };
  cities: AdminGeographyCity[];
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

export interface AdminMcomBalance {
  currency: string;
  payableMinor: string;
  pendingPayoutMinor: string;
  availableMinor: string;
  paidOutMinor: string;
}

export interface AdminPaymentRow {
  id: string;
  purpose: string;
  status: string;
  method: string;
  amountMinor: string;
  feeMinor: string | null;
  netMinor: string | null;
  refundedMinor: string;
  currency: string;
  reference: string;
  mcomChargeId: string | null;
  provider: string | null;
  providerRef: string | null;
  intent: string | null;
  payee: { type: string; id: string; name: string } | null;
  payer: { id: string; name: string; email: string } | null;
  group: { id: string; name: string } | null;
  planName: string | null;
  failureCode: string | null;
  failureMessage: string | null;
  paidAt: string | null;
  createdAt: string;
  settlementState?: string | null;
}

export interface AdminPaymentOverview {
  balance:
    | { available: true; data: AdminMcomBalance }
    | { available: false; data: null; message: string };
  summary: {
    grossMinor: string;
    refundedMinor: string;
    netMinor: string;
    currency: string;
  };
  byStatus: Array<{
    status: string;
    count: number;
    amountMinor: string;
    refundedMinor: string;
  }>;
  recent: AdminPaymentRow[];
}

export interface AdminPaymentList {
  data: AdminPaymentRow[];
  page: number;
  limit: number;
  total: number;
}

export interface AdminPaymentSplits {
  chargeId: string;
  settlementState: string;
  splits: Array<{
    id: string;
    payeeType: string;
    payeeUserId: string | null;
    payeeExternalId: string | null;
    amountMinor: string;
    feeMinor: string;
    netMinor: string;
    status: string;
    walletTransactionId: string | null;
    failureReason: string | null;
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

  geography: () => apiRequest<AdminGeographyResponse>("/admin/geography"),
  geographyBorough: (boroughId: string) =>
    apiRequest<AdminGeographyBoroughDetail>(
      `/admin/geography/boroughs/${encodeURIComponent(boroughId)}`,
    ),
  syncGeography: () =>
    apiRequest<AdminGeographyResponse>("/admin/geography/sync", {
      method: "POST",
    }),

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

  paymentOverview: () =>
    apiRequest<AdminPaymentOverview>("/admin/payments/overview"),
  payments: (filters: Record<string, string | undefined> = {}) =>
    apiRequest<AdminPaymentList>(`/admin/payments/charges${query(filters)}`),
  paymentSplits: (id: string) =>
    apiRequest<AdminPaymentSplits>(
      `/admin/payments/charges/${encodeURIComponent(id)}/splits`,
    ),
  refundPayment: (
    id: string,
    body: { amountMinor?: string; reason?: string },
  ) =>
    apiRequest<{ payment: AdminPaymentRow; refund: unknown }>(
      `/admin/payments/charges/${encodeURIComponent(id)}/refund`,
      { method: "POST", body: JSON.stringify(body) },
    ),
};

export type AdminAccounts = PlatformAccount[];
