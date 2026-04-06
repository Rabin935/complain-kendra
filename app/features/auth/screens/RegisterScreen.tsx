import { Alert } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import AuthForm from "../components/AuthForm";
import { useAuth } from "../context/AuthContext";
import type { AuthFormValues, AuthStackParamList } from "../types/auth.types";

type RegisterScreenProps = NativeStackScreenProps<AuthStackParamList, "Register">;

export default function RegisterScreen({ navigation }: RegisterScreenProps) {
  const { register, loading } = useAuth();

  async function handleRegister(values: AuthFormValues): Promise<void> {
    try {
      await register({
        name: values.name,
        email: values.email,
        password: values.password,
        phone: values.phone || undefined,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to create your account right now.";
      Alert.alert("Registration failed", message);
      throw error;
    }
  }

  return (
    <AuthForm
      mode="register"
      loading={loading}
      onSubmit={handleRegister}
      onToggleMode={() => navigation.navigate("Login")}
    />
  );
}
