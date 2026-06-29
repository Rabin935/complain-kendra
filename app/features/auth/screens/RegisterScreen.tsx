import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useMemo, useState } from "react";
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
import { useAuth } from "../context/AuthContext";
import { sendOtp } from "../services/auth.service";
import type { AuthStackParamList } from "../types/auth.types";

type RegisterScreenProps = NativeStackScreenProps<AuthStackParamList, "Register">;
type FocusedField = "firstName" | "lastName" | "phone" | "email" | "password" | null;

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function RegisterScreen({ navigation }: RegisterScreenProps) {
  const { register, loading } = useAuth();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [focusedField, setFocusedField] = useState<FocusedField>(null);

  const passwordScore = useMemo(() => {
    let score = 0;

    if (password.length >= 8) {
      score += 1;
    }

    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) {
      score += 1;
    }

    if (/\d/.test(password)) {
      score += 1;
    }

    if (/[^A-Za-z0-9]/.test(password)) {
      score += 1;
    }

    return score;
  }, [password]);

  const passwordStrength = passwordScore >= 3 ? "Strong" : passwordScore === 2 ? "Okay" : "Weak";

  function clearError() {
    setValidationError(null);
  }

  function updateFirstName(value: string) {
    clearError();
    setFirstName(value);
  }

  function updateLastName(value: string) {
    clearError();
    setLastName(value);
  }

  function updatePhone(value: string) {
    clearError();
    setPhone(value);
  }

  function updateEmail(value: string) {
    clearError();
    setEmail(value);
  }

  function updatePassword(value: string) {
    clearError();
    setPassword(value);
  }

  async function handleRegister(): Promise<void> {
    const cleanFirstName = firstName.trim();
    const cleanLastName = lastName.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = phone.trim();
    const fullName = [cleanFirstName, cleanLastName].filter(Boolean).join(" ");

    if (!cleanFirstName) {
      setValidationError("First name is required.");
      return;
    }

    if (!cleanLastName) {
      setValidationError("Last name is required.");
      return;
    }

    if (!cleanPhone) {
      setValidationError("Mobile number is required.");
      return;
    }

    if (!cleanEmail) {
      setValidationError("Email address is required.");
      return;
    }

    if (!emailPattern.test(cleanEmail)) {
      setValidationError("Enter a valid email address.");
      return;
    }

    if (!password) {
      setValidationError("Password is required.");
      return;
    }

    if (password.length < 6) {
      setValidationError("Password must be at least 6 characters.");
      return;
    }

    try {
      const message = await register({
        name: fullName,
        email: cleanEmail,
        password,
        phone: cleanPhone,
      });
      const otpResponse = await sendOtp({ email: cleanEmail });

      navigation.replace("OtpVerification", {
        email: cleanEmail,
        message,
        devOtp: otpResponse.devOtp,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to create your account right now.";
      Alert.alert("Registration failed", message);
      throw error;
    }
  }

  function submitRegister() {
    void handleRegister();
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
        <View style={styles.container}>
          <View style={styles.header}>
            <View style={styles.headerTopRow}>
              <Pressable
                onPress={() => navigation.replace("Login")}
                style={styles.backButton}
                hitSlop={8}
              >
                <MaterialCommunityIcons name="arrow-left" size={22} color="#FFFFFF" />
              </Pressable>

              <View style={styles.progressRow}>
                <View style={styles.progressActive}>
                  <Text style={styles.progressActiveText}>1</Text>
                </View>
                <View style={styles.progressLine} />
                <View style={styles.progressInactive}>
                  <Text style={styles.progressInactiveText}>2</Text>
                </View>
              </View>
            </View>

            <Text style={styles.eyebrow}>Step 1 of 2 - Your Details</Text>
            <Text style={styles.title}>Create your{"\n"}citizen account</Text>
            <Text style={styles.subtitle}>
              Join 24,000+ residents reporting civic issues across Nepal.
            </Text>
          </View>

          <View style={styles.formSection}>
            {validationError ? <Text style={styles.errorText}>{validationError}</Text> : null}

            <View style={styles.nameGrid}>
              <View style={styles.nameField}>
                <Text style={styles.label}>First Name</Text>
                <View
                  style={[
                    styles.inputShell,
                    focusedField === "firstName" ? styles.inputShellFocused : null,
                  ]}
                >
                  <MaterialCommunityIcons name="account" size={20} color="#6038B0" />
                  <TextInput
                    value={firstName}
                    onChangeText={updateFirstName}
                    onFocus={() => setFocusedField("firstName")}
                    onBlur={() => setFocusedField(null)}
                    placeholder="Rahul"
                    placeholderTextColor="#9CA3AF"
                    style={styles.input}
                    autoCapitalize="words"
                    textContentType="givenName"
                  />
                </View>
              </View>

              <View style={styles.nameField}>
                <Text style={styles.label}>Last Name</Text>
                <View
                  style={[
                    styles.inputShell,
                    focusedField === "lastName" ? styles.inputShellFocused : null,
                  ]}
                >
                  <MaterialCommunityIcons name="account" size={20} color="#6038B0" />
                  <TextInput
                    value={lastName}
                    onChangeText={updateLastName}
                    onFocus={() => setFocusedField("lastName")}
                    onBlur={() => setFocusedField(null)}
                    placeholder="Sharma"
                    placeholderTextColor="#9CA3AF"
                    style={styles.input}
                    autoCapitalize="words"
                    textContentType="familyName"
                  />
                </View>
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Mobile Number</Text>
              <View style={styles.phoneRow}>
                <View style={styles.countryBox}>
                  <Text style={styles.countryText}>NP +977</Text>
                  <MaterialCommunityIcons name="chevron-down" size={18} color="#9CA3AF" />
                </View>
                <View
                  style={[
                    styles.phoneInputShell,
                    focusedField === "phone" ? styles.phoneInputShellFocused : null,
                  ]}
                >
                  <TextInput
                    value={phone}
                    onChangeText={updatePhone}
                    onFocus={() => setFocusedField("phone")}
                    onBlur={() => setFocusedField(null)}
                    placeholder="98 1234 5678"
                    placeholderTextColor="#9CA3AF"
                    style={styles.phoneInput}
                    keyboardType="phone-pad"
                    textContentType="telephoneNumber"
                  />
                </View>
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Email Address</Text>
              <View
                style={[
                  styles.inputShell,
                  focusedField === "email" ? styles.inputShellFocused : null,
                ]}
              >
                <MaterialCommunityIcons name="email-outline" size={20} color="#9CA3AF" />
                <TextInput
                  value={email}
                  onChangeText={updateEmail}
                  onFocus={() => setFocusedField("email")}
                  onBlur={() => setFocusedField(null)}
                  placeholder="rahul@example.com"
                  placeholderTextColor="#9CA3AF"
                  style={[styles.input, styles.emailInput]}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  textContentType="emailAddress"
                />
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Ward / Area</Text>
              <Pressable style={styles.wardBox}>
                <View style={styles.locationBadge}>
                  <MaterialCommunityIcons name="map-marker" size={20} color="#EC4899" />
                </View>
                <View style={styles.wardTextBlock}>
                  <Text style={styles.wardTitle}>Ward 12 - Kathmandu</Text>
                  <Text style={styles.wardSubtitle}>Koteshwor area - auto-detected</Text>
                </View>
                <MaterialCommunityIcons name="chevron-down" size={18} color="#9CA3AF" />
              </Pressable>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Password</Text>
              <View
                style={[
                  styles.inputShell,
                  styles.passwordShell,
                  focusedField === "password" ? styles.inputShellFocused : null,
                ]}
              >
                <MaterialCommunityIcons name="lock" size={20} color="#FB923C" />
                <TextInput
                  value={password}
                  onChangeText={updatePassword}
                  onFocus={() => setFocusedField("password")}
                  onBlur={() => setFocusedField(null)}
                  placeholder="Password"
                  placeholderTextColor="#9CA3AF"
                  style={[styles.input, styles.passwordInput]}
                  secureTextEntry={!showPassword}
                  textContentType="newPassword"
                />
                <Pressable
                  onPress={() => setShowPassword((current) => !current)}
                  style={styles.iconButton}
                  hitSlop={10}
                >
                  <MaterialCommunityIcons
                    name={showPassword ? "eye-off-outline" : "eye-outline"}
                    size={20}
                    color="#9CA3AF"
                  />
                </Pressable>
              </View>

              <View style={styles.strengthBlock}>
                <View style={styles.strengthBars}>
                  {[1, 2, 3, 4].map((item) => (
                    <View
                      key={item}
                      style={[
                        styles.strengthBar,
                        passwordScore >= item ? styles.strengthBarActive : null,
                      ]}
                    />
                  ))}
                </View>
                <View style={styles.strengthTextRow}>
                  <Text style={styles.passwordHint}>8+ chars with number and symbol</Text>
                  <Text
                    style={[
                      styles.strengthLabel,
                      passwordScore >= 3 ? styles.strengthLabelStrong : null,
                    ]}
                  >
                    {password ? passwordStrength : "Required"}
                  </Text>
                </View>
              </View>
            </View>

            <Pressable
              onPress={submitRegister}
              disabled={loading}
              style={({ pressed }) => [
                styles.submitButton,
                pressed && !loading ? styles.pressed : null,
                loading ? styles.disabled : null,
              ]}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Text style={styles.submitText}>Continue</Text>
                  <MaterialCommunityIcons name="arrow-right" size={22} color="#FFFFFF" />
                </>
              )}
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
    backgroundColor: "#F3F4F6",
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: "center",
  },
  container: {
    width: "100%",
    maxWidth: 430,
    minHeight: "100%",
    backgroundColor: "#FFFFFF",
    shadowColor: "#111827",
    shadowOpacity: 0.14,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 16 },
    elevation: 8,
  },
  header: {
    paddingTop: 48,
    paddingHorizontal: 24,
    paddingBottom: 38,
    backgroundColor: "#6038B0",
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    overflow: "hidden",
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 32,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  progressActive: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  progressActiveText: {
    color: "#6038B0",
    fontSize: 14,
    fontWeight: "800",
  },
  progressLine: {
    width: 30,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.32)",
  },
  progressInactive: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)",
  },
  progressInactiveText: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 14,
    fontWeight: "800",
  },
  eyebrow: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 10,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 30,
    lineHeight: 36,
    fontWeight: "800",
    letterSpacing: 0,
    marginBottom: 12,
  },
  subtitle: {
    color: "rgba(255,255,255,0.82)",
    fontSize: 14,
    lineHeight: 21,
    fontWeight: "500",
  },
  formSection: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 30,
    paddingBottom: 40,
    gap: 20,
  },
  errorText: {
    color: "#B91C1C",
    backgroundColor: "#FEE2E2",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 13,
    fontWeight: "700",
  },
  nameGrid: {
    flexDirection: "row",
    gap: 14,
  },
  nameField: {
    flex: 1,
    gap: 8,
  },
  fieldGroup: {
    gap: 8,
  },
  label: {
    color: "#4B5563",
    fontSize: 13,
    fontWeight: "800",
    marginLeft: 4,
  },
  inputShell: {
    minHeight: 58,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    backgroundColor: "#F5F5FC",
    borderWidth: 1,
    borderColor: "#F5F5FC",
    shadowColor: "#111827",
    shadowOpacity: 0.02,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  inputShellFocused: {
    borderColor: "rgba(96,56,176,0.35)",
    backgroundColor: "#FFFFFF",
  },
  input: {
    flex: 1,
    color: "#1F2937",
    fontSize: 15,
    fontWeight: "600",
    paddingVertical: Platform.OS === "ios" ? 15 : 10,
  },
  emailInput: {
    color: "#2563EB",
  },
  phoneRow: {
    flexDirection: "row",
    gap: 12,
  },
  countryBox: {
    width: 112,
    minHeight: 58,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    backgroundColor: "#F5F5FC",
  },
  countryText: {
    color: "#1F2937",
    fontSize: 13,
    fontWeight: "800",
  },
  phoneInputShell: {
    flex: 1,
    minHeight: 58,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "rgba(96,56,176,0.28)",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    justifyContent: "center",
  },
  phoneInputShellFocused: {
    borderColor: "#6038B0",
  },
  phoneInput: {
    color: "#1F2937",
    fontSize: 15,
    fontWeight: "600",
    paddingVertical: Platform.OS === "ios" ? 15 : 10,
  },
  wardBox: {
    minHeight: 68,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    backgroundColor: "#F5F5FC",
  },
  locationBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FCE7F3",
  },
  wardTextBlock: {
    flex: 1,
  },
  wardTitle: {
    color: "#1F2937",
    fontSize: 14,
    fontWeight: "800",
  },
  wardSubtitle: {
    color: "#9CA3AF",
    fontSize: 11,
    fontWeight: "500",
    marginTop: 2,
  },
  passwordShell: {
    marginBottom: 2,
  },
  passwordInput: {
    fontSize: 16,
    fontWeight: "800",
  },
  iconButton: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  strengthBlock: {
    gap: 8,
  },
  strengthBars: {
    height: 6,
    flexDirection: "row",
    gap: 6,
  },
  strengthBar: {
    flex: 1,
    borderRadius: 999,
    backgroundColor: "#E5E7EB",
  },
  strengthBarActive: {
    backgroundColor: "#22C55E",
  },
  strengthTextRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  passwordHint: {
    flex: 1,
    color: "#9CA3AF",
    fontSize: 11,
    fontWeight: "500",
  },
  strengthLabel: {
    color: "#9CA3AF",
    fontSize: 11,
    fontWeight: "800",
  },
  strengthLabelStrong: {
    color: "#22C55E",
  },
  submitButton: {
    minHeight: 64,
    borderRadius: 24,
    backgroundColor: "#6038B0",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 2,
    shadowColor: "#6038B0",
    shadowOpacity: 0.36,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 7,
  },
  submitText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
  },
  pressed: {
    opacity: 0.94,
    transform: [{ scale: 0.99 }],
  },
  disabled: {
    opacity: 0.68,
  },
});
