import { useEffect } from "react";

/**
 * Warms the lazily-split chunks once the page is idle.
 *
 * The chart and the map used to load on first tab activation, which is correct
 * for the *first* paint — PLAN 5 wants a first contentful paint under 1.5s on
 * 3G, and 143 kB of charting and mapping libraries would blow that. But it also
 * means the user's first tap on a tab waits for a download.
 *
 * Prefetching on idle gets both: nothing competes with the initial render, and
 * by the time anyone taps a tab the chunk is already in the HTTP cache. It is
 * skipped entirely on a metered or slow connection, where the download is
 * exactly what the user does not want.
 */

type NetworkInformation = {
  saveData?: boolean;
  effectiveType?: string;
};

function shouldPrefetch(): boolean {
  if (typeof navigator === "undefined") return false;

  const connection = (navigator as Navigator & { connection?: NetworkInformation })
    .connection;

  // Respect an explicit data-saving preference above everything else.
  if (connection?.saveData) return false;

  // 2G and slow-3G: the prefetch would compete with whatever the user is doing.
  if (connection?.effectiveType && /(^|-)2g$/.test(connection.effectiveType)) {
    return false;
  }

  return true;
}

/** `requestIdleCallback` is not in Safari, hence the timer fallback. */
function onIdle(callback: () => void): () => void {
  const idle = (
    window as Window & {
      requestIdleCallback?: (cb: () => void, options?: { timeout: number }) => number;
      cancelIdleCallback?: (handle: number) => void;
    }
  ).requestIdleCallback;

  if (typeof idle === "function") {
    const handle = idle(callback, { timeout: 3000 });
    return () =>
      (window as Window & { cancelIdleCallback?: (h: number) => void })
        .cancelIdleCallback?.(handle);
  }

  const timer = window.setTimeout(callback, 1200);
  return () => window.clearTimeout(timer);
}

export function usePrefetchChunks(enabled: boolean): void {
  useEffect(() => {
    if (!enabled || !shouldPrefetch()) return;

    return onIdle(() => {
      // Failures are ignored: a prefetch that does not happen simply means the
      // chunk loads when it is actually needed, which is the old behaviour.
      void import("../components/weather/HourlyChart").catch(() => {});
      void import("../components/weather/RadarMap").catch(() => {});
    });
  }, [enabled]);
}
