/**
 * Loading state.
 *
 * PLAN 4.6 asks for skeletons that match the final layout rather than a
 * spinner. These are built from the same card and grid primitives the real
 * content uses, so the page does not reflow when data arrives — the difference
 * between a skeleton and a spinner is mostly this absence of layout shift.
 */

import { Card } from "../ui/Card";
import { Skeleton, SkeletonText } from "../ui/Skeleton";
import { MetricGrid } from "./MetricTile";

export function HeroSkeleton() {
  return (
    <Card glass elevated padding="lg">
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "var(--spacing-base)",
        }}
        aria-hidden="true"
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "var(--spacing-md)",
            }}
          >
            <Skeleton width="9rem" height="3.5rem" radius="md" />
            <Skeleton width="7rem" height="1rem" />
          </div>
          <Skeleton width="5.5rem" height="5.5rem" radius="full" />
        </div>
        <Skeleton width="12rem" height="0.9rem" />
        <Skeleton width="100%" height="2.75rem" radius="sm" />
      </div>
    </Card>
  );
}

/**
 * Stands in for the hourly chart while its chunk loads.
 *
 * The chart is lazy-loaded because the charting library is by far the heaviest
 * dependency in the app, and it sits below the fold. PLAN 5 wants a first
 * contentful paint under 1.5s on 3G and PLAN 8 names lazy-loading as the
 * mitigation for exactly this kind of bundle weight.
 */
export function ChartSkeleton() {
  return (
    <Card glass>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "var(--spacing-base)",
        }}
        aria-hidden="true"
      >
        <Skeleton width="11rem" height="1.1rem" />
        <Skeleton width="14rem" height="0.8rem" />
        <Skeleton width="100%" height="13.75rem" radius="md" />
      </div>
    </Card>
  );
}

export function MetricGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <Card glass>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "var(--spacing-base)",
        }}
        aria-hidden="true"
      >
        <Skeleton width="12rem" height="1.1rem" />
        <MetricGrid>
          {Array.from({ length: count }, (_, index) => (
            <Skeleton key={index} width="100%" height="6.5rem" radius="md" />
          ))}
        </MetricGrid>
      </div>
    </Card>
  );
}

export function ForecastSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <Card glass>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "var(--spacing-md)",
        }}
        aria-hidden="true"
      >
        <Skeleton width="9rem" height="1.1rem" />
        {Array.from({ length: rows }, (_, index) => (
          <div
            key={index}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--spacing-base)",
            }}
          >
            <Skeleton width="3rem" height="0.9rem" />
            <Skeleton width="2.5rem" height="2.5rem" radius="full" />
            <Skeleton width="100%" height="0.6rem" radius="full" />
            <Skeleton width="3.5rem" height="0.9rem" />
          </div>
        ))}
      </div>
    </Card>
  );
}

/**
 * The full-page loading view. Wrapped in a single `aria-live` region so a
 * screen reader hears one "loading" announcement instead of narrating every
 * skeleton (PLAN 4.7).
 */
export function WeatherSkeleton() {
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--spacing-lg)",
      }}
    >
      <span className="visually-hidden">Loading the latest forecast…</span>
      <HeroSkeleton />
      <MetricGridSkeleton />
      <ForecastSkeleton />
    </div>
  );
}

/** Compact placeholder used while a detail card refreshes in the background. */
export function InlineSkeleton({ lines = 3 }: { lines?: number }) {
  return <SkeletonText lines={lines} />;
}
