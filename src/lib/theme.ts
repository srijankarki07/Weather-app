/**
 * Theme resolution.
 *
 * DESIGN.md documents Airbnb's public surfaces as light-only, but PLAN 6
 * principle 5 asks for "dark mode by default for evening hours" and PLAN 4.6
 * asks for backgrounds that follow conditions and time of day. So the app has a
 * theme, and it defaults to `auto` rather than to light.
 *
 * Resolution is a pure function so the rules can be tested without a DOM.
 */

import type { UserPreferences } from "../types/weather";

export type ResolvedTheme = "light" | "dark";

/** Hours used when there is no sunrise/sunset to hand — before data loads. */
export const DEFAULT_NIGHT_START_HOUR = 19;
export const DEFAULT_DAY_START_HOUR = 6;

export interface ThemeInputs {
  preference: UserPreferences["theme"];
  /** The system's own preference, from the media query. */
  systemPrefersDark: boolean;
  /**
   * True when the active location is between sunset and sunrise. Preferred over
   * the clock when available, because "dark at 6pm in Oslo in December" is
   * correct and an hour threshold would get it wrong.
   */
  isNight?: boolean;
  /** Local hour at the active location, 0–23. */
  localHour: number;
}

export function resolveTheme({
  preference,
  systemPrefersDark,
  isNight,
  localHour,
}: ThemeInputs): ResolvedTheme {
  if (preference === "light") return "light";
  if (preference === "dark") return "dark";

  if (preference === "system") {
    return systemPrefersDark ? "dark" : "light";
  }

  // `auto`: follow the sun where we know it, the clock where we do not.
  if (typeof isNight === "boolean") {
    return isNight ? "dark" : "light";
  }

  const night =
    localHour >= DEFAULT_NIGHT_START_HOUR || localHour < DEFAULT_DAY_START_HOUR;
  return night ? "dark" : "light";
}

export const THEME_OPTIONS: {
  value: UserPreferences["theme"];
  label: string;
  description: string;
}[] = [
  {
    value: "auto",
    label: "Automatic",
    description: "Dark after sunset at the location you are viewing.",
  },
  {
    value: "light",
    label: "Light",
    description: "Always the light palette.",
  },
  {
    value: "dark",
    label: "Dark",
    description: "Always the dark palette.",
  },
  {
    value: "system",
    label: "Match system",
    description: "Follow your device's appearance setting.",
  },
];
