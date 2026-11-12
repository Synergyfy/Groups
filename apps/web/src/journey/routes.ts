const ROUTE_NOTES: Record<string, string> = {
  "/business/groups": "Group Circle home: your five ways in and what you already belong to.",
  "/business/groups/mine": "All your groups, split by how they were created.",
  "/business/groups/network": "Your system-created network group and its progress to the threshold.",
  "/business/groups/explore": "Find groups you are not in yet, then join or request.",
  "/business/groups/create": "Five-step wizard: Free or Paid → Type → Details → Rules → Review.",
  "/business/groups/create/success": "Your new group is live — inviting members is the next move.",
  "/business/groups/:groupId": "Group details: purpose, stats, ownership and rules.",
  "/business/groups/:groupId/members": "Everyone in this group, their roles and pending requests.",
  "/business/groups/:groupId/activity": "The timeline of everything that happened in this group.",
  "/business/groups/:groupId/invitations": "Invite people in, cancel invites, approve requests.",
  "/business/groups/:groupId/settings": "Owner-only: details, access rules, leaving or closing.",
  "/business/invitations": "Your inbox: incoming, outgoing and your own requests.",
  "/business/network/lists": "Intake layer: B2B/B2C lists from contacts, QR scans, affiliates and Traffic & Leads — add contacts manually or by join link.",
  "/business/circles": "Your circles overview — the collaborative layer built from lists.",
  "/business/circles/create": "Circle wizard: Select Lists → Define Type → Configure.",
  "/business/circles/:circleId": "Circle workspace: members, messages, activity and growth.",
  "/business/community": "National Community membership, shared across the ecosystem.",
  "/business/location": "Your city and local area — a profile property, not a membership.",
  "/business/campaigns": "FundOrDonate campaigns that reference groups (they are not groups).",
  "/business/rewards": "Programmes, tiers and the campaign → contribution → reward chain.",
  "/business/settings": "Account area (stub) — outside this group-building prototype.",
  "/business/journey": "The full storyline with your progress through it.",
  "/admin/groups": "National summary: counts, members, businesses and what needs attention.",
  "/admin/groups/all": "The central group register with every filter.",
  "/admin/groups/:groupId": "One group inspected end to end.",
  "/admin/groups/:groupId/members": "Membership, roles and requests for this group.",
  "/admin/groups/:groupId/activity": "Everything that happened in this group.",
  "/admin/groups/:groupId/relationships": "Which location, campaign and programme this group touches.",
  "/admin/config/automatic": "Threshold, method, scope and combining rules for automatic groups.",
  "/admin/config/types": "Which types exist, and whether users may create or join them.",
  "/admin/locations": "City → local area hierarchy used by grouping and discovery.",
  "/admin/partner-groups": "Groups owned and run by partners.",
  "/admin/mandatory-circles": "Circles every member must belong to.",
  "/admin/invitations": "Platform-wide invitations and join requests.",
  "/admin/reports": "Statistics across the whole network.",
  "/admin/journey": "The admin storyline with your progress through it.",
};

export function matchPath(pattern: string, path: string): boolean {
  const patternParts = pattern.split("/").filter(Boolean);
  const pathParts = path.split("/").filter(Boolean);
  if (patternParts.length !== pathParts.length) return false;
  return patternParts.every(
    (part, index) => part.startsWith(":") || part === pathParts[index]
  );
}

export function routeNote(path: string): string | undefined {
  const key = Object.keys(ROUTE_NOTES).find((pattern) => matchPath(pattern, path));
  return key ? ROUTE_NOTES[key] : undefined;
}

export const ROUTE_NOTE_KEYS = Object.keys(ROUTE_NOTES);
