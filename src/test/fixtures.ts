/**
 * Shared test fixtures.
 *
 * Shaped exactly as the providers return them, which means every timestamp is
 * in *seconds* — the clients convert to milliseconds, and a fixture in the
 * wrong unit would make the tests pass against a model the app never sees.
 *
 * Not a test file itself, so Jest's `testMatch` ignores it.
 */

import type {
  OpenMeteoAirQualityResponse,
  OpenMeteoForecastResponse,
} from "../api/openMeteo";

const HOUR_S = 3600;

/** Midnight UTC today, in seconds. */
export function todayMidnightSeconds(): number {
  const now = new Date();
  return (
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) / 1000
  );
}

export interface ForecastFixtureOptions {
  /** Points in the minutely block; 1 simulates a truncated response. */
  minutelyPoints?: number;
  /** Overrides the current temperature, in celsius. */
  temperature?: number;
  weatherCode?: number;
  /**
   * Pins the UV index across the whole hourly series. The default ramp puts a
   * low value at the current hour, which is right for a realistic fixture but
   * does not exercise the burn-time branch.
   */
  uvIndex?: number;
  /** Millimetres per 15-minute step across the nowcast window. */
  nowcastMm?: number;
}

/**
 * Three days of daily data — yesterday, today and tomorrow — because that is
 * what `past_days=1` produces and what the assembler has to filter.
 */
export function buildForecastFixture(
  options: ForecastFixtureOptions = {}
): OpenMeteoForecastResponse {
  const {
    minutelyPoints = 96,
    temperature = 24.3,
    weatherCode = 3,
    uvIndex,
    nowcastMm = 0.3,
  } = options;

  const base = todayMidnightSeconds();
  const dayTimes = [base - 24 * HOUR_S, base, base + 24 * HOUR_S];

  const nowSeconds = Math.floor(Date.now() / 1000);

  const hourlyTimes: number[] = [];
  for (let h = -2; h <= 50; h += 1) {
    hourlyTimes.push(nowSeconds + h * HOUR_S);
  }

  const minutelyTimes: number[] = [];
  const minutelyStart = nowSeconds - 15 * 60;
  for (let i = 0; i < minutelyPoints; i += 1) {
    minutelyTimes.push(minutelyStart + i * 15 * 60);
  }

  return {
    latitude: 27.7,
    longitude: 85.3,
    utc_offset_seconds: 0,
    timezone: "UTC",
    timezone_abbreviation: "UTC",
    current: {
      time: nowSeconds,
      temperature_2m: temperature,
      relative_humidity_2m: 62,
      apparent_temperature: temperature + 1.8,
      is_day: 1,
      weather_code: weatherCode,
      cloud_cover: 75,
      pressure_msl: 1012,
      wind_speed_10m: 2.1,
      wind_direction_10m: 180,
      wind_gusts_10m: 5.4,
    },
    hourly: {
      time: hourlyTimes,
      temperature_2m: hourlyTimes.map((_, i) => 20 + (i % 8)),
      relative_humidity_2m: hourlyTimes.map(() => 60),
      dew_point_2m: hourlyTimes.map(() => 15.2),
      apparent_temperature: hourlyTimes.map(() => 21),
      precipitation_probability: hourlyTimes.map((_, i) => (i % 10) * 10),
      precipitation: hourlyTimes.map(() => 0.2),
      weather_code: hourlyTimes.map(() => weatherCode),
      wind_speed_10m: hourlyTimes.map(() => 3),
      uv_index: hourlyTimes.map((_, i) =>
        uvIndex ?? Math.min(10, i % 12)
      ),
      visibility: hourlyTimes.map(() => 12_000),
    },
    daily: {
      time: dayTimes,
      weather_code: [3, 61, 0],
      temperature_2m_max: [20, 24, 27],
      temperature_2m_min: [10, 14, 16],
      sunrise: dayTimes.map((t) => t + 6 * HOUR_S),
      sunset: dayTimes.map((t) => t + 18 * HOUR_S),
      uv_index_max: [5, 7, 8],
      precipitation_sum: [0, 4.2, 0],
      precipitation_probability_max: [10, 80, 5],
      wind_speed_10m_max: [4, 6, 5],
    },
    minutely_15: {
      time: minutelyTimes,
      precipitation: minutelyTimes.map(() => nowcastMm),
      precipitation_probability: minutelyTimes.map(() => 40),
    },
  };
}

/** Air quality with a worsening 24-hour trend: 53 now against 30 yesterday. */
export const AIR_FIXTURE: OpenMeteoAirQualityResponse = {
  latitude: 27.7,
  longitude: 85.3,
  utc_offset_seconds: 0,
  timezone: "UTC",
  current: {
    time: Math.floor(Date.now() / 1000),
    us_aqi: 53,
    european_aqi: 37,
    pm2_5: 11.5,
    pm10: 12.6,
    nitrogen_dioxide: 5.1,
    ozone: 93,
    sulphur_dioxide: 2.5,
    carbon_monoxide: 738,
    grass_pollen: null,
    birch_pollen: null,
  },
  hourly: {
    time: [
      Math.floor(Date.now() / 1000) - 24 * HOUR_S,
      Math.floor(Date.now() / 1000),
    ],
    us_aqi: [30, 53],
  },
};

/** Place-name response from BigDataCloud's reverse endpoint. */
export const REVERSE_GEOCODE_FIXTURE = {
  city: "Kathmandu",
  locality: "Kathmandu",
  principalSubdivision: "Bagmati Province",
  countryName: "Nepal",
  countryCode: "NP",
};

export const GEOCODE_SEARCH_FIXTURE = {
  results: [
    {
      id: 1283240,
      name: "Kathmandu",
      latitude: 27.70169,
      longitude: 85.3206,
      country: "Nepal",
      country_code: "NP",
      admin1: "Bagmati Province",
      population: 1_442_271,
    },
  ],
};

/**
 * Deep copy. `structuredClone` is not exposed by this jsdom environment, but
 * every payload here is plain JSON, so a round trip is equivalent.
 */
export function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export interface MockFetchOptions {
  forecast?: unknown;
  air?: unknown | null;
  reverse?: unknown | null;
  geocode?: unknown;
  /** Simulates the network being down for every request. */
  failAll?: boolean;
}

/**
 * Installs a `fetch` stub that answers each provider by URL. Returns the spy so
 * a test can assert on which endpoints were called.
 */
export function mockWeatherFetch(options: MockFetchOptions = {}) {
  const {
    forecast = buildForecastFixture(),
    air = AIR_FIXTURE,
    reverse = REVERSE_GEOCODE_FIXTURE,
    geocode = GEOCODE_SEARCH_FIXTURE,
    failAll = false,
  } = options;

  return jest.spyOn(global, "fetch").mockImplementation((input) => {
    const url = String(input);

    if (failAll) {
      return Promise.reject(new TypeError("Failed to fetch"));
    }

    let body: unknown = forecast;
    if (url.includes("air-quality")) body = air;
    else if (url.includes("bigdatacloud")) body = reverse;
    else if (url.includes("geocoding-api")) body = geocode;

    if (body === null) {
      return Promise.resolve({
        ok: false,
        status: 500,
        json: () => Promise.resolve({}),
      } as Response);
    }

    return Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve(cloneJson(body)),
    } as Response);
  });
}
