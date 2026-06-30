import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useMemo } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "../../../constants/colors";
import { useDevConsole } from "../hooks/useDevConsole";
import type { DevConsoleTab } from "../types/devtools.types";
import {
  DevConsoleActionRow,
  DevConsoleButton,
  DevConsoleField,
  DevConsoleSection,
  DevConsoleSelect,
  DevConsoleToggle,
} from "../components/DevConsoleControls";

const tabs: Array<{ label: string; value: DevConsoleTab; icon: string }> = [
  { label: "Citizen", value: "citizen", icon: "account-key-outline" },
  { label: "Complaints", value: "complaints", icon: "clipboard-text-outline" },
  { label: "Profile", value: "profile", icon: "account-cog-outline" },
  { label: "Officer", value: "officer", icon: "shield-account-outline" },
  { label: "Output", value: "output", icon: "code-json" },
];

export default function DevConsoleScreen() {
  const consoleState = useDevConsole();
  const formattedOutput = useMemo(
    () => JSON.stringify(consoleState.response, null, 2),
    [consoleState.response],
  );

  if (consoleState.loadingSession) {
    return (
      <SafeAreaView edges={["top"]} style={styles.safeArea}>
        <View style={styles.loadingState}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.loadingText}>Restoring developer sessions...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>Developer Tools</Text>
          <Text style={styles.title}>Backend API Console</Text>
          <Text style={styles.description}>
            In-app test surface for citizen, complaint, profile, and officer endpoints.
          </Text>
        </View>

        <View
          style={[
            styles.statusBanner,
            consoleState.status.tone === "error"
              ? styles.statusBannerError
              : consoleState.status.tone === "success"
                ? styles.statusBannerSuccess
                : null,
          ]}
        >
          <MaterialCommunityIcons
            name={
              consoleState.status.tone === "error"
                ? "alert-circle-outline"
                : consoleState.status.tone === "success"
                  ? "check-circle-outline"
                  : "progress-clock"
            }
            size={18}
            color={
              consoleState.status.tone === "error"
                ? colors.error
                : consoleState.status.tone === "success"
                  ? colors.success
                  : colors.primary
            }
          />
          <Text style={styles.statusText}>{consoleState.status.message}</Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabRow}
        >
          {tabs.map((tab) => {
            const active = consoleState.activeTab === tab.value;

            return (
              <Pressable
                key={tab.value}
                onPress={() => consoleState.setActiveTab(tab.value)}
                style={[styles.tabButton, active ? styles.tabButtonActive : null]}
              >
                <MaterialCommunityIcons
                  name={tab.icon as keyof typeof MaterialCommunityIcons.glyphMap}
                  size={17}
                  color={active ? colors.surface : colors.primary}
                />
                <Text style={[styles.tabText, active ? styles.tabTextActive : null]}>
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {consoleState.activeTab === "citizen" ? (
          <>
            <DevConsoleSection title="Citizen Login">
              <DevConsoleField
                label="Email"
                value={consoleState.citizenLogin.email}
                onChangeText={(email) =>
                  consoleState.setCitizenLogin({
                    ...consoleState.citizenLogin,
                    email,
                  })
                }
              />
              <DevConsoleField
                label="Password"
                value={consoleState.citizenLogin.password}
                onChangeText={(password) =>
                  consoleState.setCitizenLogin({
                    ...consoleState.citizenLogin,
                    password,
                  })
                }
                secureTextEntry
              />
              <DevConsoleActionRow>
                <DevConsoleButton
                  label="Login"
                  onPress={consoleState.actions.citizenLoginAction}
                />
                <DevConsoleButton
                  label="Refresh"
                  tone="secondary"
                  onPress={consoleState.actions.citizenRefreshAction}
                />
                <DevConsoleButton
                  label="Logout"
                  tone="secondary"
                  onPress={consoleState.actions.citizenLogoutAction}
                />
              </DevConsoleActionRow>
            </DevConsoleSection>

            <DevConsoleSection title="Citizen Register">
              <DevConsoleField
                label="Name"
                value={consoleState.citizenRegister.name}
                onChangeText={(name) =>
                  consoleState.setCitizenRegister({
                    ...consoleState.citizenRegister,
                    name,
                  })
                }
              />
              <DevConsoleField
                label="Email"
                value={consoleState.citizenRegister.email}
                onChangeText={(email) =>
                  consoleState.setCitizenRegister({
                    ...consoleState.citizenRegister,
                    email,
                  })
                }
              />
              <DevConsoleField
                label="Password"
                value={consoleState.citizenRegister.password}
                onChangeText={(password) =>
                  consoleState.setCitizenRegister({
                    ...consoleState.citizenRegister,
                    password,
                  })
                }
                secureTextEntry
              />
              <DevConsoleField
                label="Phone"
                value={consoleState.citizenRegister.phone}
                onChangeText={(phone) =>
                  consoleState.setCitizenRegister({
                    ...consoleState.citizenRegister,
                    phone,
                  })
                }
              />
              <DevConsoleActionRow>
                <DevConsoleButton
                  label="Register"
                  onPress={consoleState.actions.citizenRegisterAction}
                />
              </DevConsoleActionRow>
            </DevConsoleSection>

            <DevConsoleSection title="Password Reset">
              <DevConsoleField
                label="Email"
                value={consoleState.passwordReset.email}
                onChangeText={(email) =>
                  consoleState.setPasswordReset({
                    ...consoleState.passwordReset,
                    email,
                  })
                }
              />
              <DevConsoleField
                label="Reset Token"
                value={consoleState.passwordReset.token}
                onChangeText={(token) =>
                  consoleState.setPasswordReset({
                    ...consoleState.passwordReset,
                    token,
                  })
                }
              />
              <DevConsoleField
                label="New Password"
                value={consoleState.passwordReset.password}
                onChangeText={(password) =>
                  consoleState.setPasswordReset({
                    ...consoleState.passwordReset,
                    password,
                  })
                }
                secureTextEntry
              />
              <DevConsoleActionRow>
                <DevConsoleButton
                  label="Forgot Password"
                  onPress={consoleState.actions.forgotPasswordAction}
                />
                <DevConsoleButton
                  label="Reset Password"
                  tone="secondary"
                  onPress={consoleState.actions.resetPasswordAction}
                />
              </DevConsoleActionRow>
            </DevConsoleSection>
          </>
        ) : null}

        {consoleState.activeTab === "complaints" ? (
          <>
            <DevConsoleSection title="Create Complaint">
              <DevConsoleField
                label="Title"
                value={consoleState.complaint.title}
                onChangeText={(title) =>
                  consoleState.setComplaint({
                    ...consoleState.complaint,
                    title,
                  })
                }
              />
              <DevConsoleSelect
                label="Category"
                value={consoleState.complaint.category}
                options={["road", "water", "power", "waste", "trees", "other"]}
                onChange={(category) =>
                  consoleState.setComplaint({
                    ...consoleState.complaint,
                    category,
                  })
                }
              />
              <DevConsoleField
                label="Description"
                value={consoleState.complaint.description}
                onChangeText={(description) =>
                  consoleState.setComplaint({
                    ...consoleState.complaint,
                    description,
                  })
                }
                multiline
              />
              <DevConsoleField
                label="Ward"
                value={consoleState.complaint.ward}
                onChangeText={(ward) =>
                  consoleState.setComplaint({
                    ...consoleState.complaint,
                    ward,
                  })
                }
              />
              <DevConsoleField
                label="Address"
                value={consoleState.complaint.address}
                onChangeText={(address) =>
                  consoleState.setComplaint({
                    ...consoleState.complaint,
                    address,
                  })
                }
              />
              <DevConsoleActionRow>
                <DevConsoleButton
                  label="Analyze"
                  onPress={consoleState.actions.analyzeComplaintAction}
                />
                <DevConsoleButton
                  label="Create"
                  tone="secondary"
                  onPress={consoleState.actions.createComplaintAction}
                />
              </DevConsoleActionRow>
            </DevConsoleSection>

            <DevConsoleSection title="Complaint Actions">
              <DevConsoleField
                label="Complaint ID"
                value={consoleState.complaint.complaintId}
                onChangeText={(complaintId) =>
                  consoleState.setComplaint({
                    ...consoleState.complaint,
                    complaintId,
                  })
                }
              />
              <DevConsoleField
                label="Comment"
                value={consoleState.complaint.comment}
                onChangeText={(comment) =>
                  consoleState.setComplaint({
                    ...consoleState.complaint,
                    comment,
                  })
                }
                multiline
              />
              <DevConsoleActionRow>
                <DevConsoleButton
                  label="Detail"
                  onPress={consoleState.actions.complaintDetailAction}
                />
                <DevConsoleButton
                  label="Timeline"
                  tone="secondary"
                  onPress={consoleState.actions.complaintTimelineAction}
                />
                <DevConsoleButton
                  label="Upvote"
                  tone="secondary"
                  onPress={consoleState.actions.complaintUpvoteAction}
                />
                <DevConsoleButton
                  label="Follow"
                  tone="secondary"
                  onPress={consoleState.actions.complaintFollowAction}
                />
                <DevConsoleButton
                  label="Unfollow"
                  tone="danger"
                  onPress={consoleState.actions.complaintUnfollowAction}
                />
                <DevConsoleButton
                  label="Comment"
                  tone="secondary"
                  onPress={consoleState.actions.complaintCommentAction}
                />
              </DevConsoleActionRow>
            </DevConsoleSection>

            <DevConsoleSection title="Browse Complaints">
              <DevConsoleActionRow>
                <DevConsoleButton
                  label="Public"
                  onPress={consoleState.actions.listPublicComplaintsAction}
                />
                <DevConsoleButton
                  label="Mine"
                  tone="secondary"
                  onPress={consoleState.actions.listMyComplaintsAction}
                />
                <DevConsoleButton
                  label="Nearby"
                  tone="secondary"
                  onPress={consoleState.actions.nearbyComplaintsAction}
                />
              </DevConsoleActionRow>
            </DevConsoleSection>
          </>
        ) : null}

        {consoleState.activeTab === "profile" ? (
          <DevConsoleSection title="Profile APIs">
            <DevConsoleField
              label="Name"
              value={consoleState.profile.name}
              onChangeText={(name) =>
                consoleState.setProfile({
                  ...consoleState.profile,
                  name,
                })
              }
            />
            <DevConsoleField
              label="Phone"
              value={consoleState.profile.phone}
              onChangeText={(phone) =>
                consoleState.setProfile({
                  ...consoleState.profile,
                  phone,
                })
              }
            />
            <DevConsoleField
              label="Avatar URL"
              value={consoleState.profile.avatarUrl}
              onChangeText={(avatarUrl) =>
                consoleState.setProfile({
                  ...consoleState.profile,
                  avatarUrl,
                })
              }
            />
            <DevConsoleSelect
              label="Language"
              value={consoleState.profile.language}
              options={["English", "Nepali"]}
              onChange={(language) =>
                consoleState.setProfile({
                  ...consoleState.profile,
                  language: language === "Nepali" ? "Nepali" : "English",
                })
              }
            />
            <DevConsoleToggle
              label="Public Profile"
              value={consoleState.profile.isPublic}
              onToggle={(isPublic) =>
                consoleState.setProfile({
                  ...consoleState.profile,
                  isPublic,
                })
              }
            />
            <DevConsoleActionRow>
              <DevConsoleButton
                label="Get Profile"
                onPress={consoleState.actions.getProfileAction}
              />
              <DevConsoleButton
                label="Update Profile"
                tone="secondary"
                onPress={consoleState.actions.updateProfileAction}
              />
              <DevConsoleButton
                label="Set Language"
                tone="secondary"
                onPress={consoleState.actions.updateLanguageAction}
              />
            </DevConsoleActionRow>
          </DevConsoleSection>
        ) : null}

        {consoleState.activeTab === "officer" ? (
          <>
            <DevConsoleSection title="Officer Login">
              <DevConsoleField
                label="Email"
                value={consoleState.officerLogin.email}
                onChangeText={(email) =>
                  consoleState.setOfficerLogin({
                    ...consoleState.officerLogin,
                    email,
                  })
                }
              />
              <DevConsoleField
                label="Password"
                value={consoleState.officerLogin.password}
                onChangeText={(password) =>
                  consoleState.setOfficerLogin({
                    ...consoleState.officerLogin,
                    password,
                  })
                }
                secureTextEntry
              />
              <DevConsoleActionRow>
                <DevConsoleButton
                  label="Login"
                  onPress={consoleState.actions.officerLoginAction}
                />
                <DevConsoleButton
                  label="Sessions"
                  tone="secondary"
                  onPress={consoleState.actions.officerSessionsAction}
                />
                <DevConsoleButton
                  label="Logout"
                  tone="secondary"
                  onPress={consoleState.actions.officerLogoutAction}
                />
              </DevConsoleActionRow>
            </DevConsoleSection>

            <DevConsoleSection title="Officer Workflow">
              <DevConsoleField
                label="Complaint ID"
                value={consoleState.officerAction.complaintId}
                onChangeText={(complaintId) =>
                  consoleState.setOfficerAction({
                    ...consoleState.officerAction,
                    complaintId,
                  })
                }
              />
              <DevConsoleSelect
                label="Status"
                value={consoleState.officerAction.status}
                options={["pending", "accepted", "in_progress", "resolved", "rejected"]}
                onChange={(status) =>
                  consoleState.setOfficerAction({
                    ...consoleState.officerAction,
                    status: status as typeof consoleState.officerAction.status,
                  })
                }
              />
              <DevConsoleSelect
                label="Priority"
                value={consoleState.officerAction.priority}
                options={["low", "medium", "high", "critical"]}
                onChange={(priority) =>
                  consoleState.setOfficerAction({
                    ...consoleState.officerAction,
                    priority: priority as typeof consoleState.officerAction.priority,
                  })
                }
              />
              <DevConsoleField
                label="Note / Reason"
                value={consoleState.officerAction.note}
                onChangeText={(note) =>
                  consoleState.setOfficerAction({
                    ...consoleState.officerAction,
                    note,
                  })
                }
                multiline
              />
              <DevConsoleActionRow>
                <DevConsoleButton
                  label="Dashboard"
                  onPress={consoleState.actions.officerDashboardAction}
                />
                <DevConsoleButton
                  label="Queue"
                  tone="secondary"
                  onPress={consoleState.actions.officerQueueAction}
                />
                <DevConsoleButton
                  label="Detail"
                  tone="secondary"
                  onPress={consoleState.actions.officerDetailAction}
                />
                <DevConsoleButton
                  label="Status"
                  tone="secondary"
                  onPress={consoleState.actions.officerStatusAction}
                />
                <DevConsoleButton
                  label="Priority"
                  tone="secondary"
                  onPress={consoleState.actions.officerPriorityAction}
                />
                <DevConsoleButton
                  label="Note"
                  tone="secondary"
                  onPress={consoleState.actions.officerNoteAction}
                />
                <DevConsoleButton
                  label="Comment"
                  tone="secondary"
                  onPress={consoleState.actions.officerCommentAction}
                />
                <DevConsoleButton
                  label="Analytics"
                  tone="secondary"
                  onPress={consoleState.actions.officerAnalyticsAction}
                />
                <DevConsoleButton
                  label="Alerts"
                  tone="secondary"
                  onPress={consoleState.actions.officerAlertsAction}
                />
                <DevConsoleButton
                  label="Users"
                  tone="secondary"
                  onPress={consoleState.actions.officerUsersAction}
                />
                <DevConsoleButton
                  label="Settings"
                  tone="secondary"
                  onPress={consoleState.actions.officerSettingsAction}
                />
              </DevConsoleActionRow>
            </DevConsoleSection>
          </>
        ) : null}

        {consoleState.activeTab === "output" ? (
          <DevConsoleSection title="Last Response">
            <ScrollView
              horizontal
              style={styles.outputShell}
              contentContainerStyle={styles.outputContent}
            >
              <Text style={styles.outputText}>{formattedOutput}</Text>
            </ScrollView>
          </DevConsoleSection>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: 118,
  },
  description: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 6,
  },
  eyebrow: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  header: {
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 6,
  },
  loadingState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: "800",
  },
  outputContent: {
    flexGrow: 1,
  },
  outputShell: {
    marginTop: 10,
    borderRadius: 18,
    backgroundColor: "#171321",
    borderWidth: 1,
    borderColor: "#262038",
  },
  outputText: {
    padding: 14,
    color: "#F8F5FF",
    fontSize: 12,
    lineHeight: 18,
    fontFamily: "monospace",
  },
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  statusBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 16,
    marginTop: 12,
    padding: 12,
    borderRadius: 18,
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: "#D9CDF0",
  },
  statusBannerError: {
    backgroundColor: "#FFF1F2",
    borderColor: "#FECDD3",
  },
  statusBannerSuccess: {
    backgroundColor: "#ECFDF5",
    borderColor: "#BBF7D0",
  },
  statusText: {
    flex: 1,
    color: colors.text,
    fontSize: 13,
    fontWeight: "800",
  },
  tabButton: {
    minHeight: 42,
    paddingHorizontal: 14,
    borderRadius: 15,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  tabRow: {
    paddingHorizontal: 16,
    paddingTop: 14,
    gap: 8,
  },
  tabText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "900",
  },
  tabTextActive: {
    color: colors.surface,
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: "900",
    marginTop: 4,
  },
});
