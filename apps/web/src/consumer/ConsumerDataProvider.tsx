import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Group, GroupAccessType, GroupStatus, GroupType, Invitation, InvitationStatus, GroupThreshold } from "../domain/types";
import { useAppStore } from "../store/context";
import { consumerApi, type ConsumerGroupResponse, type ConsumerInvitationResponse } from "./consumerApi";

interface ConsumerData {
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

function groupFromApi(group: ConsumerGroupResponse, memberIds: string[] = []): Group {
  return {
    id: group.id,
    name: group.name,
    type: (group.type as GroupType) || "Other",
    source: "user-created",
    purpose: group.purpose || group.description || "",
    ownerId: "",
    ownerName: "",
    memberIds,
    memberCount: group.memberCount,
    location: { city: group.city ?? undefined, localArea: group.localArea ?? undefined },
    status: (group.status as GroupStatus) || "Active",
    accessType: (group.accessType as GroupAccessType) || "open",
    pricing: (group.pricing as "free" | "paid" | undefined) ?? "free",
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
  };
}

export function ConsumerDataProvider({ children }: { children: ReactNode }) {
  const { dispatch } = useAppStore();
  const [groups, setGroups] = useState<Group[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [explore, setExplore] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [dashboard, discovered] = await Promise.all([
        consumerApi.dashboard(),
        consumerApi.explore(),
      ]);
      const nextGroups = dashboard.groups.map((group) =>
        groupFromApi(group, group.membership ? [group.membership.memberId] : []),
      );
      setGroups(nextGroups);
      setInvitations(dashboard.invitations.map(invitationFromApi));
      setExplore(discovered.map((group) => groupFromApi(group)));
      dispatch({
        type: "business/hydrate",
        payload: {
          profile: null,
          stats: null,
          groups: nextGroups,
          invitations: dashboard.invitations.map(invitationFromApi),
          groupActivities: [],
          circles: [],
          circleActivities: [],
          adminConfig: {
            ...createEmptyConfig(),
            auditLog: [],
          },
          plan: {
            ownerId: dashboard.profile.id,
            variant: "Standard",
            planName: "",
            status: "Active",
            paid: false,
            accessDays: 0,
            accessFee: 0,
            accessFeeMinor: 0,
            agreementAccepted: true,
          },
        },
      });
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load consumer data");
    } finally {
      setLoading(false);
    }
  }, [dispatch]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const join = useCallback(async (id: string) => {
    await consumerApi.join(id);
    await refresh();
  }, [refresh]);

  const leave = useCallback(async (id: string) => {
    await consumerApi.leave(id);
    await refresh();
  }, [refresh]);

  const respond = useCallback(async (id: string, accept: boolean) => {
    await consumerApi.respondInvitation(id, accept);
    await refresh();
  }, [refresh]);

  const value = useMemo(
    () => ({ groups, invitations, explore, loading, error, refresh, join, leave, respond }),
    [groups, invitations, explore, loading, error, refresh, join, leave, respond],
  );

  return <ConsumerDataContext.Provider value={value}>{children}</ConsumerDataContext.Provider>;
}

export function useConsumerData(): ConsumerData {
  const value = useContext(ConsumerDataContext);
  if (!value) throw new Error("useConsumerData must be used within ConsumerDataProvider");
  return value;
}

function createEmptyConfig() {
  return {
    automaticGrouping: { enabled: false, threshold: 6 as GroupThreshold, method: "", scope: "", allowCombine: false },
    groupTypes: [],
    stageLabels: [],
    paymentRules: { allowPaid: false, minAmount: 0, maxAmount: 0, presets: [], allowCustom: false },
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
      entryAccessDays: 90 as 90 | 180,
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
  };
}
