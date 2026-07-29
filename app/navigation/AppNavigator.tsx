import { DefaultTheme, NavigationContainer } from "@react-navigation/native";
import { Suspense, lazy, useEffect, useState } from "react";
import { colors } from "../constants/colors";
import StartupSplashScreen from "../components/StartupSplashScreen";
import { useAuth } from "../features/auth/context/AuthContext";
import { useTranslation } from "../i18n/LanguageContext";

const AuthNavigator = lazy(() => import("../features/auth/navigation/AuthNavigator"));
const OfficerNavigator = lazy(() => import("../features/officer/navigation/OfficerNavigator"));
const UserNavigator = lazy(() => import("../features/user/navigation/UserNavigator"));

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
  const { t } = useTranslation("shell");
  const { token, initializing, user } = useAuth();
  const [navigatorReady, setNavigatorReady] = useState(false);
  const isAuthenticated = Boolean(token);
  const navigatorKey = isAuthenticated ? "main-app" : "auth-flow";
  const isOfficerConsole =
    user?.role === "officer" || user?.role === "supervisor" || user?.role === "admin";

  // Preload only the navigator we need so the first paint is smaller/faster after QR scan.
  useEffect(() => {
    if (initializing) {
      setNavigatorReady(false);
      return;
    }

    let cancelled = false;

    async function preloadNavigator() {
      try {
        if (isAuthenticated) {
          if (isOfficerConsole) {
            await import("../features/officer/navigation/OfficerNavigator");
          } else {
            await import("../features/user/navigation/UserNavigator");
          }
        } else {
          await import("../features/auth/navigation/AuthNavigator");
        }
      } finally {
        if (!cancelled) {
          setNavigatorReady(true);
        }
      }
    }

    void preloadNavigator();

    return () => {
      cancelled = true;
    };
  }, [initializing, isAuthenticated, isOfficerConsole]);

  if (initializing || !navigatorReady) {
    return (
      <StartupSplashScreen
        message={initializing ? t("checkingSession") : t("openingDashboard")}
      />
    );
  }

  return (
    <Suspense
      fallback={<StartupSplashScreen message={t("openingDashboard")} />}
    >
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
    </Suspense>
  );
}
