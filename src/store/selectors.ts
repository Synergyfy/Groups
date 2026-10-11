import { useMemo } from "react";
import type {
  ActivityEvent,
  AdminGroupFilters,
  Group,
  GroupActivity,
  GroupThreshold,
  GroupCircle,
  Invitation,
  NetworkContact,
} from "../domain/types";
import { useAppStore } from "./context";
import type { AppState } from "./reducer";

// ---------------------------------------------------------------------------
// Pure selectors (usable outside React, e.g. in scripts/store-smoke.ts)
// ---------------------------------------------------------------------------

export function selectMyGroups(state: AppState, actorId: string): Group[] {
  return state.groups.filter(
    (group) => group.memberIds.includes(actorId) || group.ownerId === actorId
  );
}

export function selectOwnedGroups(state: AppState, actorId: string): Group[] {
  return state.groups.filter((group) => group.ownerId === actorId);
}

export function selectExploreGroups(state: AppState, actorId: string): Group[] {
  return state.groups.filter(
    (group) =>
      !group.memberIds.includes(actorId) &&
      group.ownerId !== actorId &&
      group.status !== "Closed"
  );
}

export interface GroupStats {
  total: number;
  mine: number;
  owned: number;
  automatic: number;
  userCreated: number;
  pendingInvites: number;
  openRequests: number;
}

export function selectGroupStats(state: AppState, actorId: string): GroupStats {
  const ownedIds = new Set(selectOwnedGroups(state, actorId).map((group) => group.id));
  const pendingInvites = state.invitations.filter(
    (invitation) =>
      invitation.direction === "incoming" &&
      invitation.kind === "invite" &&
      invitation.status === "pending" &&
      invitation.inviteeId === actorId
  ).length;
  const openRequests = state.invitations.filter(
    (invitation) =>
      invitation.kind === "request" &&
      invitation.status === "pending" &&
      ownedIds.has(invitation.groupId)
  ).length;

  return {
    total: state.groups.length,
    mine: selectMyGroups(state, actorId).length,
    owned: ownedIds.size,
    automatic: state.groups.filter((group) => group.source === "automatic").length,
    userCreated: state.groups.filter((group) => group.source === "user-created").length,
    pendingInvites,
    openRequests,
  };
}

export function selectAdminFilteredGroups(
  state: AppState,
  filters: AdminGroupFilters
): Group[] {
  const query = filters.query.trim().toLowerCase();
  return state.groups.filter((group) => {
    if (filters.type !== "all" && group.type !== filters.type) return false;
    if (filters.city !== "all" && (group.location?.city ?? "") !== filters.city) return false;
    if (filters.localArea !== "all" && (group.location?.localArea ?? "") !== filters.localArea)
      return false;
    if (filters.status !== "all" && group.status !== filters.status) return false;
    if (filters.stage !== "all" && (group.stage ?? "") !== filters.stage) return false;
    if (filters.owner !== "all" && group.ownerName !== filters.owner) return false;
    if (filters.programme !== "all" && (group.programmeId ?? "") !== filters.programme)
      return false;
    if (filters.source !== "all" && group.source !== filters.source) return false;
    if (query) {
      const haystack = `${group.name} ${group.purpose} ${group.ownerName} ${group.type}`.toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    return true;
  });
}

export interface AutomaticProgress {
  group: Group | null;
  current: number;
  threshold: GroupThreshold;
  remaining: number;
  percent: number;
  enabled: boolean;
  method: string;
  scope: string;
}

export function selectAutomaticProgress(state: AppState, actorId: string): AutomaticProgress {
  const config = state.adminConfig.automaticGrouping;
  const group =
    state.groups.find(
      (entry) =>
        entry.source === "automatic" &&
        entry.type === "Network" &&
        entry.memberIds.includes(actorId)
    ) ?? null;
  const current = group ? group.memberIds.length : 0;
  return {
    group,
    current,
    threshold: config.threshold,
    remaining: Math.max(config.threshold - current, 0),
    percent: Math.min(Math.round((current / config.threshold) * 100), 100),
    enabled: config.enabled,
    method: config.method,
    scope: config.scope,
  };
}

export function selectInvitationsFor(state: AppState, actorId: string): Invitation[] {
  return state.invitations.filter(
    (invitation) =>
      invitation.direction === "incoming" &&
      invitation.inviteeId === actorId &&
      invitation.status === "pending"
  );
}

export function selectOutgoingInvitations(state: AppState, actorId: string): Invitation[] {
  return state.invitations.filter(
    (invitation) =>
      invitation.kind === "invite" &&
      invitation.invitedById === actorId &&
      invitation.inviteeId !== actorId
  );
}

export function selectGroupActivities(state: AppState, groupId: string): GroupActivity[] {
  return state.groupActivities.filter((activity) => activity.groupId === groupId);
}

export function selectGroupInvitations(state: AppState, groupId: string): Invitation[] {
  return state.invitations.filter((invitation) => invitation.groupId === groupId);
}

export interface NetworkStats {
  networkGroups: number;
  nationalCommunities: number;
  automaticMembers: number;
  threshold: GroupThreshold;
  nextThresholdAt: number;
}

export function selectNetworkStats(state: AppState): NetworkStats {
  const threshold = state.adminConfig.automaticGrouping.threshold;
  const networkGroups = state.groups.filter((group) => group.type === "Network");
  return {
    networkGroups: networkGroups.length,
    nationalCommunities: state.groups.filter((group) => group.type === "National Community")
      .length,
    automaticMembers: networkGroups.reduce((sum, group) => sum + group.memberIds.length, 0),
    threshold,
    nextThresholdAt: threshold,
  };
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

export function useAppState(): AppState {
  return useAppStore().state;
}

export function useActor(actorId: string): {
  myGroups: Group[];
  ownedGroups: Group[];
  exploreGroups: Group[];
  stats: GroupStats;
} {
  const state = useAppState();
  return useMemo(
    () => ({
      myGroups: selectMyGroups(state, actorId),
      ownedGroups: selectOwnedGroups(state, actorId),
      exploreGroups: selectExploreGroups(state, actorId),
      stats: selectGroupStats(state, actorId),
    }),
    [state, actorId]
  );
}

export function useMyGroups(actorId: string): Group[] {
  const state = useAppState();
  return useMemo(() => selectMyGroups(state, actorId), [state, actorId]);
}

export function useOwnedGroups(actorId: string): Group[] {
  const state = useAppState();
  return useMemo(() => selectOwnedGroups(state, actorId), [state, actorId]);
}

export function useExploreGroups(actorId: string): Group[] {
  const state = useAppState();
  return useMemo(() => selectExploreGroups(state, actorId), [state, actorId]);
}

export function useGroupStats(actorId: string): GroupStats {
  const state = useAppState();
  return useMemo(() => selectGroupStats(state, actorId), [state, actorId]);
}

export function useAdminFilteredGroups(filters: AdminGroupFilters): Group[] {
  const state = useAppState();
  return useMemo(() => selectAdminFilteredGroups(state, filters), [state, filters]);
}

export function useAutomaticProgress(actorId: string): AutomaticProgress {
  const state = useAppState();
  return useMemo(() => selectAutomaticProgress(state, actorId), [state, actorId]);
}

export function useNetworkStats(): NetworkStats {
  const state = useAppState();
  return useMemo(() => selectNetworkStats(state), [state]);
}

export function useIncomingInvitations(actorId: string): Invitation[] {
  const state = useAppState();
  return useMemo(() => selectInvitationsFor(state, actorId), [state, actorId]);
}

export function useGroup(groupId: string | undefined): Group | undefined {
  const state = useAppState();
  return useMemo(
    () => state.groups.find((group) => group.id === groupId),
    [state, groupId]
  );
}

export function useGroupActivity(groupId: string | undefined): GroupActivity[] {
  const state = useAppState();
  return useMemo(
    () => (groupId ? selectGroupActivities(state, groupId) : []),
    [state, groupId]
  );
}

export function useGroupInvitations(groupId: string | undefined): Invitation[] {
  const state = useAppState();
  return useMemo(
    () => (groupId ? selectGroupInvitations(state, groupId) : []),
    [state, groupId]
  );
}

export function useCircles(): GroupCircle[] {
  return useAppState().circles;
}

export function useActiveCircle(): GroupCircle | undefined {
  const state = useAppState();
  return useMemo(
    () => state.circles.find((circle) => circle.id === state.activeCircleId) ?? state.circles[0],
    [state]
  );
}

export function useCircleActivity(circleId: string | undefined): ActivityEvent[] {
  const state = useAppState();
  return useMemo(
    () =>
      circleId
        ? state.circleActivities.filter((event) => event.circleId === circleId)
        : [],
    [state, circleId]
  );
}

export function selectNetworkContacts(state: AppState): NetworkContact[] {
  return state.networkContacts;
}

export function useNetworkContacts(): NetworkContact[] {
  return useAppState().networkContacts;
}
