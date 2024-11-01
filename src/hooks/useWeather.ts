/**
 * Query hooks — the only place components read weather from.
 *
 * Cache keys are coordinate-based and rounded, so GPS jitter of a few metres
 * does not produce a new cache entry on every refetch (PLAN 8 lists request
 * deduplication as a mitigation for rate limits).
 */

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { STALE_TIME } from "../config";
import { fetchWeatherBundle } from "../api/weather";
import { searchLocations, type GeocodingResult } from "../api/geocoding";
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
  geocode: (query: string) => ["geocode", query.trim().toLowerCase()] as const,
};

export function useWeather(
  location: ActiveLocation | null
): UseQueryResult<WeatherData, Error> {
  const coords: Coordinates | null = location?.coords ?? null;

  return useQuery<WeatherData, Error>({
    queryKey: weatherKeys.bundle(coords?.lat ?? 0, coords?.lon ?? 0),
    queryFn: ({ signal }) =>
      fetchWeatherBundle({
        lat: coords!.lat,
        lon: coords!.lon,
        signal,
        // Passing the known name skips a reverse-geocode round trip.
        label: location!.source === "search" ? {
          name: location!.name,
          region: location!.region,
          country: location!.country,
        } : undefined,
      }),
    enabled: coords !== null,
    staleTime: STALE_TIME.current,
    // The bundle carries hourly and daily data under one key, so it is only
    // worth refetching on an explicit refresh or a genuine staleness window.
    refetchInterval: 15 * 60 * 1000,
    refetchIntervalInBackground: false,
  });
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
