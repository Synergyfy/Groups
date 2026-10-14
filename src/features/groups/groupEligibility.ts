import type { Group, Invitation } from "../../domain/types";

export interface UserEligibilityProfile {
  id: string;
  accountType: "business" | "consumer" | "business-invitee" | "admin";
  name: string;
  city?: string;
  postcode?: string;
  sector?: string;
  businessName?: string;
}

export type GroupMatchStatus =
  | "joined" // User is already a member
  | "invited" // User has a direct pending invitation
  | "pending_request" // User requested to join and is awaiting approval
  | "can_join" // User is eligible to join directly (open access)
  | "can_request" // User is eligible to request access (request access)
  | "invitation_only" // Group is invitation-only, not directly open
  | "unavailable" // Group is suspended, closed, or draft
  | "ineligible"; // User does not meet audience/location/sector criteria

export interface EligibilityResult {
  group: Group;
  status: GroupMatchStatus;
  isEligible: boolean;
  matchReasons: string[];
  audienceLabel: "Business Owners" | "Consumers" | "All Community";
}

/** Extract postcode area prefix, e.g. "B1 1AA" -> "B1" or "B", "NW1 8AB" -> "NW" */
export function extractPostcodeArea(postcode?: string): string {
  if (!postcode) return "";
  const cleaned = postcode.trim().toUpperCase();
  const match = cleaned.match(/^[A-Z]{1,2}\d[A-Z\d]?/);
  return match ? match[0] : cleaned.split(" ")[0] || "";
}

/** Map UK postcode prefixes to major cities for automatic location inference */
export function inferCityFromPostcode(postcode?: string): string {
  if (!postcode) return "";
  const prefix = postcode.trim().toUpperCase();
  if (prefix.startsWith("B")) return "Birmingham";
  if (prefix.startsWith("M")) return "Manchester";
  if (prefix.startsWith("E") || prefix.startsWith("EC") || prefix.startsWith("N") ||
      prefix.startsWith("NW") || prefix.startsWith("SE") || prefix.startsWith("SW") ||
      prefix.startsWith("W") || prefix.startsWith("WC")) return "London";
  if (prefix.startsWith("LS")) return "Leeds";
  if (prefix.startsWith("BS")) return "Bristol";
  if (prefix.startsWith("S")) return "Sheffield";
  if (prefix.startsWith("EH")) return "Edinburgh";
  if (prefix.startsWith("G")) return "Glasgow";
  if (prefix.startsWith("CF")) return "Cardiff";
  return "";
}

/** Check if group is intended for consumers */
export function isConsumerFriendlyGroup(group: Group): boolean {
  const type = group.type;
  if ((type as string) === "Seasonal" || (type as string) === "Customer Group" || type === "Event / Expo" || type === "National Community" || type === "Affiliate") {
    return true;
  }
  // If group name or purpose contains consumer/community/friends keywords
  const text = `${group.name} ${group.purpose}`.toLowerCase();
  if (text.includes("consumer") || text.includes("customer") || text.includes("family") || text.includes("friends") || text.includes("community")) {
    return true;
  }
  return false;
}

/** Determine the intended audience of a group */
export function groupAudienceOf(group: Group): "Business Owners" | "Consumers" | "All Community" {
  if (group.type === "National Community" || group.type === "Event / Expo") {
    return "All Community";
  }
  if (isConsumerFriendlyGroup(group)) {
    return "Consumers";
  }
  return "Business Owners";
}

/**
 * Reusable eligibility evaluation for any group against a user profile
 */
export function evaluateGroupEligibility(
  group: Group,
  profile: UserEligibilityProfile,
  userInvitations: Invitation[] = []
): EligibilityResult {
  const matchReasons: string[] = [];
  const audience = groupAudienceOf(group);

  // 1. Availability check
  if (group.status === "Suspended" || group.status === "Closed") {
    return {
      group,
      status: "unavailable",
      isEligible: false,
      matchReasons: ["Group is suspended or unavailable."],
      audienceLabel: audience,
    };
  }

  // 2. Already joined check
  if (group.memberIds.includes(profile.id) || group.ownerId === profile.id) {
    return {
      group,
      status: "joined",
      isEligible: true,
      matchReasons: ["You are an active member of this group."],
      audienceLabel: audience,
    };
  }

  // 3. Direct Invitation check — always takes priority
  const directInvite = userInvitations.find(
    (inv) =>
      inv.groupId === group.id &&
      (inv.inviteeId === profile.id || (inv.inviteeEmail && inv.inviteeEmail === profile.id)) &&
      inv.kind === "invite" &&
      inv.status === "pending"
  );

  if (directInvite) {
    matchReasons.push("You received a direct personal invitation to join this group.");
    return {
      group,
      status: "invited",
      isEligible: true,
      matchReasons,
      audienceLabel: audience,
    };
  }

  // 4. Pending request check
  const pendingReq = userInvitations.find(
    (inv) =>
      inv.groupId === group.id &&
      inv.inviteeId === profile.id &&
      inv.kind === "request" &&
      inv.status === "pending"
  );
  if (pendingReq) {
    return {
      group,
      status: "pending_request",
      isEligible: true,
      matchReasons: ["Your request to join is awaiting approval."],
      audienceLabel: audience,
    };
  }

  // 5. Audience check
  const isConsumer = profile.accountType === "consumer";
  const isBusiness = profile.accountType === "business" || profile.accountType === "business-invitee";

  if (isConsumer && audience === "Business Owners") {
    return {
      group,
      status: "ineligible",
      isEligible: false,
      matchReasons: ["This group is reserved for registered business owners."],
      audienceLabel: audience,
    };
  }

  // 6. Location matching
  const userCity = profile.city || inferCityFromPostcode(profile.postcode);
  const groupCity = group.location?.city;
  const isUkWide = !groupCity || groupCity.toLowerCase().includes("national") || groupCity.toLowerCase().includes("uk");

  let locationMatched = false;
  if (isUkWide) {
    locationMatched = true;
    matchReasons.push("UK-wide community accessible to all areas.");
  } else if (userCity && groupCity && userCity.toLowerCase() === groupCity.toLowerCase()) {
    locationMatched = true;
    matchReasons.push(`Located in your area (${groupCity}).`);
  } else if (profile.postcode && group.location?.localArea) {
    locationMatched = true;
    matchReasons.push(`Local area match (${group.location.localArea}).`);
  }

  if (!locationMatched) {
    return {
      group,
      status: "ineligible",
      isEligible: false,
      matchReasons: [`Outside your local area (${groupCity ?? "different region"}).`],
      audienceLabel: audience,
    };
  }

  // 7. Sector matching for businesses
  if (isBusiness && profile.sector) {
    const text = `${group.name} ${group.type} ${group.purpose}`.toLowerCase();
    const sector = profile.sector.toLowerCase();
    if (text.includes(sector) || group.type === "Marketing" || group.type === "B2B" || group.type === "Network") {
      matchReasons.push(`Matches your business sector (${profile.sector}).`);
    }
  }

  // 8. Access type determination
  if (group.accessType === "open") {
    return {
      group,
      status: "can_join",
      isEligible: true,
      matchReasons,
      audienceLabel: audience,
    };
  }

  if (group.accessType === "request") {
    return {
      group,
      status: "can_request",
      isEligible: true,
      matchReasons,
      audienceLabel: audience,
    };
  }

  // Invitation only without a direct invitation
  return {
    group,
    status: "invitation_only",
    isEligible: false,
    matchReasons: ["This group requires an invitation from the owner."],
    audienceLabel: audience,
  };
}
