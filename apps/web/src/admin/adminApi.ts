import { apiRequest } from "../app/api";
import type {
  AdminConfig,
  AuditLogEntry,
  BusinessRecord,
  CampaignRecord,
  Group,
  GroupActivity,
  GroupCircle,
  Invitation,
  LocationHierarchy,
  Plan,
  PartnerRecord,
  PlatformAccount,
  ProgrammeRecord,
  RelationshipRecord,
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

export interface AdminContentSection {
  id: string;
  label: string;
  draft: Record<string, unknown>;
  published: Record<string, unknown>;
  status: string;
  publishedAt?: string;
  updatedAt?: string;
}

export interface AdminReportSchedule {
  id: string;
  name: string;
  type: string;
  frequency: string;
  recipients: string[];
  status: string;
  lastRunAt?: string;
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

export interface AdminGroupReport {
  stats: {
    groups: number;
    members: number;
    businesses: number;
    citiesCovered: number;
  };
  originDistribution: Array<{ label: string; value: number }>;
  growth: Array<{ label: string; value: number }>;
  groupsByType: Array<{ label: string; value: number }>;
  groupsByCity: Array<{ label: string; value: number }>;
  typeTotals: Array<{
    type: string;
    total: number;
    origin: { automatic: number; userCreated: number };
  }>;
}

export interface AdminSettingsReport {
  stats: {
    registeredEntities: number;
    totalPlanSubscribers: number;
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

export interface AdminPartnerGroups {
  groups: Group[];
  partners: PartnerRecord[];
  programme: ProgrammeRecord | null;
  metrics: { partnerGroups: number; members: number };
}

export interface AdminPermissions {
  partnerDefaults: Record<string, unknown>;
  groups: Record<string, string[]>;
}

export interface AdminGroupRelationships {
  group: Group;
  owner: BusinessRecord | null;
  programme: ProgrammeRecord | null;
  campaigns: CampaignRecord[];
  accountManager: RelationshipRecord | null;
  agent: RelationshipRecord | null;
  consultant: RelationshipRecord | null;
  location: { city: string | null; localArea: string | null };
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
  groupRelationships: (id: string) =>
    apiRequest<AdminGroupRelationships>(`/admin/groups/${id}/relationships`),
  updateGroupRelationships: (id: string, patch: Record<string, unknown>) =>
    apiRequest<Group>(`/admin/groups/${id}/relationships`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    }),
  groupContribution: (id: string) =>
    apiRequest<AdminGroupContribution>(`/admin/groups/${id}/contribution`),
  groupCircles: (id: string) =>
    apiRequest<GroupCircle[]>(`/admin/groups/${id}/circles`),
  groupInvitations: (id: string) =>
    apiRequest<Invitation[]>(`/admin/groups/${id}/invitations`),

  businesses: (search?: string) =>
    apiRequest<BusinessRecord[]>(`/admin/businesses${query({ search })}`),
  business: (id: string) =>
    apiRequest<BusinessRecord & { groups: Group[] }>(`/admin/businesses/${id}`),
  createBusiness: (body: Record<string, unknown>) =>
    apiRequest<BusinessRecord>("/admin/businesses", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  updateBusiness: (id: string, patch: Record<string, unknown>) =>
    apiRequest<BusinessRecord>(`/admin/businesses/${id}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    }),
  deleteBusiness: (id: string) =>
    apiRequest<{ ok: boolean }>(`/admin/businesses/${id}`, {
      method: "DELETE",
    }),
  verifyBusiness: (id: string) =>
    apiRequest<BusinessRecord>(`/admin/businesses/${id}/verify`, {
      method: "POST",
    }),
  suspendBusiness: (id: string) =>
    apiRequest<BusinessRecord>(`/admin/businesses/${id}/suspend`, {
      method: "POST",
    }),

  partners: (search?: string) =>
    apiRequest<PartnerRecord[]>(`/admin/partners${query({ search })}`),
  partner: (id: string) => apiRequest<PartnerRecord>(`/admin/partners/${id}`),
  createPartner: (body: Record<string, unknown>) =>
    apiRequest<PartnerRecord>("/admin/partners", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  updatePartner: (id: string, patch: Record<string, unknown>) =>
    apiRequest<PartnerRecord>(`/admin/partners/${id}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    }),
  deletePartner: (id: string) =>
    apiRequest<{ ok: boolean }>(`/admin/partners/${id}`, { method: "DELETE" }),
  partnerGroups: () => apiRequest<AdminPartnerGroups>("/admin/partner-groups"),

  programmes: () => apiRequest<ProgrammeRecord[]>("/admin/programmes"),
  createProgramme: (body: Record<string, unknown>) =>
    apiRequest<ProgrammeRecord>("/admin/programmes", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  updateProgramme: (id: string, patch: Record<string, unknown>) =>
    apiRequest<ProgrammeRecord>(`/admin/programmes/${id}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    }),
  deleteProgramme: (id: string) =>
    apiRequest<{ ok: boolean }>(`/admin/programmes/${id}`, {
      method: "DELETE",
    }),

  campaigns: () => apiRequest<CampaignRecord[]>("/admin/campaigns"),
  createCampaign: (body: Record<string, unknown>) =>
    apiRequest<CampaignRecord>("/admin/campaigns", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  updateCampaign: (id: string, patch: Record<string, unknown>) =>
    apiRequest<CampaignRecord>(`/admin/campaigns/${id}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    }),
  deleteCampaign: (id: string) =>
    apiRequest<{ ok: boolean }>(`/admin/campaigns/${id}`, { method: "DELETE" }),

  relationships: () => apiRequest<RelationshipRecord[]>("/admin/relationships"),
  createRelationship: (body: Record<string, unknown>) =>
    apiRequest<RelationshipRecord>("/admin/relationships", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  updateRelationship: (id: string, patch: Record<string, unknown>) =>
    apiRequest<RelationshipRecord>(`/admin/relationships/${id}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    }),
  deleteRelationship: (id: string) =>
    apiRequest<{ ok: boolean }>(`/admin/relationships/${id}`, {
      method: "DELETE",
    }),

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

  pendingReview: () => apiRequest<Group[]>("/admin/pending-review"),
  approvePending: (id: string) =>
    apiRequest<Group>(`/admin/pending-review/${id}/approve`, {
      method: "POST",
    }),
  rejectPending: (id: string) =>
    apiRequest<Group>(`/admin/pending-review/${id}/reject`, {
      method: "POST",
    }),

  auditLog: () => apiRequest<AuditLogEntry[]>("/admin/audit-log"),

  config: () => apiRequest<AdminConfigResponse>("/admin/config"),
  patchConfig: (patch: Record<string, unknown>) =>
    apiRequest<AdminConfigResponse>("/admin/config", {
      method: "PATCH",
      body: JSON.stringify(patch),
    }),
  configField: <T>(field: string) => apiRequest<T>(`/admin/config/${field}`),
  permissions: () => apiRequest<AdminPermissions>("/admin/permissions"),
  accessRules: () =>
    apiRequest<Record<string, unknown>>("/admin/access-rules"),
  platformSettings: () =>
    apiRequest<Record<string, unknown>>("/admin/settings"),

  locations: () => apiRequest<LocationHierarchy>("/admin/locations"),
  createCity: (name: string) =>
    apiRequest<{ id: string; name: string }>("/admin/locations/cities", {
      method: "POST",
      body: JSON.stringify({ name }),
    }),
  updateCity: (id: string, name: string) =>
    apiRequest<{ id: string; name: string }>(`/admin/locations/cities/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ name }),
    }),
  deleteCity: (id: string) =>
    apiRequest<{ ok: boolean }>(`/admin/locations/cities/${id}`, {
      method: "DELETE",
    }),
  createArea: (cityId: string, name: string) =>
    apiRequest<{ id: string; name: string }>(
      `/admin/locations/cities/${cityId}/areas`,
      { method: "POST", body: JSON.stringify({ name }) },
    ),
  updateArea: (id: string, name: string) =>
    apiRequest<{ id: string; name: string }>(`/admin/locations/areas/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ name }),
    }),
  deleteArea: (id: string) =>
    apiRequest<{ ok: boolean }>(`/admin/locations/areas/${id}`, {
      method: "DELETE",
    }),

  content: () => apiRequest<AdminContentSection[]>("/admin/content"),
  contentStatus: () =>
    apiRequest<{
      published: boolean;
      total: number;
      publishedCount: number;
      lastPublishedAt?: string;
    }>("/admin/content/status"),
  contentSection: (id: string) =>
    apiRequest<AdminContentSection>(`/admin/content/${id}`),
  updateContent: (id: string, patch: Record<string, unknown>) =>
    apiRequest<AdminContentSection>(`/admin/content/${id}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    }),
  publishContent: (id: string) =>
    apiRequest<AdminContentSection>(`/admin/content/${id}/publish`, {
      method: "POST",
    }),
  publishAllContent: () =>
    apiRequest<{ ok: boolean; published: number }>("/admin/content/publish-all", {
      method: "POST",
    }),

  report: () => apiRequest<AdminGroupReport>("/admin/reports"),
  reportSchedules: () =>
    apiRequest<AdminReportSchedule[]>("/admin/reports/schedules"),
  createReportSchedule: (body: Record<string, unknown>) =>
    apiRequest<AdminReportSchedule>("/admin/reports/schedules", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  updateReportSchedule: (id: string, patch: Record<string, unknown>) =>
    apiRequest<AdminReportSchedule>(`/admin/reports/schedules/${id}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    }),
  deleteReportSchedule: (id: string) =>
    apiRequest<{ ok: boolean }>(`/admin/reports/schedules/${id}`, {
      method: "DELETE",
    }),
  settingsReport: () =>
    apiRequest<AdminSettingsReport>("/admin/settings-reports"),
};

export type AdminAccounts = PlatformAccount[];
