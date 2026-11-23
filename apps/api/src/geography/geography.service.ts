import {
  BadRequestException,
  Injectable,
  Logger,
  OnModuleInit,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { GeographyClient } from "./geography.client.js";
import type {
  GeographyBorough,
  GeographyBoroughDetail,
  GeographyCity,
  GeographyLocalMall,
  GeographySelection,
  GeographySnapshot,
  GeographySummary,
  ResolvedGeography,
} from "./geography.types.js";

const DEFAULT_TTL_MS = 15 * 60 * 1000;

function clean(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function normalise(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

/**
 * Read-through cache for Central Hub's geography hierarchy.
 *
 * The hierarchy is small and changes rarely, so a short-lived in-memory cache
 * is enough for validation and selectors. Groups never writes geography data;
 * it only stores the resolved ids/names on groups and businesses.
 */
@Injectable()
export class GeographyService implements OnModuleInit {
  private readonly logger = new Logger(GeographyService.name);
  private readonly ttlMs: number;

  private snapshot: GeographySnapshot | null = null;
  private summary: GeographySummary | null = null;
  private fetchedAt: Date | null = null;
  private expiresAt = 0;
  private pending: Promise<GeographySnapshot> | null = null;

  constructor(
    private readonly client: GeographyClient,
    config: ConfigService,
  ) {
    const configured = Number(
      config.get<string>("GEOGRAPHY_CACHE_TTL_MS", "").trim(),
    );
    this.ttlMs =
      Number.isFinite(configured) && configured > 0
        ? configured
        : DEFAULT_TTL_MS;
  }

  onModuleInit(): void {
    // Warm the cache in the background. A Central Hub outage must never stop
    // the Groups API from starting.
    void this.getSnapshot().catch((error: unknown) => {
      this.logger.warn(
        `Geography cache warm-up skipped: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    });
  }

  async getSnapshot(force = false): Promise<GeographySnapshot> {
    if (!force && this.snapshot && Date.now() < this.expiresAt) {
      return this.snapshot;
    }
    if (this.pending) return this.pending;

    this.pending = this.client
      .fetchSnapshot()
      .then((snapshot) => {
        this.snapshot = snapshot;
        this.summary = null;
        this.fetchedAt = new Date();
        this.expiresAt = Date.now() + this.ttlMs;
        this.logger.log(
          `Geography synced: ${snapshot.cities.length} cities, ` +
            `${snapshot.boroughs.length} boroughs, ` +
            `${snapshot.highStreets.length} high streets, ` +
            `${snapshot.localMalls.length} local malls`,
        );
        return snapshot;
      })
      .finally(() => {
        this.pending = null;
      });

    return this.pending;
  }

  /** Best-effort snapshot for read paths that must not fail on an outage. */
  async getSnapshotOrNull(): Promise<GeographySnapshot | null> {
    try {
      return await this.getSnapshot();
    } catch (error) {
      this.logger.warn(
        `Using ${this.snapshot ? "stale" : "empty"} geography cache: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return this.snapshot;
    }
  }

  async refresh(): Promise<GeographySnapshot> {
    return this.getSnapshot(true);
  }

  /**
   * City → borough summary for selectors. High streets and malls are excluded
   * because the full UK hierarchy is several megabytes; call
   * {@link getBoroughDetail} when the client drills into a borough.
   */
  async getSummary(): Promise<GeographySummary> {
    const snapshot = await this.getSnapshotOrNull();
    if (!snapshot) {
      return {
        available: false,
        version: null,
        syncedAt: null,
        counts: {
          cities: 0,
          boroughs: 0,
          highStreets: 0,
          localMalls: 0,
        },
        cities: [],
      };
    }
    if (this.summary) return this.summary;

    const highStreetCounts = new Map<string, number>();
    for (const highStreet of snapshot.highStreets) {
      if (!highStreet.boroughId) continue;
      highStreetCounts.set(
        highStreet.boroughId,
        (highStreetCounts.get(highStreet.boroughId) ?? 0) + 1,
      );
    }

    const mallCounts = new Map<string, number>();
    for (const mall of snapshot.localMalls) {
      if (!mall.boroughId) continue;
      mallCounts.set(
        mall.boroughId,
        (mallCounts.get(mall.boroughId) ?? 0) + 1,
      );
    }

    const boroughsByCity = new Map<
      string,
      GeographySummary["cities"][number]["boroughs"]
    >();
    for (const borough of snapshot.boroughs) {
      if (!borough.cityId) continue;
      const list = boroughsByCity.get(borough.cityId) ?? [];
      list.push({
        id: borough.id,
        cityId: borough.cityId,
        name: borough.name,
        gssCode: borough.gssCode,
        highStreetCount: highStreetCounts.get(borough.id) ?? 0,
        localMallCount: mallCounts.get(borough.id) ?? 0,
      });
      boroughsByCity.set(borough.cityId, list);
    }

    this.summary = {
      available: true,
      version: snapshot.version,
      syncedAt: this.fetchedAt?.toISOString() ?? snapshot.generatedAt,
      counts: {
        cities: snapshot.cities.length,
        boroughs: snapshot.boroughs.length,
        highStreets: snapshot.highStreets.length,
        localMalls: snapshot.localMalls.length,
      },
      cities: snapshot.cities.map((city) => ({
        ...city,
        boroughs: boroughsByCity.get(city.id) ?? [],
      })),
    };
    return this.summary;
  }

  /** High streets and malls for one borough, loaded on demand. */
  async getBoroughDetail(
    boroughId: string,
  ): Promise<GeographyBoroughDetail> {
    const snapshot = await this.getSnapshotOrNull();
    if (!snapshot) {
      return {
        available: false,
        boroughId,
        highStreets: [],
        localMalls: [],
      };
    }

    const mallsByHighStreet = new Map<string, GeographyLocalMall[]>();
    for (const mall of snapshot.localMalls) {
      if (!mall.highStreetId) continue;
      const list = mallsByHighStreet.get(mall.highStreetId) ?? [];
      list.push(mall);
      mallsByHighStreet.set(mall.highStreetId, list);
    }

    return {
      available: true,
      boroughId,
      highStreets: snapshot.highStreets
        .filter((highStreet) => highStreet.boroughId === boroughId)
        .map((highStreet) => ({
          ...highStreet,
          localMalls: mallsByHighStreet.get(highStreet.id) ?? [],
        })),
      localMalls: snapshot.localMalls.filter(
        (mall) => mall.boroughId === boroughId,
      ),
    };
  }

  /**
   * Resolve a client selection against the Central Hub hierarchy.
   *
   * Every supplied level must exist. Missing parents are inferred from the
   * deepest selection (a mall implies its high street, borough and city), and
   * the returned names use Central Hub's canonical casing.
   */
  async resolveSelection(
    selection: GeographySelection,
  ): Promise<ResolvedGeography> {
    const cityName = clean(selection.city);
    const boroughName = clean(selection.borough) ?? clean(selection.localArea);
    const highStreetName = clean(selection.highStreet);
    const localMallName = clean(selection.localMall);

    const empty: ResolvedGeography = {
      cityId: null,
      city: cityName,
      boroughId: null,
      borough: boroughName,
      highStreetId: null,
      highStreet: highStreetName,
      localMallId: null,
      localMall: localMallName,
    };

    if (
      !cityName &&
      !boroughName &&
      !highStreetName &&
      !localMallName
    ) {
      return empty;
    }

    const snapshot = await this.getSnapshotOrNull();
    // Degraded mode: Central Hub is unreachable and nothing is cached. Keep
    // the client's labels rather than blocking group creation.
    if (!snapshot) return empty;

    let city: GeographyCity | null = cityName
      ? this.findByName(snapshot.cities, cityName)
      : null;
    if (cityName && !city) {
      throw new BadRequestException(
        `City "${cityName}" is not in the Central Hub geography hierarchy.`,
      );
    }

    let borough: GeographyBorough | null = null;
    if (boroughName) {
      const pool = city
        ? snapshot.boroughs.filter((entry) => entry.cityId === city!.id)
        : snapshot.boroughs;
      borough = this.findByName(pool, boroughName);
      if (!borough) {
        throw new BadRequestException(
          city
            ? `Borough "${boroughName}" is not configured for ${city.name}.`
            : `Borough "${boroughName}" is not in the Central Hub geography hierarchy.`,
        );
      }
      city =
        snapshot.cities.find((entry) => entry.id === borough!.cityId) ?? city;
    }

    let highStreet: GeographySnapshot["highStreets"][number] | null = null;
    if (highStreetName) {
      const pool = borough
        ? snapshot.highStreets.filter(
            (entry) => entry.boroughId === borough!.id,
          )
        : city
          ? snapshot.highStreets.filter((entry) => entry.cityId === city!.id)
          : snapshot.highStreets;
      highStreet = this.findByName(pool, highStreetName);
      if (!highStreet) {
        throw new BadRequestException(
          `High street "${highStreetName}" is not in the Central Hub geography hierarchy.`,
        );
      }
      if (!borough && highStreet.boroughId) {
        borough =
          snapshot.boroughs.find(
            (entry) => entry.id === highStreet!.boroughId,
          ) ?? null;
      }
      if (!city && highStreet.cityId) {
        city =
          snapshot.cities.find((entry) => entry.id === highStreet!.cityId) ??
          city;
      }
    }

    let localMall: GeographyLocalMall | null = null;
    if (localMallName) {
      const pool = highStreet
        ? snapshot.localMalls.filter(
            (entry) => entry.highStreetId === highStreet!.id,
          )
        : borough
          ? snapshot.localMalls.filter(
              (entry) => entry.boroughId === borough!.id,
            )
          : snapshot.localMalls;
      localMall = this.findByName(pool, localMallName);
      if (!localMall) {
        throw new BadRequestException(
          `Local mall "${localMallName}" is not in the Central Hub geography hierarchy.`,
        );
      }
      if (!highStreet && localMall.highStreetId) {
        highStreet =
          snapshot.highStreets.find(
            (entry) => entry.id === localMall!.highStreetId,
          ) ?? null;
      }
      if (!borough && localMall.boroughId) {
        borough =
          snapshot.boroughs.find(
            (entry) => entry.id === localMall!.boroughId,
          ) ?? null;
      }
      if (!city && localMall.cityId) {
        city =
          snapshot.cities.find((entry) => entry.id === localMall!.cityId) ??
          city;
      }
    }

    return {
      cityId: city?.id ?? null,
      city: city?.name ?? cityName,
      boroughId: borough?.id ?? null,
      borough: borough?.name ?? boroughName,
      highStreetId: highStreet?.id ?? null,
      highStreet: highStreet?.name ?? highStreetName,
      localMallId: localMall?.id ?? null,
      localMall: localMall?.name ?? localMallName,
    };
  }

  private findByName<T extends { name: string }>(
    rows: T[],
    name: string,
  ): T | null {
    const wanted = normalise(name);
    return rows.find((row) => normalise(row.name) === wanted) ?? null;
  }

}
