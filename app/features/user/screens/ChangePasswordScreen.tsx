import { Text, TextInput } from "@/src/theme/typography";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { NavigationProp, useNavigation } from "@react-navigation/native";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "../../../constants/colors";
import { useTranslation } from "../../../i18n/LanguageContext";
import { changeCitizenPassword } from "../services/citizen.service";
import type { UserStackParamList } from "../types/user.types";

type ChangePasswordNavigation = NavigationProp<UserStackParamList>;

type VisibilityKey = "current" | "next" | "confirm";

const ruleKeys = ["policyMinLength", "policyUppercase", "policyLowercase", "policyNumber", "policySymbol"] as const;
const ruleTests = [
  (value: string) => value.length >= 8,
  (value: string) => /[A-Z]/.test(value),
  (value: string) => /[a-z]/.test(value),
  (value: string) => /\d/.test(value),
  (value: string) => /[^A-Za-z0-9]/.test(value),
];

export default function ChangePasswordScreen() {
  const navigation = useNavigation<ChangePasswordNavigation>();
  const { t } = useTranslation("changePassword");
  const { t: tc } = useTranslation("common");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [visible, setVisible] = useState<Record<VisibilityKey, boolean>>({
    current: false,
    next: false,
    confirm: false,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const passedRules = useMemo(
    () => ruleTests.filter((test) => test(newPassword)).length,
    [newPassword],
  );
  const strengthLabel =
    passedRules <= 2 ? t("strengthWeak") : passedRules <= 4 ? t("strengthGood") : t("strengthStrong");
  const strengthColor = passedRules <= 2 ? colors.error : passedRules <= 4 ? colors.warning : colors.success;

  function toggleVisibility(key: VisibilityKey) {
    setVisible((current) => ({ ...current, [key]: !current[key] }));
  }

  function validate(): string | null {
    if (!currentPassword) {
      return t("currentRequired");
    }

    if (!newPassword) {
      return t("newRequired");
    }

    if (currentPassword === newPassword) {
      return t("sameAsCurrent");
    }

    if (passedRules !== ruleTests.length) {
      return t("policyNotMet");
    }

    if (newPassword !== confirmPassword) {
      return t("mismatchConfirm");
    }

    return null;
  }

  async function updatePassword() {
    const validationError = validate();

    if (validationError) {
      setError(validationError);
      setSuccess(null);
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const message = await changeCitizenPassword({
        currentPassword,
        newPassword,
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setSuccess(message);
      setTimeout(() => navigation.goBack(), 1100);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t("updateError"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="arrow-left" size={22} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>{t("title")}</Text>
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

        <View style={styles.card}>
          <PasswordField
            label={t("currentPassword")}
            value={currentPassword}
            visible={visible.current}
            onChangeText={setCurrentPassword}
            onToggle={() => toggleVisibility("current")}
          />
          <PasswordField
            label={t("newPassword")}
            value={newPassword}
            visible={visible.next}
            onChangeText={setNewPassword}
            onToggle={() => toggleVisibility("next")}
          />
          <View style={styles.strengthBlock}>
            <View style={styles.strengthHeader}>
              <Text style={styles.strengthLabel}>{t("strengthLabel")}</Text>
              <Text style={[styles.strengthValue, { color: strengthColor }]}>{strengthLabel}</Text>
            </View>
            <View style={styles.strengthTrack}>
              <View style={[styles.strengthFill, { width: `${(passedRules / ruleTests.length) * 100}%`, backgroundColor: strengthColor }]} />
            </View>
          </View>
          <PasswordField
            label={t("confirmPassword")}
            value={confirmPassword}
            visible={visible.confirm}
            onChangeText={setConfirmPassword}
            onToggle={() => toggleVisibility("confirm")}
          />
        </View>

        <View style={styles.policyCard}>
          <Text style={styles.policyTitle}>{t("policyTitle")}</Text>
          {ruleKeys.map((key, index) => {
            const passed = ruleTests[index](newPassword);
            return (
              <View key={key} style={styles.policyRow}>
                <MaterialCommunityIcons
                  name={passed ? "check-circle" : "circle-outline"}
                  size={18}
                  color={passed ? colors.success : colors.textMuted}
                />
                <Text style={[styles.policyText, passed ? styles.policyTextPassed : null]}>{t(key)}</Text>
              </View>
            );
          })}
        </View>

        <Pressable
          disabled={saving}
          style={[styles.primaryButton, saving ? styles.disabledButton : null]}
          onPress={() => void updatePassword()}
        >
          {saving ? <ActivityIndicator color={colors.surface} /> : <Text style={styles.primaryText}>{t("updatePassword")}</Text>}
        </Pressable>
        <Pressable style={styles.secondaryButton} onPress={() => navigation.goBack()}>
          <Text style={styles.secondaryText}>{tc("cancel")}</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function PasswordField({
  label,
  value,
  visible,
  onChangeText,
  onToggle,
}: {
  label: string;
  value: string;
  visible: boolean;
  onChangeText: (value: string) => void;
  onToggle: () => void;
}) {
  return (
    <View style={styles.fieldBlock}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.passwordInput}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={!visible}
          placeholder={label}
          placeholderTextColor={colors.textMuted}
          textContentType="password"
          style={styles.input}
        />
        <Pressable style={styles.eyeButton} onPress={onToggle}>
          <MaterialCommunityIcons
            name={visible ? "eye-off-outline" : "eye-outline"}
            size={21}
            color={colors.textMuted}
          />
        </Pressable>
      </View>
    </View>
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
  card: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 16,
    gap: 14,
  },
  fieldBlock: { gap: 7 },
  label: { color: colors.text, fontSize: 13, fontWeight: "900" },
  passwordInput: {
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
    flexDirection: "row",
    alignItems: "center",
  },
  input: {
    flex: 1,
    color: colors.text,
    paddingHorizontal: 14,
    fontSize: 14,
    fontWeight: "700",
  },
  eyeButton: { width: 48, height: 48, alignItems: "center", justifyContent: "center" },
  strengthBlock: { gap: 8 },
  strengthHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  strengthLabel: { color: colors.textMuted, fontSize: 12, fontWeight: "800" },
  strengthValue: { fontSize: 12, fontWeight: "900" },
  strengthTrack: { height: 8, borderRadius: 999, backgroundColor: colors.border, overflow: "hidden" },
  strengthFill: { height: "100%", borderRadius: 999 },
  policyCard: {
    marginTop: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 16,
    gap: 10,
  },
  policyTitle: { color: colors.text, fontSize: 14, fontWeight: "900", marginBottom: 2 },
  policyRow: { flexDirection: "row", alignItems: "center", gap: 9 },
  policyText: { color: colors.textMuted, fontSize: 13, fontWeight: "700" },
  policyTextPassed: { color: colors.textSecondary },
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
