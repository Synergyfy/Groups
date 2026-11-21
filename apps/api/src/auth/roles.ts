import { UserRole } from "../generated/prisma/client.js";
import type { SessionRole } from "./auth.types.js";

/** Normalize a Central Hub role/profile type into a local session role. */
export function normalizeRole(raw: string | null | undefined): SessionRole {
  const value = (raw ?? "").trim().toUpperCase();
  const allowed: SessionRole[] = [
    "BUSINESS",
    "CUSTOMER",
    "AGENT",
    "CONSULTANT",
    "ACCOUNT_MANAGER",
    "PARTNER",
    "ADMIN",
  ];

  return allowed.includes(value as SessionRole)
    ? (value as SessionRole)
    : "CUSTOMER";
}

export function toUserRole(raw: string | null | undefined): UserRole {
  switch (normalizeRole(raw)) {
    case "BUSINESS":
      return UserRole.BUSINESS;
    case "AGENT":
      return UserRole.AGENT;
    case "CONSULTANT":
      return UserRole.CONSULTANT;
    case "ACCOUNT_MANAGER":
      return UserRole.ACCOUNT_MANAGER;
    case "PARTNER":
      return UserRole.PARTNER;
    case "ADMIN":
      return UserRole.ADMIN;
    default:
      return UserRole.CUSTOMER;
  }
}
