/**
 * Government severe-weather alerts.
 *
 * The description from the NWS is a full bulletin — several paragraphs of
 * capitals and coordinates. Clamping it to three lines with a "More" toggle
 * keeps the forecast on the first screen while leaving the full text one tap
 * away, which is the balance PLAN 4.3 asks for.
 *
 * The banner is a `role="alert"` region only for the top alert, so a screen
 * reader interrupting the user is reserved for genuinely urgent weather.
 */

import { useState } from "react";
import styles from "./AlertBanner.module.css";
import { AlertIcon } from "../ui/icons";
import { formatClockTime } from "../../lib/time";
import type { WeatherAlert } from "../../types/weather";

const SEVERITY_LABEL: Record<WeatherAlert["severity"], string> = {
  minor: "Advisory",
  moderate: "Watch",
  severe: "Warning",
  extreme: "Emergency",
};

export interface AlertBannerProps {
  alerts: WeatherAlert[];
  timezone?: string;
  /** How many to show before collapsing into a count. */
  max?: number;
}

export function AlertBanner({ alerts, timezone, max = 2 }: AlertBannerProps) {
  if (alerts.length === 0) return null;

  const shown = alerts.slice(0, max);
  const remaining = alerts.length - shown.length;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--spacing-sm)",
      }}
    >
      {shown.map((alert, index) => (
        <Alert
          key={alert.id}
          alert={alert}
          timezone={timezone}
          /* Only the first banner is assertive; the rest are polite so a
             screen reader does not read them over each other. */
          urgent={index === 0}
        />
      ))}

      {remaining > 0 && (
        <p className={styles.window}>
          {remaining} more {remaining === 1 ? "alert" : "alerts"} for this area.
        </p>
      )}
    </div>
  );
}

function Alert({
  alert,
  timezone,
  urgent,
}: {
  alert: WeatherAlert;
  timezone?: string;
  urgent: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  // NWS descriptions are plain text with hard line breaks.
  const paragraphs = alert.description.split(/\n{1,}/).filter(Boolean);
  const isLong = alert.description.length > 240;

  return (
    <section
      className={styles.banner}
      data-severity={alert.severity}
      role={urgent ? "alert" : "status"}
    >
      <AlertIcon className={styles.icon} size={22} />

      <div className={styles.body}>
        <div className={styles.head}>
          <span className={styles.event}>{alert.event}</span>
          <span className={styles.severity}>
            {SEVERITY_LABEL[alert.severity]}
          </span>
          <span className={styles.window}>
            Until {formatClockTime(alert.end, timezone)}
          </span>
        </div>

        <p className={`${styles.description} ${!expanded && isLong ? styles.clamped : ""}`}>
          {expanded ? paragraphs.join(" ") : paragraphs[0]}
        </p>

        <span className={styles.sender}>Issued by {alert.sender}</span>

        {isLong && (
          <button
            type="button"
            className={styles.toggle}
            onClick={() => setExpanded((prev) => !prev)}
            aria-expanded={expanded}
          >
            {expanded ? "Show less" : "Show full alert"}
          </button>
        )}
      </div>
    </section>
  );
}
