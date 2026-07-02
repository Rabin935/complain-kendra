import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";
import { StyleSheet, Switch, Text, View } from "react-native";
import { colors } from "../../../constants/colors";
import { getApiErrorMessage } from "../../../../src/lib/api";
import { useAuth } from "../../auth/context/AuthContext";
import OfficerScreen from "../components/OfficerScreen";
import { EmptyState, ErrorState, IconButton, LoadingState, Section, TextField, Toast } from "../components/OfficerUI";
import {
  getSettings,
  listEscalationRules,
  listSessions,
  revokeSession,
  saveEscalationRule,
  updateSettings,
} from "../services/officer.service";
import type { OfficerNotificationPreferences, OfficerProfile } from "../types/officer.types";

const defaultPreferences: OfficerNotificationPreferences = {
  inApp: true,
  email: true,
  push: false,
  assignmentUpdates: true,
  urgentAlerts: true,
  dailyDigest: false,
};

function canConfigureRules(role?: string): boolean {
  return role === "admin";
}

export default function OfficerSettingsScreen() {
  const { user, logout } = useAuth();
  const [profile, setProfile] = useState<OfficerProfile | null>(null);
  const [sessions, setSessions] = useState<Array<Record<string, any>>>([]);
  const [rules, setRules] = useState<Array<Record<string, any>>>([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [department, setDepartment] = useState("");
  const [ward, setWard] = useState("");
  const [city, setCity] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [preferences, setPreferences] = useState(defaultPreferences);
  const [ruleName, setRuleName] = useState("");
  const [ruleHours, setRuleHours] = useState("24");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [toastDanger, setToastDanger] = useState(false);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [settings, sessionResult, ruleResult] = await Promise.all([
        getSettings(),
        listSessions(),
        listEscalationRules(),
      ]);
      setProfile(settings);
      setName(settings.name ?? "");
      setPhone(settings.phone ?? "");
      setDepartment(settings.department ?? "");
      setWard(settings.ward ?? "");
      setCity(settings.city ?? "");
      setPreferences(settings.notificationPreferences ?? defaultPreferences);
      setSessions(sessionResult);
      setRules(ruleResult);
    } catch (loadError) {
      setError(getApiErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadSettings();
    }, [loadSettings]),
  );

  async function runSettingsAction(label: string, action: () => Promise<void>) {
    setToast(null);

    try {
      await action();
      setToastDanger(false);
      setToast(label);
      await loadSettings();
    } catch (actionError) {
      setToastDanger(true);
      setToast(getApiErrorMessage(actionError));
    }
  }

  function setPreference(key: keyof OfficerNotificationPreferences, value: boolean) {
    setPreferences((current) => ({ ...current, [key]: value }));
  }

  if (loading) {
    return (
      <OfficerScreen title="Settings">
        <LoadingState label="Fetching officer settings..." />
      </OfficerScreen>
    );
  }

  if (error || !profile) {
    return (
      <OfficerScreen title="Settings">
        <ErrorState message={error ?? "Officer profile was not found."} onRetry={loadSettings} />
      </OfficerScreen>
    );
  }

  return (
    <OfficerScreen title="Settings" subtitle="Manage profile, department, notifications, sessions, security, and escalation rules.">
      <Toast message={toast} tone={toastDanger ? "danger" : "success"} />

      <Section title="Officer profile">
        <View style={styles.panel}>
          <TextField value={name} onChangeText={setName} placeholder="Name" />
          <TextField value={phone} onChangeText={setPhone} placeholder="Phone" />
          <IconButton
            icon="content-save-outline"
            label="Update profile"
            onPress={() => void runSettingsAction("Profile updated.", () => updateSettings({ name, phone }).then(() => undefined))}
          />
        </View>
      </Section>

      <Section title="Department settings">
        <View style={styles.panel}>
          <TextField value={department} onChangeText={setDepartment} placeholder="Department" />
          <TextField value={ward} onChangeText={setWard} placeholder="Ward" />
          <TextField value={city} onChangeText={setCity} placeholder="City" />
          <IconButton
            icon="office-building-cog-outline"
            label="Update department"
            onPress={() => void runSettingsAction("Department settings updated.", () => updateSettings({ department, ward, city }).then(() => undefined))}
          />
        </View>
      </Section>

      <Section title="Notification preferences">
        <View style={styles.panel}>
          {Object.entries(preferences).map(([key, value]) => (
            <View key={key} style={styles.switchRow}>
              <Text style={styles.switchLabel}>{key.replace(/([A-Z])/g, " $1")}</Text>
              <Switch
                value={value}
                onValueChange={(nextValue) =>
                  setPreference(key as keyof OfficerNotificationPreferences, nextValue)
                }
                thumbColor={value ? colors.primary : colors.textMuted}
              />
            </View>
          ))}
          <IconButton
            icon="bell-check-outline"
            label="Save preferences"
            onPress={() => void runSettingsAction("Notification preferences saved.", () => updateSettings({ notificationPreferences: preferences }).then(() => undefined))}
          />
        </View>
      </Section>

      <Section title="Active sessions">
        {sessions.length === 0 ? (
          <EmptyState title="No active sessions" message="Officer sessions will appear after login." />
        ) : (
          <View style={styles.list}>
            {sessions.map((session) => (
              <View key={String(session._id)} style={styles.row}>
                <View style={styles.rowCopy}>
                  <Text style={styles.rowTitle}>{String(session.userAgent ?? "Unknown device")}</Text>
                  <Text style={styles.meta}>Last seen {new Date(String(session.lastSeenAt)).toLocaleString()}</Text>
                </View>
                <IconButton
                  icon="logout"
                  label="Terminate"
                  onPress={() => void runSettingsAction("Session terminated.", () => revokeSession(String(session._id)))}
                  tone="danger"
                />
              </View>
            ))}
          </View>
        )}
      </Section>

      <Section title="Security settings">
        <View style={styles.panel}>
          <TextField value={currentPassword} onChangeText={setCurrentPassword} placeholder="Current password" />
          <TextField value={newPassword} onChangeText={setNewPassword} placeholder="New password" />
          <IconButton
            icon="lock-reset"
            label="Change password"
            disabled={!currentPassword || !newPassword}
            onPress={() =>
              void runSettingsAction("Password changed.", async () => {
                await updateSettings({ currentPassword, newPassword });
                setCurrentPassword("");
                setNewPassword("");
              })
            }
            tone="neutral"
          />
          <IconButton icon="logout-variant" label="Sign out" onPress={() => void logout()} tone="danger" />
        </View>
      </Section>

      <Section title="Escalation rules">
        <View style={styles.panel}>
          {canConfigureRules(user?.role) ? (
            <>
              <TextField value={ruleName} onChangeText={setRuleName} placeholder="Rule name" />
              <TextField value={ruleHours} onChangeText={setRuleHours} placeholder="Trigger after hours" />
              <IconButton
                icon="timeline-alert-outline"
                label="Create rule"
                disabled={!ruleName.trim()}
                onPress={() =>
                  void runSettingsAction("Escalation rule saved.", async () => {
                    await saveEscalationRule({
                      name: ruleName,
                      triggerAfterHours: Number(ruleHours) || 24,
                      assignToRole: "supervisor",
                      active: true,
                    });
                    setRuleName("");
                    setRuleHours("24");
                  })
                }
              />
            </>
          ) : (
            <Text style={styles.meta}>Only administrators can configure escalation rules.</Text>
          )}
          {rules.length === 0 ? (
            <EmptyState title="No escalation rules" message="Administrator-created rules will appear here." />
          ) : (
            rules.map((rule) => (
              <View key={String(rule._id)} style={styles.ruleRow}>
                <Text style={styles.rowTitle}>{String(rule.name)}</Text>
                <Text style={styles.meta}>
                  After {String(rule.triggerAfterHours)}h · Assign to {String(rule.assignToRole)}
                </Text>
              </View>
            ))
          )}
        </View>
      </Section>
    </OfficerScreen>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
    padding: 14,
  },
  switchRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  switchLabel: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "800",
    textTransform: "capitalize",
  },
  list: {
    gap: 10,
  },
  row: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    padding: 12,
  },
  rowCopy: {
    flex: 1,
  },
  rowTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "900",
  },
  meta: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
  },
  ruleRow: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 8,
    gap: 4,
    padding: 12,
  },
});
