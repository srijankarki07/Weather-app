/**
 * Global application state.
 *
 * PLAN 5.1 picks Zustand for "saved locations, preferences, theme". This
 * replaces the `useState` + localStorage approach Phase 1 used for the active
 * location, because that information is now read and written from several
 * places — the header, the city cards, the dashboard — and threading it through
 * props would have been worse than a store.
 *
 * Persistence strategy: locations live in IndexedDB (PLAN 5.2) because they are
 * durable user data and belong with the rest of the offline model. The active
 * location and recent searches live in localStorage, because they are
 * session-scale conveniences where a synchronous read on boot matters more than
 * durability — the app needs to know which city to show before the first paint.
 */

import { create } from "zustand";
import type {
  Coordinates,
  SavedLocation,
  UnitSystem,
  UserPreferences,
} from "../types/weather";

const ACTIVE_KEY = "mero-mausam:active-location";
const RECENT_KEY = "mero-mausam:recent-searches";
const PREFS_KEY = "mero-mausam:preferences";

/** PLAN 4.4 asks for the last 5–10; ten is the top of that range. */
const MAX_RECENT = 8;

export type LocationSource = "geolocation" | "search" | "saved" | "default";

export interface ActiveLocation {
  coords: Coordinates;
  name: string;
  region?: string;
  country?: string;
  source: LocationSource;
}

export interface RecentSearch {
  name: string;
  region?: string;
  country?: string;
  coords: Coordinates;
  searchedAt: number;
}

interface AppState {
  /* ---------------------------------------------------------- location */
  activeLocation: ActiveLocation;
  /** True once the stored location has been read; drives the first-load copy. */
  hydrated: boolean;

  setActiveLocation: (location: ActiveLocation) => void;
  setFromSearch: (
    coords: Coordinates,
    name: string,
    extra?: { region?: string; country?: string }
  ) => void;
  setFromGeolocation: (coords: Coordinates, name?: string) => void;
  setFromSaved: (location: SavedLocation) => void;
  /** Lets a resolved reverse-geocode name replace the "Current location" stub. */
  refineActiveName: (
    name: string,
    extra?: { region?: string; country?: string }
  ) => void;

  /* ----------------------------------------------------------- recents */
  recentSearches: RecentSearch[];
  recordSearch: (entry: Omit<RecentSearch, "searchedAt">) => void;
  clearRecentSearches: () => void;

  /* ------------------------------------------------------- preferences */
  preferences: UserPreferences;
  setPreference: <K extends keyof UserPreferences>(
    key: K,
    value: UserPreferences[K]
  ) => void;
}

export const DEFAULT_PREFERENCES: UserPreferences = {
  units: "metric",
  // PLAN 6 principle 5: "Dark mode by default for evening hours".
  theme: "auto",
  highContrast: false,
  reduceMotion: false,
};

/* ------------------------------------------------------------- helpers */

function isFiniteCoord(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

/**
 * Storage access is wrapped because private-mode Safari and blocked-storage
 * browsers throw on both read and write. A forgotten location is a much smaller
 * problem than a blank app.
 */
function readStorage<T>(key: string, validate: (value: unknown) => T | null): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    return validate(JSON.parse(raw));
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore — persistence is a convenience, not a requirement.
  }
}

function validateActiveLocation(value: unknown): ActiveLocation | null {
  const parsed = value as Partial<ActiveLocation> | null;
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
}

function validatePreferences(value: unknown): UserPreferences | null {
  const parsed = value as Partial<UserPreferences> | null;
  if (!parsed || typeof parsed !== "object") return null;
  const units: UnitSystem =
    parsed.units === "imperial" ? "imperial" : DEFAULT_PREFERENCES.units;
  const theme =
    parsed.theme === "light" ||
    parsed.theme === "dark" ||
    parsed.theme === "system"
      ? parsed.theme
      : DEFAULT_PREFERENCES.theme;
  return {
    units,
    theme,
    highContrast: parsed.highContrast === true,
    reduceMotion: parsed.reduceMotion === true,
  };
}

function validateRecents(value: unknown): RecentSearch[] | null {
  if (!Array.isArray(value)) return null;
  return value
    .filter((entry): entry is RecentSearch => {
      const candidate = entry as Partial<RecentSearch>;
      return (
        typeof candidate?.name === "string" &&
        Boolean(candidate.coords) &&
        isFiniteCoord(candidate.coords!.lat) &&
        isFiniteCoord(candidate.coords!.lon)
      );
    })
    .slice(0, MAX_RECENT);
}

/** Where the app points when nothing is stored and location is not granted. */
export const FALLBACK_LOCATION: ActiveLocation = {
  coords: { lat: 27.7172, lon: 85.324 },
  name: "Kathmandu",
  country: "NP",
  source: "default",
};

/* --------------------------------------------------------------- store */

export const useAppStore = create<AppState>((set, get) => ({
  /*
   * Read synchronously at creation rather than in an effect. The app needs to
   * know which city to query before the first render, otherwise every reload
   * fires a request for the default location and then a second one for the real
   * one.
   */
  activeLocation:
    readStorage(ACTIVE_KEY, validateActiveLocation) ?? FALLBACK_LOCATION,
  hydrated: true,

  recentSearches: readStorage(RECENT_KEY, validateRecents) ?? [],

  preferences:
    readStorage(PREFS_KEY, validatePreferences) ?? DEFAULT_PREFERENCES,

  setActiveLocation: (location) => {
    writeStorage(ACTIVE_KEY, location);
    set({ activeLocation: location });
  },

  setFromSearch: (coords, name, extra) => {
    get().setActiveLocation({
      coords,
      name,
      region: extra?.region,
      country: extra?.country,
      source: "search",
    });
  },

  setFromGeolocation: (coords, name = "Current location") => {
    get().setActiveLocation({ coords, name, source: "geolocation" });
  },

  setFromSaved: (location) => {
    get().setActiveLocation({
      coords: location.coords,
      name: location.nickname || location.name,
      region: location.region,
      country: location.country,
      source: "saved",
    });
  },

  refineActiveName: (name, extra) => {
    const current = get().activeLocation;
    // Only fills in a placeholder; never overwrites a name the user chose.
    if (current.source !== "geolocation" || current.name !== "Current location") {
      return;
    }
    get().setActiveLocation({
      ...current,
      name,
      region: extra?.region ?? current.region,
      country: extra?.country ?? current.country,
    });
  },

  recordSearch: (entry) => {
    const key = `${entry.coords.lat.toFixed(3)},${entry.coords.lon.toFixed(3)}`;
    const deduped = get().recentSearches.filter(
      (existing) =>
        `${existing.coords.lat.toFixed(3)},${existing.coords.lon.toFixed(3)}` !==
        key
    );
    const next = [{ ...entry, searchedAt: Date.now() }, ...deduped].slice(
      0,
      MAX_RECENT
    );
    writeStorage(RECENT_KEY, next);
    set({ recentSearches: next });
  },

  clearRecentSearches: () => {
    writeStorage(RECENT_KEY, []);
    set({ recentSearches: [] });
  },

  setPreference: (key, value) => {
    const next = { ...get().preferences, [key]: value };
    writeStorage(PREFS_KEY, next);
    set({ preferences: next });
  },
}));
