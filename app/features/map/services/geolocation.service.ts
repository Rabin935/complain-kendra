import { mapConfig } from "../config/map.config";
import type { Coordinates } from "../types";

export type GeolocationStatus = "granted" | "denied" | "unavailable" | "timeout" | "fallback";

export interface GeolocationResult {
  coordinates: Coordinates;
  status: GeolocationStatus;
  message?: string;
}

export function getDefaultLocation(message = "Using default location in Nepal."): GeolocationResult {
  return {
    coordinates: mapConfig.defaultLocation,
    status: "fallback",
    message,
  };
}

export function requestCurrentLocation(): Promise<GeolocationResult> {
  const geolocation = globalThis.navigator?.geolocation;

  if (!geolocation) {
    return Promise.resolve(getDefaultLocation("Geolocation is not available on this device."));
  }

  return new Promise((resolve) => {
    geolocation.getCurrentPosition(
      (position) => {
        resolve({
          coordinates: {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          },
          status: "granted",
        });
      },
      (error) => {
        const denied = error.code === error.PERMISSION_DENIED;
        const timeout = error.code === error.TIMEOUT;
        resolve({
          ...getDefaultLocation(
            denied
              ? "Location permission was denied. Showing the default Nepal location."
              : timeout
                ? "Location request timed out. Showing the default Nepal location."
                : "Unable to get GPS location. Showing the default Nepal location.",
          ),
          status: denied ? "denied" : timeout ? "timeout" : "unavailable",
        });
      },
      {
        enableHighAccuracy: true,
        timeout: mapConfig.geolocationTimeoutMs,
        maximumAge: 60 * 1000,
      },
    );
  });
}
