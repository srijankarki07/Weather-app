/**
 * Provider code → internal vocabulary.
 *
 * Both providers describe the sky with their own numbering. Everything here
 * collapses onto `ConditionCode` so that icons, gradients and guidance text are
 * written once against a single enum.
 */

import type {
  AqiCategory,
  ConditionCode,
  Pollutants,
  WeatherAlert,
  AlertSeverity,
} from "../types/weather";

/**
 * WMO 4677 present-weather codes, which is what Open-Meteo reports.
 * https://open-meteo.com/en/docs — "WMO Weather interpretation codes".
 */
export function wmoToCondition(code: number | null | undefined): ConditionCode {
  if (code === null || code === undefined) return "unknown";
  if (code === 0) return "clear";
  if (code === 1) return "mostly-clear";
  if (code === 2) return "partly-cloudy";
  if (code === 3) return "overcast";
  if (code === 45 || code === 48) return "fog";
  if (code >= 51 && code <= 55) return "drizzle";
  // Freezing drizzle and freezing rain both read as sleet to a user.
  if (code === 56 || code === 57 || code === 66 || code === 67) return "sleet";
  if (code === 61 || code === 63) return "rain";
  if (code === 65) return "heavy-rain";
  if (code >= 71 && code <= 77) return "snow";
  if (code === 80 || code === 81) return "showers";
  if (code === 82) return "heavy-rain";
  if (code === 85 || code === 86) return "snow";
  if (code === 95) return "thunderstorm";
  if (code === 96 || code === 99) return "thunderstorm";
  return "unknown";
}

/** Sentence-case label for a normalised condition. */
export function conditionLabel(condition: ConditionCode): string {
  switch (condition) {
    case "clear":
      return "Clear sky";
    case "mostly-clear":
      return "Mostly clear";
    case "partly-cloudy":
      return "Partly cloudy";
    case "cloudy":
      return "Cloudy";
    case "overcast":
      return "Overcast";
    case "fog":
      return "Fog";
    case "haze":
      return "Haze";
    case "drizzle":
      return "Drizzle";
    case "rain":
      return "Rain";
    case "heavy-rain":
      return "Heavy rain";
    case "showers":
      return "Showers";
    case "thunderstorm":
      return "Thunderstorm";
    case "snow":
      return "Snow";
    case "sleet":
      return "Sleet";
    case "unknown":
      return "Unknown";
  }
}

/**
 * OpenWeather's 1–5 index. Distinct from the 0–500 US EPA scale, which is a
 * common source of bugs in AQI widgets — the old `Weather.js` in this repo
 * compared the 1–5 value against 0–500 thresholds, so everything below 300 read
 * as "Good".
 */
export function owmAqiToCategory(aqi: number): AqiCategory {
  if (aqi <= 1) return "good";
  if (aqi === 2) return "fair";
  if (aqi === 3) return "moderate";
  if (aqi === 4) return "poor";
  return "very-poor";
}

/** US EPA AQI (0–500), used by Open-Meteo's `us_aqi` field. */
export function usAqiToCategory(aqi: number): AqiCategory {
  if (aqi <= 50) return "good";
  if (aqi <= 100) return "fair";
  if (aqi <= 150) return "moderate";
  if (aqi <= 200) return "poor";
  return "very-poor";
}

/** European AQI (0–100+), used by Open-Meteo's `european_aqi` field. */
export function europeanAqiToCategory(aqi: number): AqiCategory {
  if (aqi <= 20) return "good";
  if (aqi <= 40) return "fair";
  if (aqi <= 60) return "moderate";
  if (aqi <= 80) return "poor";
  return "very-poor";
}

export function aqiCategoryLabel(category: AqiCategory): string {
  switch (category) {
    case "good":
      return "Good";
    case "fair":
      return "Fair";
    case "moderate":
      return "Moderate";
    case "poor":
      return "Poor";
    case "very-poor":
      return "Very poor";
  }
}

/** Keeps only the pollutant readings that are actually present and numeric. */
export function pickPollutants(raw: Partial<Record<keyof Pollutants, unknown>>): Pollutants {
  const result: Pollutants = {};
  for (const key of Object.keys(raw) as (keyof Pollutants)[]) {
    const value = raw[key];
    if (typeof value === "number" && Number.isFinite(value)) {
      result[key] = value;
    }
  }
  return result;
}

/**
 * Magnus formula. Open-Meteo reports dew point directly, but OpenWeather's free
 * current-weather endpoint does not, so it has to be derived from temperature
 * and relative humidity.
 */
export function dewPointFromHumidity(
  temperatureC: number,
  humidityPercent: number
): number {
  const a = 17.27;
  const b = 237.7;
  const clamped = Math.min(100, Math.max(1, humidityPercent));
  const alpha =
    (a * temperatureC) / (b + temperatureC) + Math.log(clamped / 100);
  return (b * alpha) / (a - alpha);
}

/**
 * National Weather Service alerts are the one free, keyless alert source, and
 * they only cover the United States. Severity strings come back lower-case.
 */
export function normalizeNwsSeverity(severity: string | undefined): AlertSeverity {
  switch ((severity ?? "").toLowerCase()) {
    case "extreme":
      return "extreme";
    case "severe":
      return "severe";
    case "moderate":
      return "moderate";
    default:
      return "minor";
  }
}

export function normalizeNwsAlert(raw: {
  id?: string;
  event?: string;
  senderName?: string;
  description?: string;
  onset?: string;
  effective?: string;
  expires?: string;
  severity?: string;
}): WeatherAlert | null {
  if (!raw.event) return null;
  const start = Date.parse(raw.onset ?? raw.effective ?? "");
  const end = Date.parse(raw.expires ?? "");
  if (Number.isNaN(start) || Number.isNaN(end)) return null;
  if (end < Date.now()) return null;

  return {
    id: raw.id ?? `${raw.event}-${start}`,
    event: raw.event,
    sender: raw.senderName ?? "National Weather Service",
    description: (raw.description ?? "").trim(),
    start,
    end,
    severity: normalizeNwsSeverity(raw.severity),
    tags: [],
  };
}

/** True when the local clock sits outside the sunrise/sunset window. */
export function isNightAt(
  nowMs: number,
  sunriseMs: number,
  sunsetMs: number
): boolean {
  return nowMs < sunriseMs || nowMs >= sunsetMs;
}
