import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
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
import {
  fetchWardCities,
  fetchWardsByCity,
  type WardOption,
} from "../../user/services/ward.service";

type RegisterScreenProps = NativeStackScreenProps<AuthStackParamList, "Register">;
type FocusedField =
  | "firstName"
  | "lastName"
  | "phone"
  | "email"
  | "password"
  | "homeArea"
  | null;
type SelectorMode = "city" | "ward" | null;

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const fallbackCities = ["Kathmandu", "Lalitpur", "Bhaktapur"];

export default function RegisterScreen({ navigation }: RegisterScreenProps) {
  const { register, loading } = useAuth();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [homeArea, setHomeArea] = useState("");
  const [cities, setCities] = useState<string[]>(fallbackCities);
  const [selectedCity, setSelectedCity] = useState("");
  const [wards, setWards] = useState<WardOption[]>([]);
  const [selectedWard, setSelectedWard] = useState<WardOption | null>(null);
  const [selectorMode, setSelectorMode] = useState<SelectorMode>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [focusedField, setFocusedField] = useState<FocusedField>(null);

  const passwordScore = useMemo(() => {
    let score = 0;

    if (password.length >= 8) score += 1;
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
    if (/\d/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;

    return score;
  }, [password]);

  const passwordStrength = passwordScore >= 3 ? "Strong" : passwordScore === 2 ? "Okay" : "Weak";

  useEffect(() => {
    async function loadCities() {
      try {
        const nextCities = await fetchWardCities();
        const usableCities = nextCities.length ? nextCities : fallbackCities;
        setCities(usableCities);
        setSelectedCity(usableCities[0] ?? "");
      } catch {
        setCities(fallbackCities);
        setSelectedCity(fallbackCities[0]);
      }
    }

    void loadCities();
  }, []);

  useEffect(() => {
    if (!selectedCity) {
      setWards([]);
      setSelectedWard(null);
      return;
    }

    async function loadWards() {
      setLocationLoading(true);

      try {
        const nextWards = await fetchWardsByCity(selectedCity);
        setWards(nextWards);
        setSelectedWard((current) =>
          current && nextWards.some((ward) => ward.id === current.id) ? current : nextWards[0] ?? null,
        );
      } catch {
        setWards([]);
        setSelectedWard(null);
      } finally {
        setLocationLoading(false);
      }
    }

    void loadWards();
  }, [selectedCity]);

  function clearError() {
    setValidationError(null);
  }

  async function handleRegister(): Promise<void> {
    const cleanFirstName = firstName.trim();
    const cleanLastName = lastName.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = phone.trim();
    const cleanArea = homeArea.trim() || selectedWard?.area || "";
    const fullName = [cleanFirstName, cleanLastName].filter(Boolean).join(" ");

    if (!cleanFirstName) return setValidationError("First name is required.");
    if (!cleanLastName) return setValidationError("Last name is required.");
    if (!cleanPhone) return setValidationError("Mobile number is required.");
    if (!cleanEmail) return setValidationError("Email address is required.");
    if (!emailPattern.test(cleanEmail)) return setValidationError("Enter a valid email address.");
    if (!selectedCity) return setValidationError("City is required.");
    if (!selectedWard) return setValidationError("Ward is required.");
    if (!password) return setValidationError("Password is required.");
    if (password.length < 6) return setValidationError("Password must be at least 6 characters.");

    try {
      const message = await register({
        name: fullName,
        email: cleanEmail,
        password,
        phone: cleanPhone,
        city: selectedCity,
        ward: selectedWard.wardName,
        wardId: selectedWard.id,
        municipality: selectedWard.municipality,
        homeArea: cleanArea,
        address: [cleanArea, selectedCity].filter(Boolean).join(", "),
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

  const selectorItems = selectorMode === "city" ? cities : wards;

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
              Join residents reporting civic issues in the ward that actually serves them.
            </Text>
          </View>

          <View style={styles.formSection}>
            {validationError ? <Text style={styles.errorText}>{validationError}</Text> : null}

            <View style={styles.nameGrid}>
              <FormField
                label="First Name"
                icon="account"
                value={firstName}
                placeholder="Rahul"
                focused={focusedField === "firstName"}
                onFocus={() => setFocusedField("firstName")}
                onBlur={() => setFocusedField(null)}
                onChangeText={(value) => {
                  clearError();
                  setFirstName(value);
                }}
              />
              <FormField
                label="Last Name"
                icon="account"
                value={lastName}
                placeholder="Sharma"
                focused={focusedField === "lastName"}
                onFocus={() => setFocusedField("lastName")}
                onBlur={() => setFocusedField(null)}
                onChangeText={(value) => {
                  clearError();
                  setLastName(value);
                }}
              />
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
                    onChangeText={(value) => {
                      clearError();
                      setPhone(value);
                    }}
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

            <FormField
              label="Email Address"
              icon="email-outline"
              value={email}
              placeholder="rahul@example.com"
              focused={focusedField === "email"}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              onFocus={() => setFocusedField("email")}
              onBlur={() => setFocusedField(null)}
              onChangeText={(value) => {
                clearError();
                setEmail(value);
              }}
            />

            <SelectorField
              label="City"
              icon="city-variant-outline"
              title={selectedCity || "Select city"}
              subtitle="Choose your city first"
              onPress={() => setSelectorMode("city")}
            />

            <SelectorField
              label="Ward"
              icon="office-building-marker-outline"
              title={
                locationLoading
                  ? "Loading wards..."
                  : selectedWard
                    ? `${selectedWard.wardName} - ${selectedWard.city}`
                    : "Select ward"
              }
              subtitle={selectedWard?.municipality || "Assigned ward office"}
              onPress={() => setSelectorMode("ward")}
              disabled={!selectedCity || locationLoading}
            />

            <FormField
              label="Home Area"
              icon="home-city-outline"
              value={homeArea}
              placeholder={selectedWard?.area || "Koteshwor"}
              focused={focusedField === "homeArea"}
              onFocus={() => setFocusedField("homeArea")}
              onBlur={() => setFocusedField(null)}
              onChangeText={(value) => {
                clearError();
                setHomeArea(value);
              }}
            />

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Password</Text>
              <View
                style={[
                  styles.inputShell,
                  focusedField === "password" ? styles.inputShellFocused : null,
                ]}
              >
                <MaterialCommunityIcons name="lock" size={20} color="#FB923C" />
                <TextInput
                  value={password}
                  onChangeText={(value) => {
                    clearError();
                    setPassword(value);
                  }}
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
              onPress={() => void handleRegister()}
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

      <SelectorModal
        visible={selectorMode !== null}
        title={selectorMode === "ward" ? "Select Ward" : "Select City"}
        onClose={() => setSelectorMode(null)}
      >
        {selectorItems.length === 0 ? (
          <View style={styles.emptySelectorState}>
            <MaterialCommunityIcons name="map-marker-alert-outline" size={24} color="#9CA3AF" />
            <Text style={styles.emptySelectorTitle}>No ward options available</Text>
            <Text style={styles.emptySelectorText}>Try choosing the city again or restart the app.</Text>
          </View>
        ) : null}

        {selectorItems.map((item) => {
          const isCity = typeof item === "string";
          const id = isCity ? item : item.id;
          const title = isCity ? item : `${item.wardName} - ${item.city}`;
          const subtitle = isCity ? "Load wards in this city" : item.municipality;
          const selected = isCity ? selectedCity === item : selectedWard?.id === item.id;

          return (
            <Pressable
              key={id}
              style={[styles.selectorRow, selected ? styles.selectorRowActive : null]}
              onPress={() => {
                clearError();

                if (isCity) {
                  setSelectedCity(item);
                } else {
                  setSelectedWard(item);
                }

                setSelectorMode(null);
              }}
            >
              <View style={styles.selectorCopy}>
                <Text style={styles.selectorTitle}>{title}</Text>
                <Text style={styles.selectorSubtitle}>{subtitle}</Text>
              </View>
              {selected ? (
                <MaterialCommunityIcons name="check-circle" size={20} color="#6038B0" />
              ) : null}
            </Pressable>
          );
        })}
      </SelectorModal>
    </KeyboardAvoidingView>
  );
}

function FormField({
  label,
  icon,
  value,
  placeholder,
  focused,
  onFocus,
  onBlur,
  onChangeText,
  ...rest
}: {
  label: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  value: string;
  placeholder: string;
  focused: boolean;
  onFocus: () => void;
  onBlur: () => void;
  onChangeText: (value: string) => void;
  keyboardType?: "default" | "email-address";
  autoCapitalize?: "none" | "words";
  autoCorrect?: boolean;
}) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputShell, focused ? styles.inputShellFocused : null]}>
        <MaterialCommunityIcons name={icon} size={20} color="#6038B0" />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          onFocus={onFocus}
          onBlur={onBlur}
          placeholder={placeholder}
          placeholderTextColor="#9CA3AF"
          style={styles.input}
          {...rest}
        />
      </View>
    </View>
  );
}

function SelectorField({
  label,
  icon,
  title,
  subtitle,
  onPress,
  disabled,
}: {
  label: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  title: string;
  subtitle: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        style={[styles.wardBox, disabled ? styles.disabledBox : null]}
        onPress={onPress}
        disabled={disabled}
      >
        <View style={styles.locationBadge}>
          <MaterialCommunityIcons name={icon} size={20} color="#EC4899" />
        </View>
        <View style={styles.wardTextBlock}>
          <Text style={styles.wardTitle}>{title}</Text>
          <Text style={styles.wardSubtitle}>{subtitle}</Text>
        </View>
        <MaterialCommunityIcons name="chevron-down" size={18} color="#9CA3AF" />
      </Pressable>
    </View>
  );
}

function SelectorModal({
  visible,
  title,
  onClose,
  children,
}: {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <MaterialCommunityIcons name="close" size={20} color="#6B7280" />
            </Pressable>
          </View>
          <ScrollView style={styles.modalList} showsVerticalScrollIndicator={false}>
            {children}
          </ScrollView>
        </View>
      </View>
    </Modal>
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
  },
  header: {
    paddingTop: 48,
    paddingHorizontal: 24,
    paddingBottom: 28,
    backgroundColor: "#6038B0",
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 28,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.14)",
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  progressActive: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  progressInactive: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  progressLine: {
    width: 36,
    height: 3,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.36)",
  },
  progressActiveText: {
    color: "#6038B0",
    fontSize: 14,
    fontWeight: "800",
  },
  progressInactiveText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
  eyebrow: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  title: {
    marginTop: 8,
    color: "#FFFFFF",
    fontSize: 30,
    fontWeight: "800",
    lineHeight: 36,
  },
  subtitle: {
    marginTop: 10,
    color: "rgba(255,255,255,0.82)",
    fontSize: 14,
    lineHeight: 20,
  },
  formSection: {
    padding: 24,
    gap: 18,
  },
  errorText: {
    color: "#DC2626",
    fontSize: 13,
    fontWeight: "600",
  },
  nameGrid: {
    flexDirection: "row",
    gap: 12,
  },
  fieldGroup: {
    gap: 8,
    flex: 1,
  },
  label: {
    color: "#374151",
    fontSize: 13,
    fontWeight: "700",
  },
  inputShell: {
    minHeight: 58,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "rgba(96,56,176,0.18)",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  inputShellFocused: {
    borderColor: "#6038B0",
  },
  input: {
    flex: 1,
    color: "#1F2937",
    fontSize: 15,
    fontWeight: "600",
    paddingVertical: Platform.OS === "ios" ? 15 : 10,
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
    borderColor: "rgba(96,56,176,0.18)",
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
  disabledBox: {
    opacity: 0.58,
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
    marginTop: 6,
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(17,24,39,0.42)",
    justifyContent: "center",
    padding: 20,
  },
  modalCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 18,
    maxHeight: "72%",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  modalList: {
    maxHeight: 360,
  },
  selectorRow: {
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  selectorRowActive: {
    borderColor: "#6038B0",
    backgroundColor: "#F5F3FF",
  },
  selectorCopy: {
    flex: 1,
  },
  selectorTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
  },
  selectorSubtitle: {
    marginTop: 2,
    fontSize: 12,
    color: "#6B7280",
  },
  emptySelectorState: {
    alignItems: "center",
    paddingVertical: 28,
    paddingHorizontal: 16,
    gap: 8,
  },
  emptySelectorTitle: {
    color: "#111827",
    fontSize: 15,
    fontWeight: "800",
  },
  emptySelectorText: {
    color: "#6B7280",
    fontSize: 12,
    textAlign: "center",
  },
});
