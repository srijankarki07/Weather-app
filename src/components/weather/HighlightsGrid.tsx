/**
 * Today's highlights.
 *
 * PLAN 4.2's premise is that a raw reading is not information. Every tile here
 * carries a hint line that says what the number means — dew point gets a
 * comfort word rather than a temperature, UV gets a burn time rather than an
 * index, air quality gets a health recommendation rather than a level. The
 * numbers are still there; they are just no longer the point.
 */

import styles from "./MetricTile.module.css";
import { Card } from "../ui/Card";
import { MetricTile, MetricGrid, Trend } from "./MetricTile";
import {
  DropletIcon,
  EyeIcon,
  GaugeIcon,
  SunIcon,
  WindIcon,
} from "../ui/icons";
import {
  activityAdvice,
  describeDewPoint,
  describeUvIndex,
  describeVisibility,
  describeWindSpeed,
  pressureTrendFrom,
} from "../../lib/comfort";
import { aqiGuidance } from "../../lib/conditions";
import {
  formatPercent,
  formatPressure,
  formatTemperatureShort,
  formatVisibility,
  formatWindSpeed,
  windDirectionLabel,
} from "../../lib/units";
import { aqiCategoryLabel } from "../../api/normalize";
import type { AqiCategory, UnitSystem, WeatherData } from "../../types/weather";

/** Maps an AQI category onto its severity token. */
const AQI_ACCENT: Record<AqiCategory, string> = {
  good: "var(--wx-aqi-good)",
  fair: "var(--wx-aqi-moderate)",
  moderate: "var(--wx-aqi-sensitive)",
  poor: "var(--wx-aqi-unhealthy)",
  "very-poor": "var(--wx-aqi-very-unhealthy)",
};

export interface HighlightsGridProps {
  data: WeatherData;
  units: UnitSystem;
}

export function HighlightsGrid({ data, units }: HighlightsGridProps) {
  const { current, hourly, airQuality } = data;

  const dewPoint = describeDewPoint(current.dewPoint ?? current.temperature);
  const uv = current.uvIndex !== undefined ? describeUvIndex(current.uvIndex) : null;
  const wind = formatWindSpeed(current.windSpeed, units);
  const gust = current.windGust
    ? formatWindSpeed(current.windGust, units)
    : null;
  const visibility = formatVisibility(current.visibility, units);
  const pressure = formatPressure(current.pressure, units);
  const pressureTrend = pressureTrendFrom(
    hourly.map((point) => ({ time: point.time, pressure: point.pressure })),
    current.observedAt,
    current.pressure
  );

  const activity = activityAdvice({
    condition: current.condition,
    temperature: current.temperature,
    windSpeed: current.windSpeed,
    uvIndex: current.uvIndex,
    aqiCategory: airQuality?.category,
  });

  return (
    <Card
      glass
      title="Today's highlights"
      subtitle={activity.reason}
      titleId="highlights-heading"
    >
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

        {/* --- Humidity -------------------------------------------------- */}
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
            accentColor={`var(--wx-uv-${uv.severity})`}
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

        {/* --- Air quality ----------------------------------------------- */}
        {airQuality && (
          <MetricTile
            label="Air quality"
            value={aqiCategoryLabel(airQuality.category)}
            accentColor={AQI_ACCENT[airQuality.category]}
            hint={
              <>
                {aqiGuidance(airQuality.category)}
                {airQuality.trend !== undefined && (
                  <>
                    {" "}
                    <Trend delta={airQuality.trend} />
                  </>
                )}
              </>
            }
          />
        )}

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

      {/*
        Activity guidance, the per-activity answer to PLAN 3's "should I go
        outside?". Rendered as a list so the two verdicts stay scannable rather
        than becoming another paragraph.
      */}
      <ul className={styles.activityList}>
        <li className={styles.activityRow}>
          <span className={styles.activityName}>Running</span>
          <span
            className={styles.activityVerdict}
            data-verdict={activity.running}
          >
            {VERDICT_LABEL[activity.running]}
          </span>
        </li>
        <li className={styles.activityRow}>
          <span className={styles.activityName}>Cycling</span>
          <span
            className={styles.activityVerdict}
            data-verdict={activity.cycling}
          >
            {VERDICT_LABEL[activity.cycling]}
          </span>
        </li>
      </ul>
    </Card>
  );
}

const VERDICT_LABEL: Record<"good" | "caution" | "avoid", string> = {
  good: "Good to go",
  caution: "Use caution",
  avoid: "Best avoided",
};
