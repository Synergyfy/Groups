import { SetMetadata } from "@nestjs/common";

export const ALLOW_LOCKED_BUSINESS_ACCESS = "allowLockedBusinessAccess";

/**
 * Marks a business endpoint that must stay reachable while the business has not
 * yet accepted the access agreement or paid for plan access (the plan page,
 * payments and the basic overview needed to render it).
 */
export const AllowLockedBusinessAccess = () =>
  SetMetadata(ALLOW_LOCKED_BUSINESS_ACCESS, true);
