/**
 * Shape of the Central Hub geography snapshot (`GET /api/v1/data/geography`).
 *
 * Central Hub owns the UK reference data (ONS/OSM imports + postcode
 * resolution). Groups mirrors the snapshot in memory and only persists the
 * resolved ids/names on groups and businesses.
 */
export interface GeographyCity {
  id: string;
  name: string;
  region: string | null;
  country: string;
  gssCode: string | null;
}

export interface GeographyBorough {
  id: string;
  cityId: string | null;
  name: string;
  gssCode: string | null;
}

export interface GeographyHighStreet {
  id: string;
  cityId: string | null;
  boroughId: string | null;
  name: string;
  borough: string;
  lat: number | null;
  lng: number | null;
  gssCode: string | null;
}

export interface GeographyLocalMall {
  id: string;
  cityId: string | null;
  boroughId: string | null;
  highStreetId: string | null;
  name: string;
  slug: string;
  borough: string;
  postcodes: string[];
  status: string;
}

export interface GeographySnapshot {
  version: number;
  generatedAt: string;
  cities: GeographyCity[];
  boroughs: GeographyBorough[];
  highStreets: GeographyHighStreet[];
  localMalls: GeographyLocalMall[];
}

/** A location selection supplied by a client. Names are matched case-insensitively. */
export interface GeographySelection {
  city?: string | null;
  localArea?: string | null;
  borough?: string | null;
  highStreet?: string | null;
  localMall?: string | null;
}

/** Lightweight hierarchy used by selectors: city → borough, with counts. */
export interface GeographyBoroughSummary {
  id: string;
  cityId: string | null;
  name: string;
  gssCode: string | null;
  highStreetCount: number;
  localMallCount: number;
}

export interface GeographyCitySummary extends GeographyCity {
  boroughs: GeographyBoroughSummary[];
}

export interface GeographySummary {
  available: boolean;
  version: number | null;
  syncedAt: string | null;
  counts: {
    cities: number;
    boroughs: number;
    highStreets: number;
    localMalls: number;
  };
  cities: GeographyCitySummary[];
}

/** One borough's high streets and malls, loaded on demand. */
export interface GeographyBoroughDetail {
  available: boolean;
  boroughId: string;
  highStreets: Array<
    GeographyHighStreet & { localMalls: GeographyLocalMall[] }
  >;
  localMalls: GeographyLocalMall[];
}

/** Canonical ids and display names resolved from a selection. */
export interface ResolvedGeography {
  cityId: string | null;
  city: string | null;
  boroughId: string | null;
  borough: string | null;
  highStreetId: string | null;
  highStreet: string | null;
  localMallId: string | null;
  localMall: string | null;
}
