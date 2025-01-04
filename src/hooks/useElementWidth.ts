import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Reports an element's rendered width.
 *
 * The chart needs a concrete pixel width rather than a percentage, because it
 * decides how many hours it can show legibly from the space available. A fixed
 * width per hour meant the chart always overflowed its card and produced a
 * horizontal scrollbar; measuring instead lets it fit exactly and choose a
 * sensible hour count for the space.
 *
 * Returns a callback ref rather than taking a ref object, so the observer
 * attaches correctly when the node mounts after the first render — which is the
 * case here, since the chart renders behind Suspense.
 */
export function useElementWidth<T extends HTMLElement>(
  /** Used before measurement, and in environments without layout (jsdom). */
  fallback = 800
): [(node: T | null) => void, number] {
  const [width, setWidth] = useState(fallback);
  const observerRef = useRef<ResizeObserver | null>(null);

  // Disconnect when the node unmounts or is replaced.
  useEffect(() => {
    return () => observerRef.current?.disconnect();
  }, []);

  const ref = useCallback((node: T | null) => {
    observerRef.current?.disconnect();
    if (!node) return;

    if (typeof ResizeObserver === "undefined") {
      // Without layout there is nothing to measure; the fallback stands.
      return;
    }

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      // `contentRect` excludes padding, which is what the chart should fill.
      const next = Math.round(entry.contentRect.width);
      if (next > 0) setWidth(next);
    });

    observer.observe(node);
    observerRef.current = observer;
  }, []);

  return [ref, width];
}
