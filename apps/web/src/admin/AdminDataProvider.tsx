/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AppStoreContext } from "../store/context";
import type { AppAction, AppState } from "../store/reducer";
import type {
  AdminConfig,
  AdminConfigPatch,
  BusinessDirectoryEntry,
  Group,
  GroupActivity,
  GroupCircle,
  Invitation,
  PlanAccess,
  Plan,
  PartnerRecord,
  PlatformAccount,
  ProgrammeRecord,
  CampaignRecord,
  RelationshipRecord,
  BusinessRecord,
  AuditLogEntry,
  LocationHierarchy,
} from "../domain/types";
import {
  adminApi,
  type AdminConfigResponse,
  type AdminContentSection,
  type AdminGroupReport,
  type AdminOverview,
  type AdminPartnerGroups,
  type AdminReportSchedule,
  type AdminSettingsReport,
  type AdminUser,
  type RewardDeal,
} from "./adminApi";

export interface AdminData {
  groups: Group[];
  invitations: Invitation[];
  adminConfig: AdminConfig;
  circles: GroupCircle[];
  accounts: PlatformAccount[];
  partners: PartnerRecord[];
  businesses: BusinessRecord[];
  programmes: ProgrammeRecord[];
  campaigns: CampaignRecord[];
  relationships: RelationshipRecord[];
  plans: Plan[];
  rewards: RewardDeal[];
  locations: LocationHierarchy;
  content: AdminContentSection[];
  users: AdminUser[];
  auditLog: AuditLogEntry[];
  overview: AdminOverview | null;
  report: AdminGroupReport | null;
  settingsReport: AdminSettingsReport | null;
  reportSchedules: AdminReportSchedule[];
  planStats: {
    totalPlans: number;
    activePlans: number;
    totalSubscribers: number;
    monthlyRecurringRunRate: number;
  } | null;
  rewardStats: {
    totalDeals: number;
    liveOnFrontend: number;
    totalRedemptions: number;
    frontendDelivery: string;
  } | null;
  partnerGroups: AdminPartnerGroups | null;
}

interface AdminDataContextValue {
  data: AdminData | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const AdminDataContext = createContext<AdminDataContextValue | null>(null);

const EMPTY_CONFIG: AdminConfig = {
  automaticGrouping: {
    enabled: false,
    threshold: 12,
    method: "",
    scope: "",
    allowCombine: false,
  },
  groupTypes: [],
  stageLabels: [],
  paymentRules: {
    allowPaid: false,
    minAmount: 0,
    maxAmount: 0,
    presets: [],
    allowCustom: false,
  },
  groupCreationRules: {
    allowedPlans: [],
    allowedVariants: [],
    restrictToPlatformGroup: false,
    platformGroupId: null,
    recruitmentTargets: {
      Bronze: { Standard: 0, Pro: 0, "Pro+": 0 },
      Silver: { Standard: 0, Pro: 0, "Pro+": 0 },
      Gold: { Standard: 0, Pro: 0, "Pro+": 0 },
      Platinum: { Standard: 0, Pro: 0, "Pro+": 0 },
    },
    activationEnabled: false,
    requirePaidAccess: false,
    entryAccessDays: 90,
    entryAccessFee: 0,
  },
  circleTypes: [],
  mandatoryCircles: [],
  mandatoryGroups: [],
  partnerDefaults: {
    canCreateGroups: false,
    canCreateCircles: false,
    canInviteMembers: false,
    canRemoveMembers: false,
    canRunPaidGroups: false,
    canRunFreeGroups: false,
    canAccessCampaigns: false,
    canAccessReports: false,
    canSeeFinancials: false,
    canSetContributionAmounts: false,
    maxGroups: 0,
    maxCircles: 0,
    revenueSharePercent: 0,
  },
  auditLog: [],
};

const EMPTY_PLAN: PlanAccess = {
  ownerId: "",
  variant: "Standard",
  planName: "",
  status: "Pending",
  paid: false,
  accessDays: 90,
  accessFee: 0,
  accessFeeMinor: 0,
  agreementAccepted: false,
};

function mergeConfig(
  config: AdminConfig,
  patch: AdminConfigPatch,
): AdminConfig {
  return {
    ...config,
    ...patch,
    automaticGrouping: {
      ...config.automaticGrouping,
      ...(patch.automaticGrouping ?? {}),
    },
    paymentRules: {
      ...config.paymentRules,
      ...(patch.paymentRules ?? {}),
    },
    groupCreationRules: {
      ...config.groupCreationRules,
      ...(patch.groupCreationRules ?? {}),
    },
    partnerDefaults: {
      ...config.partnerDefaults,
      ...(patch.partnerDefaults ?? {}),
    },
  } as AdminConfig;
}

function normaliseConfig(response: AdminConfigResponse): AdminConfig {
  return {
    automaticGrouping: response.automaticGrouping,
    groupTypes: response.groupTypes,
    stageLabels: response.stageLabels,
    paymentRules: response.paymentRules,
    groupCreationRules: response.groupCreationRules,
    circleTypes: response.circleTypes,
    mandatoryCircles: response.mandatoryCircles,
    mandatoryGroups: response.mandatoryGroups,
    partnerDefaults: response.partnerDefaults,
    auditLog: response.auditLog ?? [],
    accessRules: response.accessRules,
    platformSettings: response.platformSettings,
  } as AdminConfig;
}

function accountFromUser(user: AdminUser): PlatformAccount {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role:
      user.role === "business-invitee" ? "business-invitee" : "consumer",
    createdAt: user.registeredAt ?? "",
  };
}

async function loadAll(): Promise<AdminData> {
  const [
    groups,
    invitations,
    config,
    businesses,
    partners,
    programmes,
    campaigns,
    relationships,
    plans,
    rewards,
    locations,
    content,
    users,
    auditLog,
    overview,
    report,
    settingsReport,
    reportSchedules,
    planStats,
    rewardStats,
    partnerGroups,
    circles,
  ] = await Promise.all([
    adminApi.groups(),
    adminApi.invitations(),
    adminApi.config(),
    adminApi.businesses(),
    adminApi.partners(),
    adminApi.programmes(),
    adminApi.campaigns(),
    adminApi.relationships(),
    adminApi.plans(),
    adminApi.rewards(),
    adminApi.locations(),
    adminApi.content(),
    adminApi.users(),
    adminApi.auditLog(),
    adminApi.overview(),
    adminApi.report(),
    adminApi.settingsReport(),
    adminApi.reportSchedules(),
    adminApi.planStats(),
    adminApi.rewardStats(),
    adminApi.partnerGroups(),
    adminApi.circles(),
  ]);

  return {
    groups,
    invitations,
    adminConfig: normaliseConfig(config),
    circles,
    accounts: users
      .filter((user) => user.role !== "business" && user.role !== "admin")
      .map(accountFromUser),
    partners,
    businesses,
    programmes,
    campaigns,
    relationships,
    plans,
    rewards,
    locations,
    content,
    users,
    auditLog,
    overview,
    report,
    settingsReport,
    reportSchedules,
    planStats,
    rewardStats,
    partnerGroups,
  };
}

export function AdminDataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AdminData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);

  const refresh = useCallback(async () => {
    try {
      const next = await loadAll();
      if (!mounted.current) return;
      setData(next);
      setError(null);
    } catch (cause) {
      if (!mounted.current) return;
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not load admin data from the API",
      );
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh().finally(() => {
      if (mounted.current) setLoading(false);
    });
    return () => {
      mounted.current = false;
    };
  }, [refresh]);

  const apply = useCallback((updater: (current: AdminData) => AdminData) => {
    setData((current) => (current ? updater(current) : current));
  }, []);

  const dispatch = useCallback(
    (action: AppAction) => {
      void handleAction(action, apply, refresh);
    },
    [apply, refresh],
  );

  const state = useMemo<AppState>(() => {
    if (!data) {
      return {
        version: 2,
        groups: [],
        invitations: [],
        groupActivities: [],
        circles: [],
        circleActivities: [],
        activeCircleId: "",
        adminConfig: EMPTY_CONFIG,
        plan: EMPTY_PLAN,
        networkContacts: [],
        accounts: [],
        partners: [],
        businesses: [],
        programmes: [],
        campaigns: [],
        relationships: [],
        businessProfile: null,
        businessStats: null,
      };
    }

    return {
      version: 2,
      groups: data.groups,
      invitations: data.invitations,
      groupActivities: [],
      circles: data.circles,
      circleActivities: [],
      activeCircleId: "",
      adminConfig: { ...data.adminConfig, auditLog: data.auditLog },
      plan: EMPTY_PLAN,
      networkContacts: [],
      accounts: data.accounts,
      partners: data.partners,
      businesses: data.businesses,
      programmes: data.programmes,
      campaigns: data.campaigns,
      relationships: data.relationships,
      businessProfile: null,
      businessStats: null,
    };
  }, [data]);

  const value = useMemo(
    () => ({ state, dispatch }),
    [state, dispatch],
  );

  if (loading && !data) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="rounded-xl border border-white/10 bg-ink-950/80 px-6 py-5 text-center">
          <p className="text-sm font-medium text-white">Loading admin console…</p>
          <p className="mt-1 text-xs text-slate-400">
            Fetching the platform data from the API.
          </p>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="max-w-md rounded-xl border border-rose-500/30 bg-rose-500/5 px-6 py-5 text-center">
          <p className="text-sm font-medium text-rose-200">
            Admin data could not be loaded
          </p>
          <p className="mt-1 text-xs text-slate-400">{error}</p>
          <button
            type="button"
            onClick={() => {
              setLoading(true);
              void refresh().finally(() => setLoading(false));
            }}
            className="mt-3 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white hover:bg-white/10"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <AdminDataContext.Provider value={{ data, loading, error, refresh }}>
      <AppStoreContext.Provider value={value}>
        {children}
      </AppStoreContext.Provider>
    </AdminDataContext.Provider>
  );
}

export function useAdminData(): AdminDataContextValue {
  const context = useContext(AdminDataContext);
  if (!context) {
    throw new Error("useAdminData must be used inside <AdminDataProvider>");
  }
  return context;
}

export function useAdminDirectoryEntry(): (id: string) => BusinessDirectoryEntry {
  const { data } = useAdminData();
  return useMemo(() => {
    const index = new Map<string, BusinessDirectoryEntry>();
    for (const business of data?.businesses ?? []) {
      index.set(business.id, {
        id: business.id,
        name: business.name,
        contactName: business.contactName,
        city: business.city,
        category: business.category,
        joinedAt: business.joinedAt,
      });
    }
    for (const account of data?.accounts ?? []) {
      if (!index.has(account.id)) {
        index.set(account.id, {
          id: account.id,
          name: account.name,
          contactName: account.name,
          city: "—",
          category: "—",
          joinedAt: account.createdAt,
        });
      }
    }
    return (id: string) =>
      index.get(id) ?? {
        id,
        name: id,
        contactName: "—",
        city: "—",
        category: "—",
      };
  }, [data]);
}

export function useAdminGroupActivity(
  groupId: string | undefined,
): GroupActivity[] {
  const { data } = useAdminData();
  const groupExists = Boolean(
    groupId && data?.groups.some((group) => group.id === groupId),
  );
  const [activity, setActivity] = useState<{
    groupId: string;
    rows: GroupActivity[];
  } | null>(null);

  useEffect(() => {
    if (!groupId || !groupExists) return;
    let active = true;
    adminApi
      .groupActivity(groupId)
      .then((rows) => {
        if (active) setActivity({ groupId, rows });
      })
      .catch(() => {
        if (active) setActivity({ groupId, rows: [] });
      });
    return () => {
      active = false;
    };
  }, [groupId, groupExists]);

  return groupId && groupExists && activity?.groupId === groupId
    ? activity.rows
    : [];
}

export function useAdminLoading(): boolean {
  return useAdminData().loading;
}

async function handleAction(
  action: AppAction,
  apply: (updater: (current: AdminData) => AdminData) => void,
  refresh: () => Promise<void>,
): Promise<void> {
  try {
    switch (action.type) {
      case "admin/update-config": {
        apply((current) => ({
          ...current,
          adminConfig: mergeConfig(current.adminConfig, action.patch),
        }));
        const config = await adminApi.patchConfig(
          action.patch as Record<string, unknown>,
        );
        apply((current) => ({
          ...current,
          adminConfig: normaliseConfig(config),
        }));
        await refresh();
        return;
      }

      case "admin/group-update": {
        apply((current) => ({
          ...current,
          groups: current.groups.map((group) =>
            group.id === action.groupId
              ? { ...group, ...action.patch, id: group.id }
              : group,
          ),
        }));
        const updated = await adminApi.updateGroup(
          action.groupId,
          action.patch as Record<string, unknown>,
        );
        apply((current) => ({
          ...current,
          groups: current.groups.map((group) =>
            group.id === updated.id ? updated : group,
          ),
        }));
        return;
      }

      case "admin/group-delete": {
        apply((current) => ({
          ...current,
          groups: current.groups.filter(
            (group) => group.id !== action.groupId,
          ),
          invitations: current.invitations.filter(
            (invitation) => invitation.groupId !== action.groupId,
          ),
        }));
        await adminApi.deleteGroup(action.groupId);
        await refresh();
        return;
      }

      case "admin/group-approve": {
        apply((current) => ({
          ...current,
          groups: current.groups.map((group) =>
            group.id === action.groupId
              ? { ...group, status: "Active" }
              : group,
          ),
        }));
        const updated = await adminApi.approveGroup(action.groupId);
        apply((current) => ({
          ...current,
          groups: current.groups.map((group) =>
            group.id === updated.id ? updated : group,
          ),
        }));
        return;
      }

      case "admin/group-suspend": {
        apply((current) => ({
          ...current,
          groups: current.groups.map((group) =>
            group.id === action.groupId
              ? { ...group, status: "Suspended" }
              : group,
          ),
        }));
        const updated = await adminApi.suspendGroup(action.groupId);
        apply((current) => ({
          ...current,
          groups: current.groups.map((group) =>
            group.id === updated.id ? updated : group,
          ),
        }));
        return;
      }

      case "admin/group-close": {
        apply((current) => ({
          ...current,
          groups: current.groups.map((group) =>
            group.id === action.groupId
              ? { ...group, status: "Closed" }
              : group,
          ),
        }));
        const updated = await adminApi.closeGroup(action.groupId);
        apply((current) => ({
          ...current,
          groups: current.groups.map((group) =>
            group.id === updated.id ? updated : group,
          ),
        }));
        return;
      }

      case "admin/member-add": {
        apply((current) => ({
          ...current,
          groups: current.groups.map((group) =>
            group.id === action.groupId
              ? {
                  ...group,
                  memberIds: [...group.memberIds, action.member.id],
                  memberCount:
                    (group.memberCount ?? group.memberIds.length) + 1,
                }
              : group,
          ),
        }));
        await adminApi.addGroupMember(action.groupId, {
          memberId: action.member.id,
          fullName: action.member.name,
          businessName:
            action.member.name === action.member.id ? undefined : action.member.name,
        });
        const group = await adminApi.group(action.groupId);
        apply((current) => ({
          ...current,
          groups: current.groups.map((entry) =>
            entry.id === group.id ? group : entry,
          ),
        }));
        return;
      }

      case "admin/member-remove": {
        apply((current) => ({
          ...current,
          groups: current.groups.map((group) =>
            group.id === action.groupId
              ? {
                  ...group,
                  memberIds: group.memberIds.filter(
                    (id) => id !== action.memberId,
                  ),
                  memberCount: Math.max(
                    0,
                    (group.memberCount ?? group.memberIds.length) - 1,
                  ),
                }
              : group,
          ),
        }));
        await adminApi.removeGroupMember(action.groupId, action.memberId);
        const group = await adminApi.group(action.groupId);
        apply((current) => ({
          ...current,
          groups: current.groups.map((entry) =>
            entry.id === group.id ? group : entry,
          ),
        }));
        return;
      }

      case "admin/invitation-respond": {
        apply((current) => ({
          ...current,
          invitations: current.invitations.map((invitation) =>
            invitation.id === action.invitationId
              ? {
                  ...invitation,
                  status: action.accept ? "accepted" : "declined",
                  respondedAt: new Date().toISOString(),
                }
              : invitation,
          ),
        }));
        await (action.accept
          ? adminApi.approveInvitation(action.invitationId)
          : adminApi.declineInvitation(action.invitationId));
        await refresh();
        return;
      }

      case "invitation/cancel": {
        apply((current) => ({
          ...current,
          invitations: current.invitations.map((invitation) =>
            invitation.id === action.invitationId
              ? { ...invitation, status: "cancelled" }
              : invitation,
          ),
        }));
        await adminApi.cancelInvitation(action.invitationId);
        await refresh();
        return;
      }

      case "admin/partner-update": {
        apply((current) => ({
          ...current,
          partners: current.partners.map((partner) =>
            partner.id === action.partnerId
              ? {
                  ...partner,
                  ...action.patch,
                  id: partner.id,
                  permissions: {
                    ...partner.permissions,
                    ...(action.patch.permissions ?? {}),
                  },
                }
              : partner,
          ),
        }));
        const updated = await adminApi.updatePartner(
          action.partnerId,
          action.patch as Record<string, unknown>,
        );
        apply((current) => ({
          ...current,
          partners: current.partners.map((partner) =>
            partner.id === updated.id ? updated : partner,
          ),
        }));
        return;
      }

      case "admin/business-update": {
        apply((current) => ({
          ...current,
          businesses: current.businesses.map((business) =>
            business.id === action.businessId
              ? { ...business, ...action.patch, id: business.id }
              : business,
          ),
        }));
        const updated = await adminApi.updateBusiness(
          action.businessId,
          action.patch as Record<string, unknown>,
        );
        apply((current) => ({
          ...current,
          businesses: current.businesses.map((business) =>
            business.id === updated.id ? updated : business,
          ),
        }));
        return;
      }

      case "admin/programme-update": {
        apply((current) => ({
          ...current,
          programmes: current.programmes.map((programme) =>
            programme.id === action.programmeId
              ? { ...programme, ...action.patch, id: programme.id }
              : programme,
          ),
        }));
        const updated = await adminApi.updateProgramme(
          action.programmeId,
          action.patch as Record<string, unknown>,
        );
        apply((current) => ({
          ...current,
          programmes: current.programmes.map((programme) =>
            programme.id === updated.id ? updated : programme,
          ),
        }));
        return;
      }

      case "admin/campaign-update": {
        apply((current) => ({
          ...current,
          campaigns: current.campaigns.map((campaign) =>
            campaign.id === action.campaignId
              ? { ...campaign, ...action.patch, id: campaign.id }
              : campaign,
          ),
        }));
        const updated = await adminApi.updateCampaign(
          action.campaignId,
          action.patch as Record<string, unknown>,
        );
        apply((current) => ({
          ...current,
          campaigns: current.campaigns.map((campaign) =>
            campaign.id === updated.id ? updated : campaign,
          ),
        }));
        return;
      }

      case "admin/relationship-assign": {
        const key =
          action.kind === "account-manager"
            ? "accountManagerId"
            : action.kind === "agent"
              ? "agentId"
              : "consultantId";
        apply((current) => ({
          ...current,
          groups: current.groups.map((group) =>
            group.id === action.groupId
              ? { ...group, [key]: action.relationshipId }
              : group,
          ),
        }));
        await adminApi.updateGroupRelationships(action.groupId, {
          [key]: action.relationshipId ?? "",
        });
        const group = await adminApi.group(action.groupId);
        apply((current) => ({
          ...current,
          groups: current.groups.map((entry) =>
            entry.id === group.id ? group : entry,
          ),
        }));
        return;
      }

      case "admin/circle-type-create": {
        let nextCircleTypes: unknown[] = [];
        apply((current) => {
          nextCircleTypes = [...current.adminConfig.circleTypes, action.entry];
          return {
            ...current,
            adminConfig: {
              ...current.adminConfig,
              circleTypes:
                nextCircleTypes as typeof current.adminConfig.circleTypes,
            },
          };
        });
        await adminApi.patchConfig({ circleTypes: nextCircleTypes });
        await refresh();
        return;
      }

      case "admin/circle-type-update": {
        let nextCircleTypes: unknown[] = [];
        apply((current) => {
          nextCircleTypes = current.adminConfig.circleTypes.map((entry) =>
            entry.id === action.id
              ? { ...entry, ...action.patch, id: entry.id, type: entry.type }
              : entry,
          );
          return {
            ...current,
            adminConfig: {
              ...current.adminConfig,
              circleTypes: nextCircleTypes as typeof current.adminConfig.circleTypes,
            },
          };
        });
        await adminApi.patchConfig({ circleTypes: nextCircleTypes });
        await refresh();
        return;
      }

      case "admin/circle-type-delete": {
        let nextCircleTypes: unknown[] = [];
        let nextMandatory: unknown[] = [];
        apply((current) => {
          const existing = current.adminConfig.circleTypes.find(
            (entry) => entry.id === action.id,
          );
          nextCircleTypes = current.adminConfig.circleTypes.filter(
            (entry) => entry.id !== action.id,
          );
          nextMandatory = current.adminConfig.mandatoryCircles.filter(
            (rule) => !existing || rule.circleType !== existing.type,
          );
          return {
            ...current,
            adminConfig: {
              ...current.adminConfig,
              circleTypes: nextCircleTypes as typeof current.adminConfig.circleTypes,
              mandatoryCircles:
                nextMandatory as typeof current.adminConfig.mandatoryCircles,
            },
          };
        });
        await adminApi.patchConfig({
          circleTypes: nextCircleTypes,
          mandatoryCircles: nextMandatory,
        });
        await refresh();
        return;
      }

      case "admin/audit-log": {
        await refresh();
        return;
      }

      case "group/create": {
        const created = await adminApi.createGroup({
          name: action.input.name,
          type: action.input.type,
          source: action.owner.id === "admin" ? "automatic" : "user-created",
          purpose: action.input.purpose,
          ownerId:
            action.owner.id === "admin" ? undefined : action.owner.id,
          ownerName: action.owner.name,
          accessType: action.input.accessType,
          visibility: action.input.visibility,
          interactionLevel: action.input.interactionLevel,
          pricing: action.input.pricing,
          requiredPlanIds: action.input.requiredPlanIds,
          city: action.input.city,
          localArea: action.input.localArea,
          requiredSize: action.input.requiredSize,
          stage: action.input.stage,
          status: action.input.status ?? "Active",
        });
        apply((current) => ({
          ...current,
          groups: [created, ...current.groups],
        }));
        await refresh();
        return;
      }

      default:
        return;
    }
  } catch (cause) {
    console.error("Admin action failed", action.type, cause);
    await refresh();
  }
}

// (end of provider helpers)
