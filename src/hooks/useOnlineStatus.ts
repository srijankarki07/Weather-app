import { useEffect, useState } from "react";

/**
 * Tracks connectivity.
 *
 * `navigator.onLine` is only a hint — it reports whether the device has a
 * network interface up, not whether the internet is reachable, so a captive
 * portal reads as online. It is good enough to choose between "you are offline"
 * and "the request failed", which is the distinction the stale banner needs.
 */
export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(() =>
    typeof navigator === "undefined" ? true : navigator.onLine
  );

  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);

    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  return online;
}
