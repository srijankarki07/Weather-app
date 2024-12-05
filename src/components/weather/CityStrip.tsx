/**
 * Multi-city dashboard.
 *
 * One card per saved location, with the active city marked. PLAN 4.4's goal is
 * to turn a single-city checker into something you can glance across — which
 * means each card has to load independently, so a city whose forecast fails
 * shows a dash rather than blanking the strip (see `useLocationSummaries`).
 *
 * Each card is both clickable and has its own remove button. Nesting a button
 * inside a button is invalid HTML and breaks keyboard navigation, so the card
 * uses the stretched-target pattern: an invisible full-size button carries the
 * "select this city" action, and the remove control sits above it on the z-axis
 * as a sibling.
 */

import styles from "./CityStrip.module.css";
import { Card } from "../ui/Card";
import { ConditionIcon } from "./ConditionIcon";
import { IconButton } from "../ui/Button";
import { PlusIcon, TrashIcon } from "../ui/icons";
import { useLocationSummaries } from "../../hooks/useLocationSummaries";
import {
  formatTemperature,
  formatTemperatureShort,
  temperatureSymbol,
} from "../../lib/units";
import type { SavedLocation, UnitSystem } from "../../types/weather";

export interface CityStripProps {
  locations: SavedLocation[];
  units: UnitSystem;
  /** Id of the city currently on screen, when it is a saved one. */
  activeId?: string;
  onSelect: (location: SavedLocation) => void;
  onRemove: (id: string) => void;
  /** Saves the city currently on screen. Omitted when already saved. */
  onSaveCurrent?: () => void;
  currentName?: string;
}

/** Matches the id scheme in `useSavedLocations`. */
export function savedLocationId(lat: number, lon: number): string {
  return `${lat.toFixed(3)},${lon.toFixed(3)}`;
}

export function CityStrip({
  locations,
  units,
  activeId,
  onSelect,
  onRemove,
  onSaveCurrent,
  currentName,
}: CityStripProps) {
  const summaries = useLocationSummaries(locations);

  return (
    <Card
      glass
      title="Saved locations"
      subtitle={
        locations.length > 0
          ? `${locations.length} ${locations.length === 1 ? "place" : "places"}`
          : undefined
      }
      titleId="saved-locations-heading"
      action={
        onSaveCurrent ? (
          <IconButton
            variant="labelled"
            label={`Save ${currentName ?? "this location"}`}
            onClick={onSaveCurrent}
          >
            <PlusIcon size={16} />
            <span>Save</span>
          </IconButton>
        ) : undefined
      }
    >
      {locations.length === 0 ? (
        <p className={styles.empty}>
          No saved locations yet. Search for a city and save it to build a
          dashboard you can check at a glance.
        </p>
      ) : (
        <div
          className={styles.strip}
          /* A scroll region needs to be keyboard-reachable, which
             `overflow-x: auto` alone does not provide. */
          tabIndex={0}
          role="group"
          aria-label="Saved locations, horizontally scrollable"
        >
          {summaries.map(({ location, summary, isLoading, isError }) => {
            const isActive = location.id === activeId;
            const displayName = location.nickname || location.name;
            // "—" while loading, and for a city whose forecast did not arrive.
            const reading =
              summary && !isLoading && !isError
                ? `${formatTemperature(summary.temperature, units)}${temperatureSymbol(units)}`
                : "—";

            return (
              <div
                key={location.id}
                className={[styles.card, isActive ? styles.cardActive : null]
                  .filter(Boolean)
                  .join(" ")}
              >
                {/* The whole card is the target; this button is invisible and
                    covers it. Its accessible name describes the action, since
                    none of the card's visible text is inside it. */}
                <button
                  type="button"
                  className={styles.selectButton}
                  onClick={() => onSelect(location)}
                  aria-current={isActive ? "true" : undefined}
                >
                  <span className="visually-hidden">
                    {`Show weather for ${displayName}`}
                  </span>
                </button>

                <span className={styles.name}>
                  {displayName}
                  {location.country && (
                    <span className={styles.country}>{location.country}</span>
                  )}
                </span>

                <ConditionIcon
                  condition={summary?.condition ?? "unknown"}
                  isNight={summary?.isNight}
                  size="2rem"
                  className={styles.icon}
                />

                <span className={styles.temperature}>{reading}</span>

                <span className={styles.range}>
                  {summary && !isLoading && !isError
                    ? `${formatTemperatureShort(summary.high, units)} / ${formatTemperatureShort(summary.low, units)}`
                    : isError
                      ? "Unavailable"
                      : " "}
                </span>

                <div className={styles.cardActions}>
                  <button
                    type="button"
                    className={styles.removeButton}
                    onClick={() => onRemove(location.id)}
                    aria-label={`Remove ${displayName}`}
                  >
                    <TrashIcon size={15} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
