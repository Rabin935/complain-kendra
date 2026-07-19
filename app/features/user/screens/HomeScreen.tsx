import { Text, TextInput } from "@/src/theme/typography";
import {
  MaterialCommunityIcons } from "@expo/vector-icons";
import { NavigationProp,
  useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
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
import { useRealtimeInvalidation } from "../../realtime/hooks/useRealtimeInvalidation";
import { categoryMeta } from "../data/citizenSampleData";
import {
  fetchCitizenProfile,
  fetchCitizenStats,
  fetchNearbyComplaints,
  fetchNotifications,
  fetchWardComplaintCount,
} from "../services/citizen.service";
import type {
  CitizenComplaint,
  CitizenComplaintCategory,
  CitizenNotification,
  CitizenProfile,
  CitizenStats,
} from "../types/citizen.types";
import type { UserStackParamList, UserTabParamList } from "../types/user.types";
import { formatDistance, statusColors, statusLabels } from "../utils/citizenUi";

type HomeNavigation = NavigationProp<UserTabParamList & UserStackParamList>;

const categoryOrder: CitizenComplaintCategory[] = [
  "road",
  "water",
  "power",
  "waste",
];
const categoryEmojis: Record<CitizenComplaintCategory, string> = {
  road: "🚧",
  water: "💧",
  power: "⚡",
  waste: "🗑",
  trees: "🌿",
  other: "•••",
};

const emptyStats: CitizenStats = {
  pending: 0,
  inProgress: 0,
  resolved: 0,
  wardTotal: 0,
  reportsSubmitted: 0,
  upvotesReceived: 0,
  badgesEarned: 0,
};

function hasUsableCoordinates(profile: CitizenProfile): boolean {
  return (
    Number.isFinite(profile.location.lat) &&
    Number.isFinite(profile.location.lng) &&
    profile.location.lat !== 0 &&
    profile.location.lng !== 0
  );
}

function formatProfileLocation(profile: CitizenProfile): string {
  return (
    [profile.location.area, profile.location.ward, profile.location.city]
      .filter(Boolean)
      .join(" - ") || "Location not set"
  );
}

export default function HomeScreen() {
  const navigation = useNavigation<HomeNavigation>();
  const [profile, setProfile] = useState<CitizenProfile | null>(null);
  const [stats, setStats] = useState<CitizenStats>(emptyStats);
  const [nearbyComplaints, setNearbyComplaints] = useState<CitizenComplaint[]>([]);
  const [notifications, setNotifications] = useState<CitizenNotification[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [gpsEnabled, setGpsEnabled] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const unreadCount = notifications.filter((notification) => notification.unread).length;

  const filteredNearby = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    if (!query) {
      return nearbyComplaints;
    }

    return nearbyComplaints.filter((complaint) => {
      const categoryLabel = categoryMeta[complaint.category].label.toLowerCase();
      return (
        complaint.title.toLowerCase().includes(query) ||
        complaint.location.address.toLowerCase().includes(query) ||
        complaint.location.ward.toLowerCase().includes(query) ||
        categoryLabel.includes(query)
      );
    });
  }, [nearbyComplaints, searchQuery]);

  const loadDashboard = useCallback(async () => {
    setError(null);

    const [profileResult, statsResult, notificationResult] = await Promise.all([
      fetchCitizenProfile(),
      fetchCitizenStats(),
      fetchNotifications(),
    ]);

    if (profileResult.source !== "api" || !profileResult.data.id) {
      setProfile(null);
      setStats(emptyStats);
      setNotifications([]);
      setNearbyComplaints([]);
      setError(profileResult.error ?? "Unable to load your profile from the database.");
      setLoading(false);
      setRefreshing(false);
      return;
    }

    const nextProfile = {
      ...profileResult.data,
    };

    setProfile(nextProfile);
    setStats(statsResult.data);
    setNotifications(notificationResult.data);

    if (!gpsEnabled) {
      setNearbyComplaints([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    const [nearbyResult, wardCountResult] = await Promise.all([
      hasUsableCoordinates(nextProfile)
        ? fetchNearbyComplaints(nextProfile.location.lat, nextProfile.location.lng, 2)
        : Promise.resolve({ data: [] as CitizenComplaint[], source: "api" as const, error: undefined }),
      nextProfile.location.wardId
        ? fetchWardComplaintCount(nextProfile.location.wardId)
        : Promise.resolve({ data: statsResult.data.wardTotal, source: "api" as const, error: undefined }),
    ]);

    setNearbyComplaints(nearbyResult.data);
    setStats((current) => ({
      ...current,
      wardTotal: wardCountResult.data,
    }));

    const liveErrors = [
      profileResult.error,
      statsResult.error,
      nearbyResult.error,
      wardCountResult.error,
      notificationResult.error,
    ].filter(Boolean);

    setError(liveErrors.length ? "Couldn't load ward updates. Try again." : null);
    setLoading(false);
    setRefreshing(false);
  }, [gpsEnabled]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);
  useRealtimeInvalidation(
    ["complaint:created", "complaint:status_updated", "complaint:resolved", "notification:new"],
    () => void loadDashboard(),
  );

  function refreshDashboard() {
    setRefreshing(true);
    void loadDashboard();
  }

  function openReport(category: CitizenComplaintCategory) {
    navigation.navigate("Report", { category });
  }

  function openComplaint(complaint: CitizenComplaint) {
    navigation.navigate("ComplaintDetail", { complaintId: complaint.id });
  }

  function openNotifications() {
    navigation.navigate("Notifications");
  }

  if (loading && !profile) {
    return (
      <SafeAreaView edges={["top"]} style={styles.safeArea}>
        <View style={styles.loadingState}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.loadingText}>Loading your profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView edges={["top"]} style={styles.safeArea}>
        <View style={styles.loadingState}>
          <MaterialCommunityIcons name="database-alert-outline" size={32} color={colors.error} />
          <Text style={styles.emptyTitle}>Profile unavailable</Text>
          <Text style={styles.emptyText}>{error ?? "Unable to load your profile from the database."}</Text>
          <Pressable style={styles.primaryButton} onPress={refreshDashboard}>
            <Text style={styles.primaryButtonText}>Retry</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
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
            onRefresh={refreshDashboard}
          />
        }
      >
        <LinearGradient
          colors={[colors.primaryMid, colors.primary, colors.primaryDark]}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={styles.header}
        >
          <View style={styles.headerGlow} />
          <View style={[styles.contour, styles.contourA]} />
          <View style={[styles.contour, styles.contourB]} />
          <View style={[styles.contour, styles.contourC]} />
          <View style={[styles.contour, styles.contourD]} />

          <View style={styles.headerTop}>
            <View style={styles.headerIdentity}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{profile.initials}</Text>
              </View>
              <View style={styles.headerCopy}>
                <Text style={styles.greeting}>Good morning,</Text>
                <Text style={styles.userName} numberOfLines={1}>{profile.name}</Text>
              </View>
            </View>

            <Pressable style={styles.bellButton} onPress={openNotifications}>
              <MaterialCommunityIcons name="bell-outline" size={20} color="#FFFFFF" />
              {unreadCount ? <View style={styles.unreadDot} /> : null}
            </Pressable>
          </View>

          <View style={styles.locationPill}>
            <MaterialCommunityIcons name="map-marker" size={12} color={colors.accentLavender} />
            <Text style={styles.locationText}>
              {formatProfileLocation(profile)}
            </Text>
          </View>

          <View style={styles.searchBar}>
            <MaterialCommunityIcons name="magnify" size={18} color={colors.textMuted} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search complaints or areas..."
              placeholderTextColor={colors.textMuted}
              style={styles.searchInput}
            />
            <View style={styles.searchTune}>
              <MaterialCommunityIcons name="tune-variant" size={16} color={colors.primary} />
            </View>
          </View>
        </LinearGradient>

        {error ? (
          <View style={styles.errorCard}>
            <MaterialCommunityIcons name="wifi-alert" size={20} color={colors.error} />
            <Text style={styles.errorText}>{error}</Text>
            <Pressable style={styles.retryChip} onPress={refreshDashboard}>
              <Text style={styles.retryChipText}>Retry</Text>
            </Pressable>
          </View>
        ) : null}

        <View style={styles.statsGrid}>
          {loading ? (
            <>
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </>
          ) : (
            <>
              <StatCard label="Pending" value={stats.pending} icon="clock-outline" accent={colors.warning} />
              <StatCard label="In Progress" value={stats.inProgress} icon="loading" accent={colors.info} />
              <StatCard label="Resolved" value={stats.resolved} icon="check-circle" accent={colors.success} />
              <StatCard label="In your ward" value={stats.wardTotal} icon="map-outline" accent={colors.primary} />
            </>
          )}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Quick Report</Text>
          <Pressable style={styles.viewAllRow} onPress={() => openReport("other")}>
            <Text style={styles.viewAll}>See all</Text>
            <MaterialCommunityIcons name="arrow-right" size={13} color={colors.primary} />
          </Pressable>
        </View>

        <View style={styles.categoryGrid}>
          {categoryOrder.map((category) => {
            const meta = categoryMeta[category];
            return (
              <Pressable
                key={category}
                style={({ pressed }) => [
                  styles.categoryCard,
                  pressed ? styles.pressed : null,
                ]}
                onPress={() => openReport(category)}
              >
                <View style={[styles.categoryIcon, { backgroundColor: meta.softColor }]}>
                  <Text style={styles.categoryEmoji}>{categoryEmojis[category]}</Text>
                </View>
                <Text style={styles.categoryLabel}>{meta.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Near You</Text>
          <Pressable style={styles.viewAllRow} onPress={() => navigation.navigate("Browse")}>
            <Text style={styles.viewAll}>Browse all</Text>
            <MaterialCommunityIcons name="arrow-right" size={13} color={colors.primary} />
          </Pressable>
        </View>

        {!gpsEnabled ? (
          <View style={styles.emptyCard}>
            <MaterialCommunityIcons name="crosshairs-gps" size={36} color={colors.primary} />
            <Text style={styles.emptyTitle}>Location is disabled</Text>
            <Text style={styles.emptyText}>
              Enable GPS to show complaints near {profile.location.area || "your saved location"}.
            </Text>
            <Pressable style={styles.primaryButton} onPress={() => setGpsEnabled(true)}>
              <Text style={styles.primaryButtonText}>Enable Location</Text>
            </Pressable>
          </View>
        ) : loading ? (
          <View style={styles.feedSkeleton}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.loadingText}>Loading ward updates...</Text>
          </View>
        ) : filteredNearby.length ? (
          <View style={styles.feedList}>
            {filteredNearby.slice(0, 4).map((complaint) => (
              <ComplaintPreview
                key={complaint.id}
                complaint={complaint}
                onPress={() => openComplaint(complaint)}
              />
            ))}
          </View>
        ) : (
          <View style={styles.emptyCard}>
            <MaterialCommunityIcons name="map-marker-check-outline" size={36} color={colors.primary} />
            <Text style={styles.emptyTitle}>No recent complaints near you</Text>
            <Text style={styles.emptyText}>Your 2km radius is quiet right now.</Text>
          </View>
        )}

        <Pressable style={styles.locationToggle} onPress={() => setGpsEnabled((current) => !current)}>
          <MaterialCommunityIcons
            name={gpsEnabled ? "map-marker-off-outline" : "crosshairs-gps"}
            size={16}
            color={colors.primary}
          />
          <Text style={styles.locationToggleText}>
            {gpsEnabled ? "Hide nearby location" : "Use saved location"}
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: number;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  accent: string;
}) {
  return (
    <View style={styles.statCard}>
      <View style={styles.statTopRow}>
        <View style={[styles.statIcon, { backgroundColor: `${accent}22` }]}>
          <MaterialCommunityIcons name={icon} size={17} color={accent} />
        </View>
        <MaterialCommunityIcons name="chevron-right" size={18} color={colors.textMuted} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function SkeletonCard() {
  return (
    <View style={styles.statCard}>
      <View style={styles.skeletonCircle} />
      <View style={styles.skeletonLineLarge} />
      <View style={styles.skeletonLineSmall} />
    </View>
  );
}

function ComplaintPreview({
  complaint,
  onPress,
}: {
  complaint: CitizenComplaint;
  onPress: () => void;
}) {
  const meta = categoryMeta[complaint.category];

  return (
    <Pressable style={({ pressed }) => [styles.complaintCard, pressed ? styles.pressed : null]} onPress={onPress}>
      <View style={[styles.complaintIcon, { backgroundColor: meta.softColor }]}>
        <Text style={styles.complaintEmoji}>{categoryEmojis[complaint.category]}</Text>
      </View>
      <View style={styles.complaintBody}>
        <Text style={styles.complaintTitle} numberOfLines={1}>
          {complaint.title}
        </Text>
        <View style={styles.complaintMeta}>
          <MaterialCommunityIcons name="map-marker-outline" size={12} color={colors.textMuted} />
          <Text style={styles.metaText}>{formatDistance(complaint.distanceKm)}</Text>
          <View style={styles.dot} />
          <MaterialCommunityIcons name="arrow-up-bold" size={12} color={colors.primary} />
          <Text style={styles.metaText}>{complaint.upvotes}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: `${statusColors[complaint.status]}18` }]}>
          <Text style={[styles.statusText, { color: statusColors[complaint.status] }]}>
            {statusLabels[complaint.status]}
          </Text>
        </View>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={20} color={colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingBottom: 132,
  },
  header: {
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: 52,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: "hidden",
    backgroundColor: colors.primary,
  },
  /** Approximates the prototype's `<TopoLines/>` SVG — see LoginScreen. */
  contour: {
    position: "absolute",
    left: -180,
    right: -180,
    height: 280,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  contourA: {
    top: -170,
  },
  contourB: {
    top: -116,
  },
  contourC: {
    top: -58,
  },
  contourD: {
    top: 6,
  },
  headerGlow: {
    position: "absolute",
    top: -80,
    right: -60,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "rgba(196,181,253,0.16)",
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  headerIdentity: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerCopy: {
    flex: 1,
    minWidth: 0,
  },
  greeting: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 12,
    fontWeight: "700",
  },
  userName: {
    color: colors.surface,
    fontSize: 17,
    fontWeight: "900",
    marginTop: 2,
  },
  bellButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.13)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
  },
  unreadDot: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accent,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.18)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
  },
  avatarText: {
    color: colors.surface,
    fontSize: 16,
    fontWeight: "900",
  },
  locationPill: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.13)",
    marginBottom: 16,
    maxWidth: "100%",
  },
  locationText: {
    flexShrink: 1,
    color: "#F4F0FF",
    fontSize: 12,
    fontWeight: "800",
  },
  searchBar: {
    minHeight: 52,
    borderRadius: 16,
    backgroundColor: colors.surface,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    shadowColor: colors.primaryDeep,
    shadowOpacity: 0.16,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
  },
  searchTune: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primaryLight,
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    fontSize: 14,
    fontWeight: "600",
  },
  errorCard: {
    marginHorizontal: 16,
    marginTop: 14,
    padding: 12,
    borderRadius: 18,
    backgroundColor: "#FFF1F2",
    borderWidth: 1,
    borderColor: "#FFE0E4",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  errorText: {
    flex: 1,
    color: colors.error,
    fontSize: 12,
    fontWeight: "700",
  },
  retryChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: colors.surface,
  },
  retryChipText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "900",
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 12,
    paddingHorizontal: 20,
    marginTop: -36,
    marginBottom: 2,
  },
  statCard: {
    width: "47.8%",
    minHeight: 118,
    borderRadius: 18,
    padding: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.primaryDeep,
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  statTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  statIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  statValue: {
    color: colors.text,
    fontSize: 26,
    fontWeight: "900",
  },
  statLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "800",
    marginTop: 2,
  },
  skeletonCircle: {
    width: 34,
    height: 34,
    borderRadius: 13,
    backgroundColor: colors.surfaceMuted,
    marginBottom: 14,
  },
  skeletonLineLarge: {
    width: 62,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.surfaceMuted,
    marginBottom: 10,
  },
  skeletonLineSmall: {
    width: 96,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.surfaceMuted,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    marginTop: 20,
    marginBottom: 12,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "900",
  },
  viewAllRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  viewAll: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "900",
  },
  categoryGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
    paddingHorizontal: 20,
  },
  categoryCard: {
    flex: 1,
    minHeight: 84,
    borderRadius: 16,
    paddingHorizontal: 6,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 7,
  },
  categoryEmoji: {
    fontSize: 20,
  },
  categoryLabel: {
    color: colors.text,
    fontSize: 11,
    fontWeight: "900",
    textAlign: "center",
  },
  feedList: {
    gap: 10,
    paddingHorizontal: 16,
  },
  complaintCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  complaintIcon: {
    width: 56,
    height: 56,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  complaintEmoji: {
    fontSize: 26,
  },
  complaintBody: {
    flex: 1,
    minWidth: 0,
  },
  complaintTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "900",
    marginBottom: 5,
  },
  complaintMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 7,
  },
  metaText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "700",
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
  },
  statusBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 999,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "900",
  },
  emptyCard: {
    marginHorizontal: 16,
    padding: 22,
    borderRadius: 22,
    alignItems: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
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
    lineHeight: 19,
    textAlign: "center",
    marginTop: 6,
  },
  primaryButton: {
    marginTop: 14,
    minHeight: 44,
    borderRadius: 14,
    paddingHorizontal: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
  },
  primaryButtonText: {
    color: colors.surface,
    fontSize: 13,
    fontWeight: "900",
  },
  feedSkeleton: {
    marginHorizontal: 16,
    minHeight: 120,
    borderRadius: 22,
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
    fontWeight: "700",
  },
  loadingState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 24,
  },
  locationToggle: {
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  locationToggleText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "800",
  },
  pressed: {
    opacity: 0.78,
    transform: [{ scale: 0.99 }],
  },
});
