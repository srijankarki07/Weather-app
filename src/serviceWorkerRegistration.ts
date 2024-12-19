/**
 * Service worker registration.
 *
 * Registered only in production builds, and only from a secure origin —
 * `localhost` counts as secure, so `npm run build && npx serve build` exercises
 * this properly while `npm start` stays out of the way.
 *
 * The update flow is deliberately explicit rather than automatic: a weather app
 * silently reloading under the user's thumb is worse than an extra tap, so a
 * waiting worker raises a prompt and only takes over when the user accepts.
 */

export type UpdateAvailable = (applyUpdate: () => void) => void;

const SW_URL = `${process.env.PUBLIC_URL ?? ""}/service-worker.js`;

export function isServiceWorkerSupported(): boolean {
  return (
    typeof navigator !== "undefined" &&
    "serviceWorker" in navigator &&
    // A non-secure origin cannot register one, and attempting it just logs a
    // console error the user can do nothing about.
    (window.isSecureContext || window.location.hostname === "localhost")
  );
}

export function registerServiceWorker(
  onUpdateAvailable: UpdateAvailable
): void {
  if (!isServiceWorkerSupported()) return;

  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register(SW_URL)
      .then((registration) => {
        const promptIfWaiting = () => {
          if (!registration.waiting) return;
          onUpdateAvailable(() => {
            registration.waiting?.postMessage({ type: "SKIP_WAITING" });
            // The new worker activates on its own; one reload picks up the new
            // assets it now precaches.
            window.location.reload();
          });
        };

        // Already waiting from a previous visit.
        promptIfWaiting();

        registration.addEventListener("updatefound", () => {
          const installing = registration.installing;
          if (!installing) return;
          installing.addEventListener("statechange", () => {
            // `controller` is null on the very first install, where there is no
            // previous version to update *from* — prompting there would be
            // wrong.
            if (
              installing.state === "installed" &&
              navigator.serviceWorker.controller
            ) {
              promptIfWaiting();
            }
          });
        });
      })
      .catch((error) => {
        // A failed registration must not break the app; it only means no
        // offline support.
        console.warn("Service worker registration failed:", error);
      });
  });
}
