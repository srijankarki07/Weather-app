/**
 * Temperature curve with precipitation probability on the same timeline.
 *
 * PLAN 4.5 calls for the two to share an axis — that overlay is the whole
 * point, since "18° and raining" is a different afternoon from "18° and clear".
 *
 * Accessibility note (PLAN 4.7): an SVG chart is opaque to a screen reader, so
 * the visualisation is `aria-hidden` and the same numbers are exposed as a
 * visually-hidden table. A summary string tells the user what the chart looks
 * like; a table tells them what it says. The table is the one that matters.
 */

import { useMemo } from "react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceDot,
  ReferenceLine,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import styles from "./HourlyChart.module.css";
import { Card } from "../ui/Card";
import { useChartColors } from "../../hooks/useChartColors";
import { useElementWidth } from "../../hooks/useElementWidth";
import {
  convertTemperature,
  formatTemperature,
  formatTemperatureShort,
  temperatureSymbol,
} from "../../lib/units";
import { formatClockTime, formatHourLabel, formatWeekday } from "../../lib/time";
import type { UnitSystem, WeatherData } from "../../types/weather";

/**
 * Roughly how much horizontal room one hour wants before its axis label starts
 * colliding with the next. Used to pick how many hours fit, not to size the
 * chart — the chart fills its container exactly.
 */
const IDEAL_HOUR_WIDTH = 62;
const MIN_HOURS = 8;
const MAX_HOURS = 24;
const CHART_HEIGHT = 210;

/**
 * Bars are plotted against a `[0, 100]` axis but scaled into the lower part, so
 * a 100% chance of rain does not draw a bar straight through the temperature
 * curve.
 */
const BAR_SCALE = 0.45;

export interface HourlyChartProps {
  data: WeatherData;
  units: UnitSystem;
  hours?: number;
}

interface ChartPoint {
  time: number;
  label: string;
  fullLabel: string;
  /** Rounded in the display unit, for the chart and its annotations. */
  temperature: number;
  /** Raw celsius, so formatters can convert rather than un-convert. */
  temperatureC: number;
  /** 0–100, for the tooltip. */
  precipitation: number;
  /** Scaled for plotting. */
  precipBar: number;
  precipitationMm: number;
}

export function HourlyChart({ data, units, hours }: HourlyChartProps) {
  const colors = useChartColors();
  const { hourly, location, current } = data;
  const timezone = location.timezone;
  const [containerRef, containerWidth] = useElementWidth<HTMLDivElement>();

  /*
   * How many hours to plot is derived from the space available rather than
   * fixed. A fixed 24 was what produced the horizontal scrollbar: at 64px per
   * hour the chart was 1536px wide inside a ~1250px card, every time.
   */
  const visibleHours =
    hours ??
    Math.max(
      MIN_HOURS,
      Math.min(MAX_HOURS, Math.floor(containerWidth / IDEAL_HOUR_WIDTH))
    );

  const points = useMemo<ChartPoint[]>(() => {
    const now = current.observedAt;
    return (
      hourly
        // Drop the hour in the past that exists only to give the curve a left
        // edge; the chart looks forward.
        .filter((point) => point.time >= now - 30 * 60 * 1000)
        .slice(0, visibleHours)
        .map((point) => {
          const probability = Math.round(point.precipitationProbability * 100);
          return {
            time: point.time,
            label: formatHourLabel(point.time, timezone),
            fullLabel: `${formatWeekday(point.time, timezone)} ${formatClockTime(
              point.time,
              timezone
            )}`,
            temperature: Math.round(convertTemperature(point.temperature, units)),
            temperatureC: point.temperature,
            precipitation: probability,
            precipBar: probability * BAR_SCALE,
            precipitationMm: point.precipitation,
          };
        })
    );
  }, [hourly, current.observedAt, visibleHours, timezone, units]);

  if (points.length === 0) {
    return (
      <Card glass title="Hourly forecast" titleId="hourly-chart-heading">
        <p className={styles.empty}>No hourly data for this location.</p>
      </Card>
    );
  }

  const temperatures = points.map((point) => point.temperature);
  const high = Math.max(...temperatures);
  const low = Math.min(...temperatures);
  const highPoint = points.find((point) => point.temperature === high)!;
  const lowPoint = points.find((point) => point.temperature === low)!;

  const wettest = points.reduce(
    (best, point) => (point.precipitation > best.precipitation ? point : best),
    points[0]
  );

  const summary =
    `${points.length}-hour forecast for ${location.name}: ` +
    `high ${high}${temperatureSymbol(units)} at ${formatClockTime(
      highPoint.time,
      timezone
    )}, low ${low}${temperatureSymbol(units)} at ${formatClockTime(
      lowPoint.time,
      timezone
    )}. ` +
    (wettest.precipitation >= 20
      ? `Peak chance of precipitation ${wettest.precipitation}% around ${formatClockTime(
          wettest.time,
          timezone
        )}.`
      : "Precipitation is unlikely.");

  // Aim for roughly eight labels regardless of how many hours are plotted.
  const labelInterval = Math.max(0, Math.ceil(points.length / 8) - 1);

  return (
    <Card
      glass
      title={`Next ${points.length} hours`}
      subtitle="Temperature and chance of rain"
      titleId="hourly-chart-heading"
    >
      <div className={styles.chartArea} ref={containerRef}>
        {/*
          No horizontal scroll. The chart measures its container and fits, so
          the only thing a scrollbar added was a UI affordance for a problem
          that should not exist.
        */}
        <div className={styles.canvas} aria-hidden="true">
          {/*
            Fixed width rather than `ResponsiveContainer`. The chart is already
            sized deliberately — hours times pixels-per-hour — and letting a
            resize observer re-measure it would only fight that, while adding a
            `ResizeObserver` dependency for no benefit.
          */}
          <ComposedChart
            width={Math.max(320, containerWidth)}
            height={CHART_HEIGHT}
            data={points}
            /*
             * Off, because Recharts otherwise puts `tabindex="0"` on the SVG —
             * and a focusable element inside an `aria-hidden` subtree is an
             * ARIA violation that Lighthouse flags. Recharts' keyboard layer
             * only reaches the nearest data point anyway; the table below is
             * the complete alternative.
             */
            accessibilityLayer={false}
            /* The low annotation sits below the curve, and the curve's lowest
               point sits near the axis — without the extra bottom margin the
               two labels overlap. */
            margin={{ top: 28, right: 16, bottom: 22, left: 16 }}
          >
              <defs>
                {/*
                  Concrete colours, not `var(--token)`. Gradient stops are read
                  by the SVG renderer rather than resolved as CSS, so a token
                  here would be a silent no-op and the fill would vanish.
                */}
                <linearGradient id="hourlyTempFill" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="0%"
                    stopColor={colors.temperature}
                    stopOpacity={0.22}
                  />
                  <stop
                    offset="100%"
                    stopColor={colors.temperature}
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>

              <CartesianGrid
                stroke={colors.grid}
                strokeDasharray="3 3"
                vertical={false}
              />

              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={{ stroke: colors.axis }}
                tick={{ fill: colors.muted, fontSize: 12 }}
                interval={labelInterval}
              />

              {/*
                Both axes are hidden. The temperature curve is annotated
                directly with its high and low, and a visible numeric axis
                competing with the precipitation scale is noise.
              */}
              {/* Two degrees of headroom, not four: a wider domain on a
                  10-degree day leaves most of the card empty. */}
              <YAxis
                yAxisId="temp"
                hide
                domain={["dataMin - 2", "dataMax + 2"]}
              />
              <YAxis yAxisId="precip" hide domain={[0, 100]} />

              <Tooltip
                cursor={{ stroke: colors.hairline }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const point = payload[0].payload as ChartPoint;
                  return (
                    <div className={styles.tooltip}>
                      <div className={styles.tooltipTime}>{point.fullLabel}</div>
                      <div className={styles.tooltipRow}>
                        <span>Temperature</span>
                        <span className={styles.tooltipValue}>
                          {formatTemperatureShort(point.temperatureC, units)}
                        </span>
                      </div>
                      <div className={styles.tooltipRow}>
                        <span>Chance of rain</span>
                        <span className={styles.tooltipValue}>
                          {point.precipitation}%
                        </span>
                      </div>
                      {point.precipitationMm > 0 && (
                        <div className={styles.tooltipRow}>
                          <span>Precipitation</span>
                          <span className={styles.tooltipValue}>
                            {point.precipitationMm.toFixed(1)} mm
                          </span>
                        </div>
                      )}
                    </div>
                  );
                }}
              />

              <Bar
                yAxisId="precip"
                dataKey="precipBar"
                fill={colors.precipitationSoft}
                radius={[3, 3, 0, 0]}
                maxBarSize={14}
                /*
                 * Animation off. Beyond never completing in a headless render —
                 * which left the bars drawn at zero height — PLAN 4.6 asks for
                 * "subtle transitions on data update, not decorative
                 * animations", and redrawing the whole curve every fifteen
                 * minutes when the data has barely moved is exactly the
                 * decorative case. It also costs main-thread time on mount.
                 */
                isAnimationActive={false}
              />

              <Line
                yAxisId="temp"
                type="monotone"
                dataKey="temperature"
                stroke={colors.temperature}
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 4, fill: colors.temperature }}
                fill="url(#hourlyTempFill)"
                isAnimationActive={false}
              />

              {/*
                The anchor the rest of the chart is read against.
                
                `yAxisId` is required, not optional: a reference element with no
                axis id defaults to `0`, and this chart's axes are "temp" and
                "precip". Without it Recharts silently renders nothing, which is
                why the "Now" marker and the high/low annotations were missing.
              */}
              <ReferenceLine
                yAxisId="temp"
                x={points[0].label}
                stroke={colors.nowMarker}
                strokeWidth={1.5}
                strokeDasharray="4 4"
                label={{
                  value: "Now",
                  position: "top",
                  fill: colors.nowMarker,
                  fontSize: 11,
                  fontWeight: 600,
                }}
              />

              {/* High and low annotated on the curve itself, per PLAN 4.5. */}
              <ReferenceDot
                yAxisId="temp"
                x={highPoint.label}
                y={highPoint.temperature}
                r={4}
                fill={colors.temperature}
                stroke={colors.surface}
                strokeWidth={2}
                label={{
                  value: `${high}°`,
                  position: "top",
                  fill: colors.ink,
                  fontSize: 12,
                  fontWeight: 600,
                }}
              />
              <ReferenceDot
                yAxisId="temp"
                x={lowPoint.label}
                y={lowPoint.temperature}
                r={4}
                fill={colors.temperature}
                stroke={colors.surface}
                strokeWidth={2}
                label={{
                  value: `${low}°`,
                  position: "bottom",
                  fill: colors.ink,
                  fontSize: 12,
                  fontWeight: 600,
                }}
              />
          </ComposedChart>
        </div>

        {/* The same data as text. Not `display: none`, which would hide it from
            exactly the users it is for. */}
        <table className="visually-hidden">
          <caption>{summary}</caption>
          <thead>
            <tr>
              <th scope="col">Time</th>
              <th scope="col">Temperature</th>
              <th scope="col">Chance of rain</th>
            </tr>
          </thead>
          <tbody>
            {points.map((point) => (
              <tr key={point.time}>
                <th scope="row">{point.fullLabel}</th>
                <td>{formatTemperature(point.temperatureC, units)}</td>
                <td>{point.precipitation}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className={styles.legend} aria-hidden="true">
        <span className={styles.legendItem}>
          <span className={styles.swatchLine} />
          Temperature
        </span>
        <span className={styles.legendItem}>
          <span className={styles.swatchBar} />
          Chance of rain
        </span>
      </div>
    </Card>
  );
}
