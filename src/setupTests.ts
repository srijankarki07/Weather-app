// Adds the `toBeInTheDocument`-style matchers to Jest's `expect`.
import "@testing-library/jest-dom";

// jsdom ships no IndexedDB, so Dexie would silently degrade to "no cache" and
// the offline tests below would pass against a code path that never ran.
import "fake-indexeddb/auto";

/**
 * jsdom implements none of these, and all three are touched during a render —
 * `matchMedia` by the reduced-motion and colour-scheme checks,
 * `ResizeObserver` by Recharts' ResponsiveContainer, and
 * `IntersectionObserver` by anything that lazily reveals content. Stubbing them
 * here keeps component tests from failing for reasons unrelated to the
 * component under test.
 */
if (!window.matchMedia) {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}

/**
 * jsdom does not expose Node's `structuredClone`, and `fake-indexeddb` calls it
 * on every write. Without this, every Dexie write throws and the offline cache
 * silently degrades to "always empty" — which makes the offline tests pass
 * against a code path that never executed.
 *
 * The clone covers the shapes this app actually stores: primitives, `Date`,
 * `Array` and plain objects. It is deliberately not a general implementation,
 * and it throws on anything else rather than quietly mangling it.
 */
if (typeof (globalThis as { structuredClone?: unknown }).structuredClone !== "function") {
  function clone<T>(value: T): T {
    if (value === null || typeof value !== "object") return value;
    if (value instanceof Date) return new Date(value.getTime()) as unknown as T;
    if (Array.isArray(value)) {
      return value.map((item) => clone(item)) as unknown as T;
    }
    if (value instanceof Map || value instanceof Set) {
      throw new Error(
        "The structuredClone test polyfill cannot copy Map or Set values."
      );
    }
    const result: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      result[key] = clone(item);
    }
    return result as T;
  }

  (globalThis as { structuredClone?: unknown }).structuredClone = clone;
}

if (!("ResizeObserver" in window)) {
  /**
   * Reports a fixed size to every observer rather than doing nothing. A no-op
   * leaves ResponsiveContainer at zero width, so the chart renders an empty SVG
   * and tests would be asserting against a blank chart without saying so.
   */
  class MockResizeObserver implements ResizeObserver {
    private readonly callback: ResizeObserverCallback;

    constructor(callback: ResizeObserverCallback) {
      this.callback = callback;
    }

    observe(target: Element): void {
      const size = { width: 800, height: 240 };
      const entry = {
        target,
        contentRect: {
          ...size,
          x: 0,
          y: 0,
          top: 0,
          left: 0,
          right: size.width,
          bottom: size.height,
          toJSON: () => size,
        },
        borderBoxSize: [{ inlineSize: size.width, blockSize: size.height }],
        contentBoxSize: [{ inlineSize: size.width, blockSize: size.height }],
        devicePixelContentBoxSize: [
          { inlineSize: size.width, blockSize: size.height },
        ],
      } as unknown as ResizeObserverEntry;

      this.callback([entry], this);
    }

    unobserve(): void {}
    disconnect(): void {}
  }

  (window as unknown as { ResizeObserver: unknown }).ResizeObserver =
    MockResizeObserver;
}

if (!("IntersectionObserver" in window)) {
  class MockIntersectionObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return [];
    }
    root = null;
    rootMargin = "";
    thresholds = [];
  }
  (window as unknown as { IntersectionObserver: unknown }).IntersectionObserver =
    MockIntersectionObserver;
}
