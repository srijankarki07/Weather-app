/**
 * Open-Meteo client — the primary provider.
 *
 * PLAN 5.3 recommends OpenWeather One Call 3.0, but that product sits behind a
 * paid subscription. Open-Meteo is keyless, free for non-commercial use, and
 * covers everything this revamp needs that the OpenWeather free tier does not:
 * 15-minute nowcast, UV index, dew point, 10-day outlook and pollen. So it
 * carries the forecast and OpenWeather is kept only for air-quality enrichment.
 *
 * Note `timeformat=unixtime` in every request. Without it the API returns
 * timezone-less local strings ("2024-10-25T10:00") which `new Date()` parses in
 * the *browser's* zone — silently wrong for any location the user is not
 * standing in. Unix seconds remove the ambiguity entirely.
 */

import { OPEN_METEO_AIR_BASE, OPEN_METEO_BASE } from "../config";
import { buildQuery, getJson } from "./http";

/**
 * Note the `| null`s. Open-Meteo returns null for any value its model does not
 * cover at that point, so typing these as plain numbers would be a lie the
 * assembler then propagates into the UI as "NaN°". The assembler handles the
 * nulls; this interface reports them.
 */
export interface OpenMeteoCurrent {
  time: number;
  temperature_2m: number | null;
  relative_humidity_2m: number | null;
  apparent_temperature: number | null;
  is_day: number | null;
  weather_code: number | null;
  cloud_cover: number | null;
  pressure_msl: number | null;
  wind_speed_10m: number | null;
  wind_direction_10m: number | null;
  wind_gusts_10m?: number | null;
}

export interface OpenMeteoHourly {
  time: number[];
  temperature_2m: (number | null)[];
  relative_humidity_2m?: (number | null)[];
  dew_point_2m?: (number | null)[];
  apparent_temperature?: (number | null)[];
  precipitation_probability?: (number | null)[];
  precipitation?: (number | null)[];
  weather_code?: (number | null)[];
  wind_speed_10m?: (number | null)[];
  uv_index?: (number | null)[];
  visibility?: (number | null)[];
  pressure_msl?: (number | null)[];
}

export interface OpenMeteoDaily {
  time: number[];
  weather_code: (number | null)[];
  temperature_2m_max: (number | null)[];
  temperature_2m_min: (number | null)[];
  sunrise: number[];
  sunset: number[];
  uv_index_max?: (number | null)[];
  precipitation_sum?: (number | null)[];
  precipitation_probability_max?: (number | null)[];
  wind_speed_10m_max?: (number | null)[];
}

export interface OpenMeteoForecastResponse {
  latitude: number;
  longitude: number;
  utc_offset_seconds: number;
  timezone: string;
  timezone_abbreviation: string;
  current: OpenMeteoCurrent;
  hourly: OpenMeteoHourly;
  daily: OpenMeteoDaily;
  minutely_15?: {
    time: number[];
    precipitation?: (number | null)[];
    precipitation_probability?: (number | null)[];
  };
}

export interface OpenMeteoAirQualityResponse {
  latitude: number;
  longitude: number;
  utc_offset_seconds: number;
  timezone: string;
  current?: {
    time: number;
    us_aqi?: number | null;
    european_aqi?: number | null;
    pm2_5?: number | null;
    pm10?: number | null;
    nitrogen_dioxide?: number | null;
    ozone?: number | null;
    sulphur_dioxide?: number | null;
    carbon_monoxide?: number | null;
    /**
     * Pollen is published for European coordinates only and comes back null
     * everywhere else, so treat every one of these as optional.
     */
    alder_pollen?: number | null;
    birch_pollen?: number | null;
    grass_pollen?: number | null;
    mugwort_pollen?: number | null;
    olive_pollen?: number | null;
    ragweed_pollen?: number | null;
  };
  hourly?: {
    time: number[];
    us_aqi?: (number | null)[];
  };
}

/**
 * Open-Meteo uses second-resolution unix timestamps; the rest of the app works
 * in milliseconds. Convert once, at the boundary.
 */
const toMs = (seconds: number): number => seconds * 1000;

export async function fetchForecast(
  lat: number,
  lon: number,
  options: { signal?: AbortSignal; days?: number } = {}
): Promise<OpenMeteoForecastResponse> {
  const { signal, days = 10 } = options;

  const query = buildQuery({
    latitude: lat,
    longitude: lon,
    current: [
      "temperature_2m",
      "relative_humidity_2m",
      "apparent_temperature",
      "is_day",
      "weather_code",
      "cloud_cover",
      "pressure_msl",
      "wind_speed_10m",
      "wind_direction_10m",
      "wind_gusts_10m",
    ].join(","),
    hourly: [
      "temperature_2m",
      "relative_humidity_2m",
      "dew_point_2m",
      "apparent_temperature",
      "precipitation_probability",
      "precipitation",
      "weather_code",
      "wind_speed_10m",
      "uv_index",
      "visibility",
      "pressure_msl",
    ].join(","),
    daily: [
      "weather_code",
      "temperature_2m_max",
      "temperature_2m_min",
      "sunrise",
      "sunset",
      "uv_index_max",
      "precipitation_sum",
      "precipitation_probability_max",
      "wind_speed_10m_max",
    ].join(","),
    minutely_15: ["precipitation", "precipitation_probability"].join(","),
    timezone: "auto",
    timeformat: "unixtime",
    forecast_days: days,
    // Yesterday's hours come along for the temperature and AQI trend arrows.
    // Note this also prepends yesterday to `daily`, which the assembler filters
    // back out.
    past_days: 1,
    // Do NOT add a window parameter here for `minutely_15`. Open-Meteo accepts
    // unknown query keys and silently truncates the response instead of
    // erroring, so a bogus `forecast_minutely_15` cuts the nowcast to a single
    // point with a 200 OK. The default 24-hour window is what we want.
  });

  const raw = await getJson<OpenMeteoForecastResponse>(
    `${OPEN_METEO_BASE}/forecast?${query}`,
    { signal }
  );

  /*
   * Normalise the timestamp arrays from seconds to milliseconds by building new
   * objects rather than editing the response in place. Mutating the parsed
   * payload would be invisible for a real fetch — each one parses fresh JSON —
   * but it makes the function unsafe to call twice on the same object, which is
   * exactly what a test fixture is.
   */
  return {
    ...raw,
    current: { ...raw.current, time: toMs(raw.current.time) },
    hourly: { ...raw.hourly, time: raw.hourly.time.map(toMs) },
    daily: {
      ...raw.daily,
      time: raw.daily.time.map(toMs),
      sunrise: raw.daily.sunrise.map(toMs),
      sunset: raw.daily.sunset.map(toMs),
    },
    ...(raw.minutely_15
      ? { minutely_15: { ...raw.minutely_15, time: raw.minutely_15.time.map(toMs) } }
      : {}),
  };
}

export async function fetchAirQuality(
  lat: number,
  lon: number,
  { signal }: { signal?: AbortSignal } = {}
): Promise<OpenMeteoAirQualityResponse> {
  const query = buildQuery({
    latitude: lat,
    longitude: lon,
    current: [
      "us_aqi",
      "european_aqi",
      "pm2_5",
      "pm10",
      "nitrogen_dioxide",
      "ozone",
      "sulphur_dioxide",
      "carbon_monoxide",
      "alder_pollen",
      "birch_pollen",
      "grass_pollen",
      "mugwort_pollen",
      "olive_pollen",
      "ragweed_pollen",
    ].join(","),
    hourly: "us_aqi",
    timezone: "auto",
    timeformat: "unixtime",
    past_days: 1,
  });

  const raw = await getJson<OpenMeteoAirQualityResponse>(
    `${OPEN_METEO_AIR_BASE}/air-quality?${query}`,
    { signal }
  );

  // New objects rather than mutation — see the note in `fetchForecast`.
  return {
    ...raw,
    ...(raw.current
      ? { current: { ...raw.current, time: toMs(raw.current.time) } }
      : {}),
    ...(raw.hourly
      ? { hourly: { ...raw.hourly, time: raw.hourly.time.map(toMs) } }
      : {}),
  };
}

/* -------------------------------------------------------------------------
 * Summary
 * ---------------------------------------------------------------------- */

/**
 * The minimum needed to draw a city card: temperature, condition and the day's
 * range. The multi-city dashboard shows one card per saved location, so
 * fetching the full bundle for each would multiply a large payload by the
 * number of cities for data that is then thrown away.
 */
export interface OpenMeteoSummaryResponse {
  utc_offset_seconds: number;
  timezone: string;
  current: {
    time: number;
    temperature_2m: number | null;
    apparent_temperature: number | null;
    weather_code: number | null;
    is_day: number | null;
  };
  daily: {
    time: number[];
    temperature_2m_max: (number | null)[];
    temperature_2m_min: (number | null)[];
  };
}

export async function fetchSummary(
  lat: number,
  lon: number,
  { signal }: { signal?: AbortSignal } = {}
): Promise<OpenMeteoSummaryResponse> {
  const query = buildQuery({
    latitude: lat,
    longitude: lon,
    current: [
      "temperature_2m",
      "apparent_temperature",
      "weather_code",
      "is_day",
    ].join(","),
    daily: ["temperature_2m_max", "temperature_2m_min"].join(","),
    timezone: "auto",
    timeformat: "unixtime",
    forecast_days: 1,
  });

  const raw = await getJson<OpenMeteoSummaryResponse>(
    `${OPEN_METEO_BASE}/forecast?${query}`,
    { signal, timeoutMs: 8000 }
  );

  return {
    ...raw,
    current: { ...raw.current, time: toMs(raw.current.time) },
    daily: { ...raw.daily, time: raw.daily.time.map(toMs) },
  };
}
