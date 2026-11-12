import type { ParticipantRole } from "../domain/types";
import type { AuthUser } from "./api";

export type AuthRole = "admin" | "business" | ParticipantRole;

/**
 * The session written after a successful Central Hub sign-in, the local
 * administrator sign-in or the invitation-first onboarding flow.
 */
export interface AuthSession {
  role: AuthRole;
  authenticated: true;
  email?: string;
  /** Display name — present when the session came from a real sign-in. */
  name?: string;
  /** Central Hub / local user id. */
  accountId?: string;
  postcode?: string;
  city?: string;
  businessName?: string;
  sector?: string;
  verifiedBusiness?: boolean;
  firstName?: string;
  lastName?: string;
  /** Original Central Hub role, kept for future role-specific features. */
  mcomRole?: string;
  profileType?: string;
  avatarUrl?: string;
}

const STORAGE_KEY = "chs-auth-state";

export function readAuthSession(): AuthSession | null {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<AuthSession>;
    if (!parsed || parsed.authenticated !== true || !parsed.role) return null;
    return parsed as AuthSession;
  } catch {
    return null;
  }
}

export function writeAuthSession(session: AuthSession): void {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch {
    /* storage unavailable — the prototype continues without a session */
  }
}

export function clearAuthSession(): void {
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* storage unavailable — nothing to clear */
  }
}

/** The session only when it belongs to a participant (invited business/consumer). */
export function readParticipantSession(): AuthSession | null {
  const session = readAuthSession();
  if (!session) return null;
  return session.role === "consumer" || session.role === "business-invitee"
    ? session
    : null;
}

export function sessionFromApiUser(user: AuthUser): AuthSession {
  return {
    role: localRoleFor(user.role),
    authenticated: true,
    email: user.email,
    name: user.name,
    accountId: user.id,
    businessName: user.businessName ?? undefined,
    firstName: user.firstName ?? undefined,
    lastName: user.lastName ?? undefined,
    mcomRole: user.role,
    profileType: user.profileType ?? undefined,
    avatarUrl: user.avatarUrl ?? undefined,
  };
}

export function destinationForSession(session: AuthSession): string {
  switch (session.role) {
    case "admin":
      return "/admin/groups";
    case "business":
      return "/business/groups";
    case "consumer":
      return "/consumer";
    case "business-invitee":
      return "/participant";
    default:
      return "/";
  }
}

export function loginPathForRole(role: AuthRole): string {
  return role === "admin" ? "/admin/login" : "/login";
}

function localRoleFor(role: AuthUser["role"]): AuthRole {
  switch (role) {
    case "ADMIN":
      return "admin";
    case "BUSINESS":
      return "business";
    case "CUSTOMER":
    case "AGENT":
    case "CONSULTANT":
    case "ACCOUNT_MANAGER":
    case "PARTNER":
    default:
      return "consumer";
  }
}
