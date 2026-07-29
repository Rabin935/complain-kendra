import { Text, TextInput } from "@/src/theme/typography";
import {
  MaterialCommunityIcons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect,
  useMemo,
  useRef,
  useState } from "react";
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
import { shadows } from "../../../constants/theme";
import { useTranslation } from "../../../i18n/LanguageContext";
import { getApiErrorMessage } from "../../../../src/lib/api";
import { sendOtp, verifyOtp } from "../services/auth.service";
import type { AuthStackParamList } from "../types/auth.types";

type OtpVerificationProps = NativeStackScreenProps<AuthStackParamList, "OtpVerification">;

const OTP_LENGTH = 6;
const RESEND_SECONDS = 60;

function formatMobileNumber(phone: string | undefined, fallback: string): string {
  const digits = phone?.replace(/\D/g, "") ?? "";
  const localNumber = digits.startsWith("977") ? digits.slice(3) : digits;

  if (localNumber.length === 10) {
    return `+977 ${localNumber.slice(0, 2)} ${localNumber.slice(2, 6)} ${localNumber.slice(6)}`;
  }

  return phone || fallback;
}

export default function OtpVerificationScreen({ navigation, route }: OtpVerificationProps) {
  const { t } = useTranslation("auth");
  const inputRef = useRef<TextInput>(null);
  const [otp, setOtp] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(RESEND_SECONDS);
  const [devOtp, setDevOtp] = useState(route.params.devOtp);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verified, setVerified] = useState(false);
  const email = route.params.email;
  const mobileNumber = formatMobileNumber(route.params.phone, t("registeredMobile"));

  const digits = useMemo(
    () => Array.from({ length: OTP_LENGTH }, (_, index) => otp[index] ?? ""),
    [otp],
  );
  const canResend = secondsLeft === 0 && !loading && !resending;
  const canVerify = otp.length === OTP_LENGTH && !loading && !resending && !verified;

  useEffect(() => {
    const timeout = setTimeout(() => inputRef.current?.focus(), 250);
    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (secondsLeft === 0 || verified) {
      return undefined;
    }

    const interval = setInterval(() => {
      setSecondsLeft((current) => Math.max(current - 1, 0));
    }, 1000);

    return () => clearInterval(interval);
  }, [secondsLeft, verified]);

  useEffect(() => {
    if (!verified) {
      return undefined;
    }

    const timeout = setTimeout(() => navigation.replace("Login"), 900);
    return () => clearTimeout(timeout);
  }, [navigation, verified]);

  function updateOtp(value: string) {
    setError(null);
    setOtp(value.replace(/\D/g, "").slice(0, OTP_LENGTH));
  }

  async function handleResend() {
    if (!canResend) {
      return;
    }

    setResending(true);
    setError(null);

    try {
      const response = await sendOtp({ email });
      setDevOtp(response.devOtp);
      setOtp("");
      setSecondsLeft(RESEND_SECONDS);
      inputRef.current?.focus();
    } catch (resendError) {
      setError(getApiErrorMessage(resendError));
    } finally {
      setResending(false);
    }
  }

  async function handleVerify() {
    if (!canVerify) {
      setError(t("enterSixDigitCode"));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await verifyOtp({ email, otp });
      setVerified(true);
    } catch (verifyError) {
      setError(getApiErrorMessage(verifyError));
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Pressable
            style={styles.backButton}
            onPress={() => navigation.replace("Login")}
            hitSlop={8}
          >
            <MaterialCommunityIcons name="arrow-left" size={20} color={colors.text} />
          </Pressable>
          <Text style={styles.headerTitle}>{t("verifyMobile")}</Text>
          <View style={styles.stepPill}>
            <Text style={styles.stepText}>{t("stepTwoOfTwo")}</Text>
          </View>
        </View>

        <View style={styles.main}>
          <View style={styles.progressBars}>
            <View style={styles.progressBar} />
            <View style={styles.progressBar} />
          </View>

          <View style={styles.hero}>
            <View style={styles.heroIconRing}>
              <LinearGradient
                colors={["#EEE8FA", "#F6F2FC"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.heroIcon}
              >
                <MaterialCommunityIcons
                  name="message-processing-outline"
                  size={44}
                  color={colors.primary}
                />
              </LinearGradient>
            </View>
            <Text style={styles.title}>{t("enterVerificationCode")}</Text>
            <Text style={styles.subtitle}>{t("sentCodeTo")}</Text>
            <View style={styles.destinationRow}>
              <Text numberOfLines={1} style={styles.destination}>{mobileNumber}</Text>
              <Pressable onPress={() => navigation.replace("Register")} hitSlop={8}>
                <Text style={styles.changeText}>{t("change")}</Text>
              </Pressable>
            </View>
          </View>

          {route.params.message ? <Text style={styles.noticeText}>{route.params.message}</Text> : null}
          {devOtp ? <Text style={styles.devText}>{t("devOtp", { otp: devOtp })}</Text> : null}

          <Pressable style={styles.otpRow} onPress={() => inputRef.current?.focus()}>
            {digits.map((digit, index) => (
              <View
                key={index}
                style={[
                  styles.otpBox,
                  otp.length === index ? styles.otpBoxFocused : null,
                  error ? styles.otpBoxError : null,
                  verified ? styles.otpBoxSuccess : null,
                ]}
              >
                <Text style={styles.otpDigit}>{digit}</Text>
              </View>
            ))}
          </Pressable>

          <TextInput
            ref={inputRef}
            value={otp}
            onChangeText={updateOtp}
            autoFocus
            keyboardType="number-pad"
            textContentType="oneTimeCode"
            autoComplete="one-time-code"
            maxLength={OTP_LENGTH}
            style={styles.hiddenInput}
            caretHidden
          />

          {error ? (
            <View style={styles.errorBox}>
              <MaterialCommunityIcons name="alert-circle-outline" size={18} color={colors.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {verified ? (
            <View style={styles.successBox}>
              <MaterialCommunityIcons name="check-circle-outline" size={18} color={colors.success} />
              <Text style={styles.successText}>{t("otpVerified")}</Text>
            </View>
          ) : null}

          <View style={styles.resendRow}>
            <Text style={styles.timerText}>{t("didntReceiveCode")} </Text>
            <Pressable onPress={() => void handleResend()} disabled={!canResend} hitSlop={8}>
              <Text style={[styles.resendText, !canResend ? styles.resendTextDisabled : null]}>
                {resending
                  ? t("sending")
                  : secondsLeft > 0
                    ? t("resendIn", { time: `0:${String(secondsLeft).padStart(2, "0")}` })
                    : t("resendCode")}
              </Text>
            </Pressable>
          </View>

          <Pressable
            style={[styles.verifyButtonShell, !canVerify ? styles.buttonDisabled : null]}
            onPress={() => void handleVerify()}
            disabled={!canVerify}
          >
            <LinearGradient
              colors={["#7B4FC8", "#6038B0"]}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={styles.verifyButton}
            >
              {loading ? <ActivityIndicator color={colors.surface} /> : null}
              <Text style={styles.verifyText}>
                {loading ? t("verifying") : t("verifyContinue")}
              </Text>
              {loading ? null : (
                <MaterialCommunityIcons name="check-circle-outline" size={18} color="#FFFFFF" />
              )}
            </LinearGradient>
          </Pressable>

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>{t("orUseEmail")}</Text>
            <View style={styles.dividerLine} />
          </View>

          <Pressable
            style={({ pressed }) => [styles.emailCard, pressed ? styles.pressed : null]}
            onPress={() => void handleResend()}
            disabled={!canResend}
          >
            <View style={styles.emailIcon}>
              <MaterialCommunityIcons name="email-outline" size={19} color="#2563EB" />
            </View>
            <View style={styles.emailCopy}>
              <Text style={styles.emailTitle}>{t("sendCodeToEmail")}</Text>
              <Text numberOfLines={1} style={styles.emailValue}>{email}</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={18} color={colors.textMuted} />
          </Pressable>
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
  content: {
    flexGrow: 1,
    alignItems: "center",
  },
  header: {
    width: "100%",
    maxWidth: 430,
    minHeight: 66,
    paddingTop: 8,
    paddingHorizontal: 20,
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
  stepPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: "#F8F6FC",
    borderWidth: 1,
    borderColor: "#E8E4F0",
  },
  stepText: {
    color: "#8B8597",
    fontSize: 12,
    fontWeight: "700",
  },
  main: {
    width: "100%",
    maxWidth: 430,
    paddingHorizontal: 22,
    paddingBottom: 32,
  },
  progressBars: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 28,
  },
  progressBar: {
    flex: 1,
    height: 4,
    borderRadius: 999,
    backgroundColor: "#6038B0",
  },
  hero: {
    alignItems: "center",
    paddingTop: 12,
    paddingBottom: 28,
  },
  heroIconRing: {
    width: 128,
    height: 128,
    borderRadius: 64,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: "#EEE8FA",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  heroIcon: {
    width: 92,
    height: 92,
    borderRadius: 28,
    borderWidth: 1.5,
    borderColor: "#EEE8FA",
    alignItems: "center",
    justifyContent: "center",
  },
  heroEmoji: {
    fontSize: 44,
  },
  progressRow: {
    position: "absolute",
    top: 58,
    right: 24,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  progressDone: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
  },
  progressLine: {
    width: 30,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.32)",
  },
  progressActive: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.45)",
  },
  progressText: {
    color: colors.surface,
    fontSize: 14,
    fontWeight: "900",
  },
  eyebrow: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 10,
  },
  title: {
    color: "#15121F",
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "800",
    letterSpacing: -0.6,
    textAlign: "center",
    marginBottom: 10,
  },
  subtitle: {
    color: "#8B8597",
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  destinationRow: {
    maxWidth: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    marginTop: 2,
  },
  destination: {
    maxWidth: "75%",
    color: "#15121F",
    fontSize: 13,
    fontWeight: "700",
  },
  changeText: {
    color: "#6038B0",
    fontSize: 13,
    fontWeight: "700",
  },
  card: {
    width: "100%",
    maxWidth: 430,
    marginTop: -52,
    padding: 24,
    borderRadius: 22,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: "#DED7EA",
    shadowColor: "#6038B0",
    shadowOpacity: 0.16,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 14 },
    elevation: 8,
  },
  noticeText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 19,
    marginBottom: 10,
    textAlign: "center",
  },
  devText: {
    color: colors.primary,
    backgroundColor: "#EEE7FA",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 12,
    fontWeight: "900",
    marginBottom: 12,
    textAlign: "center",
  },
  otpRow: {
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    marginBottom: 16,
  },
  otpBox: {
    width: 48,
    height: 60,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F6F2FC",
    borderWidth: 2,
    borderColor: "#EEE8FA",
  },
  otpBoxFocused: {
    borderColor: "#6038B0",
    backgroundColor: colors.surface,
    ...shadows.focusRing,
  },
  otpBoxError: {
    borderColor: colors.error,
    backgroundColor: "#FFF7F7",
  },
  otpBoxSuccess: {
    borderColor: colors.success,
    backgroundColor: "#F0FDF4",
  },
  otpDigit: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "900",
  },
  hiddenInput: {
    position: "absolute",
    width: 1,
    height: 1,
    opacity: 0,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 14,
    backgroundColor: "#FFF1F2",
    marginBottom: 14,
  },
  errorText: {
    flex: 1,
    color: colors.error,
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 17,
  },
  successBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 14,
    backgroundColor: "#F0FDF4",
    marginBottom: 14,
  },
  successText: {
    flex: 1,
    color: colors.success,
    fontSize: 12,
    fontWeight: "900",
  },
  verifyButtonShell: {
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#6038B0",
    shadowOpacity: 0.28,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 11 },
    elevation: 7,
  },
  verifyButton: {
    minHeight: 53,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  verifyText: {
    color: colors.surface,
    fontSize: 16,
    fontWeight: "900",
  },
  buttonDisabled: {
    opacity: 0.62,
  },
  resendRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 28,
  },
  timerText: {
    color: colors.textMuted,
    fontSize: 13,
  },
  resendText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: "900",
  },
  resendTextDisabled: {
    color: colors.primary,
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
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
  },
  emailCard: {
    minHeight: 68,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#E8E4F0",
    backgroundColor: "#F8F6FC",
  },
  emailIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#DBEAFE",
  },
  emailEmoji: {
    fontSize: 18,
  },
  emailCopy: {
    flex: 1,
    minWidth: 0,
  },
  emailTitle: {
    color: "#15121F",
    fontSize: 13,
    fontWeight: "700",
  },
  emailValue: {
    color: "#8B8597",
    fontSize: 11,
    marginTop: 2,
  },
  pressed: {
    opacity: 0.75,
  },
});
