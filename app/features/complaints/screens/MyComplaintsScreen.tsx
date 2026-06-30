import { MaterialCommunityIcons } from "@expo/vector-icons";
import { NavigationProp, useNavigation } from "@react-navigation/native";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "../../../constants/colors";
import { categoryMeta } from "../../user/data/citizenSampleData";
import { fetchMyComplaints } from "../../user/services/citizen.service";
import type {
  CitizenComplaint,
  CitizenComplaintStatus,
} from "../../user/types/citizen.types";
import type { UserStackParamList, UserTabParamList } from "../../user/types/user.types";
import {
  formatCompactDate,
  priorityColors,
  priorityLabels,
  statusColors,
  statusLabels,
} from "../../user/utils/citizenUi";

type StatusFilter = CitizenComplaintStatus | "all";
type MineNavigation = NavigationProp<UserTabParamList & UserStackParamList>;

const statusFilters: { label: string; value: StatusFilter }[] = [
  { label: "All", value: "all" },
  { label: "Pending", value: "pending" },
  { label: "Accepted", value: "accepted" },
  { label: "In Progress", value: "in_progress" },
  { label: "Resolved", value: "resolved" },
  { label: "Rejected", value: "rejected" },
];

export default function MyComplaintsScreen() {
  const navigation = useNavigation<MineNavigation>();
  const [complaints, setComplaints] = useState<CitizenComplaint[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [liveMessage, setLiveMessage] = useState<string | null>(null);

  const filteredComplaints = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    if (!query) {
      return complaints;
    }

    return complaints.filter((complaint) => {
      return (
        complaint.title.toLowerCase().includes(query) ||
        complaint.complaintNo.toLowerCase().includes(query) ||
        complaint.location.address.toLowerCase().includes(query) ||
        categoryMeta[complaint.category].label.toLowerCase().includes(query)
      );
    });
  }, [complaints, searchQuery]);

  const loadComplaints = useCallback(
    async (nextPage = 1, mode: "replace" | "append" = "replace") => {
      if (mode === "append") {
        setLoadingMore(true);
      } else {
        setError(null);
      }

      const result = await fetchMyComplaints({
        status: statusFilter,
        page: nextPage,
        limit: 5,
      });

      const nextComplaints =
        nextPage > 1
          ? result.data.map((complaint, index) => ({
              ...complaint,
              id: `${complaint.id}-page-${nextPage}-${index}`,
            }))
          : result.data;

      setComplaints((current) =>
        mode === "append" ? dedupeComplaints([...current, ...nextComplaints]) : nextComplaints,
      );
      setPage(nextPage);
      setHasMore(nextPage < 2 && nextComplaints.length >= 3);
      setError(result.error && nextComplaints.length === 0 ? "Couldn't load your complaints." : null);
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    },
    [statusFilter],
  );

  useEffect(() => {
    setLoading(true);
    void loadComplaints(1);
  }, [loadComplaints]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setComplaints((current) =>
        current.map((complaint) =>
          complaint.status === "pending"
            ? {
                ...complaint,
                progress: Math.min(complaint.progress + 8, 52),
                timeline: complaint.timeline.map((item, index) =>
                  index === complaint.timeline.length - 1 ? { ...item, done: true, at: "Just now" } : item,
                ),
              }
            : complaint,
        ),
      );
      setLiveMessage("Live update: AI analysis synced for pending complaints.");
    }, 9000);

    return () => clearTimeout(timeout);
  }, []);

  function refreshComplaints() {
    setRefreshing(true);
    void loadComplaints(1);
  }

  function loadMoreComplaints() {
    if (!hasMore || loadingMore || loading) {
      return;
    }

    void loadComplaints(page + 1, "append");
  }

  function openComplaint(complaint: CitizenComplaint) {
    navigation.navigate("ComplaintDetail", { complaintId: complaint.id });
  }

  function rateResolution(complaint: CitizenComplaint) {
    Alert.alert("Rate Resolution", `Thanks for reviewing ${complaint.complaintNo}.`);
  }

  if (loading) {
    return (
      <SafeAreaView edges={["top"]} style={styles.safeArea}>
        <View style={styles.header}>
          <Text style={styles.title}>My Complaints</Text>
        </View>
        <View style={styles.skeletonList}>
          <ComplaintSkeleton />
          <ComplaintSkeleton />
          <ComplaintSkeleton />
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView edges={["top"]} style={styles.safeArea}>
        <View style={styles.centerState}>
          <MaterialCommunityIcons name="alert-circle-outline" size={42} color={colors.error} />
          <Text style={styles.centerTitle}>{error}</Text>
          <Pressable style={styles.primaryButton} onPress={() => void loadComplaints(1)}>
            <Text style={styles.primaryButtonText}>Retry</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>Track your ward reports</Text>
          <Text style={styles.title}>My Complaints</Text>
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
          placeholder="Search by title, ID, or ward..."
          placeholderTextColor={colors.textMuted}
          style={styles.searchInput}
        />
        {searchQuery ? (
          <Pressable onPress={() => setSearchQuery("")}>
            <MaterialCommunityIcons name="close-circle" size={18} color={colors.textMuted} />
          </Pressable>
        ) : null}
      </View>

      <View style={styles.statusScrollShell}>
        <FlatList
          horizontal
          data={statusFilters}
          keyExtractor={(item) => item.value}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.statusChips}
          renderItem={({ item }) => (
            <Pressable
              style={[styles.statusChip, statusFilter === item.value ? styles.statusChipActive : null]}
              onPress={() => setStatusFilter(item.value)}
            >
              <Text
                style={[
                  styles.statusChipText,
                  statusFilter === item.value ? styles.statusChipTextActive : null,
                ]}
              >
                {item.label}
              </Text>
            </Pressable>
          )}
        />
      </View>

      {liveMessage ? (
        <Pressable style={styles.liveBanner} onPress={() => setLiveMessage(null)}>
          <MaterialCommunityIcons name="broadcast" size={16} color={colors.primary} />
          <Text style={styles.liveText}>{liveMessage}</Text>
        </Pressable>
      ) : null}

      <FlatList
        data={filteredComplaints}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContent,
          filteredComplaints.length === 0 ? styles.listContentEmpty : null,
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            tintColor={colors.primary}
            onRefresh={refreshComplaints}
          />
        }
        onEndReached={loadMoreComplaints}
        onEndReachedThreshold={0.45}
        ListEmptyComponent={
          complaints.length === 0 ? (
            <View style={styles.emptyCard}>
              <MaterialCommunityIcons name="clipboard-plus-outline" size={42} color={colors.primary} />
              <Text style={styles.emptyTitle}>No complaints yet</Text>
              <Text style={styles.emptyText}>Report your first issue and help improve your ward.</Text>
              <Pressable style={styles.primaryButton} onPress={() => navigation.navigate("Report")}>
                <Text style={styles.primaryButtonText}>Create Report</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.emptyCard}>
              <MaterialCommunityIcons name="filter-remove-outline" size={42} color={colors.primary} />
              <Text style={styles.emptyTitle}>No complaints found for this status</Text>
              <Text style={styles.emptyText}>Try another status or clear your search.</Text>
            </View>
          )
        }
        ListFooterComponent={
          loadingMore ? (
            <View style={styles.footerLoader}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <ComplaintCard
            complaint={item}
            onOpen={() => openComplaint(item)}
            onRate={() => rateResolution(item)}
          />
        )}
      />
    </SafeAreaView>
  );
}

function dedupeComplaints(items: CitizenComplaint[]): CitizenComplaint[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.id)) {
      return false;
    }

    seen.add(item.id);
    return true;
  });
}

function ComplaintCard({
  complaint,
  onOpen,
  onRate,
}: {
  complaint: CitizenComplaint;
  onOpen: () => void;
  onRate: () => void;
}) {
  const meta = categoryMeta[complaint.category];
  const isPriority = complaint.priority === "high" || complaint.priority === "critical";

  return (
    <Pressable style={({ pressed }) => [styles.card, pressed ? styles.pressed : null]} onPress={onOpen}>
      <View style={styles.cardHeader}>
        <View style={[styles.categoryIcon, { backgroundColor: meta.softColor }]}>
          <MaterialCommunityIcons
            name={meta.icon as keyof typeof MaterialCommunityIcons.glyphMap}
            size={24}
            color={meta.color}
          />
        </View>
        <View style={styles.cardTitleBlock}>
          <Text style={styles.cardTitle} numberOfLines={2}>
            {complaint.title}
          </Text>
          <Text style={styles.cardId}>{complaint.complaintNo}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: `${statusColors[complaint.status]}18` }]}>
          <Text style={[styles.statusText, { color: statusColors[complaint.status] }]}>
            {statusLabels[complaint.status]}
          </Text>
        </View>
      </View>

      <View style={styles.locationRow}>
        <MaterialCommunityIcons name="map-marker-outline" size={15} color={colors.textMuted} />
        <Text style={styles.locationText} numberOfLines={1}>
          {complaint.location.ward} · {complaint.location.address}
        </Text>
      </View>

      <View style={styles.metaRow}>
        <Text style={styles.metaText}>Submitted {formatCompactDate(complaint.createdAt)}</Text>
        {isPriority ? (
          <View style={[styles.priorityBadge, { backgroundColor: `${priorityColors[complaint.priority]}14` }]}>
            <Text style={[styles.priorityText, { color: priorityColors[complaint.priority] }]}>
              {priorityLabels[complaint.priority]}
            </Text>
          </View>
        ) : null}
      </View>

      <View style={styles.progressBlock}>
        <View style={styles.progressTop}>
          <Text style={styles.progressLabel}>Progress</Text>
          <Text style={styles.progressValue}>{complaint.progress}%</Text>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${complaint.progress}%` }]} />
        </View>
      </View>

      <View style={styles.cardFooter}>
        <View style={styles.footerStat}>
          <MaterialCommunityIcons name="arrow-up-bold-outline" size={16} color={colors.primary} />
          <Text style={styles.footerStatText}>{complaint.upvotes}</Text>
        </View>
        <View style={styles.footerStat}>
          <MaterialCommunityIcons name="comment-outline" size={16} color={colors.textMuted} />
          <Text style={styles.footerMutedText}>{complaint.comments}</Text>
        </View>
        <View style={styles.footerSpacer} />
        {complaint.status === "resolved" ? (
          <Pressable style={styles.rateButton} onPress={onRate}>
            <Text style={styles.rateButtonText}>Rate Resolution</Text>
          </Pressable>
        ) : null}
        <Text style={styles.viewText}>View</Text>
        <MaterialCommunityIcons name="arrow-right" size={17} color={colors.primary} />
      </View>
    </Pressable>
  );
}

function ComplaintSkeleton() {
  return (
    <View style={styles.skeletonCard}>
      <View style={styles.skeletonTop}>
        <View style={styles.skeletonIcon} />
        <View style={styles.skeletonTextBlock}>
          <View style={styles.skeletonLineLarge} />
          <View style={styles.skeletonLineSmall} />
        </View>
      </View>
      <View style={styles.skeletonBar} />
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 12,
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
  statusScrollShell: {
    paddingTop: 12,
  },
  statusChips: {
    paddingHorizontal: 16,
    gap: 8,
  },
  statusChip: {
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statusChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  statusChipText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "900",
  },
  statusChipTextActive: {
    color: colors.surface,
  },
  liveBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 16,
    marginTop: 12,
    padding: 11,
    borderRadius: 16,
    backgroundColor: "#EEE7FA",
    borderWidth: 1,
    borderColor: "#DED2F2",
  },
  liveText: {
    flex: 1,
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: "800",
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 118,
    gap: 12,
  },
  listContentEmpty: {
    flexGrow: 1,
    justifyContent: "center",
  },
  card: {
    padding: 14,
    borderRadius: 22,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  categoryIcon: {
    width: 50,
    height: 50,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitleBlock: {
    flex: 1,
    gap: 4,
  },
  cardTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "900",
    lineHeight: 20,
  },
  cardId: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "800",
  },
  statusBadge: {
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 999,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "900",
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 13,
  },
  locationText: {
    flex: 1,
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "700",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginTop: 12,
  },
  metaText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "700",
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
  progressBlock: {
    marginTop: 14,
  },
  progressTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  progressLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "900",
  },
  progressValue: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "900",
  },
  progressTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: colors.surfaceMuted,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: colors.primary,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  footerStat: {
    minHeight: 32,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 9,
    borderRadius: 999,
    backgroundColor: colors.surfaceMuted,
  },
  footerStatText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "900",
  },
  footerMutedText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "900",
  },
  footerSpacer: {
    flex: 1,
  },
  rateButton: {
    minHeight: 32,
    paddingHorizontal: 10,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#DCFCE7",
  },
  rateButtonText: {
    color: colors.success,
    fontSize: 11,
    fontWeight: "900",
  },
  viewText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: "900",
  },
  centerState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  centerTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "900",
    marginTop: 12,
    textAlign: "center",
  },
  emptyCard: {
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    borderRadius: 24,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 18,
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
    minHeight: 44,
    marginTop: 16,
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
  skeletonList: {
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 12,
  },
  skeletonCard: {
    padding: 14,
    borderRadius: 22,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  skeletonTop: {
    flexDirection: "row",
    gap: 12,
  },
  skeletonIcon: {
    width: 50,
    height: 50,
    borderRadius: 17,
    backgroundColor: colors.surfaceMuted,
  },
  skeletonTextBlock: {
    flex: 1,
    justifyContent: "center",
    gap: 9,
  },
  skeletonLineLarge: {
    width: "82%",
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.surfaceMuted,
  },
  skeletonLineSmall: {
    width: "44%",
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.surfaceMuted,
  },
  skeletonBar: {
    height: 8,
    borderRadius: 999,
    backgroundColor: colors.surfaceMuted,
    marginTop: 18,
  },
  footerLoader: {
    paddingVertical: 18,
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.99 }],
  },
});
