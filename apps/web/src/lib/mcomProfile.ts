/**
 * Central Hub is the source of truth for consumer and business profiles. The
 * app only mirrors the canonical record, so every "edit profile" action links
 * back to Central Hub.
 */
export function mcomProfileUrl(): string {
  const env = import.meta.env as
    | { VITE_MCOM_PROFILE_URL?: string }
    | undefined;
  return env?.VITE_MCOM_PROFILE_URL ?? "http://localhost:3000/dashboard/profile";
}
