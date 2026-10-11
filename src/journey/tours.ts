import { matchPath } from "./routes";

export interface TourItem {
  title: string;
  body: string;
  target?: string;
}

export interface TourDef {
  id: string;
  matches: string[];
  auto?: boolean;
  items: TourItem[];
}

const TOURS: TourDef[] = [
  {
    id: "tour-groups",
    matches: ["/business/groups"],
    auto: true,
    items: [
      {
        target: "actions",
        title: "Your five ways in",
        body: "My Groups, Automatic Network Group, Explore Groups, Create a Group and Invitations — everything in Group Circle starts from one of these.",
      },
      {
        target: "note",
        title: "No group required",
        body: "The business does not need to create a group to use Group Circle — what the platform gave you already works.",
      },
      {
        target: "part-of",
        title: "What you already belong to",
        body: "National Community, your city, your local area and your automatically assigned network group — open any of them straight from here.",
      },
    ],
  },
  {
    id: "tour-mine",
    matches: ["/business/groups/mine"],
    auto: true,
    items: [
      {
        target: "sections",
        title: "Three kinds of membership",
        body: "Automatic Network Group, My Created Groups and Joined Groups — each section shows how many groups it holds.",
      },
      {
        target: "note",
        title: "Tap through to open",
        body: "Open a section to see its groups, then tap any group for its full overview.",
      },
    ],
  },
  {
    id: "tour-network",
    matches: ["/business/groups/network"],
    auto: true,
    items: [
      {
        target: "header",
        title: "This group belongs to the system",
        body: "Created by: System, Type: Automatic Network, Owner: System. You can watch it, join in, but never edit its rules.",
      },
      {
        target: "progress",
        title: "The number that matters",
        body: "Current / threshold with “N more members needed”. At the threshold the system splits the group — the threshold is admin-configured, never hard-coded.",
      },
    ],
  },
  {
    id: "tour-explore",
    matches: ["/business/groups/explore"],
    auto: true,
    items: [
      {
        target: "filters",
        title: "Narrow it down",
        body: "Type, access, status and city. Access is the important one: open means instant, request means approval, invitation means someone must invite you.",
      },
      {
        target: "list",
        title: "Join or request, right here",
        body: "Each row has its own action button. Disabled buttons explain themselves — system groups and invitation-only groups cannot be joined by clicking.",
      },
    ],
  },
  {
    id: "tour-wizard",
    matches: ["/business/groups/create"],
    auto: true,
    items: [
      {
        target: "stepper",
        title: "Five steps, in order",
        body: "Free or Paid → Type → Details → Rules → Review. You choose how membership works first, then jump back to any step you have already completed.",
      },
      {
        target: "step-body",
        title: "Nothing here is invented",
        body: "Types come from administrator configuration, locations from the hierarchy. If a type is missing, an admin disabled it.",
      },
    ],
  },
  {
    id: "tour-inbox",
    matches: ["/business/invitations"],
    auto: true,
    items: [
      {
        target: "tabs",
        title: "Three directions",
        body: "Incoming (waiting on you), Outgoing (you sent) and My requests (you asked to join).",
      },
      {
        target: "list",
        title: "Act, don't archive",
        body: "Approve, decline or cancel. Every action is recorded in the group's activity so owners can see what happened.",
      },
    ],
  },
  {
    id: "tour-admin",
    matches: ["/admin/groups"],
    auto: true,
    items: [
      {
        target: "stats",
        title: "The whole network, counted",
        body: "Groups, members, businesses and what needs attention — every figure from the live demo store, never from a mock array in the page.",
      },
      {
        target: "attention",
        title: "What you must act on",
        body: "Pending review groups and unanswered invitations. Review is a status, not a stage — this is where an administrator earns the word oversight.",
      },
      {
        target: "breakdown",
        title: "Breakdowns you can configure",
        body: "Type, city, stage, status and programme come from administrator configuration and the location hierarchy, so the same charts stay truthful after a rule change.",
      },
    ],
  },
  {
    id: "tour-admin-list",
    matches: ["/admin/groups/all"],
    auto: true,
    items: [
      {
        target: "filters",
        title: "The register's controls",
        body: "Type, city, local area, stage, status, owner, programme and source — every option is configuration, not decoration.",
      },
      {
        target: "summary",
        title: "Counted, not guessed",
        body: "Showing X of Y groups is calculated from the store after the filters run, so the number always matches the table.",
      },
      {
        target: "list",
        title: "One row, one truth",
        body: "Source sits beside type and stage: automatic groups and user-created groups stay visually distinct all the way into this register.",
      },
    ],
  },
  {
    id: "tour-admin-detail",
    matches: ["/admin/groups/:groupId"],
    auto: true,
    items: [
      {
        target: "identity",
        title: "Who this group belongs to",
        body: "Name, type, source, owner and status — the four facts an administrator checks before touching anything.",
      },
      {
        target: "tabs",
        title: "Inspect, then act",
        body: "Overview and Settings live here; Members, Activity and Relationships open as their own screens so each view stays focused.",
      },
      {
        target: "overview",
        title: "The group, fully explained",
        body: "Membership against the configured threshold, linked campaigns, location and relationships — group, location and campaign are never mixed up.",
      },
    ],
  },
  {
    id: "tour-network-lists",
    matches: ["/business/network/lists"],
    auto: true,
    items: [
      {
        target: "lists",
        title: "Where contacts come from",
        body: "Every list records its intake source — manual contacts, QR plaque scans, affiliate signups or the Traffic & Leads Directory — plus whether it is B2B or B2C. Use Add Contact to enter someone manually or share a join link; each contact stays pending until they confirm by email.",
      },
      {
        target: "note",
        title: "Lists, circles and groups are different things",
        body: "A list is intake, a circle is a working space built from lists, and a group is the membership concept. Lists never create groups.",
      },
    ],
  },
  {
    id: "tour-circle-create",
    matches: ["/business/circles/create"],
    auto: true,
    items: [
      {
        target: "stepper",
        title: "Three steps",
        body: "Select Lists → Define Type → Configure. You can jump back to any step you have already completed.",
      },
      {
        target: "step-body",
        title: "Nothing is invented here",
        body: "Lists come from My Network, circle types carry their own minimums and member limits, and the Smart Money circle refuses to be created without a designated Banker.",
      },
    ],
  },
  {
    id: "tour-circles",
    matches: ["/business/circles", "/business/circles/:circleId"],
    auto: true,
    items: [
      {
        target: "circle-sidebar",
        title: "Your circles",
        body: "Switch between circles here — each one remembers its own members, filters and source lists.",
      },
      {
        target: "canvas",
        title: "The circle itself",
        body: "Nodes are your members with you at the centre. Filter them on the left; open a profile or send a message from any node.",
      },
      {
        target: "circle-stats",
        title: "Live statistics",
        body: "Member counts, source lists and activity for this circle, plus the growth actions that add members from My Network.",
      },
    ],
  },
  {
    id: "tour-admin-members",
    matches: ["/admin/groups/:groupId/members"],
    auto: true,
    items: [
      {
        target: "tabs",
        title: "You are inside one group",
        body: "Members, Activity and Relationships are separate screens so each view stays focused on one question.",
      },
      {
        target: "list",
        title: "The full register",
        body: "Every seat with category, city and role — the owner is highlighted because ownership gates the controls.",
      },
    ],
  },
  {
    id: "tour-admin-activity",
    matches: ["/admin/groups/:groupId/activity"],
    auto: true,
    items: [
      {
        target: "tabs",
        title: "Navigate the inspection",
        body: "Jump between the group's members, activity and relationships without losing the group you are inspecting.",
      },
      {
        target: "list",
        title: "Events, not states",
        body: "The log records who did what and when. Status and stage are never written here — activity records events, not states.",
      },
    ],
  },
  {
    id: "tour-admin-relationships",
    matches: ["/admin/groups/:groupId/relationships"],
    auto: true,
    items: [
      {
        target: "tabs",
        title: "One group, four views",
        body: "Overview, Members, Activity and Relationships each answer a different question about the same group.",
      },
      {
        target: "location",
        title: "Where it sits",
        body: "National Community → city → local area → this group. Joining a group never moves a business's location relationship.",
      },
      {
        target: "people",
        title: "Who is involved",
        body: "Owner business, account manager, agent and consultant — the human relationships beside the structural ones.",
      },
      {
        target: "campaigns",
        title: "Campaigns and programme",
        body: "Linked campaigns and the membership programme are references, not memberships — none of them change the group's stage.",
      },
      {
        target: "membership",
        title: "The membership itself",
        body: "Source, access, status, stage and member count — the membership relationship, kept separate from everything above.",
      },
    ],
  },
  {
    id: "tour-admin-rules",
    matches: ["/admin/config/automatic"],
    auto: true,
    items: [
      {
        target: "controls",
        title: "The rule everyone lives by",
        body: "Threshold (6/12/18/24), method, scope and combining rules. Every automatic group on the platform reads this configuration.",
      },
      {
        target: "preview",
        title: "Before you commit",
        body: "The preview shows what each threshold would do to today's network — splits and seats short, calculated live from the store.",
      },
      {
        target: "outcome",
        title: "And after you change it",
        body: "Each automatic group's progress bar follows the threshold. Change it here, then reopen the network group to see its \"N more members needed\" move with it.",
      },
    ],
  },
  {
    id: "tour-admin-types",
    matches: ["/admin/config/types"],
    auto: true,
    items: [
      {
        target: "types",
        title: "Three switches per type",
        body: "Enabled, allow creation and allow joining. The wizard only offers creatable types, and Explore only shows joinable ones.",
      },
      {
        target: "stages",
        title: "Stages are labels",
        body: "Stage labels feed group settings and the register. A stage is never a status — this screen keeps them apart.",
      },
    ],
  },
  {
    id: "tour-admin-locations",
    matches: ["/admin/locations"],
    auto: true,
    items: [
      {
        target: "hierarchy",
        title: "The configured hierarchy",
        body: "National Community → cities → local areas, with group counts at every level. This structure drives discovery and grouping.",
      },
      {
        target: "cities",
        title: "Groups under each city",
        body: "Open any group to inspect it. Groups without a location stay visible in their own section — no report drops them.",
      },
    ],
  },
  {
    id: "tour-admin-partners",
    matches: ["/admin/partner-groups"],
    auto: true,
    items: [
      {
        target: "notice",
        title: "What the specification does not say yet",
        body: "Partner financial rules are a placeholder — this screen shows structure only and never implies money has moved.",
      },
      {
        target: "list",
        title: "Partner-owned groups",
        body: "Every group of type Partner with its owner, size and location — the same register data, filtered for partners.",
      },
      {
        target: "programme",
        title: "Programme, not payment",
        body: "The partner membership programme is a membership relationship — not a group, not a campaign and not a fee.",
      },
    ],
  },
  {
    id: "tour-admin-mandatory",
    matches: ["/admin/mandatory-circles"],
    auto: true,
    items: [
      {
        target: "notice",
        title: "Rules still to confirm",
        body: "Which circles are mandatory and how they are enforced is not settled in the specification — so this screen reports, it does not enforce.",
      },
      {
        target: "circles",
        title: "The structure that exists",
        body: "Duration, visibility, interaction level and member count for each configured circle.",
      },
      {
        target: "note",
        title: "Circles are their own concept",
        body: "A circle never grants group membership, and its configuration lives here rather than inside a group.",
      },
    ],
  },
  {
    id: "tour-admin-invitations",
    matches: ["/admin/invitations"],
    auto: true,
    items: [
      {
        target: "filters",
        title: "Filter the register",
        body: "Status filters the network-wide invitation and join-request register; the counts above always reflect the whole store.",
      },
      {
        target: "list",
        title: "Report, don't act",
        body: "This screen shows state across the platform. Accepting or declining stays with the group owner or the invited business.",
      },
    ],
  },
  {
    id: "tour-admin-reports",
    matches: ["/admin/reports"],
    auto: true,
    items: [
      {
        target: "origin",
        title: "Origin beside volume",
        body: "Automatic versus user created is always shown next to the total — a report never gives a number without its origin.",
      },
      {
        target: "growth",
        title: "Growth over time",
        body: "Groups created per month, read straight from creation dates in the demo store.",
      },
      {
        target: "types",
        title: "Distribution by type",
        body: "Type distribution comes from live data, so a disabled type still appears if groups already exist.",
      },
      {
        target: "table",
        title: "The table behind the charts",
        body: "Type totals with origin in the last column — system created, user created or mixed.",
      },
    ],
  },
  {
    id: "tour-placeholder",
    matches: ["/business/settings"],
    items: [
      {
        target: "title",
        title: "Where you are in the story",
        body: "This screen is part of the planned prototype — one chapter of the same journey.",
      },
      {
        target: "panel",
        title: "What this screen will do",
        body: "The description here comes from the specification section it implements — read it as the instruction for this step.",
      },
    ],
  },
  {
    id: "tour-default",
    matches: ["*"],
    items: [
      {
        target: "nav",
        title: "Your map",
        body: "The sidebar is the table of contents. The journey rail below it always shows how far you have come.",
      },
    ],
  },
];

export function findTour(path: string): TourDef {
  return (
    TOURS.find((tour) =>
      tour.matches.some((pattern) => pattern !== "*" && matchPath(pattern, path))
    ) ?? TOURS[TOURS.length - 1]
  );
}

export function getTour(id: string): TourDef | undefined {
  return TOURS.find((tour) => tour.id === id);
}

export const ALL_TOURS = TOURS;
