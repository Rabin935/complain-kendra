import { useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "../../../constants/colors";
import { useAuth } from "../../auth/context/AuthContext";
import { getApiErrorMessage } from "../../../../src/lib/api";
import { useRealtimeInvalidation } from "../../realtime/hooks/useRealtimeInvalidation";
import OfficerScreen from "../components/OfficerScreen";
import {
  Badge,
  EmptyState,
  ErrorState,
  IconButton,
  LoadingState,
  Section,
  SelectRow,
  TextField,
} from "../components/OfficerUI";
import { getComplaints, listOfficers, type ComplaintQueueParams } from "../services/officer.service";
import type {
  ComplaintCategory,
  ComplaintPriority,
  ComplaintStatus,
  OfficerComplaint,
  OfficerDirectoryItem,
} from "../types/officer.types";

const statuses: Array<{ label: string; value: ComplaintStatus | "" }> = [
  { label: "All", value: "" },
  { label: "Pending", value: "pending" },
  { label: "Accepted", value: "accepted" },
  { label: "Working", value: "in_progress" },
  { label: "Resolved", value: "resolved" },
  { label: "Rejected", value: "rejected" },
];

const categories: Array<{ label: string; value: ComplaintCategory | "" }> = [
  { label: "All", value: "" },
  { label: "Road", value: "road" },
  { label: "Water", value: "water" },
  { label: "Power", value: "power" },
  { label: "Waste", value: "waste" },
  { label: "Trees", value: "trees" },
  { label: "Other", value: "other" },
];

const priorities: Array<{ label: string; value: ComplaintPriority | "" }> = [
  { label: "All", value: "" },
  { label: "Critical", value: "critical" },
  { label: "High", value: "high" },
  { label: "Medium", value: "medium" },
  { label: "Low", value: "low" },
];

function normalizeStatus(value?: string): string {
  return value ? value.replace(/_/g, " ") : "unknown";
}

function getPriorityTone(priority: ComplaintPriority) {
  if (priority === "critical" || priority === "high") {
    return "danger" as const;
  }

  if (priority === "medium") {
    return "warning" as const;
  }

  return "neutral" as const;
}

export default function OfficerQueueScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { user } = useAuth();
  const [complaints, setComplaints] = useState<OfficerComplaint[]>([]);
  const [officers, setOfficers] = useState<OfficerDirectoryItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<ComplaintStatus | "">(route.params?.status ?? "");
  const [category, setCategory] = useState<ComplaintCategory | "">("");
  const [priority, setPriority] = useState<ComplaintPriority | "">(
    route.params?.priority === "high" ? "high" : route.params?.priority ?? "",
  );
  const [ward, setWard] = useState("");
  const [department, setDepartment] = useState("");
  const [assignedOfficer, setAssignedOfficer] = useState("");
  const [sort, setSort] = useState<ComplaintQueueParams["sort"]>("newest");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (route.params?.status) {
      setStatus(route.params.status);
    }

    if (route.params?.priority && route.params.priority !== "high") {
      setPriority(route.params.priority);
    }

    if (route.params?.assignedToMe && user?.id) {
      setAssignedOfficer(user.id);
    }
  }, [route.params, user?.id]);

  const params = useMemo<ComplaintQueueParams>(
    () => ({
      search,
      page,
      limit: 10,
      status,
      category,
      priority,
      ward,
      department,
      assignedOfficer,
      sort,
    }),
    [assignedOfficer, category, department, page, priority, search, sort, status, ward],
  );

  const loadQueue = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [complaintResult, officerResult] = await Promise.all([
        getComplaints(params),
        listOfficers(),
      ]);
      setComplaints(complaintResult.complaints);
      setTotal(complaintResult.total);
      setOfficers(officerResult);
    } catch (loadError) {
      setError(getApiErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, [params]);

  useFocusEffect(
    useCallback(() => {
      void loadQueue();
    }, [loadQueue]),
  );
  useRealtimeInvalidation(
    ["complaint:created", "complaint:status_updated", "complaint:resolved", "officer:queue_updated"],
    () => void loadQueue(),
  );

  const totalPages = Math.max(1, Math.ceil(total / 10));

  function resetFilters() {
    setSearch("");
    setStatus("");
    setCategory("");
    setPriority("");
    setWard("");
    setDepartment("");
    setAssignedOfficer("");
    setSort("newest");
    setPage(1);
  }

  return (
    <OfficerScreen title="Complaint Queue" subtitle="Search, triage, and open assigned ward complaints.">
      <Section title="Filters" action={<IconButton icon="filter-remove-outline" label="Clear" onPress={resetFilters} tone="neutral" />}>
        <TextField value={search} onChangeText={(value) => { setSearch(value); setPage(1); }} placeholder="Search complaint ID, title, or description" />
        <SelectRow label="Status" value={status} options={statuses} onChange={(value) => { setStatus(value); setPage(1); }} />
        <SelectRow label="Category" value={category} options={categories} onChange={(value) => { setCategory(value); setPage(1); }} />
        <SelectRow label="Priority" value={priority} options={priorities} onChange={(value) => { setPriority(value); setPage(1); }} />
        <View style={styles.twoColumn}>
          <TextField value={ward} onChangeText={(value) => { setWard(value); setPage(1); }} placeholder="Ward filter" />
          <TextField value={department} onChangeText={(value) => { setDepartment(value); setPage(1); }} placeholder="Department filter" />
        </View>
        <SelectRow
          label="Sort"
          value={sort ?? "newest"}
          options={[
            { label: "Newest", value: "newest" },
            { label: "Oldest", value: "oldest" },
            { label: "Priority", value: "highest_priority" },
            { label: "AI confidence", value: "ai_confidence" },
          ]}
          onChange={(value) => { setSort(value); setPage(1); }}
        />
        <SelectRow
          label="Assigned officer"
          value={assignedOfficer}
          options={[
            { label: "All", value: "" },
            { label: "Unassigned", value: "unassigned" },
            ...officers.slice(0, 6).map((officer) => ({ label: officer.name, value: officer.id })),
          ]}
          onChange={(value) => { setAssignedOfficer(value); setPage(1); }}
        />
      </Section>

      <Section title={`Results (${total})`}>
        {loading ? <LoadingState label="Fetching complaint queue..." /> : null}
        {!loading && error ? <ErrorState message={error} onRetry={loadQueue} /> : null}
        {!loading && !error && complaints.length === 0 ? (
          <EmptyState title="No complaints found" message="Try changing a filter or search term." />
        ) : null}
        {!loading && !error && complaints.length > 0 ? (
          <View style={styles.list}>
            {complaints.map((complaint) => (
              <Pressable
                key={complaint.id}
                onPress={() => navigation.navigate("OfficerComplaintDetail", { complaintId: complaint.id })}
                style={styles.card}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.cardTitleBlock}>
                    <Text style={styles.complaintNo}>{complaint.complaintNo}</Text>
                    <Text style={styles.cardTitle}>{complaint.title}</Text>
                  </View>
                  <Badge label={complaint.priority} tone={getPriorityTone(complaint.priority)} />
                </View>
                <View style={styles.metaGrid}>
                  <Text style={styles.meta}>Category: {complaint.category}</Text>
                  <Text style={styles.meta}>Ward: {complaint.location?.ward ?? "Not set"}</Text>
                  <Text style={styles.meta}>Status: {normalizeStatus(complaint.status)}</Text>
                  <Text style={styles.meta}>
                    AI: {complaint.aiAnalysis?.confidence ?? complaint.aiAnalysis?.confidence_score ?? 0}%
                  </Text>
                  <Text style={styles.meta}>
                    Assigned: {complaint.assignedOfficerName ?? "Unassigned"}
                  </Text>
                  <Text style={styles.meta}>
                    Department: {complaint.assignedDepartment ?? "Unassigned"}
                  </Text>
                </View>
              </Pressable>
            ))}

            <View style={styles.pagination}>
              <IconButton
                icon="chevron-left"
                label="Previous"
                disabled={page <= 1}
                onPress={() => setPage((value) => Math.max(1, value - 1))}
                tone="neutral"
              />
              <Text style={styles.pageText}>
                Page {page} of {totalPages}
              </Text>
              <IconButton
                icon="chevron-right"
                label="Next"
                disabled={page >= totalPages}
                onPress={() => setPage((value) => Math.min(totalPages, value + 1))}
                tone="neutral"
              />
            </View>
          </View>
        ) : null}
      </Section>
    </OfficerScreen>
  );
}

const styles = StyleSheet.create({
  twoColumn: {
    flexDirection: "row",
    gap: 10,
  },
  list: {
    gap: 12,
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
    padding: 14,
  },
  cardHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between",
  },
  cardTitleBlock: {
    flex: 1,
    gap: 4,
  },
  complaintNo: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "900",
  },
  cardTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "900",
  },
  metaGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  meta: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 8,
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "700",
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  pagination: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  pageText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: "800",
  },
});
