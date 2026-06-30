import { MaterialCommunityIcons } from "@expo/vector-icons";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StyleSheet, Text, View } from "react-native";
import { colors } from "../../../constants/colors";
import OfficerAnalyticsScreen from "../screens/OfficerAnalyticsScreen";
import OfficerComplaintDetailScreen from "../screens/OfficerComplaintDetailScreen";
import OfficerDashboardScreen from "../screens/OfficerDashboardScreen";
import OfficerQueueScreen from "../screens/OfficerQueueScreen";
import OfficerSettingsScreen from "../screens/OfficerSettingsScreen";
import OfficerUserManagementScreen from "../screens/OfficerUserManagementScreen";
import type { OfficerTabParamList } from "../types/officer.types";

const Tabs = createBottomTabNavigator<OfficerTabParamList>();
const Stack = createNativeStackNavigator<any>();

const tabConfig: Record<
  keyof OfficerTabParamList,
  { label: string; icon: keyof typeof MaterialCommunityIcons.glyphMap }
> = {
  OfficerDashboard: { label: "Dash", icon: "view-dashboard-outline" },
  OfficerQueue: { label: "Queue", icon: "clipboard-list-outline" },
  OfficerAnalytics: { label: "Stats", icon: "chart-box-outline" },
  OfficerUsers: { label: "Users", icon: "account-group-outline" },
  OfficerSettings: { label: "Settings", icon: "cog-outline" },
};

function OfficerTabs() {
  return (
    <Tabs.Navigator
      screenOptions={({ route }) => {
        const config = tabConfig[route.name];

        return {
          headerShown: false,
          sceneStyle: styles.scene,
          tabBarStyle: styles.tabBar,
          tabBarLabel: ({ focused }) => (
            <Text style={[styles.tabLabel, focused ? styles.tabLabelFocused : null]}>
              {config.label}
            </Text>
          ),
          tabBarIcon: ({ focused }) => (
            <View style={[styles.iconShell, focused ? styles.iconShellFocused : null]}>
              <MaterialCommunityIcons
                name={config.icon}
                size={21}
                color={focused ? colors.surface : colors.textMuted}
              />
            </View>
          ),
        };
      }}
    >
      <Tabs.Screen name="OfficerDashboard" component={OfficerDashboardScreen} />
      <Tabs.Screen name="OfficerQueue" component={OfficerQueueScreen} />
      <Tabs.Screen name="OfficerAnalytics" component={OfficerAnalyticsScreen} />
      <Tabs.Screen name="OfficerUsers" component={OfficerUserManagementScreen} />
      <Tabs.Screen name="OfficerSettings" component={OfficerSettingsScreen} />
    </Tabs.Navigator>
  );
}

export default function OfficerNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="OfficerTabs" component={OfficerTabs} />
      <Stack.Screen name="OfficerComplaintDetail" component={OfficerComplaintDetailScreen} />
      <Stack.Screen name="OfficerUserDetail" component={OfficerUserManagementScreen} />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  scene: {
    backgroundColor: colors.background,
  },
  tabBar: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 24,
    borderTopWidth: 0,
    borderWidth: 1,
    bottom: 10,
    elevation: 18,
    height: 76,
    left: 16,
    paddingBottom: 12,
    paddingTop: 10,
    position: "absolute",
    right: 16,
    shadowColor: colors.primaryDeep,
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.14,
    shadowRadius: 22,
  },
  iconShell: {
    alignItems: "center",
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
    borderRadius: 20,
    borderWidth: 1,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  iconShellFocused: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  tabLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "800",
  },
  tabLabelFocused: {
    color: colors.primary,
  },
});
