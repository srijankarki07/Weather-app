/**
 * Bundle assembler.
 *
 * This is the seam PLAN 5.2 describes: providers return raw payloads, this
 * module merges and normalises them into one `WeatherData`, and the UI consumes
 * only that. Adding a provider means writing a client and extending this file —
 * no component changes.
 *
 * In the plan this step lives in a Next.js route handler so the API key stays
 * server-side. This project has no backend by instruction, so the merge happens
 * on the client and the key is necessarily public (see `config.ts`).
 */

import type {
  AirQuality,
  Coordinates,
  CurrentConditions,
  DailyPoint,
  HourlyPoint,
  LocationInfo,
  MinutelyPoint,
  PollenLevels,
  WeatherData,
} from "../types/weather";
import { dateKeyInZone } from "../lib/time";
import {
  conditionLabel,
  dewPointFromHumidity,
  europeanAqiToCategory,
  isNightAt,
  pickPollutants,
  usAqiToCategory,
  wmoToCondition,
} from "./normalize";
import { reverseGeocode } from "./geocoding";
import {
  fetchAirQuality,
  fetchForecast,
  type OpenMeteoAirQualityResponse,
  type OpenMeteoForecastResponse,
} from "./openMeteo";

const HOUR_MS = 60 * 60 * 1000;
const HOURS_AHEAD = 48;
const NOWCAST_MINUTES = 60;

/** Index of the entry in `times` closest to `target`, or -1 when empty. */
function nearestIndex(times: number[], target: number): number {
  if (times.length === 0) return -1;
  let best = 0;
  let bestDelta = Math.abs(times[0] - target);
  for (let i = 1; i < times.length; i += 1) {
    const delta = Math.abs(times[i] - target);
    if (delta < bestDelta) {
      best = i;
      bestDelta = delta;
    }
  }
  return best;
}

function valueAt<T>(arr: (T | null)[] | undefined, index: number): T | undefined {
  if (!arr || index < 0 || index >= arr.length) return undefined;
  const value = arr[index];
  return value === null ? undefined : value;
}

/** Fraction 0–1, tolerating a provider that reports 0–100 or omits the field. */
function asFraction(percent: number | undefined | null): number {
  if (typeof percent !== "number" || !Number.isFinite(percent)) return 0;
  return Math.min(1, Math.max(0, percent / 100));
}

function buildLocation(
  raw: OpenMeteoForecastResponse,
  coords: Coordinates,
  label?: Partial<LocationInfo>
): LocationInfo {
  return {
    name: label?.name ?? "Current location",
    region: label?.region,
    country: label?.country,
    coords: { lat: coords.lat, lon: coords.lon },
    timezoneOffsetSeconds: raw.utc_offset_seconds,
    timezone: raw.timezone,
  };
}

function buildCurrent(
  raw: OpenMeteoForecastResponse,
  now: number
): CurrentConditions {
  const { current, hourly, daily } = raw;

  /*
   * Temperature is the one reading the app cannot render around. Every other
   * field has a defensible fallback, so this is the only hard failure — and it
   * surfaces as the error state rather than as "NaN°" on the hero.
   */
  const temperature = current.temperature_2m;
  if (typeof temperature !== "number") {
    throw new Error("The weather service returned no temperature reading.");
  }

  const hourIndex = nearestIndex(hourly.time, current.time);
  const humidity = current.relative_humidity_2m ?? 0;

  const dewPoint =
    valueAt(hourly.dew_point_2m, hourIndex) ??
    dewPointFromHumidity(temperature, humidity);

  const todayIndex = nearestIndex(daily.time, now);
  const sunrise = valueAt(daily.sunrise, todayIndex) ?? now;
  const sunset = valueAt(daily.sunset, todayIndex) ?? now;
  const condition = wmoToCondition(current.weather_code);

  return {
    observedAt: current.time,
    temperature,
    feelsLike: current.apparent_temperature ?? temperature,
    humidity,
    pressure: current.pressure_msl ?? 0,
    // Open-Meteo reports visibility in metres when the model covers it; 10 km
    // is the conventional "no restriction" value when it does not.
    visibility: valueAt(hourly.visibility, hourIndex) ?? 10_000,
    windSpeed: current.wind_speed_10m ?? 0,
    windGust: current.wind_gusts_10m ?? undefined,
    windDirection: current.wind_direction_10m ?? 0,
    cloudiness: current.cloud_cover ?? 0,
    dewPoint,
    uvIndex: valueAt(hourly.uv_index, hourIndex),
    condition,
    description: conditionLabel(condition),
    sunrise,
    sunset,
    isNight:
      current.is_day !== null
        ? current.is_day === 0
        : isNightAt(now, sunrise, sunset),
  };
}

function buildHourly(raw: OpenMeteoForecastResponse, now: number): HourlyPoint[] {
  const { hourly } = raw;
  const points: HourlyPoint[] = [];
  const cutoff = now + HOURS_AHEAD * HOUR_MS;

  for (let i = 0; i < hourly.time.length; i += 1) {
    const time = hourly.time[i];
    // Start one hour back so the "now" marker in the chart has a left edge.
    if (time < now - HOUR_MS || time > cutoff) continue;

    const condition = wmoToCondition(valueAt(hourly.weather_code, i));
    points.push({
      time,
      temperature: valueAt(hourly.temperature_2m, i) ?? 0,
      feelsLike: valueAt(hourly.apparent_temperature, i),
      precipitationProbability: asFraction(
        valueAt(hourly.precipitation_probability, i)
      ),
      precipitation: valueAt(hourly.precipitation, i) ?? 0,
      condition,
      windSpeed: valueAt(hourly.wind_speed_10m, i) ?? 0,
      uvIndex: valueAt(hourly.uv_index, i),
      pressure: valueAt(hourly.pressure_msl, i),
      humidity: valueAt(hourly.relative_humidity_2m, i),
    });
  }

  return points;
}

function buildDaily(raw: OpenMeteoForecastResponse, now: number): DailyPoint[] {
  const { daily } = raw;
  const points: DailyPoint[] = [];

  /*
   * `past_days=1` prepends yesterday to the daily array, and the `DailyPoint[]`
   * contract is that index 0 is today. Comparing calendar dates in the
   * location's own zone is exact, where comparing instants would drift by the
   * length of a day around DST.
   */
  const todayKey = dateKeyInZone(now, raw.timezone);

  for (let i = 0; i < daily.time.length; i += 1) {
    if (dateKeyInZone(daily.time[i], raw.timezone) < todayKey) continue;

    const max = valueAt(daily.temperature_2m_max, i);
    const min = valueAt(daily.temperature_2m_min, i);
    if (max === undefined || min === undefined) continue;

    const condition = wmoToCondition(valueAt(daily.weather_code, i));
    points.push({
      date: daily.time[i],
      min,
      max,
      condition,
      description: conditionLabel(condition),
      precipitationProbability: asFraction(
        valueAt(daily.precipitation_probability_max, i)
      ),
      precipitation: valueAt(daily.precipitation_sum, i) ?? 0,
      sunrise: valueAt(daily.sunrise, i) ?? daily.time[i],
      sunset: valueAt(daily.sunset, i) ?? daily.time[i],
      uvIndexMax: valueAt(daily.uv_index_max, i),
      windSpeedMax: valueAt(daily.wind_speed_10m_max, i),
    });
  }

  return points;
}

function buildMinutely(
  raw: OpenMeteoForecastResponse,
  now: number
): MinutelyPoint[] {
  const block = raw.minutely_15;
  if (!block?.time?.length) return [];

  const cutoff = now + NOWCAST_MINUTES * 60 * 1000;
  const points: MinutelyPoint[] = [];

  for (let i = 0; i < block.time.length; i += 1) {
    const time = block.time[i];
    if (time < now - 15 * 60 * 1000 || time > cutoff) continue;
    points.push({
      time,
      precipitation: valueAt(block.precipitation, i) ?? 0,
      probability: valueAt(block.precipitation_probability, i) !== undefined
        ? asFraction(valueAt(block.precipitation_probability, i))
        : undefined,
    });
  }

  return points;
}

function buildAirQuality(
  raw: OpenMeteoAirQualityResponse,
  now: number
): AirQuality | undefined {
  const current = raw.current;
  if (!current) return undefined;

  // Prefer the US EPA scale because this app's thresholds and copy are written
  // against it; fall back to the European index where EPA is unavailable.
  const hasUs = typeof current.us_aqi === "number";
  const aqi = hasUs ? current.us_aqi! : current.european_aqi;
  if (typeof aqi !== "number") return undefined;

  const pollen: PollenLevels = {};
  const pollenKeys: (keyof PollenLevels)[] = [
    "alder",
    "birch",
    "grass",
    "mugwort",
    "olive",
    "ragweed",
  ];
  const pollenSource: Record<string, number | null | undefined> = {
    alder: current.alder_pollen,
    birch: current.birch_pollen,
    grass: current.grass_pollen,
    mugwort: current.mugwort_pollen,
    olive: current.olive_pollen,
    ragweed: current.ragweed_pollen,
  };
  let hasPollen = false;
  for (const key of pollenKeys) {
    const value = pollenSource[key];
    if (typeof value === "number" && Number.isFinite(value)) {
      pollen[key] = value;
      hasPollen = true;
    }
  }

  return {
    aqi,
    category: hasUs ? usAqiToCategory(aqi) : europeanAqiToCategory(aqi),
    observedAt: current.time,
    pollutants: pickPollutants({
      pm2_5: current.pm2_5,
      pm10: current.pm10,
      no2: current.nitrogen_dioxide,
      o3: current.ozone,
      so2: current.sulphur_dioxide,
      co: current.carbon_monoxide,
    }),
    ...(hasPollen ? { pollen } : {}),
    trend: computeAqiTrend(raw, aqi, now),
  };
}

/**
 * Difference between now and the same reading 24h ago. Positive means the air
 * is getting worse; PLAN 4.2 asks for exactly this trend arrow.
 */
function computeAqiTrend(
  raw: OpenMeteoAirQualityResponse,
  currentAqi: number,
  now: number
): number | undefined {
  const hourly = raw.hourly;
  if (!hourly?.time?.length || !hourly.us_aqi) return undefined;

  const target = now - 24 * HOUR_MS;
  const index = nearestIndex(hourly.time, target);
  const past = valueAt(hourly.us_aqi, index);
  if (past === undefined) return undefined;

  // Guard against comparing against a reading from the wrong day when the
  // provider returned a shorter history than requested.
  if (Math.abs(hourly.time[index] - target) > 3 * HOUR_MS) return undefined;

  return Math.round((currentAqi - past) * 10) / 10;
}

export interface FetchWeatherOptions {
  lat: number;
  lon: number;
  signal?: AbortSignal;
  /** Known place name; skipped when absent and reverse geocoding fills it in. */
  label?: Partial<LocationInfo>;
  /** Set false to skip the air-quality request (Phase 1 summary screens). */
  includeAirQuality?: boolean;
}

/**
 * Fetches everything for one location.
 *
 * The two upstream calls are independent, so they run concurrently; air quality
 * is allowed to fail without taking the forecast down with it.
 */
export async function fetchWeatherBundle(
  options: FetchWeatherOptions
): Promise<WeatherData> {
  const { lat, lon, signal, label, includeAirQuality = true } = options;
  const now = Date.now();

  const forecastPromise = fetchForecast(lat, lon, { signal });

  const airPromise = includeAirQuality
    ? fetchAirQuality(lat, lon, { signal }).catch((error) => {
        // A missing pollen/AQI response costs us one card, not the whole page.
        if (signal?.aborted) throw error;
        return null;
      })
    : Promise.resolve(null);

  const [raw, airRaw] = await Promise.all([forecastPromise, airPromise]);

  const coords: Coordinates = { lat, lon };
  const resolvedLabel = label ?? (await resolveLabel(lat, lon, signal));

  const data: WeatherData = {
    location: buildLocation(raw, coords, resolvedLabel),
    current: buildCurrent(raw, now),
    hourly: buildHourly(raw, now),
    daily: buildDaily(raw, now),
    minutely: buildMinutely(raw, now),
    alerts: [],
    fetchedAt: now,
    sources: airRaw ? ["Open-Meteo", "Open-Meteo Air Quality"] : ["Open-Meteo"],
  };

  if (airRaw) {
    const airQuality = buildAirQuality(airRaw, now);
    if (airQuality) data.airQuality = airQuality;
  }

  return data;
}

/**
 * Names a coordinate the caller could not name itself — the geolocation path,
 * where we have a position but no place.
 *
 * On failure this returns a generic label rather than the app's default city.
 * Falling back to "Kathmandu" for a user in Tokyo would be worse than admitting
 * we do not know, because the coordinates alongside it would be correct and the
 * name would not.
 */
async function resolveLabel(
  lat: number,
  lon: number,
  signal?: AbortSignal
): Promise<Partial<LocationInfo>> {
  const place = await reverseGeocode(lat, lon, { signal });
  if (place) {
    return {
      name: place.name,
      region: place.region,
      country: place.country,
    };
  }
  return { name: "Current location" };
}
