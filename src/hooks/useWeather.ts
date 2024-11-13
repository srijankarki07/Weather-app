/**
 * Query hooks — the only place components read weather from.
 *
 * Two queries run for any location: one against the network, and one against
 * IndexedDB that reads whatever the last successful fetch left behind. The
 * network result always wins; the cached one fills the gap while it loads and
 * stands in entirely when it fails. That is PLAN 4.8's "app loads and displays
 * last-known forecast without network" and PLAN 4.6's "never show a blank
 * screen", implemented in one place rather than per card.
 *
 * Cache keys are coordinate-based and rounded, so GPS jitter of a few metres
 * does not produce a new entry on every refetch (PLAN 8 lists request
 * deduplication as a mitigation for rate limits).
 */

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { STALE_TIME } from "../config";
import { fetchWeatherBundle } from "../api/weather";
import { searchLocations, type GeocodingResult } from "../api/geocoding";
import {
  readCachedForecast,
  writeCachedForecast,
  type CachedForecast,
} from "../lib/db";
import type { Coordinates, WeatherData } from "../types/weather";
import type { ActiveLocation } from "./useActiveLocation";
import { useDebouncedValue } from "./useDebouncedValue";

/** Three decimals is ~100 m, well below what a weather grid can resolve. */
function roundCoord(value: number): number {
  return Math.round(value * 1000) / 1000;
}

export const weatherKeys = {
  all: ["weather"] as const,
  bundle: (lat: number, lon: number) =>
    [...weatherKeys.all, "bundle", roundCoord(lat), roundCoord(lon)] as const,
  cached: (lat: number, lon: number) =>
    [...weatherKeys.all, "cached", roundCoord(lat), roundCoord(lon)] as const,
  geocode: (query: string) => ["geocode", query.trim().toLowerCase()] as const,
};

export interface WeatherResult {
  /** Live data if we have it, otherwise the last cached copy. */
  data: WeatherData | null;
  /** When `data` was actually observed upstream. */
  fetchedAt: number | null;
  /**
   * True when `data` came from the cache because the network did not deliver.
   * Drives the stale banner.
   */
  isStale: boolean;
  /** True while the very first fetch is in flight with nothing to show. */
  isFirstLoad: boolean;
  /** True when there is no data and no cache — the only real error state. */
  isUnavailable: boolean;
  error: Error | null;
  isFetching: boolean;
  refetch: () => void;
}

export function useWeather(location: ActiveLocation | null): WeatherResult {
  const coords: Coordinates | null = location?.coords ?? null;
  const lat = coords?.lat ?? 0;
  const lon = coords?.lon ?? 0;
  const enabled = coords !== null;

  const live = useQuery<WeatherData, Error>({
    queryKey: weatherKeys.bundle(lat, lon),
    queryFn: ({ signal }) =>
      fetchWeatherBundle({
        lat,
        lon,
        signal,
        // Passing the known name skips a reverse-geocode round trip.
        label:
          location!.source === "search"
            ? {
                name: location!.name,
                region: location!.region,
                country: location!.country,
              }
            : undefined,
      }),
    enabled,
    staleTime: STALE_TIME.current,
    refetchInterval: 15 * 60 * 1000,
    refetchIntervalInBackground: false,
  });

  /*
   * The offline copy. `staleTime: Infinity` because the row only changes when a
   * fetch succeeds, and this query is not what keeps it fresh — the write
   * effect below is.
   */
  const cached = useQuery<CachedForecast | null, Error>({
    queryKey: weatherKeys.cached(lat, lon),
    queryFn: () => readCachedForecast(lat, lon),
    enabled,
    staleTime: Infinity,
    gcTime: Infinity,
    retry: false,
  });

  // Persist every successful fetch so the next cold start has something.
  useEffect(() => {
    if (!live.data || !enabled) return;
    void writeCachedForecast(lat, lon, live.data);
  }, [live.data, lat, lon, enabled]);

  const liveData = live.data ?? null;
  const cachedData = cached.data?.data ?? null;
  const data = liveData ?? cachedData;

  return {
    data,
    fetchedAt: liveData ? live.dataUpdatedAt : (cached.data?.cachedAt ?? null),
    isStale: !liveData && cachedData !== null,
    isFirstLoad: enabled && live.isPending && data === null,
    isUnavailable: live.isError && data === null,
    error: live.error ?? null,
    isFetching: live.isFetching,
    refetch: () => {
      void live.refetch();
    },
  };
}

/**
 * City search. Debouncing lives here rather than in the component so every
 * consumer gets the same request behaviour.
 */
export function useLocationSearch(
  query: string,
  options: { enabled?: boolean } = {}
) {
  const debounced = useDebouncedValue(query, 300);
  const trimmed = debounced.trim();

  const result = useQuery<GeocodingResult[], Error>({
    queryKey: weatherKeys.geocode(trimmed),
    queryFn: ({ signal }) => searchLocations(trimmed, { signal }),
    enabled: (options.enabled ?? true) && trimmed.length >= 2,
    staleTime: 24 * 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    // Keeps the previous suggestion list visible while the next one loads, so
    // the dropdown does not flicker on every keystroke.
    placeholderData: (previous) => previous,
  });

  return {
    ...result,
    /** True only for a settled, non-empty search — drives the "no results" copy. */
    isEmpty:
      !result.isFetching &&
      result.isSuccess &&
      result.data.length === 0 &&
      trimmed.length >= 2,
    query: trimmed,
  };
}
