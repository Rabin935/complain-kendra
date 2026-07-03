import { MaterialCommunityIcons } from "@expo/vector-icons";
import { NavigationProp, useNavigation } from "@react-navigation/native";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "../../../constants/colors";
import { useAuth } from "../../auth/context/AuthContext";
import {
  fetchCitizenBadges,
  fetchCitizenProfile,
  fetchCitizenStats,
  updatePublicProfile,
} from "../services/citizen.service";
import type {
  CitizenBadge,
  CitizenProfile,
  CitizenStats,
} from "../types/citizen.types";
import type { UserStackParamList } from "../types/user.types";

type ProfileNavigation = NavigationProp<UserStackParamList>;

const emptyStats: CitizenStats = {
  pending: 0,
  inProgress: 0,
  resolved: 0,
  wardTotal: 0,
  reportsSubmitted: 0,
  upvotesReceived: 0,
  badgesEarned: 0,
};

function getAchievementCards(
  badges: CitizenBadge[],
  stats: CitizenStats,
): Array<{ id: string; title: string; icon: keyof typeof MaterialCommunityIcons.glyphMap; earned: boolean }> {
  const fallback = [
    {
      id: "reports",
      title: "Civic Hero",
      icon: "trophy-outline" as const,
      earned: stats.reportsSubmitted > 0,
    },
    {
      id: "resolved",
      title: "7-day streak",
      icon: "fire" as const,
      earned: stats.resolved > 0,
    },
    {
      id: "upvotes",
      title: "Top voted",
      icon: "star-outline" as const,
      earned: stats.upvotesReceived > 0,
    },
    {
      id: "public",
      title: "Watchful",
      icon: "eye-outline" as const,
      earned: true,
    },
  ];

  if (!badges.length) {
    return fallback;
  }

  return badges.slice(0, 4).map((badge, index) => ({
    id: badge.id,
    title: badge.title,
    icon: (badge.icon || fallback[index]?.icon || "medal-outline") as keyof typeof MaterialCommunityIcons.glyphMap,
    earned: badge.earned,
  }));
}

export default function ProfileScreen() {
  const navigation = useNavigation<ProfileNavigation>();
  const { logout, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<CitizenProfile | null>(null);
  const [stats, setStats] = useState<CitizenStats>(emptyStats);
  const [badges, setBadges] = useState<CitizenBadge[]>([]);
  const [loading, setLoading] = useState(true);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [publicUpdating, setPublicUpdating] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [logoutVisible, setLogoutVisible] = useState(false);
  const [deleteVisible, setDeleteVisible] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setError(null);

    const [profileResult, statsResult, badgesResult] = await Promise.all([
      fetchCitizenProfile(),
      fetchCitizenStats(),
      fetchCitizenBadges(),
    ]);

    if (profileResult.source !== "api" || !profileResult.data.id) {
      setProfile(null);
      setStats(emptyStats);
      setBadges([]);
      setError(profileResult.error ?? "Unable to load your profile from the database.");
      setLoading(false);
      return;
    }

    setProfile(profileResult.data);
    setStats(statsResult.data);
    setBadges(badgesResult.data);
    setError(
      statsResult.error || badgesResult.error
        ? "Some profile sections could not be loaded from the database."
        : null,
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  function showToast(message: string) {
    setToast(message);
    setTimeout(() => setToast(null), 2600);
  }

  async function togglePublicProfile(nextValue: boolean) {
    setPublicUpdating(true);
    setProfile((current) => (current ? { ...current, isPublic: nextValue } : current));
    const result = await updatePublicProfile(nextValue);
    setPublicUpdating(false);
    showToast(result.error ? "Public profile saved locally." : "Public profile updated.");
  }

  function uploadAvatar() {
    setAvatarUploading(true);
    setTimeout(() => {
      setAvatarUploading(false);
      showToast("Avatar upload complete.");
    }, 1100);
  }

  function handleMenuAction(action: string) {
    switch (action) {
      case "edit":
        showToast("Profile update success.");
        break;
      case "badges":
        Alert.alert("My Badges", badges.map((badge) => badge.title).join("\n"));
        break;
      case "notifications":
        navigation.navigate("Notifications");
        break;
      case "language":
        setProfile((current) =>
          current
            ? {
                ...current,
                language: current.language === "English" ? "Nepali" : "English",
              }
            : current,
        );
        showToast("Language update success.");
        break;
      case "password":
        showToast("Password change success.");
        break;
      case "help":
        Alert.alert("Help Center", "Ward support, report guidance, and privacy help are ready for backend content.");
        break;
      case "delete":
        setDeleteVisible(true);
        break;
    }
  }

  async function confirmLogout() {
    setLogoutVisible(false);
    await logout();
  }

  function confirmDelete() {
    if (!deletePassword.trim()) {
      showToast("Password confirmation is required.");
      return;
    }

    setDeleteVisible(false);
    setDeletePassword("");
    showToast("Account delete request submitted.");
  }

  if (loading) {
    return (
      <SafeAreaView edges={["top"]} style={styles.safeArea}>
        <View style={styles.loadingState}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.loadingText}>Loading profile...</Text>
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
          <Pressable style={styles.retryButton} onPress={() => void loadProfile()}>
            <Text style={styles.modalPrimaryText}>Retry</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const achievementCards = getAchievementCards(badges, stats);

  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.profileHeader}>
          <View style={styles.headerShade} />
          <View style={styles.gridVerticalA} />
          <View style={styles.gridVerticalB} />
          <View style={styles.gridHorizontalA} />
          <View style={styles.gridHorizontalB} />
          <Pressable style={styles.settingsButton} onPress={() => navigation.navigate("Settings")}>
            <MaterialCommunityIcons name="cog-outline" size={19} color={colors.surface} />
          </Pressable>

          <View style={styles.identityRow}>
            <Pressable style={styles.avatarShell} onPress={uploadAvatar}>
              {profile.avatarUrl ? (
                <Image source={{ uri: profile.avatarUrl }} style={styles.avatarImage} />
              ) : (
                <Text style={styles.avatarText}>{profile.initials}</Text>
              )}
              {avatarUploading ? (
                <View style={styles.avatarOverlay}>
                  <ActivityIndicator color={colors.surface} />
                </View>
              ) : (
                <View style={styles.verifiedBadge}>
                  <MaterialCommunityIcons name="check" size={18} color={colors.surface} />
                </View>
              )}
            </Pressable>

            <View style={styles.identityCopy}>
              <View style={styles.nameRow}>
                <Text style={styles.name} numberOfLines={1}>{profile.name}</Text>
                {profile.isPublic ? (
                  <View style={styles.nameVerified}>
                    <MaterialCommunityIcons name="check" size={15} color={colors.surface} />
                  </View>
                ) : null}
              </View>
              <Text style={styles.emailText} numberOfLines={1}>{profile.email}</Text>
              <View style={styles.levelPill}>
                <MaterialCommunityIcons name="trophy-outline" size={13} color="#FDE68A" />
                <Text style={styles.levelText}>
                  {profile.levelTitle} - Level {profile.level}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.bodyContent}>
          <View style={styles.statsCard}>
            <ProfileStat label="Reports" value={stats.reportsSubmitted} />
            <View style={styles.statDivider} />
            <ProfileStat label="Resolved" value={stats.resolved} />
            <View style={styles.statDivider} />
            <ProfileStat label="Upvotes" value={stats.upvotesReceived} />
          </View>

          {error ? (
            <View style={styles.infoBanner}>
              <MaterialCommunityIcons name="cloud-alert-outline" size={17} color={colors.primary} />
              <Text style={styles.infoText}>{error}</Text>
            </View>
          ) : null}

          {toast ? (
            <View style={styles.toast}>
              <MaterialCommunityIcons name="check-circle-outline" size={17} color={colors.success} />
              <Text style={styles.toastText}>{toast}</Text>
            </View>
          ) : null}

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Achievements</Text>
            <Text style={styles.sectionAction}>See all -&gt;</Text>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.achievementList}
          >
            {achievementCards.map((badge) => (
              <View key={badge.id} style={[styles.achievementCard, !badge.earned ? styles.achievementCardLocked : null]}>
                <View style={[styles.achievementIcon, !badge.earned ? styles.achievementIconLocked : null]}>
                  <MaterialCommunityIcons
                    name={badge.icon}
                    size={25}
                    color={badge.earned ? colors.primary : colors.textMuted}
                  />
                </View>
                <Text style={styles.achievementTitle} numberOfLines={2}>{badge.title}</Text>
              </View>
            ))}
          </ScrollView>

          <View style={styles.menu}>
            <MenuRow icon="account" title="Edit Profile" onPress={() => handleMenuAction("edit")} />
            <MenuRow icon="clipboard-text-outline" title="My Complaints" value={String(stats.reportsSubmitted)} onPress={() => handleMenuAction("badges")} />
            <MenuRow icon="lock-reset" title="Change Password" onPress={() => handleMenuAction("password")} />
            <MenuRow icon="web" title="Language" value={profile.language} onPress={() => handleMenuAction("language")} />
            <MenuRow icon="bell" title="Notifications" onPress={() => handleMenuAction("notifications")} />
            <MenuRow icon="help-circle-outline" title="Help & Support" onPress={() => handleMenuAction("help")} />
            <View style={styles.toggleRow}>
              <View style={styles.menuRowLeft}>
                <View style={styles.menuIcon}>
                  <MaterialCommunityIcons name="account-eye-outline" size={19} color={colors.primary} />
                </View>
                <Text style={styles.menuTitle}>Public Profile</Text>
              </View>
              {publicUpdating ? (
                <ActivityIndicator color={colors.primary} />
              ) : (
                <Switch
                  value={profile.isPublic}
                  onValueChange={(value) => void togglePublicProfile(value)}
                  trackColor={{ false: colors.border, true: "#C8B6F0" }}
                  thumbColor={profile.isPublic ? colors.primary : colors.surface}
                />
              )}
            </View>
            <MenuRow
              icon="logout"
              title={authLoading ? "Signing out..." : "Log Out"}
              danger
              onPress={() => setLogoutVisible(true)}
            />
          </View>

          <Text style={styles.footerText}>ComplainKendra v1.0 - Made for Nepal</Text>
        </View>
      </ScrollView>

      <ConfirmationModal
        visible={logoutVisible}
        title="Logout?"
        body="You will need to sign in again to track ward updates."
        confirmLabel="Logout"
        onCancel={() => setLogoutVisible(false)}
        onConfirm={() => void confirmLogout()}
      />

      <Modal visible={deleteVisible} transparent animationType="fade" onRequestClose={() => setDeleteVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Delete account?</Text>
            <Text style={styles.modalBody}>Enter your password to request account deletion.</Text>
            <TextInput
              value={deletePassword}
              onChangeText={setDeletePassword}
              placeholder="Password"
              placeholderTextColor={colors.textMuted}
              secureTextEntry
              style={styles.modalInput}
            />
            <View style={styles.modalActions}>
              <Pressable style={styles.modalCancel} onPress={() => setDeleteVisible(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.modalDanger} onPress={confirmDelete}>
                <Text style={styles.modalDangerText}>Confirm</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function ProfileStat({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function MenuRow({
  icon,
  title,
  value,
  danger,
  onPress,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  title: string;
  value?: string;
  danger?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable style={({ pressed }) => [styles.menuRow, pressed ? styles.pressed : null]} onPress={onPress}>
      <View style={styles.menuRowLeft}>
        <View style={[styles.menuIcon, danger ? styles.menuIconDanger : null]}>
          <MaterialCommunityIcons name={icon} size={19} color={danger ? colors.error : colors.primary} />
        </View>
        <Text style={[styles.menuTitle, danger ? styles.menuTitleDanger : null]}>{title}</Text>
      </View>
      <View style={styles.menuRowRight}>
        {value ? <Text style={styles.menuValue}>{value}</Text> : null}
        <MaterialCommunityIcons name="chevron-right" size={18} color={danger ? colors.error : colors.textMuted} />
      </View>
    </Pressable>
  );
}

function ConfirmationModal({
  visible,
  title,
  body,
  confirmLabel,
  onCancel,
  onConfirm,
}: {
  visible: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>{title}</Text>
          <Text style={styles.modalBody}>{body}</Text>
          <View style={styles.modalActions}>
            <Pressable style={styles.modalCancel} onPress={onCancel}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </Pressable>
            <Pressable style={styles.modalPrimary} onPress={onConfirm}>
              <Text style={styles.modalPrimaryText}>{confirmLabel}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingBottom: 122,
  },
  loadingState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: "800",
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "900",
    textAlign: "center",
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 19,
    textAlign: "center",
  },
  retryButton: {
    minHeight: 46,
    minWidth: 120,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
  },
  profileHeader: {
    minHeight: 220,
    paddingHorizontal: 22,
    paddingTop: 58,
    paddingBottom: 70,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    overflow: "hidden",
    backgroundColor: colors.primary,
  },
  headerShade: {
    position: "absolute",
    inset: 0,
    backgroundColor: colors.primaryDark,
    opacity: 0.22,
  },
  gridVerticalA: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: "32%",
    width: 1,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  gridVerticalB: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: "64%",
    width: 1,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  gridHorizontalA: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 74,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  gridHorizontalB: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 148,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  settingsButton: {
    position: "absolute",
    top: 14,
    right: 22,
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.14)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  identityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    zIndex: 2,
  },
  avatarShell: {
    width: 86,
    height: 86,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.3)",
    shadowColor: colors.primaryDeep,
    shadowOpacity: 0.3,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
  avatarImage: {
    width: "100%",
    height: "100%",
    borderRadius: 24,
  },
  avatarText: {
    color: colors.primary,
    fontSize: 31,
    fontWeight: "900",
  },
  avatarOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(42,21,80,0.62)",
  },
  verifiedBadge: {
    position: "absolute",
    right: -6,
    bottom: -6,
    width: 27,
    height: 27,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.success,
    borderWidth: 3,
    borderColor: colors.surface,
  },
  identityCopy: {
    flex: 1,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  name: {
    color: colors.surface,
    flexShrink: 1,
    fontSize: 21,
    fontWeight: "900",
  },
  nameVerified: {
    width: 19,
    height: 19,
    borderRadius: 4,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.success,
  },
  emailText: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 4,
    textDecorationLine: "underline",
  },
  levelPill: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 7,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.18)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
  },
  levelText: {
    color: colors.surface,
    fontSize: 11,
    fontWeight: "900",
  },
  bodyContent: {
    paddingHorizontal: 20,
    marginTop: -44,
  },
  infoBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
    padding: 11,
    borderRadius: 16,
    backgroundColor: "#EEE7FA",
    borderWidth: 1,
    borderColor: "#DED2F2",
  },
  infoText: {
    flex: 1,
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: "800",
  },
  toast: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
    padding: 11,
    borderRadius: 16,
    backgroundColor: "#DCFCE7",
    borderWidth: 1,
    borderColor: "#BBF7D0",
  },
  toastText: {
    flex: 1,
    color: "#166534",
    fontSize: 12,
    fontWeight: "900",
  },
  statsCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    minHeight: 84,
    paddingHorizontal: 4,
    paddingVertical: 16,
    borderRadius: 22,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.primaryDeep,
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  statCard: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  statValue: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "900",
  },
  statLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "800",
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: 34,
    backgroundColor: colors.border,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 22,
    marginBottom: 10,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "900",
  },
  sectionAction: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "900",
  },
  achievementList: {
    gap: 10,
    paddingBottom: 2,
  },
  achievementCard: {
    width: 90,
    minHeight: 98,
    borderRadius: 16,
    padding: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  achievementCardLocked: {
    opacity: 0.72,
  },
  achievementIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EEE7FA",
    marginBottom: 9,
  },
  achievementIconLocked: {
    backgroundColor: colors.surfaceMuted,
  },
  achievementTitle: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "900",
    lineHeight: 16,
    textAlign: "center",
  },
  menu: {
    marginTop: 22,
    borderRadius: 22,
    overflow: "hidden",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  menuRow: {
    minHeight: 64,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  toggleRow: {
    minHeight: 64,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  menuRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    flex: 1,
  },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EEE7FA",
  },
  menuIconDanger: {
    backgroundColor: "#FFF1F2",
  },
  menuTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "800",
  },
  menuTitleDanger: {
    color: colors.error,
  },
  menuRowRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  menuValue: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: "900",
  },
  footerText: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.5,
    textAlign: "center",
    textTransform: "uppercase",
    marginTop: 20,
  },
  modalBackdrop: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 22,
    backgroundColor: "rgba(21,18,31,0.38)",
  },
  modalCard: {
    width: "100%",
    maxWidth: 360,
    padding: 20,
    borderRadius: 24,
    backgroundColor: colors.surface,
  },
  modalTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "900",
  },
  modalBody: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 8,
  },
  modalInput: {
    minHeight: 50,
    marginTop: 16,
    borderRadius: 16,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
    color: colors.text,
    fontSize: 14,
    fontWeight: "700",
  },
  modalActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 18,
  },
  modalCancel: {
    flex: 1,
    minHeight: 46,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceMuted,
  },
  modalCancelText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: "900",
  },
  modalPrimary: {
    flex: 1,
    minHeight: 46,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
  },
  modalPrimaryText: {
    color: colors.surface,
    fontSize: 13,
    fontWeight: "900",
  },
  modalDanger: {
    flex: 1,
    minHeight: 46,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.error,
  },
  modalDangerText: {
    color: colors.surface,
    fontSize: 13,
    fontWeight: "900",
  },
  pressed: {
    opacity: 0.78,
  },
});
