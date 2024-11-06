/**
 * Web vitals reporting.
 *
 * PLAN 3's success metrics include "First Contentful Paint < 1.5s on 3G", so
 * these are collected rather than discarded. The default CRA stub logs every
 * metric to the console in production; this reports only when a handler is
 * supplied, so wiring up a real endpoint later does not mean hunting for the
 * call site.
 *
 * Uses the `get*` API because this project pins web-vitals 2.x, where the
 * `on*` callbacks and INP do not exist yet.
 */

export type MetricName = "CLS" | "FCP" | "FID" | "LCP" | "TTFB";

export interface Metric {
  name: MetricName;
  value: number;
  /** Threshold bucket, computed by web-vitals from its own rating table. */
  rating: "good" | "needs-improvement" | "poor";
  id: string;
}

type ReportHandler = (metric: Metric) => void;

const reportWebVitals = (onPerfEntry?: ReportHandler): void => {
  if (!onPerfEntry || typeof onPerfEntry !== "function") return;

  void import("web-vitals").then((webVitals) => {
    // The library's handler types are narrower than ours; the shapes match, so
    // one cast at the boundary keeps the rest of the file readable.
    const report = onPerfEntry as unknown as Parameters<
      typeof webVitals.getCLS
    >[0];

    webVitals.getCLS(report);
    webVitals.getFCP(report);
    webVitals.getFID(report);
    webVitals.getLCP(report);
    webVitals.getTTFB(report);
  });
};

export default reportWebVitals;
