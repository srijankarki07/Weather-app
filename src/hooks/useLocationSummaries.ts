/**
 * Current conditions for several saved cities at once.
 *
 * The dashboard shows one card per saved location, so this fans out with
 * `useQueries` rather than looping a single query — each city gets its own
 * cache entry, its own loading state and its own retry, so one unreachable city
 * degrades to one card instead of emptying the whole strip.
 *
 * The summary endpoint is used rather than the full bundle: a card needs a
 * temperature and a condition, not 48 hourly points and a pollen count.
 */

import { useQueries } from "@tanstack/react-query";
import { fetchLocationSummary, type LocationSummary } from "../api/weather";
import { STALE_TIME } from "../config";
import type { SavedLocation } from "../types/weather";

export interface LocationSummaryResult {
  location: SavedLocation;
  summary: LocationSummary | null;
  isLoading: boolean;
  isError: boolean;
}

export function useLocationSummaries(
  locations: SavedLocation[]
): LocationSummaryResult[] {
  const results = useQueries({
    queries: locations.map((location) => ({
      queryKey: [
        "weather",
        "summary",
        Math.round(location.coords.lat * 1000) / 1000,
        Math.round(location.coords.lon * 1000) / 1000,
      ] as const,
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        fetchLocationSummary({
          lat: location.coords.lat,
          lon: location.coords.lon,
          signal,
        }),
      staleTime: STALE_TIME.current,
      enabled: locations.length > 0,
    })),
  });

  return locations.map((location, index) => {
    const result = results[index];
    return {
      location,
      summary: result?.data ?? null,
      isLoading: result?.isPending ?? true,
      isError: result?.isError ?? false,
    };
  });
}
