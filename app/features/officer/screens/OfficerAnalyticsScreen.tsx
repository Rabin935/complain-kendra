import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors } from "../../../constants/colors";
import { getApiErrorMessage } from "../../../utils/api";
import OfficerScreen from "../components/OfficerScreen";
import { EmptyState, ErrorState, LoadingState, Section, SelectRow, TextField } from "../components/OfficerUI";
import { getAnalytics } from "../services/officer.service";
import type { ComplaintCategory } from "../types/officer.types";

type MetricItem = { _id: string | null; count?: number; total?: number; open?: number; resolved?: number; active?: number };

const categories: Array<{ label: string; value: ComplaintCategory | "" }> = [
  { label: "All", value: "" },
  { label: "Road", value: "road" },
  { label: "Water", value: "water" },
  { label: "Power", value: "power" },
  { label: "Waste", value: "waste" },
  { label: "Trees", value: "trees" },
  { label: "Other", value: "other" },
];

function ChartList({ data, valueKey = "count" }: { data?: MetricItem[]; valueKey?: keyof MetricItem }) {
  const rows = data ?? [];
  const max = Math.max(1, ...rows.map((item) => Number(item[valueKey] ?? item.count ?? 0)));

  if (rows.length === 0) {
    return <EmptyState title="No data" message="There is no analytics data for this filter." />;
  }

  return (
    <View style={styles.chartList}>
      {rows.map((item) => {
        const value = Number(item[valueKey] ?? item.count ?? 0);
        return (
          <View key={String(item._id ?? "Unknown")} style={styles.chartRow}>
            <View style={styles.chartLabelRow}>
              <Text style={styles.chartLabel}>{String(item._id ?? "Unknown")}</Text>
              <Text style={styles.chartValue}>{value}</Text>
            </View>
            <View style={styles.barTrack}>
              <View style={[styles.barFill, { width: `${Math.max(5, (value / max) * 100)}%` }]} />
            </View>
          </View>
        );
      })}
    </View>
  );
}

export default function OfficerAnalyticsScreen() {
  const [analytics, setAnalytics] = useState<Record<string, any> | null>(null);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [ward, setWard] = useState("");
  const [category, setCategory] = useState<ComplaintCategory | "">("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAnalytics = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      setAnalytics(await getAnalytics({ from, to, ward, category }));
    } catch (loadError) {
      setError(getApiErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, [category, from, to, ward]);

  useFocusEffect(
    useCallback(() => {
      void loadAnalytics();
    }, [loadAnalytics]),
  );

  return (
    <OfficerScreen title="Analytics" subtitle="Track workload, resolution speed, AI distribution, and officer performance.">
      <Section title="Filters">
        <View style={styles.filterRow}>
          <TextField value={from} onChangeText={setFrom} placeholder="From YYYY-MM-DD" />
          <TextField value={to} onChangeText={setTo} placeholder="To YYYY-MM-DD" />
        </View>
        <TextField value={ward} onChangeText={setWard} placeholder="Ward" />
        <SelectRow label="Category" value={category} options={categories} onChange={setCategory} />
      </Section>

      {loading ? <LoadingState label="Fetching analytics..." /> : null}
      {!loading && error ? <ErrorState message={error} onRetry={loadAnalytics} /> : null}
      {!loading && !error && analytics ? (
        <>
          <View style={styles.statGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{analytics.averageResolutionTime?.hours ?? 0}h</Text>
              <Text style={styles.statLabel}>Average resolution time</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{analytics.monthlyResolutionRate ?? 0}%</Text>
              <Text style={styles.statLabel}>Monthly resolution rate</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{analytics.openComplaints ?? 0}</Text>
              <Text style={styles.statLabel}>Open complaints</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{analytics.resolvedComplaints ?? 0}</Text>
              <Text style={styles.statLabel}>Resolved complaints</Text>
            </View>
          </View>

          <Section title="Complaints by category">
            <ChartList data={analytics.byCategory} />
          </Section>
          <Section title="Complaints by ward">
            <ChartList data={analytics.byWard} />
          </Section>
          <Section title="Complaints by priority">
            <ChartList data={analytics.priorityDistribution} />
          </Section>
          <Section title="Resolution trend">
            <ChartList data={analytics.resolutionTrend} />
          </Section>
          <Section title="Department workload">
            <ChartList data={analytics.departmentWorkload} valueKey="open" />
          </Section>
          <Section title="AI category distribution">
            <ChartList data={analytics.aiCategoryDistribution} />
          </Section>
          <Section title="Officer performance">
            <ChartList data={analytics.officerPerformance} valueKey="resolved" />
          </Section>
          <Section title="Daily complaint volume">
            <ChartList data={analytics.dailyVolume} />
          </Section>
        </>
      ) : null}
    </OfficerScreen>
  );
}

const styles = StyleSheet.create({
  filterRow: {
    gap: 10,
  },
  statGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  statCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    padding: 14,
    width: "48%",
  },
  statValue: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "900",
  },
  statLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "800",
    marginTop: 6,
  },
  chartList: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
    padding: 14,
  },
  chartRow: {
    gap: 7,
  },
  chartLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  chartLabel: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "800",
    textTransform: "capitalize",
  },
  chartValue: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "900",
  },
  barTrack: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 999,
    height: 9,
    overflow: "hidden",
  },
  barFill: {
    backgroundColor: colors.primary,
    borderRadius: 999,
    height: 9,
  },
});
