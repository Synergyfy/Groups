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
      // A chain that was resolved before the hierarchy was known may not hang
      // together (a borough under the wrong city). Repair it once.
      const repaired = await this.repairChain(business);
      if (repaired) await this.normaliseOwnedGroups(repaired);
      return repaired ?? business;
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
    const reconciled = await this.reconcileWithHierarchy(chain);
    return { ...reconciled, postcode };
  }

  /**
   * Repair a stored chain whose levels do not hang together.
   *
   * Returns the updated business, or null when the chain is already
   * consistent and nothing needs to change.
   */
  private async repairChain(business: Business): Promise<Business | null> {
    const snapshot = await this.geography.getSnapshotOrNull();
    if (!snapshot) return null;

    const city = snapshot.cities.find((entry) => entry.id === business.cityId);
    const borough = business.boroughId
      ? snapshot.boroughs.find((entry) => entry.id === business.boroughId)
      : null;
    const street = business.highStreetId
      ? snapshot.highStreets.find((entry) => entry.id === business.highStreetId)
      : null;
    const mall = business.localMallId
      ? snapshot.localMalls.find((entry) => entry.id === business.localMallId)
      : null;

    const consistent =
      (!borough || !city || borough.cityId === city.id) &&
      (!street || !borough || street.boroughId === borough.id) &&
      (!mall || !street || mall.highStreetId === street.id);
    if (consistent) return null;

    const reconciled = await this.reconcileWithHierarchy({
      cityId: business.cityId,
      city: business.city,
      boroughId: business.boroughId,
      borough: business.localArea,
      highStreetId: business.highStreetId,
      highStreet: business.highStreet,
      localMallId: business.localMallId,
      localMall: business.localMallName,
    });

    this.logger.log(
      `Repaired the location chain for ${business.name}: ${[
        reconciled.city,
        reconciled.borough,
        reconciled.highStreet,
        reconciled.localMall,
      ]
        .filter(Boolean)
        .join(" → ")}`,
    );

    return this.prisma.business.update({
      where: { id: business.id },
      data: {
        city: reconciled.city ?? business.city,
        localArea: reconciled.borough ?? business.localArea,
        highStreet: reconciled.highStreet ?? business.highStreet,
        localMallName: reconciled.localMall ?? business.localMallName,
        cityId: reconciled.cityId ?? business.cityId,
        boroughId: reconciled.boroughId ?? business.boroughId,
        highStreetId: reconciled.highStreetId ?? business.highStreetId,
        localMallId: reconciled.localMallId ?? business.localMallId,
      },
    });
  }

  /**
   * Make a chain consistent with the hierarchy.
   *
   * The postcode lookup resolves each level on its own, so it can answer with
   * a borough that belongs to a different city (or a mall that sits on another
   * street). The deepest level is the anchor: its parents are taken from the
   * hierarchy, so the stored chain always hangs together.
   */  private async reconcileWithHierarchy(
    chain: PostcodeChain,
  ): Promise<PostcodeChain> {
    const snapshot = await this.geography.getSnapshotOrNull();
    if (!snapshot) return chain;

    const city = (id: string | null) =>
      snapshot.cities.find((entry) => entry.id === id) ?? null;
    const borough = (id: string | null) =>
      snapshot.boroughs.find((entry) => entry.id === id) ?? null;
    const highStreet = (id: string | null) =>
      snapshot.highStreets.find((entry) => entry.id === id) ?? null;

    const mall = chain.localMallId
      ? snapshot.localMalls.find((entry) => entry.id === chain.localMallId)
      : snapshot.localMalls.find((entry) => entry.name === chain.localMall);

    if (mall) {
      const street = highStreet(mall.highStreetId);
      const district = borough(mall.boroughId);
      // The city comes from the borough, not from the mall: a mall can point
      // at a wider "city" (a region) while its borough sits in a narrower one.
      const place = city(district?.cityId ?? mall.cityId);
      return {
        cityId: place?.id ?? chain.cityId,
        city: place?.name ?? chain.city,
        boroughId: district?.id ?? chain.boroughId,
        borough: district?.name ?? chain.borough,
        highStreetId: street?.id ?? chain.highStreetId,
        highStreet: street?.name ?? chain.highStreet,
        localMallId: mall.id,
        localMall: mall.name,
      };
    }

    const street = chain.highStreetId
      ? highStreet(chain.highStreetId)
      : snapshot.highStreets.find((entry) => entry.name === chain.highStreet);

    if (street) {
      const district = borough(street.boroughId);
      const place = city(district?.cityId ?? street.cityId);
      return {
        cityId: place?.id ?? chain.cityId,
        city: place?.name ?? chain.city,
        boroughId: district?.id ?? chain.boroughId,
        borough: district?.name ?? chain.borough,
        highStreetId: street.id,
        highStreet: street.name,
        localMallId: chain.localMallId,
        localMall: chain.localMall,
      };
    }

    const district = chain.boroughId
      ? borough(chain.boroughId)
      : snapshot.boroughs.find((entry) => entry.name === chain.borough);

    if (district) {
      const place = city(district.cityId);
      return {
        cityId: place?.id ?? chain.cityId,
        city: place?.name ?? chain.city,
        boroughId: district.id,
        borough: district.name,
        highStreetId: chain.highStreetId,
        highStreet: chain.highStreet,
        localMallId: chain.localMallId,
        localMall: chain.localMall,
      };
    }

    return chain;
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
