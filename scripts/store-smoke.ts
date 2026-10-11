import {
  appReducer,
  createInitialAppState,
  newNetworkContact,
} from "../src/store/reducer";
import type { AppAction, AppState } from "../src/store/reducer";
import {
  selectAdminFilteredGroups,
  selectAutomaticProgress,
  selectExploreGroups,
  selectGroupStats,
  selectMyGroups,
  selectNetworkContacts,
  selectNetworkStats,
  selectOwnedGroups,
} from "../src/store/selectors";
import { creatableGroupTypes, nonCreatableGroupTypes } from "../src/features/groups/groupUtils";

const BLANK_ADMIN_FILTERS = {
  type: "all",
  city: "all",
  localArea: "all",
  status: "all",
  stage: "all",
  owner: "all",
  programme: "all",
  source: "all",
  query: "",
};

const ACTOR = { id: "biz-smith", name: "Smith Business" };
const OTHER = { id: "biz-green-market", name: "Green Market" };

let passed = 0;
let failed = 0;

function check(label: string, condition: boolean, detail?: string): void {
  if (condition) {
    passed += 1;
    console.log(`PASS  ${label}`);
  } else {
    failed += 1;
    console.log(`FAIL  ${label}${detail ? ` — ${detail}` : ""}`);
  }
}

function run(actions: AppAction[], from: AppState = createInitialAppState()): AppState {
  return actions.reduce(appReducer, from);
}

const initial = createInitialAppState();

check("initial state version is 1", initial.version === 1);
check("initial state has 14 groups", initial.groups.length === 14, `${initial.groups.length}`);
check("initial state has 10 invitations", initial.invitations.length === 10);
check("initial state has 10 group activities", initial.groupActivities.length === 10);
check("initial state has circles", initial.circles.length > 0);
check(
  "initial active circle resolves",
  initial.circles.some((c) => c.id === initial.activeCircleId)
);

const myGroups = selectMyGroups(initial, ACTOR.id);
check("biz-smith belongs to 7 groups", myGroups.length === 7, `${myGroups.length}`);
check(
  "my groups contain the marketing group",
  myGroups.some((g) => g.id === "grp-smith-marketing")
);

const owned = selectOwnedGroups(initial, ACTOR.id);
check("biz-smith owns 2 groups", owned.length === 2, `${owned.length}`);

const explore = selectExploreGroups(initial, ACTOR.id);
check(
  "explore excludes groups I belong to",
  explore.every((g) => !g.memberIds.includes(ACTOR.id) && g.ownerId !== ACTOR.id)
);
check("explore hides closed groups", explore.every((g) => g.status !== "Closed"));

const stats = selectGroupStats(initial, ACTOR.id);
check("stats reports 2 owned groups", stats.owned === 2, `${stats.owned}`);
check("stats reports 3 pending invites", stats.pendingInvites === 3, `${stats.pendingInvites}`);
check(
  "stats reports 1 open request on owned groups",
  stats.openRequests === 1,
  `${stats.openRequests}`
);
check("stats counts 5 automatic groups", stats.automatic === 5, `${stats.automatic}`);

// open join
const joined = run([{ type: "group/join", groupId: "grp-london-sme", actor: OTHER }]);
const london = joined.groups.find((g) => g.id === "grp-london-sme");
check("open group accepts join", london?.memberIds.includes(OTHER.id) ?? false);
check(
  "open join logs an activity",
  joined.groupActivities[0]?.message.includes("Green Market joined") ?? false,
  joined.groupActivities[0]?.message
);

const repeatJoin = appReducer(joined, {
  type: "group/join",
  groupId: "grp-london-sme",
  actor: OTHER,
});
check("duplicate join is a no-op", repeatJoin === joined);

// invitation-only join is blocked
const beforeInviteOnly = joined.groups.find((g) => g.id === "grp-expo-2026");
const inviteOnlyBlocked = appReducer(joined, {
  type: "group/join",
  groupId: "grp-expo-2026",
  actor: OTHER,
});
const afterInviteOnly = inviteOnlyBlocked.groups.find((g) => g.id === "grp-expo-2026");
check(
  "invitation-only group blocks direct join",
  beforeInviteOnly?.memberIds.length === afterInviteOnly?.memberIds.length &&
    !afterInviteOnly?.memberIds.includes(OTHER.id)
);

// request join
const requested = appReducer(joined, {
  type: "group/join",
  groupId: "grp-uk-business-exchange",
  actor: OTHER,
});
const newRequest = requested.invitations.find(
  (inv) => inv.groupId === "grp-uk-business-exchange" && inv.inviteeId === OTHER.id
);
check("request join creates a pending request", newRequest?.status === "pending");
check(
  "request join does not add the member yet",
  !requested.groups.find((g) => g.id === "grp-uk-business-exchange")?.memberIds.includes(
    OTHER.id
  )
);

const noDuplicateRequest = appReducer(requested, {
  type: "group/join",
  groupId: "grp-uk-business-exchange",
  actor: OTHER,
});
check(
  "second request is deduplicated",
  noDuplicateRequest.invitations.filter((inv) => inv.inviteeId === OTHER.id && inv.kind === "request")
    .length === 1
);

// owner accepts the request
const accepted = appReducer(requested, {
  type: "invitation/respond",
  invitationId: newRequest!.id,
  accept: true,
  responder: { id: "biz-central-retail", name: "Central Retail" },
});
check(
  "accepting a request adds the member",
  accepted.groups.find((g) => g.id === "grp-uk-business-exchange")?.memberIds.includes(OTHER.id) ??
    false
);
check(
  "accepted invitation is marked accepted",
  accepted.invitations.find((inv) => inv.inviteeId === OTHER.id && inv.kind === "request")
    ?.status === "accepted"
);

// declining an incoming invite
const declineTarget = initial.invitations.find(
  (inv) => inv.direction === "incoming" && inv.inviteeId === ACTOR.id
);
const declined = appReducer(initial, {
  type: "invitation/respond",
  invitationId: declineTarget!.id,
  accept: false,
  responder: ACTOR,
});
check(
  "declining keeps membership unchanged",
  !declined.groups
    .find((g) => g.id === declineTarget!.groupId)
    ?.memberIds.includes(ACTOR.id) ||
    initial.groups.find((g) => g.id === declineTarget!.groupId)!.memberIds.includes(ACTOR.id)
);
check(
  "declined invitation is marked declined",
  declined.invitations.find((inv) => inv.id === declineTarget!.id)?.status === "declined"
);

// leaving
const left = appReducer(initial, {
  type: "group/leave",
  groupId: "grp-smith-marketing",
  actor: ACTOR,
});
check(
  "leaving removes the member",
  !left.groups.find((g) => g.id === "grp-smith-marketing")?.memberIds.includes(ACTOR.id)
);
check(
  "leave logs an activity",
  left.groupActivities[0]?.kind === "leave" && left.groupActivities[0].message.includes("left the group")
);

// owner removes a member
const removedMember = appReducer(initial, {
  type: "group/remove-member",
  groupId: "grp-smith-marketing",
  memberId: "c-003",
  memberName: "Diallo Retail Group",
  actor: ACTOR,
});
check(
  "owner remove drops the member",
  !removedMember.groups
    .find((g) => g.id === "grp-smith-marketing")
    ?.memberIds.includes("c-003")
);
check(
  "remove logs an activity",
  removedMember.groupActivities[0]?.message.includes(
    "removed Diallo Retail Group from Smith Business Marketing"
  ) ?? false,
  removedMember.groupActivities[0]?.message
);
const nonOwnerRemove = appReducer(initial, {
  type: "group/remove-member",
  groupId: "grp-smith-marketing",
  memberId: "c-003",
  memberName: "Diallo Retail Group",
  actor: OTHER,
});
check("non-owner remove is blocked", nonOwnerRemove === initial);
const selfRemove = appReducer(initial, {
  type: "group/remove-member",
  groupId: "grp-smith-marketing",
  memberId: ACTOR.id,
  memberName: ACTOR.name,
  actor: ACTOR,
});
check("owner cannot remove themselves", selfRemove === initial);

// invitations
const invited = run(
  [
    {
      type: "group/invite",
      groupId: "grp-expo-2026",
      entries: [
        { inviteeId: "c-001", inviteeName: "Diallo Retail Group" },
        { inviteeName: "Unknown Company", inviteeEmail: "hello@unknown.example" },
      ],
      actor: ACTOR,
    },
  ],
  initial
);
check("invitations added", invited.invitations.length === initial.invitations.length + 2);
check(
  "invite logs an activity",
  invited.groupActivities.some(
    (activity) =>
      activity.kind === "invite" && activity.message.includes("Diallo Retail Group")
  )
);

const duplicateInvite = appReducer(invited, {
  type: "group/invite",
  groupId: "grp-expo-2026",
  entries: [{ inviteeId: "c-001", inviteeName: "Diallo Retail Group" }],
  actor: ACTOR,
});
check(
  "duplicate pending invite is ignored",
  duplicateInvite.invitations.filter((inv) => inv.inviteeId === "c-001" && inv.status === "pending")
    .length === 1
);

// create group
const created = run([
  {
    type: "group/create",
    input: {
      name: "Bristol Traders",
      type: "B2B",
      purpose: "Traders across Bristol.",
      accessType: "request",
      city: "Bristol",
      requiredSize: 18,
      stage: "Stage 1",
    },
    owner: ACTOR,
  },
]);
const createdGroup = created.groups[0];
check("created group is first in the list", createdGroup.name === "Bristol Traders");
check("created group is user-created", createdGroup.source === "user-created");
check("creator becomes the only member", createdGroup.memberIds.length === 1);
check("created group starts as Recruiting", createdGroup.status === "Recruiting");
check("created group is owned by the actor", createdGroup.ownerId === ACTOR.id);
check("created group stores location", createdGroup.location?.city === "Bristol");
check("created group stores the configured stage", createdGroup.stage === "Stage 1");
check("created group logs activity", created.groupActivities[0]?.kind === "created");

// update group
const updated = appReducer(created, {
  type: "group/update",
  groupId: createdGroup.id,
  patch: { status: "Active", stage: "Stage 2" },
  actor: ACTOR,
});
check(
  "group update applies the patch",
  updated.groups[0].status === "Active" && updated.groups[0].stage === "Stage 2"
);
check("group update logs settings activity", updated.groupActivities[0]?.kind === "settings");

// admin config
const reconfigured = run([{ type: "admin/update-config", patch: { automaticGrouping: { threshold: 18 } } }]);
check(
  "threshold patch merges into config",
  reconfigured.adminConfig.automaticGrouping.threshold === 18
);
check(
  "unpatched config keys are preserved",
  reconfigured.adminConfig.automaticGrouping.method === "Joining order" &&
    reconfigured.adminConfig.groupTypes.length === 7 &&
    reconfigured.adminConfig.stageLabels.length === 3
);

const disabledTypes = appReducer(reconfigured, {
  type: "admin/update-config",
  patch: {
    groupTypes: reconfigured.adminConfig.groupTypes.map((entry) =>
      entry.type === "Marketing" ? { ...entry, allowCreate: false } : entry
    ),
  },
});
check(
  "group type patch replaces the list",
  disabledTypes.adminConfig.groupTypes.find((entry) => entry.type === "Marketing")?.allowCreate ===
    false
);

// automatic progress uses the configured threshold
check(
  "automatic progress uses threshold 12 by default",
  selectAutomaticProgress(initial, ACTOR.id).threshold === 12
);
check(
  "automatic progress counts network members",
  selectAutomaticProgress(initial, ACTOR.id).current === 9,
  `${selectAutomaticProgress(initial, ACTOR.id).current}`
);
check(
  "automatic progress remaining is 3",
  selectAutomaticProgress(initial, ACTOR.id).remaining === 3
);
check(
  "automatic progress follows the admin patch",
  selectAutomaticProgress(reconfigured, ACTOR.id).threshold === 18
);
check(
  "automatic progress recomputes remaining after a threshold change",
  selectAutomaticProgress(reconfigured, ACTOR.id).remaining === 9,
  `${selectAutomaticProgress(reconfigured, ACTOR.id).remaining}`
);
check(
  "automatic progress recomputes percent after a threshold change",
  selectAutomaticProgress(reconfigured, ACTOR.id).percent === 50,
  `${selectAutomaticProgress(reconfigured, ACTOR.id).percent}`
);

const networkStats = selectNetworkStats(initial);
check("network stats counts 3 network groups", networkStats.networkGroups === 3, `${networkStats.networkGroups}`);
check("network stats exposes threshold", networkStats.threshold === 12);

// admin filters
check(
  "admin filter by type returns 3 B2B groups",
  selectAdminFilteredGroups(initial, {
    type: "B2B",
    city: "all",
    localArea: "all",
    status: "all",
    stage: "all",
    owner: "all",
    programme: "all",
    source: "all",
    query: "",
  }).length === 3
);
check(
  "admin filter by city returns Birmingham groups",
  selectAdminFilteredGroups(initial, {
    type: "all",
    city: "Birmingham",
    localArea: "all",
    status: "all",
    stage: "all",
    owner: "all",
    programme: "all",
    source: "all",
    query: "",
  }).every((g) => g.location?.city === "Birmingham")
);
check(
  "admin filter by source returns automatic groups",
  selectAdminFilteredGroups(initial, {
    type: "all",
    city: "all",
    localArea: "all",
    status: "all",
    stage: "all",
    owner: "all",
    programme: "all",
    source: "automatic",
    query: "",
  }).every((g) => g.source === "automatic")
);
check(
  "admin filter by query matches group name",
  selectAdminFilteredGroups(initial, {
    type: "all",
    city: "all",
    localArea: "all",
    status: "all",
    stage: "all",
    owner: "all",
    programme: "all",
    source: "all",
    query: "expo",
  }).length === 2
);

// circles
const circleId = initial.circles[0].id;
const circleBefore = initial.circles[0].memberIds.length;
const circleJoined = run([
  { type: "circle/add-member", circleId, member: { id: "c-035", name: "Maya Robinson" } },
]);
check(
  "circle member added",
  circleJoined.circles[0].memberIds.length === circleBefore + 1
);
check("circle activity logged", circleJoined.circleActivities[0]?.kind === "join");

const circleNoop = appReducer(circleJoined, {
  type: "circle/add-member",
  circleId,
  member: { id: "c-035", name: "Maya Robinson" },
});
check("duplicate circle join is a no-op", circleNoop === circleJoined);

const circleRemoved = appReducer(circleJoined, {
  type: "circle/remove-member",
  circleId,
  memberId: "c-035",
});
check(
  "circle member removed",
  circleRemoved.circles[0].memberIds.length === circleBefore
);

const secondCircleId = initial.circles[1]?.id ?? "";
const activeSwitched = appReducer(initial, { type: "circle/set-active", circleId: secondCircleId });
check("active circle switches", activeSwitched.activeCircleId === secondCircleId);
check(
  "same active circle is a no-op",
  appReducer(activeSwitched, { type: "circle/set-active", circleId: secondCircleId }) ===
    activeSwitched
);

// admin configuration screens (20 / 21)
const thresholdPatch = run(
  [{ type: "admin/update-config", patch: { automaticGrouping: { threshold: 18 } } }],
  initial
);
check(
  "config patch updates the threshold",
  thresholdPatch.adminConfig.automaticGrouping.threshold === 18
);
check(
  "threshold patch recomputes remaining members",
  selectAutomaticProgress(thresholdPatch, ACTOR.id).remaining === 9,
  `${selectAutomaticProgress(thresholdPatch, ACTOR.id).remaining}`
);

const typePatch = run(
  [
    {
      type: "admin/update-config",
      patch: {
        groupTypes: initial.adminConfig.groupTypes.map((entry) =>
          entry.type === "Marketing" ? { ...entry, allowCreate: false } : entry
        ),
      },
    },
  ],
  initial
);
check(
  "type config patch disables creation",
  typePatch.adminConfig.groupTypes.find((entry) => entry.type === "Marketing")?.allowCreate === false
);
check(
  "type config patch keeps other types intact",
  typePatch.adminConfig.groupTypes.find((entry) => entry.type === "B2B")?.allowCreate === true
);

const stagePatch = run(
  [{ type: "admin/update-config", patch: { stageLabels: [...initial.adminConfig.stageLabels, "Stage 4"] } }],
  initial
);
check(
  "stage label patch appends a label",
  stagePatch.adminConfig.stageLabels.includes("Stage 4")
);
check(
  "stage label patch does not touch groups",
  stagePatch.groups.length === initial.groups.length
);

// Spec 28 — owner invites from the directory → invitation appears → invitee accepts → count grows
const inviteFlow = run(
  [
    {
      type: "group/invite",
      groupId: "grp-smith-marketing",
      entries: [{ inviteeId: "c-004", inviteeName: "Murphy Construction" }],
      actor: ACTOR,
    },
  ],
  initial
);
const sentInvite = inviteFlow.invitations.find(
  (inv) =>
    inv.groupId === "grp-smith-marketing" &&
    inv.inviteeId === "c-004" &&
    inv.status === "pending"
);
check("sent invitation appears pending in the store", Boolean(sentInvite), "c-004 invite missing");

const marketingBefore = initial.groups.find((g) => g.id === "grp-smith-marketing");
const acceptedInvite = sentInvite
  ? appReducer(inviteFlow, {
      type: "invitation/respond",
      invitationId: sentInvite.id,
      accept: true,
      responder: { id: "c-004", name: "Murphy Construction" },
    })
  : inviteFlow;
const marketingAfter = acceptedInvite.groups.find((g) => g.id === "grp-smith-marketing");
check(
  "accepting the invitation adds the member",
  marketingAfter?.memberIds.includes("c-004") ?? false
);
check(
  "group count increases by one on accept",
  (marketingAfter?.memberIds.length ?? 0) === (marketingBefore?.memberIds.length ?? 0) + 1,
  `${marketingBefore?.memberIds.length} -> ${marketingAfter?.memberIds.length}`
);
check(
  "accept logs a join activity",
  acceptedInvite.groupActivities.some(
    (entry) =>
      entry.groupId === "grp-smith-marketing" &&
      entry.kind === "join" &&
      entry.actorName === "Murphy Construction"
  )
);

// Spec 27/28 — incoming invitation in the inbox → accept → my groups increase
const inboxBefore = selectMyGroups(initial, ACTOR.id).length;
const inboxAccept = run(
  [{ type: "invitation/respond", invitationId: "inv-001", accept: true, responder: ACTOR }],
  initial
);
const inboxAfter = selectMyGroups(inboxAccept, ACTOR.id);
check(
  "inbox accept increases my group count",
  inboxAfter.length === inboxBefore + 1,
  `${inboxBefore} -> ${inboxAfter.length}`
);
check(
  "inbox accept adds me to the autumn expo group",
  inboxAccept.groups.find((g) => g.id === "grp-autumn-expo")?.memberIds.includes(ACTOR.id) ?? false
);

// Spec 36 — created group appears in My Groups and the admin register immediately
const creationFlow = run(
  [
    {
      type: "group/create",
      owner: ACTOR,
      input: {
        name: "Smith Test Collective",
        type: "Marketing",
        purpose: "A group created to verify the creation flow",
        accessType: "open",
        city: "Birmingham",
        localArea: "Birmingham City Centre",
        visibility: "directory",
        interactionLevel: "collaborate",
      },
    },
  ],
  initial
);
const spec36Group = creationFlow.groups.find((g) => g.name === "Smith Test Collective");
check("created group exists in the store", Boolean(spec36Group), "new group missing");
check(
  "created group appears in My Groups immediately",
  selectMyGroups(creationFlow, ACTOR.id).some((g) => g.id === spec36Group?.id)
);
check(
  "created group appears in the admin register immediately",
  selectAdminFilteredGroups(creationFlow, BLANK_ADMIN_FILTERS).some(
    (g) => g.id === spec36Group?.id
  )
);
check(
  "created group carries the chosen visibility",
  spec36Group?.visibility === "directory" && spec36Group?.interactionLevel === "collaborate",
  `${spec36Group?.visibility}/${spec36Group?.interactionLevel}`
);

// Spec 36 — disabled type disappears from the create wizard's type list
check(
  "Marketing is creatable by default",
  creatableGroupTypes(initial.adminConfig).some((entry) => entry.type === "Marketing")
);
check(
  "disabled type disappears from creatable types",
  !creatableGroupTypes(typePatch.adminConfig).some((entry) => entry.type === "Marketing")
);
check(
  "disabled type lands in the blocked list",
  nonCreatableGroupTypes(typePatch.adminConfig).some((entry) => entry.type === "Marketing")
);
check(
  "blocking a type does not remove groups of that type",
  selectAdminFilteredGroups(typePatch, { ...BLANK_ADMIN_FILTERS, type: "Marketing" }).length > 0
);

// network contacts: manual add, join link, email confirmation
const manualContact = newNetworkContact(
  { fullName: "Jordan Blake", email: "jordan@example.com", phone: "07700 900100", listId: "list-001" },
  "manual",
  "Smith Business Ltd"
);
const joinLinkContact = newNetworkContact(
  { fullName: "Casey Morgan", email: "casey@example.com", phone: "07700 900200", listId: "list-004" },
  "join-link",
  "Smith Business Ltd"
);
const contactsAdded = run([
  { type: "contact/add", contact: manualContact },
  { type: "contact/add", contact: joinLinkContact },
]);
check("initial state has no network contacts", initial.networkContacts.length === 0);
check(
  "manual contact is added as pending",
  contactsAdded.networkContacts.find((c) => c.id === manualContact.id)?.confirmation === "pending"
);
check(
  "join-link contact is added as pending",
  contactsAdded.networkContacts.find((c) => c.id === joinLinkContact.id)?.confirmation === "pending"
);
check(
  "new contact lands in the chosen list",
  contactsAdded.networkContacts.find((c) => c.id === manualContact.id)?.listId === "list-001"
);
check(
  "new contact records consent time",
  typeof contactsAdded.networkContacts.find((c) => c.id === manualContact.id)?.consentAt ===
    "string"
);
check("network contact selector returns both", selectNetworkContacts(contactsAdded).length === 2);
check(
  "duplicate contact add is ignored",
  appReducer(contactsAdded, { type: "contact/add", contact: manualContact }).networkContacts
    .length === contactsAdded.networkContacts.length
);
const contactConfirmed = appReducer(contactsAdded, {
  type: "contact/confirm",
  contactId: manualContact.id,
});
check(
  "confirming flips pending to confirmed",
  contactConfirmed.networkContacts.find((c) => c.id === manualContact.id)?.confirmation ===
    "confirmed"
);
check(
  "confirming one contact leaves the other pending",
  contactConfirmed.networkContacts.find((c) => c.id === joinLinkContact.id)?.confirmation ===
    "pending"
);
const resetWithContact = run([
  { type: "contact/add", contact: manualContact },
  { type: "store/reset" },
]);
check("reset clears added contacts", resetWithContact.networkContacts.length === 0);

// reset restores the demo data
const reset = run(
  [
    { type: "group/join", groupId: "grp-london-sme", actor: OTHER },
    { type: "admin/update-config", patch: { automaticGrouping: { threshold: 6 } } },
    { type: "store/reset" },
  ],
  initial
);
check("reset restores 14 groups", reset.groups.length === 14);
check("reset restores threshold", reset.adminConfig.automaticGrouping.threshold === 12);
check("reset restores membership", reset.groups.find((g) => g.id === "grp-london-sme")?.memberIds.length === 12);

console.log(`\n${passed}/${passed + failed} store assertions passed`);
process.exit(failed > 0 ? 1 : 0);
