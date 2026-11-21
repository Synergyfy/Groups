import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type {
  Group,
  GroupAccessType,
  GroupStatus,
  GroupType,
  GroupVisibility,
  InteractionLevel,
  Invitation,
  InvitationStatus,
} from "../domain/types";
import {
  consumerApi,
  type ConsumerGroupResponse,
  type ConsumerInvitationResponse,
  type ConsumerProfile,
} from "./consumerApi";

interface ConsumerData {
  profile: ConsumerProfile | null;
  groups: Group[];
  invitations: Invitation[];
  explore: Group[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  join: (id: string) => Promise<void>;
  leave: (id: string) => Promise<void>;
  respond: (id: string, accept: boolean) => Promise<void>;
}

const ConsumerDataContext = createContext<ConsumerData | null>(null);

function groupFromApi(
  group: ConsumerGroupResponse,
  memberIds: string[] = [],
): Group {
  return {
    id: group.id,
    name: group.name,
    type: (group.type as GroupType) || "Other",
    source: "user-created",
    purpose: group.purpose || group.description || "",
    ownerId: group.ownerId ?? "",
    ownerName: group.ownerName ?? "",
    memberIds,
    memberCount: group.memberCount,
    location: {
      city: group.city ?? undefined,
      localArea: group.localArea ?? undefined,
    },
    requiredSize: group.requiredSize ?? undefined,
    status: (group.status as GroupStatus) || "Active",
    accessType: (group.accessType as GroupAccessType) || "open",
    visibility: (group.directoryVisibility as GroupVisibility) ?? undefined,
    interactionLevel: (group.interactionLevel as InteractionLevel) ?? undefined,
    pricing: (group.pricing as "free" | "paid" | undefined) ?? "free",
    requiredPlanIds: group.requiredPlanIds ?? [],
    contribution: group.contribution ?? undefined,
    contributionMinor: group.contributionMinor ?? undefined,
    contributionFrequency:
      (group.contributionFrequency as Group["contributionFrequency"]) ??
      undefined,
    createdAt: group.createdAt,
    isMember: Boolean(group.membership),
    role: group.membership?.role === "owner" ? "owner" : group.membership ? "member" : "none",
  };
}

function invitationFromApi(invitation: ConsumerInvitationResponse): Invitation {
  return {
    id: invitation.id,
    groupId: invitation.groupId ?? undefined,
    circleId: invitation.circleId ?? undefined,
    direction: invitation.direction === "incoming" ? "incoming" : "outgoing",
    kind: invitation.kind === "request" ? "request" : "invite",
    inviteeId: invitation.inviteeId ?? undefined,
    inviteeName: invitation.inviteeName,
    inviteeEmail: invitation.inviteeEmail ?? undefined,
    inviteePhone: invitation.inviteePhone ?? undefined,
    inviteeRole:
      invitation.inviteeRole === "business-invitee" || invitation.inviteeRole === "consumer"
        ? invitation.inviteeRole
        : undefined,
    invitedById: invitation.invitedById,
    invitedByName: invitation.invitedByName,
    status: (invitation.status as InvitationStatus) || "pending",
    createdAt: invitation.createdAt,
    respondedAt: invitation.respondedAt ?? undefined,
    groupName: invitation.groupName ?? undefined,
    circleName: invitation.circleName ?? undefined,
    circleBusinessName: invitation.circleBusinessName ?? undefined,
  };
}

export function ConsumerDataProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<ConsumerProfile | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [explore, setExplore] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const dashboard = await consumerApi.dashboard();
      const nextGroups = dashboard.groups.map((group) =>
        groupFromApi(group, group.membership ? [group.membership.memberId] : []),
      );
      let discovered: ConsumerGroupResponse[] = [];
      try {
        discovered = await consumerApi.explore();
      } catch {
        // Discovery is supplementary; keep the dashboard usable if it fails.
      }
      setProfile(dashboard.profile);
      setGroups(nextGroups);
      setInvitations(dashboard.invitations.map(invitationFromApi));
      setExplore(
        discovered.map((group) =>
          groupFromApi(group, group.membership ? [group.membership.memberId] : []),
        ),
      );
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load consumer data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Initial dashboard load; refresh only updates state after the request.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, [refresh]);

  const join = useCallback(
    async (id: string) => {
      await consumerApi.join(id);
      await refresh();
    },
    [refresh],
  );

  const leave = useCallback(
    async (id: string) => {
      await consumerApi.leave(id);
      await refresh();
    },
    [refresh],
  );

  const respond = useCallback(
    async (id: string, accept: boolean) => {
      await consumerApi.respondInvitation(id, accept);
      await refresh();
    },
    [refresh],
  );

  const value = useMemo(
    () => ({
      profile,
      groups,
      invitations,
      explore,
      loading,
      error,
      refresh,
      join,
      leave,
      respond,
    }),
    [profile, groups, invitations, explore, loading, error, refresh, join, leave, respond],
  );

  return <ConsumerDataContext.Provider value={value}>{children}</ConsumerDataContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useConsumerData(): ConsumerData {
  const value = useContext(ConsumerDataContext);
  if (!value) throw new Error("useConsumerData must be used within ConsumerDataProvider");
  return value;
}
