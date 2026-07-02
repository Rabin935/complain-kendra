import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { colors } from "../../../constants/colors";
import { getApiErrorMessage } from "../../../../src/lib/api";
import { sendOtp, verifyOtp } from "../services/auth.service";
import type { AuthStackParamList } from "../types/auth.types";

type OtpVerificationProps = NativeStackScreenProps<AuthStackParamList, "OtpVerification">;

const OTP_LENGTH = 6;
const RESEND_SECONDS = 60;

export default function OtpVerificationScreen({ navigation, route }: OtpVerificationProps) {
  const inputRef = useRef<TextInput>(null);
  const [otp, setOtp] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(RESEND_SECONDS);
  const [devOtp, setDevOtp] = useState(route.params.devOtp);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verified, setVerified] = useState(false);
  const email = route.params.email;

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
      setError("Enter the 6 digit verification code.");
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
            <MaterialCommunityIcons name="arrow-left" size={22} color={colors.surface} />
          </Pressable>
          <View style={styles.progressRow}>
            <View style={styles.progressDone}>
              <MaterialCommunityIcons name="check" size={16} color="#6038B0" />
            </View>
            <View style={styles.progressLine} />
            <View style={styles.progressActive}>
              <Text style={styles.progressText}>2</Text>
            </View>
          </View>
          <Text style={styles.eyebrow}>Step 2 of 2</Text>
          <Text style={styles.title}>Verify your email</Text>
          <Text style={styles.subtitle}>
            We sent a 6 digit OTP to {email}. Enter it below to activate your account.
          </Text>
        </View>

        <View style={styles.card}>
          {route.params.message ? <Text style={styles.noticeText}>{route.params.message}</Text> : null}
          {devOtp ? <Text style={styles.devText}>Development OTP: {devOtp}</Text> : null}

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
              <Text style={styles.successText}>OTP verified. Taking you to login...</Text>
            </View>
          ) : null}

          <Pressable
            style={[styles.verifyButton, !canVerify ? styles.buttonDisabled : null]}
            onPress={() => void handleVerify()}
            disabled={!canVerify}
          >
            {loading ? <ActivityIndicator color={colors.surface} /> : null}
            <Text style={styles.verifyText}>{loading ? "Verifying..." : "Verify OTP"}</Text>
          </Pressable>

          <View style={styles.resendRow}>
            <Text style={styles.timerText}>
              {secondsLeft > 0 ? `Resend available in ${secondsLeft}s` : "Didn't receive it?"}
            </Text>
            <Pressable onPress={() => void handleResend()} disabled={!canResend} hitSlop={8}>
              <Text style={[styles.resendText, !canResend ? styles.resendTextDisabled : null]}>
                {resending ? "Sending..." : "Resend OTP"}
              </Text>
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
    backgroundColor: "#FDF7FF",
  },
  content: {
    flexGrow: 1,
    alignItems: "center",
  },
  header: {
    width: "100%",
    maxWidth: 430,
    paddingTop: 54,
    paddingHorizontal: 24,
    paddingBottom: 92,
    backgroundColor: "#6038B0",
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
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
    marginBottom: 28,
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
    color: colors.surface,
    fontSize: 31,
    lineHeight: 37,
    fontWeight: "900",
    letterSpacing: 0,
  },
  subtitle: {
    color: "rgba(255,255,255,0.82)",
    fontSize: 14,
    lineHeight: 21,
    fontWeight: "600",
    marginTop: 12,
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
    marginBottom: 12,
  },
  devText: {
    color: colors.primary,
    backgroundColor: "#EEE7FA",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 12,
    fontWeight: "900",
    marginBottom: 18,
  },
  otpRow: {
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    marginBottom: 18,
  },
  otpBox: {
    width: 45,
    height: 56,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8F1FF",
    borderWidth: 1.5,
    borderColor: "#E7DFF2",
  },
  otpBoxFocused: {
    borderColor: "#6038B0",
    backgroundColor: colors.surface,
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
  verifyButton: {
    minHeight: 58,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    backgroundColor: "#6038B0",
    shadowColor: "#6038B0",
    shadowOpacity: 0.28,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 11 },
    elevation: 7,
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
    justifyContent: "space-between",
    gap: 12,
    marginTop: 18,
  },
  timerText: {
    flex: 1,
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "700",
  },
  resendText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: "900",
  },
  resendTextDisabled: {
    color: colors.textMuted,
  },
});
