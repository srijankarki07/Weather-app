/**
 * Display-unit conversion.
 *
 * The internal model is always metric (see `types/weather.ts`); conversion
 * happens here, at the very edge, so no component has to know which system the
 * user picked. PLAN 4.7 also asks for text scaling, so every formatter returns
 * a short string without a unit suffix where the unit is shown separately in
 * the UI — that keeps the number and the label independently styleable.
 */

import type { UnitSystem } from "../types/weather";

export function celsiusToFahrenheit(celsius: number): number {
  return (celsius * 9) / 5 + 32;
}

/** Converts a metric temperature to the active system, unrounded. */
export function convertTemperature(
  celsius: number,
  units: UnitSystem
): number {
  return units === "imperial" ? celsiusToFahrenheit(celsius) : celsius;
}

export function temperatureSymbol(units: UnitSystem): string {
  return units === "imperial" ? "°F" : "°C";
}

/** Rounded temperature without a unit suffix, e.g. "24". */
export function formatTemperature(
  celsius: number,
  units: UnitSystem
): string {
  return String(Math.round(convertTemperature(celsius, units)));
}

/** e.g. "24°" — the degree glyph alone, for dense layouts. */
export function formatTemperatureShort(
  celsius: number,
  units: UnitSystem
): string {
  return `${formatTemperature(celsius, units)}°`;
}

/** e.g. "24°C". */
export function formatTemperatureFull(
  celsius: number,
  units: UnitSystem
): string {
  return `${formatTemperature(celsius, units)}${temperatureSymbol(units)}`;
}

/** Metres per second to km/h or mph. */
export function formatWindSpeed(
  metresPerSecond: number,
  units: UnitSystem
): { value: string; unit: string } {
  if (units === "imperial") {
    return {
      value: String(Math.round(metresPerSecond * 2.23694)),
      unit: "mph",
    };
  }
  return { value: String(Math.round(metresPerSecond * 3.6)), unit: "km/h" };
}

export function formatPressure(
  hectopascals: number,
  units: UnitSystem
): { value: string; unit: string } {
  if (units === "imperial") {
    return {
      value: (hectopascals * 0.02953).toFixed(2),
      unit: "inHg",
    };
  }
  return { value: String(Math.round(hectopascals)), unit: "hPa" };
}

export function formatVisibility(
  metres: number,
  units: UnitSystem
): { value: string; unit: string } {
  if (units === "imperial") {
    const miles = metres / 1609.344;
    return {
      value: miles >= 10 ? String(Math.round(miles)) : miles.toFixed(1),
      unit: "mi",
    };
  }
  const km = metres / 1000;
  return {
    value: km >= 10 ? String(Math.round(km)) : km.toFixed(1),
    unit: "km",
  };
}

export function formatPrecipitation(
  millimetres: number,
  units: UnitSystem
): { value: string; unit: string } {
  if (units === "imperial") {
    return { value: (millimetres / 25.4).toFixed(2), unit: "in" };
  }
  return { value: millimetres.toFixed(1), unit: "mm" };
}

/** Compass point for a wind bearing, e.g. 180 → "S". */
export function windDirectionLabel(degrees: number): string {
  const points = [
    "N",
    "NNE",
    "NE",
    "ENE",
    "E",
    "ESE",
    "SE",
    "SSE",
    "S",
    "SSW",
    "SW",
    "WSW",
    "W",
    "WNW",
    "NW",
    "NNW",
  ];
  const index = Math.round(((degrees % 360) + 360) % 360 / 22.5) % 16;
  return points[index];
}

export function formatPercent(fraction: number): string {
  return `${Math.round(fraction * 100)}%`;
}
