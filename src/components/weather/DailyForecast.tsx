import styles from "./DailyForecast.module.css";
import { Card } from "../ui/Card";
import { ConditionIcon } from "./ConditionIcon";
import { DropletIcon } from "../ui/icons";
import { formatPercent, formatTemperatureShort } from "../../lib/units";
import { rangePosition, temperatureColor } from "../../lib/palette";
import { formatWeekday, formatShortDate, isSameLocalDay } from "../../lib/time";
import type { UnitSystem, WeatherData } from "../../types/weather";

export interface DailyForecastProps {
  data: WeatherData;
  units: UnitSystem;
  /** PLAN 4.9 caps the useful horizon at 7–10 days. */
  days?: number;
}

export function DailyForecast({ data, units, days = 7 }: DailyForecastProps) {
  const { daily, location, current } = data;
  const timezone = location.timezone;
  const visible = daily.slice(0, days);

  if (visible.length === 0) return null;

  /*
   * One scale for every bar in the strip. Computing it across all visible days
   * rather than per row is what makes the bars comparable — the reason to draw
   * them at all.
   */
  const scaleMin = Math.min(...visible.map((day) => day.min));
  const scaleMax = Math.max(...visible.map((day) => day.max));

  return (
    <Card
      glass
      title={`${visible.length}-day forecast`}
      subtitle="Bars show each day's range on a shared scale"
      titleId="daily-forecast-heading"
    >
      <ul className={styles.list}>
        {visible.map((day) => {
          const isToday = isSameLocalDay(day.date, current.observedAt, timezone);
          const pop = Math.round(day.precipitationProbability * 100);
          const mean = (day.min + day.max) / 2;
          const position = rangePosition(day.min, day.max, scaleMin, scaleMax);

          const dayLabel = isToday
            ? "Today"
            : `${formatWeekday(day.date, timezone)}, ${formatShortDate(
                day.date,
                timezone
              )}`;

          return (
            <li
              key={day.date}
              className={[styles.row, isToday ? styles.today : null]
                .filter(Boolean)
                .join(" ")}
            >
              {/* The full reading in words, because the visual row is four
                  separate fragments that a screen reader would otherwise read
                  as disconnected numbers. */}
              <span className="visually-hidden">
                {`${dayLabel}: ${day.description}, high ${formatTemperatureShort(
                  day.max,
                  units
                )}, low ${formatTemperatureShort(day.min, units)}${
                  pop >= 20 ? `, ${formatPercent(day.precipitationProbability)} chance of precipitation` : ""
                }.`}
              </span>

              <span className={styles.day} aria-hidden="true">
                {isToday ? "Today" : formatWeekday(day.date, timezone)}
              </span>

              <span className={styles.iconColumn} aria-hidden="true">
                <ConditionIcon
                  className={styles.icon}
                  condition={day.condition}
                  size="2rem"
                />
              </span>

              <span className={styles.track} aria-hidden="true">
                <span
                  className={[styles.bar, isToday ? styles.todayBar : null]
                    .filter(Boolean)
                    .join(" ")}
                  style={{
                    left: `${position.left}%`,
                    width: `${position.width}%`,
                    /*
                     * Always celsius. The palette's stops are defined in
                     * celsius, so feeding it a converted value would shift
                     * every colour on the strip when the user switched to °F.
                     */
                    backgroundColor: temperatureColor(mean),
                  }}
                />
              </span>

              <span className={styles.range} aria-hidden="true">
                <span className={styles.high}>
                  {formatTemperatureShort(day.max, units)}
                </span>
                <span className={styles.low}>
                  {formatTemperatureShort(day.min, units)}
                </span>
                {pop >= 20 && (
                  <span className={styles.pop}>
                    <DropletIcon size={12} />
                    {pop}%
                  </span>
                )}
              </span>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
