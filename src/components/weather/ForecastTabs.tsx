/**
 * Hourly / Radar tab switcher.
 *
 * PLAN 6 puts both visualisations behind a tab rather than stacking them,
 * which keeps the scroll layout from doubling in length — PLAN 4.6's whole
 * premise is that the important things are reachable without hunting.
 *
 * The radar is only mounted once its tab has been opened. That goes one better
 * than lazy-loading on render: a user who never opens the map never downloads
 * Leaflet at all, which is the largest dependency in the project.
 *
 * Tabs follow the WAI-ARIA tabs pattern: `role="tablist"`, arrow-key
 * navigation between tabs, and `aria-controls` pointing at the panel.
 */

import { Suspense, lazy, useRef, useState } from "react";
import styles from "./ForecastTabs.module.css";
import { Card } from "../ui/Card";
import { ChartSkeleton } from "./WeatherSkeleton";
import { ChartIcon, MapIcon } from "../ui/icons";
import type { UnitSystem, WeatherData } from "../../types/weather";

const HourlyChart = lazy(() =>
  import("./HourlyChart").then((module) => ({ default: module.HourlyChart }))
);

const RadarMap = lazy(() =>
  import("./RadarMap").then((module) => ({ default: module.RadarMap }))
);

type TabId = "hourly" | "radar";

const TABS: { id: TabId; label: string; Icon: typeof ChartIcon }[] = [
  { id: "hourly", label: "Hourly", Icon: ChartIcon },
  { id: "radar", label: "Radar", Icon: MapIcon },
];

export interface ForecastTabsProps {
  data: WeatherData;
  units: UnitSystem;
}

export function ForecastTabs({ data, units }: ForecastTabsProps) {
  const [active, setActive] = useState<TabId>("hourly");
  /** Latches once the radar has been opened, so it stays mounted after. */
  const [radarOpened, setRadarOpened] = useState(false);
  const tabRefs = useRef<Record<TabId, HTMLButtonElement | null>>({
    hourly: null,
    radar: null,
  });

  const select = (id: TabId) => {
    setActive(id);
    if (id === "radar") setRadarOpened(true);
  };

  /**
   * Pulls the map chunk down on hover or focus rather than on idle. A pointer
   * resting on the tab is a much stronger signal than a timer, and it gives the
   * download a head start on the click without costing anything for the
   * majority of sessions that never open the map.
   */
  const warmRadar = () => {
    void import("./RadarMap").catch(() => {});
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    event.preventDefault();
    const index = TABS.findIndex((tab) => tab.id === active);
    const next =
      event.key === "ArrowRight"
        ? TABS[(index + 1) % TABS.length]
        : TABS[(index - 1 + TABS.length) % TABS.length];
    select(next.id);
    tabRefs.current[next.id]?.focus();
  };

  return (
    <div>
      <div
        className={styles.tablist}
        role="tablist"
        aria-label="Forecast view"
        onKeyDown={onKeyDown}
      >
        {TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            ref={(node) => {
              tabRefs.current[id] = node;
            }}
            type="button"
            role="tab"
            id={`tab-${id}`}
            aria-selected={active === id}
            aria-controls={`panel-${id}`}
            /* Only the active tab is in the tab order; arrows move between
               them, which is what the pattern specifies. */
            tabIndex={active === id ? 0 : -1}
            className={[styles.tab, active === id ? styles.tabActive : null]
              .filter(Boolean)
              .join(" ")}
            onClick={() => select(id)}
            onMouseEnter={id === "radar" ? warmRadar : undefined}
            onFocus={id === "radar" ? warmRadar : undefined}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </div>

      <div
        className={styles.panel}
        role="tabpanel"
        id="panel-hourly"
        aria-labelledby="tab-hourly"
        hidden={active !== "hourly"}
      >
        {/* Kept mounted while hidden so switching back does not refetch or
            lose the chart's scroll position. */}
        <Suspense fallback={<ChartSkeleton />}>
          <HourlyChart data={data} units={units} hours={24} />
        </Suspense>
      </div>

      <div
        className={styles.panel}
        role="tabpanel"
        id="panel-radar"
        aria-labelledby="tab-radar"
        hidden={active !== "radar"}
      >
        {radarOpened ? (
          <Suspense
            fallback={
              <Card glass title="Radar" titleId="radar-heading">
                <p style={{ padding: "var(--spacing-xl) 0", textAlign: "center" }}>
                  Loading map…
                </p>
              </Card>
            }
          >
            <RadarMap data={data} />
          </Suspense>
        ) : null}
      </div>
    </div>
  );
}
