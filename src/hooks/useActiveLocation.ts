/**
 * The location the app is currently showing.
 *
 * PLAN 4.4 asks the app to remember what the user chose so a returning visit
 * does not re-trigger the geolocation prompt. The last selection is mirrored to
 * localStorage, which is enough for Phase 1; Phase 3 moves the saved-locations
 * list itself into IndexedDB and this hook starts reading from there.
 */

import { useCallback, useEffect, useState } from "react";
import { DEFAULT_LOCATION } from "../config";
import type { Coordinates } from "../types/weather";

const STORAGE_KEY = "mero-mausam:active-location";

export type LocationSource = "geolocation" | "search" | "default";

export interface ActiveLocation {
  coords: Coordinates;
  name: string;
  region?: string;
  country?: string;
  source: LocationSource;
}

const FALLBACK: ActiveLocation = {
  coords: { lat: DEFAULT_LOCATION.lat, lon: DEFAULT_LOCATION.lon },
  name: DEFAULT_LOCATION.name,
  country: DEFAULT_LOCATION.country,
  source: "default",
};

function isFiniteCoord(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function readStored(): ActiveLocation | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ActiveLocation>;
    if (
      !parsed?.coords ||
      !isFiniteCoord(parsed.coords.lat) ||
      !isFiniteCoord(parsed.coords.lon) ||
      typeof parsed.name !== "string"
    ) {
      return null;
    }
    return {
      coords: { lat: parsed.coords.lat, lon: parsed.coords.lon },
      name: parsed.name,
      region: parsed.region,
      country: parsed.country,
      source: parsed.source ?? "search",
    };
  } catch {
    // Private-mode Safari and blocked-storage browsers throw on read; a
    // forgotten location is a much smaller problem than a blank app.
    return null;
  }
}

function writeStored(location: ActiveLocation): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(location));
  } catch {
    // Ignore — persistence is a convenience, not a requirement.
  }
}

export function useActiveLocation() {
  const [location, setLocationState] = useState<ActiveLocation>(
    () => readStored() ?? FALLBACK
  );

  const setLocation = useCallback((next: ActiveLocation) => {
    setLocationState(next);
    writeStored(next);
  }, []);

  const setFromSearch = useCallback(
    (
      coords: Coordinates,
      name: string,
      extra?: { region?: string; country?: string }
    ) => {
      setLocation({
        coords,
        name,
        region: extra?.region,
        country: extra?.country,
        source: "search",
      });
    },
    [setLocation]
  );

  const setFromGeolocation = useCallback(
    (coords: Coordinates, name = "Current location") => {
      setLocation({ coords, name, source: "geolocation" });
    },
    [setLocation]
  );

  return {
    location,
    setLocation,
    setFromSearch,
    setFromGeolocation,
  };
}

/**
 * Keeps the tab title in step with what is on screen, which is the main way a
 * glanceable weather app communicates when it is backgrounded.
 */
export function useDocumentTitle(locationName: string, temperature?: string) {
  useEffect(() => {
    document.title = temperature
      ? `${temperature} · ${locationName} — Mero Mausam`
      : `${locationName} — Mero Mausam`;
  }, [locationName, temperature]);
}
