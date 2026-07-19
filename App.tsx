import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import ErrorBoundary from "./app/components/ErrorBoundary";
import NetworkStatusBanner from "./app/components/NetworkStatusBanner";
import StartupSplashScreen from "./app/components/StartupSplashScreen";
import GoogleWebAuthProvider from "./app/features/auth/providers/GoogleWebAuthProvider";
import { AuthProvider } from "./app/features/auth/context/AuthContext";
import { RealtimeProvider } from "./app/features/realtime/context/RealtimeContext";
import AppNavigator from "./app/navigation/AppNavigator";

export default function App() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
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
