// Adds the `toBeInTheDocument`-style matchers to Jest's `expect`.
import "@testing-library/jest-dom";

/**
 * jsdom implements neither of these, and both are touched during render —
 * `matchMedia` by the reduced-motion check, `IntersectionObserver` by anything
 * that lazily reveals content. Stubbing them here keeps component tests from
 * failing for reasons unrelated to the component.
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
