import type {
  ActivityEvent,
  AdminConfig,
  AdminConfigPatch,
  AuditActionKind,
  AuditLogEntry,
  BusinessRecord,
  CampaignRecord,
  CircleTypeConfigEntry,
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
  PartnerRecord,
  ProgrammeRecord,
  RelationshipRecord,
} from "../domain/types";
import {
  BUSINESSES,
  CAMPAIGNS_ADMIN,
  DEFAULT_ADMIN_CONFIG,
  PARTNERS,
  PROGRAMMES_ADMIN,
  RELATIONSHIPS_ADMIN,
} from "../data/adminData";
import { GROUPS, GROUP_ACTIVITIES, GROUP_INVITATIONS } from "../data/groupsData";
import { ACTIVITY, CIRCLES } from "../data/mockData";

export const STORE_VERSION = 2;

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
  partners: PartnerRecord[];
  businesses: BusinessRecord[];
  programmes: ProgrammeRecord[];
  campaigns: CampaignRecord[];
  relationships: RelationshipRecord[];
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
  | { type: "admin/group-update"; groupId: string; patch: Partial<Group>; actor: Actor }
  | { type: "admin/group-delete"; groupId: string; actor: Actor }
  | { type: "admin/group-approve"; groupId: string; actor: Actor }
  | { type: "admin/group-suspend"; groupId: string; actor: Actor }
  | { type: "admin/group-close"; groupId: string; actor: Actor }
  | { type: "admin/member-add"; groupId: string; member: Actor; actor: Actor }
  | { type: "admin/member-remove"; groupId: string; memberId: string; memberName: string; actor: Actor }
  | { type: "admin/invitation-respond"; invitationId: string; accept: boolean; actor: Actor }
  | { type: "admin/partner-update"; partnerId: string; patch: Partial<PartnerRecord>; actor: Actor }
  | { type: "admin/business-update"; businessId: string; patch: Partial<BusinessRecord>; actor: Actor }
  | { type: "admin/programme-update"; programmeId: string; patch: Partial<ProgrammeRecord>; actor: Actor }
  | { type: "admin/campaign-update"; campaignId: string; patch: Partial<CampaignRecord>; actor: Actor }
  | { type: "admin/relationship-assign"; groupId: string; kind: "account-manager" | "agent" | "consultant"; relationshipId: string | undefined; actor: Actor }
  | { type: "admin/circle-type-create"; entry: CircleTypeConfigEntry; actor: Actor }
  | { type: "admin/circle-type-update"; id: string; patch: Partial<CircleTypeConfigEntry>; actor: Actor }
  | { type: "admin/circle-type-delete"; id: string; actor: Actor }
  | { type: "admin/audit-log"; entry: Omit<AuditLogEntry, "id" | "at"> }
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

function withAuditLog(
  state: AppState,
  action: AuditActionKind,
  actor: Actor,
  targetType: AuditLogEntry["targetType"],
  targetId: string,
  targetName: string,
  detail: string
): AuditLogEntry[] {
  const entry: AuditLogEntry = {
    id: uid("aud"),
    action,
    actorId: actor.id,
    actorName: actor.name,
    targetType,
    targetId,
    targetName,
    detail,
    at: nowIso(),
  };
  return [entry, ...state.adminConfig.auditLog];
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
      circleTypes: DEFAULT_ADMIN_CONFIG.circleTypes.map((entry) => ({
        ...entry,
        allowedDurations: [...entry.allowedDurations],
      })),
      mandatoryCircles: DEFAULT_ADMIN_CONFIG.mandatoryCircles.map((entry) => ({ ...entry })),
      partnerDefaults: { ...DEFAULT_ADMIN_CONFIG.partnerDefaults },
      auditLog: [],
    },
    partners: PARTNERS.map((partner) => ({
      ...partner,
      permissions: { ...partner.permissions },
    })),
    businesses: BUSINESSES.map((business) => ({ ...business })),
    programmes: PROGRAMMES_ADMIN.map((programme) => ({
      ...programme,
      benefits: [...programme.benefits],
    })),
    campaigns: CAMPAIGNS_ADMIN.map((campaign) => ({ ...campaign, groupIds: [...campaign.groupIds] })),
    relationships: RELATIONSHIPS_ADMIN.map((rel) => ({ ...rel })),
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

  const status: InvitationStatus = action.accept ? "accepted" : "declined";
  const invitations = state.invitations.map((entry) =>
    entry.id === invitation.id
      ? { ...entry, status, respondedAt: nowIso() }
      : entry
  );

  // --- Circle invitation: accepting adds the participant to the circle -----
  if (invitation.circleId) {
    const circle = state.circles.find((entry) => entry.id === invitation.circleId);
    const responderCanAct =
      action.responder.id === "admin" ||
      action.responder.id === invitation.inviteeId ||
      action.responder.id === invitation.invitedById;
    if (!responderCanAct) return state;

    if (!action.accept || !circle || !invitation.inviteeId) {
      return { ...state, invitations };
    }
    if (circle.memberIds.includes(invitation.inviteeId)) {
      return { ...state, invitations };
    }

    const circles = state.circles.map((entry) =>
      entry.id === circle.id
        ? { ...entry, memberIds: [...entry.memberIds, invitation.inviteeId as string] }
        : entry
    );
    const circleActivities: ActivityEvent[] = [
      {
        id: uid("a"),
        circleId: circle.id,
        kind: "join",
        message: `${invitation.inviteeName} accepted the invitation and joined`,
        at: nowIso(),
      },
      ...state.circleActivities,
    ];
    return { ...state, invitations, circles, circleActivities };
  }

  // --- Group invitation ---------------------------------------------------
  if (!invitation.groupId) return state;
  const groupId = invitation.groupId;
  const group = state.groups.find((entry) => entry.id === groupId);
  const responderCanAct =
    action.responder.id === "admin" ||
    action.responder.id === invitation.inviteeId ||
    action.responder.id === invitation.invitedById ||
    action.responder.id === group?.ownerId;
  if (!responderCanAct) return state;

  if (!action.accept) {
    const declinedByOwner = action.responder.id === invitation.invitedById;
    const groupActivities = withGroupActivity(
      state,
      groupId,
      "update",
      action.responder.name,
      declinedByOwner
        ? `${action.responder.name} cancelled the invitation to ${invitation.inviteeName}`
        : `${invitation.inviteeName} declined the invitation`
    );
    return { ...state, invitations, groupActivities };
  }

  const groups = invitation.inviteeId
    ? addMembers(state, groupId, [invitation.inviteeId])
    : state.groups;
  const groupActivities = withGroupActivity(
    state,
    groupId,
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
      circleTypes: patch.circleTypes
        ? patch.circleTypes.map((entry) => ({ ...entry, allowedDurations: [...entry.allowedDurations] }))
        : state.adminConfig.circleTypes.map((entry) => ({ ...entry, allowedDurations: [...entry.allowedDurations] })),
      mandatoryCircles: patch.mandatoryCircles
        ? patch.mandatoryCircles.map((entry) => ({ ...entry }))
        : state.adminConfig.mandatoryCircles.map((entry) => ({ ...entry })),
      partnerDefaults: patch.partnerDefaults
        ? { ...state.adminConfig.partnerDefaults, ...patch.partnerDefaults }
        : state.adminConfig.partnerDefaults,
      auditLog: patch.auditLog
        ? [...patch.auditLog]
        : state.adminConfig.auditLog,
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
    case "admin/update-config": {
      const next = updateAdminConfig(state, action.patch);
      return next;
    }
    case "admin/group-update": {
      const group = state.groups.find((entry) => entry.id === action.groupId);
      if (!group) return state;
      const groups = state.groups.map((entry) =>
        entry.id === action.groupId ? { ...entry, ...action.patch, id: entry.id } : entry
      );
      const auditLog = withAuditLog(state, "group-updated", action.actor, "group", group.id, group.name, `Admin updated ${group.name}`);
      return { ...state, groups, adminConfig: { ...state.adminConfig, auditLog } };
    }
    case "admin/group-delete": {
      const group = state.groups.find((entry) => entry.id === action.groupId);
      if (!group) return state;
      const groups = state.groups.filter((entry) => entry.id !== action.groupId);
      const invitations = state.invitations.filter((entry) => entry.groupId !== action.groupId);
      const auditLog = withAuditLog(state, "group-deleted", action.actor, "group", group.id, group.name, `Admin deleted ${group.name}`);
      return { ...state, groups, invitations, adminConfig: { ...state.adminConfig, auditLog } };
    }
    case "admin/group-approve": {
      const group = state.groups.find((entry) => entry.id === action.groupId);
      if (!group) return state;
      const groups = state.groups.map((entry) =>
        entry.id === action.groupId ? { ...entry, status: "Active" as const } : entry
      );
      const auditLog = withAuditLog(state, "group-approved", action.actor, "group", group.id, group.name, `Admin approved ${group.name}`);
      return { ...state, groups, adminConfig: { ...state.adminConfig, auditLog } };
    }
    case "admin/group-suspend": {
      const group = state.groups.find((entry) => entry.id === action.groupId);
      if (!group) return state;
      const groups = state.groups.map((entry) =>
        entry.id === action.groupId ? { ...entry, status: "Suspended" as const } : entry
      );
      const auditLog = withAuditLog(state, "group-suspended", action.actor, "group", group.id, group.name, `Admin suspended ${group.name}`);
      return { ...state, groups, adminConfig: { ...state.adminConfig, auditLog } };
    }
    case "admin/group-close": {
      const group = state.groups.find((entry) => entry.id === action.groupId);
      if (!group) return state;
      const groups = state.groups.map((entry) =>
        entry.id === action.groupId ? { ...entry, status: "Closed" as const } : entry
      );
      const auditLog = withAuditLog(state, "group-closed", action.actor, "group", group.id, group.name, `Admin closed ${group.name}`);
      return { ...state, groups, adminConfig: { ...state.adminConfig, auditLog } };
    }
    case "admin/member-add": {
      const group = state.groups.find((entry) => entry.id === action.groupId);
      if (!group || group.memberIds.includes(action.member.id)) return state;
      const groups = addMembers(state, group.id, [action.member.id]);
      const groupActivities = withGroupActivity(state, group.id, "join", action.actor.name, `${action.member.name} added to ${group.name} by admin`);
      const auditLog = withAuditLog(state, "member-added", action.actor, "member", action.member.id, action.member.name, `Admin added ${action.member.name} to ${group.name}`);
      return { ...state, groups, groupActivities, adminConfig: { ...state.adminConfig, auditLog } };
    }
    case "admin/member-remove": {
      const group = state.groups.find((entry) => entry.id === action.groupId);
      if (!group || !group.memberIds.includes(action.memberId)) return state;
      const groups = removeMember(state, group.id, action.memberId);
      const groupActivities = withGroupActivity(state, group.id, "update", action.actor.name, `${action.memberName} removed from ${group.name} by admin`);
      const auditLog = withAuditLog(state, "member-removed", action.actor, "member", action.memberId, action.memberName, `Admin removed ${action.memberName} from ${group.name}`);
      return { ...state, groups, groupActivities, adminConfig: { ...state.adminConfig, auditLog } };
    }
    case "admin/invitation-respond": {
      const invitation = state.invitations.find((entry) => entry.id === action.invitationId);
      if (!invitation || invitation.status !== "pending") return state;
      const status: InvitationStatus = action.accept ? "accepted" : "declined";
      const invitations = state.invitations.map((entry) =>
        entry.id === invitation.id ? { ...entry, status, respondedAt: nowIso() } : entry
      );
      const auditLog = withAuditLog(state, action.accept ? "invitation-approved" : "invitation-declined", action.actor, "invitation", invitation.id, invitation.inviteeName, `Admin ${action.accept ? "approved" : "declined"} invitation for ${invitation.inviteeName}`);

      if (invitation.circleId) {
        const circle = state.circles.find((entry) => entry.id === invitation.circleId);
        if (!action.accept || !circle || !invitation.inviteeId || circle.memberIds.includes(invitation.inviteeId)) {
          return { ...state, invitations, adminConfig: { ...state.adminConfig, auditLog } };
        }
        const circles = state.circles.map((entry) =>
          entry.id === circle.id
            ? { ...entry, memberIds: [...entry.memberIds, invitation.inviteeId as string] }
            : entry
        );
        const circleActivities: ActivityEvent[] = [
          {
            id: uid("a"),
            circleId: circle.id,
            kind: "join",
            message: `${action.actor.name} approved ${invitation.inviteeName} into the circle`,
            at: nowIso(),
          },
          ...state.circleActivities,
        ];
        return { ...state, invitations, circles, circleActivities, adminConfig: { ...state.adminConfig, auditLog } };
      }

      if (!invitation.groupId) {
        return { ...state, invitations, adminConfig: { ...state.adminConfig, auditLog } };
      }
      let groups = state.groups;
      let groupActivities;
      if (action.accept && invitation.inviteeId) {
        groups = addMembers(state, invitation.groupId, [invitation.inviteeId]);
        groupActivities = withGroupActivity(state, invitation.groupId, "join", action.actor.name, `Admin approved ${invitation.inviteeName}'s invitation`);
      } else {
        groupActivities = withGroupActivity(state, invitation.groupId, "update", action.actor.name, `Admin ${action.accept ? "approved" : "declined"} invitation for ${invitation.inviteeName}`);
      }
      return { ...state, invitations, groups, groupActivities, adminConfig: { ...state.adminConfig, auditLog } };
    }
    case "admin/partner-update": {
      const partner = state.partners.find((entry) => entry.id === action.partnerId);
      if (!partner) return state;
      const partners = state.partners.map((entry) =>
        entry.id === action.partnerId ? { ...entry, ...action.patch, id: entry.id, permissions: { ...entry.permissions, ...action.patch.permissions } } : entry
      );
      const auditLog = withAuditLog(state, "partner-updated", action.actor, "partner", partner.id, partner.businessName, `Admin updated partner ${partner.businessName}`);
      return { ...state, partners, adminConfig: { ...state.adminConfig, auditLog } };
    }
    case "admin/business-update": {
      const business = state.businesses.find((entry) => entry.id === action.businessId);
      if (!business) return state;
      const businesses = state.businesses.map((entry) =>
        entry.id === action.businessId ? { ...entry, ...action.patch, id: entry.id } : entry
      );
      const auditLog = withAuditLog(state, "business-updated", action.actor, "business", business.id, business.name, `Admin updated business ${business.name}`);
      return { ...state, businesses, adminConfig: { ...state.adminConfig, auditLog } };
    }
    case "admin/programme-update": {
      const programme = state.programmes.find((entry) => entry.id === action.programmeId);
      if (!programme) return state;
      const programmes = state.programmes.map((entry) =>
        entry.id === action.programmeId ? { ...entry, ...action.patch, id: entry.id } : entry
      );
      const auditLog = withAuditLog(state, "programme-updated", action.actor, "programme", programme.id, programme.name, `Admin updated programme ${programme.name}`);
      return { ...state, programmes, adminConfig: { ...state.adminConfig, auditLog } };
    }
    case "admin/campaign-update": {
      const campaign = state.campaigns.find((entry) => entry.id === action.campaignId);
      if (!campaign) return state;
      const campaigns = state.campaigns.map((entry) =>
        entry.id === action.campaignId ? { ...entry, ...action.patch, id: entry.id } : entry
      );
      const auditLog = withAuditLog(state, "campaign-updated", action.actor, "campaign", campaign.id, campaign.name, `Admin updated campaign ${campaign.name}`);
      return { ...state, campaigns, adminConfig: { ...state.adminConfig, auditLog } };
    }
    case "admin/relationship-assign": {
      const group = state.groups.find((entry) => entry.id === action.groupId);
      if (!group) return state;
      const patch: Partial<Group> = {};
      if (action.kind === "account-manager") patch.accountManagerId = action.relationshipId;
      if (action.kind === "agent") patch.agentId = action.relationshipId;
      if (action.kind === "consultant") patch.consultantId = action.relationshipId;
      const groups = state.groups.map((entry) =>
        entry.id === action.groupId ? { ...entry, ...patch } : entry
      );
      const relName = state.relationships.find((r) => r.id === action.relationshipId)?.name ?? "Unassigned";
      const auditLog = withAuditLog(state, "relationship-assigned", action.actor, "group", group.id, group.name, `Admin assigned ${action.kind} ${relName} to ${group.name}`);
      return { ...state, groups, adminConfig: { ...state.adminConfig, auditLog } };
    }
    case "admin/circle-type-create": {
      if (state.adminConfig.circleTypes.some((entry) => entry.id === action.entry.id)) return state;
      const circleTypes = [...state.adminConfig.circleTypes, action.entry];
      const auditLog = withAuditLog(state, "circle-type-created", action.actor, "circle-type", action.entry.id, action.entry.type, `Admin created circle type “${action.entry.type}”`);
      return { ...state, adminConfig: { ...state.adminConfig, circleTypes, auditLog } };
    }
    case "admin/circle-type-update": {
      const existing = state.adminConfig.circleTypes.find((entry) => entry.id === action.id);
      if (!existing) return state;
      const circleTypes = state.adminConfig.circleTypes.map((entry) =>
        entry.id === action.id ? { ...entry, ...action.patch, id: entry.id, type: entry.type } : entry
      );
      const nextName = action.patch.type ?? existing.type;
      const auditLog = withAuditLog(state, "circle-type-updated", action.actor, "circle-type", existing.id, nextName, `Admin updated circle type “${nextName}”`);
      return { ...state, adminConfig: { ...state.adminConfig, circleTypes, auditLog } };
    }
    case "admin/circle-type-delete": {
      const existing = state.adminConfig.circleTypes.find((entry) => entry.id === action.id);
      if (!existing) return state;
      const circleTypes = state.adminConfig.circleTypes.filter((entry) => entry.id !== action.id);
      const mandatoryCircles = state.adminConfig.mandatoryCircles.filter(
        (rule) => rule.circleType !== existing.type
      );
      const auditLog = withAuditLog(state, "circle-type-deleted", action.actor, "circle-type", existing.id, existing.type, `Admin deleted circle type “${existing.type}”`);
      return { ...state, adminConfig: { ...state.adminConfig, circleTypes, mandatoryCircles, auditLog } };
    }
    case "admin/audit-log": {
      const entry: AuditLogEntry = { ...action.entry, id: uid("aud"), at: nowIso() };
      return { ...state, adminConfig: { ...state.adminConfig, auditLog: [entry, ...state.adminConfig.auditLog] } };
    }
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
