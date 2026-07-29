import { Text } from "@/src/theme/typography";
import {
  MaterialCommunityIcons } from "@expo/vector-icons";
import { NavigationProp,
  useNavigation } from "@react-navigation/native";
import { useCallback,
  useEffect,
  useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "../../../constants/colors";
import { useTranslation } from "../../../i18n/LanguageContext";
import { useCitizenLabels } from "../../../i18n/useCitizenLabels";
import {
  fetchCitizenProfile,
  fetchNotificationPreferences,
  updateNotificationPreferences,
  updatePublicProfile,
} from "../services/citizen.service";
import type { CitizenProfile, NotificationPreferences } from "../types/citizen.types";
import type { UserStackParamList } from "../types/user.types";

type SettingsNavigation = NavigationProp<UserStackParamList>;

const defaultPreferences: NotificationPreferences = {
  inApp: true,
  email: true,
  push: false,
  sms: false,
  complaintUpdates: true,
  comments: true,
  followers: true,
  officerUpdates: true,
  leaderboard: true,
  badges: true,
};

export default function SettingsScreen() {
  const navigation = useNavigation<SettingsNavigation>();
  const { t } = useTranslation("settings");
  const { t: tc } = useTranslation("common");
  const { t: tCitizen } = useCitizenLabels();
  const [profile, setProfile] = useState<CitizenProfile | null>(null);
  const [preferences, setPreferences] = useState<NotificationPreferences>(defaultPreferences);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadSettings = useCallback(async () => {
    setError(null);
    const [profileResult, preferencesResult] = await Promise.all([
      fetchCitizenProfile(),
      fetchNotificationPreferences(),
    ]);

    setProfile(profileResult.source === "api" && profileResult.data.id ? profileResult.data : null);
    setPreferences(preferencesResult.data);
    setError(profileResult.error || preferencesResult.error || null);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  function showToast(message: string) {
    setToast(message);
    setTimeout(() => setToast(null), 2400);
  }

  function refresh() {
    setRefreshing(true);
    void loadSettings();
  }

  async function updatePreference(key: keyof NotificationPreferences, value: boolean) {
    setSavingKey(key);
    setPreferences((current) => ({ ...current, [key]: value }));
    const result = await updateNotificationPreferences({ [key]: value });
    setPreferences(result.data);
    setSavingKey(null);
    showToast(result.error ? t("preferenceSavedLocally") : t("settingUpdated"));
  }

  async function updatePublic(nextValue: boolean) {
    if (!profile) {
      return;
    }

    setSavingKey("public");
    setProfile((current) => (current ? { ...current, isPublic: nextValue } : current));
    const result = await updatePublicProfile(nextValue);
    setSavingKey(null);
    showToast(result.error ? t("publicProfileSavedLocally") : t("privacyUpdated"));
  }

  function openComingSoon(title: string) {
    Alert.alert(title, t("comingSoon"));
  }

  if (loading) {
    return (
      <SafeAreaView edges={["top"]} style={styles.safeArea}>
        <View style={styles.centerState}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.centerText}>{t("loadingSettings")}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("goBack")}
          style={({ pressed }) => [styles.backButton, pressed ? styles.pressed : null]}
          onPress={() => navigation.goBack()}
        >
          <MaterialCommunityIcons name="arrow-left" size={22} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>{t("title")}</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} tintColor={colors.primary} onRefresh={refresh} />}
        showsVerticalScrollIndicator={false}
      >
        {error ? (
          <View style={styles.banner}>
            <MaterialCommunityIcons name="cloud-alert-outline" size={18} color={colors.primary} />
            <Text style={styles.bannerText}>{error}</Text>
          </View>
        ) : null}

        {toast ? (
          <View style={styles.toast}>
            <MaterialCommunityIcons name="check-circle-outline" size={18} color={colors.success} />
            <Text style={styles.toastText}>{toast}</Text>
          </View>
        ) : null}

        <SettingsSection title={t("sectionNotifications")}>
          <SettingsToggleRow
            icon="bell-outline"
            iconColor={colors.primary}
            title={t("pushNotifications")}
            subtitle={t("pushSubtitle")}
            value={preferences.push}
            loading={savingKey === "push"}
            onValueChange={(value) => void updatePreference("push", value)}
          />
          <SettingsToggleRow
            icon="email-outline"
            iconColor={colors.info}
            title={t("emailAlerts")}
            subtitle={profile?.email || t("emailUpdates")}
            value={preferences.email}
            loading={savingKey === "email"}
            onValueChange={(value) => void updatePreference("email", value)}
          />
          <SettingsToggleRow
            icon="cellphone"
            iconColor={colors.warning}
            title={t("smsUpdates")}
            subtitle={profile?.phone || t("smsCriticalOnly")}
            value={preferences.sms}
            loading={savingKey === "sms"}
            onValueChange={(value) => void updatePreference("sms", value)}
          />
          <SettingsToggleRow
            icon="newspaper-variant-outline"
            iconColor={colors.success}
            title={t("weeklyDigest")}
            subtitle={t("weeklyDigestSubtitle")}
            value={preferences.complaintUpdates}
            loading={savingKey === "complaintUpdates"}
            onValueChange={(value) => void updatePreference("complaintUpdates", value)}
            last
          />
        </SettingsSection>

        <SettingsSection title={t("sectionPrivacy")}>
          <SettingsActionRow
            icon="lock-reset"
            iconColor={colors.primary}
            title={t("changePassword")}
            subtitle={t("changePasswordSubtitle")}
            onPress={() => navigation.navigate("ChangePassword")}
          />
          <SettingsActionRow
            icon="shield-lock-outline"
            iconColor={colors.info}
            title={t("twoFactorAuth")}
            onPress={() => openComingSoon(t("twoFactorAuth"))}
          />
          <SettingsToggleRow
            icon="eye-outline"
            iconColor={colors.success}
            title={t("showMePublic")}
            subtitle={t("showMePublicSubtitle")}
            value={Boolean(profile?.isPublic)}
            loading={savingKey === "public"}
            onValueChange={(value) => void updatePublic(value)}
          />
          <SettingsActionRow
            icon="download-outline"
            iconColor={colors.warning}
            title={t("downloadData")}
            onPress={() => openComingSoon(t("downloadData"))}
            last
          />
        </SettingsSection>

        <SettingsSection title={t("sectionPreferences")}>
          <SettingsActionRow
            icon="web"
            iconColor={colors.primary}
            title={t("language")}
            subtitle={profile?.language ?? "English"}
            onPress={() => navigation.navigate("LanguageSettings")}
          />
          <SettingsActionRow
            icon="palette-outline"
            iconColor={colors.error}
            title={t("theme")}
            subtitle={t("themeSystem")}
            onPress={() => openComingSoon(t("theme"))}
          />
          <SettingsActionRow
            icon="map-marker-radius-outline"
            iconColor={colors.info}
            title={t("defaultWard")}
            subtitle={formatWard(profile, tCitizen)}
            onPress={() => openComingSoon(t("defaultWard"))}
            last
          />
        </SettingsSection>

        <SettingsSection title={t("sectionSupport")}>
          <SettingsActionRow
            icon="help-circle-outline"
            iconColor={colors.primary}
            title={t("helpCenter")}
            onPress={() => navigation.navigate("HelpSupport")}
          />
          <SettingsActionRow
            icon="message-text-outline"
            iconColor={colors.error}
            title={t("sendFeedback")}
            onPress={() => navigation.navigate("HelpSupport")}
          />
          <SettingsActionRow
            icon="file-document-outline"
            iconColor={colors.textSecondary}
            title={t("termsPrivacy")}
            onPress={() => openComingSoon(t("termsPrivacy"))}
            last
          />
        </SettingsSection>
      </ScrollView>
    </SafeAreaView>
  );
}

function formatWard(
  profile: CitizenProfile | null,
  tCitizen: (key: string, vars?: Record<string, string | number>) => string,
): string {
  if (!profile) {
    return tCitizen("wardNotSet");
  }

  return (
    profile.location.ward ||
    (profile.location.wardNumber ? tCitizen("wardNumber", { number: profile.location.wardNumber }) : "") ||
    profile.location.area ||
    tCitizen("wardNotSet")
  );
}

function SettingsSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionCard}>{children}</View>
    </View>
  );
}

function SettingsToggleRow({
  icon,
  iconColor,
  title,
  subtitle,
  value,
  loading,
  last,
  onValueChange,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  iconColor: string;
  title: string;
  subtitle?: string;
  value: boolean;
  loading?: boolean;
  last?: boolean;
  onValueChange: (value: boolean) => void;
}) {
  return (
    <View style={[styles.row, last ? styles.lastRow : null]}>
      <View style={[styles.iconBox, { backgroundColor: `${iconColor}18` }]}>
        <MaterialCommunityIcons name={icon} size={20} color={iconColor} />
      </View>
      <View style={styles.rowCopy}>
        <Text style={styles.rowTitle}>{title}</Text>
        {subtitle ? <Text style={styles.rowSubtitle}>{subtitle}</Text> : null}
      </View>
      {loading ? (
        <ActivityIndicator color={colors.primary} />
      ) : (
        <Switch
          value={value}
          onValueChange={onValueChange}
          trackColor={{ false: colors.border, true: "#C8B6F0" }}
          thumbColor={value ? colors.primary : colors.surface}
        />
      )}
    </View>
  );
}

function SettingsActionRow({
  icon,
  iconColor,
  title,
  subtitle,
  last,
  onPress,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  iconColor: string;
  title: string;
  subtitle?: string;
  last?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable style={({ pressed }) => [styles.row, last ? styles.lastRow : null, pressed ? styles.pressed : null]} onPress={onPress}>
      <View style={[styles.iconBox, { backgroundColor: `${iconColor}18` }]}>
        <MaterialCommunityIcons name={icon} size={20} color={iconColor} />
      </View>
      <View style={styles.rowCopy}>
        <Text style={styles.rowTitle}>{title}</Text>
        {subtitle ? <Text style={styles.rowSubtitle}>{subtitle}</Text> : null}
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
  header: {
    minHeight: 66,
    paddingHorizontal: 22,
    paddingTop: 8,
    paddingBottom: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceMuted,
  },
  title: {
    flex: 1,
    color: colors.text,
    fontSize: 19,
    fontWeight: "900",
  },
  content: {
    paddingHorizontal: 18,
    paddingBottom: 28,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.2,
    marginBottom: 8,
    paddingLeft: 4,
    textTransform: "uppercase",
  },
  sectionCard: {
    overflow: "hidden",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  row: {
    minHeight: 66,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  lastRow: {
    borderBottomWidth: 0,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  rowCopy: {
    flex: 1,
    minWidth: 0,
  },
  rowTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "900",
  },
  rowSubtitle: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "700",
    marginTop: 2,
  },
  banner: {
    marginBottom: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#DED2F2",
    backgroundColor: "#EEE7FA",
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  bannerText: {
    flex: 1,
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: "800",
  },
  toast: {
    marginBottom: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#BBF7D0",
    backgroundColor: "#DCFCE7",
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  toastText: {
    flex: 1,
    color: "#166534",
    fontSize: 12,
    fontWeight: "900",
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
    fontWeight: "800",
  },
  pressed: {
    opacity: 0.75,
  },
});
