/**
 * Application root.
 *
 * Everything below the header is derived from one `useWeather` call, so there
 * is a single loading, error and stale path rather than one per card. That
 * matters for PLAN 4.6's "never show a blank screen": because the fallback to
 * cached data happens in the hook, every card benefits from it without knowing
 * it exists.
 */

import { Suspense, lazy, useEffect, useMemo } from "react";
import { QueryClientProvider } from "@tanstack/react-query";

import { AppShell, AppStack, AppStackFull } from "./components/layout/AppShell";
import { SearchBar } from "./components/weather/SearchBar";
import { HeroCard } from "./components/weather/HeroCard";
import { DailyForecast } from "./components/weather/DailyForecast";
import { HighlightsGrid } from "./components/weather/HighlightsGrid";
import { SunArc } from "./components/weather/SunArc";
import {
  WeatherSkeleton,
  ChartSkeleton,
} from "./components/weather/WeatherSkeleton";
import { ErrorState, StaleBanner, Announcer } from "./components/ui/ErrorState";
import { Button } from "./components/ui/Button";

import { queryClient } from "./lib/queryClient";
import { pruneExpiredForecasts } from "./lib/db";
import { useWeather } from "./hooks/useWeather";
import { useGeolocation } from "./hooks/useGeolocation";
import { useOnlineStatus } from "./hooks/useOnlineStatus";
import {
  useActiveLocation,
  useDocumentTitle,
} from "./hooks/useActiveLocation";
import { formatTemperatureShort } from "./lib/units";
import { formatRelativePast } from "./lib/time";
import type { UnitSystem } from "./types/weather";

/*
 * The charting library is the heaviest dependency in the app and the chart sits
 * below the fold, so it is split into its own chunk. The hero and the daily
 * forecast — the parts a user reads first — ship in the main bundle.
 */
const HourlyChart = lazy(() =>
  import("./components/weather/HourlyChart").then((module) => ({
    default: module.HourlyChart,
  }))
);

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WeatherApp />
    </QueryClientProvider>
  );
}

function WeatherApp() {
  const { location, setFromSearch, setFromGeolocation } = useActiveLocation();
  const geolocation = useGeolocation();
  const online = useOnlineStatus();
  const weather = useWeather(location);

  // Phase 4 turns this into a user preference; the whole tree already takes it
  // as a prop, so the toggle is a one-line change there.
  const units: UnitSystem = "metric";

  const data = weather.data;
  const condition = data?.current.condition;
  const isNight = data?.current.isNight ?? false;

  useDocumentTitle(
    data?.location.name ?? location.name,
    data ? formatTemperatureShort(data.current.temperature, units) : undefined
  );

  // Housekeeping once per session, not on every render.
  useEffect(() => {
    void pruneExpiredForecasts();
  }, []);

  const announcement = useMemo(() => {
    if (!data) return "";
    return `${data.location.name}: ${Math.round(
      data.current.temperature
    )} degrees, ${data.current.description.toLowerCase()}.`;
  }, [data]);

  const handleUseCurrentLocation = async () => {
    const coords = await geolocation.request();
    if (coords) setFromGeolocation(coords);
  };

  return (
    <AppShell
      condition={condition}
      isNight={isNight}
      header={
        <SearchBar
          onSelect={setFromSearch}
          onUseCurrentLocation={handleUseCurrentLocation}
          geolocationStatus={geolocation.status}
        />
      }
    >
      {/* Keyboard users can jump the header instead of tabbing through it. */}
      <a className="focus-reveal" href="#forecast">
        Skip to forecast
      </a>

      <Announcer message={announcement} />

      <AppStack>
        {/*
          Shown whenever the data on screen is not live — offline, or a refetch
          that failed. The timestamp is the whole point: a stale forecast
          presented as current is worse than no forecast.
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

            {/* The chart needs the full width, so it breaks out of the
                two-column desktop grid. */}
            <AppStackFull>
              <div id="forecast">
                <Suspense fallback={<ChartSkeleton />}>
                  <HourlyChart data={data} units={units} hours={24} />
                </Suspense>
              </div>
            </AppStackFull>

            <HighlightsGrid data={data} units={units} />

            <DailyForecast data={data} units={units} days={7} />

            <AppStackFull>
              <SunArc data={data} />
            </AppStackFull>
          </>
        )}
      </AppStack>
    </AppShell>
  );
}
