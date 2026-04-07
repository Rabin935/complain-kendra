import { DefaultTheme, NavigationContainer } from "@react-navigation/native";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { colors } from "../constants/colors";
import { useAuth } from "../features/auth/context/AuthContext";
import AuthNavigator from "../features/auth/navigation/AuthNavigator";
import UserNavigator from "../features/user/navigation/UserNavigator";

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

export default function AppNavigator() {
  const { token, initializing } = useAuth();

  if (initializing) {
    return <LoadingScreen />;
  }

  return (
    <NavigationContainer theme={navigationTheme}>
      {token ? <UserNavigator /> : <AuthNavigator />}
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
});
