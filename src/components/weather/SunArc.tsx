/**
 * Sunrise, sunset and how much daylight is left.
 *
 * The useful information is not the two times on their own but *where the day
 * currently sits between them*, so the times bracket a track with the elapsed
 * portion filled in.
 *
 * This replaces a half-ellipse arc that occupied a third of the viewport to
 * say the same thing. The component keeps its name because it still answers the
 * same question; only the drawing changed.
 */

import styles from "./SunArc.module.css";
import { Card } from "../ui/Card";
import { SunriseIcon, SunsetIcon } from "../ui/icons";
import { formatClockTime, humanizeMinutes } from "../../lib/time";
import type { WeatherData } from "../../types/weather";

const DAY_MS = 24 * 60 * 60 * 1000;

export interface SunArcProps {
  data: WeatherData;
}

export function SunArc({ data }: SunArcProps) {
  const { current, location, daily } = data;
  const timezone = location.timezone;

  const sunrise = current.sunrise;
  const sunset = current.sunset;
  const dayLength = sunset - sunrise;

  // A malformed sunrise/sunset pair would divide by zero below.
  if (!(dayLength > 0)) return null;

  const now = current.observedAt;
  const isNight = current.isNight;
  const isBeforeDawn = now < sunrise;

  /*
   * `isNight` covers both sides of the dark — before dawn and after dusk — but
   * the two need opposite arithmetic. Before dawn, today's sunrise is still
   * ahead; after dusk it has passed and the next one is tomorrow's.
   */
  const msUntilSunrise = isBeforeDawn ? sunrise - now : sunrise + DAY_MS - now;

  const daylightMessage = isNight
    ? `Sunrise in ${humanizeMinutes(msUntilSunrise / 60_000)}`
    : `${humanizeMinutes((sunset - now) / 60_000)} of daylight left`;

  /*
   * Clamped, so a clock skew or a bundle left open overnight cannot push the
   * marker off the track.
   */
  const progress = isBeforeDawn
    ? 0
    : Math.min(1, Math.max(0, (now - sunrise) / dayLength));

  const totalHours = Math.floor(dayLength / 3_600_000);
  const totalMinutes = Math.round((dayLength % 3_600_000) / 60_000);

  // Once today's sun is down, tomorrow's times are the useful ones.
  const tomorrow = isNight ? daily[1] : undefined;

  return (
    <Card glass title="Daylight" titleId="sun-arc-heading">
      <div className={styles.wrap}>
        <div className={styles.times}>
          <span className={styles.time}>
            <SunriseIcon className={styles.icon} size={18} />
            <span>
              {formatClockTime(sunrise, timezone)}
              <span className={styles.timeLabel}>Sunrise</span>
            </span>
          </span>

          <span className={`${styles.time} ${styles.timeEnd}`}>
            <span>
              {formatClockTime(tomorrow ? tomorrow.sunset : sunset, timezone)}
              <span className={styles.timeLabel}>
                {tomorrow ? "Tomorrow's sunset" : "Sunset"}
              </span>
            </span>
            <SunsetIcon className={styles.icon} size={18} />
          </span>
        </div>

        <div
          className={styles.track}
          role="img"
          aria-label={`${Math.round(progress * 100)} percent of daylight elapsed. ${daylightMessage}. ${totalHours} hours ${totalMinutes} minutes of daylight in total.`}
        >
          <span
            className={styles.fill}
            style={{ width: `${progress * 100}%` }}
            aria-hidden="true"
          />
          <span
            className={[styles.marker, isNight ? styles.markerNight : null]
              .filter(Boolean)
              .join(" ")}
            style={{ left: `${progress * 100}%` }}
            aria-hidden="true"
          />
        </div>

        <p className={styles.summary}>
          {daylightMessage}
          <span className={styles.summaryDivider}> · </span>
          {totalHours}h {totalMinutes}m of daylight in total
        </p>
      </div>
    </Card>
  );
}
