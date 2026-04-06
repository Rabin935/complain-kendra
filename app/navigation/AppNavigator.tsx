import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "../constants/colors";
import { useAuth } from "../features/auth/context/AuthContext";
import AuthNavigator from "../features/auth/navigation/AuthNavigator";
import type { MainTabParamList } from "../features/auth/types/auth.types";

const MainTabs = createBottomTabNavigator<MainTabParamList>();

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

function LoadingScreen() {
  return (
    <View style={styles.loadingScreen}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={styles.loadingText}>Loading your session...</Text>
    </View>
  );
}

function HomeScreen() {
  const { user, logout, loading } = useAuth();

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.homeWrapper}>
        <View style={styles.heroCard}>
          <Text style={styles.heroEyebrow}>Complain-kendra</Text>
          <Text style={styles.heroTitle}>Welcome to Complain-kendra</Text>
          <Text style={styles.heroText}>
            {user?.name
              ? `Signed in as ${user.name}. You are ready to report and track local issues.`
              : "Your citizen dashboard will appear here once the core complaint flow is ready."}
          </Text>
          <Pressable
            onPress={() => {
              void logout();
            }}
            disabled={loading}
            style={({ pressed }) => [
              styles.logoutButton,
              pressed && !loading ? styles.logoutButtonPressed : null,
            ]}
          >
            <Text style={styles.logoutButtonText}>{loading ? "Signing out..." : "Logout"}</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

function MainNavigator() {
  return (
    <MainTabs.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: styles.tabBar,
      }}
    >
      <MainTabs.Screen name="Home" component={HomeScreen} />
    </MainTabs.Navigator>
  );
}

export default function AppNavigator() {
  const { token, initializing } = useAuth();

  if (initializing) {
    return <LoadingScreen />;
  }

  return (
    <NavigationContainer theme={navigationTheme}>
      {token ? <MainNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingScreen: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.background,
    gap: 12,
  },
  loadingText: {
    color: colors.textMuted,
    fontSize: 15,
    fontWeight: "600",
  },
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  homeWrapper: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
  },
  heroCard: {
    backgroundColor: colors.surface,
    borderRadius: 28,
    padding: 28,
    shadowColor: colors.shadow,
    shadowOpacity: 1,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 16 },
    elevation: 8,
  },
  heroEyebrow: {
    alignSelf: "flex-start",
    backgroundColor: colors.primaryLight,
    color: colors.primaryDark,
    borderRadius: 999,
    overflow: "hidden",
    paddingHorizontal: 12,
    paddingVertical: 6,
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 14,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: colors.text,
    marginBottom: 12,
  },
  heroText: {
    fontSize: 16,
    lineHeight: 24,
    color: colors.textMuted,
    marginBottom: 24,
  },
  logoutButton: {
    alignSelf: "flex-start",
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  logoutButtonPressed: {
    opacity: 0.9,
  },
  logoutButtonText: {
    color: colors.surface,
    fontSize: 15,
    fontWeight: "800",
  },
  tabBar: {
    height: 68,
    paddingBottom: 10,
    paddingTop: 10,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
});
