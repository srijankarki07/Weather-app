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
  /**
   * Colour of the severity dot beside the label. Omit for metrics with no
   * severity scale, which then render a plain label.
   */
  severityColor?: string;
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
  severityColor,
}: MetricTileProps) {
  const compact = isCompactValue(value);

  return (
    <div
      className={styles.tile}
      data-accent={severityColor ? "true" : "false"}
      style={
        severityColor
          ? ({ "--tile-accent": severityColor } as CSSProperties)
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

/**
 * Auto-fitting grid.
 *
 * `minmax(11rem, 1fr)` rather than 9rem: at 9rem the tiles packed four and five
 * to a row on a wide card, which is what made the section read as congested.
 * The wider floor gives two or three columns of comfortably sized tiles, and
 * the row gap is larger than the column gap so the rows separate clearly.
 */
export function MetricGrid({ children }: MetricGridProps) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(11rem, 1fr))",
        gap: "var(--spacing-base) var(--spacing-md)",
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
