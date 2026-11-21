import { ConflictException } from "@nestjs/common";
import type { ConfigService } from "@nestjs/config";

export const PROFILE_MANAGED_CENTRALLY = "PROFILE_MANAGED_CENTRALLY";

/**
 * Central Hub is the single source of truth for consumer and business profile
 * data. Local apps only mirror the canonical copy.
 */
export function centralProfileEditUrl(config: ConfigService): string {
  const configured = config
    .get<string>("MCOM_PROFILE_EDIT_URL", "")
    .trim();
  if (configured) return configured;

  const frontend = config
    .get<string>("MCOM_FRONTEND_URL", "http://localhost:3000")
    .replace(/\/+$/, "");
  return `${frontend}/dashboard/profile`;
}

export function centralProfileConflict(
  config: ConfigService,
  roleLabel: string,
): ConflictException {
  return new ConflictException({
    code: PROFILE_MANAGED_CENTRALLY,
    message: `Your ${roleLabel} profile is managed by Central Hub. Update it there and the change syncs here automatically.`,
    editUrl: centralProfileEditUrl(config),
  });
}
