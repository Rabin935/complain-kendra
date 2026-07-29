import { Text } from "@/src/theme/typography";
import {
  MaterialCommunityIcons } from "@expo/vector-icons";
import { NavigationProp,
  useNavigation } from "@react-navigation/native";
import { useCallback,
  useEffect,
  useMemo,
  useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "../../../constants/colors";
import { useTranslation } from "../../../i18n/LanguageContext";
import { useCitizenLabels } from "../../../i18n/useCitizenLabels";
import InteractiveMap from "../../map/components/InteractiveMap";
import type { MapMarker, SelectedMapLocation } from "../../map/types";
import { useRealtimeInvalidation } from "../../realtime/hooks/useRealtimeInvalidation";
import {
  fetchCitizenProfile,
  fetchNearbyComplaints,
  fetchPublicComplaints,
  upvoteComplaint,
} from "../services/citizen.service";
import type {
  CitizenComplaint,
  CitizenComplaintCategory,
  CitizenProfile,
} from "../types/citizen.types";
import type { UserStackParamList, UserTabParamList } from "../types/user.types";
import { formatDistance, statusColors } from "../utils/citizenUi";

type BrowseNavigation = NavigationProp<UserTabParamList & UserStackParamList>;

const categoryFilters: Array<CitizenComplaintCategory | "all"> = [
  "all",
  "road",
  "water",
  "power",
  "waste",
  "trees",
  "other",
];
const categoryEmojis: Record<CitizenComplaintCategory, string> = {
  road: "🚧",
  water: "💧",
  power: "⚡",
  waste: "🗑",
  trees: "🌿",
  other: "•••",
};
const categoryIcons: Record<
  CitizenComplaintCategory | "all",
  keyof typeof MaterialCommunityIcons.glyphMap
> = {
  all: "view-grid-outline",
  road: "road-variant",
  water: "water-outline",
  power: "lightning-bolt-outline",
  waste: "trash-can-outline",
  trees: "tree-outline",
  other: "dots-horizontal",
};
const statusIcons: Record<
  CitizenComplaint["status"],
  keyof typeof MaterialCommunityIcons.glyphMap
> = {
  pending: "clock-outline",
  accepted: "check",
  in_progress: "progress-clock",
  resolved: "check-circle-outline",
  rejected: "close-circle-outline",
};

function hasUsableCoordinates(profile: CitizenProfile): boolean {
  return (
    Number.isFinite(profile.location.lat) &&
    Number.isFinite(profile.location.lng) &&
    profile.location.lat !== 0 &&
    profile.location.lng !== 0
  );
}

export default function BrowseScreen() {
  const navigation = useNavigation<BrowseNavigation>();
  const { t } = useTranslation("browse");
  const { categoryMeta, categoryLabels, statusLabels } = useCitizenLabels();
  const [profile, setProfile] = useState<CitizenProfile | null>(null);
  const [complaints, setComplaints] = useState<CitizenComplaint[]>([]);
  const [, setMapLocation] = useState<SelectedMapLocation | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<CitizenComplaintCategory | "all">("all");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filteredComplaints = useMemo(() => {
    return complaints.filter((complaint) => {
      const matchesCategory =
        categoryFilter === "all" || complaint.category === categoryFilter;
      return complaint.status !== "resolved" && matchesCategory;
    });
  }, [categoryFilter, complaints]);

  const complaintMarkers = useMemo<MapMarker[]>(
    () =>
      filteredComplaints
        .filter((complaint) => Number.isFinite(complaint.location.lat) && Number.isFinite(complaint.location.lng))
        .map((complaint) => ({
          id: complaint.id,
          category: "complaint",
          coordinates: {
            lat: complaint.location.lat,
            lng: complaint.location.lng,
          },
          title: complaint.title,
          description: `${complaint.location.ward}, ${complaint.location.area}`,
          color: categoryMeta[complaint.category].color,
        })),
    [filteredComplaints],
  );

  const initialMapLocation = useMemo(() => {
    if (profile && hasUsableCoordinates(profile)) {
      return {
        lat: profile.location.lat,
        lng: profile.location.lng,
      };
    }

    return undefined;
  }, [profile]);

  const loadComplaints = useCallback(async () => {
    setError(null);

    const profileResult = await fetchCitizenProfile();
    const nextProfile = profileResult.data.id ? profileResult.data : null;
    setProfile(nextProfile);

    const complaintResult =
      nextProfile && hasUsableCoordinates(nextProfile)
        ? await fetchNearbyComplaints(nextProfile.location.lat, nextProfile.location.lng, 2)
        : await fetchPublicComplaints({
            search: "",
            category: categoryFilter,
            page: 1,
            limit: 12,
            sort: "newest",
          });

    setComplaints(complaintResult.data);
    setError(
      profileResult.error || complaintResult.error
        ? t("networkError")
        : null,
    );
    setLoading(false);
    setRefreshing(false);
  }, [categoryFilter, t]);

  useEffect(() => {
    void loadComplaints();
  }, [loadComplaints]);

  useRealtimeInvalidation(
    ["complaint:created", "complaint:status_updated", "complaint:resolved", "complaint:upvoted"],
    () => void loadComplaints(),
  );

  function refreshComplaints() {
    setRefreshing(true);
    void loadComplaints();
  }

  function openComplaint(complaint: CitizenComplaint) {
    navigation.navigate("ComplaintDetail", { complaintId: complaint.id });
  }

  async function handleUpvote(complaint: CitizenComplaint) {
    setComplaints((current) =>
      current.map((item) =>
        item.id === complaint.id ? { ...item, upvotes: item.upvotes + 1 } : item,
      ),
    );
    await upvoteComplaint(complaint.id);
  }

  function openMarker(marker: MapMarker) {
    const complaint = complaints.find((item) => item.id === marker.id);

    if (complaint) {
      openComplaint(complaint);
    }
  }

  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            tintColor={colors.primary}
            onRefresh={refreshComplaints}
          />
        }
      >
        <View style={styles.mapWrap}>
          <InteractiveMap
            height={500}
            markers={complaintMarkers}
            selectedLocation={initialMapLocation}
            searchPlaceholder={
              profile
                ? `${profile.location.area || profile.location.city}, ${profile.location.ward}`
                : t("searchPlaceholder")
            }
            showInfoPanel={false}
            onLocationChange={setMapLocation}
            onMarkerPress={openMarker}
          />

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.mapCategoryRow}
            style={styles.mapCategoryRail}
          >
            {categoryFilters.slice(0, 5).map((category) => {
              const active = categoryFilter === category;
              const meta = category === "all" ? null : categoryMeta[category];

              return (
                <Pressable
                  key={category}
                  style={[styles.categoryChip, active ? styles.categoryChipActive : null]}
                  onPress={() => setCategoryFilter(category)}
                >
                  <MaterialCommunityIcons
                    name={categoryIcons[category]}
                    size={14}
                    color={active ? colors.surface : colors.text}
                  />
                  <Text
                    style={[
                      styles.categoryChipText,
                      active ? styles.categoryChipTextActive : null,
                    ]}
                  >
                    {category === "all" ? t("filterAll") : categoryLabels[category]}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        <View style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeader}>
            <View>
              <Text style={styles.sheetTitle}>{t("nearbyComplaints")}</Text>
              <Text style={styles.sheetSubtitle}>
                {t("activeWithinKm", { count: filteredComplaints.length })}
              </Text>
            </View>
            <View style={styles.distanceSortRow}>
              <MaterialCommunityIcons name="swap-vertical" size={14} color={colors.primary} />
              <Text style={styles.distanceSort}>{t("distance")}</Text>
            </View>
          </View>

          {error ? (
            <View style={styles.errorBanner}>
              <MaterialCommunityIcons name="cloud-alert-outline" size={18} color={colors.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {loading ? (
            <View style={styles.loadingCard}>
              <ActivityIndicator color={colors.primary} />
              <Text style={styles.loadingText}>{t("loading")}</Text>
            </View>
          ) : filteredComplaints.length ? (
            <View>
              {filteredComplaints.slice(0, 5).map((complaint, index) => (
                <NearbyComplaintRow
                  key={complaint.id}
                  complaint={complaint}
                  bordered={index > 0}
                  statusLabels={statusLabels}
                  votesLabel={t("votes", {
                    distance: formatDistance(complaint.distanceKm),
                    count: complaint.upvotes,
                  })}
                  onOpen={() => openComplaint(complaint)}
                  onUpvote={() => void handleUpvote(complaint)}
                />
              ))}
            </View>
          ) : (
            <View style={styles.emptyCard}>
              <MaterialCommunityIcons name="map-marker-off-outline" size={32} color={colors.primary} />
              <Text style={styles.emptyTitle}>{t("emptyTitle")}</Text>
              <Text style={styles.emptyText}>{t("emptyBody")}</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function NearbyComplaintRow({
  complaint,
  bordered,
  statusLabels,
  votesLabel,
  onOpen,
  onUpvote,
}: {
  complaint: CitizenComplaint;
  bordered: boolean;
  statusLabels: Record<CitizenComplaint["status"], string>;
  votesLabel: string;
  onOpen: () => void;
  onUpvote: () => void;
}) {
  const { categoryMeta } = useCitizenLabels();
  const meta = categoryMeta[complaint.category];

  return (
    <Pressable style={[styles.complaintRow, bordered ? styles.complaintRowBordered : null]} onPress={onOpen}>
      <View style={[styles.rowIcon, { backgroundColor: meta.softColor }]}>
        <Text style={styles.rowEmoji}>{categoryEmojis[complaint.category]}</Text>
      </View>
      <View style={styles.rowBody}>
        <Text style={styles.rowTitle} numberOfLines={1}>{complaint.title}</Text>
        <View style={styles.rowMeta}>
          <View style={[styles.statusBadge, { backgroundColor: `${statusColors[complaint.status]}18` }]}>
            <MaterialCommunityIcons
              name={statusIcons[complaint.status]}
              size={12}
              color={statusColors[complaint.status]}
            />
            <Text style={[styles.statusText, { color: statusColors[complaint.status] }]}>
              {statusLabels[complaint.status]}
            </Text>
          </View>
          <Pressable style={styles.upvoteRow} onPress={onUpvote} hitSlop={8}>
            <Text style={styles.metaText}>{votesLabel}</Text>
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  content: {
    minHeight: "100%",
    paddingBottom: 106,
    backgroundColor: colors.surface,
  },
  mapWrap: {
    height: 500,
    position: "relative",
    overflow: "hidden",
    backgroundColor: "#DCD3F0",
  },
  mapCategoryRail: {
    position: "absolute",
    top: 70,
    left: 0,
    right: 0,
  },
  mapCategoryRow: {
    paddingHorizontal: 16,
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.95)",
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    shadowColor: colors.primaryDeep,
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  categoryChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryChipText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "900",
  },
  categoryChipTextActive: {
    color: colors.surface,
  },
  sheet: {
    marginTop: -58,
    minHeight: 330,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 20,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: colors.surface,
    shadowColor: colors.primaryDeep,
    shadowOpacity: 0.14,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: -14 },
    elevation: 12,
  },
  sheetHandle: {
    width: 44,
    height: 5,
    borderRadius: 999,
    alignSelf: "center",
    backgroundColor: colors.border,
    marginBottom: 12,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 22,
  },
  sheetTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "900",
  },
  sheetSubtitle: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "700",
    marginTop: 2,
  },
  distanceSortRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  distanceSort: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "900",
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 10,
    borderRadius: 14,
    backgroundColor: "#FFF1F2",
    borderWidth: 1,
    borderColor: "#FFE0E4",
    marginBottom: 8,
  },
  errorText: {
    flex: 1,
    color: colors.error,
    fontSize: 12,
    fontWeight: "800",
  },
  loadingCard: {
    minHeight: 120,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  loadingText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: "800",
  },
  complaintRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
  },
  complaintRowBordered: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  rowIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  rowEmoji: {
    fontSize: 24,
  },
  rowBody: {
    flex: 1,
    minWidth: 0,
  },
  rowTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "900",
    marginBottom: 5,
  },
  rowMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "900",
  },
  metaText: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "800",
  },
  upvoteRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  upvoteText: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "800",
  },
  upvoteButton: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceMuted,
  },
  emptyCard: {
    minHeight: 150,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "900",
    marginTop: 10,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 13,
    textAlign: "center",
    marginTop: 6,
  },
});
