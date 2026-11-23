import { BadRequestException } from "@nestjs/common";
import type { Partner } from "../generated/prisma/client.js";
import type { PrismaClient } from "../generated/prisma/client.js";
import { jsonObject } from "../admin/admin.mappers.js";
import type { GeographyService } from "../geography/geography.service.js";
import type {
  GeographySelection,
  ResolvedGeography,
} from "../geography/geography.types.js";
import type { PartnerPermissions } from "./business.types.js";

/** Reject a stage label that administrators removed from the configured list. */
export function assertStageLabel(
  stage: string | null | undefined,
  labels: string[],
): void {
  const value = stage?.trim();
  if (!value || labels.length === 0) return;
  if (!labels.includes(value)) {
    throw new BadRequestException(
      `Stage "${value}" is not one of the configured stage labels.`,
    );
  }
}

/**
 * Groups and businesses may only use locations from Central Hub's geography
 * hierarchy. Central Hub stays authoritative; this resolves the selection to
 * canonical ids/names and rejects levels that do not exist.
 */
export async function assertLocation(
  geography: GeographyService,
  selection: GeographySelection,
): Promise<ResolvedGeography> {
  return geography.resolveSelection(selection);
}

/** A business/partner may only be linked to a programme that exists and is active. */
export async function assertProgrammeAvailable(
  prisma: PrismaClient,
  programmeId: string | null | undefined,
  allowInactive = false,
): Promise<void> {
  if (!programmeId) return;
  const programme = await prisma.programme.findUnique({
    where: { id: programmeId },
    select: { id: true, name: true, status: true },
  });
  if (!programme) {
    throw new BadRequestException("The selected programme does not exist.");
  }
  if (!allowInactive && programme.status !== "Active") {
    throw new BadRequestException(
      `The ${programme.name} programme is not active.`,
    );
  }
}

/** Campaign links must reference current, active campaigns. */
export async function assertCampaignsAvailable(
  prisma: PrismaClient,
  campaignIds: string[] | undefined,
  allowInactive = false,
): Promise<void> {
  if (!campaignIds || campaignIds.length === 0) return;
  const unique = [...new Set(campaignIds)];
  const campaigns = await prisma.campaign.findMany({
    where: { id: { in: unique } },
    select: {
      id: true,
      name: true,
      status: true,
      startDate: true,
      endDate: true,
    },
  });
  if (campaigns.length !== unique.length) {
    throw new BadRequestException("One or more selected campaigns do not exist.");
  }
  if (allowInactive) return;

  const now = new Date();
  for (const campaign of campaigns) {
    const started = !campaign.startDate || campaign.startDate <= now;
    const notEnded = !campaign.endDate || campaign.endDate >= now;
    if (campaign.status !== "Active" || !started || !notEnded) {
      throw new BadRequestException(
        `The ${campaign.name} campaign is not currently active.`,
      );
    }
  }
}

const PARTNER_PERMISSION_KEYS = [
  "canCreateGroups",
  "canCreateCircles",
  "canInviteMembers",
  "canRemoveMembers",
  "canRunPaidGroups",
  "canRunFreeGroups",
  "canAccessCampaigns",
  "canAccessReports",
  "canSeeFinancials",
  "canSetContributionAmounts",
] as const;

/**
 * Per-partner permissions merged over the administrator's partner defaults.
 * A partner that is not Active loses every capability but keeps its recorded
 * revenue share so historical calculations remain stable.
 */
export function partnerPermissionsFor(
  partner: Partner | null,
  defaults: PartnerPermissions,
): PartnerPermissions | null {
  if (!partner) return null;
  const stored = jsonObject(partner.permissions);
  const merged = {
    ...defaults,
    ...stored,
    maxGroups: Number(stored.maxGroups ?? defaults.maxGroups),
    maxCircles: Number(stored.maxCircles ?? defaults.maxCircles),
    revenueSharePercent: Number(
      stored.revenueSharePercent ?? defaults.revenueSharePercent,
    ),
  } as PartnerPermissions;

  if (partner.status !== "Active") {
    for (const key of PARTNER_PERMISSION_KEYS) {
      merged[key] = false;
    }
    merged.maxGroups = 0;
    merged.maxCircles = 0;
  }

  return merged;
}

export function assertPartnerPermission(
  permissions: PartnerPermissions | null,
  key: (typeof PARTNER_PERMISSION_KEYS)[number],
  message: string,
): void {
  if (permissions && !permissions[key]) {
    throw new BadRequestException(message);
  }
}
