import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type * as Leaflet from "leaflet";
import { colors } from "../../../constants/colors";
import { mapConfig } from "../config/map.config";
import { requestCurrentLocation } from "../services/geolocation.service";
import { searchLocations } from "../services/locationSearch.service";
import { reverseGeocode } from "../services/reverseGeocoding.service";
import { mockWardLookupService } from "../services/wardLookup.service";
import type {
  Coordinates,
  InteractiveMapProps,
  LocationSearchResult,
  MapMarker,
  SelectedMapLocation,
} from "../types";
import { formatCoordinates, isValidCoordinates } from "../utils/coordinate.utils";

const markerColors: Record<MapMarker["category"], string> = {
  complaint: colors.primary,
  user: colors.info,
  officer: colors.success,
  government_office: colors.accent,
  ai_hotspot: colors.error,
};

function ensureLeafletStylesheet() {
  if (document.getElementById("complain-kendra-leaflet-css")) {
    return;
  }

  const link = document.createElement("link");
  link.id = "complain-kendra-leaflet-css";
  link.rel = "stylesheet";
  link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
  document.head.appendChild(link);
}

function createMarkerIcon(leaflet: typeof Leaflet, marker: MapMarker) {
  const color = marker.color || markerColors[marker.category] || colors.primary;

  return leaflet.divIcon({
    className: "complain-kendra-marker",
    html: `<span style="
      display:block;
      width:18px;
      height:18px;
      border-radius:999px;
      background:${color};
      border:3px solid #fff;
      box-shadow:0 6px 16px rgba(42,21,80,0.28);
    "></span>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
}

function createSelectedIcon(leaflet: typeof Leaflet) {
  return leaflet.divIcon({
    className: "complain-kendra-selected-marker",
    html: `<span style="
      display:block;
      width:34px;
      height:34px;
      border-radius:18px 18px 18px 4px;
      transform:rotate(-45deg);
      background:${colors.primary};
      border:3px solid #fff;
      box-shadow:0 10px 22px rgba(42,21,80,0.34);
    "><span style="
      display:block;
      width:9px;
      height:9px;
      border-radius:999px;
      background:#fff;
      margin:10px auto 0;
    "></span></span>`,
    iconSize: [40, 40],
    iconAnchor: [20, 38],
  });
}

function tileLayerForTheme(theme: InteractiveMapProps["theme"]) {
  if (theme === "dark") {
    return {
      url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
      attribution: "&copy; OpenStreetMap contributors &copy; CARTO",
    };
  }

  return {
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: "&copy; OpenStreetMap contributors",
  };
}

export default function InteractiveMap({
  markers = [],
  selectedLocation,
  theme = mapConfig.theme,
  height = 500,
  searchPlaceholder = "Search address, landmark, municipality, ward...",
  showInfoPanel = true,
  autoLocate = true,
  onLocationChange,
  onMarkerPress,
}: InteractiveMapProps) {
  const mapElementRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Leaflet.Map | null>(null);
  const leafletRef = useRef<typeof Leaflet | null>(null);
  const selectedMarkerRef = useRef<Leaflet.Marker | null>(null);
  const markerLayerRef = useRef<Leaflet.LayerGroup | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const currentCoordinatesRef = useRef<Coordinates>(
    selectedLocation ?? mapConfig.defaultLocation,
  );

  const [coordinates, setCoordinates] = useState<Coordinates>(
    selectedLocation ?? mapConfig.defaultLocation,
  );
  const [address, setAddress] = useState("Finding address...");
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<LocationSearchResult[]>([]);
  const [loadingMap, setLoadingMap] = useState(true);
  const [loadingLocation, setLoadingLocation] = useState(true);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const visibleMarkers = useMemo(() => markers.filter((marker) => isValidCoordinates(marker.coordinates)), [markers]);

  const publishLocation = useCallback(
    (nextCoordinates: Coordinates, source: SelectedMapLocation["source"], immediate = false) => {
      if (!isValidCoordinates(nextCoordinates)) {
        setError("Invalid coordinates selected.");
        return;
      }

      const leaflet = leafletRef.current;
      setCoordinates(nextCoordinates);
      currentCoordinatesRef.current = nextCoordinates;
      setError(null);

      if (selectedMarkerRef.current && leaflet) {
        selectedMarkerRef.current.setLatLng([nextCoordinates.lat, nextCoordinates.lng]);
      }

      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      const refreshAddress = async () => {
        try {
          const [nextAddress, ward] = await Promise.all([
            reverseGeocode(nextCoordinates),
            mockWardLookupService.lookupWard(nextCoordinates),
          ]);
          setAddress(nextAddress.formattedAddress);
          onLocationChange?.({
            coordinates: nextCoordinates,
            address: nextAddress,
            ward: ward ?? undefined,
            source,
          });
        } catch {
          setAddress("Address unavailable");
          setError("Could not refresh address. Check your connection and try again.");
          onLocationChange?.({
            coordinates: nextCoordinates,
            source,
          });
        }
      };

      if (immediate) {
        void refreshAddress();
        return;
      }

      debounceRef.current = setTimeout(refreshAddress, mapConfig.reverseGeocodeDebounceMs);
    },
    [onLocationChange],
  );

  const moveMapTo = useCallback(
    (nextCoordinates: Coordinates, zoom = mapConfig.defaultZoom) => {
      mapRef.current?.setView([nextCoordinates.lat, nextCoordinates.lng], zoom, {
        animate: true,
      });
    },
    [],
  );

  const locateMe = useCallback(async () => {
    setLoadingLocation(true);
    const result = await requestCurrentLocation();
    setError(result.message ?? null);
    moveMapTo(result.coordinates);
    publishLocation(result.coordinates, result.status === "granted" ? "geolocation" : "fallback", true);
    setLoadingLocation(false);
  }, [moveMapTo, publishLocation]);

  useEffect(() => {
    let cancelled = false;

    async function createMap() {
      ensureLeafletStylesheet();
      const leaflet = await import("leaflet");

      if (cancelled || !mapElementRef.current || mapRef.current) {
        return;
      }

      leafletRef.current = leaflet;
      const initialCoordinates = selectedLocation ?? mapConfig.defaultLocation;
      const tile = tileLayerForTheme(theme);
      const map = leaflet
        .map(mapElementRef.current, {
          center: [initialCoordinates.lat, initialCoordinates.lng],
          zoom: mapConfig.defaultZoom,
          minZoom: mapConfig.minZoom,
          maxZoom: mapConfig.maxZoom,
          zoomControl: false,
          attributionControl: true,
        })
        .addLayer(leaflet.tileLayer(tile.url, { attribution: tile.attribution }));

      mapRef.current = map;
      markerLayerRef.current = leaflet.layerGroup().addTo(map);
      window.setTimeout(() => map.invalidateSize(), 80);
      window.setTimeout(() => map.invalidateSize(), 300);

      if ("ResizeObserver" in window) {
        resizeObserverRef.current = new ResizeObserver(() => {
          map.invalidateSize();
        });
        resizeObserverRef.current.observe(mapElementRef.current);
      }

      selectedMarkerRef.current = leaflet
        .marker([initialCoordinates.lat, initialCoordinates.lng], {
          draggable: true,
          icon: createSelectedIcon(leaflet),
          keyboard: true,
          title: "Selected location",
        })
        .addTo(map)
        .on("drag", (event) => {
          const marker = event.target as Leaflet.Marker;
          const latLng = marker.getLatLng();
          setCoordinates({ lat: latLng.lat, lng: latLng.lng });
        })
        .on("dragend", (event) => {
          const marker = event.target as Leaflet.Marker;
          const latLng = marker.getLatLng();
          publishLocation({ lat: latLng.lat, lng: latLng.lng }, "marker_drag");
        });

      map.on("click", (event: Leaflet.LeafletMouseEvent) => {
        const nextCoordinates = {
          lat: event.latlng.lat,
          lng: event.latlng.lng,
        };
        publishLocation(nextCoordinates, "map_click");
      });

      setLoadingMap(false);
      if (autoLocate) {
        void locateMe();
      } else {
        publishLocation(initialCoordinates, "reset", true);
        setLoadingLocation(false);
      }
    }

    void createMap();

    return () => {
      cancelled = true;
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      resizeObserverRef.current?.disconnect();
      resizeObserverRef.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
      selectedMarkerRef.current = null;
      markerLayerRef.current = null;
    };
  }, [autoLocate, locateMe, publishLocation, theme]);

  useEffect(() => {
    const leaflet = leafletRef.current;
    const layer = markerLayerRef.current;

    if (!leaflet || !layer) {
      return;
    }

    layer.clearLayers();
    visibleMarkers.forEach((marker) => {
      const item = leaflet
        .marker([marker.coordinates.lat, marker.coordinates.lng], {
          icon: createMarkerIcon(leaflet, marker),
          keyboard: true,
          title: marker.title ?? marker.category,
        })
        .addTo(layer);

      if (marker.title || marker.description) {
        item.bindPopup(
          `<strong>${marker.title ?? "Marker"}</strong>${marker.description ? `<br>${marker.description}` : ""}`,
        );
      }

      item.on("click", () => onMarkerPress?.(marker));
    });
  }, [onMarkerPress, visibleMarkers]);

  useEffect(() => {
    if (!selectedLocation || !isValidCoordinates(selectedLocation)) {
      return;
    }

    const currentCoordinates = currentCoordinatesRef.current;
    if (
      Math.abs(currentCoordinates.lat - selectedLocation.lat) < 0.000001 &&
      Math.abs(currentCoordinates.lng - selectedLocation.lng) < 0.000001
    ) {
      return;
    }

    moveMapTo(selectedLocation);
    publishLocation(selectedLocation, "reset", true);
  }, [moveMapTo, publishLocation, selectedLocation]);

  useEffect(() => {
    const trimmed = query.trim();

    if (trimmed.length < 2) {
      setSearchResults([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    const timer = setTimeout(() => {
      searchLocations(trimmed)
        .then(setSearchResults)
        .catch(() => setError("Location search failed. Check your connection and try again."))
        .finally(() => setSearching(false));
    }, mapConfig.searchDebounceMs);

    return () => clearTimeout(timer);
  }, [query]);

  function selectSearchResult(result: LocationSearchResult) {
    setQuery(result.label);
    setSearchResults([]);
    moveMapTo(result.coordinates);
    publishLocation(result.coordinates, "search", true);
  }

  function zoomBy(delta: number) {
    if (delta > 0) {
      mapRef.current?.zoomIn();
    } else {
      mapRef.current?.zoomOut();
    }
  }

  const shellStyle: React.CSSProperties = {
    ...styles.shell,
    height,
    position: "relative",
    zIndex: 1,
  };

  return (
    <div style={shellStyle}>
      <div ref={mapElementRef} aria-label="Interactive complaint map" role="application" style={styles.map} />

      <div style={styles.searchCard}>
        <span aria-hidden="true" style={styles.searchIcon}>⌕</span>
        <input
          aria-label="Search location"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={searchPlaceholder}
          style={styles.searchInput}
        />
        {searching ? <span style={styles.searching}>...</span> : null}
      </div>

      {searchResults.length ? (
        <div style={styles.searchResults}>
          {searchResults.map((result) => (
            <button
              key={result.id}
              type="button"
              style={styles.searchResult}
              onClick={() => selectSearchResult(result)}
            >
              {result.label}
            </button>
          ))}
        </div>
      ) : null}

      <div style={styles.controls}>
        <MapButton label="Zoom in" onClick={() => zoomBy(1)}>+</MapButton>
        <MapButton label="Zoom out" onClick={() => zoomBy(-1)}>-</MapButton>
        <MapButton label="Locate me" onClick={locateMe}>o</MapButton>
      </div>

      {showInfoPanel ? (
        <div style={styles.infoPanel}>
          <strong style={styles.coordinates}>{formatCoordinates(coordinates)}</strong>
          <span style={styles.address}>{address}</span>
          {error ? (
            <button type="button" style={styles.retryButton} onClick={locateMe}>
              {loadingLocation || loadingMap ? "Loading..." : error}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function MapButton({
  label,
  children,
  onClick,
}: {
  label: string;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button aria-label={label} title={label} type="button" style={styles.controlButton} onClick={onClick}>
      {children}
    </button>
  );
}

const styles = {
  shell: {
    width: "100%",
    overflow: "hidden",
    backgroundColor: "#DCD3F0",
  } satisfies React.CSSProperties,
  map: {
    width: "100%",
    height: "100%",
  } satisfies React.CSSProperties,
  searchCard: {
    position: "absolute",
    top: 16,
    left: 16,
    right: 68,
    minHeight: 48,
    display: "flex",
    alignItems: "center",
    gap: 9,
    padding: "0 13px",
    borderRadius: 15,
    background: colors.surface,
    boxShadow: "0 8px 24px rgba(42,21,80,0.18)",
    zIndex: 500,
  } satisfies React.CSSProperties,
  searchIcon: {
    color: colors.textMuted,
    fontSize: 20,
    fontWeight: 900,
  } satisfies React.CSSProperties,
  searchInput: {
    flex: 1,
    minWidth: 0,
    border: 0,
    outline: "none",
    color: colors.text,
    fontSize: 13,
    fontWeight: 700,
    background: "transparent",
  } satisfies React.CSSProperties,
  searching: {
    color: colors.primary,
    fontWeight: 900,
  } satisfies React.CSSProperties,
  searchResults: {
    position: "absolute",
    top: 70,
    left: 16,
    right: 68,
    maxHeight: 220,
    overflowY: "auto",
    borderRadius: 14,
    border: `1px solid ${colors.border}`,
    background: colors.surface,
    boxShadow: "0 12px 24px rgba(42,21,80,0.16)",
    zIndex: 520,
  } satisfies React.CSSProperties,
  searchResult: {
    width: "100%",
    display: "block",
    padding: "11px 12px",
    border: 0,
    borderBottom: `1px solid ${colors.border}`,
    background: colors.surface,
    color: colors.text,
    textAlign: "left",
    fontSize: 12,
    fontWeight: 700,
    cursor: "pointer",
  } satisfies React.CSSProperties,
  controls: {
    position: "absolute",
    top: 16,
    right: 16,
    display: "flex",
    flexDirection: "column",
    gap: 8,
    zIndex: 510,
  } satisfies React.CSSProperties,
  controlButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    border: `1px solid ${colors.border}`,
    background: colors.surface,
    color: colors.primary,
    fontSize: 18,
    fontWeight: 900,
    cursor: "pointer",
    boxShadow: "0 6px 16px rgba(42,21,80,0.16)",
  } satisfies React.CSSProperties,
  infoPanel: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 14,
    display: "flex",
    flexDirection: "column",
    gap: 3,
    padding: "10px 12px",
    borderRadius: 14,
    background: "rgba(255,255,255,0.95)",
    boxShadow: "0 8px 24px rgba(42,21,80,0.16)",
    zIndex: 500,
  } satisfies React.CSSProperties,
  coordinates: {
    color: colors.primary,
    fontSize: 12,
  } satisfies React.CSSProperties,
  address: {
    color: colors.text,
    fontSize: 12,
    fontWeight: 700,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  } satisfies React.CSSProperties,
  retryButton: {
    alignSelf: "flex-start",
    border: 0,
    padding: 0,
    background: "transparent",
    color: colors.warning,
    fontSize: 11,
    fontWeight: 800,
    cursor: "pointer",
    textAlign: "left",
  } satisfies React.CSSProperties,
};
