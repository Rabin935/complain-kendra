import { Text } from "@/src/theme/typography";
import {
  createBottomTabNavigator,
  type BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { NavigationProp,
  useNavigation } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { LinearGradient } from "expo-linear-gradient";
import { Pressable,
  StyleSheet,
  View,
} from "react-native";
import { colors } from "../../../constants/colors";
import ComplaintDetailScreen from "../../complaints/screens/ComplaintDetailScreen";
import MyComplaintsScreen from "../../complaints/screens/MyComplaintsScreen";
import RateResolutionScreen from "../../complaints/screens/RateResolutionScreen";
import UserTabIcon from "../components/UserTabIcon";
import BrowseScreen from "../screens/BrowseScreen";
import ChangePasswordScreen from "../screens/ChangePasswordScreen";
import EditProfileScreen from "../screens/EditProfileScreen";
import HelpSupportScreen from "../screens/HelpSupportScreen";
import HomeScreen from "../screens/HomeScreen";
import LanguageSettingsScreen from "../screens/LanguageSettingsScreen";
import LeaderboardScreen from "../screens/LeaderboardScreen";
import NotificationScreen from "../screens/NotificationScreen";
import ProfileScreen from "../screens/ProfileScreen";
import ReportScreen from "../screens/ReportScreen";
import SavedIssuesScreen from "../screens/SavedIssuesScreen";
import SettingsScreen from "../screens/SettingsScreen";
import type { UserStackParamList, UserTabParamList } from "../types/user.types";

const Tabs = createBottomTabNavigator<UserTabParamList>();
const Stack = createNativeStackNavigator<UserStackParamList>();

const tabConfig: Record<
  keyof UserTabParamList,
  {
    label: string;
    icon: string;
  }
> = {
  Home: {
    label: "Home",
    icon: "home-variant-outline",
  },
  Notifications: {
    label: "Notifications",
    icon: "bell-outline",
  },
  Mine: {
    label: "Mine",
    icon: "clipboard-text-clock-outline",
  },
  Browse: {
    label: "Browse",
    icon: "web",
  },
  Profile: {
    label: "Profile",
    icon: "account",
  },
};

function UserTabBar({ state, navigation }: BottomTabBarProps) {
  const stackNavigation = useNavigation<NavigationProp<UserStackParamList>>();
  const activeRouteName = state.routes[state.index]?.name;

  function openTab(routeName: keyof UserTabParamList, routeKey: string, focused: boolean) {
    const event = navigation.emit({
      type: "tabPress",
      target: routeKey,
      canPreventDefault: true,
    });

    if (!focused && !event.defaultPrevented) {
      navigation.navigate(routeName);
    }
  }

  function renderTab(routeName: "Home" | "Mine" | "Browse" | "Profile") {
    const route = state.routes.find((item) => item.name === routeName);

    if (!route) {
      return null;
    }

    const currentTab = tabConfig[routeName];
    const focused =
      activeRouteName === routeName ||
      (activeRouteName === "Notifications" && routeName === "Home");
    const routeIsActive = activeRouteName === routeName;

    return (
      <Pressable
        key={route.key}
        accessibilityRole="button"
        accessibilityState={focused ? { selected: true } : {}}
        style={({ pressed }) => [styles.tabButton, pressed ? styles.tabButtonPressed : null]}
        onPress={() => openTab(routeName, route.key, routeIsActive)}
      >
        <UserTabIcon icon={currentTab.icon} focused={focused} />
        <Text style={[styles.tabBarLabel, focused ? styles.tabBarLabelFocused : null]}>
          {currentTab.label}
        </Text>
        {focused ? <View style={styles.tabActiveDot} /> : null}
      </Pressable>
    );
  }

  return (
    <View style={styles.tabBar}>
      {renderTab("Home")}
      {renderTab("Mine")}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Create report"
        style={({ pressed }) => [styles.createSlot, pressed ? styles.createButtonPressed : null]}
        onPress={() => stackNavigation.navigate("Report")}
      >
        <LinearGradient
          colors={[colors.primaryMid, colors.primary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.createButton}
        >
          <MaterialCommunityIcons name="plus" size={28} color={colors.surface} />
        </LinearGradient>
      </Pressable>
      {renderTab("Browse")}
      {renderTab("Profile")}
    </View>
  );
}

function UserTabs() {
  return (
    <View style={styles.tabsRoot}>
      <Tabs.Navigator
        tabBar={(props) => <UserTabBar {...props} />}
        screenOptions={({ route }) => {
          return {
            headerShown: false,
            tabBarHideOnKeyboard: true,
            sceneStyle: styles.scene,
          };
        }}
      >
        <Tabs.Screen name="Home" component={HomeScreen} />
        <Tabs.Screen name="Notifications" component={NotificationScreen} />
        <Tabs.Screen name="Mine" component={MyComplaintsScreen} />
        <Tabs.Screen name="Browse" component={BrowseScreen} />
        <Tabs.Screen name="Profile" component={ProfileScreen} />
      </Tabs.Navigator>
    </View>
  );
}

export default function UserNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainTabs" component={UserTabs} />
      <Stack.Screen
        name="Report"
        component={ReportScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} />
      <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
      <Stack.Screen name="LanguageSettings" component={LanguageSettingsScreen} />
      <Stack.Screen name="HelpSupport" component={HelpSupportScreen} />
      <Stack.Screen name="Leaderboard" component={LeaderboardScreen} />
      <Stack.Screen name="SavedIssues" component={SavedIssuesScreen} />
      <Stack.Screen name="RateResolution" component={RateResolutionScreen} />
      <Stack.Screen name="ComplaintDetail" component={ComplaintDetailScreen} />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  tabsRoot: {
    flex: 1,
  },
  scene: {
    backgroundColor: colors.background,
  },
  tabBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 92,
    paddingTop: 12,
    paddingBottom: 10,
    paddingHorizontal: 0,
    borderTopWidth: 1,
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
    shadowColor: colors.primaryDeep,
    shadowOpacity: 0.08,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: -10 },
    elevation: 12,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  tabButton: {
    flex: 1,
    minHeight: 62,
    alignItems: "center",
    justifyContent: "flex-start",
  },
  tabButtonPressed: {
    opacity: 0.72,
  },
  tabBarLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: "700",
    marginTop: 4,
  },
  tabBarLabelFocused: {
    color: colors.primary,
  },
  tabActiveDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginTop: 2,
    backgroundColor: colors.primary,
  },
  createSlot: {
    flex: 1,
    minHeight: 62,
    alignItems: "center",
  },
  createButton: {
    marginTop: -28,
    width: 60,
    height: 60,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
    shadowColor: colors.primaryDeep,
    shadowOpacity: 0.28,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 16,
  },
  createButtonPressed: {
    opacity: 0.86,
    transform: [{ scale: 0.98 }],
  },
});
