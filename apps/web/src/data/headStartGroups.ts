import type { Group } from "../domain/types";

/**
 * "Head start" groups: pre-populated, incomplete groups waiting in the
 * business dashboard on entry. The platform fills in the owner and a couple of
 * members; the business recruits the rest. They stay non-functional until they
 * reach the administrator's recruitment threshold for the owner's membership
 * (see `adminConfig.groupCreationRules.recruitmentTargets`).
 *
 * They are dispatched into the store by the `group/head-start` action when the
 * dashboard is first entered, not seeded into the initial state.
 */
export const HEAD_START_GROUPS: Group[] = [
  {
    id: "grp-headstart-b2b",
    name: "Head Start — B2B Network",
    type: "B2B",
    source: "user-created",
    headStart: true,
    purpose:
      "A pre-filled starting group for local business-to-business connections. The platform seeded the first members — recruit the rest to activate it.",
    ownerId: "biz-smith",
    ownerName: "Smith Business",
    memberIds: ["biz-smith", "c-004", "c-008"],
    location: { city: "Birmingham", localArea: "Birmingham City Centre" },
    status: "Recruiting",
    accessType: "open",
    visibility: "directory",
    pricing: "free",
    createdAt: "2026-10-17",
  },
  {
    id: "grp-headstart-affiliate",
    name: "Head Start — Affiliate Circle",
    type: "Affiliate",
    source: "user-created",
    headStart: true,
    purpose:
      "A half-built affiliate group handed over on entry. Add members until the administrator's threshold for your membership is met and it switches on.",
    ownerId: "biz-smith",
    ownerName: "Smith Business",
    memberIds: ["biz-smith", "c-012", "c-016"],
    location: { city: "Birmingham", localArea: "Birmingham City Centre" },
    status: "Recruiting",
    accessType: "request",
    visibility: "directory",
    pricing: "free",
    createdAt: "2026-10-17",
  },
];
