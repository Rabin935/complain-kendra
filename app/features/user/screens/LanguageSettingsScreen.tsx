import { Text } from "@/src/theme/typography";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { NavigationProp, useNavigation } from "@react-navigation/native";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "../../../constants/colors";
import { useLanguage, useTranslation } from "../../../i18n/LanguageContext";
import {
  fetchCitizenProfile,
  updateCitizenLanguage,
} from "../services/citizen.service";
import type { CitizenProfile } from "../types/citizen.types";
import type { UserStackParamList } from "../types/user.types";

type LanguageNavigation = NavigationProp<UserStackParamList>;
type LanguageOption = CitizenProfile["language"];

export default function LanguageSettingsScreen() {
  const navigation = useNavigation<LanguageNavigation>();
  const { t } = useTranslation("languageSettings");
  const { language, setLanguage } = useLanguage();

  const languages: Array<{ value: LanguageOption; label: string; caption: string }> = [
    { value: "English", label: t("englishLabel"), caption: t("englishCaption") },
    { value: "Nepali", label: t("nepaliLabel"), caption: t("nepaliCaption") },
  ];

  const [currentLanguage, setCurrentLanguage] = useState<LanguageOption>(language);
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageOption>(language);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadLanguage = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await fetchCitizenProfile();

    if (result.source !== "api" || !result.data.id) {
      setError(result.error ?? t("loadError"));
      setLoading(false);
      return;
    }

    setCurrentLanguage(result.data.language);
    setSelectedLanguage(result.data.language);
    setLanguage(result.data.language);
    setLoading(false);
  }, [setLanguage, t]);

  useEffect(() => {
    void loadLanguage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSelectLanguage(languageOption: LanguageOption) {
    setSelectedLanguage(languageOption);
    setLanguage(languageOption);
  }

  function handleCancel() {
    setLanguage(currentLanguage);
    setSelectedLanguage(currentLanguage);
    navigation.goBack();
  }

  async function saveLanguage() {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const updated = await updateCitizenLanguage(selectedLanguage);
      setCurrentLanguage(updated.language);
      setSelectedLanguage(updated.language);
      setLanguage(updated.language);
      setSuccess(t("saveSuccess"));
      setTimeout(() => navigation.goBack(), 900);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t("saveError"));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView edges={["top"]} style={styles.safeArea}>
        <View style={styles.centerState}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.centerText}>{t("loadingLanguage")}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={handleCancel}>
          <MaterialCommunityIcons name="arrow-left" size={22} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>{t("headerTitle")}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {error ? (
          <View style={styles.errorBanner}>
            <MaterialCommunityIcons name="alert-circle-outline" size={18} color={colors.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {success ? (
          <View style={styles.successBanner}>
            <MaterialCommunityIcons name="check-circle-outline" size={18} color={colors.success} />
            <Text style={styles.successText}>{success}</Text>
          </View>
        ) : null}

        <View style={styles.currentCard}>
          <Text style={styles.sectionLabel}>{t("currentLanguageLabel")}</Text>
          <Text style={styles.currentValue}>
            {currentLanguage === "Nepali" ? t("nepaliLabel") : t("englishLabel")}
          </Text>
        </View>

        <Text style={styles.sectionLabel}>{t("availableLanguagesLabel")}</Text>
        <View style={styles.languageList}>
          {languages.map((languageOption) => {
            const selected = selectedLanguage === languageOption.value;
            return (
              <Pressable
                key={languageOption.value}
                style={[styles.languageCard, selected ? styles.languageCardSelected : null]}
                onPress={() => handleSelectLanguage(languageOption.value)}
              >
                <View style={[styles.radio, selected ? styles.radioSelected : null]}>
                  {selected ? <View style={styles.radioDot} /> : null}
                </View>
                <View style={styles.languageCopy}>
                  <Text style={styles.languageTitle}>{languageOption.label}</Text>
                  <Text style={styles.languageCaption}>{languageOption.caption}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.infoCard}>
          <MaterialCommunityIcons name="translate" size={20} color={colors.primary} />
          <Text style={styles.infoText}>{t("infoText")}</Text>
        </View>

        <Pressable
          disabled={saving}
          style={[styles.primaryButton, saving ? styles.disabledButton : null]}
          onPress={() => void saveLanguage()}
        >
          {saving ? <ActivityIndicator color={colors.surface} /> : <Text style={styles.primaryText}>{t("saveButton")}</Text>}
        </Pressable>
        <Pressable style={styles.secondaryButton} onPress={handleCancel}>
          <Text style={styles.secondaryText}>{t("cancelButton")}</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
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
  title: { flex: 1, color: colors.text, fontSize: 19, fontWeight: "900" },
  content: { paddingHorizontal: 18, paddingBottom: 34 },
  centerState: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },
  centerText: { color: colors.textMuted, fontSize: 13, fontWeight: "800" },
  sectionLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.2,
    marginBottom: 8,
    textTransform: "uppercase",
  },
  currentCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 16,
    marginBottom: 18,
  },
  currentValue: { color: colors.text, fontSize: 22, fontWeight: "900" },
  languageList: { gap: 10 },
  languageCard: {
    minHeight: 76,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
  },
  languageCardSelected: { borderColor: colors.primary, backgroundColor: "#F5F0FF" },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  radioSelected: { borderColor: colors.primary },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },
  languageCopy: { flex: 1 },
  languageTitle: { color: colors.text, fontSize: 16, fontWeight: "900" },
  languageCaption: { color: colors.textMuted, fontSize: 12, fontWeight: "700", lineHeight: 17, marginTop: 2 },
  infoCard: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
    padding: 14,
    borderRadius: 16,
    backgroundColor: "#EEE7FA",
  },
  infoText: { flex: 1, color: colors.primaryDark, fontSize: 12, fontWeight: "800", lineHeight: 18 },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#FECACA",
    backgroundColor: "#FEF2F2",
    marginBottom: 12,
  },
  errorText: { flex: 1, color: colors.error, fontSize: 12, fontWeight: "800" },
  successBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#BBF7D0",
    backgroundColor: "#DCFCE7",
    marginBottom: 12,
  },
  successText: { flex: 1, color: "#166534", fontSize: 12, fontWeight: "900" },
  primaryButton: {
    minHeight: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
    marginTop: 18,
  },
  primaryText: { color: colors.surface, fontSize: 15, fontWeight: "900" },
  secondaryButton: { minHeight: 48, alignItems: "center", justifyContent: "center" },
  secondaryText: { color: colors.primary, fontSize: 14, fontWeight: "900" },
  disabledButton: { opacity: 0.7 },
});
