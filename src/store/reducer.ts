import type {
  ActivityEvent,
  AdminConfig,
  AdminConfigPatch,
  ContactIntakeMethod,
  ContributionFrequency,
  Group,
  GroupAccessType,
  GroupActivity,
  GroupActivityKind,
  GroupCircle,
  GroupPricingMode,
  GroupType,
  GroupVisibility,
  InteractionLevel,
  Invitation,
  InvitationStatus,
  NetworkContact,
} from "../domain/types";
import { DEFAULT_ADMIN_CONFIG } from "../data/adminData";
import { GROUPS, GROUP_ACTIVITIES, GROUP_INVITATIONS } from "../data/groupsData";
import { ACTIVITY, CIRCLES } from "../data/mockData";

export const STORE_VERSION = 1;

export interface Actor {
  id: string;
  name: string;
}

export interface AppState {
  version: number;
  groups: Group[];
  invitations: Invitation[];
  groupActivities: GroupActivity[];
  circles: GroupCircle[];
  circleActivities: ActivityEvent[];
  activeCircleId: string;
  adminConfig: AdminConfig;
  networkContacts: NetworkContact[];
}

export interface NewGroupInput {
  name: string;
  type: GroupType;
  purpose: string;
  accessType: GroupAccessType;
  city?: string;
  localArea?: string;
  requiredSize?: number;
  stage?: string;
  visibility?: GroupVisibility;
  interactionLevel?: InteractionLevel;
  pricing?: GroupPricingMode;
  contribution?: number;
  contributionFrequency?: ContributionFrequency;
}

export interface InvitationEntry {
  inviteeId?: string;
  inviteeName: string;
  inviteeEmail?: string;
}

export interface NewNetworkContactInput {
  fullName: string;
  email: string;
  phone: string;
  listId: string;
}

export type AppAction =
  | { type: "group/create"; input: NewGroupInput; owner: Actor }
  | { type: "group/join"; groupId: string; actor: Actor }
  | { type: "group/leave"; groupId: string; actor: Actor }
  | { type: "group/invite"; groupId: string; entries: InvitationEntry[]; actor: Actor }
  | { type: "group/add-member"; groupId: string; member: Actor; actor: Actor }
  | {
      type: "group/remove-member";
      groupId: string;
      memberId: string;
      memberName: string;
      actor: Actor;
    }
  | { type: "group/update"; groupId: string; patch: Partial<Group>; actor: Actor }
  | { type: "invitation/respond"; invitationId: string; accept: boolean; responder: Actor }
  | { type: "admin/update-config"; patch: AdminConfigPatch }
  | { type: "circle/create"; circle: GroupCircle }
  | { type: "circle/add-member"; circleId: string; member: Actor; note?: string }
  | { type: "circle/remove-member"; circleId: string; memberId: string }
  | { type: "circle/update-config"; circleId: string; config: GroupCircle["config"] }
  | { type: "circle/set-active"; circleId: string }
  | { type: "contact/add"; contact: NetworkContact }
  | { type: "contact/confirm"; contactId: string }
  | { type: "store/reset" };

let sequence = 0;

function uid(prefix: string): string {
  sequence += 1;
  return `${prefix}-${Date.now().toString(36)}-${sequence}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

export function newNetworkContact(
  input: NewNetworkContactInput,
  via: ContactIntakeMethod,
  addedByName: string
): NetworkContact {
  return {
    id: uid("ctc"),
    fullName: input.fullName.trim(),
    email: input.email.trim(),
    phone: input.phone.trim(),
    listId: input.listId,
    confirmation: "pending",
    intake: via,
    consentAt: nowIso(),
    addedAt: nowIso(),
    addedByName,
  };
}

export function createInitialAppState(): AppState {
  return {
    version: STORE_VERSION,
    groups: GROUPS.map((group) => ({ ...group, memberIds: [...group.memberIds] })),
    invitations: GROUP_INVITATIONS.map((invitation) => ({ ...invitation })),
    groupActivities: GROUP_ACTIVITIES.map((activity) => ({ ...activity })),
    circles: CIRCLES.map((circle) => ({ ...circle, memberIds: [...circle.memberIds] })),
    circleActivities: ACTIVITY.map((event) => ({ ...event })),
    activeCircleId: CIRCLES[0]?.id ?? "",
    networkContacts: [],
    adminConfig: {
      ...DEFAULT_ADMIN_CONFIG,
      automaticGrouping: { ...DEFAULT_ADMIN_CONFIG.automaticGrouping },
      groupTypes: DEFAULT_ADMIN_CONFIG.groupTypes.map((entry) => ({ ...entry })),
      stageLabels: [...DEFAULT_ADMIN_CONFIG.stageLabels],
      paymentRules: {
        ...DEFAULT_ADMIN_CONFIG.paymentRules,
        presets: [...DEFAULT_ADMIN_CONFIG.paymentRules.presets],
      },
    },
  };
}

function withGroupActivity(
  state: AppState,
  groupId: string,
  kind: GroupActivityKind,
  actorName: string,
  message: string
): GroupActivity[] {
  const entry: GroupActivity = {
    id: uid("ga"),
    groupId,
    actorName,
    kind,
    message,
    at: nowIso(),
  };
  return [entry, ...state.groupActivities];
}

function addMembers(state: AppState, groupId: string, memberIds: string[]): Group[] {
  return state.groups.map((group) => {
    if (group.id !== groupId) return group;
    const merged = [...group.memberIds];
    for (const id of memberIds) {
      if (!merged.includes(id)) merged.push(id);
    }
    return { ...group, memberIds: merged };
  });
}

function removeMember(state: AppState, groupId: string, memberId: string): Group[] {
  return state.groups.map((group) =>
    group.id === groupId
      ? { ...group, memberIds: group.memberIds.filter((id) => id !== memberId) }
      : group
  );
}

function respondToInvitation(state: AppState, action: Extract<AppAction, { type: "invitation/respond" }>): AppState {
  const invitation = state.invitations.find((entry) => entry.id === action.invitationId);
  if (!invitation || invitation.status !== "pending") return state;

  const group = state.groups.find((entry) => entry.id === invitation.groupId);
  const responderCanAct =
    action.responder.id === "admin" ||
    action.responder.id === invitation.inviteeId ||
    action.responder.id === invitation.invitedById ||
    action.responder.id === group?.ownerId;
  if (!responderCanAct) return state;

  const status: InvitationStatus = action.accept ? "accepted" : "declined";
  const invitations = state.invitations.map((entry) =>
    entry.id === invitation.id
      ? { ...entry, status, respondedAt: nowIso() }
      : entry
  );

  if (!action.accept) {
    const declinedByOwner = action.responder.id === invitation.invitedById;
    const groupActivities = withGroupActivity(
      state,
      invitation.groupId,
      "update",
      action.responder.name,
      declinedByOwner
        ? `${action.responder.name} cancelled the invitation to ${invitation.inviteeName}`
        : `${invitation.inviteeName} declined the invitation`
    );
    return { ...state, invitations, groupActivities };
  }

  const groups = invitation.inviteeId
    ? addMembers(state, invitation.groupId, [invitation.inviteeId])
    : state.groups;
  const groupActivities = withGroupActivity(
    state,
    invitation.groupId,
    invitation.kind === "invite" ? "join" : "update",
    invitation.inviteeName,
    invitation.kind === "invite"
      ? `${invitation.inviteeName} joined the group`
      : `${invitation.inviteeName} request approved by ${action.responder.name}`
  );
  return { ...state, groups, invitations, groupActivities };
}

function createGroup(state: AppState, action: Extract<AppAction, { type: "group/create" }>): AppState {
  const now = nowIso();
  const group: Group = {
    id: uid("grp"),
    name: action.input.name,
    type: action.input.type,
    source: "user-created",
    purpose: action.input.purpose,
    ownerId: action.owner.id,
    ownerName: action.owner.name,
    memberIds: [action.owner.id],
    status: "Recruiting",
    accessType: action.input.accessType,
    visibility: action.input.visibility ?? "directory",
    interactionLevel: action.input.interactionLevel ?? "message",
    createdAt: now.slice(0, 10),
    ...(action.input.city || action.input.localArea
      ? { location: { city: action.input.city, localArea: action.input.localArea } }
      : {}),
    ...(action.input.requiredSize ? { requiredSize: action.input.requiredSize } : {}),
    ...(action.input.stage ? { stage: action.input.stage } : {}),
    pricing: action.input.pricing ?? "free",
    ...(action.input.contribution ? { contribution: action.input.contribution } : {}),
    ...(action.input.pricing === "paid" && action.input.contributionFrequency
      ? { contributionFrequency: action.input.contributionFrequency }
      : {}),
  };
  const groupActivities = withGroupActivity(
    state,
    group.id,
    "created",
    action.owner.name,
    `${action.owner.name} created ${group.name}`
  );
  return { ...state, groups: [group, ...state.groups], groupActivities };
}

function joinGroup(state: AppState, action: Extract<AppAction, { type: "group/join" }>): AppState {
  const group = state.groups.find((entry) => entry.id === action.groupId);
  if (!group || group.memberIds.includes(action.actor.id)) return state;

  if (group.accessType === "open") {
    const groups = addMembers(state, group.id, [action.actor.id]);
    const groupActivities = withGroupActivity(
      state,
      group.id,
      "join",
      action.actor.name,
      `${action.actor.name} joined the group`
    );
    return { ...state, groups, groupActivities };
  }

  if (group.accessType === "invitation") return state;

  const alreadyRequested = state.invitations.some(
    (entry) =>
      entry.groupId === group.id &&
      entry.inviteeId === action.actor.id &&
      entry.kind === "request" &&
      entry.status === "pending"
  );
  if (alreadyRequested) return state;

  const invitation: Invitation = {
    id: uid("inv"),
    groupId: group.id,
    direction: "outgoing",
    kind: "request",
    inviteeId: action.actor.id,
    inviteeName: action.actor.name,
    invitedById: action.actor.id,
    invitedByName: action.actor.name,
    status: "pending",
    createdAt: nowIso(),
  };
  const groupActivities = withGroupActivity(
    state,
    group.id,
    "update",
    action.actor.name,
    `${action.actor.name} requested to join ${group.name}`
  );
  return {
    ...state,
    invitations: [invitation, ...state.invitations],
    groupActivities,
  };
}

function inviteMembers(state: AppState, action: Extract<AppAction, { type: "group/invite" }>): AppState {
  const group = state.groups.find((entry) => entry.id === action.groupId);
  if (!group) return state;

  const created: Invitation[] = [];
  let groupActivities = state.groupActivities;

  for (const entry of action.entries) {
    const duplicate = state.invitations.some(
      (existing) =>
        existing.groupId === group.id &&
        existing.status === "pending" &&
        ((entry.inviteeId && existing.inviteeId === entry.inviteeId) ||
          (!entry.inviteeId &&
            entry.inviteeEmail &&
            existing.inviteeEmail === entry.inviteeEmail))
    );
    if (duplicate) continue;

    created.push({
      id: uid("inv"),
      groupId: group.id,
      direction: "outgoing",
      kind: "invite",
      inviteeId: entry.inviteeId,
      inviteeName: entry.inviteeName,
      inviteeEmail: entry.inviteeEmail,
      invitedById: action.actor.id,
      invitedByName: action.actor.name,
      status: "pending",
      createdAt: nowIso(),
    });
    groupActivities = [
      {
        id: uid("ga"),
        groupId: group.id,
        actorName: action.actor.name,
        kind: "invite",
        message: `${action.actor.name} invited ${entry.inviteeName}`,
        at: nowIso(),
      },
      ...groupActivities,
    ];
  }

  if (created.length === 0) return state;
  return { ...state, invitations: [...created, ...state.invitations], groupActivities };
}

function updateGroup(state: AppState, action: Extract<AppAction, { type: "group/update" }>): AppState {
  const group = state.groups.find((entry) => entry.id === action.groupId);
  if (!group) return state;
  const groups = state.groups.map((entry) =>
    entry.id === action.groupId ? { ...entry, ...action.patch, id: entry.id } : entry
  );
  const groupActivities = withGroupActivity(
    state,
    group.id,
    "settings",
    action.actor.name,
    `${action.actor.name} updated ${group.name} settings`
  );
  return { ...state, groups, groupActivities };
}

function updateAdminConfig(state: AppState, patch: AdminConfigPatch): AppState {
  return {
    ...state,
    adminConfig: {
      ...state.adminConfig,
      ...patch,
      automaticGrouping: {
        ...state.adminConfig.automaticGrouping,
        ...patch.automaticGrouping,
      },
      groupTypes: patch.groupTypes
        ? patch.groupTypes.map((entry) => ({ ...entry }))
        : state.adminConfig.groupTypes.map((entry) => ({ ...entry })),
      stageLabels: patch.stageLabels
        ? [...patch.stageLabels]
        : [...state.adminConfig.stageLabels],
      paymentRules: {
        ...(state.adminConfig.paymentRules ?? { allowPaid: true, minAmount: 0, maxAmount: 0, presets: [], allowCustom: false }),
        ...patch.paymentRules,
        presets: patch.paymentRules?.presets
          ? [...patch.paymentRules.presets]
          : [...(state.adminConfig.paymentRules?.presets ?? [])],
      },
    },
  };
}

function addCircleMember(state: AppState, action: Extract<AppAction, { type: "circle/add-member" }>): AppState {
  const circles = state.circles.map((circle) =>
    circle.id === action.circleId && !circle.memberIds.includes(action.member.id)
      ? { ...circle, memberIds: [...circle.memberIds, action.member.id] }
      : circle
  );
  const unchanged = state.circles.find((circle) => circle.id === action.circleId)?.memberIds;
  const nowChanged = circles.find((circle) => circle.id === action.circleId)?.memberIds;
  if (unchanged && nowChanged && unchanged.length === nowChanged.length) return state;

  const event: ActivityEvent = {
    id: uid("a"),
    circleId: action.circleId,
    memberId: action.member.id,
    kind: "join",
    message: action.note ?? `${action.member.name} joined the circle`,
    at: nowIso(),
  };
  return { ...state, circles, circleActivities: [event, ...state.circleActivities] };
}

function removeCircleMember(state: AppState, action: Extract<AppAction, { type: "circle/remove-member" }>): AppState {
  const circles = state.circles.map((circle) =>
    circle.id === action.circleId
      ? { ...circle, memberIds: circle.memberIds.filter((id) => id !== action.memberId) }
      : circle
  );
  const event: ActivityEvent = {
    id: uid("a"),
    circleId: action.circleId,
    memberId: action.memberId,
    kind: "update",
    message: "Member removed from the circle",
    at: nowIso(),
  };
  return { ...state, circles, circleActivities: [event, ...state.circleActivities] };
}

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case "group/create":
      return createGroup(state, action);
    case "group/join":
      return joinGroup(state, action);
    case "group/leave": {
      const group = state.groups.find((entry) => entry.id === action.groupId);
      if (!group || !group.memberIds.includes(action.actor.id)) return state;
      const groups = removeMember(state, group.id, action.actor.id);
      const groupActivities = withGroupActivity(
        state,
        group.id,
        "leave",
        action.actor.name,
        `${action.actor.name} left the group`
      );
      return { ...state, groups, groupActivities };
    }
    case "group/invite":
      return inviteMembers(state, action);
    case "group/add-member": {
      const group = state.groups.find((entry) => entry.id === action.groupId);
      if (!group || group.memberIds.includes(action.member.id)) return state;
      const groups = addMembers(state, group.id, [action.member.id]);
      const groupActivities = withGroupActivity(
        state,
        group.id,
        "join",
        action.actor.name,
        `${action.member.name} joined ${group.name}`
      );
      return { ...state, groups, groupActivities };
    }
    case "group/update":
      return updateGroup(state, action);
    case "group/remove-member": {
      const group = state.groups.find((entry) => entry.id === action.groupId);
      if (
        !group ||
        group.ownerId !== action.actor.id ||
        group.ownerId === action.memberId ||
        !group.memberIds.includes(action.memberId)
      )
        return state;
      const groups = removeMember(state, group.id, action.memberId);
      const groupActivities = withGroupActivity(
        state,
        group.id,
        "update",
        action.actor.name,
        `${action.actor.name} removed ${action.memberName} from ${group.name}`
      );
      return { ...state, groups, groupActivities };
    }
    case "invitation/respond":
      return respondToInvitation(state, action);
    case "admin/update-config":
      return updateAdminConfig(state, action.patch);
    case "circle/create":
      return {
        ...state,
        circles: [action.circle, ...state.circles],
        activeCircleId: action.circle.id,
        circleActivities: [
          {
            id: uid("a"),
            circleId: action.circle.id,
            kind: "update",
            message: "Circle created",
            at: nowIso(),
          },
          ...state.circleActivities,
        ],
      };
    case "circle/add-member":
      return addCircleMember(state, action);
    case "circle/remove-member":
      return removeCircleMember(state, action);
    case "circle/update-config":
      return {
        ...state,
        circles: state.circles.map((circle) =>
          circle.id === action.circleId ? { ...circle, config: action.config } : circle
        ),
      };
    case "circle/set-active":
      return state.activeCircleId === action.circleId
        ? state
        : { ...state, activeCircleId: action.circleId };
    case "contact/add":
      return state.networkContacts.some((contact) => contact.id === action.contact.id)
        ? state
        : { ...state, networkContacts: [action.contact, ...state.networkContacts] };
    case "contact/confirm":
      return {
        ...state,
        networkContacts: state.networkContacts.map((contact) =>
          contact.id === action.contactId && contact.confirmation === "pending"
            ? { ...contact, confirmation: "confirmed" }
            : contact
        ),
      };
    case "store/reset":
      return createInitialAppState();
    default:
      return state;
  }
}
