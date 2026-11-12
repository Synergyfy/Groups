#!/usr/bin/env node
/**
 * End-to-end smoke test for the admin console API.
 *
 * Requirements:
 *   - API running (pnpm dev:api or node apps/api/dist/main.js)
 *   - database migrated and seeded (pnpm db:migrate && pnpm db:seed)
 *
 * Run from the repo root:
 *   pnpm admin:smoke
 */

const base = `http://localhost:${process.env.API_PORT ?? "4089"}/api`;
const suffix = Date.now().toString(36);

let cookie = "";
const results = [];
const created = {
  businessId: null,
  groupId: null,
  programmeId: null,
  campaignId: null,
  relationshipId: null,
  rewardId: null,
  cityId: null,
  areaId: null,
  scheduleId: null,
};

function check(name, condition, detail = "") {
  results.push({ name, ok: Boolean(condition), detail });
  if (!condition) {
    console.error(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

async function request(method, path, body, { auth = true } = {}) {
  const headers = { accept: "application/json" };
  if (body !== undefined) headers["content-type"] = "application/json";
  if (auth && cookie) headers.cookie = cookie;

  const response = await fetch(`${base}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const text = await response.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = text;
  }

  return { status: response.status, json, headers: response.headers };
}

async function ok(method, path, body, name) {
  const response = await request(method, path, body);
  check(
    name ?? `${method} ${path}`,
    response.status >= 200 && response.status < 300,
    `status ${response.status} ${JSON.stringify(response.json).slice(0, 200)}`,
  );
  return response.json;
}

function isArray(value) {
  return Array.isArray(value);
}

async function login() {
  const response = await request(
    "POST",
    "/auth/admin/login",
    {
      email: process.env.ADMIN_EMAIL,
      password: process.env.ADMIN_PASSWORD,
    },
    { auth: false },
  );

  check(
    "POST /auth/admin/login",
    response.status === 200 || response.status === 201,
    `status ${response.status} ${JSON.stringify(response.json)}`,
  );

  const setCookies =
    typeof response.headers.getSetCookie === "function"
      ? response.headers.getSetCookie()
      : [response.headers.get("set-cookie")].filter(Boolean);
  cookie = setCookies.map((value) => value.split(";")[0]).join("; ");

  check("admin session cookie issued", cookie.length > 0);
}

async function testAuthGuard() {
  const response = await request("GET", "/admin/overview", undefined, {
    auth: false,
  });
  check(
    "admin routes reject anonymous requests",
    response.status === 401 || response.status === 403,
    `status ${response.status}`,
  );
}

async function testReads() {
  const overview = await ok("GET", "/admin/overview");
  check("overview metrics present", Boolean(overview?.metrics?.totalGroups));
  check("overview charts present", isArray(overview?.groupsByType));

  const users = await ok("GET", "/admin/users");
  check("users list", isArray(users) && users.length > 0);
  await ok("GET", "/admin/users/registrations");

  const businesses = await ok("GET", "/admin/businesses");
  check("businesses list", isArray(businesses) && businesses.length > 0);
  if (businesses[0]) await ok("GET", `/admin/businesses/${businesses[0].id}`);

  const partners = await ok("GET", "/admin/partners");
  check("partners list", isArray(partners) && partners.length > 0);

  const programmes = await ok("GET", "/admin/programmes");
  check("programmes list", isArray(programmes) && programmes.length > 0);

  const campaigns = await ok("GET", "/admin/campaigns");
  check("campaigns list", isArray(campaigns) && campaigns.length > 0);

  const relationships = await ok("GET", "/admin/relationships");
  check("relationships list", isArray(relationships) && relationships.length > 0);

  const partnerGroups = await ok("GET", "/admin/partner-groups");
  check("partner groups report", Boolean(partnerGroups?.metrics));

  const groups = await ok("GET", "/admin/groups");
  check("groups list", isArray(groups) && groups.length > 0);

  const dashboard = await ok("GET", "/admin/groups/dashboard");
  check("groups dashboard stats", Boolean(dashboard?.stats));

  const hub = await ok("GET", "/admin/groups/hub");
  check("groups hub payload", Boolean(hub?.stats) && isArray(hub?.groups));

  const filtered = await ok(
    "GET",
    "/admin/groups?status=Active&city=Birmingham&query=birmingham",
  );
  check("group filters apply", isArray(filtered));

  const group = groups.find((entry) => entry.memberCount > 0) ?? groups[0];
  if (group) {
    await ok("GET", `/admin/groups/${group.id}`);
    const members = await ok("GET", `/admin/groups/${group.id}/members`);
    check("group members list", isArray(members) && members.length > 0);
    await ok("GET", `/admin/groups/${group.id}/activity`);
    await ok("GET", `/admin/groups/${group.id}/relationships`);
    await ok("GET", `/admin/groups/${group.id}/contribution`);
    await ok("GET", `/admin/groups/${group.id}/circles`);
    await ok("GET", `/admin/groups/${group.id}/invitations`);
  }
}

async function testConfig() {
  const config = await ok("GET", "/admin/config");
  check("config payload", Boolean(config?.automaticGrouping));

  await ok("GET", "/admin/config/automatic");
  await ok("GET", "/admin/config/group-rules");
  await ok("GET", "/admin/config/types");
  await ok("GET", "/admin/config/stages");
  await ok("GET", "/admin/config/payment-rules");
  await ok("GET", "/admin/config/circles");
  await ok("GET", "/admin/config/mandatory-circles");
  await ok("GET", "/admin/config/mandatory-groups");

  const permissions = await ok("GET", "/admin/permissions");
  check("permissions payload", Boolean(permissions?.partnerDefaults));

  await ok("GET", "/admin/access-rules");
  await ok("GET", "/admin/settings");

  const updated = await ok(
    "PATCH",
    "/admin/config/automatic",
    { allowCombine: true },
    "PATCH /admin/config/automatic",
  );
  check(
    "config patch applied",
    updated?.automaticGrouping?.allowCombine === true,
    JSON.stringify(updated?.automaticGrouping),
  );
  await ok("PATCH", "/admin/config/automatic", { allowCombine: false });
}

async function testUsers() {
  const updated = await ok(
    "PATCH",
    "/admin/users/cons-liam",
    { status: "Active" },
    "PATCH /admin/users/:id",
  );
  check("user status updated", updated?.status === "Active");
  await ok("PATCH", "/admin/users/cons-liam", { status: "Pending" });
}

async function testBusinesses() {
  const createdBusiness = await ok(
    "POST",
    "/admin/businesses",
    {
      name: `Smoke Business ${suffix}`,
      contactName: "Smoke Tester",
      email: `smoke-${suffix}@example.com`,
      city: "Birmingham",
      category: "Testing",
      tier: "Bronze",
    },
    "POST /admin/businesses",
  );
  created.businessId = createdBusiness.id;
  check("business created", Boolean(createdBusiness.id));

  await ok(
    "PATCH",
    `/admin/businesses/${created.businessId}`,
    { status: "Active", verified: true },
  );
  await ok("POST", `/admin/businesses/${created.businessId}/verify`);
  await ok("POST", `/admin/businesses/${created.businessId}/suspend`);
  await ok("DELETE", `/admin/businesses/${created.businessId}`);
  created.businessId = null;
}

async function testProgrammesCampaignsRelationships() {
  const programme = await ok(
    "POST",
    "/admin/programmes",
    { name: `Smoke Programme ${suffix}`, tier: "Silver", monthlyFee: 10 },
    "POST /admin/programmes",
  );
  created.programmeId = programme.id;
  await ok("PATCH", `/admin/programmes/${created.programmeId}`, {
    monthlyFee: 12,
  });
  await ok("DELETE", `/admin/programmes/${created.programmeId}`);
  created.programmeId = null;

  const campaign = await ok(
    "POST",
    "/admin/campaigns",
    { name: `Smoke Campaign ${suffix}`, status: "Draft" },
    "POST /admin/campaigns",
  );
  created.campaignId = campaign.id;
  await ok("PATCH", `/admin/campaigns/${created.campaignId}`, {
    status: "Active",
  });
  await ok("DELETE", `/admin/campaigns/${created.campaignId}`);
  created.campaignId = null;

  const relationship = await ok(
    "POST",
    "/admin/relationships",
    {
      kind: "agent",
      name: `Smoke Agent ${suffix}`,
      role: "Supporting Agent",
      email: `agent-${suffix}@example.com`,
    },
    "POST /admin/relationships",
  );
  created.relationshipId = relationship.id;
  await ok("PATCH", `/admin/relationships/${created.relationshipId}`, {
    activeGroups: 2,
  });
  await ok("DELETE", `/admin/relationships/${created.relationshipId}`);
  created.relationshipId = null;
}

async function testGroups() {
  const group = await ok(
    "POST",
    "/admin/groups",
    {
      name: `Smoke Group ${suffix}`,
      type: "B2B",
      source: "user-created",
      purpose: "Created by the admin smoke test",
      ownerId: "biz-smith",
      ownerName: "Smith Business Ltd",
      city: "Birmingham",
      localArea: "Birmingham City Centre",
      status: "Pending Review",
      pricing: "paid",
      contribution: 25,
      contributionFrequency: "monthly",
    },
    "POST /admin/groups",
  );
  created.groupId = group.id;
  check("group created", Boolean(group.id));

  await ok("PATCH", `/admin/groups/${created.groupId}`, {
    status: "Recruiting",
    requiredSize: 6,
  });
  await ok(
    "POST",
    `/admin/groups/${created.groupId}/members`,
    {
      memberId: "biz-city-foods",
      fullName: "Tariq Ahmed",
      businessName: "City Foods",
      role: "core",
      tier: "Bronze",
    },
    "POST /admin/groups/:id/members",
  );

  const members = await ok(
    "GET",
    `/admin/groups/${created.groupId}/members`,
  );
  check("group member added", isArray(members) && members.length === 1);

  const contribution = await ok(
    "GET",
    `/admin/groups/${created.groupId}/contribution`,
  );
  check("contribution ledger", contribution?.pricing === "paid");

  await ok(
    "PATCH",
    `/admin/groups/${created.groupId}/relationships`,
    { accountManagerId: "rel-am-jane", agentId: "rel-agent-john" },
    "PATCH /admin/groups/:id/relationships",
  );
  const rel = await ok(
    "GET",
    `/admin/groups/${created.groupId}/relationships`,
  );
  check("group relationships resolved", Boolean(rel?.accountManager));

  await ok("POST", `/admin/groups/${created.groupId}/approve`);
  await ok("POST", `/admin/groups/${created.groupId}/suspend`);
  await ok("POST", `/admin/groups/${created.groupId}/close`);

  await ok(
    "DELETE",
    `/admin/groups/${created.groupId}/members/biz-city-foods`,
  );
  await ok("DELETE", `/admin/groups/${created.groupId}`);
  created.groupId = null;
}

async function testMembershipsAndRewards() {
  const plans = await ok("GET", "/admin/memberships/plans");
  check("membership plans list", isArray(plans) && plans.length > 0);
  await ok("GET", "/admin/memberships/stats");

  const plan = plans[0];
  const original = plan?.subscriberCount;
  await ok("PATCH", `/admin/memberships/plans/${plan.id}`, {
    subscriberCount: (original ?? 0) + 1,
  });
  await ok("PATCH", `/admin/memberships/plans/${plan.id}`, {
    subscriberCount: original,
  });

  const reward = await ok(
    "POST",
    "/admin/rewards-deals",
    {
      title: `Smoke Deal ${suffix}`,
      category: "voucher",
      discountValue: "10% Off",
      targetAudience: "All Users",
      expiryDate: "2027-12-31",
    },
    "POST /admin/rewards-deals",
  );
  created.rewardId = reward.id;
  await ok("GET", "/admin/rewards-deals");
  await ok("GET", "/admin/rewards-deals/stats");
  await ok("PATCH", `/admin/rewards-deals/${created.rewardId}`, {
    liveOnFrontend: true,
    status: "Active",
  });
  await ok("DELETE", `/admin/rewards-deals/${created.rewardId}`);
  created.rewardId = null;
}

async function testOperations() {
  const invitations = await ok("GET", "/admin/invitations");
  check("invitations list", isArray(invitations));
  await ok("GET", "/admin/invitations/counts");
  await ok("POST", "/admin/invitations/inv-002/approve");
  await ok("POST", "/admin/invitations/inv-006/cancel");

  const pending = await ok("GET", "/admin/pending-review");
  check("pending review list", isArray(pending));

  await ok("GET", "/admin/audit-log");
  await ok("GET", "/admin/audit-log?action=config-updated");

  const content = await ok("GET", "/admin/content");
  check("content sections", isArray(content) && content.length > 0);
  await ok("GET", "/admin/content/status");
  await ok("GET", "/admin/content/hero");
  await ok("PATCH", "/admin/content/hero", {
    draft: { headline: "Smoke headline" },
  });
  await ok("POST", "/admin/content/hero/publish");
  await ok("POST", "/admin/content/publish-all");

  const locations = await ok("GET", "/admin/locations");
  check("locations hierarchy", isArray(locations?.cities));

  const city = await ok(
    "POST",
    "/admin/locations/cities",
    { name: `Smoke City ${suffix}` },
    "POST /admin/locations/cities",
  );
  created.cityId = city.id;
  await ok("PATCH", `/admin/locations/cities/${created.cityId}`, {
    name: `Smoke City ${suffix} updated`,
  });

  const area = await ok(
    "POST",
    `/admin/locations/cities/${created.cityId}/areas`,
    { name: "Smoke Area" },
    "POST /admin/locations/cities/:id/areas",
  );
  created.areaId = area.id;
  await ok("PATCH", `/admin/locations/areas/${created.areaId}`, {
    name: "Smoke Area updated",
  });
  await ok("DELETE", `/admin/locations/areas/${created.areaId}`);
  created.areaId = null;
  await ok("DELETE", `/admin/locations/cities/${created.cityId}`);
  created.cityId = null;

  const report = await ok("GET", "/admin/reports");
  check("group report stats", Boolean(report?.stats));
  const schedules = await ok("GET", "/admin/reports/schedules");
  check("report schedules", isArray(schedules));

  const schedule = await ok(
    "POST",
    "/admin/reports/schedules",
    { name: `Smoke Report ${suffix}`, type: "groups", frequency: "weekly" },
    "POST /admin/reports/schedules",
  );
  created.scheduleId = schedule.id;
  await ok("PATCH", `/admin/reports/schedules/${created.scheduleId}`, {
    status: "Paused",
  });
  await ok("DELETE", `/admin/reports/schedules/${created.scheduleId}`);
  created.scheduleId = null;

  const settings = await ok("GET", "/admin/settings-reports");
  check("settings & reports payload", Boolean(settings?.stats));
}

async function cleanup() {
  const entries = [
    ["groups", created.groupId],
    ["businesses", created.businessId],
    ["programmes", created.programmeId],
    ["campaigns", created.campaignId],
    ["relationships", created.relationshipId],
    ["rewards-deals", created.rewardId],
  ];
  for (const [resource, id] of entries) {
    if (id) await request("DELETE", `/admin/${resource}/${id}`);
  }
}

async function main() {
  console.log(`Admin API smoke test against ${base}`);
  await login();
  await testAuthGuard();
  await testReads();
  await testConfig();
  await testUsers();
  await testBusinesses();
  await testProgrammesCampaignsRelationships();
  await testGroups();
  await testMembershipsAndRewards();
  await testOperations();
  await cleanup();

  const failed = results.filter((result) => !result.ok);
  console.log(
    `\n${results.length - failed.length}/${results.length} checks passed`,
  );
  if (failed.length > 0) {
    console.log("Failed checks:");
    for (const failure of failed) {
      console.log(`  - ${failure.name}: ${failure.detail}`);
    }
    process.exit(1);
  }
}

await main();
