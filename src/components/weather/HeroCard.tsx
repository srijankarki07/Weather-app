import styles from "./HeroCard.module.css";
import { Card } from "../ui/Card";
import { ConditionIcon } from "./ConditionIcon";
import { LocationIcon } from "../ui/icons";
import {
  formatTemperature,
  formatTemperatureShort,
  temperatureSymbol,
} from "../../lib/units";
import { formatClockTime, formatLongDate } from "../../lib/time";
import { outdoorVerdict } from "../../lib/conditions";
import type { UnitSystem, WeatherData } from "../../types/weather";

export interface HeroCardProps {
  data: WeatherData;
  units: UnitSystem;
}

/**
 * Current conditions: the number, the sky, where and when, and the one-line
 * answer to what the weather means for the day.
 */
export function HeroCard({ data, units }: HeroCardProps) {
  const { current, location } = data;
  const timezone = location.timezone;

  const place = [location.name, location.region, location.country]
    .filter(Boolean)
    // A city whose region equals its name (common for city-states) should not
    // read "Singapore, Singapore".
    .filter((part, index, all) => all.indexOf(part) === index)
    .join(", ");

  const verdict = outdoorVerdict({
    condition: current.condition,
    temperature: current.temperature,
    windSpeed: current.windSpeed,
    uvIndex: current.uvIndex,
    aqi: data.airQuality?.aqi,
  });

  const iconLabel = `${current.description}, ${formatTemperatureShort(
    current.temperature,
    units
  )}`;

  return (
    /*
     * `titleId` without `title`: Card labels the section with this heading but
     * renders no visible header, because the temperature is the hero here and a
     * "Current conditions" title above it would compete with the thing the user
     * actually came for.
     *
     * The heading itself is the document's h1. Every card below is an h2, so
     * without this the page had no top-level heading at all and a screen reader
     * had no entry point into the outline.
     */
    <Card glass elevated padding="lg" titleId="current-conditions-heading">
      <h1 className="visually-hidden" id="current-conditions-heading">
        {`Current conditions in ${place}`}
      </h1>

      <div className={styles.hero}>
        <div className={styles.top}>
          <div>
            <div className={styles.reading}>
              <span className={styles.temperature}>
                {formatTemperature(current.temperature, units)}
              </span>
              <span className={styles.unit}>°{temperatureSymbol(units).slice(1)}</span>
            </div>
            <p className={styles.description}>{current.description}</p>
          </div>
          <ConditionIcon
            className={styles.icon}
            condition={current.condition}
            isNight={current.isNight}
            size="5.5rem"
            label={iconLabel}
          />
        </div>

        <p className={styles.place}>
          <LocationIcon className={styles.placeIcon} size={16} />
          <span>{place}</span>
        </p>

        <div className={styles.facts}>
          <span>
            Feels like {formatTemperatureShort(current.feelsLike, units)}
          </span>
          <span className={styles.factDivider} aria-hidden="true" />
          <span>
            {formatClockTime(current.observedAt, timezone)} local
          </span>
          <span className={styles.factDivider} aria-hidden="true" />
          <span>{formatLongDate(current.observedAt, timezone)}</span>
        </div>

        <p className={styles.verdict}>
          <span className={styles.verdictHeadline}>{verdict.headline}</span>
          <span className={styles.verdictDetail}>{verdict.detail}</span>
        </p>
      </div>
    </Card>
  );
}
