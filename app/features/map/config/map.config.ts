import type {
  Coordinates,
  MapProvider,
  MapTheme,
  ReverseGeocodingProvider,
  SearchProvider,
} from "../types";

function numberFromEnv(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export const mapConfig = {
  provider: (process.env.EXPO_PUBLIC_MAP_PROVIDER || "leaflet") as MapProvider,
  searchProvider: (process.env.EXPO_PUBLIC_MAP_SEARCH_PROVIDER || "nominatim") as SearchProvider,
  reverseGeocodingProvider: (
    process.env.EXPO_PUBLIC_MAP_REVERSE_GEOCODING_PROVIDER || "nominatim"
  ) as ReverseGeocodingProvider,
  googleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || "",
  defaultLocation: {
    lat: numberFromEnv(process.env.EXPO_PUBLIC_MAP_DEFAULT_LAT, 27.7172),
    lng: numberFromEnv(process.env.EXPO_PUBLIC_MAP_DEFAULT_LNG, 85.324),
  } satisfies Coordinates,
  defaultZoom: numberFromEnv(process.env.EXPO_PUBLIC_MAP_DEFAULT_ZOOM, 14),
  minZoom: numberFromEnv(process.env.EXPO_PUBLIC_MAP_MIN_ZOOM, 8),
  maxZoom: numberFromEnv(process.env.EXPO_PUBLIC_MAP_MAX_ZOOM, 19),
  theme: (process.env.EXPO_PUBLIC_MAP_THEME || "light") as MapTheme,
  geolocationTimeoutMs: numberFromEnv(process.env.EXPO_PUBLIC_MAP_GEOLOCATION_TIMEOUT_MS, 9000),
  reverseGeocodeDebounceMs: numberFromEnv(
    process.env.EXPO_PUBLIC_MAP_REVERSE_GEOCODE_DEBOUNCE_MS,
    450,
  ),
  searchDebounceMs: numberFromEnv(process.env.EXPO_PUBLIC_MAP_SEARCH_DEBOUNCE_MS, 350),
};
