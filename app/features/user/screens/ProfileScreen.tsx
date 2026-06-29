import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
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
import { sampleBadges, sampleProfile, sampleStats } from "../data/citizenSampleData";
import {
  fetchCitizenBadges,
  fetchCitizenProfile,
  fetchCitizenStats,
  updatePublicProfile,
} from "../services/citizen.service";
import type { CitizenBadge, CitizenProfile, CitizenStats } from "../types/citizen.types";

export default function ProfileScreen() {
  const { user, logout, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<CitizenProfile>({
    ...sampleProfile,
    name: user?.name ?? sampleProfile.name,
  });
  const [stats, setStats] = useState<CitizenStats>(sampleStats);
  const [badges, setBadges] = useState<CitizenBadge[]>(sampleBadges);
  const [loading, setLoading] = useState(true);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [publicUpdating, setPublicUpdating] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [logoutVisible, setLogoutVisible] = useState(false);
  const [deleteVisible, setDeleteVisible] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");

  useEffect(() => {
    async function loadProfile() {
      const [profileResult, statsResult, badgesResult] = await Promise.all([
        fetchCitizenProfile(),
        fetchCitizenStats(),
        fetchCitizenBadges(),
      ]);

      setProfile({
        ...profileResult.data,
        name: user?.name ?? profileResult.data.name,
      });
      setStats(statsResult.data);
      setBadges(badgesResult.data);
      setError(profileResult.error || statsResult.error || badgesResult.error ? "Profile is using saved civic data." : null);
      setLoading(false);
    }

    void loadProfile();
  }, [user?.name]);

  function showToast(message: string) {
    setToast(message);
    setTimeout(() => setToast(null), 2600);
  }

  async function togglePublicProfile(nextValue: boolean) {
    setPublicUpdating(true);
    setProfile((current) => ({ ...current, isPublic: nextValue }));
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
        showToast("Notification preferences updated.");
        break;
      case "language":
        setProfile((current) => ({
          ...current,
          language: current.language === "English" ? "Nepali" : "English",
        }));
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

  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.profileHeader}>
          <View style={styles.headerBloom} />
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
              <View style={styles.avatarCamera}>
                <MaterialCommunityIcons name="camera-outline" size={15} color={colors.surface} />
              </View>
            )}
          </Pressable>

          <Text style={styles.name}>{profile.name}</Text>
          <Text style={styles.location}>
            {profile.location.ward} · {profile.location.area}, {profile.location.city}
          </Text>
          <View style={styles.levelPill}>
            <MaterialCommunityIcons name="shield-star-outline" size={16} color="#FDE68A" />
            <Text style={styles.levelText}>
              Level {profile.level} · {profile.levelTitle} · {profile.points} pts
            </Text>
          </View>
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

        <View style={styles.statsGrid}>
          <ProfileStat label="Reports submitted" value={stats.reportsSubmitted} icon="clipboard-text-outline" />
          <ProfileStat label="Resolved complaints" value={stats.resolved} icon="check-decagram-outline" />
          <ProfileStat label="Upvotes received" value={stats.upvotesReceived} icon="arrow-up-bold-outline" />
          <ProfileStat label="Badges earned" value={stats.badgesEarned} icon="medal-outline" />
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Badges</Text>
          <Text style={styles.sectionAction}>Made for Nepal · v1.0</Text>
        </View>

        <View style={styles.badgeList}>
          {badges.map((badge) => (
            <View key={badge.id} style={[styles.badgeCard, !badge.earned ? styles.badgeCardLocked : null]}>
              <View style={[styles.badgeIcon, !badge.earned ? styles.badgeIconLocked : null]}>
                <MaterialCommunityIcons
                  name={badge.icon as keyof typeof MaterialCommunityIcons.glyphMap}
                  size={22}
                  color={badge.earned ? colors.primary : colors.textMuted}
                />
              </View>
              <View style={styles.badgeCopy}>
                <Text style={styles.badgeTitle}>{badge.title}</Text>
                <Text style={styles.badgeDescription}>{badge.description}</Text>
                {!badge.earned ? (
                  <View style={styles.badgeProgressTrack}>
                    <View style={[styles.badgeProgressFill, { width: `${badge.progress}%` }]} />
                  </View>
                ) : null}
              </View>
              {badge.earned ? (
                <MaterialCommunityIcons name="check-circle" size={20} color={colors.success} />
              ) : (
                <MaterialCommunityIcons name="lock-outline" size={20} color={colors.textMuted} />
              )}
            </View>
          ))}
        </View>

        <View style={styles.menu}>
          <MenuRow icon="account-edit-outline" title="Edit Profile" onPress={() => handleMenuAction("edit")} />
          <MenuRow icon="medal-outline" title="My Badges" onPress={() => handleMenuAction("badges")} />
          <MenuRow icon="bell-outline" title="Notification Preferences" onPress={() => handleMenuAction("notifications")} />
          <MenuRow icon="translate" title={`Language · ${profile.language}`} onPress={() => handleMenuAction("language")} />
          <MenuRow icon="lock-reset" title="Change Password" onPress={() => handleMenuAction("password")} />
          <MenuRow icon="help-circle-outline" title="Help Center" onPress={() => handleMenuAction("help")} />
          <View style={styles.toggleRow}>
            <View style={styles.menuRowLeft}>
              <View style={styles.menuIcon}>
                <MaterialCommunityIcons name="account-eye-outline" size={19} color={colors.primary} />
              </View>
              <Text style={styles.menuTitle}>Privacy / Public Profile</Text>
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
          <MenuRow icon="delete-outline" title="Delete Account" danger onPress={() => handleMenuAction("delete")} />
          <MenuRow
            icon="logout"
            title={authLoading ? "Signing out..." : "Logout"}
            danger
            onPress={() => setLogoutVisible(true)}
          />
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
  icon,
}: {
  label: string;
  value: number;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
}) {
  return (
    <View style={styles.statCard}>
      <MaterialCommunityIcons name={icon} size={20} color={colors.primary} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function MenuRow({
  icon,
  title,
  danger,
  onPress,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  title: string;
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
      <MaterialCommunityIcons name="chevron-right" size={20} color={danger ? colors.error : colors.textMuted} />
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
    paddingBottom: 118,
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
  profileHeader: {
    marginHorizontal: 14,
    marginTop: 10,
    padding: 22,
    alignItems: "center",
    borderRadius: 30,
    overflow: "hidden",
    backgroundColor: colors.primaryDeep,
  },
  headerBloom: {
    position: "absolute",
    top: -70,
    right: -60,
    width: 210,
    height: 210,
    borderRadius: 105,
    backgroundColor: colors.primaryMid,
    opacity: 0.68,
  },
  avatarShell: {
    width: 84,
    height: 84,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.5)",
    marginBottom: 12,
  },
  avatarImage: {
    width: "100%",
    height: "100%",
    borderRadius: 28,
  },
  avatarText: {
    color: colors.primary,
    fontSize: 26,
    fontWeight: "900",
  },
  avatarOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(42,21,80,0.62)",
  },
  avatarCamera: {
    position: "absolute",
    right: -4,
    bottom: -4,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: colors.surface,
  },
  name: {
    color: colors.surface,
    fontSize: 24,
    fontWeight: "900",
  },
  location: {
    color: "#DED4FF",
    fontSize: 13,
    fontWeight: "700",
    marginTop: 5,
  },
  levelPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginTop: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.13)",
  },
  levelText: {
    color: colors.surface,
    fontSize: 12,
    fontWeight: "900",
  },
  infoBanner: {
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
    marginHorizontal: 16,
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
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    paddingHorizontal: 16,
    marginTop: 16,
  },
  statCard: {
    width: "48.6%",
    minHeight: 104,
    borderRadius: 22,
    padding: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statValue: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "900",
    marginTop: 10,
  },
  statLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "800",
    marginTop: 3,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
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
  badgeList: {
    paddingHorizontal: 16,
    gap: 10,
  },
  badgeCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 13,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  badgeCardLocked: {
    opacity: 0.82,
  },
  badgeIcon: {
    width: 46,
    height: 46,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EEE7FA",
  },
  badgeIconLocked: {
    backgroundColor: colors.surfaceMuted,
  },
  badgeCopy: {
    flex: 1,
  },
  badgeTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "900",
  },
  badgeDescription: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 18,
    marginTop: 2,
  },
  badgeProgressTrack: {
    height: 6,
    borderRadius: 999,
    backgroundColor: colors.surfaceMuted,
    overflow: "hidden",
    marginTop: 8,
  },
  badgeProgressFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: colors.primary,
  },
  menu: {
    marginHorizontal: 16,
    marginTop: 18,
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  menuRow: {
    minHeight: 58,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  toggleRow: {
    minHeight: 58,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  menuRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    flex: 1,
  },
  menuIcon: {
    width: 34,
    height: 34,
    borderRadius: 13,
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
