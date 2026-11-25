import type { PrismaClient } from "../generated/prisma/client.js";
import { jsonObject } from "../admin/admin.mappers.js";
import { BusinessMediaService } from "./business.media.js";

/** A usable image URL, or nothing when Central Hub has none. */
export function cleanUrl(
  value: string | null | undefined,
): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

/** The business logo Central Hub keeps on its business profile. */
export function centralHubLogo(businessProfile: unknown): string | undefined {
  const profile = jsonObject(businessProfile);
  return (
    cleanUrl(typeof profile.logoUrl === "string" ? profile.logoUrl : null) ??
    cleanUrl(typeof profile.logo === "string" ? profile.logo : null)
  );
}

export interface CentralHubPhotos {
  /** Contact id → the avatar of the Central Hub user behind its email. */
  byContactId: Map<string, string>;
  /** Business id → the logo from its Central Hub business profile. */
  byBusinessId: Map<string, string>;
}

/**
 * Central Hub owns the member logos, so Groups only mirrors them.
 *
 * A business member shows the logo from its Central Hub business profile; a
 * contact shows the avatar of the Central Hub user behind their email
 * address. Members without one keep the initials fallback on the client.
 */
export async function centralHubPhotos(
  prisma: PrismaClient,
  media: BusinessMediaService,
  contacts: Array<{ id: string; email: string | null }>,
  businesses: Array<{ id: string }>,
): Promise<CentralHubPhotos> {
  const byContactId = new Map<string, string>();
  const byBusinessId = new Map<string, string>();

  const emails = contacts
    .map((contact) => contact.email?.trim().toLowerCase())
    .filter((email): email is string => Boolean(email));
  const businessIds = businesses.map((business) => business.id);
  const filters: Array<Record<string, unknown>> = [];
  if (businessIds.length) filters.push({ businessId: { in: businessIds } });
  if (emails.length) filters.push({ email: { in: emails } });
  if (!filters.length) return { byContactId, byBusinessId };

  const users = await prisma.user.findMany({
    where: { OR: filters },
    select: {
      businessId: true,
      email: true,
      avatarUrl: true,
      businessProfile: true,
    },
  });

  for (const user of users) {
    if (!user.businessId) continue;
    const photo =
      media.publicUrl(centralHubLogo(user.businessProfile)) ??
      media.publicUrl(cleanUrl(user.avatarUrl));
    if (photo) byBusinessId.set(user.businessId, photo);
  }

  const byEmail = new Map(
    users
      .filter((user) => user.email)
      .map((user) => [user.email.toLowerCase(), user]),
  );

  for (const contact of contacts) {
    const email = contact.email?.trim().toLowerCase();
    if (!email) continue;
    const user = byEmail.get(email);
    if (!user) continue;
    const photo =
      media.publicUrl(cleanUrl(user.avatarUrl)) ??
      media.publicUrl(centralHubLogo(user.businessProfile));
    if (photo) byContactId.set(contact.id, photo);
  }

  return { byContactId, byBusinessId };
}
