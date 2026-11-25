import { Injectable, Logger } from "@nestjs/common";
import type { Business } from "../generated/prisma/client.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { GeographyService } from "../geography/geography.service.js";
import {
  PostcodeLookupService,
  type PostcodeChain,
} from "../geography/geography.postcode.js";

/** UK postcodes, e.g. "SW1A 1AA" or "B5 4BU". */
const POSTCODE = /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i;

/** Values Central Hub uses when a profile has no resolvable location. */
const UNRESOLVED = new Set(["unspecified", "unknown", "n/a", "none", "-"]);

/**
 * A city that starts with a number is a street address ("12 Victoria Street"),
 * not a place — legacy rows stored the address in the city column.
 */
function looksLikeAddress(value: string): boolean {
  return /^\d/.test(value.trim());
}

/**
 * Keeps the business location canonical.
 *
 * Central Hub is the source of truth, but a business can reach Groups before
 * its profile has been mirrored (or before the postcode resolves). Without a
 * canonical location the business would be filed under a placeholder such as
 * "Unspecified", which then becomes an automatic group name and an unusable
 * filter value.
 *
 * This service resolves what it can — from the names already on the row, or
 * from the postcode — and stores the Central Hub ids with it.
 */
@Injectable()
export class BusinessLocationService {
  private readonly logger = new Logger(BusinessLocationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly geography: GeographyService,
    private readonly postcode: PostcodeLookupService,
  ) {}

  /**
   * True when the business location is already canonical — Central Hub's ids
   * are stored alongside the names. A city string on its own is not enough: it
   * may be a street address or a value Central Hub does not know.
   */
  hasResolvedLocation(business: {
    city?: string | null;
    cityId?: string | null;
  }): boolean {
    return Boolean(business.cityId);
  }

  /**
   * Resolve and persist the business location when it is not canonical yet.
   * Never throws: a business without a location still gets a working
   * dashboard, it just has no location to match on.
   */
  async ensureResolved(business: Business): Promise<Business> {
    if (this.hasResolvedLocation(business)) {
      // Already canonical — only the groups may still carry a placeholder.
      await this.normaliseOwnedGroups(business);
      return business;
    }

    try {
      const chain =
        (await this.resolveFromNames(business)) ??
        (await this.resolveFromPostcode(business));
      if (!chain) {
        // Nothing to resolve from (no postcode, no known city): leave the
        // business alone but stop its groups sitting on a placeholder.
        await this.normaliseOwnedGroups(business);
        return business;
      }

      const updated = await this.prisma.business.update({
        where: { id: business.id },
        data: {
          city: chain.city ?? business.city,
          localArea: chain.borough ?? business.localArea,
          highStreet: chain.highStreet ?? business.highStreet,
          localMallName: chain.localMall ?? business.localMallName,
          postcode: chain.postcode ?? business.postcode,
          cityId: chain.cityId ?? business.cityId,
          boroughId: chain.boroughId ?? business.boroughId,
          highStreetId: chain.highStreetId ?? business.highStreetId,
          localMallId: chain.localMallId ?? business.localMallId,
        },
      });
      this.logger.log(
        `Resolved location for ${business.name}: ${[
          chain.city,
          chain.borough,
          chain.highStreet,
          chain.localMall,
        ]
          .filter(Boolean)
          .join(" → ")}`,
      );
      await this.normaliseOwnedGroups(updated);
      return updated;
    } catch (error) {
      const reason = error instanceof Error ? error.message : "unknown error";
      this.logger.warn(
        `Could not resolve the location for ${business.name}: ${reason}`,
      );
      return business;
    }
  }

  /**
   * Groups created while the business had no location are pinned to the
   * placeholder as well. They follow the business once it is resolved, and
   * otherwise become location-free rather than sitting on "Unspecified".
   */
  private async normaliseOwnedGroups(business: Business): Promise<Business> {
    const groups = await this.prisma.group.findMany({
      where: { ownerId: business.id },
      select: {
        id: true,
        city: true,
        localArea: true,
        highStreet: true,
        localMallName: true,
        cityId: true,
      },
    });

    const broken = groups.filter((group) => {
      if (group.cityId) return false;
      const city = group.city?.trim();
      if (!city) return true;
      return (
        UNRESOLVED.has(city.toLowerCase()) || looksLikeAddress(city)
      );
    });
    if (!broken.length) return business;

    const ownerChain = business.cityId
      ? {
          city: business.city,
          localArea: business.localArea,
          highStreet: business.highStreet,
          localMallName: business.localMallName,
          cityId: business.cityId,
          boroughId: business.boroughId,
          highStreetId: business.highStreetId,
          localMallId: business.localMallId,
        }
      : null;

    for (const group of broken) {
      await this.prisma.group.update({
        where: { id: group.id },
        data: ownerChain
          ? {
              city: ownerChain.city,
              localArea: ownerChain.localArea,
              highStreet: ownerChain.highStreet,
              localMallName: ownerChain.localMallName,
              cityId: ownerChain.cityId,
              boroughId: ownerChain.boroughId,
              highStreetId: ownerChain.highStreetId,
              localMallId: ownerChain.localMallId,
            }
          : {
              city: null,
              localArea: null,
              highStreet: null,
              localMallName: null,
              cityId: null,
              boroughId: null,
              highStreetId: null,
              localMallId: null,
            },
      });
    }
    this.logger.log(
      `Cleared the placeholder location on ${broken.length} group(s) of ${business.name}`,
    );
    return business;
  }

  /**
   * Resolve the names already on the row against the Central Hub hierarchy,
   * falling back to the coarser levels when a level is not part of it.
   */
  private async resolveFromNames(
    business: Business,
  ): Promise<(PostcodeChain & { postcode: string | null }) | null> {
    const city = this.cleanName(business.city);
    const borough = this.cleanName(business.localArea);
    const highStreet = this.cleanName(business.highStreet);
    const localMall = this.cleanName(business.localMallName);

    const attempts: Array<{
      city?: string | null;
      borough?: string | null;
      highStreet?: string | null;
      localMall?: string | null;
    }> = [
      { city, borough, highStreet, localMall },
      { city, borough, highStreet },
      { city, borough },
      { city },
    ];

    for (const attempt of attempts) {
      if (!attempt.city) continue;
      try {
        const resolved = await this.geography.resolveSelection({
          city: attempt.city,
          localArea: attempt.borough ?? null,
          highStreet: attempt.highStreet ?? null,
          localMall: attempt.localMall ?? null,
        });
        if (!resolved.cityId) continue;
        return { ...resolved, postcode: business.postcode ?? null };
      } catch {
        // This level combination is not in the hierarchy: try a coarser one.
      }
    }
    return null;
  }

  /** Resolve the chain from the postcode when the names are not usable. */
  private async resolveFromPostcode(
    business: Business,
  ): Promise<(PostcodeChain & { postcode: string | null }) | null> {
    const postcode = this.postcodeFor(business);
    if (!postcode) return null;
    const chain = await this.postcode.resolve(postcode);
    if (!chain?.cityId) return null;
    return { ...chain, postcode };
  }

  /** The postcode of a business, wherever it was recorded. */
  private postcodeFor(business: Business): string | null {
    const stored = business.postcode?.trim();
    if (stored && POSTCODE.test(stored)) return stored;
    // Older rows kept the postcode in the local-area column.
    const legacy = business.localArea?.trim();
    if (legacy && POSTCODE.test(legacy)) return legacy;
    return null;
  }

  private cleanName(value: string | null | undefined): string | null {
    const trimmed = value?.trim();
    if (!trimmed) return null;
    if (UNRESOLVED.has(trimmed.toLowerCase())) return null;
    if (looksLikeAddress(trimmed)) return null;
    return trimmed;
  }
}
