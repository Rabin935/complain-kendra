import { Text } from "@/src/theme/typography";
import {
  useFocusEffect,
  useNavigation,
  useRoute } from "@react-navigation/native";
import { useCallback,
  useState } from "react";
import { Alert,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { officerColors } from "../../../constants/theme";
import { getApiErrorMessage } from "../../../../src/lib/api";
import { useAuth } from "../../auth/context/AuthContext";
import OfficerScreen from "../components/OfficerScreen";
import { Badge, EmptyState, ErrorState, IconButton, LoadingState, Section, SelectRow, TextField, Toast } from "../components/OfficerUI";
import { banUser, getUserDetail, listUsers, unbanUser, warnUser } from "../services/officer.service";
import type { OfficerUser } from "../types/officer.types";

function canModerate(role?: string): boolean {
  return role === "admin" || role === "supervisor";
}

export default function OfficerUserManagementScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { user: officer } = useAuth();
  const selectedUserId = route.params?.userId as string | undefined;
  const [users, setUsers] = useState<OfficerUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<OfficerUser | null>(null);
  const [complaints, setComplaints] = useState<any[]>([]);
  const [warnings, setWarnings] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"active" | "banned" | "">("");
  const [ward, setWard] = useState("");
  const [reason, setReason] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [toastDanger, setToastDanger] = useState(false);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      if (selectedUserId) {
        const detail = await getUserDetail(selectedUserId);
        setSelectedUser(detail.user);
        setComplaints(detail.complaints);
        setWarnings(detail.warnings);
      } else {
        const result = await listUsers({ search, status, ward, page, limit: 12 });
        setUsers(result.users);
        setTotal(result.total);
      }
    } catch (loadError) {
      setError(getApiErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, [page, search, selectedUserId, status, ward]);

  useFocusEffect(
    useCallback(() => {
      void loadUsers();
    }, [loadUsers]),
  );

  async function runModeration(label: string, action: () => Promise<void>) {
    try {
      await action();
      setToastDanger(false);
      setToast(label);
      setReason("");
      await loadUsers();
    } catch (actionError) {
      setToastDanger(true);
      setToast(getApiErrorMessage(actionError));
    }
  }

  function confirm(label: string, action: () => Promise<void>) {
    Alert.alert(label, "Please confirm this moderation action.", [
      { text: "Cancel", style: "cancel" },
      { text: "Confirm", onPress: () => void runModeration(`${label} completed.`, action) },
    ]);
  }

  const totalPages = Math.max(1, Math.ceil(total / 12));

  return (
    <OfficerScreen
      title={selectedUserId ? "User Detail" : "User Management"}
      subtitle="Review citizen reputation, complaint history, warnings, and account restrictions."
    >
      <Toast message={toast} tone={toastDanger ? "danger" : "success"} />
      {selectedUserId ? (
        <View style={styles.topActions}>
          <IconButton icon="arrow-left" label="Back" onPress={() => navigation.navigate("OfficerTabs", { screen: "OfficerUsers" })} tone="neutral" />
          <IconButton icon="refresh" label="Refresh" onPress={loadUsers} tone="neutral" />
        </View>
      ) : null}

      {loading ? <LoadingState label="Fetching users..." /> : null}
      {!loading && error ? <ErrorState message={error} onRetry={loadUsers} /> : null}

      {!loading && !error && selectedUserId && selectedUser ? (
        <>
          <Section title="Profile">
            <View style={styles.panel}>
              <Text style={styles.name}>{selectedUser.name}</Text>
              <Text style={styles.meta}>{selectedUser.email}</Text>
              <Text style={styles.meta}>Phone: {selectedUser.phone ?? "Not set"}</Text>
              <Text style={styles.meta}>Ward: {selectedUser.ward ?? "Not set"}</Text>
              <View style={styles.badges}>
                <Badge label={selectedUser.isBanned ? "Banned" : "Active"} tone={selectedUser.isBanned ? "danger" : "success"} />
                <Badge label={`Level ${selectedUser.level}`} tone="info" />
                <Badge label={`${selectedUser.points} points`} />
              </View>
              <Text style={styles.meta}>Reputation: {selectedUser.levelTitle ?? "Community member"}</Text>
              <Text style={styles.meta}>Badges: Level {selectedUser.level}, {selectedUser.points >= 100 ? "Trusted Reporter" : "Starter"}</Text>
            </View>
          </Section>

          <Section title="Actions">
            <View style={styles.panel}>
              <TextField value={reason} onChangeText={setReason} placeholder="Reason for warning, suspension, or ban" multiline />
              <View style={styles.actionGrid}>
                <IconButton icon="alert-outline" label="Warn" disabled={!canModerate(officer?.role) || !reason.trim()} onPress={() => confirm("Warn user", () => warnUser(selectedUser.id, reason))} tone="neutral" />
                <IconButton icon="pause-octagon-outline" label="Suspend" disabled={!canModerate(officer?.role) || !reason.trim()} onPress={() => confirm("Suspend account", () => banUser(selectedUser.id, `Suspended: ${reason}`))} tone="danger" />
                <IconButton icon="account-cancel-outline" label="Ban" disabled={!canModerate(officer?.role) || !reason.trim()} onPress={() => confirm("Ban user", () => banUser(selectedUser.id, reason))} tone="danger" />
                <IconButton icon="account-check-outline" label="Unban" disabled={!canModerate(officer?.role) || !selectedUser.isBanned} onPress={() => confirm("Unban user", () => unbanUser(selectedUser.id))} />
              </View>
            </View>
          </Section>

          <Section title="Complaint history">
            {complaints.length === 0 ? (
              <EmptyState title="No complaints" message="This user has not submitted complaints." />
            ) : (
              <View style={styles.list}>
                {complaints.map((complaint) => (
                  <View key={complaint.id} style={styles.row}>
                    <Text style={styles.rowTitle}>{complaint.title}</Text>
                    <Text style={styles.meta}>{complaint.complaintNo} · {complaint.status}</Text>
                  </View>
                ))}
              </View>
            )}
          </Section>

          <Section title="Activity log">
            {warnings.length === 0 ? (
              <EmptyState title="No warnings" message="No officer warnings have been recorded." />
            ) : (
              <View style={styles.list}>
                {warnings.map((warning) => (
                  <View key={warning._id} style={styles.row}>
                    <Text style={styles.rowTitle}>Warning</Text>
                    <Text style={styles.meta}>{warning.reason}</Text>
                  </View>
                ))}
              </View>
            )}
          </Section>
        </>
      ) : null}

      {!loading && !error && !selectedUserId ? (
        <>
          <Section title="Search">
            <TextField value={search} onChangeText={(value) => { setSearch(value); setPage(1); }} placeholder="Search by name or email" />
            <SelectRow
              label="Account status"
              value={status}
              options={[
                { label: "All", value: "" },
                { label: "Active", value: "active" },
                { label: "Banned", value: "banned" },
              ]}
              onChange={(value) => { setStatus(value); setPage(1); }}
            />
            <TextField value={ward} onChangeText={(value) => { setWard(value); setPage(1); }} placeholder="Ward filter" />
          </Section>
          <Section title={`Users (${total})`}>
            {users.length === 0 ? (
              <EmptyState title="No users found" message="Try another search term." />
            ) : (
              <View style={styles.list}>
                {users.map((item) => (
                  <Pressable
                    key={item.id}
                    onPress={() => navigation.navigate("OfficerUserDetail", { userId: item.id })}
                    style={styles.row}
                  >
                    <View style={styles.rowCopy}>
                      <Text style={styles.rowTitle}>{item.name}</Text>
                      <Text style={styles.meta}>{item.email} · {item.ward ?? "No ward"}</Text>
                    </View>
                    <Badge label={item.isBanned ? "Banned" : "Active"} tone={item.isBanned ? "danger" : "success"} />
                  </Pressable>
                ))}
                <View style={styles.pagination}>
                  <IconButton icon="chevron-left" label="Previous" disabled={page <= 1} onPress={() => setPage((value) => Math.max(1, value - 1))} tone="neutral" />
                  <Text style={styles.meta}>Page {page} of {totalPages}</Text>
                  <IconButton icon="chevron-right" label="Next" disabled={page >= totalPages} onPress={() => setPage((value) => Math.min(totalPages, value + 1))} tone="neutral" />
                </View>
              </View>
            )}
          </Section>
        </>
      ) : null}
    </OfficerScreen>
  );
}

const styles = StyleSheet.create({
  topActions: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 8,
  },
  panel: {
    backgroundColor: officerColors.surface,
    borderColor: officerColors.borderStrong,
    borderRadius: 8,
    borderWidth: 1,
    gap: 10,
    padding: 14,
  },
  name: {
    color: officerColors.text,
    fontSize: 20,
    fontWeight: "900",
  },
  meta: {
    color: officerColors.textMuted,
    fontSize: 12,
    lineHeight: 18,
  },
  badges: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  actionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  list: {
    gap: 10,
  },
  row: {
    alignItems: "center",
    backgroundColor: officerColors.surface,
    borderColor: officerColors.borderStrong,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    padding: 14,
  },
  rowCopy: {
    flex: 1,
  },
  rowTitle: {
    color: officerColors.text,
    fontSize: 15,
    fontWeight: "900",
  },
  pagination: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
});
