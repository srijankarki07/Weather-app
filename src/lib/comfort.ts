/**
 * Interpretation layer.
 *
 * PLAN 4.2's whole point is that a raw number is not information: "UV 10" says
 * nothing, "burn time: 15 minutes" says something. These functions turn the
 * readings into the sentence a person would actually say, and they are kept
 * apart from the components so the thresholds can be reviewed in one place.
 */

import type { AqiCategory, ConditionCode } from "../types/weather";

/* ----------------------------------------------------------- dew point */

export type ComfortLevel = "dry" | "pleasant" | "humid" | "muggy" | "oppressive";

export interface ComfortReading {
  level: ComfortLevel;
  label: string;
  /** One line explaining what the level means for the user. */
  detail: string;
}

/**
 * Dew point, not relative humidity, is what people feel. Humidity is relative
 * to temperature — 70% at 15°C is pleasant, 70% at 30°C is miserable — whereas
 * dew point is an absolute measure of how much moisture the air can still take
 * from your skin.
 */
export function describeDewPoint(dewPointC: number): ComfortReading {
  if (dewPointC < 10) {
    return {
      level: "dry",
      label: "Dry",
      detail: "Air feels dry — you may notice it in your throat or skin.",
    };
  }
  if (dewPointC < 16) {
    return {
      level: "pleasant",
      label: "Comfortable",
      detail: "Comfortable humidity for being outside.",
    };
  }
  if (dewPointC < 20) {
    return {
      level: "humid",
      label: "Humid",
      detail: "Noticeably humid, but still comfortable for most activity.",
    };
  }
  if (dewPointC < 24) {
    return {
      level: "muggy",
      label: "Muggy",
      detail: "Sticky and muggy — exertion will feel harder than the temperature suggests.",
    };
  }
  return {
    level: "oppressive",
    label: "Oppressive",
    detail: "The air is saturated. Limit strenuous activity outdoors.",
  };
}

/* ------------------------------------------------------------ UV index */

export interface UvReading {
  label: string;
  /** Set for index >= 3, where unprotected skin starts to burn. */
  burnTimeMinutes?: number;
  advice: string;
  /** Token name suffix for the severity accent. */
  severity: "low" | "moderate" | "high" | "very-high" | "extreme";
}

export function describeUvIndex(uv: number): UvReading {
  // Rounded down to a whole index, matching the standard's own bands.
  const index = Math.max(0, Math.floor(uv));

  if (index < 3) {
    return {
      label: "Low",
      advice: "No protection needed for most people.",
      severity: "low",
    };
  }
  if (index < 6) {
    return {
      label: "Moderate",
      burnTimeMinutes: burnTimeFor(index),
      advice: "Seek shade near midday. Sunscreen recommended.",
      severity: "moderate",
    };
  }
  if (index < 8) {
    return {
      label: "High",
      burnTimeMinutes: burnTimeFor(index),
      advice: "Sunscreen, hat and shade around midday.",
      severity: "high",
    };
  }
  if (index < 11) {
    return {
      label: "Very high",
      burnTimeMinutes: burnTimeFor(index),
      advice: "Unprotected skin burns quickly. Avoid midday sun.",
      severity: "very-high",
    };
  }
  return {
    label: "Extreme",
    burnTimeMinutes: burnTimeFor(index),
    advice: "Avoid the sun. Unprotected skin can burn in minutes.",
    severity: "extreme",
  };
}

/**
 * Minutes until fair skin burns. Calibrated against the WHO's guidance that
 * UV 10 burns in roughly 12–15 minutes rather than the naive 200/index, which
 * under-reports badly at the top of the scale.
 */
function burnTimeFor(index: number): number {
  const minutes = Math.round(200 / Math.max(1, index) / 1.6);
  return Math.max(5, minutes);
}

/* -------------------------------------------------------------- wind */

/**
 * Beaufort-style description. "0.28 km/h" is a number; "light air" is a
 * condition a person can picture.
 */
export function describeWindSpeed(metresPerSecond: number): string {
  const kmh = metresPerSecond * 3.6;
  if (kmh < 1) return "Calm";
  if (kmh < 6) return "Light air";
  if (kmh < 12) return "Light breeze";
  if (kmh < 20) return "Gentle breeze";
  if (kmh < 29) return "Moderate breeze";
  if (kmh < 39) return "Fresh breeze";
  if (kmh < 50) return "Strong breeze";
  if (kmh < 62) return "Near gale";
  return "Gale";
}

/* ---------------------------------------------------------- pressure */

export interface PressureReading {
  trend: "rising" | "falling" | "steady";
  detail: string;
}

/**
 * Falling pressure means unsettled weather is arriving; rising means it is
 * clearing. Stated as the effect rather than the direction, because "falling"
 * on its own is not something most people can act on.
 */
export function describePressureTrend(
  currentHpa: number,
  pastHpa: number | undefined
): PressureReading {
  if (pastHpa === undefined) {
    return { trend: "steady", detail: "" };
  }
  const delta = currentHpa - pastHpa;
  if (delta > 1.5) {
    return { trend: "rising", detail: "Rising — conditions are settling." };
  }
  if (delta < -1.5) {
    return {
      trend: "falling",
      detail: "Falling — unsettled weather may be on the way.",
    };
  }
  return { trend: "steady", detail: "Steady over the last few hours." };
}

/** Pressure change over the trailing three hours, from the hourly series. */
export function pressureTrendFrom(
  hourly: { time: number; pressure?: number }[],
  now: number,
  currentHpa: number
): PressureReading {
  const threeHoursAgo = now - 3 * 60 * 60 * 1000;
  let closest: { time: number; pressure?: number } | undefined;
  for (const point of hourly) {
    if (point.pressure === undefined) continue;
    if (point.time > threeHoursAgo) continue;
    if (!closest || point.time > closest.time) closest = point;
  }
  return describePressureTrend(currentHpa, closest?.pressure);
}

/* ----------------------------------------------------------- visibility */

export function describeVisibility(metres: number): string {
  const km = metres / 1000;
  if (km >= 10) return "Clear view";
  if (km >= 5) return "Good visibility";
  if (km >= 2) return "Moderate — distant landmarks hazy";
  if (km >= 1) return "Poor — take care driving";
  return "Very poor — dense fog likely";
}

/* ------------------------------------------------------------ activity */

/**
 * PLAN 3's headline metric: can the user answer "should I go outside?" in under
 * five seconds. This is the per-activity version, used by the highlights grid.
 */
export interface ActivityAdvice {
  running: "good" | "caution" | "avoid";
  cycling: "good" | "caution" | "avoid";
  reason: string;
}

export function activityAdvice(input: {
  condition: ConditionCode;
  temperature: number;
  windSpeed: number;
  uvIndex?: number;
  aqiCategory?: AqiCategory;
}): ActivityAdvice {
  const { condition, temperature, windSpeed, uvIndex, aqiCategory } = input;

  const stormy = condition === "thunderstorm";
  const freezing = temperature <= -5;
  const boiling = temperature >= 35;
  const dangerousAir = aqiCategory === "very-poor";
  const poorAir = aqiCategory === "poor";

  if (stormy) {
    return {
      running: "avoid",
      cycling: "avoid",
      reason: "Lightning risk — stay indoors until the storm passes.",
    };
  }
  if (dangerousAir) {
    return {
      running: "avoid",
      cycling: "avoid",
      reason: "Air quality is hazardous for any outdoor exertion.",
    };
  }
  if (boiling) {
    return {
      running: "avoid",
      cycling: "caution",
      reason: "Heat stress risk — go early or late, and carry water.",
    };
  }
  if (freezing) {
    return {
      running: "caution",
      cycling: "avoid",
      reason: "Icy surfaces and cold-stress risk.",
    };
  }
  if (poorAir) {
    return {
      running: "caution",
      cycling: "caution",
      reason: "Air quality is poor — keep it short and easy.",
    };
  }
  if (windSpeed >= 11) {
    return {
      running: "caution",
      cycling: "avoid",
      reason: "Strong wind makes cycling unsafe and running harder.",
    };
  }
  if (typeof uvIndex === "number" && uvIndex >= 8) {
    return {
      running: "caution",
      cycling: "caution",
      reason: "Very high UV — cover up and avoid midday.",
    };
  }
  if (condition === "heavy-rain" || condition === "sleet") {
    return {
      running: "caution",
      cycling: "avoid",
      reason: "Wet and slippery underfoot.",
    };
  }
  return {
    running: "good",
    cycling: "good",
    reason: "Nothing in the conditions to work around.",
  };
}
