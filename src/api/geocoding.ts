/**
 * Place-name lookup.
 *
 * Two directions, two services, neither of which needs an API key:
 *
 *  - search  → Open-Meteo's geocoding API (city name to coordinates)
 *  - reverse → BigDataCloud's client endpoint (coordinates to a place name)
 *
 * Open-Meteo has no reverse endpoint; its `/v1/reverse` path 404s. That matters
 * because a geolocated visitor has coordinates and no name, and without a
 * reverse lookup the UI would have to invent one.
 */

import { BIGDATACLOUD_REVERSE_BASE, OPEN_METEO_GEOCODE_BASE } from "../config";
import { buildQuery, getJson } from "./http";

export interface GeocodingResult {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  country?: string;
  countryCode?: string;
  region?: string;
}

/* --------------------------------------------------------------- search */

interface OpenMeteoGeocodeEntry {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  country?: string;
  country_code?: string;
  admin1?: string;
  population?: number;
  feature_code?: string;
}

export async function searchLocations(
  query: string,
  options: { signal?: AbortSignal; count?: number } = {}
): Promise<GeocodingResult[]> {
  const trimmed = query.trim();
  // A single character matches most of the planet, so wait for a second one.
  if (trimmed.length < 2) return [];

  const { signal, count = 8 } = options;
  const search = buildQuery({
    name: trimmed,
    count,
    language: "en",
    format: "json",
  });

  const raw = await getJson<{ results?: OpenMeteoGeocodeEntry[] }>(
    `${OPEN_METEO_GEOCODE_BASE}/search?${search}`,
    { signal, timeoutMs: 8000 }
  );

  const results = (raw.results ?? []).map((entry) => ({
    id: String(entry.id),
    name: entry.name,
    latitude: entry.latitude,
    longitude: entry.longitude,
    country: entry.country,
    countryCode: entry.country_code,
    region: entry.admin1,
  }));

  /*
   * Open-Meteo has no relevance score, and its response order is rough. Sorting
   * by population puts "Paris, France" above "Paris, Texas" for a user typing
   * "paris", which is the behaviour that matches expectation. Places without a
   * population sink below those with one.
   */
  const populationOf = new Map(
    (raw.results ?? []).map((entry) => [String(entry.id), entry.population ?? 0])
  );
  results.sort(
    (a, b) => (populationOf.get(b.id) ?? 0) - (populationOf.get(a.id) ?? 0)
  );

  return results;
}

/* -------------------------------------------------------------- reverse */

interface BigDataCloudResponse {
  city?: string;
  locality?: string;
  principalSubdivision?: string;
  countryName?: string;
  countryCode?: string;
}

/** Rejects the placeholder strings BigDataCloud returns over open ocean. */
function meaningful(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (trimmed.length === 0) return undefined;
  return trimmed;
}

export async function reverseGeocode(
  lat: number,
  lon: number,
  options: { signal?: AbortSignal } = {}
): Promise<GeocodingResult | null> {
  const query = buildQuery({
    latitude: lat,
    longitude: lon,
    localityLanguage: "en",
  });

  try {
    const raw = await getJson<BigDataCloudResponse>(
      `${BIGDATACLOUD_REVERSE_BASE}?${query}`,
      { signal: options.signal, timeoutMs: 8000 }
    );

    // `city` is the broad answer ("Tokyo"); `locality` is the finer one
    // ("Suginami-ku"). Prefer the broad one, since the weather grid is coarse
    // enough that a ward name over-promises precision.
    const name =
      meaningful(raw.city) ??
      meaningful(raw.locality) ??
      meaningful(raw.principalSubdivision);

    if (!name) return null;

    return {
      id: `${lat.toFixed(3)},${lon.toFixed(3)}`,
      name,
      latitude: lat,
      longitude: lon,
      region: meaningful(raw.principalSubdivision),
      country: meaningful(raw.countryCode),
    };
  } catch {
    /*
     * Reverse geocoding is a nicety. A failure here should not break the
     * forecast, which already knows the coordinates it was asked about — the
     * caller falls back to a generic label.
     */
    return null;
  }
}
