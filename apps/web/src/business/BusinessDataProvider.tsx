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
import type {
  ActivityEvent,
  AdminConfig,
  BusinessDirectoryEntry,
  BusinessProfile,
  Group,
  GroupActivity,
  GroupCircle,
  Invitation,
  PlanAccess,
  NetworkContact,
} from "../domain/types";
import { useAppStore } from "../store/context";
import type { BusinessHydratePayload, BusinessStats } from "../store/reducer";
import {
  businessApi,
  type BusinessCampaignsResponse,
  type BusinessCircle,
  type BusinessCommunityResponse,
  type BusinessConfig,
  type BusinessGroup,
  type BusinessJourneyResponse,
  type BusinessLocationResponse,
  type BusinessLocationsResponse,
  type BusinessMember,
  type BusinessPlanResponse,
  type BusinessOverviewResponse,
  type BusinessProfileView,
  type BusinessProgrammesResponse,
  type BusinessRewardsResponse,
  type CircleDetailResponse,
  type CircleListResponse,
  type ExploreGroupsResponse,
  type InvitationListResponse,
  type NetworkGroupResponse,
  type NetworkListsResponse,
  type PageResult,
} from "./businessApi";

interface BusinessDirectoryRecord extends BusinessDirectoryEntry {
  email?: string;
}

interface BusinessDataValue {
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  profile: BusinessProfileView | null;
  overview: BusinessOverviewResponse | null;
  plan: BusinessPlanResponse | null;
  config: BusinessConfig | null;
  dashboard: Awaited<ReturnType<typeof businessApi.dashboard>> | null;
  explore: ExploreGroupsResponse | null;
  network: NetworkGroupResponse | null;
  invitations: InvitationListResponse | null;
  networkLists: NetworkListsResponse | null;
  contacts: NetworkContact[];
  circles: CircleListResponse | null;
  circleDetails: Record<string, CircleDetailResponse>;
  directory: BusinessDirectoryRecord[];
  programmes: BusinessProgrammesResponse | null;
  campaigns: BusinessCampaignsResponse | null;
  rewards: BusinessRewardsResponse | null;
  community: BusinessCommunityResponse | null;
  location: BusinessLocationResponse | null;
  locations: BusinessLocationsResponse | null;
  journey: BusinessJourneyResponse | null;
  refresh: () => Promise<void>;
  setActiveCircle: (circleId: string) => void;
}

const BusinessDataContext = createContext<BusinessDataValue | null>(null);

type Optional<T> = T | null;

async function optional<T>(request: Promise<T>): Promise<Optional<T>> {
  try {
    return await request;
  } catch {
    return null;
  }
}

function mergeGroups(...lists: Array<Group[] | undefined>): Group[] {
  const byId = new Map<string, Group>();
  for (const list of lists) {
    for (const group of list ?? []) {
      const existing = byId.get(group.id);
      if (!existing || (group as BusinessGroup).activation) {
        byId.set(group.id, {
          ...(existing ?? {}),
          ...group,
          memberIds: [...group.memberIds],
          ...(group.joinPlan ?? existing?.joinPlan
            ? { joinPlan: group.joinPlan ?? existing?.joinPlan }
            : {}),
        });
      }
    }
  }
  return [...byId.values()];
}

function toProfile(view: BusinessProfileView): BusinessProfile {
  const joinedAt = view.joinedAt?.slice(0, 10) ?? "";
  return {
    id: view.business.id,
    businessName: view.business.name,
    contactName: view.business.contactName,
    email: view.business.email,
    category: view.business.category,
    city: view.business.city,
    localArea: view.business.localArea ?? "",
    joinedAt,
    nationalCommunity: {
      name: view.nationalCommunity.name,
      status: "Member",
      joinedAt: view.nationalCommunity.joinedAt?.slice(0, 10) ?? joinedAt,
    },
    accountManagerId: view.business.accountManagerId,
    agentId: view.business.agentId,
    consultantId: view.business.consultantId,
    programmeId: view.business.programmeId,
  };
}

function toAdminConfig(config: BusinessConfig): AdminConfig {
  return {
    ...config,
    circleTypes: config.circleTypes.map((entry) => ({
      ...entry,
      allowedDurations: [...entry.allowedDurations],
    })) as AdminConfig["circleTypes"],
    auditLog: [],
  };
}

function toPlan(access: PlanAccess): PlanAccess {
  return {
    ...access,
    status: access.status as PlanAccess["status"],
  };
}

function stripGroupName(
  entries: Array<GroupActivity & { groupName?: string }> | undefined,
): GroupActivity[] {
  return (entries ?? []).map((entry) => {
    const copy = { ...entry };
    delete (copy as { groupName?: string }).groupName;
    return copy;
  });
}

function toCircleActivity(
  entries: Array<{ id: string; circleId: string; memberId?: string; kind: string; message: string; at?: string }> | undefined,
): ActivityEvent[] {
  return (entries ?? []).map((entry) => ({
    id: entry.id,
    circleId: entry.circleId,
    memberId: entry.memberId,
    kind: entry.kind === "join" || entry.kind === "message" ? entry.kind : "update",
    message: entry.message,
    at: entry.at ?? new Date().toISOString(),
  }));
}

export function BusinessDataProvider({ children }: { children: ReactNode }) {
  const { dispatch } = useAppStore();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [profile, setProfile] = useState<BusinessProfileView | null>(null);
  const [overview, setOverview] = useState<BusinessOverviewResponse | null>(null);
  const [plan, setPlan] = useState<BusinessPlanResponse | null>(null);
  const [config, setConfig] = useState<BusinessConfig | null>(null);
  const [dashboard, setDashboard] = useState<Awaited<ReturnType<typeof businessApi.dashboard>> | null>(null);
  const [explore, setExplore] = useState<ExploreGroupsResponse | null>(null);
  const [network, setNetwork] = useState<NetworkGroupResponse | null>(null);
  const [invitations, setInvitations] = useState<InvitationListResponse | null>(null);
  const [networkLists, setNetworkLists] = useState<NetworkListsResponse | null>(null);
  const [contacts, setContacts] = useState<NetworkContact[]>([]);
  const [circles, setCircles] = useState<CircleListResponse | null>(null);
  const [circleDetails, setCircleDetails] = useState<Record<string, CircleDetailResponse>>({});
  const [directory, setDirectory] = useState<BusinessDirectoryRecord[]>([]);
  const [programmes, setProgrammes] = useState<BusinessProgrammesResponse | null>(null);
  const [campaigns, setCampaigns] = useState<BusinessCampaignsResponse | null>(null);
  const [rewards, setRewards] = useState<BusinessRewardsResponse | null>(null);
  const [community, setCommunity] = useState<BusinessCommunityResponse | null>(null);
  const [location, setLocation] = useState<BusinessLocationResponse | null>(null);
  const [locations, setLocations] = useState<BusinessLocationsResponse | null>(null);
  const [journey, setJourney] = useState<BusinessJourneyResponse | null>(null);

  const requestId = useRef(0);

  const load = useCallback(
    async (initial: boolean) => {
      const current = ++requestId.current;
      if (initial) setLoading(true);
      else setRefreshing(true);
      setError(null);

      try {
        const [
          dashboardResult,
          configResult,
          planResult,
          profileResult,
          overviewResult,
          exploreResult,
          networkResult,
          invitationsResult,
          listsResult,
          contactsResult,
          circlesResult,
          directoryResult,
          programmesResult,
          campaignsResult,
          rewardsResult,
          communityResult,
          locationResult,
          locationsResult,
          journeyResult,
        ] = await Promise.all([
          optional(businessApi.dashboard()),
          businessApi.config(),
          businessApi.plan(),
          businessApi.profile(),
          optional(businessApi.overview()),
          optional(businessApi.explore({ limit: 100 })),
          optional(businessApi.network()),
          optional(businessApi.invitations({ tab: "all", limit: 100 })),
          optional(businessApi.networkLists()),
          optional(businessApi.contacts({ limit: 100 })),
          optional(businessApi.circles({ limit: 100 })),
          optional(businessApi.directory({ limit: 100 })),
          optional(businessApi.programmes()),
          optional(businessApi.campaigns({ limit: 100 })),
          optional(businessApi.rewards({ limit: 100 })),
          optional(businessApi.community()),
          optional(businessApi.location()),
          optional(businessApi.locations()),
          optional(businessApi.journey()),
        ]);

        if (current !== requestId.current) return;

        const details: Record<string, CircleDetailResponse> = {};
        if (circlesResult) {
          const loaded = await Promise.all(
            circlesResult.items.map(async (circle) => {
              const detail = await optional(businessApi.circle(circle.id));
              return detail ? ([circle.id, detail] as const) : null;
            }),
          );
          for (const entry of loaded) {
            if (entry) details[entry[0]] = entry[1];
          }
        }
        if (current !== requestId.current) return;

        const groupLists: Group[][] = [
          dashboardResult?.groups,
          dashboardResult?.created,
          dashboardResult?.joined,
          dashboardResult?.automatic,
          dashboardResult?.headStartGroups,
          exploreResult?.items,
          networkResult?.groups,
          communityResult?.groups,
          locationResult?.cityGroups,
          locationResult?.areaGroups,
        ].filter((list): list is Group[] => Boolean(list));

        const groups = mergeGroups(...groupLists);

        const invitationRows = new Map<string, Invitation>();
        for (const invitation of [
          ...(dashboardResult?.invitations ?? []),
          ...(invitationsResult?.items ?? []),
        ]) {
          invitationRows.set(invitation.id, invitation);
        }

        const activities = new Map<string, GroupActivity>();
        for (const entry of dashboardResult?.recentActivity ?? []) {
          activities.set(entry.id, entry);
        }

        const circleActivities = Object.values(details).flatMap((detail) =>
          toCircleActivity(detail.activity),
        );

        const profileView = profileResult;
        const adminConfig = toAdminConfig(configResult);
        const access = toPlan(planResult.access);

        const payload: BusinessHydratePayload = {
          profile: toProfile(profileView),
          stats: (dashboardResult?.stats ?? {
            total: 0,
            mine: 0,
            owned: 0,
            automatic: 0,
            userCreated: 0,
            pendingInvites: 0,
            openRequests: 0,
          }) as BusinessStats,
          groups,
          invitations: [...invitationRows.values()],
          groupActivities: stripGroupName([...activities.values()]),
          circles: (circlesResult?.items ?? []).map(
            (circle) => circle as unknown as GroupCircle,
          ),
          circleActivities,
          activeCircleId: circlesResult?.items[0]?.id,
          adminConfig,
          plan: access,
        };

        dispatch({ type: "business/hydrate", payload });

        setDashboard(dashboardResult);
        setConfig(configResult);
        setPlan(planResult);
        setProfile(profileView);
        setOverview(overviewResult);
        setExplore(exploreResult);
        setNetwork(networkResult);
        setInvitations(invitationsResult);
        setNetworkLists(listsResult);
        setContacts(contactsResult?.items ?? []);
        setCircles(circlesResult);
        setCircleDetails(details);
        setDirectory(directoryResult?.items ?? []);
        setProgrammes(programmesResult);
        setCampaigns(campaignsResult);
        setRewards(rewardsResult);
        setCommunity(communityResult);
        setLocation(locationResult);
        setLocations(locationsResult);
        setJourney(journeyResult);
      } catch (cause) {
        if (current !== requestId.current) return;
        const message =
          cause instanceof Error
            ? cause.message
            : "Unable to load your business dashboard.";
        setError(message);
      } finally {
        if (current === requestId.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [dispatch],
  );

  useEffect(() => {
    // Bootstrap hydration runs once; the provider blocks children until it settles.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load(true);
    return () => {
      requestId.current += 1;
    };
  }, [load]);

  const refresh = useCallback(async () => {
    await load(false);
  }, [load]);

  const setActiveCircle = useCallback((circleId: string) => {
    dispatch({ type: "circle/set-active", circleId });
  }, [dispatch]);

  const value = useMemo<BusinessDataValue>(
    () => ({
      loading,
      refreshing,
      error,
      profile,
      overview,
      plan,
      config,
      dashboard,
      explore,
      network,
      invitations,
      networkLists,
      contacts,
      circles,
      circleDetails,
      directory,
      programmes,
      campaigns,
      rewards,
      community,
      location,
      locations,
      journey,
      refresh,
      setActiveCircle,
    }),
    [
      loading,
      refreshing,
      error,
      profile,
      overview,
      plan,
      config,
      dashboard,
      explore,
      network,
      invitations,
      networkLists,
      contacts,
      circles,
      circleDetails,
      directory,
      programmes,
      campaigns,
      rewards,
      community,
      location,
      locations,
      journey,
      refresh,
      setActiveCircle,
    ],
  );

  return (
    <BusinessDataContext.Provider value={value}>
      {loading ? <BusinessLoadingScreen /> : error ? (
        <BusinessErrorScreen message={error} onRetry={() => void load(true)} />
      ) : (
        children
      )}
    </BusinessDataContext.Provider>
  );
}

function BusinessLoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-950 px-6">
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="size-8 animate-spin rounded-full border-2 border-gold-500/30 border-t-gold-400" />
        <p className="text-sm font-medium text-slate-300">
          Loading your business dashboard…
        </p>
      </div>
    </div>
  );
}

function BusinessErrorScreen({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-950 px-6">
      <div className="max-w-md rounded-2xl border border-white/10 bg-ink-900 p-6 text-center">
        <p className="text-sm font-semibold text-white">
          We could not load your business dashboard
        </p>
        <p className="mt-2 text-xs leading-relaxed text-slate-400">{message}</p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 inline-flex h-9 items-center rounded-lg border border-gold-500/40 bg-gold-500/15 px-4 text-xs font-semibold text-gold-200 hover:bg-gold-500/25"
        >
          Try again
        </button>
      </div>
    </div>
  );
}

export function useBusinessData(): BusinessDataValue {
  const value = useContext(BusinessDataContext);
  if (!value) {
    throw new Error("useBusinessData must be used inside <BusinessDataProvider>");
  }
  return value;
}

/** Read business data where the provider may not be mounted (public routes). */
export function useOptionalBusinessData(): BusinessDataValue | null {
  return useContext(BusinessDataContext);
}

export type { BusinessCircle, BusinessGroup, BusinessMember, PageResult };
export { businessApi };
