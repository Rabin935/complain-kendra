import { Text, TextInput } from "@/src/theme/typography";
import {
  MaterialCommunityIcons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { LinearGradient } from "expo-linear-gradient";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { radii, shadows } from "@/app/constants/theme";
import { useTranslation } from "../../../i18n/LanguageContext";
import GoogleWebSignInButton from "../components/GoogleWebSignInButton";
import { useAuth } from "../context/AuthContext";
import type { AuthStackParamList } from "../types/auth.types";

type LoginScreenProps = NativeStackScreenProps<AuthStackParamList, "Login">;
type ActiveAction = "submit" | "google" | null;
type FocusedField = "email" | "password" | null;

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginScreen({ navigation }: LoginScreenProps) {
  const { login, signInWithGoogle, loading, googleSignInHint } = useAuth();
  const { t } = useTranslation("auth");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [activeAction, setActiveAction] = useState<ActiveAction>(null);
  const [focusedField, setFocusedField] = useState<FocusedField>(null);
  const [passwordVisible, setPasswordVisible] = useState(false);

  const isSubmitLoading = loading && activeAction !== "google";
  const isGoogleLoading = loading && activeAction === "google";

  function updateEmail(value: string) {
    setValidationError(null);
    setEmail(value);
  }

  function updatePassword(value: string) {
    setValidationError(null);
    setPassword(value);
  }

  async function handleLogin(): Promise<void> {
    const nextEmail = email.trim().toLowerCase();

    if (!nextEmail) {
      setValidationError(t("emailRequired"));
      return;
    }

    if (!emailPattern.test(nextEmail)) {
      setValidationError(t("emailInvalid"));
      return;
    }

    if (!password) {
      setValidationError(t("passwordRequired"));
      return;
    }

    try {
      await login({
        email: nextEmail,
        password,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : t("loginError");
      Alert.alert(t("loginFailed"), message);
      throw error;
    }
  }

  async function handleGoogleLogin(idToken?: string): Promise<void> {
    try {
      await signInWithGoogle(idToken);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t("googleLoginError");
      Alert.alert(t("googleLoginFailed"), message);
      throw error;
    }
  }

  function startGoogleSignIn(idToken?: string) {
    setValidationError(null);
    setActiveAction("google");

    void handleGoogleLogin(idToken).finally(() => {
      setActiveAction(null);
    });
  }

  function submitLogin() {
    setActiveAction("submit");

    void handleLogin().finally(() => {
      setActiveAction(null);
    });
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
        <LinearGradient
          colors={["#7B4FC8", "#6038B0", "#3E2075"]}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={styles.hero}
        >
          <View style={styles.glow} />
          <View style={[styles.contour, styles.contourA]} />
          <View style={[styles.contour, styles.contourB]} />
          <View style={[styles.contour, styles.contourC]} />
          <View style={[styles.contour, styles.contourD]} />
          <View style={styles.brandRow}>
            <View style={styles.logoMark}>
              <MaterialCommunityIcons name="map-marker" size={30} color="#6038B0" />
            </View>
            <View>
              <Text style={styles.brand}>{t("brandName")}</Text>
              <Text style={styles.brandTagline}>{t("brandTagline")}</Text>
            </View>
          </View>
          <Text style={styles.heroTitle}>{t("welcomeBackCitizen")}</Text>
        </LinearGradient>

        <View style={styles.content}>
          <View style={styles.card}>
          <Text style={styles.cardTitle}>{t("signInTitle")}</Text>
          <Text style={styles.cardSubtitle}>{t("signInSubtitle")}</Text>
          {validationError ? <Text style={styles.errorText}>{validationError}</Text> : null}

          <View style={styles.form}>
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>{t("emailAddress")}</Text>
              <View
                style={[
                  styles.inputShell,
                  focusedField === "email" ? styles.inputShellFocused : null,
                ]}
              >
                <MaterialCommunityIcons
                  name="email-outline"
                  size={18}
                  color={focusedField === "email" ? "#6038B0" : "#8B8597"}
                />
                <TextInput
                  value={email}
                  onChangeText={updateEmail}
                  onFocus={() => setFocusedField("email")}
                  onBlur={() => setFocusedField(null)}
                  placeholder={t("emailPlaceholder")}
                  placeholderTextColor="#8B8597"
                  style={styles.input}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  textContentType="emailAddress"
                />
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>{t("password")}</Text>
              <View
                style={[
                  styles.inputShell,
                  focusedField === "password" ? styles.inputShellFocused : null,
                ]}
              >
                <MaterialCommunityIcons
                  name="lock-outline"
                  size={18}
                  color={focusedField === "password" ? "#6038B0" : "#8B8597"}
                />
                <TextInput
                  value={password}
                  onChangeText={updatePassword}
                  onFocus={() => setFocusedField("password")}
                  onBlur={() => setFocusedField(null)}
                  placeholder="Password"
                  placeholderTextColor="#8B8597"
                  style={styles.input}
                  secureTextEntry={!passwordVisible}
                  textContentType="password"
                />
                <Pressable onPress={() => setPasswordVisible((current) => !current)} hitSlop={8}>
                  <MaterialCommunityIcons
                    name={passwordVisible ? "eye-off-outline" : "eye-outline"}
                    size={18}
                    color="#6038B0"
                  />
                </Pressable>
              </View>
            </View>

            <View style={styles.optionsRow}>
              <Pressable
                onPress={() => setRememberMe((current) => !current)}
                style={styles.rememberRow}
                hitSlop={8}
              >
                <View style={[styles.checkbox, rememberMe ? styles.checkboxChecked : null]}>
                  {rememberMe ? (
                    <MaterialCommunityIcons name="check" size={14} color="#FFFFFF" />
                  ) : null}
                </View>
                <Text style={styles.optionText}>{t("rememberMe")}</Text>
              </Pressable>

              <Pressable onPress={() => navigation.navigate("ForgotPassword")} hitSlop={8}>
                <Text style={styles.forgotText}>{t("forgotPassword")}</Text>
              </Pressable>
            </View>

            <Pressable
              onPress={submitLogin}
              disabled={loading}
              style={({ pressed }) => [
                styles.submitButtonShell,
                pressed && !loading ? styles.pressed : null,
                loading ? styles.disabled : null,
              ]}
            >
              <LinearGradient
                colors={["#7B4FC8", "#6038B0"]}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
                style={styles.submitButton}
              >
                {isSubmitLoading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Text style={styles.submitText}>{t("signIn")}</Text>
                    <MaterialCommunityIcons name="login" size={18} color="#FFFFFF" />
                  </>
                )}
              </LinearGradient>
            </Pressable>
          </View>

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>{t("orContinueWith")}</Text>
            <View style={styles.dividerLine} />
          </View>

          {Platform.OS === "web" ? (
            <GoogleWebSignInButton
              mode="login"
              loading={isGoogleLoading}
              onSuccess={startGoogleSignIn}
              onError={(message) => {
                setActiveAction(null);
                setValidationError(message);
              }}
            />
          ) : (
            <Pressable
              onPress={() => startGoogleSignIn()}
              disabled={loading}
              style={({ pressed }) => [
                styles.googleButton,
                pressed && !loading ? styles.googleButtonPressed : null,
                loading ? styles.disabled : null,
              ]}
            >
              {isGoogleLoading ? (
                <ActivityIndicator color="#481A98" />
              ) : (
                <>
                  <MaterialCommunityIcons name="google" size={18} color="#4285F4" />
                  <Text style={styles.googleText}>{t("continueWithGoogle")}</Text>
                </>
              )}
            </Pressable>
          )}

          {googleSignInHint ? <Text style={styles.helperText}>{googleSignInHint}</Text> : null}
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>{t("newToApp")}</Text>
            <Pressable onPress={() => navigation.navigate("Register")} hitSlop={8}>
              <Text style={styles.footerLink}>{t("createAccount")}</Text>
            </Pressable>
          </View>

          <View style={styles.trustRow}>
            <MaterialCommunityIcons name="shield-check" size={14} color="#6038B0" />
            <Text style={styles.trustText}>{t("securedBy")}</Text>
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
    paddingBottom: 30,
  },
  hero: {
    width: "100%",
    minHeight: 230,
    paddingTop: 8,
    paddingHorizontal: 24,
    paddingBottom: 80,
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
    overflow: "hidden",
  },
  /**
   * Stand-in for the prototype's `<TopoLines/>` SVG. Without react-native-svg
   * the contours are approximated with wide, heavily-rounded outlines that the
   * hero clips — same "civic territory" texture, no extra dependency.
   */
  contour: {
    position: "absolute",
    left: -180,
    right: -180,
    height: 260,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.13)",
  },
  contourA: {
    top: -150,
  },
  contourB: {
    top: -104,
  },
  contourC: {
    top: -52,
  },
  contourD: {
    top: 8,
  },
  glow: {
    position: "absolute",
    top: -70,
    right: -60,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(196,181,253,0.18)",
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 22,
  },
  logoMark: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F4EEFD",
    ...shadows.logo,
  },
  brand: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.6,
    lineHeight: 24,
  },
  brandAccent: {
    color: "#C4B5FD",
  },
  brandTagline: {
    color: "rgba(255,255,255,0.65)",
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 1.6,
    textTransform: "uppercase",
    marginTop: 4,
  },
  heroTitle: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "800",
    lineHeight: 32,
    letterSpacing: -0.8,
  },
  heroTitleAccent: {
    color: "#C4B5FD",
  },
  content: {
    paddingHorizontal: 24,
    marginTop: -28,
    zIndex: 2,
  },
  card: {
    width: "100%",
    maxWidth: 430,
    alignSelf: "center",
    paddingTop: 28,
    paddingHorizontal: 22,
    paddingBottom: 24,
    borderRadius: radii.card,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E8E4F0",
    ...shadows.card,
  },
  cardTitle: {
    color: "#15121F",
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 4,
  },
  cardSubtitle: {
    color: "#8B8597",
    fontSize: 13,
    marginBottom: 22,
  },
  form: {
    gap: 12,
  },
  errorText: {
    color: "#BA1A1A",
    backgroundColor: "#FFDAD6",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    marginBottom: 16,
    fontSize: 13,
    fontWeight: "600",
  },
  fieldGroup: {
    gap: 6,
  },
  label: {
    color: "#4A4458",
    fontSize: 12,
    fontWeight: "700",
  },
  inputShell: {
    minHeight: 49,
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
    color: "#1D1A27",
    fontSize: 14,
    fontWeight: "500",
    paddingVertical: Platform.OS === "ios" ? 14 : 10,
  },
  optionsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
    marginTop: -2,
  },
  rememberRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: "#CBC3D5",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  checkboxChecked: {
    backgroundColor: "#481A98",
    borderColor: "#481A98",
  },
  optionText: {
    color: "#4A4458",
    fontSize: 12,
    fontWeight: "600",
  },
  forgotText: {
    color: "#6038B0",
    fontSize: 12,
    fontWeight: "700",
  },
  submitButtonShell: {
    borderRadius: radii.button,
    overflow: "hidden",
    ...shadows.button,
  },
  submitButton: {
    minHeight: 53,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  submitText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginVertical: 18,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#E8E4F0",
  },
  dividerText: {
    color: "#8B8597",
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  googleButton: {
    minHeight: 54,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#E7DFF2",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#FFFFFF",
  },
  googleButtonPressed: {
    backgroundColor: "#F8F1FF",
  },
  googleText: {
    color: "#15121F",
    fontSize: 14,
    fontWeight: "700",
  },
  helperText: {
    color: "#8B8597",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 12,
    textAlign: "center",
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 22,
    paddingHorizontal: 20,
  },
  trustRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 28,
    marginBottom: 12,
  },
  trustText: {
    color: "#8B8597",
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  footerText: {
    color: "#4A4458",
    fontSize: 13,
    fontWeight: "500",
  },
  footerLink: {
    color: "#6038B0",
    fontSize: 13,
    fontWeight: "700",
  },
  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
  disabled: {
    opacity: 0.68,
  },
});
