/**
 * Interactive radar map.
 *
 * PLAN 4.1: "Integrate Leaflet ... Users should be able to scrub through time
 * and see precipitation moving across the map." PLAN 8 flags the map library's
 * bundle size and names lazy-loading as the mitigation, so this module is
 * imported dynamically by `App` and Leaflet's CSS comes with it.
 *
 * Layers offered:
 *   - Precipitation radar and infrared satellite, both from RainViewer, both
 *     free and keyless.
 *   - Temperature, from OpenWeather's tile service, which is free but needs a
 *     key. It is hidden entirely when no key is configured rather than shown
 *     broken — see `hasTemperatureTiles`.
 */

import { useEffect, useMemo, useState } from "react";
import { CircleMarker, MapContainer, TileLayer, useMap } from "react-leaflet";
import { useQuery } from "@tanstack/react-query";
import "leaflet/dist/leaflet.css";

import styles from "./RadarMap.module.css";
import { Card } from "../ui/Card";
import {
  fetchRadarFrames,
  radarTileUrl,
  type RadarFrame,
} from "../../api/radar";
import { OPENWEATHER_TILE_KEY, hasTemperatureTiles } from "../../config";
import { useChartColors } from "../../hooks/useChartColors";
import { formatClockTime } from "../../lib/time";
import type { WeatherData } from "../../types/weather";

type LayerId = "radar" | "infrared" | "temperature";

const LAYER_LABEL: Record<LayerId, string> = {
  radar: "Precipitation",
  infrared: "Satellite",
  temperature: "Temperature",
};

/** RainViewer refreshes every ten minutes; five keeps us comfortably ahead. */
const MANIFEST_REFRESH_MS = 5 * 60 * 1000;

export interface RadarMapProps {
  data: WeatherData;
}

/**
 * Basemap. CARTO's Positron and Dark Matter are free with attribution and are
 * far quieter than OpenStreetMap's default, which matters here because the
 * radar overlay has to read against it.
 */
function baseTileUrl(dark: boolean): string {
  return dark
    ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png"
    : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png";
}

/**
 * Recentres on city change and names the map for assistive technology.
 *
 * The label is set imperatively because Leaflet owns the container element;
 * `MapContainer` spreads its remaining props into Leaflet's own options rather
 * than onto the DOM node, so there is no prop for this.
 *
 * The map is deliberately NOT `aria-hidden`. It contains focusable controls —
 * Leaflet's zoom buttons and a focusable container — and hiding a focusable
 * element from the accessibility tree is an ARIA violation that leaves a
 * keyboard user tabbing into something a screen reader will not describe.
 */
function MapFocus({ lat, lon, label }: { lat: number; lon: number; label: string }) {
  const map = useMap();

  useEffect(() => {
    map.setView([lat, lon], map.getZoom(), { animate: true });
  }, [lat, lon, map]);

  useEffect(() => {
    map.getContainer().setAttribute("aria-label", label);
  }, [map, label]);

  return null;
}

export function RadarMap({ data }: RadarMapProps) {
  const colors = useChartColors();
  const { location, current } = data;
  const timezone = location.timezone;

  const [layer, setLayer] = useState<LayerId>("radar");
  const [frameIndex, setFrameIndex] = useState<number | null>(null);
  const [dark, setDark] = useState(false);

  const { data: frames, isPending, isError } = useQuery({
    queryKey: ["radar", "frames"],
    queryFn: ({ signal }) => fetchRadarFrames(signal),
    staleTime: MANIFEST_REFRESH_MS,
    refetchInterval: MANIFEST_REFRESH_MS,
  });

  // The map tiles follow the theme, so the basemap matches the app.
  useEffect(() => {
    const read = () =>
      setDark(
        document.documentElement.getAttribute("data-theme") === "dark" ||
          (!document.documentElement.hasAttribute("data-theme") &&
            window.matchMedia("(prefers-color-scheme: dark)").matches)
      );
    read();
    const observer = new MutationObserver(read);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    return () => observer.disconnect();
  }, []);

  const activeFrames: RadarFrame[] = useMemo(() => {
    if (!frames) return [];
    if (layer === "infrared") return frames.infrared;
    return frames.radar;
  }, [frames, layer]);

  // Start at "now" whenever the frame list or the layer changes.
  useEffect(() => {
    if (!frames) return;
    setFrameIndex(layer === "infrared" ? activeFrames.length - 1 : frames.nowIndex);
  }, [frames, layer, activeFrames.length]);

  const index =
    frameIndex === null
      ? 0
      : Math.min(Math.max(frameIndex, 0), Math.max(activeFrames.length - 1, 0));
  const frame = activeFrames[index];

  const isForecast = Boolean(
    frames && layer !== "infrared" && index > frames.nowIndex
  );

  const availableLayers: LayerId[] = hasTemperatureTiles
    ? ["radar", "infrared", "temperature"]
    : ["radar", "infrared"];

  if (isError) {
    return (
      <Card glass title="Radar" titleId="radar-heading">
        <p className={styles.error}>
          The radar service is unavailable right now. The forecast above is
          unaffected.
        </p>
      </Card>
    );
  }

  if (isPending || !frames) {
    return (
      <Card glass title="Radar" titleId="radar-heading">
        <p className={styles.loading} role="status">
          Loading radar…
        </p>
      </Card>
    );
  }

  return (
    <Card
      glass
      title="Radar"
      subtitle={
        layer === "temperature"
          ? "Surface temperature"
          : "Scrub to watch precipitation move"
      }
      titleId="radar-heading"
    >
      <div className={styles.wrap}>
        <div className={styles.controls}>
          <div
            className={styles.tabs}
            role="tablist"
            aria-label="Map layer"
          >
            {availableLayers.map((id) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={layer === id}
                className={[styles.tab, layer === id ? styles.tabActive : null]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() => setLayer(id)}
              >
                {LAYER_LABEL[id]}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.mapFrame}>
          <MapContainer
            className={styles.map}
            center={[location.coords.lat, location.coords.lon]}
            zoom={7}
            /* Keyboard navigation stays on by default; Leaflet supports arrow
               panning and +/- zoom out of the box. */
            scrollWheelZoom={false}
          >
            <TileLayer
              url={baseTileUrl(dark)}
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
              subdomains="abcd"
              maxZoom={19}
            />

            {layer === "temperature" && hasTemperatureTiles && (
              <TileLayer
                url={`https://tile.openweathermap.org/map/temp_new/{z}/{x}/{y}.png?appid=${OPENWEATHER_TILE_KEY}`}
                opacity={0.7}
                attribution="&copy; OpenWeather"
              />
            )}

            {layer !== "temperature" && frame && (
              <TileLayer
                /* `key` forces Leaflet to swap the whole tile layer rather than
                   trying to re-use tiles from the previous timestamp. */
                key={`${layer}-${frame.time}`}
                url={radarTileUrl(
                  frames.host,
                  frame,
                  layer === "infrared" ? "infrared" : "radar"
                )}
                opacity={layer === "infrared" ? 0.55 : 0.75}
                attribution='Radar &copy; <a href="https://www.rainviewer.com/">RainViewer</a>'
              />
            )}

            <CircleMarker
              center={[location.coords.lat, location.coords.lon]}
              radius={7}
              pathOptions={{
                color: colors.surface,
                weight: 3,
                fillColor: colors.nowMarker,
                fillOpacity: 1,
              }}
            />
            <MapFocus
              lat={location.coords.lat}
              lon={location.coords.lon}
              label={`Radar map centred on ${location.name}`}
            />
          </MapContainer>
        </div>

        {layer !== "temperature" && activeFrames.length > 1 && (
          <div className={styles.scrubber}>
            <div className={styles.scrubberHead}>
              <label htmlFor="radar-time">
                {isForecast ? "Forecast" : "Observed"}
              </label>
              <span className={styles.scrubberTime}>
                {frame ? formatClockTime(frame.time * 1000, timezone) : "—"}
              </span>
            </div>
            <input
              id="radar-time"
              className={styles.range}
              type="range"
              min={0}
              max={activeFrames.length - 1}
              step={1}
              value={index}
              onChange={(event) => setFrameIndex(Number(event.target.value))}
              /* Announces the frame's time rather than its index, which is what
                 the value actually means to a user. */
              aria-valuetext={
                frame
                  ? `${isForecast ? "Forecast for" : "Observed at"} ${formatClockTime(
                      frame.time * 1000,
                      timezone
                    )}`
                  : ""
              }
            />
          </div>
        )}

        {layer === "radar" && (
          <p className={styles.legend}>
            <span>Light</span>
            <span className={styles.legendGradient} aria-hidden="true" />
            <span>Heavy</span>
          </p>
        )}

        <p className={styles.note}>
          {hasTemperatureTiles
            ? "Radar and satellite from RainViewer; temperature from OpenWeather. Basemap © OpenStreetMap contributors, © CARTO."
            : "Radar and satellite from RainViewer. Basemap © OpenStreetMap contributors, © CARTO. A temperature layer is available by setting REACT_APP_OPENWEATHER_API_KEY."}
        </p>

        <p className="visually-hidden">
          {`Map centred on ${location.name} at ${current.temperature.toFixed(0)} degrees. `}
          {frame
            ? `Radar frame from ${formatClockTime(frame.time * 1000, timezone)}.`
            : ""}
        </p>
      </div>
    </Card>
  );
}

export default RadarMap;
