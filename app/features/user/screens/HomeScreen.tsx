import { MaterialCommunityIcons } from "@expo/vector-icons";
import { NavigationProp, useNavigation } from "@react-navigation/native";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
import { useAuth } from "../../auth/context/AuthContext";
import { categoryMeta, sampleComplaints, sampleProfile, sampleStats } from "../data/citizenSampleData";
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
import type { UserTabParamList } from "../types/user.types";
import { formatDistance, statusColors, statusLabels } from "../utils/citizenUi";

type HomeNavigation = NavigationProp<UserTabParamList>;

const categoryOrder: CitizenComplaintCategory[] = [
  "road",
  "water",
  "power",
  "waste",
  "trees",
  "other",
];

export default function HomeScreen() {
  const navigation = useNavigation<HomeNavigation>();
  const { user } = useAuth();
  const [profile, setProfile] = useState<CitizenProfile>({
    ...sampleProfile,
    name: user?.name ?? sampleProfile.name,
  });
  const [stats, setStats] = useState<CitizenStats>(sampleStats);
  const [nearbyComplaints, setNearbyComplaints] = useState<CitizenComplaint[]>(sampleComplaints);
  const [notifications, setNotifications] = useState<CitizenNotification[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [gpsEnabled, setGpsEnabled] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const unreadCount = notifications.filter((notification) => notification.unread).length;
  const firstName = profile.name.split(" ")[0] ?? "Citizen";

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

    const nextProfile = {
      ...profileResult.data,
      name: user?.name ?? profileResult.data.name,
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
      fetchNearbyComplaints(nextProfile.location.lat, nextProfile.location.lng, 2),
      fetchWardComplaintCount(nextProfile.location.wardId),
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
  }, [gpsEnabled, user?.name]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  function refreshDashboard() {
    setRefreshing(true);
    void loadDashboard();
  }

  function openReport(category: CitizenComplaintCategory) {
    navigation.navigate("Report", { category });
  }

  function openComplaint(complaint: CitizenComplaint) {
    Alert.alert(complaint.complaintNo, `${complaint.title}\n${complaint.location.address}`);
  }

  function openNotifications() {
    Alert.alert(
      "Notifications",
      notifications.length
        ? notifications.map((notification) => notification.title).join("\n")
        : "No notifications yet.",
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
        <View style={styles.header}>
          <View style={styles.headerWash} />
          <View style={styles.headerBloom} />
          <View style={styles.gridLineA} />
          <View style={styles.gridLineB} />

          <View style={styles.headerTop}>
            <View>
              <Text style={styles.greeting}>Good morning,</Text>
              <Text style={styles.userName}>{firstName === "Rahul" ? "Rahul Sharma" : profile.name}</Text>
            </View>

            <View style={styles.headerActions}>
              <Pressable style={styles.bellButton} onPress={openNotifications}>
                <MaterialCommunityIcons name="bell-outline" size={21} color={colors.surface} />
                {unreadCount ? <View style={styles.unreadDot} /> : null}
              </Pressable>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{profile.initials}</Text>
              </View>
            </View>
          </View>

          <View style={styles.locationPill}>
            <MaterialCommunityIcons name="map-marker-radius-outline" size={16} color="#EDE7FF" />
            <Text style={styles.locationText}>
              {profile.location.area} · {profile.location.ward} · {profile.location.city}
            </Text>
          </View>

          <View style={styles.searchBar}>
            <MaterialCommunityIcons name="magnify" size={20} color={colors.textMuted} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search complaints or areas..."
              placeholderTextColor={colors.textMuted}
              style={styles.searchInput}
            />
            <MaterialCommunityIcons name="tune-variant" size={20} color={colors.primary} />
          </View>
        </View>

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
              <StatCard label="In Progress" value={stats.inProgress} icon="progress-clock" accent={colors.info} />
              <StatCard label="Resolved" value={stats.resolved} icon="check-circle-outline" accent={colors.success} />
              <StatCard label="Ward Total" value={stats.wardTotal} icon="city-variant-outline" accent={colors.primary} />
            </>
          )}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Quick Report</Text>
          <Text style={styles.sectionAction}>AI-Powered Civic Reporting</Text>
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
                  <MaterialCommunityIcons
                    name={meta.icon as keyof typeof MaterialCommunityIcons.glyphMap}
                    size={22}
                    color={meta.color}
                  />
                </View>
                <Text style={styles.categoryLabel}>{meta.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Near You</Text>
          <Pressable onPress={() => navigation.navigate("Browse")}>
            <Text style={styles.viewAll}>Browse</Text>
          </Pressable>
        </View>

        {!gpsEnabled ? (
          <View style={styles.emptyCard}>
            <MaterialCommunityIcons name="crosshairs-gps" size={36} color={colors.primary} />
            <Text style={styles.emptyTitle}>Location is disabled</Text>
            <Text style={styles.emptyText}>Enable GPS to show complaints within 2km of Koteshwor.</Text>
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
            {gpsEnabled ? "Preview GPS disabled state" : "Restore detected location"}
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
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  accent: string;
}) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: `${accent}18` }]}>
        <MaterialCommunityIcons name={icon} size={18} color={accent} />
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
        <MaterialCommunityIcons
          name={meta.icon as keyof typeof MaterialCommunityIcons.glyphMap}
          size={22}
          color={meta.color}
        />
      </View>
      <View style={styles.complaintBody}>
        <View style={styles.complaintTitleRow}>
          <Text style={styles.complaintTitle} numberOfLines={1}>
            {complaint.title}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: `${statusColors[complaint.status]}18` }]}>
            <Text style={[styles.statusText, { color: statusColors[complaint.status] }]}>
              {statusLabels[complaint.status]}
            </Text>
          </View>
        </View>
        <View style={styles.complaintMeta}>
          <Text style={styles.metaText}>{formatDistance(complaint.distanceKm)} away</Text>
          <View style={styles.dot} />
          <MaterialCommunityIcons name="arrow-up-bold-outline" size={14} color={colors.textMuted} />
          <Text style={styles.metaText}>{complaint.upvotes}</Text>
        </View>
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
    marginHorizontal: 14,
    marginTop: 10,
    padding: 18,
    borderRadius: 30,
    overflow: "hidden",
    backgroundColor: colors.primaryDeep,
    shadowColor: colors.primaryDeep,
    shadowOpacity: 0.24,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 16 },
    elevation: 10,
  },
  headerWash: {
    position: "absolute",
    top: -50,
    right: -50,
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: colors.primaryMid,
    opacity: 0.65,
  },
  headerBloom: {
    position: "absolute",
    bottom: -70,
    left: -40,
    width: 210,
    height: 160,
    borderRadius: 80,
    backgroundColor: colors.primary,
    opacity: 0.32,
  },
  gridLineA: {
    position: "absolute",
    top: 36,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  gridLineB: {
    position: "absolute",
    top: 86,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 18,
  },
  greeting: {
    color: "#DED4FF",
    fontSize: 15,
    fontWeight: "700",
  },
  userName: {
    color: colors.surface,
    fontSize: 28,
    fontWeight: "900",
    marginTop: 4,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  bellButton: {
    width: 42,
    height: 42,
    borderRadius: 16,
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
    backgroundColor: colors.error,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
  },
  avatarText: {
    color: colors.primary,
    fontSize: 14,
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
  },
  locationText: {
    color: "#F4F0FF",
    fontSize: 12,
    fontWeight: "800",
  },
  searchBar: {
    minHeight: 52,
    borderRadius: 18,
    backgroundColor: colors.surface,
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
    gap: 10,
    paddingHorizontal: 16,
    marginTop: 16,
  },
  statCard: {
    width: "48.6%",
    minHeight: 112,
    borderRadius: 22,
    padding: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statIcon: {
    width: 34,
    height: 34,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
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
    marginTop: 22,
    marginBottom: 12,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "900",
  },
  sectionAction: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "800",
  },
  viewAll: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: "900",
  },
  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    paddingHorizontal: 16,
  },
  categoryCard: {
    width: "31.4%",
    minHeight: 96,
    borderRadius: 20,
    padding: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryIcon: {
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 9,
  },
  categoryLabel: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "900",
  },
  feedList: {
    gap: 10,
    paddingHorizontal: 16,
  },
  complaintCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 13,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  complaintIcon: {
    width: 46,
    height: 46,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  complaintBody: {
    flex: 1,
    gap: 8,
  },
  complaintTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  complaintTitle: {
    flex: 1,
    color: colors.text,
    fontSize: 14,
    fontWeight: "900",
  },
  complaintMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
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
