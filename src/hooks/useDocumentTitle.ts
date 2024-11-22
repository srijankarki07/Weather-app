import { useEffect } from "react";

/**
 * Keeps the tab title in step with what is on screen.
 *
 * This is the main way a glanceable weather app communicates when it is
 * backgrounded in a browser tab, and it is what a user sees in their history
 * afterwards — "24° · Kathmandu" is more useful there than the app name alone.
 */
export function useDocumentTitle(locationName: string, temperature?: string) {
  useEffect(() => {
    document.title = temperature
      ? `${temperature} · ${locationName} — Mero Mausam`
      : `${locationName} — Mero Mausam`;
  }, [locationName, temperature]);
}
