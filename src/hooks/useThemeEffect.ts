/**
 * Applies the resolved theme to the document.
 *
 * Themes are expressed as data attributes on `<html>` rather than as a class on
 * a wrapper, because the tokens in `styles/tokens.css` are keyed off
 * `[data-theme]` at the root — and because the page background outside the app
 * shell (overscroll, the address bar tint) has to match.
 *
 * The attributes are set imperatively rather than rendered, so a theme change
 * does not re-render the whole tree.
 */

import { useEffect, useState } from "react";
import { resolveTheme, type ResolvedTheme } from "../lib/theme";
import { getLocalHour } from "../lib/time";
import type { UserPreferences } from "../types/weather";

export interface UseThemeEffectOptions {
  preference: UserPreferences["theme"];
  highContrast: boolean;
  reduceMotion: boolean;
  /** Day/night at the active location, when the forecast has loaded. */
  isNight?: boolean;
  /** IANA zone of the active location, for the clock fallback. */
  timezone?: string;
}

/** Reads the OS preference, and keeps it live. */
export function useSystemPrefersDark(): boolean {
  const [prefersDark, setPrefersDark] = useState(() =>
    typeof window === "undefined"
      ? false
      : window.matchMedia("(prefers-color-scheme: dark)").matches
  );

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = (event: MediaQueryListEvent) => setPrefersDark(event.matches);
    media.addEventListener?.("change", onChange);
    return () => media.removeEventListener?.("change", onChange);
  }, []);

  return prefersDark;
}

export function useThemeEffect({
  preference,
  highContrast,
  reduceMotion,
  isNight,
  timezone,
}: UseThemeEffectOptions): ResolvedTheme {
  const systemPrefersDark = useSystemPrefersDark();

  const [resolved, setResolved] = useState<ResolvedTheme>(() =>
    resolveTheme({
      preference,
      systemPrefersDark,
      isNight,
      localHour: getLocalHour(Date.now(), timezone),
    })
  );

  useEffect(() => {
    const recompute = () =>
      setResolved(
        resolveTheme({
          preference,
          systemPrefersDark,
          isNight,
          localHour: getLocalHour(Date.now(), timezone),
        })
      );

    recompute();

    /*
     * In `auto` mode the theme changes on its own as the sun sets. Re-checking
     * every five minutes is cheap and means an app left open all afternoon
     * follows the light rather than needing a reload.
     */
    if (preference !== "auto") return;
    const timer = window.setInterval(recompute, 5 * 60 * 1000);
    return () => window.clearInterval(timer);
  }, [preference, systemPrefersDark, isNight, timezone]);

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-theme", resolved);

    if (highContrast) {
      root.setAttribute("data-contrast", "high");
    } else {
      root.removeAttribute("data-contrast");
    }

    /*
     * `reduceMotion` is a user preference on top of the OS setting; the OS one
     * is already handled by the media query in `base.css`, so this attribute
     * only needs to add the manual case.
     */
    if (reduceMotion) {
      root.setAttribute("data-reduce-motion", "true");
    } else {
      root.removeAttribute("data-reduce-motion");
    }
  }, [resolved, highContrast, reduceMotion]);

  return resolved;
}
