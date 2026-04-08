import { Alert } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import AuthForm from "../components/AuthForm";
import { useAuth } from "../context/AuthContext";
import type { AuthFormValues, AuthStackParamList } from "../types/auth.types";

type LoginScreenProps = NativeStackScreenProps<AuthStackParamList, "Login">;

export default function LoginScreen({ navigation }: LoginScreenProps) {
  const { login, signInWithGoogle, loading, googleSignInAvailable, googleSignInHint } =
    useAuth();

  async function handleLogin(values: AuthFormValues): Promise<void> {
    try {
      await login({
        email: values.email,
        password: values.password,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to login right now.";
      Alert.alert("Login failed", message);
      throw error;
    }
  }

  async function handleGoogleLogin(): Promise<void> {
    try {
      await signInWithGoogle();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to login with Google right now.";
      Alert.alert("Google Sign-In failed", message);
      throw error;
    }
  }

  return (
    <AuthForm
      mode="login"
      loading={loading}
      onSubmit={handleLogin}
      onGoogleSignIn={googleSignInAvailable ? handleGoogleLogin : undefined}
      googleSignInHint={googleSignInHint}
      googleNote="Or continue with Google"
      onToggleMode={() => navigation.navigate("Register")}
      onForgotPassword={() =>
        Alert.alert("Forgot Password", "Password recovery will be available soon.")
      }
    />
  );
}
