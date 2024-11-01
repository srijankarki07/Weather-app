/**
 * Weather glyphs.
 *
 * Replaces the bitmap PNGs the app used before, which were fixed-size and
 * unthemeable. These are inline SVG built from the same primitives everywhere —
 * one cloud mass drawn as three circles unioned with a rounded rectangle, so
 * every cloudy variant shares a silhouette and only the accents differ.
 *
 * `currentColor` carries the cloud, so the glyph inherits the surrounding text
 * colour and stays legible in both themes without a second set of assets.
 */

import type { CSSProperties } from "react";
import styles from "./ConditionIcon.module.css";
import type { ConditionCode } from "../../types/weather";

export interface ConditionIconProps {
  condition: ConditionCode;
  isNight?: boolean;
  /** Any CSS length. Defaults to 3rem. */
  size?: string | number;
  /** Decorative by default; pass a label to expose it to assistive tech. */
  label?: string;
  className?: string;
  style?: CSSProperties;
}

/* -------------------------------------------------------------- shapes */

/** Three circles and a bar unioned into a flat-bottomed cloud. */
function CloudMass({ y = 0, opacity = 1 }: { y?: number; opacity?: number }) {
  return (
    <g className={styles.mass} opacity={opacity} transform={`translate(0 ${y})`}>
      <circle cx="23" cy="36" r="10" />
      <circle cx="37" cy="31" r="15" />
      <circle cx="50" cy="37" r="9" />
      <rect x="23" y="38" width="27" height="8" rx="4" />
    </g>
  );
}

function Sun() {
  return (
    <g>
      <circle className={styles.accent} cx="34" cy="30" r="13" />
      <g className={styles.stroke}>
        <line x1="34" y1="6" x2="34" y2="12" />
        <line x1="34" y1="48" x2="34" y2="54" />
        <line x1="10" y1="30" x2="16" y2="30" />
        <line x1="52" y1="30" x2="58" y2="30" />
        <line x1="17" y1="13" x2="21" y2="17" />
        <line x1="47" y1="43" x2="51" y2="47" />
        <line x1="51" y1="13" x2="47" y2="17" />
        <line x1="21" y1="43" x2="17" y2="47" />
      </g>
    </g>
  );
}

function Moon() {
  return (
    <path
      className={styles.accent}
      d="M40 10a20 20 0 1 0 14 34 16 16 0 0 1-14-34Z"
    />
  );
}

/**
 * Falling drops. Drawn with `stroke` rather than the cloud's `fill`, so the
 * colour is set on the group and inherited by each line.
 */
function Drops({ count = 3, heavy = false }: { count?: number; heavy?: boolean }) {
  const positions = [22, 34, 46, 28, 40].slice(0, count);
  return (
    <g style={{ stroke: "var(--wx-icon-precip)" }}>
      {positions.map((x) => (
        <line
          key={x}
          x1={x}
          y1={52}
          x2={heavy ? x - 2 : x}
          y2={heavy ? 62 : 58}
          strokeWidth={3}
          strokeLinecap="round"
        />
      ))}
    </g>
  );
}

/** Snowflakes, staggered vertically so the column does not read as a line. */
function Flakes({ count = 3 }: { count?: number }) {
  const positions: [number, number][] = [
    [22, 56],
    [34, 61],
    [46, 55],
  ];
  return (
    <g style={{ fill: "var(--wx-icon-precip)" }}>
      {positions.slice(0, count).map(([cx, cy]) => (
        <circle key={cx} cx={cx} cy={cy} r="2.6" />
      ))}
    </g>
  );
}

function Bolt() {
  return (
    <path
      className={styles.bolt}
      d="M36 46h10l-6 10h6l-14 16 4-12h-6l6-14Z"
    />
  );
}

/** Fog reads as horizontal bars rather than a distinct cloud. */
function FogBars() {
  return (
    <g className={styles.stroke}>
      <line x1="14" y1="50" x2="50" y2="50" />
      <line x1="20" y1="58" x2="56" y2="58" />
      <line x1="14" y1="66" x2="42" y2="66" />
    </g>
  );
}

/* ------------------------------------------------------------- registry */

function renderCondition(
  condition: ConditionCode,
  isNight: boolean
): JSX.Element {
  switch (condition) {
    case "clear":
      return isNight ? <Moon /> : <Sun />;

    case "mostly-clear":
      return (
        <>
          {isNight ? <Moon /> : <Sun />}
          <CloudMass y={8} opacity={0.85} />
        </>
      );

    case "partly-cloudy":
      return (
        <>
          {isNight ? <Moon /> : <Sun />}
          <CloudMass y={4} />
        </>
      );

    case "cloudy":
      return (
        <>
          <CloudMass y={-6} opacity={0.55} />
          <CloudMass y={6} />
        </>
      );

    case "overcast":
      return (
        <>
          <CloudMass y={-8} opacity={0.45} />
          <CloudMass y={2} opacity={0.75} />
          <CloudMass y={10} />
        </>
      );

    case "fog":
    case "haze":
      return (
        <>
          <CloudMass y={-4} opacity={0.9} />
          <FogBars />
        </>
      );

    case "drizzle":
      return (
        <>
          <CloudMass />
          <Drops count={2} />
        </>
      );

    case "rain":
      return (
        <>
          <CloudMass />
          <Drops count={3} />
        </>
      );

    case "showers":
      return (
        <>
          {isNight ? <Moon /> : <Sun />}
          <CloudMass y={4} />
          <Drops count={3} />
        </>
      );

    case "heavy-rain":
      return (
        <>
          <CloudMass />
          <Drops count={5} heavy />
        </>
      );

    case "thunderstorm":
      return (
        <>
          <CloudMass />
          <Bolt />
        </>
      );

    case "snow":
      return (
        <>
          <CloudMass />
          <Flakes count={3} />
        </>
      );

    case "sleet":
      return (
        <>
          <CloudMass />
          <Drops count={1} />
          <Flakes count={2} />
        </>
      );

    case "unknown":
    default:
      return <CloudMass />;
  }
}

export function ConditionIcon({
  condition,
  isNight = false,
  size = "3rem",
  label,
  className,
  style,
}: ConditionIconProps) {
  const decorative = !label;

  return (
    <svg
      className={[styles.icon, className].filter(Boolean).join(" ")}
      style={{ width: size, height: size, ...style }}
      viewBox="0 0 68 72"
      role={decorative ? "presentation" : "img"}
      aria-hidden={decorative ? true : undefined}
      aria-label={label}
      focusable="false"
    >
      {label && <title>{label}</title>}
      {renderCondition(condition, isNight)}
    </svg>
  );
}
