/**
 * Saved locations, backed by IndexedDB.
 *
 * PLAN 4.4 wants multiple cities with nicknames ("Home", "Work"), persisted so
 * they survive a reload and work offline. Phase 2 already put the Dexie schema
 * in place; this is the hook that drives it.
 *
 * `useLiveQuery` re-runs the query whenever the underlying table changes, so
 * adding a city from one component updates the dashboard in another without any
 * manual invalidation. That is the whole reason for the extra dependency.
 */

import { useLiveQuery } from "dexie-react-hooks";
import {
  deleteSavedLocation as deleteRow,
  putSavedLocation,
  db,
} from "../lib/db";
import type { Coordinates, SavedLocation } from "../types/weather";

export interface UseSavedLocationsResult {
  locations: SavedLocation[];
  /** True until the first IndexedDB read settles. */
  isLoading: boolean;
  addLocation: (input: {
    name: string;
    region?: string;
    country?: string;
    coords: Coordinates;
    nickname?: string;
  }) => Promise<SavedLocation>;
  removeLocation: (id: string) => Promise<void>;
  renameLocation: (id: string, nickname: string) => Promise<void>;
  /** True when the coordinate is already saved. */
  isSaved: (coords: Coordinates) => boolean;
}

/** Stable id from a coordinate, so saving the same city twice is a no-op. */
function locationId(coords: Coordinates): string {
  return `${coords.lat.toFixed(3)},${coords.lon.toFixed(3)}`;
}

export function useSavedLocations(): UseSavedLocationsResult {
  const rows = useLiveQuery(() => db.locations.orderBy("addedAt").toArray(), []);

  const locations: SavedLocation[] = (rows ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    region: row.region,
    country: row.country,
    nickname: row.nickname,
    coords: row.coords,
    addedAt: row.addedAt,
  }));

  const addLocation: UseSavedLocationsResult["addLocation"] = async (input) => {
    const saved: SavedLocation = {
      id: locationId(input.coords),
      name: input.name,
      region: input.region,
      country: input.country,
      nickname: input.nickname,
      coords: input.coords,
      addedAt: Date.now(),
    };

    await putSavedLocation(saved);
    return saved;
  };

  const removeLocation = async (id: string) => {
    await deleteRow(id);
  };

  const renameLocation = async (id: string, nickname: string) => {
    const existing = await db.locations.get(id);
    if (!existing) return;
    await putSavedLocation({
      ...existing,
      // An empty nickname means "go back to the place's own name".
      nickname: nickname.trim() || undefined,
    });
  };

  const isSaved = (coords: Coordinates) =>
    locations.some((location) => location.id === locationId(coords));

  return {
    locations,
    isLoading: rows === undefined,
    addLocation,
    removeLocation,
    renameLocation,
    isSaved,
  };
}
