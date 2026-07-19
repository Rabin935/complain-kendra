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
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "../../../constants/colors";
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "../services/citizen.service";
import type { CitizenNotification } from "../types/citizen.types";
import type { UserStackParamList } from "../types/user.types";

type NotificationNavigation = NavigationProp<UserStackParamList>;
type NotificationFilter = "all" | "unread" | "mentions";

const filters: Array<{ id: NotificationFilter; label: string }> = [
  { id: "all", label: "All" },
  { id: "unread", label: "Unread" },
  { id: "mentions", label: "Mentions" },
];

function isToday(value: string): boolean {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return false;
  }

  const now = new Date();
  return date.toDateString() === now.toDateString();
}

function timeAgo(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Just now";
  }

  const seconds = Math.max(1, Math.floor((Date.now() - date.getTime()) / 1000));
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (minutes < 1) {
    return "Just now";
  }

  if (minutes < 60) {
    return `${minutes} min ago`;
  }

  if (hours < 24) {
    return `${hours}h ago`;
  }

  if (days < 7) {
    return `${days}d ago`;
  }

  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function isMention(notification: CitizenNotification): boolean {
  const type = notification.type?.toLowerCase() ?? "";
  const text = `${notification.title} ${notification.body}`.toLowerCase();

  return type.includes("comment") || type.includes("mention") || text.includes("commented");
}

function isResolvedNotification(notification: CitizenNotification): boolean {
  const type = notification.type?.toLowerCase() ?? "";
  const text = `${notification.title} ${notification.body}`.toLowerCase();
  return type === "complaint_resolved" || text.includes("complaint resolved");
}

function getNotificationIcon(notification: CitizenNotification): {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  color: string;
  backgroundColor: string;
} {
  const text = `${notification.type ?? ""} ${notification.title} ${notification.body}`.toLowerCase();

  if (text.includes("resolved") || text.includes("complete")) {
    return { icon: "check-circle-outline", color: colors.success, backgroundColor: "#DCFCE7" };
  }

  if (text.includes("comment") || text.includes("mention")) {
    return { icon: "message-text-outline", color: colors.primary, backgroundColor: "#EEE8FA" };
  }

  if (text.includes("upvote") || text.includes("follow")) {
    return { icon: "thumb-up-outline", color: colors.warning, backgroundColor: "#FEF3C7" };
  }

  if (text.includes("badge") || text.includes("leaderboard") || text.includes("point")) {
    return { icon: "trophy-outline", color: colors.primary, backgroundColor: "#EEE8FA" };
  }

  if (text.includes("transfer") || text.includes("department") || text.includes("officer")) {
    return { icon: "office-building-outline", color: colors.primary, backgroundColor: "#EEE8FA" };
  }

  return { icon: "bell-outline", color: colors.primary, backgroundColor: colors.primaryLight };
}

function getComplaintId(notification: CitizenNotification): string | null {
  const data = notification.data ?? {};
  const id =
    data.complaintId ??
    data.complaint_id ??
    data.complaint ??
    data.id;

  return typeof id === "string" && id.trim() ? id : null;
}

export default function NotificationScreen() {
  const navigation = useNavigation<NotificationNavigation>();
  const insets = useSafeAreaInsets();
  const [notifications, setNotifications] = useState<CitizenNotification[]>([]);
  const [activeFilter, setActiveFilter] = useState<NotificationFilter>("all");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadNotifications = useCallback(async () => {
    setError(null);
    const result = await fetchNotifications();
    setNotifications(result.data);
    setError(result.error ?? null);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

  const counts = useMemo(() => {
    return {
      all: notifications.length,
      unread: notifications.filter((notification) => notification.unread).length,
      mentions: notifications.filter(isMention).length,
    };
  }, [notifications]);

  const visibleNotifications = useMemo(() => {
    if (activeFilter === "unread") {
      return notifications.filter((notification) => notification.unread);
    }

    if (activeFilter === "mentions") {
      return notifications.filter(isMention);
    }

    return notifications;
  }, [activeFilter, notifications]);

  const todayNotifications = visibleNotifications.filter((notification) => isToday(notification.createdAt));
  const earlierNotifications = visibleNotifications.filter((notification) => !isToday(notification.createdAt));

  function refresh() {
    setRefreshing(true);
    void loadNotifications();
  }

  async function markAllRead() {
    if (!counts.unread || saving) {
      return;
    }

    setSaving(true);
    setNotifications((current) =>
      current.map((notification) => ({ ...notification, unread: false, readAt: new Date().toISOString() })),
    );
    const result = await markAllNotificationsRead();
    setSaving(false);

    if (result.error) {
      setError(result.error);
      void loadNotifications();
    }
  }

  async function openNotification(notification: CitizenNotification) {
    if (notification.unread) {
      setNotifications((current) =>
        current.map((item) =>
          item.id === notification.id ? { ...item, unread: false, readAt: new Date().toISOString() } : item,
        ),
      );
      const result = await markNotificationRead(notification.id);

      if (result.error) {
        setError(result.error);
      }
    }

    const complaintId = getComplaintId(notification);

    if (complaintId) {
      navigation.navigate(
        isResolvedNotification(notification) ? "RateResolution" : "ComplaintDetail",
        { complaintId },
      );
    }
  }

  if (loading) {
    return (
      <SafeAreaView edges={["top"]} style={styles.safeArea}>
        <View style={styles.centerState}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.centerText}>Loading notifications...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <View style={styles.root}>
        <View style={styles.header}>
          <Text style={styles.title}>Notifications</Text>
          <Pressable
            accessibilityRole="button"
            disabled={!counts.unread || saving}
            style={({ pressed }) => [
              styles.markAllButton,
              !counts.unread || saving ? styles.markAllDisabled : null,
              pressed ? styles.pressed : null,
            ]}
            onPress={() => void markAllRead()}
          >
            <Text style={styles.markAllText}>{saving ? "Saving..." : "Mark all read"}</Text>
          </Pressable>
        </View>

        <View style={styles.filterRow}>
          {filters.map((filter) => {
            const active = activeFilter === filter.id;
            return (
              <Pressable
                key={filter.id}
                accessibilityRole="button"
                accessibilityState={active ? { selected: true } : undefined}
                style={({ pressed }) => [
                  styles.filterChip,
                  active ? styles.filterChipActive : null,
                  pressed ? styles.pressed : null,
                ]}
                onPress={() => setActiveFilter(filter.id)}
              >
                <Text style={[styles.filterText, active ? styles.filterTextActive : null]}>
                  {filter.label}
                </Text>
                <View style={[styles.countBadge, active ? styles.countBadgeActive : null]}>
                  <Text style={[styles.countText, active ? styles.countTextActive : null]}>
                    {counts[filter.id]}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>

        {error ? (
          <View style={styles.errorBanner}>
            <MaterialCommunityIcons name="cloud-alert-outline" size={18} color={colors.error} />
            <Text style={styles.errorText}>{error}</Text>
            <Pressable style={styles.retryButton} onPress={refresh}>
              <Text style={styles.retryText}>Retry</Text>
            </Pressable>
          </View>
        ) : null}

        <ScrollView
          contentContainerStyle={[styles.listContent, { paddingBottom: 112 + insets.bottom }]}
          refreshControl={
            <RefreshControl refreshing={refreshing} tintColor={colors.primary} onRefresh={refresh} />
          }
          showsVerticalScrollIndicator={false}
        >
          {!visibleNotifications.length ? (
            <View style={styles.emptyCard}>
              <MaterialCommunityIcons name="bell-sleep-outline" size={35} color={colors.primary} />
              <Text style={styles.emptyTitle}>No notifications</Text>
              <Text style={styles.emptyText}>New complaint updates will appear here.</Text>
            </View>
          ) : null}

          <NotificationSection
            title="Today"
            notifications={todayNotifications}
            onPressNotification={(notification) => void openNotification(notification)}
          />
          <NotificationSection
            title="Earlier"
            notifications={earlierNotifications}
            onPressNotification={(notification) => void openNotification(notification)}
          />
        </ScrollView>

      </View>
    </SafeAreaView>
  );
}

function NotificationSection({
  title,
  notifications,
  onPressNotification,
}: {
  title: string;
  notifications: CitizenNotification[];
  onPressNotification: (notification: CitizenNotification) => void;
}) {
  if (!notifications.length) {
    return null;
  }

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {notifications.map((notification) => (
        <NotificationRow
          key={notification.id}
          notification={notification}
          onPress={() => onPressNotification(notification)}
        />
      ))}
    </View>
  );
}

function NotificationRow({
  notification,
  onPress,
}: {
  notification: CitizenNotification;
  onPress: () => void;
}) {
  const meta = getNotificationIcon(notification);

  return (
    <Pressable
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.notificationCard,
        !notification.unread ? styles.notificationCardRead : null,
        pressed ? styles.pressed : null,
      ]}
      onPress={onPress}
    >
      <View style={[styles.notificationIcon, { backgroundColor: meta.backgroundColor }]}>
        <MaterialCommunityIcons name={meta.icon} size={24} color={meta.color} />
      </View>
      <View style={styles.notificationCopy}>
        <Text style={styles.notificationTitle} numberOfLines={2}>
          {notification.title || "Notification"}
        </Text>
        <Text style={styles.notificationBody} numberOfLines={2}>
          {notification.body || "Complaint update"}
        </Text>
        <View style={styles.timeRow}>
          <MaterialCommunityIcons name="clock-outline" size={12} color={colors.textMuted} />
          <Text style={styles.notificationTime}>{timeAgo(notification.createdAt)}</Text>
        </View>
      </View>
      {notification.unread ? <View style={styles.unreadDot} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: 22,
    paddingTop: 8,
    paddingBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    color: colors.text,
    fontSize: 19,
    fontWeight: "900",
  },
  markAllButton: {
    borderRadius: 10,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  markAllDisabled: {
    opacity: 0.48,
  },
  markAllText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "800",
  },
  filterRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  filterChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  filterText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "800",
  },
  filterTextActive: {
    color: colors.surface,
  },
  countBadge: {
    minWidth: 22,
    minHeight: 18,
    borderRadius: 99,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: 6,
  },
  countBadgeActive: {
    backgroundColor: "rgba(255,255,255,0.25)",
  },
  countText: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "900",
  },
  countTextActive: {
    color: colors.surface,
  },
  errorBanner: {
    marginHorizontal: 20,
    marginBottom: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  errorText: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "700",
  },
  retryButton: {
    borderRadius: 999,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  retryText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "900",
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 2,
  },
  section: {
    marginBottom: 10,
  },
  sectionTitle: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1,
    marginBottom: 10,
    textTransform: "uppercase",
  },
  notificationCard: {
    minHeight: 72,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 14,
    marginBottom: 8,
    flexDirection: "row",
    gap: 12,
    position: "relative",
  },
  notificationCardRead: {
    backgroundColor: "rgba(255,255,255,0.72)",
  },
  notificationIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  notificationCopy: {
    flex: 1,
    minWidth: 0,
    paddingRight: 12,
  },
  notificationTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "900",
    lineHeight: 18,
    marginBottom: 3,
  },
  notificationBody: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 17,
    marginBottom: 5,
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  notificationTime: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "600",
  },
  unreadDot: {
    position: "absolute",
    top: 18,
    right: 14,
    width: 9,
    height: 9,
    borderRadius: 99,
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 3,
  },
  emptyCard: {
    marginTop: 90,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 28,
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
    fontWeight: "600",
    marginTop: 5,
    textAlign: "center",
  },
  centerState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  centerText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: "700",
  },
  pressed: {
    opacity: 0.72,
  },
});
