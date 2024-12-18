import { useEffect, useRef } from "react";

/**
 * Handles the PWA launch shortcuts declared in `manifest.json`.
 *
 * Opening the app from the "My location" shortcut lands on `/?here=1`, which is
 * the signal to ask for a position — that is the whole reason the user picked
 * that shortcut rather than the plain icon.
 *
 * The parameter is stripped from the URL afterwards. Leaving it would mean
 * every refresh re-triggers a permission prompt the user has already answered.
 */
export function useAppShortcut(onUseCurrentLocation: () => void): void {
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;

    const params = new URLSearchParams(window.location.search);
    if (!params.has("here")) return;

    fired.current = true;

    params.delete("here");
    const query = params.toString();
    window.history.replaceState(
      {},
      "",
      `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`
    );

    // Deferred a tick so the first fetch has already gone out; otherwise this
    // cancels the default-location request mid-flight for no benefit.
    const timer = window.setTimeout(onUseCurrentLocation, 0);
    return () => window.clearTimeout(timer);
    // Intentionally runs once: the shortcut is a launch-time instruction.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
