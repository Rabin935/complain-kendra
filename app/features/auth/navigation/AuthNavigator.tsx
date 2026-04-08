import { createNativeStackNavigator } from "@react-navigation/native-stack";
import LoginScreen from "../screens/LoginScreen";
import RegisterScreen from "../screens/RegisterScreen";
import type { AuthStackParamList } from "../types/auth.types";

const Stack = createNativeStackNavigator<AuthStackParamList>();

interface AuthNavigatorProps {
  flowKey?: string;
}

export default function AuthNavigator({ flowKey = "auth-flow" }: AuthNavigatorProps) {
  return (
    <Stack.Navigator
      key={flowKey}
      initialRouteName="Login"
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
      }}
    >
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
  );
}
