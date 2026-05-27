import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { StyleSheet, Text, View } from "react-native";
import { colors } from "../../../constants/colors";
import MyComplaintsScreen from "../../complaints/screens/MyComplaintsScreen";
import UserTabIcon from "../components/UserTabIcon";
import BrowseScreen from "../screens/BrowseScreen";
import HomeScreen from "../screens/HomeScreen";
import ProfileScreen from "../screens/ProfileScreen";
import ReportScreen from "../screens/ReportScreen";
import type { UserTabParamList } from "../types/user.types";

const Tabs = createBottomTabNavigator<UserTabParamList>();

const tabConfig: Record<
  keyof UserTabParamList,
  {
    label: string;
    icon: string;
    emphasized?: boolean;
  }
> = {
  Home: {
    label: "Home",
    icon: "home-variant-outline",
  },
  Mine: {
    label: "Mine",
    icon: "clipboard-text-clock-outline",
  },
  Report: {
    label: "",
    icon: "plus",
    emphasized: true,
  },
  Browse: {
    label: "Browse",
    icon: "map-search-outline",
  },
  Profile: {
    label: "Profile",
    icon: "account-outline",
  },
};

export default function UserNavigator() {
  return (
    <Tabs.Navigator
      screenOptions={({ route }) => {
        const currentTab = tabConfig[route.name];

        return {
          headerShown: false,
          tabBarHideOnKeyboard: true,
          sceneStyle: styles.scene,
          tabBarStyle: styles.tabBar,
          tabBarItemStyle: styles.tabBarItem,
          tabBarLabel: ({ focused }) => (
            currentTab.emphasized ? (
              <View style={styles.centerSpacer} />
            ) : (
              <Text style={[styles.tabBarLabel, focused ? styles.tabBarLabelFocused : null]}>
                {currentTab.label}
              </Text>
            )
          ),
          tabBarIcon: ({ focused }) => (
            <UserTabIcon
              icon={currentTab.icon}
              focused={focused}
              emphasized={currentTab.emphasized}
            />
          ),
        };
      }}
    >
      <Tabs.Screen name="Home" component={HomeScreen} />
      <Tabs.Screen name="Mine" component={MyComplaintsScreen} />
      <Tabs.Screen name="Report" component={ReportScreen} />
      <Tabs.Screen name="Browse" component={BrowseScreen} />
      <Tabs.Screen name="Profile" component={ProfileScreen} />
    </Tabs.Navigator>
  );
}

const styles = StyleSheet.create({
  scene: {
    backgroundColor: colors.background,
  },
  tabBar: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 10,
    height: 78,
    paddingTop: 10,
    paddingBottom: 12,
    borderTopWidth: 0,
    borderRadius: 28,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.primaryDeep,
    shadowOpacity: 0.16,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 14 },
    elevation: 18,
  },
  tabBarItem: {
    paddingVertical: 4,
  },
  tabBarLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "700",
    marginTop: 4,
  },
  tabBarLabelFocused: {
    color: colors.primary,
  },
  centerSpacer: {
    height: 12,
  },
});
