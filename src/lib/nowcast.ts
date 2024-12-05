/**
 * Minute-scale precipitation nowcast.
 *
 * PLAN 4.1 calls this "the single most actionable feature you can add", and it
 * is the one thing a 3-hourly forecast cannot express: whether the rain starts
 * in ten minutes or in two hours decides whether you leave now.
 *
 * The provider gives 15-minute steps, so the copy says "about" and rounds.
 * Claiming minute precision from a quarter-hourly series would be a lie dressed
 * up as a feature.
 */

import type { MinutelyPoint } from "../types/weather";
import { humanizeMinutes } from "./time";

export type NowcastKind =
  | "none"
  | "dry"
  | "starting"
  | "stopping"
  | "continuing"
  | "unknown";

export interface Nowcast {
  kind: NowcastKind;
  /** Headline sentence, e.g. "Rain starting in about 15 minutes". */
  headline: string;
  /** Supporting line, or empty when there is nothing useful to add. */
  detail: string;
  /** Minutes until the change, when there is one. */
  minutesUntilChange?: number;
  /** Peak intensity in the window, in millimetres per 15 minutes. */
  peakIntensity: number;
  /** How wet it gets, 0–1. Drives the banner's colour. */
  severity: number;
}

/**
 * Below this, precipitation is drizzle that most people would not change plans
 * for. Announcing "rain starting" for 0.05 mm produces alert fatigue and makes
 * the banner worth ignoring.
 */
const MEANINGFUL_MM = 0.1;

/** Fraction of the hour that must be wet before rain counts as "continuing". */
const CONTINUING_FRACTION = 0.6;

export function describeNowcast(
  minutely: MinutelyPoint[],
  /** Reference time; the series includes a point already elapsed. */
  now: number
): Nowcast {
  const empty: Nowcast = {
    kind: "unknown",
    headline: "",
    detail: "",
    peakIntensity: 0,
    severity: 0,
  };

  if (minutely.length === 0) return empty;

  // Only look forward — a point in the past describes weather the user has
  // already experienced.
  const window = minutely.filter((point) => point.time >= now - 8 * 60 * 1000);
  if (window.length === 0) return empty;

  const isWet = (point: MinutelyPoint) => point.precipitation >= MEANINGFUL_MM;
  const peakIntensity = Math.max(...window.map((point) => point.precipitation));
  const severity = Math.min(1, peakIntensity / 3);

  const wetCount = window.filter(isWet).length;
  const wetFraction = wetCount / window.length;
  const firstWetIndex = window.findIndex(isWet);

  const mm = (value: number) => value.toFixed(value < 1 ? 1 : 0);

  /*
   * Spacing comes from the series rather than a hard-coded 15 minutes, so a
   * provider that changes its resolution does not silently misreport how long
   * the rain lasts.
   */
  const stepMs = window.length > 1 ? window[1].time - window[0].time : 0;
  const wetDuration = humanizeMinutes((wetCount * stepMs) / 60_000);

  // --- Dry for the whole hour -------------------------------------------
  if (firstWetIndex === -1) {
    return {
      kind: "dry",
      headline: "No rain in the next hour",
      detail: "",
      peakIntensity: 0,
      severity: 0,
    };
  }

  // --- Raining already, and continuing ----------------------------------
  const isWetNow = isWet(window[0]);
  if (isWetNow && wetFraction >= CONTINUING_FRACTION) {
    const stopsAt = window.findIndex((point, index) => index > 0 && !isWet(point));
    if (stopsAt !== -1) {
      const minutes = Math.round((window[stopsAt].time - now) / 60_000);
      return {
        kind: "stopping",
        headline: `Rain stopping in about ${humanizeMinutes(minutes)}`,
        detail: `Peak rate ${mm(peakIntensity)} mm per 15 minutes.`,
        minutesUntilChange: minutes,
        peakIntensity,
        severity,
      };
    }
    return {
      kind: "continuing",
      headline: "Rain for the next hour",
      detail: `Peak rate ${mm(peakIntensity)} mm per 15 minutes.`,
      peakIntensity,
      severity,
    };
  }

  /*
   * --- Dry now, rain arriving -------------------------------------------
   *
   * `firstWetIndex` is at least 1 here, because index 0 being wet is the
   * `isWetNow` case handled above. There is deliberately no "starting now"
   * special case: at any realistic resolution the soonest future point is
   * several minutes out, and `humanizeMinutes` already renders a sub-minute
   * value as "less than a minute" rather than as "0 minutes".
   */
  if (!isWetNow && firstWetIndex > 0) {
    const minutes = Math.round((window[firstWetIndex].time - now) / 60_000);

    return {
      kind: "starting",
      headline: `Rain starting in about ${humanizeMinutes(minutes)}`,
      detail: `Lasting about ${wetDuration}.`,
      minutesUntilChange: minutes,
      peakIntensity,
      severity,
    };
  }

  // --- Raining now but clearing, or intermittent -------------------------
  if (isWetNow) {
    const stopsAt = window.findIndex((point, index) => index > 0 && !isWet(point));
    if (stopsAt !== -1) {
      const minutes = Math.round((window[stopsAt].time - now) / 60_000);
      return {
        kind: "stopping",
        headline: `Rain easing in about ${humanizeMinutes(minutes)}`,
        detail: "Showers are passing through rather than settling in.",
        minutesUntilChange: minutes,
        peakIntensity,
        severity,
      };
    }
  }

  return {
    kind: "starting",
    headline: "Showers around this hour",
    detail: "On and off rather than continuous.",
    peakIntensity,
    severity,
  };
}

/**
 * True when the banner is worth the vertical space. An hour of clear skies is
 * not news, and a permanently present banner trains people to ignore it.
 */
export function shouldShowNowcast(nowcast: Nowcast): boolean {
  if (nowcast.kind === "dry" || nowcast.kind === "unknown") return false;
  return nowcast.headline.length > 0;
}
