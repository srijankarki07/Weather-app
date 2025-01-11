/**
 * Air quality, its health guidance, and what it means for going out.
 *
 * Split out of the highlights grid. AQI was a tile like any other, but it is
 * the one metric with a sentence of guidance attached and a trend arrow beside
 * it, and squeezing that into a 9rem tile is what made the highlights section
 * read as congested. Here it gets a line of its own, and the activity verdicts
 * that depend on it sit directly underneath rather than as two orphan rows at
 * the bottom of an unrelated card.
 */

import type { CSSProperties } from "react";
import styles from "./AirQualityCard.module.css";
import { Card } from "../ui/Card";
import { Trend } from "./MetricTile";
import { aqiGuidance } from "../../lib/conditions";
import { activityAdvice } from "../../lib/comfort";
import { aqiCategoryLabel } from "../../api/normalize";
import type { AqiCategory, WeatherData } from "../../types/weather";

/** Severity token per category, used for the dot and the bar stops. */
const AQI_ACCENT: Record<AqiCategory, string> = {
  good: "var(--wx-aqi-good)",
  fair: "var(--wx-aqi-moderate)",
  moderate: "var(--wx-aqi-sensitive)",
  poor: "var(--wx-aqi-unhealthy)",
  "very-poor": "var(--wx-aqi-very-unhealthy)",
};

const VERDICT_LABEL: Record<"good" | "caution" | "avoid", string> = {
  good: "Good to go",
  caution: "Use caution",
  avoid: "Best avoided",
};

export interface AirQualityCardProps {
  data: WeatherData;
}

export function AirQualityCard({ data }: AirQualityCardProps) {
  const { airQuality, current } = data;

  const activity = activityAdvice({
    condition: current.condition,
    temperature: current.temperature,
    windSpeed: current.windSpeed,
    uvIndex: current.uvIndex,
    aqiCategory: airQuality?.category,
  });

  const activityRows = (
    <div className={styles.activity}>
      <h3 className={styles.activityHeading}>Going out</h3>
      <ul className={styles.activityList}>
        {(["running", "cycling"] as const).map((name) => (
          <li key={name} className={styles.activityRow}>
            <span className={styles.activityName}>
              {name === "running" ? "Running" : "Cycling"}
            </span>
            <span
              className={styles.activityVerdict}
              data-verdict={activity[name]}
            >
              {VERDICT_LABEL[activity[name]]}
            </span>
          </li>
        ))}
      </ul>
      <p className={styles.activityReason}>{activity.reason}</p>
    </div>
  );

  // Outside the US there is no alert source and, for some locations, no pollen
  // either — but the activity advice still stands on temperature and wind, so
  // the card renders rather than disappearing.
  if (!airQuality) {
    return (
      <Card glass title="Air quality" titleId="air-quality-heading">
        <p className={styles.unavailable}>
          Air quality data is not available for this location.
        </p>
        {activityRows}
      </Card>
    );
  }

  const { category, aqi, trend, pollutants } = airQuality;
  const accent = AQI_ACCENT[category];

  return (
    <Card glass title="Air quality" titleId="air-quality-heading">
      <div className={styles.summary}>
        <div
          className={styles.badge}
          style={{ "--aqi-accent": accent } as CSSProperties}
        >
          <span className={styles.aqi}>{aqi}</span>
          <span className={styles.category}>{aqiCategoryLabel(category)}</span>
        </div>

        <p className={styles.guidance}>
          {aqiGuidance(category)}
          {trend !== undefined && (
            <>
              {" "}
              <Trend delta={trend} />
            </>
          )}
        </p>
      </div>

      {/*
        The three pollutants people actually check. The full set was in the old
        app's AQI panel and nobody read it; a bar each makes the level
        comparable without needing to know what 11.5 µg/m³ means.
      */}
      <ul className={styles.pollutants}>
        {(
          [
            ["PM2.5", pollutants.pm2_5, 25],
            ["PM10", pollutants.pm10, 50],
            ["NO₂", pollutants.no2, 40],
          ] as const
        )
          .filter(([, value]) => typeof value === "number")
          .map(([label, value, guide]) => (
            <li key={label} className={styles.pollutant}>
              <span className={styles.pollutantLabel}>{label}</span>
              <span className={styles.pollutantTrack} aria-hidden="true">
                <span
                  className={styles.pollutantBar}
                  style={{
                    width: `${Math.min(100, ((value as number) / guide) * 100)}%`,
                    backgroundColor: accent,
                  }}
                />
              </span>
              <span className={styles.pollutantValue}>
                {Math.round(value as number)}
              </span>
            </li>
          ))}
      </ul>

      {activityRows}
    </Card>
  );
}
