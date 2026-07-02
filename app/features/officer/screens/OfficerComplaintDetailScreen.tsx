import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useCallback, useMemo, useState } from "react";
import { Alert, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "../../../constants/colors";
import { getApiErrorMessage } from "../../../../src/lib/api";
import { useAuth } from "../../auth/context/AuthContext";
import { useRealtime } from "../../realtime/context/RealtimeContext";
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
  Toast,
} from "../components/OfficerUI";
import {
  addInternalNote,
  addOfficialResponse,
  assignComplaint,
  deleteInternalNote,
  deleteOfficialResponse,
  editInternalNote,
  editOfficialResponse,
  getComplaintDetail,
  listOfficers,
  removeComplaintAssignment,
  runComplaintAction,
  updateComplaintDepartment,
  updateComplaintPriority,
  updateComplaintStatus,
} from "../services/officer.service";
import type {
  ComplaintPriority,
  ComplaintStatus,
  OfficerComment,
  OfficerComplaintDetailProps,
  OfficerComplaint,
  OfficerDirectoryItem,
  OfficerTimelineItem,
} from "../types/officer.types";

type Props = OfficerComplaintDetailProps;

const statusOptions: Array<{ label: string; value: ComplaintStatus }> = [
  { label: "Pending", value: "pending" },
  { label: "Accepted", value: "accepted" },
  { label: "Working", value: "in_progress" },
  { label: "Resolved", value: "resolved" },
  { label: "Rejected", value: "rejected" },
];

const priorityOptions: Array<{ label: string; value: ComplaintPriority }> = [
  { label: "Low", value: "low" },
  { label: "Medium", value: "medium" },
  { label: "High", value: "high" },
  { label: "Critical", value: "critical" },
];

function itemId(item: { id?: string; _id?: string }) {
  return item.id ?? item._id ?? "";
}

function canAssign(role?: string): boolean {
  return role === "supervisor" || role === "admin";
}

export default function OfficerComplaintDetailScreen({ route }: Props) {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const { joinComplaint } = useRealtime();
  const complaintId = route?.params?.complaintId ?? "";
  const [complaint, setComplaint] = useState<OfficerComplaint | null>(null);
  const [timeline, setTimeline] = useState<OfficerTimelineItem[]>([]);
  const [comments, setComments] = useState<OfficerComment[]>([]);
  const [officers, setOfficers] = useState<OfficerDirectoryItem[]>([]);
  const [selectedOfficer, setSelectedOfficer] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<ComplaintStatus>("pending");
  const [selectedPriority, setSelectedPriority] = useState<ComplaintPriority>("medium");
  const [department, setDepartment] = useState("");
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [response, setResponse] = useState("");
  const [editingResponseId, setEditingResponseId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [toastDanger, setToastDanger] = useState(false);

  const loadDetail = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [detail, officerList] = await Promise.all([
        getComplaintDetail(complaintId),
        listOfficers(),
      ]);
      setComplaint(detail.complaint);
      setTimeline(detail.timeline);
      setComments(detail.comments);
      setOfficers(officerList);
      setSelectedOfficer(detail.complaint.assignedOfficerId ?? "");
      setSelectedStatus(detail.complaint.status);
      setSelectedPriority(detail.complaint.priority);
      setDepartment(detail.complaint.assignedDepartment ?? "");
    } catch (loadError) {
      setError(getApiErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, [complaintId]);

  useFocusEffect(
    useCallback(() => {
      joinComplaint(complaintId);
      void loadDetail();
    }, [complaintId, joinComplaint, loadDetail]),
  );
  useRealtimeInvalidation(
    [
      "complaint:status_updated",
      "complaint:resolved",
      "complaint:new_comment",
      "officer:queue_updated",
    ],
    () => void loadDetail(),
    (payload) => payload.complaintId === complaintId,
  );

  const notes = useMemo(
    () => timeline.filter((item) => item.type === "note_added" && item.isInternal),
    [timeline],
  );
  const officialResponses = comments.filter((comment) => comment.official);
  const photos = complaint ? [...complaint.photos, complaint.photo].filter(Boolean) as string[] : [];

  async function runAction(label: string, action: () => Promise<void>) {
    setSubmitting(true);
    setToast(null);

    try {
      await action();
      setToastDanger(false);
      setToast(label);
      await loadDetail();
    } catch (actionError) {
      setToastDanger(true);
      setToast(getApiErrorMessage(actionError));
    } finally {
      setSubmitting(false);
    }
  }

  function confirm(label: string, action: () => Promise<void>) {
    Alert.alert(label, "Please confirm this officer action.", [
      { text: "Cancel", style: "cancel" },
      { text: "Confirm", onPress: () => void runAction(`${label} completed.`, action) },
    ]);
  }

  if (loading) {
    return (
      <OfficerScreen title="Complaint Detail" footerGap={false}>
        <LoadingState label="Fetching complaint detail..." />
      </OfficerScreen>
    );
  }

  if (error || !complaint) {
    return (
      <OfficerScreen title="Complaint Detail" footerGap={false}>
        <ErrorState message={error ?? "Complaint was not found."} onRetry={loadDetail} />
      </OfficerScreen>
    );
  }

  return (
    <OfficerScreen title={complaint.complaintNo} subtitle={complaint.title} footerGap={false}>
      <Toast message={toast} tone={toastDanger ? "danger" : "success"} />
      <View style={styles.backRow}>
        <IconButton icon="arrow-left" label="Back" onPress={() => navigation.goBack()} tone="neutral" />
        <IconButton icon="refresh" label="Refresh" onPress={loadDetail} tone="neutral" />
      </View>

      <Section title="Complaint information">
        <View style={styles.panel}>
          <Text style={styles.description}>{complaint.description}</Text>
          <View style={styles.badges}>
            <Badge label={complaint.status.replace(/_/g, " ")} tone="info" />
            <Badge label={complaint.priority} tone={complaint.priority === "high" || complaint.priority === "critical" ? "danger" : "warning"} />
            <Badge label={complaint.category} />
          </View>
          <View style={styles.fieldGrid}>
            <Text style={styles.field}>Ward: {complaint.location?.ward ?? "Not set"}</Text>
            <Text style={styles.field}>City: {complaint.location?.city ?? "Not set"}</Text>
            <Text style={styles.field}>Department: {complaint.assignedDepartment ?? "Unassigned"}</Text>
            <Text style={styles.field}>Officer: {complaint.assignedOfficerName ?? "Unassigned"}</Text>
            <Text style={styles.field}>Location: {complaint.location?.address ?? complaint.location?.area ?? "Not provided"}</Text>
            <Text style={styles.field}>
              Coordinates: {complaint.location?.lat ?? "-"}, {complaint.location?.lng ?? "-"}
            </Text>
          </View>
        </View>
      </Section>

      <Section title="Images">
        {photos.length === 0 ? (
          <EmptyState title="No images" message="The citizen did not attach complaint images." />
        ) : (
          <View style={styles.imageGrid}>
            {photos.map((photoUrl) => (
              <Image key={photoUrl} source={{ uri: photoUrl }} style={styles.photo} />
            ))}
          </View>
        )}
      </Section>

      <Section title="AI analysis">
        <View style={styles.panel}>
          <Text style={styles.field}>Summary: {complaint.aiAnalysis?.summary ?? complaint.ai?.summary ?? "Not analyzed yet"}</Text>
          <Text style={styles.field}>
            Confidence: {complaint.aiAnalysis?.confidence ?? complaint.aiAnalysis?.confidence_score ?? 0}%
          </Text>
          <Text style={styles.field}>Suggested category: {complaint.aiAnalysis?.detectedCategory ?? complaint.ai?.suggestedCategory ?? "-"}</Text>
          <Text style={styles.field}>Priority score: {complaint.priorityScore ?? 0}</Text>
          <Text style={styles.field}>Reasons: {complaint.priorityReasons.join(", ") || "None recorded"}</Text>
        </View>
      </Section>

      <Section title="Workflow actions">
        <View style={styles.panel}>
          <TextField value={reason} onChangeText={setReason} placeholder="Reason or resolution note" multiline />
          <View style={styles.actionGrid}>
            <IconButton icon="check-circle-outline" label="Accept" disabled={submitting} onPress={() => confirm("Accept complaint", () => runComplaintAction(complaint.id, "accept", reason))} />
            <IconButton icon="play-circle-outline" label="Start" disabled={submitting} onPress={() => confirm("Start work", () => runComplaintAction(complaint.id, "start", reason))} />
            <IconButton icon="check-decagram-outline" label="Resolve" disabled={submitting} onPress={() => confirm("Resolve complaint", () => runComplaintAction(complaint.id, "resolve", reason))} />
            <IconButton icon="close-octagon-outline" label="Reject" disabled={submitting} onPress={() => confirm("Reject complaint", () => runComplaintAction(complaint.id, "reject", reason))} tone="danger" />
            <IconButton icon="restore" label="Reopen" disabled={submitting} onPress={() => confirm("Reopen complaint", () => runComplaintAction(complaint.id, "reopen", reason))} tone="neutral" />
          </View>
          <SelectRow label="Update status" value={selectedStatus} options={statusOptions} onChange={setSelectedStatus} />
          <IconButton icon="swap-horizontal" label="Apply status" disabled={submitting} onPress={() => confirm("Update status", () => updateComplaintStatus(complaint.id, selectedStatus, reason))} tone="neutral" />
          <SelectRow label="Change priority" value={selectedPriority} options={priorityOptions} onChange={setSelectedPriority} />
          <IconButton icon="flag-outline" label="Apply priority" disabled={submitting} onPress={() => confirm("Update priority", () => updateComplaintPriority(complaint.id, selectedPriority, reason))} tone="neutral" />
          <TextField value={department} onChangeText={setDepartment} placeholder="Department" />
          <IconButton icon="office-building-outline" label="Change department" disabled={submitting} onPress={() => confirm("Change department", () => updateComplaintDepartment(complaint.id, department, reason))} tone="neutral" />
        </View>
      </Section>

      <Section title="Assignment">
        <View style={styles.panel}>
          <Text style={styles.field}>Assigned officer: {complaint.assignedOfficerName ?? "Unassigned"}</Text>
          <SelectRow
            label="Assign to"
            value={selectedOfficer}
            options={[
              { label: "Select", value: "" },
              ...officers.slice(0, 8).map((officer) => ({ label: officer.name, value: officer.id })),
            ]}
            onChange={setSelectedOfficer}
          />
          <View style={styles.actionGrid}>
            <IconButton icon="account-plus-outline" label="Assign" disabled={!canAssign(user?.role) || submitting || !selectedOfficer} onPress={() => confirm("Assign complaint", () => assignComplaint(complaint.id, selectedOfficer))} />
            <IconButton icon="account-switch-outline" label="Reassign" disabled={!canAssign(user?.role) || submitting || !selectedOfficer} onPress={() => confirm("Reassign complaint", () => assignComplaint(complaint.id, selectedOfficer))} tone="neutral" />
            <IconButton icon="account-remove-outline" label="Remove" disabled={!canAssign(user?.role) || submitting} onPress={() => confirm("Remove assignment", () => removeComplaintAssignment(complaint.id))} tone="danger" />
          </View>
        </View>
      </Section>

      <Section title="Officer notes">
        <View style={styles.panel}>
          <TextField value={note} onChangeText={setNote} placeholder="Private internal note" multiline />
          <IconButton
            icon={editingNoteId ? "note-edit-outline" : "note-plus-outline"}
            label={editingNoteId ? "Update note" : "Add note"}
            disabled={submitting || !note.trim()}
            onPress={() =>
              void runAction(editingNoteId ? "Note updated." : "Note added.", async () => {
                if (editingNoteId) {
                  await editInternalNote(complaint.id, editingNoteId, note);
                } else {
                  await addInternalNote(complaint.id, note);
                }
                setNote("");
                setEditingNoteId(null);
              })
            }
          />
          {notes.length === 0 ? (
            <EmptyState title="No internal notes" message="Private officer notes will appear here." />
          ) : (
            notes.map((item) => (
              <View key={item._id} style={styles.noteItem}>
                <Text style={styles.noteText}>{item.message}</Text>
                <Text style={styles.field}>{item.actorName ?? "Officer"} · {new Date(item.createdAt).toLocaleString()}</Text>
                {item.actorId === user?.id ? (
                  <View style={styles.inlineActions}>
                    <Pressable onPress={() => { setEditingNoteId(item._id); setNote(item.message ?? ""); }}>
                      <Text style={styles.link}>Edit</Text>
                    </Pressable>
                    <Pressable onPress={() => confirm("Delete note", () => deleteInternalNote(complaint.id, item._id))}>
                      <Text style={styles.dangerLink}>Delete</Text>
                    </Pressable>
                  </View>
                ) : null}
              </View>
            ))
          )}
        </View>
      </Section>

      <Section title="Official responses">
        <View style={styles.panel}>
          <TextField value={response} onChangeText={setResponse} placeholder="Public official response" multiline />
          <IconButton
            icon={editingResponseId ? "message-text-outline" : "bullhorn-outline"}
            label={editingResponseId ? "Update response" : "Add official response"}
            disabled={submitting || !response.trim()}
            onPress={() =>
              void runAction(editingResponseId ? "Response updated." : "Official response added.", async () => {
                if (editingResponseId) {
                  await editOfficialResponse(complaint.id, editingResponseId, response);
                } else {
                  await addOfficialResponse(complaint.id, response);
                }
                setResponse("");
                setEditingResponseId(null);
              })
            }
          />
          {officialResponses.length === 0 ? (
            <EmptyState title="No public responses" message="Official citizen-facing responses will appear here." />
          ) : (
            officialResponses.map((item) => {
              const responseId = itemId(item);
              return (
                <View key={responseId} style={styles.noteItem}>
                  <View style={styles.responseHeader}>
                    <Badge label="Official" tone="success" />
                    <Text style={styles.field}>{item.authorName}</Text>
                  </View>
                  <Text style={styles.noteText}>{item.body}</Text>
                  {item.authorId === user?.id ? (
                    <View style={styles.inlineActions}>
                      <Pressable onPress={() => { setEditingResponseId(responseId); setResponse(item.body); }}>
                        <Text style={styles.link}>Edit</Text>
                      </Pressable>
                      <Pressable onPress={() => confirm("Delete response", () => deleteOfficialResponse(complaint.id, responseId))}>
                        <Text style={styles.dangerLink}>Delete</Text>
                      </Pressable>
                    </View>
                  ) : null}
                </View>
              );
            })
          )}
        </View>
      </Section>

      <Section title="Timeline">
        <View style={styles.timeline}>
          {timeline.map((item) => (
            <View key={item._id} style={styles.timelineItem}>
              <MaterialCommunityIcons name="circle-medium" size={26} color={item.isInternal ? colors.warning : colors.primary} />
              <View style={styles.timelineCopy}>
                <Text style={styles.timelineTitle}>{item.title}</Text>
                <Text style={styles.field}>{item.message ?? "No details"} · {new Date(item.createdAt).toLocaleString()}</Text>
              </View>
            </View>
          ))}
        </View>
      </Section>
    </OfficerScreen>
  );
}

const styles = StyleSheet.create({
  backRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 6,
  },
  panel: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
    padding: 14,
  },
  description: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 22,
  },
  badges: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  fieldGrid: {
    gap: 8,
  },
  field: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
  },
  imageGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  photo: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 8,
    height: 132,
    width: "48%",
  },
  actionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  noteItem: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 8,
    gap: 7,
    padding: 12,
  },
  noteText: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
  },
  inlineActions: {
    flexDirection: "row",
    gap: 14,
  },
  link: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "900",
  },
  dangerLink: {
    color: colors.error,
    fontSize: 12,
    fontWeight: "900",
  },
  responseHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  timeline: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    padding: 12,
  },
  timelineItem: {
    flexDirection: "row",
    gap: 8,
    paddingVertical: 8,
  },
  timelineCopy: {
    flex: 1,
    gap: 4,
  },
  timelineTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "900",
  },
});
