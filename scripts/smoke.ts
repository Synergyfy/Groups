import { JSDOM } from "jsdom";

const dom = new JSDOM('<!doctype html><html><body></body></html>', {
  url: "http://localhost/",
  pretendToBeVisual: true,
});

const win = dom.window as unknown as Record<string, unknown>;

function defineGlobal(key: string, value: unknown) {
  if (value === undefined) return;
  try {
    Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
  } catch {
    /* some runtimes expose read-only globals; skip them */
  }
}

const globalKeys = [
  "navigator",
  "location",
  "history",
  "HTMLElement",
  "HTMLDivElement",
  "HTMLInputElement",
  "HTMLSelectElement",
  "HTMLButtonElement",
  "Element",
  "Node",
  "SVGElement",
  "Event",
  "CustomEvent",
  "MouseEvent",
  "KeyboardEvent",
  "FocusEvent",
  "getComputedStyle",
  "requestAnimationFrame",
  "cancelAnimationFrame",
  "localStorage",
  "sessionStorage",
  "MutationObserver",
  "DOMParser",
];

for (const key of globalKeys) defineGlobal(key, win[key]);
defineGlobal("window", win);
defineGlobal("document", dom.window.document);

if (typeof win.matchMedia !== "function") {
  win.matchMedia = () =>
    ({
      matches: false,
      media: "",
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList;
}

const { routes } = await import("../src/app/router");
const { RouterProvider, createMemoryRouter } = await import("react-router-dom");
const { AppStoreProvider } = await import("../src/store/AppStore");
const { default: JourneyProvider } = await import("../src/journey/JourneyProvider");
const { createRoot } = await import("react-dom/client");
const { createElement } = await import("react");

interface SmokeCase {
  path: string;
  expect: string;
  reject?: string;
  open?: boolean;
  click?: string;
}

const cases: SmokeCase[] = [
  { path: "/", expect: "What is Groups & Circles?", reject: "Demo data" },
  { path: "/business/journey", expect: "Your journey" },
  { path: "/business/overview", expect: "", reject: "Tour this screen" },
  { path: "/business/overview", expect: "Connect with businesses and members through groups." },
  { path: "/business/groups", expect: "Group Circle" },
  { path: "/business/groups", expect: "Connect with businesses and members through groups." },
  { path: "/business/groups", expect: "The business does not need to create a group to use Group Circle." },
  { path: "/business/groups", expect: "The business is already part of" },
  { path: "/business/groups", expect: "Its automatically assigned Network Group" },
  { path: "/business/groups", expect: "Create a Group", reject: "Your group figures" },
  { path: "/business/groups", expect: "Automatic Network Group" },
  { path: "/business/groups", expect: "3 more members needed" },
  { path: "/business/groups/mine", expect: "02 — My Groups" },
  { path: "/business/groups/mine", expect: "My Created Groups" },
  { path: "/business/groups/mine", expect: "Joined Groups" },
  { path: "/business/groups/mine", expect: "Groups the business created.", reject: "View details" },
  { path: "/business/groups/mine/automatic", expect: "Created by: System" },
  { path: "/business/groups/mine/automatic", expect: "My Groups" },
  { path: "/business/groups/mine/created", expect: "Created by: Smith Business" },
  { path: "/business/groups/mine/joined", expect: "View details" },
  { path: "/business/groups/mine/nope", expect: "02 — My Groups" },
  { path: "/business/groups/grp-smith-marketing", expect: "online now" },
  { path: "/business/groups/mine", expect: "The group assigned automatically by the system." },
  { path: "/business/groups/mine", expect: "A business can belong to multiple groups", reject: "Demo data" },
  { path: "/business/groups/network", expect: "03 — Automatic Network Group" },
  { path: "/business/groups/network", expect: "Created by" },
  { path: "/business/groups/network", expect: "Automatic Network" },
  { path: "/business/groups/network", expect: "9 / 12" },
  { path: "/business/groups/network", expect: "3 more members needed" },
  { path: "/business/groups/explore", expect: "05 — Explore Groups" },
  { path: "/business/groups/explore", expect: "eligible groups" },
  { path: "/business/groups/explore", expect: "How joining works" },
  { path: "/business/groups/create", expect: "06–08 — Create Group Wizard" },
  { path: "/business/groups/create", expect: "Free group or paid group?" },
  { path: "/business/groups/create?step=1", expect: "Choose a group type" },
  { path: "/business/groups/create?step=1", expect: "Only types enabled for creation" },
  // Wizard steps are routed via ?step=
  { path: "/business/groups/create?step=2", expect: "Group ≠ Location" },
  { path: "/business/groups/create?step=3", expect: "Membership rules" },
  { path: "/business/groups/create?step=3", expect: "Interaction level" },
  { path: "/business/groups/create?step=3", expect: "set by administrators" },
  { path: "/business/groups/create?step=4", expect: "Review and create" },
  { path: "/business/groups/create?step=4", expect: "Birmingham City Centre, Birmingham" },
  { path: "/business/groups/create/success", expect: "09 — Group Created" },
  { path: "/business/groups/create/success", expect: "Invite members" },
  { path: "/business/groups/g-1", expect: "04 — Group Details" },
  { path: "/business/groups/g-1/members", expect: "11 — Group Members" },
  { path: "/business/groups/g-1/activity", expect: "12 — Group Activity" },
  { path: "/business/groups/g-1/invitations", expect: "10 — Invite Members" },
  { path: "/business/groups/g-1/settings", expect: "13 — Group Settings" },
  { path: "/business/groups/grp-smith-marketing", expect: "04 — Group Details" },
  { path: "/business/groups/grp-smith-marketing/members", expect: "11 — Group Members" },
  { path: "/business/groups/grp-smith-marketing/activity", expect: "12 — Group Activity" },
  { path: "/business/groups/grp-smith-marketing/invitations", expect: "10 — Invite Members" },
  { path: "/business/groups/grp-smith-marketing/settings", expect: "13 — Group Settings" },
  { path: "/business/groups/grp-uk-business-exchange/settings", expect: "read-only for you" },
  { path: "/business/groups/grp-net-024", expect: "04 — Group Details" },
  { path: "/business/invitations", expect: "Group Invitations (Inbox)" },
  // Invite → review → confirm step
  { path: "/business/invitations/inv-001/review", expect: "Review before you join" },
  { path: "/business/invitations/inv-001/review", expect: "What it costs" },
  { path: "/business/invitations/inv-001/review", expect: "£45 monthly per member" },
  { path: "/business/invitations/inv-001/review", expect: "What happens when you confirm" },
  { path: "/business/invitations/inv-001/review", expect: "Yes, join this group" },
  { path: "/business/invitations/inv-001/review", expect: "Tick the box above to enable the join button." },
  { path: "/business/invitations/inv-001/review", expect: "Urban Events" },
  { path: "/business/invitations/nope/review", expect: "Invitation not found" },
  { path: "/business/invitations/inv-cir-001/review", expect: "This invitation is for a circle" },
  { path: "/participant/invitations/inv-003/review", expect: "Review before you join" },
  { path: "/participant/invitations/inv-003/review", expect: "Free to join" },
  { path: "/participant/invitations/inv-003/review", expect: "Yes, join this group" },
  { path: "/business/network/lists", expect: "My Network — Lists" },
  { path: "/business/network/lists", expect: "How lists, circles and groups relate" },
  { path: "/business/network/lists", expect: "Add Contact" },
  { path: "/business/network/lists", expect: "London Trade Partners", reject: "Intake source:" },
  { path: "/business/network/lists", expect: "Intake source:", open: true },
  { path: "/business/network/lists", expect: "Build a circle from this list", open: true },
  { path: "/business/circles", expect: "Group Circles" },
  { path: "/business/circles", expect: "Smith Business Ltd" },
  { path: "/business/circles/create", expect: "Create Group Circle" },
  { path: "/business/circles/create", expect: "Define Type" },
  { path: "/business/circles/c-1", expect: "Group Circle Workspace" },
  { path: "/business/circles/c-1", expect: "is not in the demo store" },
  { path: "/business/community", expect: "National Community" },
  { path: "/business/community", expect: "What this is not" },
  { path: "/business/location", expect: "My Location" },
  { path: "/business/location", expect: "Configured location hierarchy" },
  { path: "/business/campaigns", expect: "Campaigns" },
  { path: "/business/campaigns", expect: "Group ≠ Campaign" },
  { path: "/business/rewards", expect: "Rewards" },
  { path: "/business/rewards", expect: "Campaign → Contribution → Configured reward" },
  { path: "/business/settings", expect: "Account Settings" },
  { path: "/admin/groups", expect: "14 — Admin Groups Dashboard" },
  { path: "/admin/groups", expect: "Needs attention" },
  { path: "/admin/groups/all", expect: "15 — Admin Group List" },
  { path: "/admin/groups/all", expect: "Showing" },
  { path: "/admin/groups/grp-smith-marketing", expect: "Admin Group Details" },
  { path: "/admin/groups/grp-smith-marketing", expect: "Latest activity" },
  { path: "/admin/groups/grp-net-024", expect: "Membership toward the automatic threshold" },
  { path: "/admin/groups/grp-smith-marketing/members", expect: "Admin Group Members" },
  { path: "/admin/groups/g-1/activity", expect: "18 — Admin Group Activity" },
  { path: "/admin/groups/g-1/relationships", expect: "19 — Admin Group Relationships" },
  { path: "/admin/config/automatic", expect: "20 — Automatic Group Rules" },
  { path: "/admin/config/types", expect: "21 — Group Type Configuration" },
  { path: "/admin/locations", expect: "Location Relationships" },
  { path: "/admin/locations", expect: "Groups without a location" },
  { path: "/admin/partner-groups", expect: "Partner Groups" },
  { path: "/admin/partner-groups", expect: "Financial rules" },
  { path: "/admin/mandatory-circles", expect: "Mandatory Circles" },
  { path: "/admin/mandatory-circles", expect: "Rules to confirm" },
  { path: "/admin/invitations", expect: "Invitations & Requests" },
  { path: "/admin/invitations", expect: "Network invitation register" },
  { path: "/admin/reports", expect: "22 — Group Reports & Statistics" },
  { path: "/admin/reports", expect: "Origin distribution" },
  { path: "/admin/groups/grp-net-024/members", expect: "Member register" },
  { path: "/admin/groups/grp-net-024/activity", expect: "Activity log" },
  { path: "/admin/groups/grp-smith-marketing/relationships", expect: "Location hierarchy" },
  { path: "/admin/config/automatic", expect: "Live outcome preview" },
  { path: "/admin/config/automatic", expect: "", reject: "Tour this screen" },
  { path: "/admin/types-not-a-route", expect: "Page not found" },
  { path: "/admin/config/types", expect: "Stage labels" },
  { path: "/admin/does-not-exist", expect: "Page not found" },

  // Spec 21/28 — owner vs member tab shell
  {
    path: "/business/groups/grp-smith-marketing",
    expect: "You own this group",
    reject: "owner-only",
  },
  { path: "/business/groups/grp-smith-marketing", expect: "Invite members", open: true },
  { path: "/business/groups/grp-smith-marketing", expect: "Account manager", open: true },
  // Group details sections start collapsed: headers visible, bodies hidden
  { path: "/business/groups/grp-smith-marketing", expect: "At a glance", reject: "Account manager" },
  {
    path: "/business/groups/grp-smith-marketing",
    expect: "04 — Group Details",
    reject: "Related Opportunities / Campaigns",
  },
  {
    path: "/business/groups/grp-birmingham-biz",
    expect: "Invitation",
    reject: "are owner-only",
  },
  { path: "/business/groups/grp-birmingham-biz", expect: "Settings" },
  {
    path: "/business/groups/grp-birmingham-biz",
    click: "Invitation",
    expect: "Owner only",
  },
  {
    path: "/business/groups/grp-birmingham-biz",
    click: "Settings",
    expect: "belongs to the group owner",
  },
  { path: "/business/groups/grp-birmingham-biz", expect: "You are a member", reject: "Invite members" },
  { path: "/business/groups/grp-birmingham-biz/settings", expect: "read-only for you" },

  // Spec 23 — member roster join dates + automatic group member view
  { path: "/business/groups/grp-smith-marketing/members", expect: "Joined" },
  {
    path: "/business/groups/grp-net-024/members",
    expect: "membership is maintained by the system",
  },

  // Spec 24 — relative-time activity feed
  { path: "/business/groups/grp-smith-marketing/activity", expect: "ago ·" },

  // Spec 25 — multi-select, review step and invitation status list
  { path: "/business/groups/grp-smith-marketing/invitations", expect: "Review invitations (0)" },
  {
    path: "/business/groups/grp-smith-marketing/invitations",
    expect: "Invite from the business directory",
    reject: "Review step",
  },
  { path: "/business/groups/grp-smith-marketing/invitations", expect: "Invitation status" },
  { path: "/business/groups/grp-smith-marketing/invitations", expect: "Cancel" },
  { path: "/business/groups/grp-smith-marketing/invitations", expect: "multi-select" },

  // Spec 26 — settings visibility + danger zone guarded by Admin permissions
  { path: "/business/groups/grp-smith-marketing/settings", expect: "Danger zone" },
  { path: "/business/groups/grp-smith-marketing/settings", expect: "permissions configured by Admin" },
  { path: "/business/groups/grp-smith-marketing/settings", expect: "Visibility" },

  // Spec 29 — explore filters: local area + membership
  { path: "/business/groups/explore", expect: "All local areas" },
  { path: "/business/groups/explore", expect: "Any membership" },

  // Spec 35 — group created confirmation
  { path: "/business/groups/create/success", expect: "You are now the Group Owner" },
  { path: "/business/groups/create/success", expect: "Your group has been created." },

  // Business Group Circle — simple user flow
  // §2 My Groups: three sections instead of tabs
  { path: "/business/groups/mine", expect: "Automatic Network Group" },
  { path: "/business/groups/mine", expect: "My Created Groups", reject: "Created by me" },
  { path: "/business/groups/mine", expect: "Joined Groups" },
  // §6/§7 Group details: relationship-driven primary action + sections
  {
    path: "/business/groups/grp-smith-marketing",
    expect: "Manage Group",
    reject: "Participate",
  },
  {
    path: "/business/groups/grp-birmingham-biz",
    expect: "Participate",
    reject: "Manage Group",
  },
  { path: "/business/groups/grp-uk-b2b-exchange", expect: "Request to join" },
  { path: "/business/groups/grp-autumn-expo", expect: "Invitation waiting" },
  { path: "/business/groups/grp-smith-marketing", expect: "Related Opportunities / Campaigns", open: true },
  { path: "/business/groups/grp-smith-marketing/members", expect: "Back to Group" },
  // §3 automatic network group
  { path: "/business/groups/network", expect: "Related Opportunities / Campaigns" },
  { path: "/business/groups/network", expect: "Required group size" },
  // §7 owner member management
  { path: "/business/groups/grp-smith-marketing/members", expect: "Remove" },
  {
    path: "/business/groups/grp-birmingham-biz/members",
    expect: "Member (you)",
    reject: "Remove",
  },
  // §11 owner shortcuts from settings
  { path: "/business/groups/grp-smith-marketing/settings", expect: "Manage members" },
  { path: "/business/groups/grp-smith-marketing/settings", expect: "Manage invitations" },
  // §12 invitations inbox — pending invitation: View Group → Accept / Decline
  { path: "/business/invitations", expect: "View group" },
];

const container = dom.window.document.createElement("div");
dom.window.document.body.appendChild(container);

let failures = 0;

for (const smokeCase of cases) {
  const smokeRouter = createMemoryRouter(routes, { initialEntries: [smokeCase.path] });
  const root = createRoot(container);
  root.render(
    createElement(
      AppStoreProvider,
      null,
      createElement(
        JourneyProvider,
        null,
        createElement(RouterProvider, { router: smokeRouter })
      )
    )
  );
  let text = "";
  let clickDone = false;
  for (let attempt = 0; attempt < 6; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, attempt === 0 ? 400 : 300));
    if (smokeCase.open) {
      const collapsed = container.querySelectorAll(
        'button[data-collapsible="true"][aria-expanded="false"]'
      );
      if (collapsed.length > 0) {
        collapsed.forEach((button) => button.click());
        await new Promise((resolve) => setTimeout(resolve, 150));
      }
    }
    if (smokeCase.click && !clickDone) {
      const targets = [...container.querySelectorAll("button")];
      const target = targets.find((button) =>
        (button.textContent ?? "").includes(smokeCase.click ?? "")
      );
      if (target) {
        target.click();
        clickDone = true;
        await new Promise((resolve) => setTimeout(resolve, 150));
      }
    }
    text = container.textContent ?? "";
    if (text.includes(smokeCase.expect)) break;
  }
  const passed =
    text.includes(smokeCase.expect) &&
    (!smokeCase.reject || !text.includes(smokeCase.reject));
  if (!passed) {
    failures += 1;
    console.log(`FAIL  ${smokeCase.path}`);
    console.log(
      smokeCase.reject && text.includes(smokeCase.reject)
        ? `      rejected text present: ${smokeCase.reject}`
        : `      expected: ${smokeCase.expect}`
    );
    console.log(`      got:      ${text.replace(/\s+/g, " ").slice(0, 220)}`);
  } else {
    console.log(`PASS  ${smokeCase.path}`);
  }
  root.unmount();
  await new Promise((resolve) => setTimeout(resolve, 20));
}

console.log(`\n${cases.length - failures}/${cases.length} routes rendered successfully`);
process.exit(failures > 0 ? 1 : 0);
