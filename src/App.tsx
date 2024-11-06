/**
 * Application root.
 *
 * Phase 1 wires the pieces together: the shell, the search header, and the
 * query-driven content column. Everything below the header is derived from one
 * `useWeather` query, so there is a single loading, error and stale path rather
 * than one per card.
 */

import { useMemo } from "react";
import { QueryClientProvider } from "@tanstack/react-query";

import { AppShell, AppStack, AppStackFull } from "./components/layout/AppShell";
import { SearchBar } from "./components/weather/SearchBar";
import { HeroCard } from "./components/weather/HeroCard";
import { DailyForecast } from "./components/weather/DailyForecast";
import { WeatherSkeleton } from "./components/weather/WeatherSkeleton";
import { ErrorState, StaleBanner, Announcer } from "./components/ui/ErrorState";
import { Button } from "./components/ui/Button";

import { queryClient } from "./lib/queryClient";
import { useWeather } from "./hooks/useWeather";
import { useGeolocation } from "./hooks/useGeolocation";
import {
  useActiveLocation,
  useDocumentTitle,
} from "./hooks/useActiveLocation";
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
  const { location, setFromSearch, setFromGeolocation } = useActiveLocation();
  const geolocation = useGeolocation();
  const query = useWeather(location);

  // Phase 4 turns this into a user preference; the whole tree already takes it
  // as a prop, so the toggle is a one-line change there.
  const units: UnitSystem = "metric";

  const data = query.data;
  const condition = data?.current.condition;
  const isNight = data?.current.isNight ?? false;

  useDocumentTitle(
    data?.location.name ?? location.name,
    data ? formatTemperatureShort(data.current.temperature, units) : undefined
  );

  /**
   * Only reached when the fetch failed *and* nothing was cached. If there is
   * data on screen, the failure is reported with the stale banner instead —
   * throwing away a readable forecast to show an error page would be a
   * regression on the old app.
   */
  const showFullError = query.isError && !data;
  const showFirstLoad = query.isPending && !data;
  const showStale = query.isError && Boolean(data);

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
        {showStale && data && (
          <AppStackFull>
            <StaleBanner
              lastUpdated={formatRelativePast(data.fetchedAt)}
              offline={typeof navigator !== "undefined" && !navigator.onLine}
              onRefresh={() => query.refetch()}
              refreshing={query.isFetching}
            />
          </AppStackFull>
        )}

        {showFirstLoad && <WeatherSkeleton />}

        {showFullError && (
          <AppStackFull>
            <ErrorState
              title="Could not load the weather"
              message={
                query.error?.message ??
                "Something went wrong reaching the weather service."
              }
              onRetry={() => query.refetch()}
              /* A dead end otherwise: the geolocation button is the only other
                 control, and it may be exactly what is blocked. */
            >
              <Button
                variant="secondary"
                onClick={() => geolocation.request()}
                disabled={geolocation.status === "requesting"}
              >
                Use my location
              </Button>
            </ErrorState>
          </AppStackFull>
        )}

        {data && (
          <>
            <HeroCard data={data} units={units} />
            {/* Anchor for the skip link; Phase 2 fills this column out with
                the hourly chart and the highlights grid. */}
            <div id="forecast">
              <DailyForecast data={data} units={units} />
            </div>
          </>
        )}
      </AppStack>
    </AppShell>
  );
}
