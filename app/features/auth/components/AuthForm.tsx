import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useState } from "react";
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
import type { AuthFormProps, AuthFormValues } from "../types/auth.types";

const initialValues: AuthFormValues = {
  name: "",
  email: "",
  password: "",
  phone: "",
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function AuthForm({
  mode,
  loading,
  errorMessage,
  onSubmit,
  onToggleMode,
  onForgotPassword,
  onGoogleSignIn,
  googleSignInHint,
}: AuthFormProps) {
  const [values, setValues] = useState<AuthFormValues>(initialValues);
  const [validationError, setValidationError] = useState<string | null>(null);

  const isRegisterMode = mode === "register";
  const title = isRegisterMode ? "Create your account" : "Welcome back";
  const subtitle = isRegisterMode
    ? "Report local issues faster with a secure citizen account."
    : "Sign in to continue tracking and submitting complaints.";
  const submitLabel = isRegisterMode ? "Sign Up" : "Login";
  const footerLabel = isRegisterMode
    ? "Already have an account?"
    : "Don't have an account?";
  const footerAction = isRegisterMode ? "Login" : "Create one";
  const showGoogleButton = Boolean(onGoogleSignIn);

  function updateField(field: keyof AuthFormValues, value: string) {
    setValidationError(null);
    setValues((currentValues) => ({
      ...currentValues,
      [field]: value,
    }));
  }

  async function handleSubmit() {
    const nextValues: AuthFormValues = {
      name: values.name.trim(),
      email: values.email.trim().toLowerCase(),
      password: values.password,
      phone: values.phone.trim(),
    };

    if (isRegisterMode && !nextValues.name) {
      setValidationError("Name is required.");
      return;
    }

    if (!nextValues.email) {
      setValidationError("Email is required.");
      return;
    }

    if (!emailPattern.test(nextValues.email)) {
      setValidationError("Enter a valid email address.");
      return;
    }

    if (!nextValues.password) {
      setValidationError("Password is required.");
      return;
    }

    if (nextValues.password.length < 6) {
      setValidationError("Password must be at least 6 characters.");
      return;
    }

    await onSubmit(nextValues);
  }

  const combinedError = validationError ?? errorMessage;

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
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
          </View>

          {combinedError ? <Text style={styles.errorText}>{combinedError}</Text> : null}

          {showGoogleButton ? (
            <>
              <Pressable
                onPress={() => {
                  setValidationError(null);
                  void onGoogleSignIn?.().catch(() => undefined);
                }}
                disabled={loading}
                style={({ pressed }) => [
                  styles.googleButton,
                  pressed && !loading ? styles.googleButtonPressed : null,
                  loading ? styles.googleButtonDisabled : null,
                ]}
              >
                {loading ? (
                  <ActivityIndicator color={colors.text} />
                ) : (
                  <>
                    <MaterialCommunityIcons name="google" size={18} color={colors.text} />
                    <Text style={styles.googleButtonText}>Continue with Google</Text>
                  </>
                )}
              </Pressable>

              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or continue with email</Text>
                <View style={styles.dividerLine} />
              </View>
            </>
          ) : null}

          {googleSignInHint ? <Text style={styles.helperText}>{googleSignInHint}</Text> : null}

          {isRegisterMode ? (
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Full Name</Text>
              <TextInput
                value={values.name}
                onChangeText={(value) => updateField("name", value)}
                placeholder="Enter your full name"
                placeholderTextColor={colors.textMuted}
                style={styles.input}
                autoCapitalize="words"
                textContentType="name"
              />
            </View>
          ) : null}

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              value={values.email}
              onChangeText={(value) => updateField("email", value)}
              placeholder="you@example.com"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              textContentType="emailAddress"
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              value={values.password}
              onChangeText={(value) => updateField("password", value)}
              placeholder="Enter your password"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
              secureTextEntry
              textContentType={isRegisterMode ? "newPassword" : "password"}
            />
          </View>

          {isRegisterMode ? (
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Phone Number</Text>
              <TextInput
                value={values.phone}
                onChangeText={(value) => updateField("phone", value)}
                placeholder="Optional phone number"
                placeholderTextColor={colors.textMuted}
                style={styles.input}
                keyboardType="phone-pad"
                textContentType="telephoneNumber"
              />
            </View>
          ) : null}

          {!isRegisterMode && onForgotPassword ? (
            <Pressable onPress={onForgotPassword} style={styles.forgotPassword}>
              <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
            </Pressable>
          ) : null}

          <Pressable
            onPress={() => {
              void handleSubmit().catch(() => undefined);
            }}
            disabled={loading}
            style={({ pressed }) => [
              styles.submitButton,
              pressed && !loading ? styles.submitButtonPressed : null,
              loading ? styles.submitButtonDisabled : null,
            ]}
          >
            {loading ? (
              <ActivityIndicator color={colors.surface} />
            ) : (
              <Text style={styles.submitButtonText}>{submitLabel}</Text>
            )}
          </Pressable>

          <View style={styles.footer}>
            <Text style={styles.footerText}>{footerLabel}</Text>
            <Pressable onPress={onToggleMode}>
              <Text style={styles.footerLink}>{footerAction}</Text>
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
    marginBottom: 18,
    fontSize: 14,
  },
  googleButton: {
    minHeight: 54,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  googleButtonPressed: {
    opacity: 0.94,
  },
  googleButtonDisabled: {
    opacity: 0.7,
  },
  googleButtonText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "700",
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 18,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  helperText: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 18,
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
  forgotPassword: {
    alignSelf: "flex-end",
    marginBottom: 18,
  },
  forgotPasswordText: {
    color: colors.primaryDark,
    fontSize: 13,
    fontWeight: "700",
  },
  submitButton: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingVertical: 16,
    marginTop: 4,
  },
  submitButtonPressed: {
    opacity: 0.92,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: colors.surface,
    fontSize: 16,
    fontWeight: "800",
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
