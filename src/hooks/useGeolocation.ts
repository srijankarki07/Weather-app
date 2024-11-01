/**
 * Browser geolocation, wrapped in something a component can render.
 *
 * PLAN 4.4 asks for a permission flow that explains itself rather than firing
 * the browser prompt cold. This hook deliberately does *not* request on mount —
 * the caller decides when to ask and shows the rationale first. The permissions
 * API is used when available so the UI can tell "not yet asked" apart from
 * "previously denied", which are very different messages.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import type { Coordinates } from "../types/weather";

export type GeolocationStatus =
  | "idle"
  | "prompt"
  | "requesting"
  | "granted"
  | "denied"
  | "unavailable"
  | "error";

export interface GeolocationState {
  status: GeolocationStatus;
  coords: Coordinates | null;
  error: string | null;
}

interface PermissionStatusLike {
  state: PermissionState;
  addEventListener?: (type: string, listener: () => void) => void;
  removeEventListener?: (type: string, listener: () => void) => void;
}

function geolocationSupport(): "supported" | "insecure" | "unsupported" {
  if (typeof navigator === "undefined") return "unsupported";
  if (!("geolocation" in navigator)) return "unsupported";
  // Chrome and Safari both refuse geolocation outside a secure context; saying
  // so up front beats surfacing a bare "user denied the request".
  if (typeof window !== "undefined" && !window.isSecureContext) return "insecure";
  return "supported";
}

export function useGeolocation() {
  const [state, setState] = useState<GeolocationState>(() => {
    const support = geolocationSupport();
    if (support === "unsupported") {
      return {
        status: "unavailable",
        coords: null,
        error: "This browser does not support location access.",
      };
    }
    if (support === "insecure") {
      return {
        status: "unavailable",
        coords: null,
        error: "Location needs a secure (https) connection.",
      };
    }
    return { status: "idle", coords: null, error: null };
  });

  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  // Mirror the browser's stored permission so a returning visitor who already
  // denied us gets an explanation instead of a button that silently does
  // nothing.
  useEffect(() => {
    if (geolocationSupport() !== "supported") return;
    if (!("permissions" in navigator)) return;

    let permission: PermissionStatusLike | null = null;
    let cancelled = false;

    navigator.permissions
      .query({ name: "geolocation" as PermissionName })
      .then((result) => {
        if (cancelled) return;
        permission = result as unknown as PermissionStatusLike;
        setState((prev) =>
          prev.status === "idle" ? { ...prev, status: result.state } : prev
        );
        const onChange = () => {
          setState((prev) => ({ ...prev, status: permission!.state }));
        };
        permission.addEventListener?.("change", onChange);
      })
      .catch(() => {
        // Firefox has historically thrown on the geolocation permission name.
        // Not being able to pre-check is fine — the request flow still works.
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const request = useCallback((): Promise<Coordinates | null> => {
    const support = geolocationSupport();
    if (support !== "supported") return Promise.resolve(null);

    setState((prev) => ({ ...prev, status: "requesting", error: null }));

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          if (!mounted.current) return resolve(null);
          const coords = {
            lat: position.coords.latitude,
            lon: position.coords.longitude,
          };
          setState({ status: "granted", coords, error: null });
          resolve(coords);
        },
        (error) => {
          if (!mounted.current) return resolve(null);
          const { status, message } = describeError(error);
          setState({ status, coords: null, error: message });
          resolve(null);
        },
        {
          enableHighAccuracy: false,
          timeout: 12_000,
          // A reading up to five minutes old is fine for weather.
          maximumAge: 5 * 60 * 1000,
        }
      );
    });
  }, []);

  return { ...state, request };
}

function describeError(error: GeolocationPositionError): {
  status: GeolocationStatus;
  message: string;
} {
  switch (error.code) {
    case error.PERMISSION_DENIED:
      return {
        status: "denied",
        message:
          "Location access is blocked. Search for a city instead, or enable location for this site in your browser settings.",
      };
    case error.POSITION_UNAVAILABLE:
      return {
        status: "error",
        message: "Your location could not be determined right now.",
      };
    case error.TIMEOUT:
      return {
        status: "error",
        message: "Finding your location took too long. Try again.",
      };
    default:
      return { status: "error", message: "Location is unavailable." };
  }
}
