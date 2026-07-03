import { createBottomTabNavigator, type BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { NavigationProp, useNavigation } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "../../../constants/colors";
import ComplaintDetailScreen from "../../complaints/screens/ComplaintDetailScreen";
import MyComplaintsScreen from "../../complaints/screens/MyComplaintsScreen";
import UserTabIcon from "../components/UserTabIcon";
import BrowseScreen from "../screens/BrowseScreen";
import HomeScreen from "../screens/HomeScreen";
import NotificationScreen from "../screens/NotificationScreen";
import ProfileScreen from "../screens/ProfileScreen";
import ReportScreen from "../screens/ReportScreen";
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

  return (
    <View style={styles.tabBar}>
      {state.routes.map((route, index) => {
        const routeName = route.name as keyof UserTabParamList;
        const currentTab = tabConfig[routeName];
        const focused = state.index === index;
        const item = (
          <Pressable
            key={route.key}
            accessibilityRole="button"
            accessibilityState={focused ? { selected: true } : {}}
            style={({ pressed }) => [styles.tabButton, pressed ? styles.tabButtonPressed : null]}
            onPress={() => openTab(routeName, route.key, focused)}
          >
            <UserTabIcon icon={currentTab.icon} focused={focused} />
            <Text style={[styles.tabBarLabel, focused ? styles.tabBarLabelFocused : null]}>
              {currentTab.label}
            </Text>
          </Pressable>
        );

        if (index === 2) {
          return (
            <View key={`${route.key}-with-create`} style={styles.tabPair}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Create report"
                style={({ pressed }) => [styles.createSlot, pressed ? styles.createButtonPressed : null]}
                onPress={() => stackNavigation.navigate("Report")}
              >
                <View style={styles.createButton}>
                  <MaterialCommunityIcons name="plus" size={31} color={colors.surface} />
                </View>
              </Pressable>
              {item}
            </View>
          );
        }

        return item;
      })}
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
        options={{
          headerShown: true,
          headerTitle: "Create Report",
          headerShadowVisible: false,
          headerStyle: {
            backgroundColor: colors.background,
          },
          headerTintColor: colors.primary,
          headerTitleStyle: {
            color: colors.text,
            fontSize: 16,
            fontWeight: "900",
          },
        }}
      />
      <Stack.Screen name="Notifications" component={NotificationScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
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
    height: 86,
    paddingTop: 9,
    paddingBottom: 10,
    paddingHorizontal: 16,
    borderTopWidth: 0,
    borderRadius: 0,
    backgroundColor: colors.surface,
    borderWidth: 0,
    borderColor: colors.border,
    shadowColor: colors.primaryDeep,
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: -8 },
    elevation: 18,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  tabButton: {
    width: "18%",
    minHeight: 62,
    alignItems: "center",
    justifyContent: "center",
  },
  tabButtonPressed: {
    opacity: 0.72,
  },
  tabPair: {
    width: "36%",
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
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
  createSlot: {
    width: "50%",
    minHeight: 62,
    alignItems: "center",
  },
  createButton: {
    marginTop: -33,
    width: 70,
    height: 70,
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
