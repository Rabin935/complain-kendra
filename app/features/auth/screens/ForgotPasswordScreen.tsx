import { Text, TextInput } from "@/src/theme/typography";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { LinearGradient } from "expo-linear-gradient";
import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { colors } from "../../../constants/colors";
import { radii, shadows } from "../../../constants/theme";
import { useTranslation } from "../../../i18n/LanguageContext";
import { useAuth } from "../context/AuthContext";
import type { AuthStackParamList } from "../types/auth.types";

type ForgotPasswordScreenProps = NativeStackScreenProps<AuthStackParamList, "ForgotPassword">;

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ForgotPasswordScreen({ navigation }: ForgotPasswordScreenProps) {
  const { forgotPassword, loading } = useAuth();
  const { t } = useTranslation("auth");
  const [email, setEmail] = useState("");
  const [focused, setFocused] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  async function handleSubmit(): Promise<void> {
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      setInfoMessage(null);
      setErrorMessage(t("emailRequired"));
      return;
    }

    if (!emailPattern.test(normalizedEmail)) {
      setInfoMessage(null);
      setErrorMessage(t("emailInvalid"));
      return;
    }

    setErrorMessage(null);

    try {
      await forgotPassword({ email: normalizedEmail });
      setInfoMessage(t("resetSent"));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t("resetSendError");
      setInfoMessage(null);
      setErrorMessage(message);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Pressable
            accessibilityLabel="Go back"
            style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
            onPress={() => navigation.replace("Login")}
          >
            <MaterialCommunityIcons name="arrow-left" size={20} color={colors.text} />
          </Pressable>
          <Text style={styles.headerTitle}>{t("resetPassword")}</Text>
        </View>

        <View style={styles.content}>
          <View style={styles.hero}>
            <View style={styles.heroRing}>
              <LinearGradient
                colors={["#EEE8FA", "#F6F2FC"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.heroIcon}
              >
                <MaterialCommunityIcons name="lock-reset" size={44} color={colors.primary} />
              </LinearGradient>
            </View>
            <Text style={styles.title}>{t("forgotPasswordTitle")}</Text>
            <Text style={styles.subtitle}>{t("forgotPasswordBody")}</Text>
          </View>

          {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
          {infoMessage ? <Text style={styles.successText}>{infoMessage}</Text> : null}

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>{t("emailAddress")}</Text>
            <View style={[styles.inputShell, focused && styles.inputShellFocused]}>
              <MaterialCommunityIcons
                name="email-outline"
                size={18}
                color={focused ? colors.primary : colors.textMuted}
              />
              <TextInput
                value={email}
                onChangeText={(value) => {
                  setEmail(value);
                  setErrorMessage(null);
                  setInfoMessage(null);
                }}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                placeholder={t("emailAltPlaceholder")}
                placeholderTextColor={colors.textMuted}
                style={styles.input}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                textContentType="emailAddress"
              />
            </View>
          </View>

          <Pressable
            onPress={() => void handleSubmit()}
            disabled={loading}
            style={({ pressed }) => [
              styles.primaryButtonShell,
              pressed && !loading && styles.pressed,
              loading && styles.buttonDisabled,
            ]}
          >
            <LinearGradient
              colors={["#7B4FC8", "#6038B0"]}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={styles.primaryButton}
            >
              {loading ? (
                <ActivityIndicator color={colors.surface} />
              ) : (
                <>
                  <Text style={styles.primaryButtonText}>{t("sendResetLink")}</Text>
                  <MaterialCommunityIcons name="send" size={18} color="#FFFFFF" />
                </>
              )}
            </LinearGradient>
          </Pressable>

          <View style={styles.inboxCard}>
            <MaterialCommunityIcons name="email-check-outline" size={22} color={colors.primary} />
            <View style={styles.inboxCopy}>
              <Text style={styles.inboxTitle}>{t("checkInbox")}</Text>
              <Text style={styles.inboxText}>{t("resetLinkExpiry")}</Text>
            </View>
          </View>

          <Pressable
            onPress={() => navigation.navigate("ResetPassword")}
            style={({ pressed }) => [styles.tokenLink, pressed && styles.pressed]}
          >
            <Text style={styles.tokenText}>{t("haveResetToken")}</Text>
          </Pressable>

          <View style={styles.footer}>
            <Text style={styles.footerText}>{t("rememberPassword")}</Text>
            <Pressable onPress={() => navigation.replace("Login")}>
              <Text style={styles.footerLink}>{t("signIn")}</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  scrollContent: {
    flexGrow: 1,
    width: "100%",
    maxWidth: 430,
    alignSelf: "center",
    paddingBottom: 32,
  },
  header: {
    minHeight: 66,
    paddingHorizontal: 20,
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
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8F6FC",
    borderWidth: 1,
    borderColor: "#E8E4F0",
  },
  headerTitle: {
    flex: 1,
    color: "#15121F",
    fontSize: 19,
    fontWeight: "800",
  },
  content: {
    paddingHorizontal: 24,
  },
  hero: {
    alignItems: "center",
    paddingTop: 20,
    paddingBottom: 32,
  },
  heroRing: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: "#EEE8FA",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  heroIcon: {
    width: 96,
    height: 96,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: "#EEE8FA",
    alignItems: "center",
    justifyContent: "center",
  },
  heroEmoji: {
    fontSize: 36,
  },
  title: {
    color: "#15121F",
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: -0.6,
    marginBottom: 8,
  },
  subtitle: {
    maxWidth: 300,
    color: "#8B8597",
    fontSize: 14,
    lineHeight: 22,
    textAlign: "center",
  },
  errorText: {
    color: colors.error,
    backgroundColor: "#FEF2F2",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 11,
    marginBottom: 12,
    fontSize: 12,
    fontWeight: "700",
  },
  successText: {
    color: "#166534",
    backgroundColor: "#F0FDF4",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 11,
    marginBottom: 12,
    fontSize: 12,
    fontWeight: "700",
  },
  fieldGroup: {
    marginBottom: 12,
  },
  label: {
    color: "#4A4458",
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 6,
  },
  inputShell: {
    minHeight: 50,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#E8E4F0",
    backgroundColor: "#F8F6FC",
  },
  inputShellFocused: {
    borderColor: "#6038B0",
    backgroundColor: "#FFFFFF",
    ...shadows.focusRing,
  },
  input: {
    flex: 1,
    color: "#15121F",
    fontSize: 14,
    paddingVertical: Platform.OS === "ios" ? 13 : 9,
  },
  primaryButtonShell: {
    marginTop: 10,
    borderRadius: radii.button,
    overflow: "hidden",
    ...shadows.button,
  },
  primaryButton: {
    minHeight: 52,
    borderRadius: radii.button,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  inboxCard: {
    marginTop: 20,
    padding: 14,
    minHeight: 86,
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#EEE8FA",
    backgroundColor: "#F6F2FC",
  },
  inboxCopy: {
    flex: 1,
  },
  inboxTitle: {
    color: "#2A1550",
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 3,
  },
  inboxText: {
    color: "#4A4458",
    fontSize: 12,
    lineHeight: 19,
  },
  tokenLink: {
    alignSelf: "center",
    marginTop: 18,
  },
  tokenText: {
    color: "#6038B0",
    fontSize: 12,
    fontWeight: "700",
  },
  footer: {
    marginTop: 22,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  footerText: {
    color: "#4A4458",
    fontSize: 13,
  },
  footerLink: {
    color: "#6038B0",
    fontSize: 13,
    fontWeight: "700",
  },
  pressed: {
    opacity: 0.75,
  },
  buttonDisabled: {
    opacity: 0.68,
  },
});
