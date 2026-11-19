/**
 * Business dashboard API smoke test.
 *
 * Creates throw-away BUSINESS/CUSTOMER users, a temporary plan and
 * all related records, then exercises every /api/business endpoint and asserts
 * the business rules. Everything is removed again in the `finally` block.
 *
 * Run with the API listening on :4089 (or set API_BASE_URL):
 *
 *   pnpm --filter @247gbs/api exec tsx scripts/business-smoke.ts
 */

import { PrismaPg } from "@prisma/adapter-pg";
import { config as loadEnv } from "dotenv";
import { SignJWT } from "jose";
import { randomUUID } from "node:crypto";
import { PrismaClient, UserRole } from "../src/generated/prisma/client.js";

loadEnv({
  path: new URL("../../../.env", import.meta.url).pathname,
});
loadEnv();

const BASE_URL = process.env.API_BASE_URL ?? "http://localhost:4089/api";
const JWT_SECRET = process.env.AUTH_JWT_SECRET;
const DATABASE_URL = process.env.DATABASE_URL;

if (!JWT_SECRET) throw new Error("AUTH_JWT_SECRET is missing from the environment");
if (!DATABASE_URL) throw new Error("DATABASE_URL is missing from the environment");

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: DATABASE_URL }),
});

// ---------------------------------------------------------------------------
// Assertions and reporting
// ---------------------------------------------------------------------------

let checks = 0;
const failures: string[] = [];

function ok(condition: unknown, message: string): asserts condition {
  checks += 1;
  if (!condition) {
    failures.push(message);
    console.log(`  ✗ ${message}`);
  }
}

function eq(actual: unknown, expected: unknown, message: string) {
  ok(
    JSON.stringify(actual) === JSON.stringify(expected),
    `${message} (expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)})`,
  );
}

function section(title: string) {
  console.log(`\n▸ ${title}`);
}

function pass(message: string) {
  console.log(`  ✓ ${message}`);
}

// ---------------------------------------------------------------------------
// HTTP
// ---------------------------------------------------------------------------

interface ApiOptions {
  token?: string;
  body?: unknown;
}

interface ApiResult {
  status: number;
  data: any;
}

async function api(
  method: string,
  path: string,
  options: ApiOptions = {},
): Promise<ApiResult> {
  const headers: Record<string, string> = {};
  if (options.token) headers.authorization = `Bearer ${options.token}`;
  if (options.body !== undefined) headers["content-type"] = "application/json";

  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  const text = await response.text();
  let data: any = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }
  return { status: response.status, data };
}

function expectStatus(result: ApiResult, expected: number, label: string) {
  ok(
    result.status === expected,
    `${label}: expected HTTP ${expected}, got ${result.status} ${JSON.stringify(result.data)}`,
  );
}

async function signToken(user: {
  id: string;
  email: string;
  fullName: string | null;
}) {
  return new SignJWT({
    email: user.email,
    role: "BUSINESS",
    name: user.fullName ?? user.email,
    profileType: "BUSINESS",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime("2h")
    .sign(new TextEncoder().encode(JWT_SECRET));
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const run = randomUUID().slice(0, 8);

const fixture = {
  userIds: [] as string[],
  businessIds: [] as string[],
  groupIds: [] as string[],
  invitationIds: [] as string[],
  listIds: [] as string[],
  contactIds: [] as string[],
  circleIds: [] as string[],
  planId: null as string | null,
  emails: [] as string[],
};

const TABLES = [
  "user",
  "business",
  "businessPlan",
  "group",
  "groupMember",
  "groupActivity",
  "invitation",
  "networkList",
  "networkContact",
  "circle",
  "circleActivity",
  "auditLog",
  "plan",
] as const;

async function snapshot() {
  const entries = await Promise.all(
    TABLES.map(async (table) => [table, await (prisma as any)[table].count()] as const),
  );
  return Object.fromEntries(entries) as Record<(typeof TABLES)[number], number>;
}

async function setup() {
  const plan = await prisma.plan.create({
    data: {
      id: `smoke-plan-${run}`,
      variant: "Pro+",
      name: `Smoke Platinum ${run}`,
      priceMonthly: 399,
      status: "Active",
      groupQuota: 10,
      circleQuota: 2,
      revenueSharePercent: 20,
      features: ["Smoke fixture"],
    },
  });
  fixture.planId = plan.id;

  const businessA = randomUUID();
  const businessB = randomUUID();
  const emailA = `smoke-a-${run}@example.test`;
  const emailB = `smoke-b-${run}@example.test`;
  const emailC = `smoke-c-${run}@example.test`;
  fixture.businessIds.push(businessA, businessB);
  fixture.emails.push(emailA, emailB, emailC);

  const userA = await prisma.user.create({
    data: {
      id: randomUUID(),
      email: emailA,
      role: UserRole.BUSINESS,
      fullName: "Alex Smoke",
      displayName: "Alex Smoke",
      businessName: "Smoke A Ltd",
      businessId: businessA,
      address: "Birmingham",
      postcode: "B1 1AA",
      businessProfile: {
        city: "Birmingham",
        localArea: "City Centre",
        category: "Professional Services",
      },
    },
  });
  const userB = await prisma.user.create({
    data: {
      id: randomUUID(),
      email: emailB,
      role: UserRole.BUSINESS,
      fullName: "Blair Smoke",
      displayName: "Blair Smoke",
      businessName: "Smoke B Ltd",
      businessId: businessB,
      address: "Birmingham",
      postcode: "B1 2BB",
      businessProfile: {
        city: "Birmingham",
        localArea: "Jewellery Quarter",
        category: "Retail",
      },
    },
  });
  const userC = await prisma.user.create({
    data: {
      id: randomUUID(),
      email: emailC,
      role: UserRole.CUSTOMER,
      fullName: "Casey Smoke",
      displayName: "Casey Smoke",
      customerProfile: {},
    },
  });
  fixture.userIds.push(userA.id, userB.id, userC.id);

  return {
    userA,
    userB,
    userC,
    tokenA: await signToken(userA),
    tokenB: await signToken(userB),
    tokenC: await signToken(userC),
    businessA,
    businessB,
    emailA,
    emailB,
  };
}

async function cleanup() {
  const biz = fixture.businessIds;
  const users = fixture.userIds;
  const groups = fixture.groupIds;
  const emails = fixture.emails;

  const circles = await prisma.circle.findMany({
    where: { businessId: { in: biz } },
    select: { id: true },
  });
  const circleIds = [
    ...new Set([...fixture.circleIds, ...circles.map((circle) => circle.id)]),
  ];

  const cleanupSteps: Array<[string, () => Promise<unknown>]> = [
    [
      "circle activities",
      () => prisma.circleActivity.deleteMany({ where: { circleId: { in: circleIds } } }),
    ],
    ["circles", () => prisma.circle.deleteMany({ where: { id: { in: circleIds } } })],
    [
      "network contacts",
      () =>
        prisma.networkContact.deleteMany({
          where: {
            OR: [
              { businessId: { in: biz } },
              { id: { in: fixture.contactIds } },
            ],
          },
        }),
    ],
    [
      "network lists",
      () =>
        prisma.networkList.deleteMany({
          where: {
            OR: [{ businessId: { in: biz } }, { id: { in: fixture.listIds } }],
          },
        }),
    ],
    [
      "invitations",
      () =>
        prisma.invitation.deleteMany({
          where: {
            OR: [
              { groupId: { in: groups } },
              { id: { in: fixture.invitationIds } },
              { inviteeId: { in: biz } },
              { invitedById: { in: biz } },
              { inviteeEmail: { in: emails } },
            ],
          },
        }),
    ],
    [
      "group activities",
      () => prisma.groupActivity.deleteMany({ where: { groupId: { in: groups } } }),
    ],
    ["group members", () => prisma.groupMember.deleteMany({ where: { groupId: { in: groups } } })],
    ["groups", () => prisma.group.deleteMany({ where: { id: { in: groups } } })],
    [
      "audit logs",
      () =>
        prisma.auditLog.deleteMany({
          where: {
            OR: [
              { actorId: { in: users } },
              { targetId: { in: [...biz, ...groups, ...circleIds] } },
            ],
          },
        }),
    ],
    ["business plans", () => prisma.businessPlan.deleteMany({ where: { businessId: { in: biz } } })],
    ["businesses", () => prisma.business.deleteMany({ where: { id: { in: biz } } })],
    ["users", () => prisma.user.deleteMany({ where: { id: { in: users } } })],
    [
      "plan",
      () =>
        fixture.planId
          ? prisma.plan.deleteMany({ where: { id: fixture.planId } })
          : Promise.resolve(),
    ],
  ];

  for (const [label, step] of cleanupSteps) {
    try {
      await step();
    } catch (error) {
      console.log(`  ! cleanup failed for ${label}: ${String(error)}`);
    }
  }
}

// ---------------------------------------------------------------------------
// Test body
// ---------------------------------------------------------------------------

async function main() {
  const baseline = await snapshot();
  console.log(`Business smoke test against ${BASE_URL}`);
  console.log(`Baseline: ${JSON.stringify(baseline)}`);

  const f = await setup();

  try {
    // -----------------------------------------------------------------------
    section("Authentication and guards");
    // -----------------------------------------------------------------------

    let result = await api("GET", "/business/overview");
    expectStatus(result, 401, "overview without a session");

    result = await api("GET", "/business/overview", { token: f.tokenC });
    expectStatus(result, 403, "overview as a CUSTOMER");

    result = await api("GET", "/business/overview", { token: f.tokenA });
    expectStatus(result, 200, "overview as BUSINESS A");
    const firstOverview = result.data;
    eq(firstOverview.business.email, f.emailA, "overview resolves the signed-in business");
    eq(firstOverview.plan.status, "Pending", "new plan starts pending");
    eq(firstOverview.plan.paid, false, "new plan is unpaid");
    eq(firstOverview.plan.agreementAccepted, false, "new plan has no agreement");
    eq(firstOverview.canCreateGroups, false, "group creation is gated before activation");
    ok(
      Array.isArray(firstOverview.stats ? [firstOverview.stats] : null),
      "overview returns stats",
    );
    ok(firstOverview.plan && firstOverview.access, "overview returns plan + access");
    pass("anonymous 401, customer 403, business 200");

    // -----------------------------------------------------------------------
    section("Group creation gating and plan activation");
    // -----------------------------------------------------------------------

    const groupBody = (name: string, type: string, extra: Record<string, unknown> = {}) => ({
      name,
      type,
      purpose: `${name} purpose`,
      accessType: "open",
      visibility: "directory",
      interactionLevel: "message",
      pricing: "free",
      city: "Birmingham",
      localArea: "City Centre",
      ...extra,
    });

    result = await api("POST", "/business/groups", {
      token: f.tokenA,
      body: groupBody(`Smoke Before Activation ${run}`, "B2B"),
    });
    expectStatus(result, 403, "create group before activation");
    eq(result.data.code, "GROUP_CREATION_NOT_ALLOWED", "creation is blocked with the rules code");

    result = await api("POST", "/business/plan/activate", {
      token: f.tokenA,
      body: { agreementAccepted: false },
    });
    expectStatus(result, 400, "activate plan without agreement");

    result = await api("POST", "/business/plan/activate", {
      token: f.tokenA,
      body: {
        planId: fixture.planId,
        agreementAccepted: true,
        accessDays: 90,
        variant: "Pro+",
      },
    });
    expectStatus(result, 201, "activate plan with agreement");
    eq(result.data.canCreateGroups, true, "activation unlocks group creation");
    eq(result.data.plan.paid, true, "activated plan is paid");
    eq(result.data.plan.agreementAccepted, true, "activation records the agreement");
    eq(result.data.plan.planId, fixture.planId, "activation attaches the plan");

    result = await api("POST", "/business/groups", {
      token: f.tokenA,
      body: groupBody(`Smoke B2B Too Early ${run}`, "B2B"),
    });
    expectStatus(result, 409, "create a non-mandatory group first");
    eq(result.data.code, "MANDATORY_GROUPS_REQUIRED", "mandatory groups are enforced");
    ok(
      Array.isArray(result.data.requiredTypes) && result.data.requiredTypes.length === 3,
      "conflict lists all three mandatory group types",
    );

    // Mandatory groups, in order.
    result = await api("POST", "/business/groups", {
      token: f.tokenA,
      body: groupBody(`Smoke Marketing ${run}`, "Marketing"),
    });
    expectStatus(result, 201, "create mandatory Marketing group");
    const marketing = result.data;
    fixture.groupIds.push(marketing.id);
    eq(marketing.type, "Marketing", "Marketing group type persisted");
    eq(marketing.isOwner, true, "creator is the owner");
    eq(marketing.role, "owner", "creator role is owner");
    ok(marketing.activation && typeof marketing.activation.target === "number", "group activation computed");

    result = await api("POST", "/business/groups", {
      token: f.tokenA,
      body: groupBody(`Smoke Advertising ${run}`, "Advertising"),
    });
    expectStatus(result, 201, "create mandatory Advertising group");
    const advertising = result.data;
    fixture.groupIds.push(advertising.id);

    result = await api("POST", "/business/groups", {
      token: f.tokenA,
      body: groupBody(`Smoke Partner Free ${run}`, "Partner"),
    });
    expectStatus(result, 400, "create paid-designated Partner group for free");

    result = await api("POST", "/business/groups", {
      token: f.tokenA,
      body: groupBody(`Smoke Partner Low ${run}`, "Partner", {
        pricing: "paid",
        contribution: 4,
      }),
    });
    expectStatus(result, 400, "reject a contribution below the configured minimum");

    result = await api("POST", "/business/groups", {
      token: f.tokenA,
      body: groupBody(`Smoke Partner High ${run}`, "Partner", {
        pricing: "paid",
        contribution: 501,
      }),
    });
    expectStatus(result, 400, "reject a contribution above the configured maximum");

    result = await api("POST", "/business/groups", {
      token: f.tokenA,
      body: groupBody(`Smoke Partner ${run}`, "Partner", {
        pricing: "paid",
        contribution: 25,
        contributionFrequency: "monthly",
      }),
    });
    expectStatus(result, 201, "create mandatory Partner group with a valid contribution");
    const partner = result.data;
    fixture.groupIds.push(partner.id);
    eq(partner.pricing, "paid", "Partner group is paid");
    eq(partner.contribution, 25, "Partner contribution persisted");

    result = await api("POST", "/business/groups", {
      token: f.tokenA,
      body: groupBody(`Smoke B2B Request ${run}`, "B2B", { accessType: "request" }),
    });
    expectStatus(result, 201, "create a request-to-join B2B group");
    const b2b = result.data;
    fixture.groupIds.push(b2b.id);

    result = await api("POST", "/business/groups", {
      token: f.tokenA,
      body: groupBody(`Smoke Private ${run}`, "B2B", {
        accessType: "request",
        visibility: "members",
      }),
    });
    expectStatus(result, 201, "create a members-only group");
    const privateGroup = result.data;
    fixture.groupIds.push(privateGroup.id);
    pass("creation rights, mandatory order and payment rules enforced");

    // -----------------------------------------------------------------------
    section("Group dashboard, mine sections and explore");
    // -----------------------------------------------------------------------

    result = await api("GET", "/business/groups/dashboard", { token: f.tokenA });
    expectStatus(result, 200, "group dashboard");
    const dashboard = result.data;
    eq(dashboard.business.id, f.businessA, "dashboard scopes to the signed-in business");
    ok(dashboard.stats.owned >= 5, "dashboard counts all owned groups");
    ok(Array.isArray(dashboard.recentActivity) && dashboard.recentActivity.length > 0, "dashboard returns recent activity");
    ok(dashboard.mandatoryGroups.every((entry: any) => entry.satisfied), "all mandatory groups satisfied");
    eq(dashboard.canCreateGroups, true, "dashboard reports creation rights");

    result = await api("GET", "/business/groups/mine", { token: f.tokenA });
    expectStatus(result, 200, "mine sections");
    ok(result.data.created.length >= 5, "mine exposes created groups");
    ok(Array.isArray(result.data.automatic), "mine exposes automatic groups");
    ok(Array.isArray(result.data.joined), "mine exposes joined groups");

    for (const sectionName of ["automatic", "created", "joined", "head-start", "all"]) {
      result = await api("GET", `/business/groups/mine/${sectionName}`, { token: f.tokenA });
      expectStatus(result, 200, `mine/${sectionName}`);
      ok(Array.isArray(result.data.items), `mine/${sectionName} returns items`);
      ok(result.data.counts && typeof result.data.counts.all === "number", `mine/${sectionName} returns counts`);
    }

    result = await api("GET", "/business/groups/mine/nope", { token: f.tokenA });
    expectStatus(result, 400, "unknown mine section");

    result = await api("GET", "/business/groups/explore", { token: f.tokenB });
    expectStatus(result, 200, "explore as business B");
    ok(result.data.total >= 4, "B sees A's directory groups");
    const exploredB2B = result.data.items.find((group: any) => group.id === b2b.id);
    ok(Boolean(exploredB2B), "explore contains the request-to-join group");
    eq(exploredB2B?.joinPlan.action, "request", "join plan asks for a request");
    ok(
      !result.data.items.some((group: any) => group.id === privateGroup.id),
      "members-only groups are excluded from explore",
    );

    result = await api("GET", "/business/groups/explore?limit=101", { token: f.tokenB });
    expectStatus(result, 400, "explore rejects an oversized page limit");

    result = await api("GET", `/business/groups/${b2b.id}`, { token: f.tokenB });
    expectStatus(result, 200, "B views a directory group");
    eq(result.data.group.id, b2b.id, "group detail returns the requested group");
    eq(result.data.group.isMember, false, "B is not a member yet");
    eq(result.data.group.joinPlan.action, "request", "detail exposes the join plan");
    ok(Array.isArray(result.data.activity), "group detail returns activity");

    result = await api("GET", `/business/groups/${privateGroup.id}`, { token: f.tokenB });
    expectStatus(result, 403, "B cannot view a members-only group");

    result = await api("GET", `/business/groups/${randomUUID()}`, { token: f.tokenA });
    expectStatus(result, 404, "unknown group is a 404");

    result = await api("GET", `/business/groups/${b2b.id}/members`, { token: f.tokenA });
    expectStatus(result, 200, "group members");
    eq(result.data.stats.total, 1, "new group contains only its owner");

    result = await api("GET", `/business/groups/${b2b.id}/activity`, { token: f.tokenA });
    expectStatus(result, 200, "group activity");
    ok(Array.isArray(result.data) && result.data.length >= 1, "group creation wrote activity");

    result = await api("PATCH", `/business/groups/${b2b.id}`, {
      token: f.tokenA,
      body: {
        name: `Smoke B2B Renamed ${run}`,
        purpose: "Updated purpose",
        requiredSize: 20,
        stage: "Recruiting",
      },
    });
    expectStatus(result, 200, "owner updates group settings");
    eq(result.data.name, `Smoke B2B Renamed ${run}`, "group name updated");
    eq(result.data.requiredSize, 20, "required size updated");
    eq(result.data.stage, "Recruiting", "stage updated");

    result = await api("PATCH", `/business/groups/${b2b.id}`, {
      token: f.tokenB,
      body: { name: "Hijack" },
    });
    expectStatus(result, 403, "non-owner cannot update the group");

    result = await api("PATCH", `/business/groups/${b2b.id}`, {
      token: f.tokenA,
      body: { pricing: "paid" },
    });
    expectStatus(result, 400, "paid group update without a contribution is rejected");

    result = await api("POST", `/business/groups/${b2b.id}/join`, { token: f.tokenA });
    expectStatus(result, 409, "owner cannot join their own group");
    pass("group views, settings, pagination bounds and IDOR checks pass");

    // -----------------------------------------------------------------------
    section("Join request lifecycle");
    // -----------------------------------------------------------------------

    result = await api("POST", `/business/groups/${b2b.id}/join`, { token: f.tokenB });
    expectStatus(result, 201, "B requests to join");
    eq(result.data.status, "requested", "join returns a pending request");
    const requestId = result.data.invitation.id;
    fixture.invitationIds.push(requestId);

    result = await api("POST", `/business/groups/${b2b.id}/join`, { token: f.tokenB });
    expectStatus(result, 201, "B repeats the join request");
    eq(result.data.invitation.id, requestId, "repeat request reuses the pending invitation");

    result = await api("GET", "/business/invitations?tab=owner-requests", { token: f.tokenA });
    expectStatus(result, 200, "owner request inbox");
    ok(
      result.data.items.some((invitation: any) => invitation.id === requestId),
      "owner sees the join request",
    );
    ok(result.data.counts.ownerRequests >= 1, "owner request count is populated");

    result = await api("GET", `/business/invitations/${requestId}`, { token: f.tokenA });
    expectStatus(result, 200, "owner opens the join request");
    eq(result.data.canRespond, true, "owner can respond to the request");
    eq(result.data.responderRole, "owner", "request responder role is owner");

    result = await api("POST", `/business/invitations/${requestId}/accept`, { token: f.tokenA });
    expectStatus(result, 201, "owner accepts the join request");
    eq(result.data.invitation.status, "accepted", "request is accepted");

    result = await api("GET", `/business/groups/${b2b.id}/members`, { token: f.tokenA });
    expectStatus(result, 200, "members after accepting the request");
    eq(result.data.stats.total, 2, "accepted request adds the member");

    result = await api("POST", `/business/groups/${b2b.id}/leave`, { token: f.tokenB });
    expectStatus(result, 201, "member leaves the group");
    eq(result.data.ok, true, "leave acknowledges success");

    result = await api("DELETE", `/business/groups/${b2b.id}/members/${f.businessB}`, {
      token: f.tokenA,
    });
    expectStatus(result, 404, "removing a non-member is a 404");

    result = await api("DELETE", `/business/groups/${b2b.id}/members/${f.businessA}`, {
      token: f.tokenA,
    });
    expectStatus(result, 400, "owner cannot be removed");

    result = await api("POST", `/business/groups/${b2b.id}/leave`, { token: f.tokenA });
    expectStatus(result, 400, "owner cannot leave their own group");

    // -----------------------------------------------------------------------
    section("Invitation lifecycle");
    // -----------------------------------------------------------------------

    result = await api("POST", `/business/groups/${marketing.id}/invitations`, {
      token: f.tokenA,
      body: {
        entries: [{ inviteeId: f.businessB, inviteeName: "Smoke B Ltd" }],
      },
    });
    expectStatus(result, 201, "A invites B to the Marketing group");
    eq(result.data.created, 1, "one invitation created");
    const inviteId = result.data.invitations[0].id;
    fixture.invitationIds.push(inviteId);

    result = await api("POST", `/business/groups/${marketing.id}/invitations`, {
      token: f.tokenA,
      body: {
        entries: [{ inviteeId: f.businessB, inviteeName: "Smoke B Ltd" }],
      },
    });
    expectStatus(result, 201, "A re-sends the same invite");
    eq(result.data.created, 0, "duplicate pending invite is skipped");
    eq(result.data.skipped, 1, "duplicate is reported as skipped");

    result = await api("GET", "/business/invitations?tab=incoming", { token: f.tokenB });
    expectStatus(result, 200, "B invitation inbox");
    ok(
      result.data.items.some((invitation: any) => invitation.id === inviteId),
      "B sees the invitation",
    );
    ok(result.data.counts.incoming >= 1, "incoming count is populated");

    result = await api("GET", `/business/invitations/${inviteId}`, { token: f.tokenB });
    expectStatus(result, 200, "B opens the invitation");
    eq(result.data.canRespond, true, "invitee can respond");
    eq(result.data.responderRole, "invitee", "responder role is invitee");
    eq(result.data.group.id, marketing.id, "invitation detail includes the group");

    result = await api("GET", `/business/invitations/${inviteId}`, { token: f.tokenA });
    expectStatus(result, 200, "A may inspect its own outgoing invitation");
    eq(result.data.responderRole, "owner", "owner role on outgoing invite");

    result = await api("POST", `/business/invitations/${inviteId}/accept`, { token: f.tokenB });
    expectStatus(result, 201, "B accepts the invitation");
    eq(result.data.invitation.status, "accepted", "invitation accepted");

    result = await api("GET", `/business/groups/${marketing.id}/members`, { token: f.tokenA });
    expectStatus(result, 200, "Marketing members after acceptance");
    eq(result.data.stats.total, 2, "accepting an invitation adds the member");

    result = await api("GET", `/business/groups/${marketing.id}/invitations`, { token: f.tokenA });
    expectStatus(result, 200, "owner group invitation list");
    ok(result.data.some((invitation: any) => invitation.id === inviteId), "group invite is listed");

    const externalEmail = `external-${run}@example.test`;
    fixture.emails.push(externalEmail);
    result = await api("POST", `/business/groups/${marketing.id}/invitations`, {
      token: f.tokenA,
      body: {
        entries: [
          { inviteeName: "External Smoke", inviteeEmail: externalEmail },
        ],
      },
    });
    expectStatus(result, 201, "invite an email-only contact");
    const externalInviteId = result.data.invitations[0].id;
    fixture.invitationIds.push(externalInviteId);

    result = await api("POST", `/business/invitations/${externalInviteId}/resend`, {
      token: f.tokenA,
    });
    expectStatus(result, 201, "resend an outgoing invitation");
    eq(result.data.resent, true, "resend is acknowledged");

    result = await api("POST", `/business/invitations/${externalInviteId}/cancel`, {
      token: f.tokenA,
    });
    expectStatus(result, 201, "cancel an outgoing invitation");
    eq(result.data.invitation.status, "cancelled", "invitation is cancelled");

    result = await api("GET", "/business/invitations?tab=outgoing", { token: f.tokenA });
    expectStatus(result, 200, "outgoing invitation inbox");
    ok(result.data.items.length >= 1, "outgoing invites are listed");
    ok(
      result.data.items.some((invitation: any) => invitation.id === externalInviteId),
      "email-only invitation appears in the outgoing inbox",
    );
    ok(result.data.counts.outgoing >= 1, "outgoing count includes email-only invites");
    ok(typeof result.data.counts.pending === "number", "counts expose the pending total");
    pass("invite, duplicate skip, accept, resend, cancel flows pass");

    // -----------------------------------------------------------------------
    section("Network lists and contacts");
    // -----------------------------------------------------------------------

    result = await api("POST", "/business/network/lists", {
      token: f.tokenA,
      body: {
        name: `Smoke Network ${run}`,
        type: "B2B",
        geography: "National",
        source: "Manual Contacts",
      },
    });
    expectStatus(result, 201, "create a network list");
    const list = result.data;
    fixture.listIds.push(list.id);
    eq(list.status, "Active", "list defaults to Active");
    eq(list.contactIds, [], "new list has no contacts");

    result = await api("GET", "/business/network/lists", { token: f.tokenA });
    expectStatus(result, 200, "list network lists");
    ok(result.data.items.some((entry: any) => entry.id === list.id), "created list is returned");
    ok(result.data.stats.lists >= 1, "network stats count lists");

    result = await api("PATCH", `/business/network/lists/${list.id}`, {
      token: f.tokenA,
      body: { name: `Smoke Network Renamed ${run}`, status: "Active" },
    });
    expectStatus(result, 200, "update a network list");
    eq(result.data.name, `Smoke Network Renamed ${run}`, "list name updated");

    result = await api("POST", "/business/network/contacts", {
      token: f.tokenA,
      body: {
        listId: list.id,
        fullName: "Contact One",
        email: `contact-one-${run}@example.test`,
        phone: "+44 7000 000001",
        category: "Retail",
        location: "Birmingham",
        role: "banker",
        consent: true,
      },
    });
    expectStatus(result, 201, "add the first contact");
    const contactOne = result.data;
    fixture.contactIds.push(contactOne.id);
    eq(contactOne.confirmation, "pending", "new contact is pending");

    result = await api("POST", "/business/network/contacts", {
      token: f.tokenA,
      body: {
        listId: list.id,
        fullName: "Contact Duplicate",
        email: `contact-one-${run}@example.test`,
      },
    });
    expectStatus(result, 409, "duplicate contact email is rejected");

    result = await api("POST", "/business/network/contacts", {
      token: f.tokenA,
      body: {
        listId: list.id,
        fullName: "Contact Two",
        email: `contact-two-${run}@example.test`,
        role: "peripheral",
      },
    });
    expectStatus(result, 201, "add the second contact");
    const contactTwo = result.data;
    fixture.contactIds.push(contactTwo.id);

    result = await api("GET", `/business/network/contacts?search=Contact&limit=10`, {
      token: f.tokenA,
    });
    expectStatus(result, 200, "search contacts");
    eq(result.data.total, 2, "search matches both contacts");

    result = await api("GET", `/business/network/contacts?confirmation=pending`, {
      token: f.tokenA,
    });
    expectStatus(result, 200, "filter contacts by confirmation");
    eq(result.data.total, 2, "both contacts are pending");

    result = await api("GET", `/business/network/contacts/${contactOne.id}`, {
      token: f.tokenA,
    });
    expectStatus(result, 200, "get one contact");
    eq(result.data.id, contactOne.id, "contact detail matches");

    result = await api("POST", `/business/network/contacts/${contactOne.id}/confirm`, {
      token: f.tokenA,
      body: { consent: true },
    });
    expectStatus(result, 201, "confirm a contact");
    eq(result.data.confirmation, "confirmed", "contact is confirmed");

    result = await api("GET", "/business/network/stats", { token: f.tokenA });
    expectStatus(result, 200, "network stats");
    eq(result.data.contacts, 2, "stats count contacts");
    eq(result.data.confirmed, 1, "stats count confirmed contacts");
    eq(result.data.pending, 1, "stats count pending contacts");

    result = await api("GET", `/business/network/lists/${list.id}`, { token: f.tokenA });
    expectStatus(result, 200, "get one network list");
    eq(result.data.contactCount, 2, "list exposes its contact count");
    pass("lists CRUD, contact intake, duplicate guard, confirmation and stats pass");

    // -----------------------------------------------------------------------
    section("Circles");
    // -----------------------------------------------------------------------

    result = await api("POST", "/business/circles", {
      token: f.tokenA,
      body: {
        type: "Marketing Circle",
        config: {
          name: `Smoke Marketing Circle ${run}`,
          description: "A smoke circle",
          duration: 90,
          visibility: "private",
          interactionLevel: "message",
        },
        sourceListIds: [list.id],
      },
    });
    expectStatus(result, 201, "create a circle from a source list");
    const circleOne = result.data.circle;
    fixture.circleIds.push(circleOne.id);
    eq(circleOne.memberCount, 2, "list contacts become circle members");
    ok(result.data.members.length === 2, "circle detail resolves its members");
    ok(result.data.sourceLists.length === 1, "circle detail resolves its source lists");
    ok(result.data.activity.length >= 1, "circle creation writes activity");

    result = await api("POST", "/business/circles", {
      token: f.tokenA,
      body: {
        type: "Advertising Circle",
        config: {
          name: `Smoke Advertising Circle ${run}`,
          duration: 180,
          visibility: "private",
          interactionLevel: "message",
        },
        memberIds: [contactOne.id],
      },
    });
    expectStatus(result, 201, "create a circle from explicit members");
    const circleTwo = result.data.circle;
    fixture.circleIds.push(circleTwo.id);

    result = await api("POST", "/business/circles", {
      token: f.tokenA,
      body: {
        type: "Marketing Circle",
        config: {
          name: `Smoke Circle Over Quota ${run}`,
          duration: 90,
        },
        memberIds: [contactOne.id],
      },
    });
    expectStatus(result, 403, "third circle exceeds the plan quota");
    eq(result.data.code, "CIRCLE_QUOTA_REACHED", "quota error exposes its code");

    result = await api("GET", "/business/circles", { token: f.tokenA });
    expectStatus(result, 200, "list circles");
    eq(result.data.total, 2, "circle list is scoped and complete");
    eq(result.data.quota, 2, "circle quota comes from the plan");
    ok(
      result.data.types.some((entry: any) => entry.type === "Marketing Circle"),
      "circle types are returned",
    );
    ok(
      result.data.mandatoryCircles.every((entry: any) => typeof entry.satisfied === "boolean"),
      "mandatory circle status is returned",
    );

    result = await api("GET", `/business/circles/${circleOne.id}`, { token: f.tokenA });
    expectStatus(result, 200, "get one circle");
    eq(result.data.circle.config.duration, 90, "circle duration persisted");
    ok(result.data.stats.total === 2, "circle stats count members");

    result = await api("POST", `/business/circles/${circleOne.id}/members`, {
      token: f.tokenA,
      body: { memberId: f.businessB },
    });
    expectStatus(result, 201, "add a business member to a circle");
    eq(result.data.circle.memberCount, 3, "member count grows");

    result = await api("POST", `/business/circles/${circleOne.id}/members`, {
      token: f.tokenA,
      body: { memberId: f.businessB },
    });
    expectStatus(result, 409, "duplicate circle member is rejected");

    result = await api("DELETE", `/business/circles/${circleOne.id}/members/${f.businessB}`, {
      token: f.tokenA,
    });
    expectStatus(result, 200, "remove a circle member");
    eq(result.data.circle.memberCount, 2, "member count shrinks");

    result = await api("PATCH", `/business/circles/${circleOne.id}`, {
      token: f.tokenA,
      body: {
        config: {
          name: `Smoke Marketing Circle Renamed ${run}`,
          duration: 180,
        },
      },
    });
    expectStatus(result, 200, "update circle config");
    eq(result.data.circle.config.name, `Smoke Marketing Circle Renamed ${run}`, "circle name updated");
    eq(result.data.circle.config.duration, 180, "circle duration updated");
    eq(result.data.circle.config.visibility, "private", "omitted config fields are preserved");
    eq(result.data.circle.config.interactionLevel, "message", "interaction level is preserved");

    result = await api("GET", `/business/circles/${circleOne.id}/activity`, {
      token: f.tokenA,
    });
    expectStatus(result, 200, "circle activity");
    ok(result.data.length >= 4, "circle activity covers create/add/remove/update");

    result = await api("DELETE", `/business/network/contacts/${contactTwo.id}`, {
      token: f.tokenA,
    });
    expectStatus(result, 200, "delete a network contact");

    result = await api("GET", `/business/circles/${circleOne.id}`, { token: f.tokenA });
    expectStatus(result, 200, "circle after deleting a member contact");
    eq(result.data.circle.memberCount, 1, "deleting a contact removes it from circles");

    result = await api("DELETE", `/business/circles/${circleOne.id}`, { token: f.tokenA });
    expectStatus(result, 200, "delete a circle");

    result = await api("GET", `/business/circles/${circleOne.id}`, { token: f.tokenA });
    expectStatus(result, 404, "deleted circle is gone");

    result = await api("DELETE", `/business/circles/${circleTwo.id}`, { token: f.tokenA });
    expectStatus(result, 200, "delete the second circle");

    result = await api("DELETE", `/business/network/lists/${list.id}`, { token: f.tokenA });
    expectStatus(result, 200, "delete the network list");
    pass("circle rules, quota, membership and cleanup pass");

    // -----------------------------------------------------------------------
    section("Platform pages");
    // -----------------------------------------------------------------------

    result = await api("GET", "/business/config", { token: f.tokenA });
    expectStatus(result, 200, "business config");
    ok(Array.isArray(result.data.groupTypes), "config exposes group types");
    ok(Array.isArray(result.data.circleTypes), "config exposes circle types");
    eq(result.data.canCreateGroups, true, "config reports creation rights");

    result = await api("GET", "/business/profile", { token: f.tokenA });
    expectStatus(result, 200, "business profile");
    eq(result.data.business.id, f.businessA, "profile scopes to the business");
    eq(result.data.user.email, f.emailA, "profile includes the user");
    eq(result.data.plan.paid, true, "profile includes plan");

    result = await api("PATCH", "/business/profile", {
      token: f.tokenA,
      body: {
        name: `Smoke A Renamed ${run}`,
        city: "Birmingham",
        localArea: "Jewellery Quarter",
        category: "Professional Services",
      },
    });
    expectStatus(result, 200, "update business profile");
    eq(result.data.business.name, `Smoke A Renamed ${run}`, "business name updated");
    eq(result.data.business.localArea, "Jewellery Quarter", "local area updated");

    result = await api("GET", "/business/plan", { token: f.tokenA });
    expectStatus(result, 200, "plan page");
    eq(result.data.plan.planId, fixture.planId, "plan exposes the plan");
    eq(result.data.quotas.groups, 10, "plan exposes the group quota");
    eq(result.data.quotas.circles, 2, "plan exposes the circle quota");
    ok(Array.isArray(result.data.mandatoryGroups), "plan exposes mandatory groups");

    result = await api("GET", "/business/journey", { token: f.tokenA });
    expectStatus(result, 200, "journey");
    eq(result.data.total, 14, "journey exposes every business step");
    ok(result.data.percent >= 0 && result.data.percent <= 100, "journey percentage is bounded");
    ok(result.data.done && typeof result.data.done.access === "boolean", "journey exposes step completion");

    result = await api("GET", `/business/directory?search=Smoke`, { token: f.tokenA });
    expectStatus(result, 200, "business directory");
    ok(result.data.total >= 1, "directory finds the other smoke business");
    ok(
      !result.data.items.some((entry: any) => entry.id === f.businessA),
      "directory excludes the current business",
    );

    result = await api("GET", "/business/locations", { token: f.tokenA });
    expectStatus(result, 200, "locations");
    ok(Array.isArray(result.data.cities), "locations returns the city hierarchy");
    eq(result.data.current.city, "Birmingham", "locations returns the current city");

    result = await api("GET", "/business/programmes", { token: f.tokenA });
    expectStatus(result, 200, "programmes");
    ok(Array.isArray(result.data.items), "programmes returns items");
    ok(result.data.stats && typeof result.data.stats.total === "number", "programmes returns stats");

    result = await api("GET", "/business/campaigns?limit=10", { token: f.tokenA });
    expectStatus(result, 200, "campaigns");
    ok(Array.isArray(result.data.items), "campaigns returns items");
    ok(result.data.stats && typeof result.data.stats.total === "number", "campaigns returns stats");

    result = await api("GET", "/business/rewards?limit=10", { token: f.tokenA });
    expectStatus(result, 200, "rewards");
    ok(Array.isArray(result.data.programmes), "rewards returns programmes");
    ok(result.data.rewardDeals && Array.isArray(result.data.rewardDeals.items), "rewards returns deals");

    result = await api("GET", "/business/community", { token: f.tokenA });
    expectStatus(result, 200, "national community");
    eq(result.data.community.name, "National Community", "community identity returned");
    ok(result.data.stats && typeof result.data.stats.communityGroups === "number", "community stats returned");

    result = await api("GET", "/business/location", { token: f.tokenA });
    expectStatus(result, 200, "my location");
    eq(result.data.current.city, "Birmingham", "location returns the current city");
    ok(Array.isArray(result.data.hierarchy), "location returns the hierarchy");

    result = await api("GET", "/business/groups/network", { token: f.tokenA });
    expectStatus(result, 200, "network group");
    ok(result.data.progress && typeof result.data.progress.threshold === "number", "network progress returned");
    ok(result.data.stats && typeof result.data.stats.networkGroups === "number", "network stats returned");

    result = await api("GET", "/business/invitations?tab=bogus", { token: f.tokenA });
    expectStatus(result, 400, "invitation inbox rejects an unknown tab");

    result = await api("GET", "/business/groups/explore?page=0", { token: f.tokenA });
    expectStatus(result, 400, "explore rejects page 0");
    pass("platform overview/config/profile/plan/journey/directory/location pages pass");
  } finally {
    await cleanup();
  }

  const after = await snapshot();
  console.log(`\nAfter cleanup: ${JSON.stringify(after)}`);
  ok(
    JSON.stringify(after) === JSON.stringify(baseline),
    `database returned to baseline (before ${JSON.stringify(baseline)}, after ${JSON.stringify(after)})`,
  );

  console.log(`\n${checks - failures.length}/${checks} checks passed.`);
  if (failures.length > 0) {
    console.log("\nFailures:");
    for (const failure of failures) console.log(`  - ${failure}`);
    process.exitCode = 1;
  } else {
    console.log("Business dashboard API smoke test passed.");
  }
}

main()
  .catch(async (error) => {
    console.error("\nSmoke test crashed:", error);
    await cleanup();
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
