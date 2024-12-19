/**
 * Severe-weather alerts.
 *
 * PLAN 4.3 wants a government alerts banner. OpenWeather One Call includes
 * alerts, but that product needs a paid subscription, and Open-Meteo has no
 * alerts endpoint at all. The National Weather Service publishes them free and
 * without a key — the catch being that it covers the United States only.
 *
 * So this is a US-only source, and the app is honest about that rather than
 * implying global coverage: no alerts are shown outside the US, and nothing
 * claims the absence of alerts means clear weather.
 *
 * NWS requires a `User-Agent` identifying the application and will reject
 * requests without one.
 */

import { getJson } from "./http";
import { normalizeNwsAlert } from "./normalize";
import type { WeatherAlert } from "../types/weather";

const NWS_ALERTS_URL = "https://api.weather.gov/alerts/active";

/** NWS asks for a descriptive UA with contact information. */
const USER_AGENT = "MeroMausam/1.0 (weather app; https://mero-mausam.vercel.app)";

interface NwsAlertFeature {
  id?: string;
  properties?: {
    id?: string;
    event?: string;
    senderName?: string;
    description?: string;
    instruction?: string;
    onset?: string;
    effective?: string;
    ends?: string;
    expires?: string;
    severity?: string;
  };
}

interface NwsAlertsResponse {
  features?: NwsAlertFeature[];
}

/**
 * Fetches active alerts for a coordinate.
 *
 * Returns an empty array — never an error — when the location is outside NWS
 * coverage, because "we have no alert source here" and "there is nothing to
 * warn you about" should both leave the user with no banner, and neither should
 * take down the forecast.
 */
export async function fetchAlerts(
  lat: number,
  lon: number,
  { signal }: { signal?: AbortSignal } = {}
): Promise<WeatherAlert[]> {
  try {
    const raw = await getJson<NwsAlertsResponse>(
      /* Rounded to four decimals, which is the precision NWS accepts. */
      `${NWS_ALERTS_URL}?point=${lat.toFixed(4)},${lon.toFixed(4)}`,
      { signal, timeoutMs: 8000, headers: { "User-Agent": USER_AGENT, Accept: "application/geo+json" } }
    );

    const alerts = (raw.features ?? [])
      .map((feature) =>
        normalizeNwsAlert({
          id: feature.id ?? feature.properties?.id,
          event: feature.properties?.event,
          senderName: feature.properties?.senderName,
          description: feature.properties?.description,
          onset: feature.properties?.onset ?? feature.properties?.effective,
          expires: feature.properties?.expires ?? feature.properties?.ends,
          severity: feature.properties?.severity,
        })
      )
      .filter((alert): alert is WeatherAlert => alert !== null);

    /*
     * Most severe first, then soonest to start. A warning about the next hour
     * matters more than an advisory covering three days.
     */
    const rank: Record<WeatherAlert["severity"], number> = {
      extreme: 0,
      severe: 1,
      moderate: 2,
      minor: 3,
    };

    return alerts.sort(
      (a, b) => rank[a.severity] - rank[b.severity] || a.start - b.start
    );
  } catch {
    // Includes the 400 that NWS returns for non-US coordinates.
    return [];
  }
}
