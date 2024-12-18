/**
 * Application root.
 *
 * Everything below the header is derived from one `useWeather` call, so there
 * is a single loading, error and stale path rather than one per card. That
 * matters for PLAN 4.6's "never show a blank screen": because the fallback to
 * cached data happens in the hook, every card benefits without knowing it
 * exists.
 */

import { useCallback, useEffect, useMemo } from "react";
import { QueryClientProvider } from "@tanstack/react-query";

import { AppShell, AppStack, AppStackFull } from "./components/layout/AppShell";
import { SearchBar } from "./components/weather/SearchBar";
import { HeroCard } from "./components/weather/HeroCard";
import { NowcastBanner } from "./components/weather/NowcastBanner";
import { ForecastTabs } from "./components/weather/ForecastTabs";
import { DailyForecast } from "./components/weather/DailyForecast";
import { HighlightsGrid } from "./components/weather/HighlightsGrid";
import { SunArc } from "./components/weather/SunArc";
import { CityStrip, savedLocationId } from "./components/weather/CityStrip";
import { AlertBanner } from "./components/weather/AlertBanner";
import { WeatherSkeleton } from "./components/weather/WeatherSkeleton";
import { ErrorState, StaleBanner, Announcer } from "./components/ui/ErrorState";
import { Button } from "./components/ui/Button";
import { SettingsMenu } from "./components/ui/SettingsMenu";
import { UpdatePrompt } from "./components/ui/UpdatePrompt";

import { queryClient } from "./lib/queryClient";
import { pruneExpiredForecasts } from "./lib/db";
import { useWeather } from "./hooks/useWeather";
import { useGeolocation } from "./hooks/useGeolocation";
import { useOnlineStatus } from "./hooks/useOnlineStatus";
import { useSavedLocations } from "./hooks/useSavedLocations";
import { useDocumentTitle } from "./hooks/useDocumentTitle";
import { useThemeEffect } from "./hooks/useThemeEffect";
import { useWeatherNotifications } from "./hooks/useWeatherNotifications";
import { useAppShortcut } from "./hooks/useAppShortcut";
import { usePrefetchChunks } from "./hooks/usePrefetchChunks";
import { useAppStore } from "./store/useAppStore";
import { formatTemperatureShort } from "./lib/units";
import { formatRelativePast } from "./lib/time";
import type { UnitSystem } from "./types/weather";

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WeatherApp />
    </QueryClientProvider>
  );
}

function WeatherApp() {
  const activeLocation = useAppStore((state) => state.activeLocation);
  const setFromSearch = useAppStore((state) => state.setFromSearch);
  const setFromGeolocation = useAppStore((state) => state.setFromGeolocation);
  const setFromSaved = useAppStore((state) => state.setFromSaved);
  const recordSearch = useAppStore((state) => state.recordSearch);
  const recentSearches = useAppStore((state) => state.recentSearches);
  const clearRecentSearches = useAppStore((state) => state.clearRecentSearches);

  const preferences = useAppStore((state) => state.preferences);
  const setPreference = useAppStore((state) => state.setPreference);

  const geolocation = useGeolocation();
  const online = useOnlineStatus();
  const weather = useWeather(activeLocation);
  const saved = useSavedLocations();
  const notifications = useWeatherNotifications();

  const data = weather.data;

  /*
   * The theme follows the *active location's* day/night, not the browser's —
   * looking at Sydney from London after dark should show Sydney in daylight.
   */
  useThemeEffect({
    preference: preferences.theme,
    highContrast: preferences.highContrast,
    reduceMotion: preferences.reduceMotion,
    isNight: data?.current.isNight,
    timezone: data?.location.timezone,
  });

  const units: UnitSystem = preferences.units;
  const condition = data?.current.condition;
  const isNight = data?.current.isNight ?? false;
  const placeName = data?.location.name ?? activeLocation.name;

  useDocumentTitle(
    placeName,
    data ? formatTemperatureShort(data.current.temperature, units) : undefined
  );

  useEffect(() => {
    void pruneExpiredForecasts();
  }, []);

  // Raise a notification when a severe alert arrives for the city on screen.
  useEffect(() => {
    if (!data || data.alerts.length === 0) return;
    void notifications.notifyFor(data.alerts, data.location.name);
    // `notifyFor` already de-duplicates by alert id, so this only fires for
    // genuinely new alerts; the dependency on `data` is what triggers it.
  }, [data, notifications]);

  const announcement = useMemo(() => {
    if (!data) return "";
    return `${data.location.name}: ${Math.round(
      data.current.temperature
    )} degrees, ${data.current.description.toLowerCase()}.`;
  }, [data]);

  const handleSelect = useCallback(
    (
      coords: { lat: number; lon: number },
      name: string,
      extra?: { region?: string; country?: string }
    ) => {
      setFromSearch(coords, name, extra);
      // PLAN 4.4's recent searches: recorded on selection, not on keystroke,
      // so a half-typed query never lands in the history.
      recordSearch({ coords, name, region: extra?.region, country: extra?.country });
    },
    [setFromSearch, recordSearch]
  );

  const handleUseCurrentLocation = useCallback(async () => {
    const coords = await geolocation.request();
    if (coords) setFromGeolocation(coords);
  }, [geolocation, setFromGeolocation]);

  // `/?here=1` — the PWA's "My location" launch shortcut.
  useAppShortcut(handleUseCurrentLocation);

  /*
   * Warm the chart and map chunks once the forecast is on screen and the
   * browser is idle. Doing it after `data` arrives rather than on mount keeps
   * the prefetch from competing with the request that fills the page.
   */
  usePrefetchChunks(Boolean(data));

  const activeId = savedLocationId(
    activeLocation.coords.lat,
    activeLocation.coords.lon
  );
  const isCurrentSaved = saved.locations.some((row) => row.id === activeId);

  const handleSaveCurrent = async () => {
    await saved.addLocation({
      name: activeLocation.name,
      region: activeLocation.region,
      country: activeLocation.country,
      coords: activeLocation.coords,
    });
  };

  return (
    <AppShell
      condition={condition}
      isNight={isNight}
      header={
        <SearchBar
          onSelect={handleSelect}
          onUseCurrentLocation={handleUseCurrentLocation}
          geolocationStatus={geolocation.status}
          recentSearches={recentSearches}
          onClearRecent={clearRecentSearches}
          settings={
            <SettingsMenu
              preferences={preferences}
              onChange={setPreference}
              notificationPermission={notifications.permission}
              onEnableNotifications={notifications.requestPermission}
            />
          }
        />
      }
    >
      {/* Keyboard users can jump the header instead of tabbing through it. */}
      <a className="focus-reveal" href="#forecast">
        Skip to forecast
      </a>

      <Announcer message={announcement} />

      <AppStack>
        <UpdatePrompt />

        {/*
          Alerts sit above everything including the stale banner: if there is a
          tornado warning, it outranks the fact that the temperature is twenty
          minutes old.
        */}
        {data && data.alerts.length > 0 && (
          <AppStackFull>
            <AlertBanner
              alerts={data.alerts}
              timezone={data.location.timezone}
            />
          </AppStackFull>
        )}

        {/*
          Shown whenever the data on screen is not live. The timestamp is the
          whole point: a stale forecast presented as current is worse than no
          forecast at all.
        */}
        {weather.isStale && data && weather.fetchedAt && (
          <AppStackFull>
            <StaleBanner
              lastUpdated={formatRelativePast(weather.fetchedAt)}
              offline={!online}
              onRefresh={weather.refetch}
              refreshing={weather.isFetching}
            />
          </AppStackFull>
        )}

        {weather.isFirstLoad && <WeatherSkeleton />}

        {weather.isUnavailable && (
          <AppStackFull>
            <ErrorState
              title={
                online
                  ? "Could not load the weather"
                  : "You are offline and have no saved forecast"
              }
              message={
                weather.error?.message ??
                (online
                  ? "Something went wrong reaching the weather service."
                  : "Connect to the internet to load a forecast. Once one loads, it will be available offline next time.")
              }
              onRetry={online ? weather.refetch : undefined}
            >
              {online && (
                <Button
                  variant="secondary"
                  onClick={handleUseCurrentLocation}
                  disabled={geolocation.status === "requesting"}
                >
                  Use my location
                </Button>
              )}
            </ErrorState>
          </AppStackFull>
        )}

        {data && (
          <>
            <HeroCard data={data} units={units} />

            <AppStackFull>
              <NowcastBanner data={data} />
            </AppStackFull>

            {/* The chart and the map both need the full width on desktop. */}
            <AppStackFull>
              <div id="forecast">
                <ForecastTabs data={data} units={units} />
              </div>
            </AppStackFull>

            <HighlightsGrid data={data} units={units} />

            <DailyForecast data={data} units={units} days={7} />

            <AppStackFull>
              <SunArc data={data} />
            </AppStackFull>

            <AppStackFull>
              <CityStrip
                locations={saved.locations}
                units={units}
                activeId={isCurrentSaved ? activeId : undefined}
                onSelect={setFromSaved}
                onRemove={(id) => void saved.removeLocation(id)}
                onSaveCurrent={isCurrentSaved ? undefined : handleSaveCurrent}
                currentName={placeName}
              />
            </AppStackFull>
          </>
        )}
      </AppStack>
    </AppShell>
  );
}
