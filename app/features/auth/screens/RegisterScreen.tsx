import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Alert } from "react-native";
import AuthForm from "../components/AuthForm";
import { useAuth } from "../context/AuthContext";
import type { AuthFormValues, AuthStackParamList } from "../types/auth.types";

type RegisterScreenProps = NativeStackScreenProps<AuthStackParamList, "Register">;

export default function RegisterScreen({ navigation }: RegisterScreenProps) {
  const { register, signInWithGoogle, loading, googleSignInHint } = useAuth();

  async function handleRegister(values: AuthFormValues): Promise<void> {
    try {
      const message = await register({
        name: values.name,
        email: values.email,
        password: values.password,
        phone: values.phone || undefined,
      });

      Alert.alert("Registration successful", message, [
        {
          text: "Go to Login",
          onPress: () => navigation.replace("Login"),
        },
      ]);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to create your account right now.";
      Alert.alert("Registration failed", message);
      throw error;
    }
  }

  async function handleGoogleRegister(idToken?: string): Promise<void> {
    try {
      await signInWithGoogle(idToken);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to continue with Google right now.";
      Alert.alert("Google Sign-In failed", message);
      throw error;
    }
  }

  return (
    <AuthForm
      mode="register"
      loading={loading}
      onSubmit={handleRegister}
      onGoogleSignIn={handleGoogleRegister}
      googleSignInHint={googleSignInHint}
      googleNote="Or continue with Google"
      onToggleMode={() => navigation.replace("Login")}
    />
  );
}
