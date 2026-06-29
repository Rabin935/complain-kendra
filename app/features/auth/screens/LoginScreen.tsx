import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import GoogleWebSignInButton from "../components/GoogleWebSignInButton";
import { useAuth } from "../context/AuthContext";
import type { AuthStackParamList } from "../types/auth.types";

type LoginScreenProps = NativeStackScreenProps<AuthStackParamList, "Login">;
type ActiveAction = "submit" | "google" | null;
type FocusedField = "email" | "password" | null;

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginScreen({ navigation }: LoginScreenProps) {
  const { login, signInWithGoogle, loading, googleSignInHint } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [activeAction, setActiveAction] = useState<ActiveAction>(null);
  const [focusedField, setFocusedField] = useState<FocusedField>(null);

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
      setValidationError("Email address is required.");
      return;
    }

    if (!emailPattern.test(nextEmail)) {
      setValidationError("Enter a valid email address.");
      return;
    }

    if (!password) {
      setValidationError("Password is required.");
      return;
    }

    try {
      await login({
        email: nextEmail,
        password,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to login right now.";
      Alert.alert("Login failed", message);
      throw error;
    }
  }

  async function handleGoogleLogin(idToken?: string): Promise<void> {
    try {
      await signInWithGoogle(idToken);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to login with Google right now.";
      Alert.alert("Google Sign-In failed", message);
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
        <View style={styles.hero}>
          <View style={styles.logoMark}>
            <MaterialCommunityIcons name="bank" size={32} color="#FFFFFF" />
          </View>
          <Text style={styles.brand}>ComplainKendra</Text>
          <Text style={styles.heroSubtitle}>Welcome back, citizen.</Text>
        </View>

        <View style={styles.card}>
          {validationError ? <Text style={styles.errorText}>{validationError}</Text> : null}

          <View style={styles.form}>
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Email Address</Text>
              <View
                style={[
                  styles.inputShell,
                  focusedField === "email" ? styles.inputShellFocused : null,
                ]}
              >
                <MaterialCommunityIcons name="email-outline" size={20} color="#7B7484" />
                <TextInput
                  value={email}
                  onChangeText={updateEmail}
                  onFocus={() => setFocusedField("email")}
                  onBlur={() => setFocusedField(null)}
                  placeholder="citizen@example.com"
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
              <Text style={styles.label}>Password</Text>
              <View
                style={[
                  styles.inputShell,
                  focusedField === "password" ? styles.inputShellFocused : null,
                ]}
              >
                <MaterialCommunityIcons
                  name="lock-outline"
                  size={20}
                  color={focusedField === "password" ? "#6038B0" : "#7B7484"}
                />
                <TextInput
                  value={password}
                  onChangeText={updatePassword}
                  onFocus={() => setFocusedField("password")}
                  onBlur={() => setFocusedField(null)}
                  placeholder="Password"
                  placeholderTextColor="#8B8597"
                  style={styles.input}
                  secureTextEntry={!showPassword}
                  textContentType="password"
                />
                <Pressable
                  onPress={() => setShowPassword((current) => !current)}
                  style={styles.iconButton}
                  hitSlop={10}
                >
                  <MaterialCommunityIcons
                    name={showPassword ? "eye-off-outline" : "eye-outline"}
                    size={20}
                    color="#7B7484"
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
                <Text style={styles.optionText}>Remember me</Text>
              </Pressable>

              <Pressable onPress={() => navigation.navigate("ForgotPassword")} hitSlop={8}>
                <Text style={styles.forgotText}>Forgot password?</Text>
              </Pressable>
            </View>

            <Pressable
              onPress={submitLogin}
              disabled={loading}
              style={({ pressed }) => [
                styles.submitButton,
                pressed && !loading ? styles.pressed : null,
                loading ? styles.disabled : null,
              ]}
            >
              {isSubmitLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Text style={styles.submitText}>Sign In</Text>
                  <MaterialCommunityIcons name="arrow-right" size={22} color="#FFFFFF" />
                </>
              )}
            </Pressable>
          </View>

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>Or continue with</Text>
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
                  <MaterialCommunityIcons name="google" size={20} color="#4285F4" />
                  <Text style={styles.googleText}>Google</Text>
                </>
              )}
            </Pressable>
          )}

          {googleSignInHint ? <Text style={styles.helperText}>{googleSignInHint}</Text> : null}
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Don't have an account?</Text>
          <Pressable onPress={() => navigation.navigate("Register")} hitSlop={8}>
            <Text style={styles.footerLink}>Sign up now</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#FDF7FF",
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: "center",
    paddingBottom: 32,
  },
  hero: {
    width: "100%",
    minHeight: 300,
    paddingTop: 62,
    paddingHorizontal: 20,
    paddingBottom: 112,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#6038B0",
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
  },
  logoMark: {
    width: 64,
    height: 64,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 22,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
  },
  brand: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: 0,
    marginBottom: 8,
  },
  heroSubtitle: {
    color: "#CCBEFF",
    fontSize: 16,
    fontWeight: "500",
  },
  card: {
    width: "100%",
    maxWidth: 430,
    marginTop: -76,
    padding: 24,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#DED7EA",
    shadowColor: "#6038B0",
    shadowOpacity: 0.18,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 16 },
    elevation: 9,
  },
  form: {
    gap: 18,
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
    gap: 8,
  },
  label: {
    color: "#4A4452",
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginLeft: 4,
  },
  inputShell: {
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#E7DFF2",
    backgroundColor: "#F8F1FF",
  },
  inputShellFocused: {
    borderColor: "#6038B0",
    backgroundColor: "#FFFFFF",
    shadowColor: "#6038B0",
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    elevation: 2,
  },
  input: {
    flex: 1,
    color: "#1D1A27",
    fontSize: 15,
    fontWeight: "500",
    paddingVertical: Platform.OS === "ios" ? 14 : 10,
  },
  iconButton: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
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
    width: 20,
    height: 20,
    borderRadius: 6,
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
    color: "#4A4452",
    fontSize: 14,
    fontWeight: "500",
  },
  forgotText: {
    color: "#6038B0",
    fontSize: 14,
    fontWeight: "700",
  },
  submitButton: {
    minHeight: 58,
    borderRadius: 14,
    backgroundColor: "#6038B0",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowColor: "#6038B0",
    shadowOpacity: 0.3,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 12 },
    elevation: 6,
  },
  submitText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginVertical: 22,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#E7DFF2",
  },
  dividerText: {
    color: "#7B7484",
    fontSize: 11,
    fontWeight: "800",
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
    color: "#1D1A27",
    fontSize: 16,
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
    marginTop: 26,
    paddingHorizontal: 20,
  },
  footerText: {
    color: "#4A4452",
    fontSize: 14,
    fontWeight: "500",
  },
  footerLink: {
    color: "#481A98",
    fontSize: 14,
    fontWeight: "800",
  },
  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
  disabled: {
    opacity: 0.68,
  },
});
