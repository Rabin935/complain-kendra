import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import GoogleWebAuthProvider from "./app/features/auth/providers/GoogleWebAuthProvider";
import { AuthProvider } from "./app/features/auth/context/AuthContext";
import { RealtimeProvider } from "./app/features/realtime/context/RealtimeContext";
import AppNavigator from "./app/navigation/AppNavigator";

export default function App() {
  return (
    <SafeAreaProvider>
      <GoogleWebAuthProvider>
        <AuthProvider>
          <RealtimeProvider>
            <StatusBar style="dark" />
            <AppNavigator />
          </RealtimeProvider>
        </AuthProvider>
      </GoogleWebAuthProvider>
    </SafeAreaProvider>
  );
}
