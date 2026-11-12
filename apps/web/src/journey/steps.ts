import type { Group } from "../domain/types";
import { CURRENT_BUSINESS } from "../data/businessData";
import { DEFAULT_ADMIN_CONFIG } from "../data/adminData";
import type { AppState } from "../store/reducer";

export type JourneyScope = "business" | "admin";

export interface StepContext {
  state: AppState;
  visited: string[];
}

export interface JourneyStep {
  id: string;
  scope: JourneyScope;
  chapter: string;
  title: string;
  instruction: string;
  why: string;
  how: string[];
  route: string;
  cta: { label: string; to: string };
  detect?: (ctx: StepContext) => boolean;
}

const ACTOR = CURRENT_BUSINESS.id;

function hasVisited(ctx: StepContext, path: string): boolean {
  return ctx.visited.includes(path);
}

export function networkGroupOf(state: AppState): Group | undefined {
  return state.groups.find(
    (group) =>
      group.source === "automatic" &&
      group.type === "Network" &&
      group.memberIds.includes(ACTOR)
  );
}

export const BUSINESS_STEPS: JourneyStep[] = [
  {
    id: "community",
    scope: "business",
    chapter: "Chapter 1 · Where you stand",
    title: "Confirm your National Community membership",
    instruction: "Open National Community and read your membership card.",
    why: "Everything else — location, network groups, campaigns — hangs off this membership. It comes with registration; there is nothing to apply for.",
    how: [
      "Open National Community from the sidebar.",
      "Check the status badge reads Member and note your member-since date.",
      "Read “What this is not” so you never confuse it with your city or your network group.",
    ],
    route: "/business/community",
    cta: { label: "Open National Community", to: "/business/community" },
    detect: (ctx) =>
      CURRENT_BUSINESS.nationalCommunity.status === "Member" && hasVisited(ctx, "/business/community"),
  },
  {
    id: "location",
    scope: "business",
    chapter: "Chapter 1 · Where you stand",
    title: "Set the place your business trades from",
    instruction: "Open My Location and check your city and local area.",
    why: "Your city and local area decide which network group the system allocates you to, and which local groups you can see. Location is a profile property, not a group membership.",
    how: [
      "Open My Location.",
      "Confirm the city and local area in the hierarchy — yours are highlighted.",
      "Note the groups pinned to your local area, then read Location vs membership.",
    ],
    route: "/business/location",
    cta: { label: "Open My Location", to: "/business/location" },
    detect: (ctx) =>
      Boolean(CURRENT_BUSINESS.city && CURRENT_BUSINESS.localArea) &&
      hasVisited(ctx, "/business/location"),
  },
  {
    id: "network",
    scope: "business",
    chapter: "Chapter 2 · The machine working for you",
    title: "Meet your automatic network group",
    instruction: "Open your network group and read who created it and how far it has grown.",
    why: "The system created this one — you never asked for it and you cannot delete it. It keeps growing until it hits the configured threshold, then the system splits it.",
    how: [
      "Open the Network item in the sidebar (screen 03).",
      "Read Created by: System, Type: Automatic Network and Owner: System.",
      "Watch the progress bar: current / threshold and how many more members are needed.",
    ],
    route: "/business/groups/network",
    cta: { label: "Open network group", to: "/business/groups/network" },
    detect: (ctx) => Boolean(networkGroupOf(ctx.state)) && hasVisited(ctx, "/business/groups/network"),
  },
  {
    id: "explore",
    scope: "business",
    chapter: "Chapter 3 · Your own choices",
    title: "See what else exists",
    instruction: "Open Explore Groups and filter down to what matters to you.",
    why: "Explore shows every group you are not in yet, with its access rules — so you know before clicking whether joining is instant, needs approval, or needs an invitation.",
    how: [
      "Open Explore Groups (screen 05).",
      "Filter by type, access, status and city.",
      "Read “How joining works” before you press anything.",
    ],
    route: "/business/groups/explore",
    cta: { label: "Explore groups", to: "/business/groups/explore" },
    detect: (ctx) => hasVisited(ctx, "/business/groups/explore"),
  },
  {
    id: "join",
    scope: "business",
    chapter: "Chapter 3 · Your own choices",
    title: "Join a group that matters to you",
    instruction: "Join an open group or send a request to a restricted one.",
    why: "Joining moves you from watching the network to participating in it. Open groups admit you instantly; request groups wait for the owner's approval.",
    how: [
      "On Explore, press Join group or Request to join.",
      "Watch the button change to “Request pending” when approval is needed.",
      "Find the new group waiting under My Groups.",
    ],
    route: "/business/groups/explore",
    cta: { label: "Find a group to join", to: "/business/groups/explore" },
    detect: (ctx) =>
      ctx.state.groups.filter((group) => group.memberIds.includes(ACTOR)).length > 1,
  },
  {
    id: "create",
    scope: "business",
    chapter: "Chapter 3 · Your own choices",
    title: "Lead: create a group of your own",
    instruction: "Run the five-step wizard and create your first group.",
    why: "Owned groups are where you set the rules — access, stage and target size — and they are the only groups you can invite into freely.",
    how: [
      "Open Create Group and choose free or paid, then pick any type your administrators allow (screen 06).",
      "Add name, purpose and location (screen 07).",
      "Choose the access rules, review, then create (screen 08 → 09).",
    ],
    route: "/business/groups/create",
    cta: { label: "Start the wizard", to: "/business/groups/create" },
    detect: (ctx) => ctx.state.groups.some((group) => group.ownerId === ACTOR),
  },
  {
    id: "invite",
    scope: "business",
    chapter: "Chapter 4 · Make it real",
    title: "Fill your group",
    instruction: "Open one of your groups and invite members.",
    why: "A group with one member cannot achieve anything. Inviting is how your group starts producing results for you.",
    how: [
      "Open My Groups and pick a group you own.",
      "Open its Invitations tab (screen 10).",
      "Invite by email or from the directory, then track replies in the invitation status list.",
    ],
    route: "/business/groups/mine",
    cta: { label: "Open My Groups", to: "/business/groups/mine" },
    detect: (ctx) =>
      ctx.state.invitations.some(
        (invitation) => invitation.kind === "invite" && invitation.invitedById === ACTOR
      ),
  },
  {
    id: "inbox",
    scope: "business",
    chapter: "Chapter 4 · Make it real",
    title: "Answer what is coming the other way",
    instruction: "Open Invitations and clear anything waiting on you.",
    why: "Requests and invites land in your inbox. Ignoring them stalls other people's groups — and leaves your own requests hanging.",
    how: [
      "Open Invitations in the sidebar.",
      "Approve or reject incoming requests in the Incoming tab.",
      "Check Outgoing and My requests for anything you sent.",
    ],
    route: "/business/invitations",
    cta: { label: "Open invitations inbox", to: "/business/invitations" },
    detect: (ctx) => hasVisited(ctx, "/business/invitations"),
  },
  {
    id: "members",
    scope: "business",
    chapter: "Chapter 4 · Make it real",
    title: "Run the group: members and activity",
    instruction: "Open a group you own and review its members and timeline.",
    why: "Membership and activity prove the group is alive — and show you who is contributing, who joined recently and what needs a decision.",
    how: [
      "Open a group you own → Members (screen 11).",
      "Review roles, join dates and any pending requests.",
      "Read Activity (screen 12) for the full timeline.",
    ],
    route: "/business/groups/mine",
    cta: { label: "Open My Groups", to: "/business/groups/mine" },
    detect: (ctx) =>
      ctx.state.groups.some((group) => group.ownerId === ACTOR && group.memberIds.length > 1),
  },
  {
    id: "grow",
    scope: "business",
    chapter: "Chapter 5 · Let the system work",
    title: "Grow the network group to its threshold",
    instruction: "Push your automatic network group to its configured threshold.",
    why: "At the threshold the system splits the group automatically and starts the next one — that is the entire point of the automatic network.",
    how: [
      "Open your network group again.",
      "Compare current / threshold with the “N more members needed” line.",
      "Invite until the bar turns green — the note reminds you the threshold is admin-configured (6, 12, 18 or 24).",
    ],
    route: "/business/groups/network",
    cta: { label: "Check my progress", to: "/business/groups/network" },
    detect: (ctx) => {
      const group = networkGroupOf(ctx.state);
      return Boolean(
        group &&
          group.memberIds.length >= ctx.state.adminConfig.automaticGrouping.threshold
      );
    },
  },
  {
    id: "lists",
    scope: "business",
    chapter: "Chapter 5 · Let the system work",
    title: "Feed the machine: build your network lists",
    instruction: "Open My Network Lists and see where members come from.",
    why: "Lists — manual contacts, QR plaque scans, affiliate sign-ups and the Traffic & Leads Directory — are the raw material circles are built from.",
    how: [
      "Open My Network Lists in the sidebar.",
      "Look at type (B2B / B2C), geography and source for each list.",
      "Remember: a list is an intake layer, not a group.",
    ],
    route: "/business/network/lists",
    cta: { label: "Open my lists", to: "/business/network/lists" },
    detect: (ctx) => hasVisited(ctx, "/business/network/lists"),
  },
  {
    id: "circle",
    scope: "business",
    chapter: "Chapter 5 · Let the system work",
    title: "Bring people together in a circle",
    instruction: "Open Circle and work inside one.",
    why: "A circle is where collaboration actually happens — members, messages and activity organised around one goal, built from your lists.",
    how: [
      "Open Circle from the menu.",
      "Optionally create one: Select Lists → Define Type → Configure.",
      "Work in the workspace: members, activity, filters and growth actions.",
    ],
    route: "/business/circles",
    cta: { label: "Open circles", to: "/business/circles" },
    detect: (ctx) => ctx.state.circles.some((circle) => circle.memberIds.length > 0),
  },
];

export const ADMIN_STEPS: JourneyStep[] = [
  {
    id: "admin-overview",
    scope: "admin",
    chapter: "Chapter A · See everything",
    title: "Read the national picture first",
    instruction: "Open the admin dashboard and read the summary counts.",
    why: "You cannot configure what you cannot see. The dashboard tells you group counts, members and what needs attention before you change anything.",
    how: [
      "Open Group Overview (screen 14).",
      "Read the headline counts and the breakdowns.",
      "Note anything flagged for attention before making changes.",
    ],
    route: "/admin/groups",
    cta: { label: "Open admin dashboard", to: "/admin/groups" },
    detect: (ctx) => hasVisited(ctx, "/admin/groups"),
  },
  {
    id: "admin-all",
    scope: "admin",
    chapter: "Chapter A · See everything",
    title: "Find any group fast",
    instruction: "Open the central register and apply a filter.",
    why: "The register is the single source of truth for every group — type, city, stage, owner, programme and source.",
    how: [
      "Open All Groups (screen 15).",
      "Filter by type, city, stage, owner, programme or source.",
      "Search by name to jump straight to one group.",
    ],
    route: "/admin/groups/all",
    cta: { label: "Open group register", to: "/admin/groups/all" },
    detect: (ctx) => hasVisited(ctx, "/admin/groups/all"),
  },
  {
    id: "admin-detail",
    scope: "admin",
    chapter: "Chapter A · See everything",
    title: "Inspect one group end to end",
    instruction: "Open any group from the register.",
    why: "Detail screens separate what a group is (type, stage, status) from what it touches (location, campaigns, programmes) so you never confuse the relationships.",
    how: [
      "Open a group from the register (screen 16).",
      "Read details, then members (17), activity (18) and relationships (19).",
      "Confirm ownership before touching anything.",
    ],
    route: "/admin/groups/grp-smith-marketing",
    cta: { label: "Open a group", to: "/admin/groups/grp-smith-marketing" },
    detect: (ctx) =>
      ctx.visited.some(
        (path) => /^\/admin\/groups\/[^/]+$/.test(path) && !path.endsWith("/all")
      ),
  },
  {
    id: "admin-invites",
    scope: "admin",
    chapter: "Chapter A · See everything",
    title: "Clear the platform inbox",
    instruction: "Open Invitations & Requests and triage what is pending.",
    why: "Platform-wide invitations and requests pile up here; clearing them keeps business users moving.",
    how: [
      "Open Invitations & Requests.",
      "Review pending invites and join requests.",
      "Act on them or leave a note for the group owner.",
    ],
    route: "/admin/invitations",
    cta: { label: "Open admin inbox", to: "/admin/invitations" },
    detect: (ctx) => hasVisited(ctx, "/admin/invitations"),
  },
  {
    id: "admin-auto",
    scope: "admin",
    chapter: "Chapter B · Set the rules",
    title: "Configure automatic grouping",
    instruction: "Open Automatic Group Rules and change the threshold or method.",
    why: "This is the one switch that changes every user's network group: when it splits, how it splits and what it splits by. It is never hard-coded in a screen.",
    how: [
      "Open Automatic Group Rules (screen 20).",
      "Set threshold (6, 12, 18 or 24), method, scope and combining.",
      "Watch the business network screen recompute — 9 / 12 becomes 9 / 6, for example.",
    ],
    route: "/admin/config/automatic",
    cta: { label: "Open automatic rules", to: "/admin/config/automatic" },
    detect: (ctx) =>
      hasVisited(ctx, "/admin/config/automatic") ||
      JSON.stringify(ctx.state.adminConfig) !== JSON.stringify(DEFAULT_ADMIN_CONFIG),
  },
  {
    id: "admin-types",
    scope: "admin",
    chapter: "Chapter B · Set the rules",
    title: "Decide which group types exist",
    instruction: "Open Group Type Configuration and toggle a type.",
    why: "Types are the vocabulary of the whole platform: if a type is disabled or creation is off, it disappears from the business create wizard immediately.",
    how: [
      "Open Group Type Configuration (screen 21).",
      "Toggle enabled, allow-create or allow-join for a type.",
      "Check the business wizard — the type list changes with your setting.",
    ],
    route: "/admin/config/types",
    cta: { label: "Open type configuration", to: "/admin/config/types" },
    detect: (ctx) =>
      hasVisited(ctx, "/admin/config/types") ||
      JSON.stringify(ctx.state.adminConfig) !== JSON.stringify(DEFAULT_ADMIN_CONFIG),
  },
  {
    id: "admin-locations",
    scope: "admin",
    chapter: "Chapter B · Set the rules",
    title: "Keep the location hierarchy honest",
    instruction: "Open Location Relationships and review cities and local areas.",
    why: "Cities and local areas drive grouping and discovery. Group ≠ location ≠ campaign — each is maintained in its own place.",
    how: [
      "Open Location Relationships.",
      "Check the city → local area tree.",
      "Confirm your own city and area still match where you trade.",
    ],
    route: "/admin/locations",
    cta: { label: "Open locations", to: "/admin/locations" },
    detect: (ctx) => hasVisited(ctx, "/admin/locations"),
  },
  {
    id: "admin-partners",
    scope: "admin",
    chapter: "Chapter B · Set the rules",
    title: "Review partner-managed groups",
    instruction: "Open Partner Groups.",
    why: "Partner groups are owned outside your organisation — you supervise them, their owners run them.",
    how: [
      "Open Partner Groups.",
      "Identify which groups are partner-owned.",
      "Remember ownership gates every change.",
    ],
    route: "/admin/partner-groups",
    cta: { label: "Open partner groups", to: "/admin/partner-groups" },
    detect: (ctx) => hasVisited(ctx, "/admin/partner-groups"),
  },
  {
    id: "admin-circles",
    scope: "admin",
    chapter: "Chapter B · Set the rules",
    title: "Check mandatory circles",
    instruction: "Open Mandatory Circles.",
    why: "Some circles are required for every member — they are policy, not preference.",
    how: [
      "Open Mandatory Circles.",
      "See which circles everyone belongs to.",
      "Contrast them with the optional circles users create themselves.",
    ],
    route: "/admin/mandatory-circles",
    cta: { label: "Open mandatory circles", to: "/admin/mandatory-circles" },
    detect: (ctx) => hasVisited(ctx, "/admin/mandatory-circles"),
  },
  {
    id: "admin-reports",
    scope: "admin",
    chapter: "Chapter C · Prove it works",
    title: "Report on the network",
    instruction: "Open Reports & Statistics and read the totals.",
    why: "Numbers are how you justify the configuration you just set — growth, membership and coverage across the whole network.",
    how: [
      "Open Reports & Statistics (screen 22).",
      "Read group, member and activity totals.",
      "Compare against the thresholds and types you configured.",
    ],
    route: "/admin/reports",
    cta: { label: "Open reports", to: "/admin/reports" },
    detect: (ctx) => hasVisited(ctx, "/admin/reports"),
  },
];
