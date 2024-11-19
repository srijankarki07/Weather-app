/**
 * Sunrise and sunset, drawn as a day-length arc.
 *
 * The arc answers "how much daylight is left" in one glance, which two
 * timestamps do not. The elapsed portion is stroked in the sun accent so the
 * progression of the day is legible without reading any numbers.
 *
 * After dark the marker becomes a moon and the arc reads as fully elapsed —
 * showing a sun parked at the horizon at 2am would be worse than showing
 * nothing.
 */

import styles from "./SunArc.module.css";
import { Card } from "../ui/Card";
import { SunriseIcon, SunsetIcon } from "../ui/icons";
import { formatClockTime, humanizeMinutes } from "../../lib/time";
import type { WeatherData } from "../../types/weather";

export interface SunArcProps {
  data: WeatherData;
}

/** Geometry of a half-ellipse inside a 200x105 viewBox. */
const CX = 100;
const CY = 92;
const RX = 88;
const RY = 76;

/** Approximate length of the half-ellipse, for the dash-based progress. */
const ARC_LENGTH = Math.PI * ((3 * (RX + RY)) / 2 - Math.sqrt(RX * RY));

const DAY_MS = 24 * 60 * 60 * 1000;

export function SunArc({ data }: SunArcProps) {
  const { current, location, daily } = data;
  const timezone = location.timezone;

  const sunrise = current.sunrise;
  const sunset = current.sunset;
  const dayLength = sunset - sunrise;

  if (!(dayLength > 0)) {
    return null;
  }

  const now = current.observedAt;
  const isNight = current.isNight;
  const isBeforeDawn = now < sunrise;

  /*
   * `isNight` covers both sides of the dark — before dawn and after dusk — but
   * the two need opposite arithmetic. Before dawn, today's sunrise is still
   * ahead; after dusk it has passed and the next one is tomorrow's.
   */
  const msUntilSunrise = isBeforeDawn
    ? sunrise - now
    : sunrise + DAY_MS - now;

  const daylightMessage = isNight
    ? `${humanizeMinutes(msUntilSunrise / 60_000)} until sunrise`
    : `${humanizeMinutes((sunset - now) / 60_000)} of daylight left`;

  /*
   * Clamped, so a clock skew or a bundle left open overnight cannot push the
   * marker off the arc and render a sun floating outside the card.
   */
  const progress = isBeforeDawn
    ? 0
    : Math.min(1, Math.max(0, (now - sunrise) / dayLength));

  const angle = Math.PI * (1 - progress);
  const sunX = CX + RX * Math.cos(angle);
  const sunY = CY - RY * Math.sin(angle);

  const totalHours = Math.floor(dayLength / 3_600_000);
  const totalMinutes = Math.round((dayLength % 3_600_000) / 60_000);

  // Once today's sun is down, tomorrow's times are the useful ones.
  const tomorrow = isNight ? daily[1] : undefined;

  return (
    <Card glass title="Sun" titleId="sun-arc-heading">
      <div className={styles.wrap}>
        <div className={styles.arc} aria-hidden="true">
          <svg className={styles.svg} viewBox="0 0 200 105">
            <line
              className={styles.horizon}
              x1={CX - RX}
              y1={CY}
              x2={CX + RX}
              y2={CY}
            />

            <path
              className={styles.track}
              d={`M ${CX - RX} ${CY} A ${RX} ${RY} 0 0 1 ${CX + RX} ${CY}`}
            />

            {/* Progress along the same path, revealed by dash offset. */}
            <path
              className={styles.elapsed}
              d={`M ${CX - RX} ${CY} A ${RX} ${RY} 0 0 1 ${CX + RX} ${CY}`}
              strokeDasharray={ARC_LENGTH}
              strokeDashoffset={ARC_LENGTH * (1 - progress)}
            />

            {isNight ? (
              <circle className={styles.moon} cx={CX} cy={CY - RY * 0.62} r={7} />
            ) : (
              <g>
                <circle className={styles.sunHalo} cx={sunX} cy={sunY} r={12} />
                <circle className={styles.sun} cx={sunX} cy={sunY} r={6} />
              </g>
            )}
          </svg>
        </div>

        <div className={styles.times}>
          <span className={styles.time}>
            <SunriseIcon size={18} />
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
            <SunsetIcon size={18} />
          </span>
        </div>

        <p className={styles.daylight}>
          {daylightMessage} · {totalHours}h {totalMinutes}m of daylight
        </p>
      </div>
    </Card>
  );
}
