import {
  evaluateGroupEligibility,
  groupAudienceOf,
  inferCityFromPostcode,
  type UserEligibilityProfile,
} from "../src/features/groups/groupEligibility";
import { appReducer, createInitialAppState } from "../src/store/reducer";
import type { Group, Invitation } from "../src/domain/types";

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    passed++;
    console.log(`PASS  ${message}`);
  } else {
    failed++;
    console.error(`FAIL  ${message}`);
  }
}

console.log("--- 1. Group Eligibility & Discovery Rules ---");

// Test postcode city inference
assert(inferCityFromPostcode("B1 1AA") === "Birmingham", "B1 1AA infers Birmingham");
assert(inferCityFromPostcode("NW1 8AB") === "London", "NW1 8AB infers London");
assert(inferCityFromPostcode("M1 1AD") === "Manchester", "M1 1AD infers Manchester");
assert(inferCityFromPostcode("SW1A 1AA") === "London", "SW1A 1AA infers London");
assert(inferCityFromPostcode("") === "", "Empty postcode returns empty string");

// Audience categorization
const b2bGroup: Group = {
  id: "grp-test-b2b",
  name: "B2B Trade Network",
  type: "B2B",
  source: "admin",
  purpose: "Business trade",
  ownerId: "admin",
  ownerName: "System",
  memberIds: [],
  location: { city: "Birmingham" },
  status: "Active",
  accessType: "open",
  createdAt: "2026-01-01",
};

const communityGroup: Group = {
  id: "grp-test-comm",
  name: "Local Community Circle",
  type: "Seasonal",
  source: "admin",
  purpose: "Neighborhood circle",
  ownerId: "admin",
  ownerName: "System",
  memberIds: [],
  location: { city: "Birmingham" },
  status: "Active",
  accessType: "open",
  createdAt: "2026-01-01",
};

assert(groupAudienceOf(b2bGroup) === "Business Owners", "B2B group audience is Business Owners");
assert(groupAudienceOf(communityGroup) === "Consumers", "Seasonal group audience is Consumers");

// Consumer user profile
const consumerUser: UserEligibilityProfile = {
  id: "user-consumer-1",
  name: "Alice Green",
  accountType: "consumer",
  city: "Birmingham",
  postcode: "B1 2AB",
};

// Business user profile
const businessUser: UserEligibilityProfile = {
  id: "user-biz-1",
  name: "Bob Builder",
  accountType: "business",
  city: "Birmingham",
  postcode: "B1 3CD",
  sector: "Retail",
};

// Evaluate consumer vs B2B group
const consumerVsB2B = evaluateGroupEligibility(b2bGroup, consumerUser);
assert(!consumerVsB2B.isEligible, "Consumer is NOT eligible for B2B business group");
assert(
  consumerVsB2B.matchReasons.some((r) => r.includes("business owners")),
  "Ineligibility reason explains business owner requirement"
);

// Evaluate consumer vs Community group
const consumerVsComm = evaluateGroupEligibility(communityGroup, consumerUser);
assert(consumerVsComm.isEligible, "Consumer is eligible for Birmingham community group");
assert(consumerVsComm.status === "can_join", "Consumer can join active open group directly");

// Evaluate business owner vs B2B group in same city
const bizVsB2B = evaluateGroupEligibility(b2bGroup, businessUser);
assert(bizVsB2B.isEligible, "Business user in Birmingham is eligible for Birmingham B2B group");
assert(bizVsB2B.status === "can_join", "Business user can join B2B group directly");

// Suspended group behavior
const suspendedGroup: Group = {
  ...b2bGroup,
  id: "grp-suspended",
  status: "Suspended",
};
const bizVsSuspended = evaluateGroupEligibility(suspendedGroup, businessUser);
assert(!bizVsSuspended.isEligible, "Suspended group is not eligible");
assert(bizVsSuspended.status === "unavailable", "Suspended group marked as unavailable");
assert(bizVsSuspended.matchReasons[0].includes("suspended"), "Suspension reason indicated");

// Closed group behavior
const closedGroup: Group = {
  ...b2bGroup,
  id: "grp-closed",
  status: "Closed",
};
const bizVsClosed = evaluateGroupEligibility(closedGroup, businessUser);
assert(!bizVsClosed.isEligible, "Closed group is not eligible");
assert(bizVsClosed.status === "unavailable", "Closed group marked as unavailable");

// Already joined member
const joinedGroup: Group = {
  ...b2bGroup,
  id: "grp-joined",
  memberIds: [businessUser.id],
};
const bizVsJoined = evaluateGroupEligibility(joinedGroup, businessUser);
assert(bizVsJoined.status === "joined", "Joined group detected with status 'joined'");

// Approval-based group
const approvalGroup: Group = {
  ...b2bGroup,
  id: "grp-approval",
  accessType: "request",
};
const bizVsApproval = evaluateGroupEligibility(approvalGroup, businessUser);
assert(bizVsApproval.status === "can_request", "Request-type group marked as can_request");
assert(bizVsApproval.isEligible, "Approval group allows requesting access");

// Direct invitation override (different city)
const londonGroup: Group = {
  ...b2bGroup,
  id: "grp-london",
  location: { city: "London" },
};
// Without invite, Birmingham user is not in location
const withoutInvite = evaluateGroupEligibility(londonGroup, businessUser);
assert(!withoutInvite.isEligible, "Without direct invite, different city group is not recommended");

// With pending direct invitation, it becomes eligible
const pendingInvite: Invitation = {
  id: "inv-direct-test",
  groupId: "grp-london",
  direction: "incoming",
  kind: "invite",
  inviteeId: businessUser.id,
  inviteeName: businessUser.name,
  invitedById: "admin",
  invitedByName: "Central Hub",
  status: "pending",
  createdAt: "2026-10-01",
};
const withInvite = evaluateGroupEligibility(londonGroup, businessUser, [pendingInvite]);
assert(withInvite.isEligible, "Direct valid invitation overrides location mismatch for invitee");
assert(withInvite.status === "invited", "Pending invitation recognized on group with status 'invited'");

console.log("\n--- 2. Store Actions & Membership Transitions ---");

let state = createInitialAppState();
const ACTOR = { id: "actor-new-member", name: "New Member" };

// 1. Join open group
const testGroupId = "grp-london-sme"; // open group
state = appReducer(state, {
  type: "group/join",
  groupId: testGroupId,
  actor: ACTOR,
});
const targetGroup = state.groups.find((g) => g.id === testGroupId);
assert(
  targetGroup?.memberIds.includes(ACTOR.id) === true,
  "Joining group adds user ID to group memberIds"
);

// 2. Prevent duplicate join
const memberCountBefore = targetGroup?.memberIds.length || 0;
const repeatState = appReducer(state, {
  type: "group/join",
  groupId: testGroupId,
  actor: ACTOR,
});
const targetGroupAfter = repeatState.groups.find((g) => g.id === testGroupId);
assert(
  targetGroupAfter?.memberIds.length === memberCountBefore,
  "Duplicate join does not increase member count"
);

// 3. Request join on approval group creates pending request and does NOT immediately add member
const requestGroupId = "grp-uk-business-exchange"; // request group
const APPLICANT = { id: "actor-applicant", name: "Applicant Name" };
state = appReducer(state, {
  type: "group/join",
  groupId: requestGroupId,
  actor: APPLICANT,
});
const reqGroupAfter = state.groups.find((g) => g.id === requestGroupId);
assert(
  reqGroupAfter?.memberIds.includes(APPLICANT.id) === false,
  "Request to join does not immediately make user a member"
);

// 4. Accept pending invitation adds member and updates invitation status
const inviteToAccept = state.invitations.find((i) => i.status === "pending" && i.groupId);
if (inviteToAccept && inviteToAccept.groupId) {
  const gId = inviteToAccept.groupId;
  const userToJoin = inviteToAccept.inviteeId ?? "invited-user-id";
  state = appReducer(state, {
    type: "invitation/respond",
    invitationId: inviteToAccept.id,
    accept: true,
    responder: { id: userToJoin, name: inviteToAccept.inviteeName },
  });
  const updatedInvite = state.invitations.find((i) => i.id === inviteToAccept.id);
  const updatedGroup = state.groups.find((g) => g.id === gId);
  assert(updatedInvite?.status === "accepted", "Invitation status updated to accepted");
  assert(
    updatedGroup?.memberIds.includes(userToJoin) === true,
    "Accepting invitation adds invited user to the group members"
  );
}

console.log("\n--- Summary ---");
console.log(`Passed: ${passed}, Failed: ${failed}`);

if (failed > 0) {
  process.exit(1);
} else {
  console.log("All CHS Group Invitation & Access flow assertions passed successfully!\n");
  process.exit(0);
}
