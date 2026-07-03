import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
  Inter_900Black,
  useFonts,
} from "@expo-google-fonts/inter";
import { StatusBar } from "expo-status-bar";
import { Text, TextInput } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import ErrorBoundary from "./app/components/ErrorBoundary";
import NetworkStatusBanner from "./app/components/NetworkStatusBanner";
import StartupSplashScreen from "./app/components/StartupSplashScreen";
import GoogleWebAuthProvider from "./app/features/auth/providers/GoogleWebAuthProvider";
import { AuthProvider } from "./app/features/auth/context/AuthContext";
import { RealtimeProvider } from "./app/features/realtime/context/RealtimeContext";
import AppNavigator from "./app/navigation/AppNavigator";

const AppText = Text as typeof Text & { defaultProps?: { style?: unknown } };
const AppTextInput = TextInput as typeof TextInput & { defaultProps?: { style?: unknown } };

const defaultTextProps = AppText.defaultProps ?? {};
AppText.defaultProps = {
  ...defaultTextProps,
  style: [defaultTextProps.style, { fontFamily: "Inter_400Regular" }],
};

const defaultTextInputProps = AppTextInput.defaultProps ?? {};
AppTextInput.defaultProps = {
  ...defaultTextInputProps,
  style: [defaultTextInputProps.style, { fontFamily: "Inter_400Regular" }],
};

export default function App() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
    Inter_900Black,
  });

  if (!fontsLoaded) {
    return <StartupSplashScreen message="Loading app fonts..." />;
  }

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <GoogleWebAuthProvider>
          <AuthProvider>
            <RealtimeProvider>
              <StatusBar style="dark" />
              <AppNavigator />
              <NetworkStatusBanner />
            </RealtimeProvider>
          </AuthProvider>
        </GoogleWebAuthProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
