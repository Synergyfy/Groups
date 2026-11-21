import { BadRequestException } from "@nestjs/common";
import type { Partner } from "../generated/prisma/client.js";
import type { PrismaClient } from "../generated/prisma/client.js";
import { jsonObject } from "../admin/admin.mappers.js";
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
 * Groups and businesses may only use cities/areas from the admin-managed
 * hierarchy once that hierarchy has been populated.
 */
export async function assertLocation(
  prisma: PrismaClient,
  city: string | null | undefined,
  localArea: string | null | undefined,
): Promise<void> {
  const cityCount = await prisma.locationCity.count();
  if (cityCount === 0) return;

  const cityName = city?.trim();
  if (!cityName) {
    throw new BadRequestException(
      "A city from the configured location hierarchy is required.",
    );
  }

  const cityRow = await prisma.locationCity.findFirst({
    where: { name: { equals: cityName, mode: "insensitive" } },
    select: { id: true, name: true },
  });
  if (!cityRow) {
    throw new BadRequestException(
      `City "${cityName}" is not in the configured location hierarchy.`,
    );
  }

  const areaName = localArea?.trim();
  if (!areaName) return;
  const area = await prisma.locationArea.findFirst({
    where: {
      cityId: cityRow.id,
      name: { equals: areaName, mode: "insensitive" },
    },
    select: { id: true },
  });
  if (!area) {
    throw new BadRequestException(
      `Area "${areaName}" is not configured for ${cityRow.name}.`,
    );
  }
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
