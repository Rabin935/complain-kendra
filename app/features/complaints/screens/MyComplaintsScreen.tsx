import { Text } from "@/src/theme/typography";
import {
  MaterialCommunityIcons } from "@expo/vector-icons";
import { NavigationProp,
  useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback,
  useEffect,
  useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "../../../constants/colors";
import { useTranslation } from "../../../i18n/LanguageContext";
import { useCitizenLabels } from "../../../i18n/useCitizenLabels";
import { fetchMyComplaints } from "../../user/services/citizen.service";
import type {
  CitizenComplaint,
  CitizenComplaintStatus,
} from "../../user/types/citizen.types";
import type { UserStackParamList, UserTabParamList } from "../../user/types/user.types";
import {
  formatCompactDate,
  statusColors,
} from "../../user/utils/citizenUi";

type StatusFilter = CitizenComplaintStatus | "all";
type MineNavigation = NavigationProp<UserTabParamList & UserStackParamList>;
type FilterCounts = Record<"all" | "pending" | "in_progress" | "resolved", number>;

const statusFilters: { labelKey: "filterAll" | "filterPending" | "filterProgress" | "filterResolved"; value: StatusFilter }[] = [
  { labelKey: "filterAll", value: "all" },
  { labelKey: "filterPending", value: "pending" },
  { labelKey: "filterProgress", value: "in_progress" },
  { labelKey: "filterResolved", value: "resolved" },
];
const categoryEmojis: Record<CitizenComplaint["category"], string> = {
  road: "🚧",
  water: "💧",
  power: "💡",
  waste: "🗑",
  trees: "🌿",
  other: "•••",
};

export default function MyComplaintsScreen() {
  const navigation = useNavigation<MineNavigation>();
  const { t } = useTranslation("myComplaints");
  const { t: tc } = useTranslation("common");
  const { statusLabels } = useCitizenLabels();
  const [complaints, setComplaints] = useState<CitizenComplaint[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [filterCounts, setFilterCounts] = useState<FilterCounts>({
    all: 0,
    pending: 0,
    in_progress: 0,
    resolved: 0,
  });
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [liveMessage, setLiveMessage] = useState<string | null>(null);

  const filteredComplaints = complaints;

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

      if (statusFilter === "all" && nextPage === 1) {
        setFilterCounts({
          all: nextComplaints.length,
          pending: nextComplaints.filter((complaint) => complaint.status === "pending").length,
          in_progress: nextComplaints.filter((complaint) => complaint.status === "in_progress").length,
          resolved: nextComplaints.filter((complaint) => complaint.status === "resolved").length,
        });
      }

      setComplaints((current) =>
        mode === "append" ? dedupeComplaints([...current, ...nextComplaints]) : nextComplaints,
      );
      setPage(nextPage);
      setHasMore(nextPage < 2 && nextComplaints.length >= 3);
      setError(result.error && nextComplaints.length === 0 ? t("loadError") : null);
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    },
    [statusFilter, t],
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
      setLiveMessage(t("liveBanner"));
    }, 9000);

    return () => clearTimeout(timeout);
  }, [t]);

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
    Alert.alert(t("rateResolution"), t("rateThanks", { complaintNo: complaint.complaintNo }));
  }

  if (loading) {
    return (
      <SafeAreaView edges={["top"]} style={styles.safeArea}>
        <View style={styles.header}>
          <Text style={styles.title}>{t("title")}</Text>
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
            <Text style={styles.primaryButtonText}>{tc("retry")}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.title}>My Complaints</Text>
        <Pressable style={styles.filterButton}>
          <MaterialCommunityIcons name="tune-variant" size={18} color={colors.text} />
        </Pressable>
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
                {t(item.labelKey)}
              </Text>
              <View
                style={[
                  styles.statusCount,
                  statusFilter === item.value ? styles.statusCountActive : null,
                ]}
              >
                <Text
                  style={[
                    styles.statusCountText,
                    statusFilter === item.value ? styles.statusCountTextActive : null,
                  ]}
                >
                  {item.value in filterCounts
                    ? filterCounts[item.value as keyof FilterCounts]
                    : 0}
                </Text>
              </View>
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
          statusFilter === "all" ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIllustration}>
                <View style={styles.emptyGlow} />
                <View style={styles.emptyDashedRing} />
                <View style={styles.emptyDocument}>
                  <MaterialCommunityIcons
                    name="clipboard-text-outline"
                    size={34}
                    color={colors.primary}
                  />
                  <View style={styles.documentLineLong} />
                  <View style={styles.documentLineShort} />
                </View>
                <MaterialCommunityIcons
                  name="camera-outline"
                  size={22}
                  color={colors.primary}
                  style={styles.cameraEmoji}
                />
                <MaterialCommunityIcons
                  name="map-marker"
                  size={20}
                  color={colors.accent}
                  style={styles.pinEmoji}
                />
                <View style={styles.orangeDot} />
              </View>
              <Text style={styles.emptyTitle}>{t("emptyTitle")}</Text>
              <Text style={styles.emptyText}>{t("emptyBody")}</Text>
              <Pressable style={styles.emptyPrimaryShell} onPress={() => navigation.navigate("Report")}>
                <LinearGradient
                  colors={["#7B4FC8", "#6038B0"]}
                  start={{ x: 0.5, y: 0 }}
                  end={{ x: 0.5, y: 1 }}
                  style={styles.emptyPrimary}
                >
                  <Text style={styles.emptyPrimaryText}>{t("reportFirst")}</Text>
                  <MaterialCommunityIcons name="arrow-right" size={18} color="#FFFFFF" />
                </LinearGradient>
              </Pressable>
              <Pressable style={styles.browseLink} onPress={() => navigation.navigate("Browse")}>
                <MaterialCommunityIcons name="web" size={15} color={colors.primary} />
                <Text style={styles.browseLinkText}>{t("browseNearby")}</Text>
              </Pressable>
              <View style={styles.tipCard}>
                <View style={styles.tipIcon}>
                  <MaterialCommunityIcons
                    name="lightbulb-on-outline"
                    size={18}
                    color={colors.accent}
                  />
                </View>
                <View style={styles.tipCopy}>
                  <Text style={styles.tipTitle}>{t("proTip")}</Text>
                  <Text style={styles.tipText}>{t("proTipBody")}</Text>
                </View>
              </View>
            </View>
          ) : (
            <View style={styles.emptyCard}>
              <MaterialCommunityIcons name="filter-remove-outline" size={42} color={colors.primary} />
              <Text style={styles.emptyTitle}>{t("filteredEmptyTitle")}</Text>
              <Text style={styles.emptyText}>{t("filteredEmptyBody")}</Text>
              <Pressable style={styles.primaryButton} onPress={() => setStatusFilter("all")}>
                <Text style={styles.primaryButtonText}>{t("showAll")}</Text>
              </Pressable>
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
            statusLabels={statusLabels}
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
  statusLabels,
  onOpen,
  onRate,
}: {
  complaint: CitizenComplaint;
  statusLabels: Record<CitizenComplaintStatus, string>;
  onOpen: () => void;
  onRate: () => void;
}) {
  const { t } = useTranslation("myComplaints");
  const { categoryMeta } = useCitizenLabels();
  const meta = categoryMeta[complaint.category];

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed ? styles.pressed : null]}
      onPress={onOpen}
      onLongPress={complaint.status === "resolved" ? onRate : undefined}
    >
      <View style={styles.cardHeader}>
        <View style={[styles.categoryIcon, { backgroundColor: meta.softColor }]}>
          <Text style={styles.categoryEmoji}>{categoryEmojis[complaint.category]}</Text>
        </View>
        <View style={styles.cardTitleBlock}>
          <View style={styles.cardIdentityRow}>
            <Text style={styles.cardId}>{complaint.complaintNo}</Text>
            <View style={[styles.statusBadge, { backgroundColor: `${statusColors[complaint.status]}18` }]}>
              <Text style={[styles.statusText, { color: statusColors[complaint.status] }]}>
                {statusLabels[complaint.status]}
              </Text>
            </View>
          </View>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {complaint.title}
          </Text>
          <View style={styles.cardMetaRow}>
            <MaterialCommunityIcons name="map-marker-outline" size={12} color={colors.textMuted} />
            <Text style={styles.cardMetaLine} numberOfLines={1}>
              {complaint.location.ward}
            </Text>
            <View style={styles.cardMetaDot} />
            <MaterialCommunityIcons name="clock-outline" size={12} color={colors.textMuted} />
            <Text style={styles.cardMetaLine} numberOfLines={1}>
              {formatCompactDate(complaint.createdAt)}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.progressBlock}>
        <View style={styles.progressTop}>
          <Text style={styles.progressLabel}>{t("progress")}</Text>
          <Text style={styles.progressValue}>{complaint.progress}%</Text>
        </View>
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${complaint.progress}%`,
                backgroundColor: complaint.status === "resolved" ? colors.success : colors.info,
              },
            ]}
          />
        </View>
      </View>

      <View style={styles.cardFooter}>
        <MaterialCommunityIcons name="arrow-up-bold" size={13} color={colors.primary} />
        <Text style={styles.footerStatText}>{complaint.upvotes}</Text>
        <MaterialCommunityIcons name="comment-outline" size={13} color={colors.textMuted} />
        <Text style={styles.footerMutedText}>{complaint.comments}</Text>
        <View style={styles.footerSpacer} />
        <Text style={styles.viewText}>{t("view")}</Text>
        <MaterialCommunityIcons name="chevron-right" size={15} color={colors.primary} />
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
    paddingTop: 8,
    paddingBottom: 18,
  },
  title: {
    color: colors.text,
    fontSize: 19,
    fontWeight: "800",
  },
  filterButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
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
    paddingBottom: 14,
  },
  statusChips: {
    paddingHorizontal: 20,
    gap: 8,
  },
  statusChip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
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
  statusCount: {
    minWidth: 22,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 99,
    alignItems: "center",
    backgroundColor: colors.surfaceMuted,
  },
  statusCountActive: {
    backgroundColor: "rgba(255,255,255,0.25)",
  },
  statusCountText: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "800",
  },
  statusCountTextActive: {
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
    paddingHorizontal: 20,
    paddingTop: 0,
    paddingBottom: 118,
    gap: 12,
  },
  listContentEmpty: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingTop: 0,
  },
  card: {
    padding: 14,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  categoryIcon: {
    width: 64,
    height: 64,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  categoryEmoji: {
    fontSize: 29,
  },
  cardTitleBlock: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  cardIdentityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  cardTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "900",
    lineHeight: 19,
  },
  cardId: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: "800",
  },
  cardMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  cardMetaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    marginHorizontal: 2,
    backgroundColor: colors.textMuted,
  },
  cardMetaLine: {
    color: colors.textMuted,
    fontSize: 11,
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
    marginTop: 12,
    marginBottom: 10,
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
    height: 6,
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
    gap: 5,
    paddingTop: 10,
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
    color: colors.textSecondary,
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
  emptyState: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 10,
  },
  emptyIllustration: {
    position: "relative",
    width: 200,
    height: 200,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  emptyGlow: {
    position: "absolute",
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: "#FAF8FE",
  },
  emptyDashedRing: {
    position: "absolute",
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: "#EEE8FA",
  },
  emptyDocument: {
    width: 100,
    height: 120,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: "#EEE8FA",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowColor: "#2A1550",
    shadowOpacity: 0.14,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
    elevation: 6,
  },
  documentLineLong: {
    width: 50,
    height: 4,
    borderRadius: 999,
    backgroundColor: "#EEE8FA",
  },
  documentLineShort: {
    width: 36,
    height: 4,
    borderRadius: 999,
    backgroundColor: "#EEE8FA",
  },
  cameraEmoji: {
    position: "absolute",
    top: 16,
    right: 8,
  },
  pinEmoji: {
    position: "absolute",
    bottom: 24,
    left: 12,
  },
  orangeDot: {
    position: "absolute",
    top: 28,
    left: 6,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#F59E0B",
    shadowColor: "#F59E0B",
    shadowOpacity: 0.7,
    shadowRadius: 8,
    elevation: 5,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: -0.6,
  },
  emptyText: {
    maxWidth: 300,
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 22,
    textAlign: "center",
    marginTop: 10,
    marginBottom: 28,
  },
  emptyPrimaryShell: {
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#6038B0",
    shadowOpacity: 0.3,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 7,
  },
  emptyPrimary: {
    minHeight: 53,
    paddingHorizontal: 16,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  emptyPrimaryText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  browseLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    padding: 12,
  },
  browseLinkText: {
    color: "#6038B0",
    fontSize: 13,
    fontWeight: "700",
  },
  tipCard: {
    width: "100%",
    minHeight: 86,
    padding: 14,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#EEE8FA",
    backgroundColor: "#F6F2FC",
  },
  tipIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  tipCopy: {
    flex: 1,
  },
  tipTitle: {
    color: "#2A1550",
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 3,
  },
  tipText: {
    color: "#4A4458",
    fontSize: 12,
    lineHeight: 18,
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
