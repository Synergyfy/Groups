import type { ParticipantRole } from "../domain/types";

export type AuthRole = "admin" | "business" | ParticipantRole;

/**
 * The session written after a demo sign-in, a demo registration, or the
 * invitation-first onboarding flow. Stored under the same key the app has
 * always used, so existing demo pages keep working.
 */
export interface AuthSession {
  role: AuthRole;
  authenticated: true;
  email?: string;
  /** Display name — present when the session came from a real registration. */
  name?: string;
  /** `PlatformAccount.id` — present when the session came from a real registration. */
  accountId?: string;
  postcode?: string;
  city?: string;
  businessName?: string;
  sector?: string;
  verifiedBusiness?: boolean;
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