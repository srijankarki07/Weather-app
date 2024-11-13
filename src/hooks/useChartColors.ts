/**
 * Resolves design tokens to concrete colour strings for the charting library.
 *
 * Recharts writes colours into SVG presentation attributes and into a few
 * inline styles, and it also needs real values for things like gradient stops.
 * Depending on `var(--token)` working inside a presentation attribute is a
 * needless risk, so the tokens are read from computed style once and re-read
 * whenever the theme changes.
 *
 * The alternative — hard-coding hex values in the chart — would silently drift
 * from `tokens.css` the first time a token changed.
 */

import { useEffect, useState } from "react";

export interface ChartColors {
  temperature: string;
  precipitation: string;
  precipitationSoft: string;
  grid: string;
  axis: string;
  ink: string;
  muted: string;
  surface: string;
  hairline: string;
  nowMarker: string;
  uv: string;
}

function read(): ChartColors {
  if (typeof window === "undefined") {
    return FALLBACK;
  }
  const style = getComputedStyle(document.documentElement);
  const token = (name: string, fallback: string) =>
    style.getPropertyValue(name).trim() || fallback;

  return {
    /*
     * The temperature curve deliberately does not use the brand accent. Rausch
     * means "clickable" everywhere else in this system, and a chart line is not
     * a control.
     */
    temperature: token("--wx-chart-temperature", "#428bff"),
    precipitation: token("--wx-rain-moderate", "#4a9de0"),
    precipitationSoft: token("--wx-rain-light", "#a8d5ff"),
    grid: token("--color-hairline-soft", "#ebebeb"),
    axis: token("--color-hairline", "#dddddd"),
    ink: token("--color-ink", "#222222"),
    muted: token("--color-muted", "#6a6a6a"),
    surface: token("--color-canvas", "#ffffff"),
    hairline: token("--color-hairline", "#dddddd"),
    nowMarker: token("--color-primary", "#ff385c"),
    uv: token("--wx-uv-high", "#d2691e"),
  };
}

const FALLBACK: ChartColors = {
  temperature: "#428bff",
  precipitation: "#4a9de0",
  precipitationSoft: "#a8d5ff",
  grid: "#ebebeb",
  axis: "#dddddd",
  ink: "#222222",
  muted: "#6a6a6a",
  surface: "#ffffff",
  hairline: "#dddddd",
  nowMarker: "#ff385c",
  uv: "#d2691e",
};

export function useChartColors(): ChartColors {
  const [colors, setColors] = useState<ChartColors>(read);

  useEffect(() => {
    /*
     * Theme switches happen by mutating a data attribute on <html>, which does
     * not re-render React, so the values have to be re-read from an observer.
     */
    const observer = new MutationObserver(() => setColors(read()));
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme", "data-contrast"],
    });

    // Also catch a system scheme change, which the CSS media query follows.
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onSchemeChange = () => setColors(read());
    media.addEventListener?.("change", onSchemeChange);

    return () => {
      observer.disconnect();
      media.removeEventListener?.("change", onSchemeChange);
    };
  }, []);

  return colors;
}
