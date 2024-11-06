import styles from "./DailyForecast.module.css";
import { Card } from "../ui/Card";
import { ConditionIcon } from "./ConditionIcon";
import { formatTemperatureShort, formatPercent } from "../../lib/units";
import { formatWeekday, formatShortDate, isSameLocalDay } from "../../lib/time";
import { DropletIcon } from "../ui/icons";
import type { UnitSystem, WeatherData } from "../../types/weather";

export interface DailyForecastProps {
  data: WeatherData;
  units: UnitSystem;
  /** How many days to show. PLAN 4.9 caps the useful horizon at 7–10. */
  days?: number;
}

export function DailyForecast({ data, units, days = 7 }: DailyForecastProps) {
  const { daily, location, current } = data;
  const timezone = location.timezone;
  const visible = daily.slice(0, days);

  return (
    <Card
      glass
      title={`${visible.length}-day forecast`}
      titleId="daily-forecast-heading"
    >
      <ul className={styles.list}>
        {visible.map((day) => {
          const isToday = isSameLocalDay(day.date, current.observedAt, timezone);
          const pop = Math.round(day.precipitationProbability * 100);

          return (
            <li
              key={day.date}
              className={[styles.row, isToday ? styles.today : null]
                .filter(Boolean)
                .join(" ")}
            >
              <span className={styles.day}>
                {isToday ? "Today" : formatWeekday(day.date, timezone)}
                <span className="visually-hidden">
                  {`, ${formatShortDate(day.date, timezone)}`}
                </span>
              </span>

              <ConditionIcon
                className={styles.icon}
                condition={day.condition}
                size="2.25rem"
              />

              <span className={styles.description}>{day.description}</span>

              <span className={styles.range}>
                <span className={styles.high}>
                  {formatTemperatureShort(day.max, units)}
                </span>
                <span className={styles.low}>
                  {formatTemperatureShort(day.min, units)}
                </span>
                {pop >= 20 && (
                  <span
                    className={styles.pop}
                    title={`${pop}% chance of precipitation`}
                  >
                    <DropletIcon size={12} aria-hidden="true" />
                    <span className="visually-hidden">
                      {formatPercent(day.precipitationProbability)} chance of
                      precipitation
                    </span>
                    {/* Visible digits are aria-hidden so the label above is the
                        only thing announced, rather than "droplet 40 percent". */}
                    <span aria-hidden="true">{pop}%</span>
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
