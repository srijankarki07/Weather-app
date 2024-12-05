/**
 * Sticky header: wordmark, city search and the geolocation control.
 *
 * The search field is a real combobox — `role="combobox"` with a listbox
 * popup — rather than an input with a click-only dropdown, because PLAN 4.7
 * requires every control to be reachable and operable from the keyboard. The
 * active option is tracked in state and published through
 * `aria-activedescendant`, so focus never leaves the input while the user
 * arrows through results.
 */

import { useEffect, useId, useRef, useState } from "react";
import styles from "./SearchBar.module.css";
import { LocationIcon, SearchIcon, SpinnerIcon, SunIcon } from "../ui/icons";
import { useLocationSearch } from "../../hooks/useWeather";
import type { GeolocationStatus } from "../../hooks/useGeolocation";
import type { RecentSearch } from "../../store/useAppStore";
import type { Coordinates } from "../../types/weather";

export interface SearchBarProps {
  onSelect: (
    coords: Coordinates,
    name: string,
    extra?: { region?: string; country?: string }
  ) => void;
  onUseCurrentLocation: () => void;
  geolocationStatus: GeolocationStatus;
  /** Shown in the dropdown before the user has typed anything. */
  recentSearches?: RecentSearch[];
  onClearRecent?: () => void;
}

export function SearchBar({
  onSelect,
  onUseCurrentLocation,
  geolocationStatus,
  recentSearches = [],
  onClearRecent,
}: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const listboxId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: results, isFetching, isEmpty, query: settledQuery } =
    useLocationSearch(query, { enabled: open });

  const suggestions = results ?? [];
  const showSuggestions = open && settledQuery.length >= 2;
  /*
   * Recents only appear while the field is empty. Once someone is typing, the
   * list they want is the one matching what they typed — showing history
   * underneath it is noise that pushes the results down.
   */
  const showRecents =
    open && query.trim().length < 2 && recentSearches.length > 0;
  const showPopup = showSuggestions || showRecents;

  // Reset the highlight whenever the result set changes underneath it, so the
  // active option can never point at a row that no longer exists.
  useEffect(() => {
    setActiveIndex(-1);
  }, [settledQuery]);

  // Close on outside interaction. `pointerdown` rather than `click` so the
  // popup is gone before the underlying element receives focus.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  const close = () => {
    setQuery("");
    setOpen(false);
    setActiveIndex(-1);
    inputRef.current?.blur();
  };

  const chooseRecent = (entry: RecentSearch) => {
    onSelect(entry.coords, entry.name, {
      region: entry.region,
      country: entry.country,
    });
    close();
  };

  const choose = (index: number) => {
    const place = suggestions[index];
    if (!place) return;
    onSelect(
      { lat: place.latitude, lon: place.longitude },
      place.name,
      {
        region: place.region,
        country: place.countryCode ?? place.country,
      }
    );
    setQuery("");
    setOpen(false);
    setActiveIndex(-1);
    inputRef.current?.blur();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((prev) => Math.min(prev + 1, suggestions.length - 1));
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((prev) => Math.max(prev - 1, -1));
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      // Enter with nothing highlighted takes the top result, which is what a
      // user typing a full city name expects.
      choose(activeIndex >= 0 ? activeIndex : 0);
      return;
    }
    if (event.key === "Escape") {
      setOpen(false);
      setActiveIndex(-1);
    }
  };

  const isLocating = geolocationStatus === "requesting";
  const locationBlocked =
    geolocationStatus === "denied" || geolocationStatus === "unavailable";

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <div className={styles.wordmark}>
          <SunIcon size={22} />
          <span className={styles.wordmarkText}>Mero Mausam</span>
        </div>

        <div className={styles.search} ref={containerRef}>
          <div className={styles.field}>
            <label className="visually-hidden" htmlFor={`${listboxId}-input`}>
              Search for a city
            </label>
            <input
              id={`${listboxId}-input`}
              ref={inputRef}
              className={styles.input}
              type="text"
              value={query}
              placeholder="Search for a city"
              autoComplete="off"
              role="combobox"
              aria-expanded={showPopup}
              aria-controls={listboxId}
              aria-autocomplete="list"
              aria-haspopup="listbox"
              aria-activedescendant={
                activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined
              }
              onChange={(event) => {
                setQuery(event.target.value);
                setOpen(true);
              }}
              onFocus={() => setOpen(true)}
              onKeyDown={handleKeyDown}
            />
            <button
              type="button"
              className={styles.orb}
              onClick={() => choose(activeIndex >= 0 ? activeIndex : 0)}
              disabled={suggestions.length === 0}
              aria-label="Search"
            >
              <SearchIcon size={18} />
            </button>
          </div>

          {showPopup && (
            <ul
              className={styles.suggestions}
              id={listboxId}
              role="listbox"
              aria-label={
                showSuggestions ? "City suggestions" : "Recent searches"
              }
            >
              {showRecents && (
                <li className={styles.recentsHeader} role="presentation">
                  <span>Recent</span>
                  {onClearRecent && (
                    <button
                      type="button"
                      className={styles.clearRecents}
                      onClick={() => {
                        onClearRecent();
                        inputRef.current?.focus();
                      }}
                    >
                      Clear
                    </button>
                  )}
                </li>
              )}

              {showRecents &&
                recentSearches.map((entry) => (
                  <li key={`${entry.coords.lat},${entry.coords.lon}`}>
                    <button
                      type="button"
                      role="option"
                      aria-selected="false"
                      className={styles.suggestion}
                      onClick={() => chooseRecent(entry)}
                    >
                      <span className={styles.suggestionName}>{entry.name}</span>
                      <span className={styles.suggestionMeta}>
                        {[entry.region, entry.country].filter(Boolean).join(", ")}
                      </span>
                    </button>
                  </li>
                ))}

              {showSuggestions &&
                suggestions.map((place, index) => (
                <li key={place.id}>
                  <button
                    type="button"
                    id={`${listboxId}-option-${index}`}
                    role="option"
                    aria-selected={index === activeIndex}
                    className={[
                      styles.suggestion,
                      index === activeIndex ? styles.suggestionActive : null,
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    /*
                     * `onClick`, not `onPointerDown`. Pointer events are not
                     * fired by keyboard activation or by assistive technology,
                     * so a pointerdown-only handler would make the suggestion
                     * unusable without a mouse. The popup only closes on an
                     * outside pointerdown (see the effect above) or on Escape,
                     * so there is no blur race to work around here.
                     */
                    onClick={() => choose(index)}
                    onMouseEnter={() => setActiveIndex(index)}
                  >
                    <span className={styles.suggestionName}>{place.name}</span>
                    <span className={styles.suggestionMeta}>
                      {[place.region, place.country].filter(Boolean).join(", ")}
                    </span>
                  </button>
                </li>
              ))}

              {showSuggestions && isEmpty && (
                <li className={styles.suggestionEmpty} role="presentation">
                  No places match “{settledQuery}”.
                </li>
              )}
              {showSuggestions && isFetching && suggestions.length === 0 && (
                <li className={styles.suggestionEmpty} role="presentation">
                  Searching…
                </li>
              )}
            </ul>
          )}
        </div>

        <button
          type="button"
          className={styles.locationButton}
          onClick={onUseCurrentLocation}
          disabled={isLocating || locationBlocked}
          aria-label={
            locationBlocked
              ? "Location access is blocked in your browser"
              : "Use my current location"
          }
          title={
            locationBlocked
              ? "Location access is blocked — search for a city instead"
              : undefined
          }
        >
          {isLocating ? (
            <SpinnerIcon className={styles.spinner} size={20} />
          ) : (
            <LocationIcon size={20} />
          )}
          <span className={styles.locationLabel}>
            {isLocating ? "Locating…" : "My location"}
          </span>
        </button>
      </div>
    </header>
  );
}
