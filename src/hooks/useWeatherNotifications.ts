/**
 * Severe-weather notifications.
 *
 * PLAN 4.3 asks for Web Push, and PLAN 8's risk table answers itself: push
 * needs "a backend or a service like Firebase Cloud Messaging", and this
 * project has no backend. So this is the honest subset the plan allows for —
 * in-app alerts plus a local notification for severe weather while the app is
 * open — rather than a half-built push pipeline that silently never delivers.
 *
 * What that means in practice: a notification can only be raised by a page that
 * is running. The settings panel says so, because a user who believes they will
 * be woken by a storm warning is worse off than one who knows they will not.
 */

import { useCallback, useEffect, useState } from "react";
import type { NotificationPermissionState } from "../components/ui/SettingsMenu";
import type { WeatherAlert } from "../types/weather";

/** Only these severities are worth interrupting someone for. */
const NOTIFIABLE: WeatherAlert["severity"][] = ["severe", "extreme"];

function currentPermission(): NotificationPermissionState {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }
  return Notification.permission;
}

/**
 * The Permissions API reports "prompt" where the Notification API reports
 * "default" for the same state, so the two cannot be assigned directly.
 */
function fromPermissionState(state: PermissionState): NotificationPermissionState {
  return state === "prompt" ? "default" : state;
}

export function useWeatherNotifications() {
  const [permission, setPermission] =
    useState<NotificationPermissionState>(currentPermission);
  /** Alerts already shown, so a refetch does not re-notify. */
  const [notified, setNotified] = useState<string[]>([]);

  const requestPermission = useCallback(async () => {
    if (!("Notification" in window)) return;
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
    } catch {
      // Safari on iOS historically rejected this promise outside a user
      // gesture; the state simply stays as it was.
    }
  }, []);

  const notifyFor = useCallback(
    async (alerts: WeatherAlert[], locationName: string) => {
      if (permission !== "granted") return;

      const fresh = alerts.filter(
        (alert) =>
          NOTIFIABLE.includes(alert.severity) && !notified.includes(alert.id)
      );
      if (fresh.length === 0) return;

      const alert = fresh[0];

      /*
       * Prefer the service worker's `showNotification`, which survives the page
       * losing focus. Plain `new Notification` is the fallback for browsers
       * that have the API but no registered worker — notably http://localhost
       * without a production build.
       */
      const registration = await navigator.serviceWorker?.getRegistration();
      const options: NotificationOptions = {
        body: `${alert.event} for ${locationName}, until ${new Date(
          alert.end
        ).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}.`,
        icon: "/pwa-192x192.png",
        badge: "/pwa-192x192.png",
        tag: alert.id,
        data: { url: "/" },
      };

      if (registration?.showNotification) {
        await registration.showNotification("Mero Mausam", options);
      } else if ("Notification" in window) {
        new Notification("Mero Mausam", options);
      }

      setNotified((prev) => [...prev, ...fresh.map((item) => item.id)]);
    },
    [permission, notified]
  );

  // Keep the permission state honest if the user changes it in browser
  // settings while the app is open.
  useEffect(() => {
    if (!("permissions" in navigator)) return;
    let cancelled = false;
    navigator.permissions
      .query({ name: "notifications" as PermissionName })
      .then((status) => {
        if (cancelled) return;
        const sync = () => setPermission(fromPermissionState(status.state));
        sync();
        status.addEventListener?.("change", sync);
      })
      .catch(() => {
        // Not every browser exposes notifications through the permissions API.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return {
    permission,
    requestPermission,
    notifyFor,
    /**
     * True when push would be needed to deliver alerts with the app closed.
     * The settings panel uses this to explain the limitation rather than to
     * offer something that cannot work.
     */
    backgroundDeliveryUnavailable: true,
  };
}
