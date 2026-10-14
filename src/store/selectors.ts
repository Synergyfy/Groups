import { useMemo } from "react";
import type {
  ActivityEvent,
  AdminGroupFilters,
  BusinessRecord,
  CampaignRecord,
  CircleTypeConfigEntry,
  Group,
  GroupActivity,
  GroupThreshold,
  GroupCircle,
  Invitation,
  MandatoryGroupPricing,
  NetworkContact,
  PartnerRecord,
  PlatformAccount,
  ProgrammeRecord,
  RelationshipRecord,
  AuditLogEntry,
  UserGroupType,
} from "../domain/types";
import {
  circleTypeFallback,
  circleTypeMetaFrom,
  type CircleTypeMeta,
} from "../domain/constants";
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

// ---------------------------------------------------------------------------
// Platform accounts (invitation-first onboarding)
// ---------------------------------------------------------------------------

export function selectAccounts(state: AppState): PlatformAccount[] {
  return state.accounts;
}

export function findAccountByEmail(
  state: AppState,
  email: string
): PlatformAccount | undefined {
  const needle = email.trim().toLowerCase();
  if (!needle) return undefined;
  return state.accounts.find((account) => account.email.trim().toLowerCase() === needle);
}

export function findAccountByPhone(
  state: AppState,
  phone: string
): PlatformAccount | undefined {
  const normalize = (value: string) => value.replace(/[^0-9]/g, "");
  const needle = normalize(phone);
  if (!needle) return undefined;
  return state.accounts.find(
    (account) => account.phone !== undefined && normalize(account.phone) === needle
  );
}

export function findAccountById(state: AppState, id: string): PlatformAccount | undefined {
  return state.accounts.find((account) => account.id === id);
}

// ---------------------------------------------------------------------------
// Mandatory ("create first") groups
// ---------------------------------------------------------------------------

export interface MandatoryGroupStatus {
  type: UserGroupType;
  required: boolean;
  pricing: MandatoryGroupPricing;
  /** True once the actor owns a group of this type. */
  satisfied: boolean;
  group?: Group;
}

/**
 * The administrator's required-group rules resolved against what this actor
 * already owns — the single source of truth for the business checklist and
 * the Create Group wizard's hard mandate.
 */
export function selectMandatoryGroupStatuses(
  state: AppState,
  actorId: string
): MandatoryGroupStatus[] {
  const owned = selectOwnedGroups(state, actorId);
  return state.adminConfig.mandatoryGroups.map((rule) => {
    const group = owned.find((entry) => entry.type === rule.type);
    return {
      type: rule.type,
      required: rule.required,
      pricing: rule.pricing,
      satisfied: Boolean(group),
      group,
    };
  });
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
      invitation.groupId !== undefined &&
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
    if (filters.pricing && filters.pricing !== "all") {
      const mode = group.pricing ?? "free";
      if (mode !== filters.pricing) return false;
    }
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

export function useMandatoryGroupStatuses(actorId: string): MandatoryGroupStatus[] {
  const state = useAppState();
  return useMemo(() => selectMandatoryGroupStatuses(state, actorId), [state, actorId]);
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

export function useInvitation(invitationId: string | undefined): Invitation | undefined {
  const state = useAppState();
  return useMemo(
    () => state.invitations.find((invitation) => invitation.id === invitationId),
    [state, invitationId]
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

// ---------------------------------------------------------------------------
// Admin entity selectors
// ---------------------------------------------------------------------------

export function usePartners(): PartnerRecord[] {
  return useAppState().partners;
}

export function usePartner(id: string | undefined): PartnerRecord | undefined {
  const partners = usePartners();
  return useMemo(() => partners.find((p) => p.id === id), [partners, id]);
}

export function useBusinesses(): BusinessRecord[] {
  return useAppState().businesses;
}

export function useBusiness(id: string | undefined): BusinessRecord | undefined {
  const businesses = useBusinesses();
  return useMemo(() => businesses.find((b) => b.id === id), [businesses, id]);
}

export function useProgrammes(): ProgrammeRecord[] {
  return useAppState().programmes;
}

export function useCampaigns(): CampaignRecord[] {
  return useAppState().campaigns;
}

export function useRelationships(): RelationshipRecord[] {
  return useAppState().relationships;
}

export function useAuditLog(): AuditLogEntry[] {
  return useAppState().adminConfig.auditLog;
}

export function usePendingReviewGroups(): Group[] {
  const state = useAppState();
  return useMemo(() => state.groups.filter((g) => g.status === "Pending Review"), [state]);
}

// ---------------------------------------------------------------------------
// Circle type configuration (admin-authored)
// ---------------------------------------------------------------------------

/** Every circle type the administrator has defined, in creation order. */
export function useCircleTypeEntries(): CircleTypeConfigEntry[] {
  return useAppState().adminConfig.circleTypes;
}

/**
 * The circle types businesses may choose from — the ones the administrator
 * has enabled. This is the single source of truth for business dashboards.
 */
export function useCircleTypeMetas(): CircleTypeMeta[] {
  const entries = useCircleTypeEntries();
  return useMemo(
    () => entries.filter((entry) => entry.enabled).map(circleTypeMetaFrom),
    [entries]
  );
}

/** Resolve display metadata for a circle's type, with a safe fallback. */
export function useCircleTypeMeta(type: string): CircleTypeMeta {
  const entries = useCircleTypeEntries();
  return useMemo(() => {
    const found = entries.find((entry) => entry.type === type);
    return found ? circleTypeMetaFrom(found) : circleTypeFallback(type);
  }, [entries, type]);
}

/**
 * Memoised type → metadata lookup. Use this when resolving metadata inside a
 * `.map()` loop, where individual hooks cannot be called.
 */
export function useCircleTypeLookup(): (type: string) => CircleTypeMeta {
  const entries = useCircleTypeEntries();
  return useMemo(() => {
    const map = new Map(entries.map((entry) => [entry.type, circleTypeMetaFrom(entry)]));
    return (type: string) => map.get(type) ?? circleTypeFallback(type);
  }, [entries]);
}
