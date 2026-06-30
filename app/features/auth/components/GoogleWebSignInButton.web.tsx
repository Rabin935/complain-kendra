import { GoogleLogin } from "@react-oauth/google";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { colors } from "../../../constants/colors";
import { getGoogleWebOrigin } from "../../../../src/features/auth/config/google.config";
import type { GoogleWebSignInButtonProps } from "./GoogleWebSignInButton";

export default function GoogleWebSignInButton({
  mode,
  loading,
  onSuccess,
  onError,
}: GoogleWebSignInButtonProps) {
  const currentOrigin = getGoogleWebOrigin();

  return (
    <View style={styles.container} pointerEvents={loading ? "none" : "auto"}>
      {loading ? (
        <View style={styles.loadingState}>
          <ActivityIndicator color={colors.primaryDark} />
          <Text style={styles.loadingText}>
            {mode === "register" ? "Connecting to Google..." : "Signing in with Google..."}
          </Text>
        </View>
      ) : (
        <>
          <GoogleLogin
            onSuccess={(credentialResponse) => {
              const credential = credentialResponse.credential;

              if (!credential) {
                onError("Google Sign-In completed, but no ID token was returned. Please try again.");
                return;
              }

              onSuccess(credential);
            }}
            onError={() => {
              onError(
                `Google Sign-In could not start. Add ${currentOrigin} to Google Cloud Console Authorized JavaScript origins and make sure EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID is a Web application client ID.`,
              );
            }}
            text={mode === "register" ? "signup_with" : "signin_with"}
            shape="pill"
            theme="outline"
            size="large"
            logo_alignment="left"
            ux_mode="popup"
          />
          <Text style={styles.helperText}>
            Web Google Sign-In uses a popup. In Google Cloud Console, add
            {` ${currentOrigin} to Authorized JavaScript origins and use a Google OAuth Web application client ID.`}
          </Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  loadingState: {
    minHeight: 54,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    width: "100%",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    backgroundColor: "#F9FBFC",
    paddingVertical: 14,
  },
  loadingText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "600",
  },
  helperText: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
  },
});
