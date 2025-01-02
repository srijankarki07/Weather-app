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
import {
  convertTemperature,
  formatTemperature,
  formatTemperatureShort,
  temperatureSymbol,
} from "../../lib/units";
import { formatClockTime, formatHourLabel, formatWeekday } from "../../lib/time";
import type { UnitSystem, WeatherData } from "../../types/weather";

/** Pixels per hour. Below roughly 56 the axis labels start colliding. */
const HOUR_WIDTH = 64;
const CHART_HEIGHT = 220;

/**
 * Bars are plotted against a `[0, 100]` axis but scaled into the lower third,
 * so a 100% chance of rain does not draw a bar through the temperature curve.
 */
const BAR_SCALE = 0.33;

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

export function HourlyChart({ data, units, hours = 24 }: HourlyChartProps) {
  const colors = useChartColors();
  const { hourly, location, current } = data;
  const timezone = location.timezone;

  const points = useMemo<ChartPoint[]>(() => {
    const now = current.observedAt;
    return (
      hourly
        // Drop the hour in the past that exists only to give the curve a left
        // edge; the chart looks forward.
        .filter((point) => point.time >= now - 30 * 60 * 1000)
        .slice(0, hours)
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
  }, [hourly, current.observedAt, hours, timezone, units]);

  if (points.length === 0) {
    return (
      <Card glass title="Next 24 hours" titleId="hourly-chart-heading">
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

  const width = points.length * HOUR_WIDTH;
  // Aim for roughly eight labels regardless of how many hours are plotted.
  const labelInterval = Math.max(0, Math.ceil(points.length / 8) - 1);

  return (
    <Card
      glass
      title={`Next ${points.length} hours`}
      subtitle="Temperature and chance of rain"
      titleId="hourly-chart-heading"
    >
      <div
        className={styles.scroller}
        /* A keyboard user needs to be able to scroll this region, which
           `overflow: auto` alone does not grant. */
        tabIndex={0}
        role="group"
        aria-label="Hourly forecast chart, horizontally scrollable"
      >
        <div className={styles.canvas} style={{ width }} aria-hidden="true">
          {/*
            Fixed width rather than `ResponsiveContainer`. The chart is already
            sized deliberately — hours times pixels-per-hour — and letting a
            resize observer re-measure it would only fight that, while adding a
            `ResizeObserver` dependency for no benefit.
          */}
          <ComposedChart
            width={width}
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
            margin={{ top: 28, right: 16, bottom: 4, left: 16 }}
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
              <YAxis
                yAxisId="temp"
                hide
                domain={["dataMin - 4", "dataMax + 4"]}
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
              />

              {/* The anchor the rest of the chart is read against. */}
              <ReferenceLine
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
