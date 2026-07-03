import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
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
  SelectedMapLocation,
} from "../types";
import { formatCoordinates, isValidCoordinates } from "../utils/coordinate.utils";

export default function InteractiveMap({
  markers = [],
  selectedLocation,
  height = 500,
  searchPlaceholder = "Search address, landmark, municipality, ward...",
  showInfoPanel = true,
  autoLocate = true,
  onLocationChange,
  onMarkerPress,
}: InteractiveMapProps) {
  const initialLocation = selectedLocation ?? mapConfig.defaultLocation;
  const [coordinates, setCoordinates] = useState<Coordinates>(initialLocation);
  const [address, setAddress] = useState("Finding address...");
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<LocationSearchResult[]>([]);
  const [loadingLocation, setLoadingLocation] = useState(true);
  const [searching, setSearching] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const currentCoordinatesRef = useRef<Coordinates>(initialLocation);

  const complaintMarkers = useMemo(() => markers.slice(0, 8), [markers]);

  const publishLocation = useCallback(
    async (nextCoordinates: Coordinates, source: SelectedMapLocation["source"]) => {
      if (!isValidCoordinates(nextCoordinates)) {
        setMessage("Invalid coordinates selected.");
        return;
      }

      setCoordinates(nextCoordinates);
      currentCoordinatesRef.current = nextCoordinates;
      setMessage(null);

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
        setMessage("Could not refresh address for this location.");
        onLocationChange?.({
          coordinates: nextCoordinates,
          source,
        });
      }
    },
    [onLocationChange],
  );

  const locateMe = useCallback(async () => {
    setLoadingLocation(true);
    const result = await requestCurrentLocation();
    setMessage(result.message ?? null);
    await publishLocation(result.coordinates, result.status === "granted" ? "geolocation" : "fallback");
    setLoadingLocation(false);
  }, [publishLocation]);

  useEffect(() => {
    if (autoLocate) {
      void locateMe();
      return;
    }

    const nextInitialLocation = selectedLocation ?? mapConfig.defaultLocation;
    void publishLocation(nextInitialLocation, "reset");
    setLoadingLocation(false);
  }, [autoLocate, locateMe, publishLocation, selectedLocation?.lat, selectedLocation?.lng]);

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
        .catch(() => setMessage("Location search failed. Check your connection and try again."))
        .finally(() => setSearching(false));
    }, mapConfig.searchDebounceMs);

    return () => clearTimeout(timer);
  }, [query]);

  function selectSearchResult(result: LocationSearchResult) {
    setQuery(result.label);
    setSearchResults([]);
    void publishLocation(result.coordinates, "search");
  }

  function nudgeMarker(latDelta: number, lngDelta: number) {
    void publishLocation(
      {
        lat: coordinates.lat + latDelta,
        lng: coordinates.lng + lngDelta,
      },
      "marker_drag",
    );
  }

  return (
    <View style={[styles.container, { height }]}>
      <View style={styles.mapSurface}>
        <View style={styles.gridLineVertical} />
        <View style={styles.gridLineHorizontal} />
        <View style={styles.roadOne} />
        <View style={styles.roadTwo} />

        {complaintMarkers.map((marker, index) => (
          <Pressable
            key={marker.id}
            accessibilityRole="button"
            accessibilityLabel={`Open ${marker.title ?? marker.category} marker`}
            style={[
              styles.markerDot,
              {
                left: `${18 + ((index * 19) % 66)}%`,
                top: `${28 + ((index * 13) % 42)}%`,
                backgroundColor: marker.color ?? colors.primary,
              },
            ]}
            onPress={() => onMarkerPress?.(marker)}
          />
        ))}

        <View style={styles.selectedMarker}>
          <MaterialCommunityIcons name="map-marker" size={42} color={colors.primary} />
        </View>

        <View style={styles.searchCard}>
          <MaterialCommunityIcons name="magnify" size={19} color={colors.textMuted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={searchPlaceholder}
            placeholderTextColor={colors.textMuted}
            style={styles.searchInput}
            accessibilityLabel="Search location"
          />
          {searching ? <ActivityIndicator size="small" color={colors.primary} /> : null}
        </View>

        {searchResults.length ? (
          <View style={styles.searchResults}>
            {searchResults.map((result) => (
              <Pressable
                key={result.id}
                accessibilityRole="button"
                style={styles.searchResult}
                onPress={() => selectSearchResult(result)}
              >
                <Text style={styles.searchResultText} numberOfLines={2}>{result.label}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        <View style={styles.controls}>
          <MapButton label="Zoom in" icon="plus" />
          <MapButton label="Zoom out" icon="minus" />
          <MapButton label="Locate me" icon="crosshairs-gps" onPress={locateMe} />
        </View>

        <View style={styles.dragPad} accessibilityLabel="Move selected marker">
          <Pressable style={styles.dragButton} onPress={() => nudgeMarker(0.001, 0)}>
            <MaterialCommunityIcons name="chevron-up" size={18} color={colors.primary} />
          </Pressable>
          <View style={styles.dragMiddle}>
            <Pressable style={styles.dragButton} onPress={() => nudgeMarker(0, -0.001)}>
              <MaterialCommunityIcons name="chevron-left" size={18} color={colors.primary} />
            </Pressable>
            <Pressable style={styles.dragButton} onPress={() => nudgeMarker(0, 0.001)}>
              <MaterialCommunityIcons name="chevron-right" size={18} color={colors.primary} />
            </Pressable>
          </View>
          <Pressable style={styles.dragButton} onPress={() => nudgeMarker(-0.001, 0)}>
            <MaterialCommunityIcons name="chevron-down" size={18} color={colors.primary} />
          </Pressable>
        </View>
      </View>

      {showInfoPanel ? (
        <View style={styles.infoPanel}>
          {loadingLocation ? <ActivityIndicator color={colors.primary} /> : null}
          <View style={styles.infoTextWrap}>
            <Text style={styles.coordinatesText}>{formatCoordinates(coordinates)}</Text>
            <Text style={styles.addressText} numberOfLines={2}>{address}</Text>
            {message ? <Text style={styles.messageText}>{message}</Text> : null}
          </View>
        </View>
      ) : null}
    </View>
  );
}

function MapButton({
  label,
  icon,
  onPress,
}: {
  label: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  onPress?: () => void;
}) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} style={styles.controlButton} onPress={onPress}>
      <MaterialCommunityIcons name={icon} size={18} color={colors.primary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
  },
  mapSurface: {
    flex: 1,
    overflow: "hidden",
    backgroundColor: "#DCD3F0",
  },
  gridLineVertical: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: "46%",
    width: 1,
    backgroundColor: "rgba(96,56,176,0.18)",
  },
  gridLineHorizontal: {
    position: "absolute",
    left: 0,
    right: 0,
    top: "52%",
    height: 1,
    backgroundColor: "rgba(96,56,176,0.18)",
  },
  roadOne: {
    position: "absolute",
    left: -40,
    right: -40,
    top: 124,
    height: 24,
    backgroundColor: "rgba(255,255,255,0.72)",
    transform: [{ rotate: "-5deg" }],
  },
  roadTwo: {
    position: "absolute",
    top: -30,
    bottom: -30,
    left: "58%",
    width: 22,
    backgroundColor: "rgba(255,255,255,0.64)",
    transform: [{ rotate: "9deg" }],
  },
  searchCard: {
    position: "absolute",
    top: 16,
    left: 16,
    right: 66,
    minHeight: 48,
    borderRadius: 15,
    paddingHorizontal: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    backgroundColor: colors.surface,
    shadowColor: colors.primaryDeep,
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 7,
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    fontSize: 13,
    fontWeight: "700",
  },
  searchResults: {
    position: "absolute",
    top: 70,
    left: 16,
    right: 66,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchResult: {
    padding: 11,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  searchResultText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "700",
  },
  controls: {
    position: "absolute",
    top: 16,
    right: 16,
    gap: 8,
  },
  controlButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  selectedMarker: {
    position: "absolute",
    left: "50%",
    top: "48%",
    marginLeft: -21,
    marginTop: -42,
  },
  markerDot: {
    position: "absolute",
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.surface,
  },
  dragPad: {
    position: "absolute",
    right: 16,
    bottom: 72,
    alignItems: "center",
    gap: 2,
  },
  dragMiddle: {
    flexDirection: "row",
    gap: 22,
  },
  dragButton: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  infoPanel: {
    minHeight: 70,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  infoTextWrap: {
    flex: 1,
  },
  coordinatesText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "900",
  },
  addressText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 3,
  },
  messageText: {
    color: colors.warning,
    fontSize: 11,
    fontWeight: "700",
    marginTop: 3,
  },
});
