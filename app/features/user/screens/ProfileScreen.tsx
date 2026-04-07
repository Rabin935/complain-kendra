import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "../../../constants/colors";
import { useAuth } from "../../auth/context/AuthContext";
import DashboardScaffold from "../components/DashboardScaffold";

export default function ProfileScreen() {
  const { user, logout, loading } = useAuth();

  return (
    <DashboardScaffold
      badge="Profile"
      title={user?.name ?? "Citizen account"}
      description="Keep account information visible and easy to manage so users always know which email and role are attached to their complaints."
      sectionTitle="Account overview"
      sectionDescription="Your details and sign-out action stay in one place for a cleaner user experience."
      metrics={[
        {
          label: "Role",
          value: user?.role === "admin" ? "Admin" : "User",
          caption: "Current access level for this account.",
        },
        {
          label: "Status",
          value: "Active",
          caption: "The account is ready to submit and track complaints.",
        },
      ]}
      shortcuts={[
        {
          title: user?.email ?? "No email found",
          description: "Primary email used for login and future notification updates.",
          icon: "email-outline",
          tone: "neutral",
        },
        {
          title: user?.phone ?? "Phone not added yet",
          description: "Optional contact number for complaint follow-up when needed.",
          icon: "phone-outline",
          tone: "primary",
        },
      ]}
      footer={
        <View style={styles.footerCard}>
          <Text style={styles.footerTitle}>Need to leave for now?</Text>
          <Text style={styles.footerText}>
            You can sign back in any time and continue from the same dashboard.
          </Text>
          <Pressable
            onPress={() => {
              void logout();
            }}
            disabled={loading}
            style={({ pressed }) => [
              styles.logoutButton,
              pressed && !loading ? styles.logoutButtonPressed : null,
              loading ? styles.logoutButtonDisabled : null,
            ]}
          >
            <Text style={styles.logoutButtonText}>{loading ? "Signing out..." : "Logout"}</Text>
          </Pressable>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  footerCard: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  footerTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 8,
  },
  footerText: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 18,
  },
  logoutButton: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingVertical: 15,
  },
  logoutButtonPressed: {
    opacity: 0.92,
  },
  logoutButtonDisabled: {
    opacity: 0.7,
  },
  logoutButtonText: {
    color: colors.surface,
    fontSize: 15,
    fontWeight: "800",
  },
});
