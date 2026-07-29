import { Text } from "@/src/theme/typography";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { NavigationProp, useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "../../../constants/colors";
import { useTranslation } from "../../../i18n/LanguageContext";
import { useCitizenLabels } from "../../../i18n/useCitizenLabels";
import { useAuth } from "../../auth/context/AuthContext";
import {
  fetchCitizenBadges,
  fetchCitizenProfile,
  fetchCitizenStats,
  fetchSavedIssues,
} from "../services/citizen.service";
import type {
  CitizenBadge,
  CitizenProfile,
  CitizenStats,
} from "../types/citizen.types";
import type { UserStackParamList } from "../types/user.types";

type ProfileNavigation = NavigationProp<UserStackParamList>;
type IconName = React.ComponentProps<typeof MaterialCommunityIcons>["name"];

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
  t: (key: "civicHero" | "streak" | "topVoted" | "watchful") => string,
) {
  const fallbackAchievements: Array<{
    id: string;
    title: string;
    icon: IconName;
    color: string;
    tint: string;
    earned: boolean;
  }> = [
    {
      id: "civic-hero",
      title: t("civicHero"),
      icon: "trophy",
      color: "#F59E0B",
      tint: "#FEF3C7",
      earned: true,
    },
    {
      id: "streak",
      title: t("streak"),
      icon: "fire",
      color: "#EF4444",
      tint: "#FEE2E2",
      earned: true,
    },
    {
      id: "top-voted",
      title: t("topVoted"),
      icon: "star",
      color: "#6038B0",
      tint: "#EEE8FA",
      earned: true,
    },
    {
      id: "watchful",
      title: t("watchful"),
      icon: "eye",
      color: "#3B82F6",
      tint: "#EEE8FA",
      earned: false,
    },
  ];

  if (!badges.length) {
    return fallbackAchievements.map((achievement) => ({
      ...achievement,
      earned:
        achievement.id === "civic-hero"
          ? stats.reportsSubmitted > 0
          : achievement.id === "top-voted"
            ? stats.upvotesReceived > 0
            : achievement.earned,
    }));
  }

  return badges.slice(0, 4).map((badge, index) => ({
    id: badge.id,
    title: badge.title,
    icon: fallbackAchievements[index]?.icon ?? "medal",
    color: fallbackAchievements[index]?.color ?? colors.primary,
    tint: fallbackAchievements[index]?.tint ?? "#EEE8FA",
    earned: badge.earned,
  }));
}

export default function ProfileScreen() {
  const navigation = useNavigation<ProfileNavigation>();
  const { logout, loading: authLoading } = useAuth();
  const { t } = useTranslation("profile");
  const { t: tc } = useTranslation("common");
  const { t: tLang } = useTranslation("languageSettings");
  const { t: tCitizen } = useCitizenLabels();
  const [profile, setProfile] = useState<CitizenProfile | null>(null);
  const [stats, setStats] = useState<CitizenStats>(emptyStats);
  const [badges, setBadges] = useState<CitizenBadge[]>([]);
  const [savedIssueCount, setSavedIssueCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [logoutVisible, setLogoutVisible] = useState(false);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setError(null);

    const [profileResult, statsResult, badgesResult, savedIssuesResult] = await Promise.all([
      fetchCitizenProfile(),
      fetchCitizenStats(),
      fetchCitizenBadges(),
      fetchSavedIssues(),
    ]);

    if (profileResult.source !== "api" || !profileResult.data.id) {
      setProfile(null);
      setStats(emptyStats);
      setBadges([]);
      setSavedIssueCount(0);
      setError(profileResult.error ?? t("profileLoadError"));
      setLoading(false);
      return;
    }

    setProfile(profileResult.data);
    setStats(statsResult.data);
    setBadges(badgesResult.data);
    setSavedIssueCount(savedIssuesResult.data.length);
    setError(
      statsResult.error || badgesResult.error || savedIssuesResult.error
        ? t("partialLoadError")
        : null,
    );
    setLoading(false);
  }, [t]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  async function confirmLogout() {
    setLogoutVisible(false);
    await logout();
  }

  function showAchievements() {
    const titles = badges.length ? badges.map((badge) => badge.title).join("\n") : t("noBadgesYet");
    Alert.alert(t("achievements"), titles);
  }

  if (loading) {
    return (
      <SafeAreaView edges={["top"]} style={styles.safeArea}>
        <View style={styles.loadingState}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.loadingText}>{t("loadingProfile")}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView edges={["top"]} style={styles.safeArea}>
        <View style={styles.loadingState}>
          <MaterialCommunityIcons name="database-alert-outline" size={32} color={colors.error} />
          <Text style={styles.emptyTitle}>{t("profileUnavailable")}</Text>
          <Text style={styles.emptyText}>{error ?? t("profileLoadError")}</Text>
          <Pressable style={styles.retryButton} onPress={() => void loadProfile()}>
            <Text style={styles.retryText}>{tc("retry")}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const achievementCards = getAchievementCards(badges, stats, t);
  const languageLabel =
    profile.language === "Nepali" ? tLang("nepaliLabel") : tLang("englishLabel");

  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <LinearGradient
          colors={[colors.primaryMid, colors.primary, colors.primaryDark]}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={styles.header}
        >
          <View style={styles.gridVerticalA} />
          <View style={styles.gridVerticalB} />
          <View style={styles.gridHorizontalA} />
          <View style={styles.gridHorizontalB} />

          <Pressable style={styles.settingsButton} onPress={() => navigation.navigate("Settings")}>
            <MaterialCommunityIcons name="cog-outline" size={20} color="#FFFFFF" />
          </Pressable>

          <View style={styles.identityRow}>
            <Pressable style={styles.avatarShell} onPress={() => navigation.navigate("EditProfile")}>
              {profile.avatarUrl ? (
                <Image source={{ uri: profile.avatarUrl }} style={styles.avatarImage} />
              ) : (
                <Text style={styles.avatarText}>{profile.initials}</Text>
              )}
              <View style={styles.verifiedBadge}>
                <MaterialCommunityIcons name="check" size={16} color="#FFFFFF" />
              </View>
            </Pressable>

            <View style={styles.identityCopy}>
              <View style={styles.nameRow}>
                <Text style={styles.name} numberOfLines={1}>
                  {profile.name}
                </Text>
                {profile.isPublic ? (
                  <MaterialCommunityIcons
                    name="check-decagram"
                    size={18}
                    color={colors.accentLavender}
                  />
                ) : null}
              </View>
              <Text style={styles.emailText} numberOfLines={1}>
                {profile.email}
              </Text>
              <View style={styles.levelPill}>
                <MaterialCommunityIcons name="trophy" size={12} color={colors.accentLavender} />
                <Text style={styles.levelText}>
                  {profile.levelTitle} · {tCitizen("levelNumber", { level: profile.level })}
                </Text>
              </View>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.body}>
          <View style={styles.statsCard}>
            <ProfileStat icon="clipboard-list-outline" color={colors.primary} label={t("reports")} value={stats.reportsSubmitted} />
            <View style={styles.statDivider} />
            <ProfileStat icon="check-circle" color={colors.success} label={t("resolved")} value={stats.resolved} />
            <View style={styles.statDivider} />
            <ProfileStat icon="arrow-up-bold" color={colors.accent} label={t("upvotes")} value={stats.upvotesReceived} />
          </View>

          {error ? (
            <View style={styles.infoBanner}>
              <MaterialCommunityIcons name="cloud-alert-outline" size={17} color={colors.primary} />
              <Text style={styles.infoText}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t("achievements")}</Text>
            <Pressable style={styles.sectionActionRow} onPress={showAchievements} hitSlop={8}>
              <Text style={styles.sectionAction}>{tc("seeAll")}</Text>
              <MaterialCommunityIcons name="arrow-right" size={13} color={colors.primary} />
            </Pressable>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.achievementList}
          >
            {achievementCards.map((achievement) => (
              <View
                key={achievement.id}
                style={[
                  styles.achievementCard,
                  !achievement.earned ? styles.achievementCardLocked : null,
                ]}
              >
                <View style={[styles.achievementIcon, { backgroundColor: achievement.tint }]}>
                  <MaterialCommunityIcons
                    name={achievement.icon}
                    size={22}
                    color={achievement.color}
                  />
                </View>
                <Text style={styles.achievementTitle} numberOfLines={2}>
                  {achievement.title}
                </Text>
              </View>
            ))}
          </ScrollView>

          <View style={styles.menu}>
            <MenuRow icon="account-outline" tint="#6038B018" title={t("editProfile")} onPress={() => navigation.navigate("EditProfile")} />
            <MenuRow
              icon="clipboard-text-outline"
              tint="#3B82F618"
              title={t("myComplaints")}
              value={String(stats.reportsSubmitted)}
              onPress={() => navigation.navigate("MainTabs", { screen: "Mine" })}
            />
            <MenuRow
              icon="bookmark-outline"
              tint="#F59E0B18"
              title={t("savedIssues")}
              value={String(savedIssueCount)}
              onPress={() => navigation.navigate("SavedIssues")}
            />
            <MenuRow
              icon="trophy-outline"
              tint="#F59E0B18"
              title={t("civicLeaderboard")}
              onPress={() => navigation.navigate("Leaderboard")}
            />
            <MenuRow icon="lock-outline" tint="#4A445818" title={t("changePassword")} onPress={() => navigation.navigate("ChangePassword")} />
            <MenuRow icon="web" tint="#22C55E18" title={t("language")} value={languageLabel} onPress={() => navigation.navigate("LanguageSettings")} />
            <MenuRow
              icon="bell-outline"
              tint="#EF444418"
              title={t("notifications")}
              onPress={() => navigation.navigate("MainTabs", { screen: "Notifications" })}
            />
            <MenuRow icon="help-circle-outline" tint="#6038B018" title={t("helpSupport")} onPress={() => navigation.navigate("HelpSupport")} />
            <MenuRow
              icon="logout"
              tint="#EF444418"
              title={authLoading ? t("signingOut") : t("logOut")}
              danger
              last
              onPress={() => setLogoutVisible(true)}
            />
          </View>

          <Text style={styles.footerText}>{t("footer")}</Text>
        </View>
      </ScrollView>

      <ConfirmationModal
        visible={logoutVisible}
        title={t("logoutTitle")}
        body={t("logoutBody")}
        confirmLabel={t("logoutConfirm")}
        cancelLabel={tc("cancel")}
        onCancel={() => setLogoutVisible(false)}
        onConfirm={() => void confirmLogout()}
      />
    </SafeAreaView>
  );
}

function ProfileStat({
  icon,
  color,
  label,
  value,
}: {
  icon: IconName;
  color: string;
  label: string;
  value: number;
}) {
  return (
    <View style={styles.statItem}>
      <MaterialCommunityIcons name={icon} size={18} color={color} style={styles.statIcon} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function MenuRow({
  icon,
  tint,
  title,
  value,
  danger,
  last,
  onPress,
}: {
  icon: IconName;
  tint: string;
  title: string;
  value?: string;
  danger?: boolean;
  last?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.menuRow,
        last ? styles.menuRowLast : null,
        pressed ? styles.pressed : null,
      ]}
      onPress={onPress}
    >
      <View style={styles.menuRowLeft}>
        <View style={[styles.menuIcon, { backgroundColor: tint }]}>
          <MaterialCommunityIcons
            name={icon}
            size={18}
            color={danger ? colors.error : colors.primary}
          />
        </View>
        <Text style={[styles.menuTitle, danger ? styles.menuTitleDanger : null]}>{title}</Text>
      </View>

      {!danger ? (
        <View style={styles.menuRowRight}>
          {value ? <Text style={styles.menuValue}>{value}</Text> : null}
          <MaterialCommunityIcons name="chevron-right" size={18} color={colors.textMuted} />
        </View>
      ) : null}
    </Pressable>
  );
}

function ConfirmationModal({
  visible,
  title,
  body,
  confirmLabel,
  cancelLabel,
  onCancel,
  onConfirm,
}: {
  visible: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel: string;
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
              <Text style={styles.modalCancelText}>{cancelLabel}</Text>
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
    backgroundColor: "#F5F2FB",
  },
  content: {
    paddingBottom: 118,
  },
  loadingState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 24,
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
  retryText: {
    color: colors.surface,
    fontSize: 13,
    fontWeight: "900",
  },
  header: {
    minHeight: 230,
    paddingHorizontal: 22,
    paddingTop: 58,
    paddingBottom: 70,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    overflow: "hidden",
    backgroundColor: "#6038B0",
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
    top: 76,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  gridHorizontalB: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 152,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  settingsButton: {
    position: "absolute",
    top: 14,
    right: 22,
    zIndex: 3,
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.15)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
  },
  identityRow: {
    zIndex: 2,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  avatarShell: {
    width: 86,
    height: 86,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F4EEFD",
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.3)",
    shadowColor: "#2A1550",
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
    color: "#6038B0",
    fontSize: 32,
    fontWeight: "900",
  },
  verifiedBadge: {
    position: "absolute",
    right: -6,
    bottom: -6,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#22C55E",
    borderWidth: 3,
    borderColor: "#FFFFFF",
  },
  identityCopy: {
    flex: 1,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  name: {
    flexShrink: 1,
    color: "#FFFFFF",
    fontSize: 21,
    fontWeight: "900",
  },
  emailText: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 4,
  },
  levelPill: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 7,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.18)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
  },
  levelText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "900",
  },
  body: {
    paddingHorizontal: 20,
    marginTop: -44,
  },
  statsCard: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 92,
    paddingHorizontal: 4,
    paddingVertical: 16,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E8E4F0",
    shadowColor: "#2A1550",
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  statIcon: {
    marginBottom: 4,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  statValue: {
    color: "#15121F",
    fontSize: 20,
    fontWeight: "900",
  },
  statLabel: {
    color: "#8B8597",
    fontSize: 11,
    fontWeight: "800",
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: 44,
    backgroundColor: "#E8E4F0",
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
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 22,
    marginBottom: 10,
  },
  sectionTitle: {
    color: "#15121F",
    fontSize: 15,
    fontWeight: "900",
  },
  sectionActionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  sectionAction: {
    color: "#6038B0",
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
    paddingHorizontal: 6,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E8E4F0",
  },
  achievementCardLocked: {
    opacity: 0.5,
  },
  achievementIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 7,
  },
  achievementTitle: {
    color: "#15121F",
    fontSize: 11,
    fontWeight: "900",
    lineHeight: 15,
    textAlign: "center",
  },
  menu: {
    marginTop: 22,
    borderRadius: 22,
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E8E4F0",
  },
  menuRow: {
    minHeight: 64,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#E8E4F0",
  },
  menuRowLast: {
    borderBottomWidth: 0,
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
  },
  menuTitle: {
    color: "#15121F",
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
    color: "#8B8597",
    fontSize: 12,
    fontWeight: "900",
  },
  footerText: {
    color: "#8B8597",
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
  pressed: {
    opacity: 0.78,
  },
});
