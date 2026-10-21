import {
  appReducer,
  createInitialAppState,
  newNetworkContact,
  newPlatformAccount,
} from "../src/store/reducer";
import type { AppAction, AppState } from "../src/store/reducer";
import {
  findAccountByEmail,
  findAccountByPhone,
  selectAdminFilteredGroups,
  selectAutomaticProgress,
  selectCanCreateGroups,
  selectCreationRightsLabel,
  selectExploreGroups,
  selectGroupActivation,
  selectGroupStats,
  selectHeadStartGroups,
  selectMandatoryGroupStatuses,
  selectMyGroups,
  selectNetworkContacts,
  selectNetworkStats,
  selectOwnedGroups,
  selectPlatformGroup,
} from "../src/store/selectors";
import {
  contributionLabel,
  creatableGroupTypes,
  nonCreatableGroupTypes,
  pendingMandatoryTypes,
  typeForcedPaid,
} from "../src/features/groups/groupUtils";

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

check("initial state version is 2", initial.version === 2);
check("initial state has 14 groups", initial.groups.length === 14, `${initial.groups.length}`);
check("initial state has 17 invitations", initial.invitations.length === 17, `${initial.invitations.length}`);
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
check(
  "stats reports 5 pending invites (3 group + 2 circle)",
  stats.pendingInvites === 5,
  `${stats.pendingInvites}`
);
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

// --- Mandatory ("create first") groups ---------------------------------------
check(
  "admin config seeds 3 mandatory groups",
  initial.adminConfig.mandatoryGroups.length === 3,
  `${initial.adminConfig.mandatoryGroups.length}`
);
check(
  "Marketing and Advertising are required with owner-choice pricing",
  initial.adminConfig.mandatoryGroups
    .filter((rule) => rule.type === "Marketing" || rule.type === "Advertising")
    .every((rule) => rule.required && rule.pricing === "owner-choice")
);
const partnerRule = initial.adminConfig.mandatoryGroups.find(
  (rule) => rule.type === "Partner"
);
check(
  "Partner is required and paid by default",
  partnerRule?.required === true && partnerRule?.pricing === "paid",
  `${partnerRule?.required}/${partnerRule?.pricing}`
);

const partnerFree = appReducer(initial, {
  type: "admin/update-config",
  patch: {
    mandatoryGroups: initial.adminConfig.mandatoryGroups.map((rule) =>
      rule.type === "Partner" ? { ...rule, pricing: "owner-choice" as const } : rule
    ),
  },
});
check(
  "mandatory patch flips the Partner paid switch",
  partnerFree.adminConfig.mandatoryGroups.find((rule) => rule.type === "Partner")?.pricing ===
    "owner-choice"
);
check(
  "mandatory patch leaves the other rules alone",
  partnerFree.adminConfig.mandatoryGroups.find((rule) => rule.type === "Marketing")?.required ===
    true
);

const mandatoryStatuses = selectMandatoryGroupStatuses(initial, ACTOR.id);
check(
  "biz-smith already satisfies the Marketing requirement",
  mandatoryStatuses.find((entry) => entry.type === "Marketing")?.satisfied === true
);
check(
  "biz-smith still owes Advertising and Partner",
  mandatoryStatuses.some((entry) => entry.type === "Advertising" && !entry.satisfied) &&
    mandatoryStatuses.some((entry) => entry.type === "Partner" && !entry.satisfied)
);
const ownedTypesList = selectOwnedGroups(initial, ACTOR.id).map((group) => group.type);
check(
  "pending mandatory types are Advertising and Partner",
  pendingMandatoryTypes(initial.adminConfig, ownedTypesList).join(",") ===
    "Advertising,Partner",
  pendingMandatoryTypes(initial.adminConfig, ownedTypesList).join(",")
);
check(
  "Partner forces paid while Marketing stays owner-choice",
  typeForcedPaid(initial.adminConfig, "Partner") &&
    !typeForcedPaid(initial.adminConfig, "Marketing")
);
check(
  "switching Allow paid groups off never forces paid",
  typeForcedPaid(
    {
      ...initial.adminConfig,
      paymentRules: { ...initial.adminConfig.paymentRules, allowPaid: false },
    },
    "Partner"
  ) === false
);
check(
  "switching the Partner rule off releases the mandate",
  pendingMandatoryTypes(
    {
      ...initial.adminConfig,
      mandatoryGroups: initial.adminConfig.mandatoryGroups.map((rule) =>
        rule.type === "Partner" ? { ...rule, required: false } : rule
      ),
    },
    ownedTypesList
  ).join(",") === "Advertising"
);

// --- Invitation-first onboarding: accounts, claim, accept ------------------
check(
  "seeded platform accounts exist for the demo",
  initial.accounts.length === 2,
  `${initial.accounts.length}`
);
check(
  "findAccountByEmail finds the invitee's seeded account",
  findAccountByEmail(initial, "Events@Westside.example")?.id === "acc-westside"
);
check(
  "findAccountByPhone ignores formatting",
  findAccountByPhone(initial, "447700900700")?.id === "acc-westside"
);

const dupEmail = run([
  {
    type: "account/register",
    account: newPlatformAccount({
      name: "Duplicate Email",
      email: "events@westside.example",
      role: "consumer",
    }),
  },
]);
check(
  "registration with a registered email is rejected",
  dupEmail.accounts.length === initial.accounts.length,
  `${dupEmail.accounts.length}`
);

const dupPhone = run([
  {
    type: "account/register",
    account: newPlatformAccount({
      name: "Duplicate Phone",
      email: "dup@example.com",
      phone: "+44 7700 900700",
      role: "consumer",
    }),
  },
]);
check(
  "registration with a registered phone is rejected",
  dupPhone.accounts.length === initial.accounts.length,
  `${dupPhone.accounts.length}`
);

const inviteeAccount = newPlatformAccount({
  name: "Casey Morgan",
  email: "casey.morgan@example.com",
  phone: "+44 7700 900111",
  role: "consumer",
});
const registered = run([{ type: "account/register", account: inviteeAccount }]);
check(
  "a brand-new account registers successfully",
  registered.accounts.some((account) => account.id === inviteeAccount.id) &&
    registered.accounts.length === initial.accounts.length + 1
);

// Open the invite link → claim → accept (what the landing page dispatches).
const onboarded = run(
  [
    {
      type: "invitation/claim",
      invitationId: "inv-009",
      account: { id: inviteeAccount.id, name: inviteeAccount.name },
    },
    {
      type: "invitation/respond",
      invitationId: "inv-009",
      accept: true,
      responder: { id: inviteeAccount.id, name: inviteeAccount.name },
    },
  ],
  registered
);
check(
  "claim binds the invitation to the new account",
  onboarded.invitations.find((entry) => entry.id === "inv-009")?.inviteeId ===
    inviteeAccount.id
);
check(
  "claim records who claimed the invitation",
  onboarded.invitations.find((entry) => entry.id === "inv-009")?.claimedByAccountId ===
    inviteeAccount.id
);
check(
  "accepting adds the new account to the group",
  onboarded.groups.find((group) => group.id === "grp-expo-2026")?.memberIds.includes(
    inviteeAccount.id
  ) === true
);
check(
  "the new member never becomes the group owner",
  onboarded.groups.find((group) => group.id === "grp-expo-2026")?.ownerId !==
    inviteeAccount.id
);
check(
  "the join is logged in the group activity",
  onboarded.groupActivities.some(
    (entry) => entry.groupId === "grp-expo-2026" && entry.message.includes("Casey Morgan")
  )
);

const secondClaim = run(
  [
    {
      type: "invitation/claim",
      invitationId: "inv-009",
      account: { id: "acc-someone-else", name: "Someone Else" },
    },
  ],
  onboarded
);
check(
  "a second account cannot claim an already-claimed invitation",
  secondClaim.invitations.find((entry) => entry.id === "inv-009")?.claimedByAccountId ===
    inviteeAccount.id
);

const roleInvite = run([
  {
    type: "group/invite",
    groupId: "grp-smith-marketing",
    entries: [
      {
        inviteeName: "Sam Consumer",
        inviteePhone: "+44 7700 900123",
        inviteeRole: "consumer",
      },
    ],
    actor: ACTOR,
  },
]);
check(
  "a manual SMS invite stores the owner-chosen role",
  roleInvite.invitations.find((entry) => entry.inviteeName === "Sam Consumer")
    ?.inviteeRole === "consumer"
);
check(
  "the seeded invite link carries an owner-chosen role",
  initial.invitations.find((entry) => entry.id === "inv-009")?.inviteeRole ===
    "business-invitee"
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
check("reset restores mandatory groups", reset.adminConfig.mandatoryGroups.length === 3);
check("reset restores seeded accounts", reset.accounts.length === 2);
check("reset restores membership", reset.groups.find((g) => g.id === "grp-london-sme")?.memberIds.length === 12);

check(
  "autumn expo group is paid so the review step can show a contribution",
  (() => {
    const group = initial.groups.find((g) => g.id === "grp-autumn-expo");
    return group?.pricing === "paid" && group.contribution === 45 && group.requiredSize === 40;
  })()
);
check(
  "autumn expo contribution label reads monthly",
  contributionLabel(
    initial.groups.find((g) => g.id === "grp-autumn-expo") ?? {
      pricing: undefined,
      contribution: undefined,
      contributionFrequency: undefined,
    }
  ) === "£45 monthly per member"
);

// --- Participant (free invitee) flow -----------------------------------------
const CONSUMER = { id: "cons-john", name: "John Doe" };

const consumerCircles = initial.circles.filter((c) => c.memberIds.includes(CONSUMER.id));
check(
  "cons-john is a member of at least one circle",
  consumerCircles.length > 0,
  `${consumerCircles.length}`
);

const consumerCircleInvites = initial.invitations.filter(
  (inv) => inv.inviteeId === CONSUMER.id && inv.circleId !== undefined
);
check(
  "cons-john has 2 pending circle invitations",
  consumerCircleInvites.length === 2 && consumerCircleInvites.every((inv) => inv.status === "pending"),
  `${consumerCircleInvites.length}`
);
check(
  "circle invitations carry no groupId",
  consumerCircleInvites.every((inv) => inv.groupId === undefined)
);
check(
  "circle invitations point at circles the invitee is not yet in",
  consumerCircleInvites.every(
    (inv) => !initial.circles.find((c) => c.id === inv.circleId)?.memberIds.includes(CONSUMER.id)
  )
);

const consumerInvite = consumerCircleInvites[0];
const circleAccept = run(
  [{ type: "invitation/respond", invitationId: consumerInvite.id, accept: true, responder: CONSUMER }],
  initial
);
const joinedCircle = circleAccept.circles.find((c) => c.id === consumerInvite.circleId);
check(
  "accepting a circle invitation adds the invitee to that circle",
  joinedCircle?.memberIds.includes(CONSUMER.id) ?? false
);
check(
  "circle invitation is marked accepted",
  circleAccept.invitations.find((inv) => inv.id === consumerInvite.id)?.status === "accepted"
);
check(
  "circle join logs a circle activity",
  circleAccept.circleActivities.some(
    (a) => a.circleId === consumerInvite.circleId && a.kind === "join"
  )
);
check(
  "accepting a circle invitation does not touch group membership",
  circleAccept.groups.every((g, i) => g.memberIds.length === initial.groups[i].memberIds.length)
);
check(
  "declining a circle invitation leaves membership untouched",
  (() => {
    const next = appReducer(initial, {
      type: "invitation/respond",
      invitationId: consumerCircleInvites[1].id,
      accept: false,
      responder: CONSUMER,
    });
    return (
      next.invitations.find((inv) => inv.id === consumerCircleInvites[1].id)?.status === "declined" &&
      !next.circles
        .find((c) => c.id === consumerCircleInvites[1].circleId)
        ?.memberIds.includes(CONSUMER.id)
    );
  })()
);

// --- Admin-authored circle types ---------------------------------------------
check(
  "admin config seeds circle types",
  initial.adminConfig.circleTypes.length > 0,
  `${initial.adminConfig.circleTypes.length}`
);
check(
  "seeded circle types are fully configured",
  initial.adminConfig.circleTypes.every(
    (t) => t.id && t.type && t.shortLabel && t.description && t.accent
  )
);

const CIRCLE_TYPE_ADMIN = { id: "admin", name: "Administrator" };
const typeCreated = appReducer(initial, {
  type: "admin/circle-type-create",
  entry: {
    id: "ct-supplier",
    type: "Supplier Networking",
    shortLabel: "Supplier",
    description: "Suppliers and buyers matched into one circle.",
    accent: "#0ea5e9",
    accentSoft: "rgba(14, 165, 233, 0.14)",
    enabled: true,
    mandatory: false,
    minMembers: 6,
    maxMembers: 24,
    requiresBanker: false,
    allowedDurations: [60, 90],
  },
  actor: CIRCLE_TYPE_ADMIN,
});
check(
  "admin can create a circle type",
  typeCreated.adminConfig.circleTypes.some((t) => t.id === "ct-supplier")
);
check(
  "creating a circle type writes an audit entry",
  typeCreated.adminConfig.auditLog.some((e) => e.action === "circle-type-created")
);
check(
  "creating a circle type does not create circles",
  typeCreated.circles.length === initial.circles.length
);

const typeDisabled = appReducer(typeCreated, {
  type: "admin/circle-type-update",
  id: "ct-supplier",
  patch: { enabled: false, maxMembers: 12 },
  actor: CIRCLE_TYPE_ADMIN,
});
check(
  "admin can update a circle type",
  typeDisabled.adminConfig.circleTypes.find((t) => t.id === "ct-supplier")?.enabled === false &&
    typeDisabled.adminConfig.circleTypes.find((t) => t.id === "ct-supplier")?.maxMembers === 12
);
check(
  "circle type id and name are immutable through update",
  typeDisabled.adminConfig.circleTypes.find((t) => t.id === "ct-supplier")?.type ===
    "Supplier Networking"
);

const typeDeleted = appReducer(typeDisabled, {
  type: "admin/circle-type-delete",
  id: "ct-supplier",
  actor: CIRCLE_TYPE_ADMIN,
});
check(
  "admin can delete a circle type",
  !typeDeleted.adminConfig.circleTypes.some((t) => t.id === "ct-supplier")
);
check(
  "deleting a circle type writes an audit entry",
  typeDeleted.adminConfig.auditLog.some((e) => e.action === "circle-type-deleted")
);

// --- Paid entry, membership-based creation rules, head start groups ---------
const defaultRules = initial.adminConfig.groupCreationRules;
check("initial membership is unpaid and unagreed", initial.membership.paid === false && initial.membership.agreementAccepted === false);
check("default membership (Bronze Standard) cannot create groups", selectCanCreateGroups(initial) === false);
check(
  "creation rights label names the eligible membership",
  selectCreationRightsLabel(initial).includes("Platinum Pro+"),
  selectCreationRightsLabel(initial)
);
check("default rules only allow Platinum Pro+", defaultRules.allowedTiers.length === 1 && defaultRules.allowedTiers[0] === "Platinum" && defaultRules.allowedVariants.length === 1 && defaultRules.allowedVariants[0] === "Pro+");
check("default rules enforce activation", defaultRules.activationEnabled === true);
check("default rules require paid entry", defaultRules.requirePaidAccess === true && defaultRules.entryAccessDays === 90 && defaultRules.entryAccessFee === 25);
check("default rules place other memberships in a platform group", defaultRules.restrictToPlatformGroup === true && defaultRules.platformGroupId === "grp-local-partners");
check("admin platform group exists", selectPlatformGroup(initial)?.id === "grp-local-partners", selectPlatformGroup(initial)?.id);
check("biz-smith starts in the admin platform group", selectPlatformGroup(initial)?.memberIds.includes(ACTOR.id) ?? false);

const entered = appReducer(initial, {
  type: "membership/activate",
  tier: "Platinum",
  variant: "Pro+",
  planName: "Platinum Pro+",
  accessDays: defaultRules.entryAccessDays,
  accessFee: defaultRules.entryAccessFee,
});
check("membership activation settles the access fee", entered.membership.paid === true);
check("membership activation accepts the agreement", entered.membership.agreementAccepted === true);
check("membership activation records the plan", entered.membership.tier === "Platinum" && entered.membership.variant === "Pro+" && entered.membership.planName === "Platinum Pro+");
check("membership activation records the paid period", entered.membership.accessDays === defaultRules.entryAccessDays && entered.membership.accessFee === defaultRules.entryAccessFee);
check("membership activation flips status to Active", entered.membership.status === "Active");
check("paid Platinum Pro+ may create groups", selectCanCreateGroups(entered) === true);
check("membership activation leaves groups untouched", entered.groups.length === initial.groups.length);

// Head start groups — handed over on dashboard entry
check("initial state ships no head start groups", initial.groups.filter((g) => g.headStart === true).length === 0);
const seeded = appReducer(entered, { type: "group/head-start" });
const headStart = seeded.groups.filter((g) => g.headStart === true);
check("head start action seeds 2 groups", headStart.length === 2, `${headStart.length}`);
check("head start groups are owned by biz-smith", headStart.every((g) => g.ownerId === ACTOR.id));
check("head start groups are pre-populated but incomplete", headStart.every((g) => g.memberIds.length === 3), headStart.map((g) => g.memberIds.length).join(","));
check("head start groups do not replace existing groups", seeded.groups.length === initial.groups.length + 2, `${seeded.groups.length}`);
check("head start groups appear in my groups", selectMyGroups(seeded, ACTOR.id).length === 9, `${selectMyGroups(seeded, ACTOR.id).length}`);
check("head start groups count as owned", selectOwnedGroups(seeded, ACTOR.id).length === 4, `${selectOwnedGroups(seeded, ACTOR.id).length}`);
check("head start action logs a created activity per group", seeded.groupActivities.filter((a) => a.message.includes("head start group")).length === 2);
check("head start selector finds both groups", selectHeadStartGroups(seeded).length === 2);
const seededAgain = appReducer(seeded, { type: "group/head-start" });
check("head start action is idempotent", seededAgain === seeded);

// Activation gating against the recruitment threshold
const seededB2b = seeded.groups.find((g) => g.id === "grp-headstart-b2b");
const seededActivation = seededB2b ? selectGroupActivation(seeded, seededB2b) : undefined;
check("head start group is gated by the rules", seededActivation?.gated === true);
check("head start group is active for Platinum Pro+ (3 of 2)", seededActivation?.active === true && seededActivation.target === 2, `target=${seededActivation?.target} active=${seededActivation?.active}`);
check("head start group reports tier-based threshold", seededActivation?.tier === "Platinum" && seededActivation?.variant === "Pro+");

// Admin raises the Platinum Pro+ threshold: the group must switch back off
const raisedTargets = {
  Bronze: { ...defaultRules.recruitmentTargets.Bronze },
  Silver: { ...defaultRules.recruitmentTargets.Silver },
  Gold: { ...defaultRules.recruitmentTargets.Gold },
  Platinum: { ...defaultRules.recruitmentTargets.Platinum, "Pro+": 5 },
};
const raised = appReducer(entered, {
  type: "admin/update-config",
  patch: { groupCreationRules: { recruitmentTargets: raisedTargets } },
});
check("admin rule patch persists the new threshold", raised.adminConfig.groupCreationRules.recruitmentTargets.Platinum["Pro+"] === 5);
check("admin rule patch leaves other tiers intact", raised.adminConfig.groupCreationRules.recruitmentTargets.Bronze.Standard === defaultRules.recruitmentTargets.Bronze.Standard);
const raisedSeeded = appReducer(raised, { type: "group/head-start" });
const raisedB2b = raisedSeeded.groups.find((g) => g.id === "grp-headstart-b2b");
const raisedActivation = raisedB2b ? selectGroupActivation(raisedSeeded, raisedB2b) : undefined;
check("raising the threshold deactivates the group", raisedActivation?.target === 5 && raisedActivation?.active === false && raisedActivation?.remaining === 2, `target=${raisedActivation?.target} remaining=${raisedActivation?.remaining}`);

// Bronze Standard — the inverse-scaled threshold (6 recruits)
const bronzeEntered = appReducer(initial, {
  type: "membership/activate",
  tier: "Bronze",
  variant: "Standard",
  planName: "Bronze Standard",
  accessDays: defaultRules.entryAccessDays,
  accessFee: defaultRules.entryAccessFee,
});
check("Bronze Standard cannot create groups", selectCanCreateGroups(bronzeEntered) === false);
check("Bronze Standard joins the platform group", (defaultRules.restrictToPlatformGroup && defaultRules.platformGroupId === "grp-local-partners") || !defaultRules.restrictToPlatformGroup);
const bronzeSeeded = appReducer(bronzeEntered, { type: "group/head-start" });
const bronzeB2b = bronzeSeeded.groups.find((g) => g.id === "grp-headstart-b2b");
const bronzeActivation = bronzeB2b ? selectGroupActivation(bronzeSeeded, bronzeB2b) : undefined;
check("Bronze Standard head start group needs 6 members", bronzeActivation?.target === 6 && bronzeActivation?.active === false && bronzeActivation?.remaining === 3, `target=${bronzeActivation?.target} remaining=${bronzeActivation?.remaining}`);

// Admin can lock creation for every membership
const locked = appReducer(entered, {
  type: "admin/update-config",
  patch: { groupCreationRules: { allowedTiers: [], allowedVariants: [] } },
});
check("admins can lock group creation for every membership", selectCanCreateGroups(locked) === false);
check("locked rules leave the platform group in place", locked.adminConfig.groupCreationRules.restrictToPlatformGroup === true);
const lockedLabel = selectCreationRightsLabel(locked);
check("locked rules report that nobody may create groups", lockedLabel === "No membership can create groups", lockedLabel);

console.log(`\n${passed}/${passed + failed} store assertions passed`);
process.exit(failed > 0 ? 1 : 0);
