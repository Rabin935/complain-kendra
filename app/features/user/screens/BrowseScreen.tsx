import { MaterialCommunityIcons } from "@expo/vector-icons";
import { NavigationProp, useNavigation } from "@react-navigation/native";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  type DimensionValue,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "../../../constants/colors";
import { categoryMeta, sampleProfile } from "../data/citizenSampleData";
import {
  fetchCitizenProfile,
  fetchNearbyComplaints,
  fetchPublicComplaints,
  followComplaint,
  upvoteComplaint,
} from "../services/citizen.service";
import type {
  CitizenComplaint,
  CitizenComplaintCategory,
  CitizenComplaintStatus,
  CitizenProfile,
} from "../types/citizen.types";
import type { UserStackParamList, UserTabParamList } from "../types/user.types";
import {
  formatCompactDate,
  formatDistance,
  priorityColors,
  priorityLabels,
  statusColors,
  statusLabels,
} from "../utils/citizenUi";

type BrowseMode = "map" | "list";
type MainFilter = "nearby" | "ward" | "pending" | "accepted" | "in_progress" | "resolved" | "high";
type BrowseNavigation = NavigationProp<UserTabParamList & UserStackParamList>;

const mainFilters: { label: string; value: MainFilter }[] = [
  { label: "Nearby", value: "nearby" },
  { label: "Ward 12", value: "ward" },
  { label: "Pending", value: "pending" },
  { label: "Accepted", value: "accepted" },
  { label: "In Progress", value: "in_progress" },
  { label: "Resolved", value: "resolved" },
  { label: "High Priority", value: "high" },
];

const categoryFilters: Array<CitizenComplaintCategory | "all"> = [
  "all",
  "road",
  "water",
  "power",
  "waste",
  "trees",
  "other",
];

const pinPositions: Array<{ top: DimensionValue; left: DimensionValue }> = [
  { top: "22%", left: "18%" },
  { top: "35%", left: "58%" },
  { top: "54%", left: "36%" },
  { top: "65%", left: "72%" },
  { top: "76%", left: "24%" },
  { top: "18%", left: "76%" },
];

export default function BrowseScreen() {
  const navigation = useNavigation<BrowseNavigation>();
  const [profile, setProfile] = useState<CitizenProfile>(sampleProfile);
  const [complaints, setComplaints] = useState<CitizenComplaint[]>([]);
  const [selectedComplaint, setSelectedComplaint] = useState<CitizenComplaint | null>(null);
  const [mode, setMode] = useState<BrowseMode>("list");
  const [mainFilter, setMainFilter] = useState<MainFilter>("nearby");
  const [categoryFilter, setCategoryFilter] = useState<CitizenComplaintCategory | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [gpsPermission, setGpsPermission] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const filteredComplaints = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    if (!query) {
      return complaints;
    }

    return complaints.filter((complaint) => {
      const categoryLabel = categoryMeta[complaint.category].label.toLowerCase();
      return (
        complaint.title.toLowerCase().includes(query) ||
        complaint.location.address.toLowerCase().includes(query) ||
        complaint.location.ward.toLowerCase().includes(query) ||
        categoryLabel.includes(query)
      );
    });
  }, [complaints, searchQuery]);

  const loadComplaints = useCallback(async (nextPage = 1, append = false) => {
    setError(null);
    const pageSize = 12;

    const profileResult = await fetchCitizenProfile();
    const nextProfile = profileResult.data;
    setProfile(nextProfile);

    const status =
      mainFilter === "pending" || mainFilter === "accepted" || mainFilter === "in_progress" || mainFilter === "resolved"
        ? (mainFilter as CitizenComplaintStatus)
        : "all";

    const priority = mainFilter === "high" ? "high" : "all";
    const sort = mainFilter === "nearby" ? "nearby" : mainFilter === "ward" ? "newest" : "upvotes";

    const complaintResult =
      mainFilter === "nearby" && gpsPermission
        ? await fetchNearbyComplaints(nextProfile.location.lat, nextProfile.location.lng, 2)
        : await fetchPublicComplaints({
            search: searchQuery,
            wardId: mainFilter === "ward" ? nextProfile.location.wardId : undefined,
            category: categoryFilter,
            status,
            priority,
            sort,
            lat: nextProfile.location.lat,
            lng: nextProfile.location.lng,
            page: nextPage,
            limit: pageSize,
          });

    let nextComplaints = complaintResult.data;

    if (categoryFilter !== "all") {
      nextComplaints = nextComplaints.filter((complaint) => complaint.category === categoryFilter);
    }

    setComplaints((current) => (append ? [...current, ...nextComplaints] : nextComplaints));
    setSelectedComplaint((current) => current ?? nextComplaints[0] ?? null);
    setPage(nextPage);
    setHasMore(nextComplaints.length >= pageSize && mainFilter !== "nearby");
    setError(profileResult.error || complaintResult.error ? "Network error. Showing saved public complaints." : null);
    setLoading(false);
    setLoadingMore(false);
    setRefreshing(false);
  }, [categoryFilter, gpsPermission, mainFilter, searchQuery]);

  useEffect(() => {
    void loadComplaints();
  }, [loadComplaints]);

  function refreshComplaints() {
    setRefreshing(true);
    setSelectedComplaint(null);
    void loadComplaints(1);
  }

  function loadMoreComplaints() {
    if (loadingMore || !hasMore) {
      return;
    }

    setLoadingMore(true);
    void loadComplaints(page + 1, true);
  }

  async function handleUpvote(complaint: CitizenComplaint) {
    setComplaints((current) =>
      current.map((item) =>
        item.id === complaint.id ? { ...item, upvotes: item.upvotes + 1 } : item,
      ),
    );
    await upvoteComplaint(complaint.id);
  }

  async function handleFollow(complaint: CitizenComplaint) {
    const nextFollowed = !complaint.followed;
    setComplaints((current) =>
      current.map((item) =>
        item.id === complaint.id ? { ...item, followed: nextFollowed } : item,
      ),
    );
    await followComplaint(complaint.id, nextFollowed);
  }

  function openComplaint(complaint: CitizenComplaint) {
    navigation.navigate("ComplaintDetail", { complaintId: complaint.id });
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
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>Public ward feed</Text>
            <Text style={styles.title}>Browse Complaints</Text>
          </View>
          <Pressable style={styles.filterButton}>
            <MaterialCommunityIcons name="tune-variant" size={22} color={colors.primary} />
          </Pressable>
        </View>

        <View style={styles.searchBar}>
          <MaterialCommunityIcons name="magnify" size={20} color={colors.textMuted} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search complaints, areas, or categories..."
            placeholderTextColor={colors.textMuted}
            style={styles.searchInput}
          />
        </View>

        <View style={styles.segmentedControl}>
          {(["map", "list"] as BrowseMode[]).map((item) => (
            <Pressable
              key={item}
              style={[styles.segment, mode === item ? styles.segmentActive : null]}
              onPress={() => setMode(item)}
            >
              <MaterialCommunityIcons
                name={item === "map" ? "map-outline" : "format-list-bulleted"}
                size={17}
                color={mode === item ? colors.surface : colors.primary}
              />
              <Text style={[styles.segmentText, mode === item ? styles.segmentTextActive : null]}>
                {item === "map" ? "Map" : "List"}
              </Text>
            </Pressable>
          ))}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
        >
          {mainFilters.map((filter) => (
            <Pressable
              key={filter.value}
              style={[styles.filterChip, mainFilter === filter.value ? styles.filterChipActive : null]}
              onPress={() => setMainFilter(filter.value)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  mainFilter === filter.value ? styles.filterChipTextActive : null,
                ]}
              >
                {filter.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryRow}
        >
          {categoryFilters.map((category) => {
            const active = categoryFilter === category;
            const meta = category === "all" ? null : categoryMeta[category];

            return (
              <Pressable
                key={category}
                style={[styles.categoryChip, active ? styles.categoryChipActive : null]}
                onPress={() => setCategoryFilter(category)}
              >
                <MaterialCommunityIcons
                  name={(meta?.icon ?? "shape-outline") as keyof typeof MaterialCommunityIcons.glyphMap}
                  size={15}
                  color={active ? colors.surface : meta?.color ?? colors.primary}
                />
                <Text
                  style={[
                    styles.categoryChipText,
                    active ? styles.categoryChipTextActive : null,
                  ]}
                >
                  {category === "all" ? "All" : meta?.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {error ? (
          <View style={styles.errorBanner}>
            <MaterialCommunityIcons name="cloud-alert-outline" size={18} color={colors.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {!gpsPermission && mainFilter === "nearby" ? (
          <View style={styles.emptyCard}>
            <MaterialCommunityIcons name="crosshairs-question" size={38} color={colors.primary} />
            <Text style={styles.emptyTitle}>No GPS permission</Text>
            <Text style={styles.emptyText}>Allow location to sort public complaints by distance.</Text>
            <Pressable style={styles.primaryButton} onPress={() => setGpsPermission(true)}>
              <Text style={styles.primaryButtonText}>Enable Location</Text>
            </Pressable>
          </View>
        ) : loading ? (
          <LoadingState mode={mode} />
        ) : mode === "map" ? (
          <MapPanel
            complaints={filteredComplaints}
            selectedComplaint={selectedComplaint}
            onSelect={setSelectedComplaint}
            onOpen={openComplaint}
          />
        ) : filteredComplaints.length ? (
          <View style={styles.list}>
            {filteredComplaints.map((complaint) => (
              <PublicComplaintCard
                key={complaint.id}
                complaint={complaint}
                onOpen={() => openComplaint(complaint)}
                onUpvote={() => void handleUpvote(complaint)}
                onFollow={() => void handleFollow(complaint)}
              />
            ))}
            {hasMore ? (
              <Pressable style={styles.loadMoreButton} onPress={loadMoreComplaints} disabled={loadingMore}>
                {loadingMore ? <ActivityIndicator color={colors.primary} /> : null}
                <Text style={styles.loadMoreText}>{loadingMore ? "Loading..." : "Load more"}</Text>
              </Pressable>
            ) : null}
          </View>
        ) : (
          <View style={styles.emptyCard}>
            <MaterialCommunityIcons name="filter-remove-outline" size={38} color={colors.primary} />
            <Text style={styles.emptyTitle}>No complaints match these filters</Text>
            <Text style={styles.emptyText}>Reset filters or try another category around Ward 12.</Text>
            <Pressable
              style={styles.primaryButton}
              onPress={() => {
                setMainFilter("nearby");
                setCategoryFilter("all");
                setSearchQuery("");
              }}
            >
              <Text style={styles.primaryButtonText}>Reset Filters</Text>
            </Pressable>
          </View>
        )}

        <Pressable style={styles.gpsToggle} onPress={() => setGpsPermission((current) => !current)}>
          <MaterialCommunityIcons
            name={gpsPermission ? "map-marker-off-outline" : "crosshairs-gps"}
            size={16}
            color={colors.primary}
          />
          <Text style={styles.gpsToggleText}>
            {gpsPermission ? "Preview no GPS state" : "Restore nearby mode"}
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function LoadingState({ mode }: { mode: BrowseMode }) {
  return (
    <View style={styles.loadingCard}>
      <ActivityIndicator color={colors.primary} />
      <Text style={styles.loadingText}>
        {mode === "map" ? "Loading map pins..." : "Loading public complaints..."}
      </Text>
    </View>
  );
}

function MapPanel({
  complaints,
  selectedComplaint,
  onSelect,
  onOpen,
}: {
  complaints: CitizenComplaint[];
  selectedComplaint: CitizenComplaint | null;
  onSelect: (complaint: CitizenComplaint) => void;
  onOpen: (complaint: CitizenComplaint) => void;
}) {
  return (
    <View style={styles.mapPanel}>
      <View style={styles.mapGridVertical} />
      <View style={styles.mapGridHorizontal} />
      <View style={styles.mapRoadA} />
      <View style={styles.mapRoadB} />
      <Text style={styles.mapLabel}>Koteshwor · Ward 12</Text>

      {complaints.map((complaint, index) => {
        const position = pinPositions[index % pinPositions.length];
        const meta = categoryMeta[complaint.category];

        return (
          <Pressable
            key={complaint.id}
            style={[
              styles.mapPin,
              {
                top: position.top,
                left: position.left,
                backgroundColor: statusColors[complaint.status],
              },
            ]}
            onPress={() => onSelect(complaint)}
          >
            <MaterialCommunityIcons
              name={meta.icon as keyof typeof MaterialCommunityIcons.glyphMap}
              size={15}
              color={colors.surface}
            />
          </Pressable>
        );
      })}

      {selectedComplaint ? (
        <Pressable style={styles.miniCard} onPress={() => onOpen(selectedComplaint)}>
          <Text style={styles.miniTitle} numberOfLines={1}>
            {selectedComplaint.title}
          </Text>
          <View style={styles.miniMeta}>
            <Text style={styles.miniText}>{formatDistance(selectedComplaint.distanceKm)}</Text>
            <Text style={styles.miniText}>{statusLabels[selectedComplaint.status]}</Text>
            <Text style={styles.miniText}>{selectedComplaint.upvotes} upvotes</Text>
          </View>
        </Pressable>
      ) : null}
    </View>
  );
}

function PublicComplaintCard({
  complaint,
  onOpen,
  onUpvote,
  onFollow,
}: {
  complaint: CitizenComplaint;
  onOpen: () => void;
  onUpvote: () => void;
  onFollow: () => void;
}) {
  const meta = categoryMeta[complaint.category];
  const reporterName = complaint.reporterPrivate ? "Private citizen" : complaint.reporterName ?? "Citizen";

  return (
    <Pressable style={({ pressed }) => [styles.card, pressed ? styles.pressed : null]} onPress={onOpen}>
      <View style={styles.cardTop}>
        <View style={[styles.cardIcon, { backgroundColor: meta.softColor }]}>
          <MaterialCommunityIcons
            name={meta.icon as keyof typeof MaterialCommunityIcons.glyphMap}
            size={23}
            color={meta.color}
          />
        </View>
        <View style={styles.cardMain}>
          <Text style={styles.cardTitle} numberOfLines={2}>
            {complaint.title}
          </Text>
          <Text style={styles.cardLocation} numberOfLines={1}>
            {formatDistance(complaint.distanceKm)} · {complaint.location.ward}, {complaint.location.area}
          </Text>
        </View>
        <Pressable style={[styles.followButton, complaint.followed ? styles.followButtonActive : null]} onPress={onFollow}>
          <MaterialCommunityIcons
            name={complaint.followed ? "bookmark-check" : "bookmark-plus-outline"}
            size={18}
            color={complaint.followed ? colors.surface : colors.primary}
          />
        </Pressable>
      </View>

      <View style={styles.badgeRow}>
        <View style={[styles.statusBadge, { backgroundColor: `${statusColors[complaint.status]}18` }]}>
          <Text style={[styles.statusText, { color: statusColors[complaint.status] }]}>
            {statusLabels[complaint.status]}
          </Text>
        </View>
        {complaint.priority !== "normal" ? (
          <View style={[styles.priorityBadge, { backgroundColor: `${priorityColors[complaint.priority]}14` }]}>
            <Text style={[styles.priorityText, { color: priorityColors[complaint.priority] }]}>
              {priorityLabels[complaint.priority]}
            </Text>
          </View>
        ) : null}
      </View>

      <View style={styles.metaRow}>
        <Text style={styles.reporterText}>{reporterName}</Text>
        <Text style={styles.reporterText}>{formatCompactDate(complaint.createdAt)}</Text>
      </View>

      <View style={styles.actionRow}>
        <Pressable style={styles.actionButton} onPress={onUpvote}>
          <MaterialCommunityIcons name="arrow-up-bold-outline" size={17} color={colors.primary} />
          <Text style={styles.actionText}>{complaint.upvotes}</Text>
        </Pressable>
        <View style={styles.actionButton}>
          <MaterialCommunityIcons name="comment-outline" size={17} color={colors.textMuted} />
          <Text style={styles.actionMuted}>{complaint.comments}</Text>
        </View>
        <View style={styles.actionSpacer} />
        <Text style={styles.viewText}>View</Text>
        <MaterialCommunityIcons name="arrow-right" size={17} color={colors.primary} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingBottom: 118,
  },
  header: {
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  eyebrow: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  title: {
    color: colors.text,
    fontSize: 27,
    fontWeight: "900",
    marginTop: 4,
  },
  filterButton: {
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchBar: {
    marginHorizontal: 16,
    minHeight: 52,
    borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    fontSize: 14,
    fontWeight: "600",
  },
  segmentedControl: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginTop: 14,
    padding: 4,
    borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  segment: {
    flex: 1,
    minHeight: 42,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
  segmentActive: {
    backgroundColor: colors.primary,
  },
  segmentText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: "900",
  },
  segmentTextActive: {
    color: colors.surface,
  },
  chipRow: {
    paddingHorizontal: 16,
    paddingTop: 14,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "900",
  },
  filterChipTextActive: {
    color: colors.surface,
  },
  categoryRow: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 4,
    gap: 8,
  },
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryChipActive: {
    backgroundColor: colors.primaryMid,
    borderColor: colors.primaryMid,
  },
  categoryChipText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "900",
  },
  categoryChipTextActive: {
    color: colors.surface,
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 16,
    marginTop: 10,
    padding: 12,
    borderRadius: 16,
    backgroundColor: "#FFF1F2",
    borderWidth: 1,
    borderColor: "#FFE0E4",
  },
  errorText: {
    flex: 1,
    color: colors.error,
    fontSize: 12,
    fontWeight: "800",
  },
  list: {
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 12,
  },
  card: {
    padding: 14,
    borderRadius: 22,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTop: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  cardIcon: {
    width: 50,
    height: 50,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  cardMain: {
    flex: 1,
    gap: 5,
  },
  cardTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "900",
    lineHeight: 20,
  },
  cardLocation: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "700",
  },
  followButton: {
    width: 38,
    height: 38,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
  },
  followButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 13,
  },
  statusBadge: {
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 999,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "900",
  },
  priorityBadge: {
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 999,
  },
  priorityText: {
    fontSize: 11,
    fontWeight: "900",
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
  },
  reporterText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "700",
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 13,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  actionButton: {
    minHeight: 34,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: colors.surfaceMuted,
  },
  actionText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "900",
  },
  actionMuted: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "900",
  },
  actionSpacer: {
    flex: 1,
  },
  viewText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: "900",
  },
  loadingCard: {
    marginHorizontal: 16,
    marginTop: 14,
    minHeight: 160,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  loadingText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: "800",
  },
  loadMoreButton: {
    minHeight: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  loadMoreText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: "900",
  },
  mapPanel: {
    height: 430,
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 28,
    overflow: "hidden",
    backgroundColor: "#EEE7FA",
    borderWidth: 1,
    borderColor: colors.border,
  },
  mapGridVertical: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: "48%",
    width: 1,
    backgroundColor: "rgba(96,56,176,0.12)",
  },
  mapGridHorizontal: {
    position: "absolute",
    left: 0,
    right: 0,
    top: "48%",
    height: 1,
    backgroundColor: "rgba(96,56,176,0.12)",
  },
  mapRoadA: {
    position: "absolute",
    width: 520,
    height: 34,
    left: -60,
    top: 170,
    transform: [{ rotate: "-18deg" }],
    backgroundColor: "rgba(255,255,255,0.82)",
  },
  mapRoadB: {
    position: "absolute",
    width: 360,
    height: 28,
    right: -80,
    top: 250,
    transform: [{ rotate: "32deg" }],
    backgroundColor: "rgba(255,255,255,0.68)",
  },
  mapLabel: {
    position: "absolute",
    top: 16,
    left: 16,
    color: colors.primaryDark,
    fontSize: 13,
    fontWeight: "900",
  },
  mapPin: {
    position: "absolute",
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: colors.surface,
    shadowColor: colors.primaryDeep,
    shadowOpacity: 0.24,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 5 },
    elevation: 5,
  },
  miniCard: {
    position: "absolute",
    left: 14,
    right: 14,
    bottom: 14,
    padding: 14,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  miniTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "900",
  },
  miniMeta: {
    flexDirection: "row",
    gap: 10,
    marginTop: 8,
  },
  miniText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "800",
  },
  emptyCard: {
    marginHorizontal: 16,
    marginTop: 14,
    minHeight: 210,
    padding: 22,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "900",
    marginTop: 12,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
    marginTop: 7,
  },
  primaryButton: {
    marginTop: 16,
    minHeight: 44,
    paddingHorizontal: 18,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
  },
  primaryButtonText: {
    color: colors.surface,
    fontSize: 13,
    fontWeight: "900",
  },
  gpsToggle: {
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  gpsToggleText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "800",
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.99 }],
  },
});
