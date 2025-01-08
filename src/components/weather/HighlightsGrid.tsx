/**
 * Today's highlights.
 *
 * PLAN 4.2's premise is that a raw reading is not information. Every tile here
 * carries a hint line that says what the number means — dew point gets a
 * comfort word rather than a temperature, UV gets a burn time rather than an
 * index.
 *
 * Six tiles, not nine. Air quality and the activity verdicts now live in their
 * own card, because they carry sentences rather than numbers and were the main
 * reason this section read as congested.
 */

import { Card } from "../ui/Card";
import { MetricTile, MetricGrid } from "./MetricTile";
import { DropletIcon, EyeIcon, GaugeIcon, SunIcon, WindIcon } from "../ui/icons";
import {
  describeDewPoint,
  describePressureTrend,
  describeUvIndex,
  describeVisibility,
  describeWindSpeed,
} from "../../lib/comfort";
import {
  formatPercent,
  formatPressure,
  formatTemperatureShort,
  formatVisibility,
  formatWindSpeed,
  windDirectionLabel,
} from "../../lib/units";
import type { UnitSystem, WeatherData } from "../../types/weather";

export interface HighlightsGridProps {
  data: WeatherData;
  units: UnitSystem;
}

export function HighlightsGrid({ data, units }: HighlightsGridProps) {
  const { current } = data;

  const dewPoint = describeDewPoint(current.dewPoint ?? current.temperature);
  const uv =
    current.uvIndex !== undefined ? describeUvIndex(current.uvIndex) : null;
  const wind = formatWindSpeed(current.windSpeed, units);
  const gust = current.windGust ? formatWindSpeed(current.windGust, units) : null;
  const visibility = formatVisibility(current.visibility, units);
  const pressure = formatPressure(current.pressure, units);
  const pressureTrend = describePressureTrend(current.pressureChange3h);

  return (
    <Card glass title="Today's highlights" titleId="highlights-heading">
      <MetricGrid>
        {/* --- Feels like ------------------------------------------------ */}
        <MetricTile
          label="Feels like"
          value={formatTemperatureShort(current.feelsLike, units)}
          hint={
            Math.abs(current.feelsLike - current.temperature) >= 2
              ? current.feelsLike > current.temperature
                ? "Humidity or sun makes it feel warmer than it is."
                : "Wind makes it feel colder than it is."
              : "Close to the actual temperature."
          }
        />

        {/* --- Humidity and dew point ------------------------------------ */}
        <MetricTile
          label="Humidity"
          value={formatPercent(current.humidity / 100)}
          icon={<DropletIcon size={16} />}
          hint={
            current.dewPoint !== undefined
              ? `Dew point ${formatTemperatureShort(current.dewPoint, units)} · ${dewPoint.label}`
              : dewPoint.detail
          }
        />

        {/* --- UV -------------------------------------------------------- */}
        {uv && current.uvIndex !== undefined && (
          <MetricTile
            label="UV index"
            value={uv.label}
            icon={<SunIcon size={16} />}
            severityColor={`var(--wx-uv-${uv.severity})`}
            hint={
              uv.burnTimeMinutes !== undefined
                ? `Burn time: about ${uv.burnTimeMinutes} minutes.`
                : uv.advice
            }
          />
        )}

        {/* --- Wind ------------------------------------------------------ */}
        <MetricTile
          label="Wind"
          value={`${wind.value} ${wind.unit}`}
          icon={<WindIcon size={16} />}
          hint={
            <>
              {windDirectionLabel(current.windDirection)} ·{" "}
              {describeWindSpeed(current.windSpeed)}
              {gust ? ` · gusts ${gust.value} ${gust.unit}` : ""}
            </>
          }
        />

        {/* --- Pressure -------------------------------------------------- */}
        <MetricTile
          label="Pressure"
          value={pressure.value}
          unit={pressure.unit}
          icon={<GaugeIcon size={16} />}
          /* Empty until there are three hours of history to compare against,
             which is the case on a cold start. */
          hint={pressureTrend.detail || "No trend available yet."}
        />

        {/* --- Visibility ------------------------------------------------ */}
        <MetricTile
          label="Visibility"
          value={visibility.value}
          unit={visibility.unit}
          icon={<EyeIcon size={16} />}
          hint={describeVisibility(current.visibility)}
        />
      </MetricGrid>
    </Card>
  );
}
