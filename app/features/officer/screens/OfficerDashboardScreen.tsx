import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useCallback, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "../../../constants/colors";
import { getApiErrorMessage } from "../../../utils/api";
import OfficerScreen from "../components/OfficerScreen";
import { Badge, EmptyState, ErrorState, LoadingState, Section } from "../components/OfficerUI";
import { getDashboard } from "../services/officer.service";
import type { OfficerDashboardResponse } from "../types/officer.types";

function formatStatus(value: string): string {
  return value.replace(/_/g, " ");
}

export default function OfficerDashboardScreen() {
  const navigation = useNavigation<any>();
  const [dashboard, setDashboard] = useState<OfficerDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      setDashboard(await getDashboard());
    } catch (loadError) {
      setError(getApiErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadDashboard();
    }, [loadDashboard]),
  );

  const kpis = dashboard
    ? [
        { label: "Total complaints", value: dashboard.kpis.total, icon: "file-document-outline", params: {} },
        { label: "Pending", value: dashboard.kpis.pending, icon: "clock-outline", params: { status: "pending" } },
        { label: "In Progress", value: dashboard.kpis.in_progress, icon: "progress-clock", params: { status: "in_progress" } },
        { label: "Resolved Today", value: dashboard.kpis.resolved_today, icon: "check-decagram-outline", params: { status: "resolved" } },
        { label: "High Priority", value: dashboard.kpis.high_priority, icon: "alert-outline", params: { priority: "high" } },
        { label: "Assigned To Me", value: dashboard.kpis.assigned_to_me, icon: "account-check-outline", params: { assignedToMe: true } },
      ]
    : [];

  return (
    <OfficerScreen
      title="Dashboard"
      subtitle="Monitor live complaint workload, urgent AI signals, and daily officer activity."
    >
      {loading ? <LoadingState label="Fetching officer dashboard..." /> : null}
      {!loading && error ? <ErrorState message={error} onRetry={loadDashboard} /> : null}
      {!loading && !error && dashboard ? (
        <>
          <View style={styles.kpiGrid}>
            {kpis.map((item) => (
              <Pressable
                key={item.label}
                onPress={() => navigation.navigate("OfficerQueue", item.params)}
                style={styles.kpiCard}
              >
                <View style={styles.kpiIcon}>
                  <MaterialCommunityIcons
                    name={item.icon as keyof typeof MaterialCommunityIcons.glyphMap}
                    size={20}
                    color={colors.primary}
                  />
                </View>
                <Text style={styles.kpiValue}>{item.value}</Text>
                <Text style={styles.kpiLabel}>{item.label}</Text>
              </Pressable>
            ))}
          </View>

          <Section title="Recent complaints">
            {dashboard.recentComplaints.length === 0 ? (
              <EmptyState title="No recent complaints" message="New complaints will appear here." />
            ) : (
              <View style={styles.list}>
                {dashboard.recentComplaints.map((complaint) => (
                  <Pressable
                    key={complaint.id}
                    onPress={() =>
                      navigation.navigate("OfficerComplaintDetail", { complaintId: complaint.id })
                    }
                    style={styles.row}
                  >
                    <View style={styles.rowCopy}>
                      <Text style={styles.rowTitle}>{complaint.title}</Text>
                      <Text style={styles.rowMeta}>
                        {complaint.complaintNo} · {complaint.location?.ward ?? "Ward not set"}
                      </Text>
                    </View>
                    <Badge label={formatStatus(complaint.status)} tone="info" />
                  </Pressable>
                ))}
              </View>
            )}
          </Section>

          <Section title="AI urgent queue">
            {dashboard.urgentQueue.length === 0 ? (
              <EmptyState title="No urgent AI items" message="High-confidence urgent complaints are clear." />
            ) : (
              <View style={styles.list}>
                {dashboard.urgentQueue.map((complaint) => (
                  <Pressable
                    key={complaint.id}
                    onPress={() =>
                      navigation.navigate("OfficerComplaintDetail", { complaintId: complaint.id })
                    }
                    style={styles.row}
                  >
                    <View style={styles.rowCopy}>
                      <Text style={styles.rowTitle}>{complaint.title}</Text>
                      <Text style={styles.rowMeta}>
                        Confidence {complaint.aiAnalysis?.confidence ?? complaint.aiAnalysis?.confidence_score ?? 0}%
                      </Text>
                    </View>
                    <Badge label={complaint.priority} tone="danger" />
                  </Pressable>
                ))}
              </View>
            )}
          </Section>

          <Section title="Recent activity">
            {dashboard.recentActivity.length === 0 ? (
              <EmptyState title="No activity yet" message="Officer and system updates will be listed here." />
            ) : (
              <View style={styles.activityList}>
                {dashboard.recentActivity.map((item) => (
                  <View key={item._id} style={styles.activityItem}>
                    <Text style={styles.activityTitle}>{item.title}</Text>
                    <Text style={styles.rowMeta}>
                      {item.actorName ?? item.actorType} · {new Date(item.createdAt).toLocaleString()}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </Section>

          <Section title="Quick actions">
            <View style={styles.quickActions}>
              <Pressable onPress={() => navigation.navigate("OfficerQueue")} style={styles.quickAction}>
                <MaterialCommunityIcons name="clipboard-search-outline" size={22} color={colors.primary} />
                <Text style={styles.quickActionText}>Open queue</Text>
              </Pressable>
              <Pressable onPress={() => navigation.navigate("OfficerAnalytics")} style={styles.quickAction}>
                <MaterialCommunityIcons name="chart-line" size={22} color={colors.primary} />
                <Text style={styles.quickActionText}>View analytics</Text>
              </Pressable>
              <Pressable onPress={() => navigation.navigate("OfficerUsers")} style={styles.quickAction}>
                <MaterialCommunityIcons name="account-alert-outline" size={22} color={colors.primary} />
                <Text style={styles.quickActionText}>Manage users</Text>
              </Pressable>
            </View>
          </Section>
        </>
      ) : null}
    </OfficerScreen>
  );
}

const styles = StyleSheet.create({
  kpiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  kpiCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 126,
    padding: 14,
    width: "48%",
  },
  kpiIcon: {
    alignItems: "center",
    backgroundColor: colors.primaryLight,
    borderRadius: 8,
    height: 34,
    justifyContent: "center",
    marginBottom: 12,
    width: 34,
  },
  kpiValue: {
    color: colors.text,
    fontSize: 26,
    fontWeight: "900",
  },
  kpiLabel: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: "800",
    marginTop: 3,
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
    padding: 14,
  },
  rowCopy: {
    flex: 1,
    gap: 4,
  },
  rowTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "800",
  },
  rowMeta: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 17,
  },
  activityList: {
    gap: 8,
  },
  activityItem: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    padding: 12,
  },
  activityTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 4,
  },
  quickActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  quickAction: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    gap: 8,
    minWidth: 112,
    padding: 14,
  },
  quickActionText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "800",
    textAlign: "center",
  },
});
