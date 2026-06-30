import { DefaultTheme, NavigationContainer } from "@react-navigation/native";
import { useEffect, useRef, useState } from "react";
import { colors } from "../constants/colors";
import StartupSplashScreen from "../components/StartupSplashScreen";
import { useAuth } from "../features/auth/context/AuthContext";
import AuthNavigator from "../features/auth/navigation/AuthNavigator";
import OfficerNavigator from "../features/officer/navigation/OfficerNavigator";
import UserNavigator from "../features/user/navigation/UserNavigator";

const MIN_SPLASH_DURATION_MS = 1500;

const navigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.background,
    card: colors.surface,
    border: colors.border,
    primary: colors.primary,
    text: colors.text,
  },
};

export default function AppNavigator() {
  const { token, initializing, user } = useAuth();
  const [showSplash, setShowSplash] = useState(true);
  const splashStartedAt = useRef(Date.now());
  const isAuthenticated = Boolean(token);
  const navigatorKey = isAuthenticated ? "main-app" : "auth-flow";
  const isOfficerConsole =
    user?.role === "officer" || user?.role === "supervisor" || user?.role === "admin";

  useEffect(() => {
    if (initializing) {
      return;
    }

    const elapsed = Date.now() - splashStartedAt.current;
    const remainingTime = Math.max(MIN_SPLASH_DURATION_MS - elapsed, 0);
    const timeoutId = setTimeout(() => {
      setShowSplash(false);
    }, remainingTime);

    return () => clearTimeout(timeoutId);
  }, [initializing]);

  if (showSplash) {
    return (
      <StartupSplashScreen
        message={
          initializing
            ? "Checking your saved session..."
            : "Opening your complaint dashboard..."
        }
      />
    );
  }

  return (
    <NavigationContainer key={navigatorKey} theme={navigationTheme}>
      {isAuthenticated ? (
        isOfficerConsole ? (
          <OfficerNavigator key="officer-app" />
        ) : (
          <UserNavigator key="main-app" />
        )
      ) : (
        <AuthNavigator flowKey={navigatorKey} />
      )}
    </NavigationContainer>
  );
}
