import * as Linking from "expo-linking";
import { useEffect, useState } from "react";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
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
import { useAuth } from "../context/AuthContext";
import type { AuthStackParamList } from "../types/auth.types";

type ResetPasswordScreenProps = NativeStackScreenProps<AuthStackParamList, "ResetPassword">;

function getTokenFromUrl(url: string | null): string | null {
  if (!url) {
    return null;
  }

  const parsedUrl = Linking.parse(url);
  const token = parsedUrl.queryParams?.token;

  if (typeof token === "string" && token.trim()) {
    return token.trim();
  }

  return null;
}

export default function ResetPasswordScreen({
  navigation,
  route,
}: ResetPasswordScreenProps) {
  const { resetPassword, loading } = useAuth();
  const [token, setToken] = useState(route.params?.token?.trim() ?? "");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const latestUrl = Linking.useURL();

  useEffect(() => {
    const deepLinkToken = getTokenFromUrl(latestUrl);
    const routeToken = route.params?.token?.trim();
    const nextToken = routeToken || deepLinkToken;

    if (nextToken) {
      setToken(nextToken);
    }
  }, [latestUrl, route.params?.token]);

  async function handleSubmit(): Promise<void> {
    const normalizedToken = token.trim();

    if (!normalizedToken) {
      setSuccessMessage(null);
      setErrorMessage("Reset token is required.");
      return;
    }

    if (!newPassword) {
      setSuccessMessage(null);
      setErrorMessage("New password is required.");
      return;
    }

    if (newPassword.length < 6) {
      setSuccessMessage(null);
      setErrorMessage("New password must be at least 6 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setSuccessMessage(null);
      setErrorMessage("Passwords do not match.");
      return;
    }

    setErrorMessage(null);

    try {
      const message = await resetPassword({
        token: normalizedToken,
        newPassword,
      });

      setSuccessMessage(message);
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to reset your password right now.";
      setSuccessMessage(null);
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
      >
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.badge}>Complain-kendra</Text>
            <Text style={styles.title}>Reset your password</Text>
            <Text style={styles.subtitle}>
              Paste the reset token from your email for now. Deep-link autofill will plug into
              this same screen later.
            </Text>
          </View>

          {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
          {successMessage ? <Text style={styles.successText}>{successMessage}</Text> : null}

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Reset Token</Text>
            <TextInput
              value={token}
              onChangeText={(value) => {
                setToken(value);
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              placeholder="Paste your reset token"
              placeholderTextColor={colors.textMuted}
              style={[styles.input, styles.tokenInput]}
              autoCapitalize="none"
              autoCorrect={false}
              multiline
              textAlignVertical="top"
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>New Password</Text>
            <TextInput
              value={newPassword}
              onChangeText={(value) => {
                setNewPassword(value);
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              placeholder="Enter your new password"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
              secureTextEntry
              textContentType="newPassword"
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Confirm Password</Text>
            <TextInput
              value={confirmPassword}
              onChangeText={(value) => {
                setConfirmPassword(value);
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              placeholder="Re-enter your new password"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
              secureTextEntry
              textContentType="password"
            />
          </View>

          <Pressable
            onPress={() => {
              void handleSubmit();
            }}
            disabled={loading}
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && !loading ? styles.primaryButtonPressed : null,
              loading ? styles.buttonDisabled : null,
            ]}
          >
            {loading ? (
              <ActivityIndicator color={colors.surface} />
            ) : (
              <Text style={styles.primaryButtonText}>Reset Password</Text>
            )}
          </Pressable>

          <Pressable
            onPress={() => navigation.replace("Login")}
            style={({ pressed }) => [
              styles.secondaryButton,
              pressed ? styles.secondaryButtonPressed : null,
            ]}
          >
            <Text style={styles.secondaryButtonText}>Back to Login</Text>
          </Pressable>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Need a new token?</Text>
            <Pressable onPress={() => navigation.navigate("ForgotPassword")}>
              <Text style={styles.footerLink}>Send another reset link</Text>
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
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 32,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 24,
    shadowColor: colors.shadow,
    shadowOpacity: 1,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 16 },
    elevation: 8,
  },
  header: {
    marginBottom: 24,
  },
  badge: {
    alignSelf: "flex-start",
    backgroundColor: colors.primaryLight,
    color: colors.primaryDark,
    borderRadius: 999,
    overflow: "hidden",
    paddingHorizontal: 12,
    paddingVertical: 6,
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 16,
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: "800",
    marginBottom: 10,
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
  },
  errorText: {
    color: colors.error,
    backgroundColor: "#FEF2F2",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 16,
    fontSize: 14,
  },
  successText: {
    color: colors.success,
    backgroundColor: "#F0FDF4",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 16,
    fontSize: 14,
  },
  fieldGroup: {
    marginBottom: 16,
  },
  label: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 15,
    fontSize: 16,
    color: colors.text,
    backgroundColor: "#FBFDFF",
  },
  tokenInput: {
    minHeight: 108,
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingVertical: 16,
    marginTop: 4,
  },
  primaryButtonPressed: {
    opacity: 0.92,
  },
  secondaryButton: {
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    paddingVertical: 15,
    marginTop: 12,
    backgroundColor: "#F9FBFC",
  },
  secondaryButtonPressed: {
    opacity: 0.94,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  primaryButtonText: {
    color: colors.surface,
    fontSize: 16,
    fontWeight: "800",
  },
  secondaryButtonText: {
    color: colors.primaryDark,
    fontSize: 15,
    fontWeight: "700",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    marginTop: 20,
  },
  footerText: {
    color: colors.textMuted,
    fontSize: 14,
  },
  footerLink: {
    color: colors.primaryDark,
    fontSize: 14,
    fontWeight: "800",
  },
});
