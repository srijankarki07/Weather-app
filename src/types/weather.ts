/**
 * Internal, provider-agnostic weather model.
 *
 * PLAN 5.2 calls for normalising every provider response into a single
 * `WeatherData` shape so the UI never talks to an API directly and swapping
 * providers stays cheap. That is what this file defines.
 *
 * Units are metric and fixed here — celsius, m/s, hPa, metres, millimetres.
 * Conversion for display happens at the edge in `lib/units.ts`, never in the
 * components.
 */

export interface Coordinates {
  lat: number;
  lon: number;
}

export interface LocationInfo {
  name: string;
  region?: string;
  country?: string;
  coords: Coordinates;
  /** Seconds to add to UTC to get local time at this location. */
  timezoneOffsetSeconds: number;
  /**
   * IANA zone, e.g. "Asia/Kathmandu". Every time the UI renders is formatted in
   * *this* zone rather than the browser's, so searching for Tokyo from London
   * shows Tokyo's clock.
   */
  timezone?: string;
}

/**
 * Normalised condition vocabulary. Every provider's bespoke code is mapped onto
 * one of these, which is what the icon set, the background gradients and the
 * activity guidance all key off.
 */
export type ConditionCode =
  | "clear"
  | "mostly-clear"
  | "partly-cloudy"
  | "cloudy"
  | "overcast"
  | "fog"
  | "haze"
  | "drizzle"
  | "rain"
  | "heavy-rain"
  | "showers"
  | "thunderstorm"
  | "snow"
  | "sleet"
  | "unknown";

export interface CurrentConditions {
  observedAt: number;
  /** Celsius. */
  temperature: number;
  /** Celsius. */
  feelsLike: number;
  /** Percent, 0–100. */
  humidity: number;
  /** hPa. */
  pressure: number;
  /** Metres, already capped by the provider. */
  visibility: number;
  /** Metres per second. */
  windSpeed: number;
  /** Metres per second. */
  windGust?: number;
  /** Degrees clockwise from north. */
  windDirection: number;
  /** Percent, 0–100. */
  cloudiness: number;
  /** Celsius, computed when the provider omits it. */
  dewPoint?: number;
  uvIndex?: number;
  condition: ConditionCode;
  /** Sentence-case label, e.g. "Broken clouds". */
  description: string;
  sunrise: number;
  sunset: number;
  /** True when the location is currently between sunset and sunrise. */
  isNight: boolean;
}

export interface HourlyPoint {
  time: number;
  temperature: number;
  feelsLike?: number;
  /** Fraction, 0–1. */
  precipitationProbability: number;
  /** Millimetres. */
  precipitation: number;
  condition: ConditionCode;
  windSpeed: number;
  uvIndex?: number;
  /** hPa. Carried for the three-hour pressure trend. */
  pressure?: number;
  /** Meters; used to render the chart's precipitation bars in mm. */
  humidity?: number;
}

export interface DailyPoint {
  /** Epoch ms at local midnight. */
  date: number;
  min: number;
  max: number;
  condition: ConditionCode;
  description: string;
  precipitationProbability: number;
  precipitation: number;
  sunrise: number;
  sunset: number;
  uvIndexMax?: number;
  windSpeedMax?: number;
}

/** Sub-hourly point used by the nowcast banner. */
export interface MinutelyPoint {
  time: number;
  /** Millimetres. */
  precipitation: number;
  /** Fraction, 0–1, when the provider supplies it. */
  probability?: number;
}

/**
 * Air quality. `aqi` is the OpenWeather 1–5 index, not the 0–500 US EPA scale —
 * the two are easy to confuse and the distinction drives the category mapping.
 */
export type AqiCategory =
  | "good"
  | "fair"
  | "moderate"
  | "poor"
  | "very-poor";

export interface Pollutants {
  pm2_5?: number;
  pm10?: number;
  no2?: number;
  o3?: number;
  so2?: number;
  co?: number;
  no?: number;
}

export interface PollenLevels {
  alder?: number;
  birch?: number;
  grass?: number;
  mugwort?: number;
  olive?: number;
  ragweed?: number;
}

export interface AirQuality {
  aqi: number;
  category: AqiCategory;
  observedAt: number;
  pollutants: Pollutants;
  /** Only available for European coordinates; absent elsewhere. */
  pollen?: PollenLevels;
  /** Change in aqi over the trailing 24h; positive means worsening. */
  trend?: number;
}

export type AlertSeverity = "minor" | "moderate" | "severe" | "extreme";

export interface WeatherAlert {
  id: string;
  event: string;
  sender: string;
  description: string;
  start: number;
  end: number;
  severity: AlertSeverity;
  /** Provider-specific tags, e.g. "Rain", "Wind". */
  tags: string[];
}

export interface WeatherData {
  location: LocationInfo;
  current: CurrentConditions;
  /** Next 24–48 hours, one entry per hour, ascending. */
  hourly: HourlyPoint[];
  /** Next 7–10 days, ascending, index 0 is today. */
  daily: DailyPoint[];
  /** Next 60 minutes at 15-minute resolution, when available. */
  minutely: MinutelyPoint[];
  airQuality?: AirQuality;
  alerts: WeatherAlert[];
  /** When this bundle was assembled locally. */
  fetchedAt: number;
  /** Providers that contributed, for the offline/staleness footer. */
  sources: string[];
}

/** A location the user has explicitly saved. */
export interface SavedLocation {
  id: string;
  name: string;
  country?: string;
  region?: string;
  coords: Coordinates;
  /** User-supplied label such as "Home". Falls back to `name`. */
  nickname?: string;
  addedAt: number;
}

export type UnitSystem = "metric" | "imperial";

export interface UserPreferences {
  units: UnitSystem;
  theme: "system" | "light" | "dark" | "auto";
  highContrast: boolean;
  reduceMotion: boolean;
}
