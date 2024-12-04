/**
 * "Rain starting in about 15 minutes."
 *
 * The headline is the feature; the strip beside it is support. Rendering
 * nothing when the hour is dry is deliberate — see `shouldShowNowcast`.
 */

import type { CSSProperties } from "react";
import styles from "./NowcastBanner.module.css";
import { DropletIcon } from "../ui/icons";
import {
  describeNowcast,
  shouldShowNowcast,
  type NowcastKind,
} from "../../lib/nowcast";
import type { WeatherData } from "../../types/weather";

export interface NowcastBannerProps {
  data: WeatherData;
}

/** Rausch for rain arriving, blue for rain leaving, grey for the status quo. */
const ACCENT: Record<NowcastKind, string> = {
  none: "var(--color-muted)",
  dry: "var(--color-muted)",
  starting: "var(--color-primary)",
  stopping: "var(--wx-rain-moderate)",
  continuing: "var(--wx-rain-moderate)",
  unknown: "var(--color-muted)",
};

export function NowcastBanner({ data }: NowcastBannerProps) {
  const nowcast = describeNowcast(data.minutely, data.current.observedAt);

  if (!shouldShowNowcast(nowcast)) return null;

  const window = data.minutely.filter(
    (point) => point.time >= data.current.observedAt - 8 * 60 * 1000
  );
  const peak = Math.max(...window.map((point) => point.precipitation), 0.001);

  return (
    <section
      className={styles.banner}
      style={{ "--nowcast-accent": ACCENT[nowcast.kind] } as CSSProperties}
      /* The hero already names the location, so the banner only needs to
         announce the change. `polite` because it is information, not an alarm —
         an `assertive` region would interrupt whatever the user is doing. */
      aria-live="polite"
      aria-label="Precipitation nowcast"
    >
      <DropletIcon className={styles.icon} size={22} />

      <div className={styles.text}>
        <span className={styles.headline}>{nowcast.headline}</span>
        {nowcast.detail && <span className={styles.detail}>{nowcast.detail}</span>}
      </div>

      <div className={styles.strip} aria-hidden="true">
        {window.map((point, index) => (
          <span
            key={point.time}
            className={[styles.bar, index === 0 ? styles.barNow : null]
              .filter(Boolean)
              .join(" ")}
            /* Height is relative to the peak, with a floor so a light shower is
               still visible rather than a flat line. */
            style={{ height: `${Math.max(8, (point.precipitation / peak) * 100)}%` }}
          />
        ))}
      </div>
    </section>
  );
}
