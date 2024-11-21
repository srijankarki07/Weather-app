/**
 * IndexedDB persistence.
 *
 * PLAN 5.2: "Persist saved locations and last-forecast to IndexedDB. On app
 * load, hydrate from IndexedDB first, then fetch fresh data in the background."
 * PLAN 4.8 wants the app to display the last-known forecast with no network at
 * all.
 *
 * Dexie is used rather than localStorage because the payload is a structured
 * object of a few hundred hourly points and IndexedDB stores it as an object
 * rather than a string — no JSON round trip on every read, and no 5 MB ceiling.
 *
 * Every accessor swallows its own errors. Private-mode Safari and blocked-storage
 * browsers throw on open, and a cache that cannot be read must degrade to "no
 * offline copy" rather than taking the app down with it.
 */

import Dexie, { type Table } from "dexie";
import { MAX_CACHE_AGE } from "../config";
import type { SavedLocation, WeatherData } from "../types/weather";

export interface CachedForecast {
  /** Coordinate key, matching the query key rounding. */
  key: string;
  data: WeatherData;
  /** When the payload was written, for the staleness check. */
  cachedAt: number;
}

export interface LocationRecord extends SavedLocation {
  id: string;
}

class MeroMausamDatabase extends Dexie {
  forecasts!: Table<CachedForecast, string>;
  locations!: Table<LocationRecord, string>;

  constructor() {
    super("mero-mausam");
    this.version(1).stores({
      // `cachedAt` is indexed so expired rows can be pruned without a scan.
      forecasts: "key, cachedAt",
      // Phase 3 uses this; declared now so the schema does not need a migration.
      locations: "id, addedAt",
    });
  }
}

export const db = new MeroMausamDatabase();

/** Storage may be unavailable; this is not an error worth surfacing. */
async function safely<T>(operation: () => Promise<T>): Promise<T | null> {
  try {
    return await operation();
  } catch {
    return null;
  }
}

/** Same rounding as the query key, so the cache and the cache key agree. */
export function forecastCacheKey(lat: number, lon: number): string {
  return `${Math.round(lat * 1000) / 1000},${Math.round(lon * 1000) / 1000}`;
}

export async function writeCachedForecast(
  lat: number,
  lon: number,
  data: WeatherData
): Promise<void> {
  await safely(() =>
    db.forecasts.put({
      key: forecastCacheKey(lat, lon),
      data,
      cachedAt: Date.now(),
    })
  );
}

/**
 * Reads the cached forecast for a coordinate, if one is recent enough to show.
 * `MAX_CACHE_AGE` bounds how stale a fallback can be — a two-day-old forecast
 * is worse than admitting we have nothing.
 */
export async function readCachedForecast(
  lat: number,
  lon: number
): Promise<CachedForecast | null> {
  const record = await safely(() =>
    db.forecasts.get(forecastCacheKey(lat, lon))
  );
  if (!record) return null;
  if (Date.now() - record.cachedAt > MAX_CACHE_AGE) return null;
  return record;
}

/** Drops anything past `MAX_CACHE_AGE`. Called once per session. */
export async function pruneExpiredForecasts(): Promise<void> {
  const cutoff = Date.now() - MAX_CACHE_AGE;
  await safely(() => db.forecasts.where("cachedAt").below(cutoff).delete());
}

/* ------------------------------------------------------------ locations */

export async function listSavedLocations(): Promise<LocationRecord[]> {
  const records = await safely(() => db.locations.orderBy("addedAt").toArray());
  return records ?? [];
}

export async function putSavedLocation(
  location: LocationRecord
): Promise<void> {
  await safely(() => db.locations.put(location));
}

export async function deleteSavedLocation(id: string): Promise<void> {
  await safely(() => db.locations.delete(id));
}
