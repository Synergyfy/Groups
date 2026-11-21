#!/usr/bin/env node
/**
 * End-to-end smoke test for the admin console API.
 *
 * Creates its own fixtures through the API, exercises every admin page's
 * endpoint, and cleans up afterwards. It does not depend on demo data.
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
const created = {};

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
  check("overview metrics present", Boolean(overview?.metrics));
  check("overview charts present", isArray(overview?.groupsByType));

  await ok("GET", "/admin/users");
  await ok("GET", "/admin/users/registrations");

  await ok("GET", "/admin/groups");
  const dashboard = await ok("GET", "/admin/groups/dashboard");
  check("groups dashboard stats", Boolean(dashboard?.stats));
  const hub = await ok("GET", "/admin/groups/hub");
  check("groups hub payload", Boolean(hub?.stats) && isArray(hub?.groups));

  const filtered = await ok("GET", "/admin/groups?status=Active&query=smoke");
  check("group filters apply", isArray(filtered));
  await ok("GET", "/admin/circles");

  const payments = await ok("GET", "/admin/payments/overview");
  check(
    "payments overview has summary and recent rows",
    Boolean(payments?.summary) && isArray(payments?.recent),
  );
  const charges = await ok("GET", "/admin/payments/charges?limit=5");
  check("payments ledger lists charges", isArray(charges?.data));
}

async function testConfig() {
  const config = await ok("GET", "/admin/config");
  check("config payload", Boolean(config?.automaticGrouping));

  await ok("GET", "/admin/config/group-rules");
  await ok("GET", "/admin/settings");

  const rejected = await request("PATCH", "/admin/config", { nope: true });
  check(
    "unknown config fields rejected",
    rejected.status === 400,
    `status ${rejected.status}`,
  );
}

async function testGroups() {
  const group = await ok(
    "POST",
    "/admin/groups",
    {
      name: `Smoke Paid Group ${suffix}`,
      type: "B2B",
      source: "user-created",
      purpose: "Created by the admin smoke test",
      ownerName: `Smoke Business ${suffix}`,
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
    status: "Pending Review",
    requiredSize: 6,
  });
  await ok("GET", `/admin/groups/${created.groupId}`);

  const member = await ok(
    "POST",
    `/admin/groups/${created.groupId}/members`,
    {
      memberId: `smoke-member-${suffix}`,
      fullName: "Smoke Member",
      businessName: "Smoke Member Ltd",
      role: "core",
      tier: "Bronze",
    },
    "POST /admin/groups/:id/members",
  );
  check(
    "member starts with a real pending contribution",
    member?.contributionStatus === "pending",
    JSON.stringify(member),
  );

  const members = await ok(
    "GET",
    `/admin/groups/${created.groupId}/members`,
  );
  check("group member added", isArray(members) && members.length === 1);

  await ok(
    "PATCH",
    `/admin/groups/${created.groupId}/members/smoke-member-${suffix}/contribution`,
    { status: "paid" },
    "PATCH /admin/groups/:id/members/:memberId/contribution",
  );
  const contribution = await ok(
    "GET",
    `/admin/groups/${created.groupId}/contribution`,
  );
  check("contribution ledger uses stored status", contribution?.collected === 25);
  check("contribution has no fabricated outstanding", contribution?.outstanding === 0);

  await ok("GET", `/admin/groups/${created.groupId}/activity`);
  await ok("GET", `/admin/groups/${created.groupId}/circles`);
  await ok("GET", `/admin/groups/${created.groupId}/invitations`);

  await ok("POST", `/admin/groups/${created.groupId}/approve`);
  await ok("POST", `/admin/groups/${created.groupId}/suspend`);
  await ok("POST", `/admin/groups/${created.groupId}/close`);

  // Moderation queue: reject one pending group and approve another.
  const rejectGroup = await ok(
    "POST",
    "/admin/groups",
    {
      name: `Smoke Reject Group ${suffix}`,
      type: "Marketing",
      source: "user-created",
      ownerName: `Smoke Business ${suffix}`,
      status: "Pending Review",
    },
    "POST /admin/groups (reject fixture)",
  );
  created.rejectGroupId = rejectGroup.id;
  const rejected = await ok(
    "POST",
    `/admin/groups/${created.rejectGroupId}/close`,
  );
  check("reject closes group", rejected?.status === "Closed");

  const approveGroup = await ok(
    "POST",
    "/admin/groups",
    {
      name: `Smoke Approve Group ${suffix}`,
      type: "Marketing",
      source: "user-created",
      ownerName: `Smoke Business ${suffix}`,
      status: "Pending Review",
    },
    "POST /admin/groups (approve fixture)",
  );
  created.approveGroupId = approveGroup.id;
  const approved = await ok(
    "POST",
    `/admin/groups/${created.approveGroupId}/approve`,
  );
  check("approve activates group", approved?.status === "Active");

  await ok("DELETE", `/admin/groups/${created.groupId}/members/smoke-member-${suffix}`);
  await ok("DELETE", `/admin/groups/${created.groupId}`);
  created.groupId = null;
}

async function testMembershipsAndRewards() {
  // A Bronze Standard plan may already exist in a working environment. Reuse
  // it (and restore its subscriber count afterwards) instead of failing the
  // whole smoke run on the unique name/variant constraint.
  const existingPlans = await ok("GET", "/admin/plans");
  let plan = (existingPlans ?? []).find(
    (entry) => entry.name === "Bronze" && entry.variant === "Standard",
  );
  let originalSubscriberCount = null;

  if (plan) {
    originalSubscriberCount = plan.subscriberCount ?? 0;
  } else {
    const createdPlans = await ok(
      "POST",
      "/admin/plans",
      {
        name: `Smoke Bronze ${suffix}`,
        standard: {
          priceMonthly: 19,
          groupQuota: 2,
          circleQuota: 1,
          features: ["Smoke fixture"],
        },
        pro: {
          priceMonthly: 29,
          groupQuota: 3,
          circleQuota: 2,
          features: ["Smoke fixture"],
        },
        proPlus: {
          priceMonthly: 39,
          groupQuota: 4,
          circleQuota: 3,
          features: ["Smoke fixture"],
        },
      },
      "POST /admin/plans",
    );
    created.planIds = (createdPlans ?? []).map((entry) => entry.id);
    plan = (createdPlans ?? []).find((entry) => entry.variant === "Standard");
  }

  const stats = await ok("GET", "/admin/plans/stats");
  check("plan stats present", typeof stats?.totalPlans === "number");
  await ok("PATCH", `/admin/plans/${plan.id}`, {
    subscriberCount: 4,
  });
  if (originalSubscriberCount !== null) {
    created.planRestore = {
      id: plan.id,
      subscriberCount: originalSubscriberCount,
    };
  }

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
  const rewardStats = await ok("GET", "/admin/rewards-deals/stats");
  check("reward stats present", typeof rewardStats?.totalDeals === "number");
  await ok("PATCH", `/admin/rewards-deals/${created.rewardId}`, {
    liveOnFrontend: true,
    status: "Active",
  });
}

async function testOperations() {
  await ok("GET", "/admin/invitations");
  await ok("GET", "/admin/invitations/counts");

  const settings = await ok("GET", "/admin/settings-reports");
  check("settings & reports payload", Boolean(settings?.stats));
  check(
    "completeness statuses are computed",
    isArray(settings?.completeness) &&
      settings.completeness.every(
        (rule) =>
          typeof rule.status === "string" && rule.status.length > 0,
      ),
  );
}

async function cleanup() {
  const entries = [
    ["groups", created.groupId],
    ["groups", created.rejectGroupId],
    ["groups", created.approveGroupId],
    ["rewards-deals", created.rewardId],
  ];
  for (const [resource, id] of entries) {
    if (id) await request("DELETE", `/admin/${resource}/${id}`);
  }
  for (const id of created.planIds ?? []) {
    await request("DELETE", `/admin/plans/${id}`);
  }
  if (created.planRestore) {
    await request("PATCH", `/admin/plans/${created.planRestore.id}`, {
      subscriberCount: created.planRestore.subscriberCount,
    });
  }
}

async function main() {
  console.log(`Admin API smoke test against ${base}`);
  await login();
  await testAuthGuard();
  await testReads();
  await testConfig();
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
