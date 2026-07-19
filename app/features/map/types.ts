export type MapProvider = "leaflet" | "google";
export type MapTheme = "light" | "dark";
export type SearchProvider = "nominatim";
export type ReverseGeocodingProvider = "nominatim";

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface MapAddress {
  formattedAddress: string;
  area?: string;
  city?: string;
  district?: string;
  municipality?: string;
  ward?: string;
  wardNumber?: string;
  province?: string;
  postalCode?: string;
}

export interface LocationSearchResult {
  id: string;
  label: string;
  coordinates: Coordinates;
  address: MapAddress;
}

export type MapMarkerCategory =
  | "complaint"
  | "user"
  | "officer"
  | "government_office"
  | "ai_hotspot";

export interface MapMarker {
  id: string;
  coordinates: Coordinates;
  category: MapMarkerCategory;
  title?: string;
  description?: string;
  color?: string;
}

export interface WardLookupResult {
  wardId: string;
  wardNumber: string;
  wardName: string;
  municipality: string;
  district: string;
  province: string;
}

export interface SelectedMapLocation {
  coordinates: Coordinates;
  address?: MapAddress;
  ward?: WardLookupResult;
  source: "geolocation" | "fallback" | "marker_drag" | "map_click" | "search" | "reset";
}

export interface InteractiveMapProps {
  markers?: MapMarker[];
  selectedLocation?: Coordinates;
  theme?: MapTheme;
  height?: number;
  searchPlaceholder?: string;
  showInfoPanel?: boolean;
  autoLocate?: boolean;
  onLocationChange?: (location: SelectedMapLocation) => void;
  onMarkerPress?: (marker: MapMarker) => void;
}
