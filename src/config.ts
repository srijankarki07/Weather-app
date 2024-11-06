/**
 * Runtime configuration and the cache-timing table from PLAN 5.2.
 *
 * There is no API key here, and that is deliberate. PLAN 5.3 recommends
 * OpenWeather One Call 3.0, but it sits behind a paid subscription, and PLAN
 * 5.4 wants keys held server-side — which this project cannot do, having no
 * backend. Open-Meteo is keyless and covers everything the revamp needs, so the
 * constraint and the recommendation resolve to the same answer: no key to
 * leak, and PLAN 9's "all API keys are server-side only" is satisfied by there
 * being none.
 */

export const OPEN_METEO_BASE = "https://api.open-meteo.com/v1";
export const OPEN_METEO_AIR_BASE = "https://air-quality-api.open-meteo.com/v1";
export const OPEN_METEO_GEOCODE_BASE = "https://geocoding-api.open-meteo.com/v1";
export const BIGDATACLOUD_REVERSE_BASE =
  "https://api.bigdatacloud.net/data/reverse-geocode-client";

/**
 * TanStack Query stale times. PLAN 5.2: "Cache aggressively but invalidate
 * intelligently." Keeping them in one table makes the policy reviewable.
 */
export const STALE_TIME = {
  current: 10 * 60 * 1000,
  hourly: 30 * 60 * 1000,
  daily: 60 * 60 * 1000,
  airQuality: 30 * 60 * 1000,
  alerts: 5 * 60 * 1000,
} as const;

/** How long cached data stays usable offline after its last successful fetch. */
export const MAX_CACHE_AGE = 12 * 60 * 60 * 1000;

/**
 * Where the app points when nothing is stored and geolocation has not been
 * granted. Kathmandu is the project's home city, which makes it a more useful
 * placeholder than a hard-coded zero coordinate in the Atlantic.
 */
export const DEFAULT_LOCATION = {
  name: "Kathmandu",
  country: "NP",
  lat: 27.7172,
  lon: 85.324,
} as const;
