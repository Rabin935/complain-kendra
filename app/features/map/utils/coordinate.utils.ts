import type { Coordinates } from "../types";

export function isValidCoordinates(coordinates: Coordinates | null | undefined): coordinates is Coordinates {
  return (
    !!coordinates &&
    Number.isFinite(coordinates.lat) &&
    Number.isFinite(coordinates.lng) &&
    coordinates.lat >= -90 &&
    coordinates.lat <= 90 &&
    coordinates.lng >= -180 &&
    coordinates.lng <= 180
  );
}

export function roundCoordinates(coordinates: Coordinates, precision = 6): Coordinates {
  const factor = 10 ** precision;
  return {
    lat: Math.round(coordinates.lat * factor) / factor,
    lng: Math.round(coordinates.lng * factor) / factor,
  };
}

export function coordinatesKey(coordinates: Coordinates, precision = 4): string {
  const rounded = roundCoordinates(coordinates, precision);
  return `${rounded.lat},${rounded.lng}`;
}

export function formatCoordinates(coordinates: Coordinates): string {
  const rounded = roundCoordinates(coordinates);
  return `${rounded.lat.toFixed(6)}, ${rounded.lng.toFixed(6)}`;
}
