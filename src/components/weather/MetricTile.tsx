import type { CSSProperties, ReactNode } from "react";
import styles from "./MetricTile.module.css";

export interface MetricTileProps {
  label: string;
  /** The main reading. Numbers are rendered at display weight, words smaller. */
  value: ReactNode;
  /** Rendered after the value in the muted unit style. */
  unit?: string;
  /** One line of interpretation — PLAN 4.2's "so what" for each metric. */
  hint?: ReactNode;
  icon?: ReactNode;
  /** Sets the left severity rail. Omit for metrics with no severity scale. */
  accentColor?: string;
}

/**
 * Renders a value at display size when it is short and numeric, and at title
 * size when it is a word like "Unhealthy". A long word at 21px/700 in a narrow
 * tile is the fastest way to break the grid at large text sizes.
 */
function isCompactValue(value: ReactNode): boolean {
  return typeof value === "number" || /^[\d.,°%\-+\s]+$/.test(String(value ?? ""));
}

export function MetricTile({
  label,
  value,
  unit,
  hint,
  icon,
  accentColor,
}: MetricTileProps) {
  const compact = isCompactValue(value);

  return (
    <div
      className={styles.tile}
      data-accent={accentColor ? "true" : "false"}
      style={
        accentColor
          ? ({ "--tile-accent": accentColor } as CSSProperties)
          : undefined
      }
    >
      <div className={styles.head}>
        <span className={styles.label}>{label}</span>
        {icon && <span className={styles.icon}>{icon}</span>}
      </div>

      <div className={styles.reading}>
        <span className={compact ? styles.value : styles.valueText}>{value}</span>
        {unit && <span className={styles.unit}>{unit}</span>}
      </div>

      {hint && <p className={styles.hint}>{hint}</p>}
    </div>
  );
}

export interface MetricGridProps {
  children: ReactNode;
}

/** Auto-fitting grid, so tiles reflow to two or three columns without media
 *  queries and never squeeze below a legible width. */
export function MetricGrid({ children }: MetricGridProps) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(9rem, 1fr))",
        gap: "var(--spacing-md)",
      }}
    >
      {children}
    </div>
  );
}

/** Trend indicator for metrics that carry a direction over time. */
export function Trend({
  delta,
  /** Set for metrics where a rising number is good (e.g. none currently). */
  higherIsBetter = false,
  unit = "",
}: {
  delta: number;
  higherIsBetter?: boolean;
  unit?: string;
}) {
  const flat = Math.abs(delta) < 0.5;
  const better = higherIsBetter ? delta > 0 : delta < 0;
  const className = flat
    ? styles.trendFlat
    : better
      ? styles.trendBetter
      : styles.trendWorse;

  const glyph = flat ? "→" : delta > 0 ? "↑" : "↓";
  const meaning = flat
    ? "steady over 24h"
    : `${delta > 0 ? "up" : "down"} ${Math.abs(delta)}${unit} over 24h`;

  return (
    <span className={`${styles.trend} ${className}`}>
      <span aria-hidden="true">{glyph}</span>
      <span>{meaning}</span>
    </span>
  );
}
