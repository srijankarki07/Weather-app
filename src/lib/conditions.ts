/**
 * Presentation mapping for conditions.
 *
 * DESIGN.md's shape language is soft and its palette is restrained, so the
 * dynamic backgrounds PLAN 4.6 asks for are grouped into a handful of families
 * rather than one gradient per condition — twenty-eight near-identical
 * gradients would be a lot of surface area for very little visual difference,
 * and the restraint is the point of the system.
 */

import type { ConditionCode } from "../types/weather";

export type GradientFamily =
  | "clear"
  | "cloudy"
  | "rain"
  | "storm"
  | "snow"
  | "fog";

export type DayPeriod = "day" | "night";

export function conditionFamily(condition: ConditionCode): GradientFamily {
  switch (condition) {
    case "clear":
    case "mostly-clear":
      return "clear";
    case "partly-cloudy":
    case "cloudy":
    case "overcast":
      return "cloudy";
    case "drizzle":
    case "rain":
    case "heavy-rain":
    case "showers":
      return "rain";
    case "thunderstorm":
      return "storm";
    case "snow":
    case "sleet":
      return "snow";
    case "fog":
    case "haze":
      return "fog";
    case "unknown":
      return "cloudy";
  }
}

export function dayPeriod(isNight: boolean): DayPeriod {
  return isNight ? "night" : "day";
}

/**
 * How much the sky is actually doing, 0–1. Drives the animation intensity and
 * whether the precipitation card is worth showing at all.
 */
export function conditionIntensity(condition: ConditionCode): number {
  switch (condition) {
    case "clear":
      return 0;
    case "mostly-clear":
    case "partly-cloudy":
      return 0.2;
    case "cloudy":
    case "overcast":
    case "haze":
      return 0.35;
    case "fog":
      return 0.5;
    case "drizzle":
      return 0.55;
    case "rain":
      return 0.7;
    case "showers":
      return 0.75;
    case "heavy-rain":
      return 0.9;
    case "sleet":
      return 0.85;
    case "snow":
      return 0.8;
    case "thunderstorm":
      return 1;
    case "unknown":
      return 0;
  }
}

/** True for conditions where the user should expect to get wet. */
export function isWet(condition: ConditionCode): boolean {
  return [
    "drizzle",
    "rain",
    "heavy-rain",
    "showers",
    "thunderstorm",
    "sleet",
  ].includes(condition);
}

/**
 * Plain-language answer to PLAN 3's headline question — "should I go outside?"
 * Kept deliberately short because it renders at display size.
 */
export function outdoorVerdict(input: {
  condition: ConditionCode;
  temperature: number;
  windSpeed: number;
  uvIndex?: number;
  aqi?: number;
}): { headline: string; detail: string } {
  const { condition, temperature, windSpeed, uvIndex, aqi } = input;

  if (condition === "thunderstorm") {
    return {
      headline: "Stay inside",
      detail: "Thunderstorms nearby — wait for them to pass.",
    };
  }
  if (condition === "heavy-rain") {
    return {
      headline: "Bring an umbrella",
      detail: "Heavy rain is falling right now.",
    };
  }
  if (isWet(condition)) {
    return {
      headline: "Take an umbrella",
      detail: "Wet weather on and off through the next few hours.",
    };
  }
  if (typeof aqi === "number" && aqi > 150) {
    return {
      headline: "Limit time outside",
      detail: "Air quality is unhealthy, especially for sensitive groups.",
    };
  }
  if (temperature >= 35) {
    return {
      headline: "Too hot for long",
      detail: "Limit strenuous activity to early morning or evening.",
    };
  }
  if (temperature <= -10) {
    return {
      headline: "Bundle up",
      detail: "Frostbite risk with prolonged exposure.",
    };
  }
  if (windSpeed >= 14) {
    return {
      headline: "Windy out",
      detail: "Secure loose items before heading out.",
    };
  }
  if (typeof uvIndex === "number" && uvIndex >= 8) {
    return {
      headline: "Great, but use sunscreen",
      detail: "UV is very high — burn time is short.",
    };
  }
  if (condition === "fog") {
    return {
      headline: "Low visibility",
      detail: "Take care if you are driving.",
    };
  }
  return {
    headline: "Good to be outside",
    detail: "Nothing in the forecast to work around.",
  };
}

/**
 * Short guidance for the current air quality, mirroring PLAN 4.2's health
 * recommendations. Kept to one sentence so it fits the metric tile.
 */
export function aqiGuidance(category: string): string {
  switch (category) {
    case "good":
      return "Air quality is good — enjoy your usual outdoor activities.";
    case "fair":
      return "Air quality is acceptable for most people.";
    case "moderate":
      return "Sensitive groups should consider limiting prolonged outdoor exertion.";
    case "poor":
      return "Sensitive groups should limit outdoor exertion; everyone else should reduce long or heavy activity.";
    case "very-poor":
      return "Avoid outdoor exertion. Keep windows closed and consider a mask.";
    default:
      return "";
  }
}
