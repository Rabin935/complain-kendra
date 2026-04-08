import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "../../../constants/colors";
import { useAuth } from "../../auth/context/AuthContext";

export default function ProfileScreen() {
  const { user, logout, loading } = useAuth();

  // Get initials from user name
  const getInitials = (name: string | undefined): string => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleMenuItem = (action: string) => {
    switch (action) {
      case "complaints":
        break;
      case "notifications":
        break;
      case "language":
        break;
      case "logout":
        void logout();
        break;
    }
  };

  return (
    <SafeAreaView edges={["top"]} style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollView}>
        {/* Profile Header Card */}
        <View style={styles.profileHeader}>
          {/* Avatar */}
          <View style={styles.avatar}>
            {user?.avatarUrl ? (
              <Image source={{ uri: user.avatarUrl }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarText}>{getInitials(user?.name)}</Text>
            )}
          </View>

          {/* User Info */}
          <Text style={styles.userName}>{user?.name ?? "Citizen"}</Text>
          <Text style={styles.userSubtitle}>{user?.email ?? "Signed in citizen"}</Text>

          {/* Stats Section */}
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>5</Text>
              <Text style={styles.statLabel}>Complaints</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>3</Text>
              <Text style={styles.statLabel}>Resolved</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>42</Text>
              <Text style={styles.statLabel}>Upvotes given</Text>
            </View>
          </View>

          {/* Badge */}
          <View style={styles.badgeContainer}>
            <Text style={styles.badgeTitle}>Community Champion</Text>
            <Text style={styles.badgeDescription}>You're in the top 5% of reporters in your ward!</Text>
          </View>
        </View>

        {/* Menu Items */}
        <Pressable
          style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed]}
          onPress={() => handleMenuItem("complaints")}
        >
          <View style={styles.menuContent}>
            <MaterialCommunityIcons name="clipboard-outline" size={18} color={colors.text} />
            <Text style={styles.menuTitle}>My complaints</Text>
          </View>
          <Text style={styles.menuArrow}>›</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed]}
          onPress={() => handleMenuItem("notifications")}
        >
          <View style={styles.menuContent}>
            <MaterialCommunityIcons name="bell-outline" size={18} color={colors.text} />
            <Text style={styles.menuTitle}>Notifications</Text>
          </View>
          <Text style={styles.menuArrow}>›</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed]}
          onPress={() => handleMenuItem("language")}
        >
          <View style={styles.menuContent}>
            <MaterialCommunityIcons name="earth" size={18} color={colors.text} />
            <Text style={styles.menuTitle}>Language</Text>
          </View>
          <Text style={styles.menuArrow}>›</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.menuItem,
            styles.menuItemLast,
            pressed && styles.menuItemPressed,
          ]}
          onPress={() => handleMenuItem("logout")}
          disabled={loading}
        >
          <View style={styles.menuContent}>
            <MaterialCommunityIcons name="logout" size={18} color={colors.error} />
            <Text style={[styles.menuTitle, styles.menuTitleError]}>
              {loading ? "Signing out..." : "Sign out"}
            </Text>
          </View>
          <Text style={[styles.menuArrow, styles.menuArrowError]}>›</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  profileHeader: {
    alignItems: "center",
    paddingTop: 20,
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#E6F1FB",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
    overflow: "hidden",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  avatarText: {
    fontSize: 22,
    fontWeight: "500",
    color: "#185FA5",
  },
  userName: {
    fontSize: 16,
    fontWeight: "500",
    color: colors.text,
  },
  userSubtitle: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  statsContainer: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "center",
    gap: 20,
    marginTop: 14,
  },
  statItem: {
    alignItems: "center",
  },
  statValue: {
    fontSize: 18,
    fontWeight: "500",
    color: colors.text,
  },
  statLabel: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  badgeContainer: {
    marginTop: 8,
    marginHorizontal: 12,
    backgroundColor: "#EAF3DE",
    borderWidth: 0.5,
    borderColor: "#C0DD97",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  badgeTitle: {
    fontSize: 12,
    fontWeight: "500",
    color: "#27500A",
  },
  badgeDescription: {
    fontSize: 11,
    color: "#3B6D11",
    marginTop: 3,
  },
  menuItem: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  menuItemLast: {
    borderBottomWidth: 0,
  },
  menuItemPressed: {
    opacity: 0.7,
  },
  menuContent: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  menuTitle: {
    fontSize: 14,
    color: colors.text,
  },
  menuTitleError: {
    color: colors.error,
  },
  menuArrow: {
    fontSize: 12,
    color: colors.textMuted,
  },
  menuArrowError: {
    color: colors.error,
  },
});
