import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { StyleSheet, Text } from "react-native";
import { colors } from "../../../constants/colors";
import UserTabIcon from "../components/UserTabIcon";
import BrowseScreen from "../screens/BrowseScreen";
import HomeScreen from "../screens/HomeScreen";
import ProfileScreen from "../screens/ProfileScreen";
import ReportScreen from "../screens/ReportScreen";
import TrackScreen from "../screens/TrackScreen";
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
    icon: "view-grid-outline",
  },
  Browse: {
    label: "Browse",
    icon: "compass-outline",
  },
  Report: {
    label: "Report",
    icon: "plus",
    emphasized: true,
  },
  Track: {
    label: "Track",
    icon: "arrow-top-right",
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
            <Text style={[styles.tabBarLabel, focused ? styles.tabBarLabelFocused : null]}>
              {currentTab.label}
            </Text>
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
      <Tabs.Screen name="Browse" component={BrowseScreen} />
      <Tabs.Screen name="Report" component={ReportScreen} />
      <Tabs.Screen name="Track" component={TrackScreen} />
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
    bottom: 0,
    height: 80,
    paddingTop: 12,
    paddingBottom: 12,
    borderTopWidth: 0,
    borderRadius: 10,
    backgroundColor: "#18252F",
    shadowColor: "#08131C",
    shadowOpacity: 0.2,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 18 },
    elevation: 18,
  },
  tabBarItem: {
    paddingVertical: 4,
  },
  tabBarLabel: {
    color: "#91A8B6",
    fontSize: 11,
    fontWeight: "700",
    marginTop: 6,
  },
  tabBarLabelFocused: {
    color: colors.primaryLight,
  },
});
