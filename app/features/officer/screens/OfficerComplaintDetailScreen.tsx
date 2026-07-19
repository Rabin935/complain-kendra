import { Text } from "@/src/theme/typography";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect,
  useNavigation } from "@react-navigation/native";
import { useCallback,
  useMemo,
  useState } from "react";
import { ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "../../../constants/colors";
import { officerColors } from "../../../constants/theme";
import { baseURL, getApiErrorMessage } from "../../../../src/lib/api";
import { useAuth } from "../../auth/context/AuthContext";
import { useRealtime } from "../../realtime/context/RealtimeContext";
import { useRealtimeInvalidation } from "../../realtime/hooks/useRealtimeInvalidation";
import OfficerScreen from "../components/OfficerScreen";
import {
  EmptyState,
  ErrorState,
  IconButton,
  LoadingState,
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

const statusCards: Array<{
  label: string;
  value: ComplaintStatus;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  color: string;
}> = [
  { label: "New", value: "pending", icon: "flag-variant-outline", color: "#FCA5A5" },
  { label: "Ack.", value: "accepted", icon: "check", color: "#FCD34D" },
  { label: "In Progress", value: "in_progress", icon: "progress-clock", color: "#93C5FD" },
  { label: "Resolved", value: "resolved", icon: "check-circle-outline", color: "#86EFAC" },
  { label: "Rejected", value: "rejected", icon: "close-circle-outline", color: "#FCA5A5" },
];

function itemId(item: { id?: string; _id?: string }) {
  return item.id ?? item._id ?? "";
}

function resolvePhotoUrl(value?: string): string {
  if (!value || value === "[object Object]") return "";
  if (/^(https?:|data:|blob:|file:)/i.test(value)) return value;
  return `${baseURL.replace(/\/$/, "")}/${value.replace(/^\//, "")}`;
}

function timeAgo(value: string): string {
  const elapsed = Date.now() - new Date(value).getTime();
  const minutes = Math.max(1, Math.floor(elapsed / 60_000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function initials(name?: string): string {
  if (!name) return "—";
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function canAssign(role?: string): boolean {
  return role === "supervisor" || role === "admin";
}

export default function OfficerComplaintDetailScreen({ route }: Props) {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
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
  const [pendingConfirmation, setPendingConfirmation] = useState<{
    label: string;
    action: () => Promise<void>;
  } | null>(null);

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
  const photos = complaint
    ? Array.from(
        new Set(
          [...complaint.photos, complaint.photo]
            .map((photo) => resolvePhotoUrl(photo))
            .filter(Boolean),
        ),
      )
    : [];
  const confidence =
    complaint?.aiAnalysis?.confidence ?? complaint?.aiAnalysis?.confidence_score ?? 0;
  const assignmentName = complaint?.assignedOfficerName ?? "Unassigned";

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
    setPendingConfirmation({ label, action });
  }

  async function runConfirmedAction() {
    if (!pendingConfirmation || submitting) return;
    const { label, action } = pendingConfirmation;
    setPendingConfirmation(null);
    await runAction(`${label} completed.`, action);
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
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable style={styles.headerButton} onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="arrow-left" size={20} color={officerColors.text} />
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={styles.caseNumber}>#{complaint.complaintNo}</Text>
          <Text style={styles.headerTitle}>Case detail</Text>
        </View>
        <Pressable
          style={styles.editButton}
          onPress={() => {
            setToastDanger(false);
            setToast("Use the case controls below to edit this complaint.");
          }}
        >
          <MaterialCommunityIcons name="pencil-outline" size={15} color={officerColors.text} />
          <Text style={styles.editButtonText}>Edit</Text>
        </Pressable>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: 104 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        <Toast message={toast} tone={toastDanger ? "danger" : "success"} />

        <View style={styles.badges}>
          <Text style={styles.statusBadge}>{complaint.status.replace(/_/g, " ").toUpperCase()}</Text>
          <View style={styles.priorityBadge}>
            <MaterialCommunityIcons name="fire" size={12} color="#FCA5A5" />
            <Text style={styles.priorityBadgeText}>{complaint.priority.toUpperCase()} PRIORITY</Text>
          </View>
          <View style={styles.upvoteMeta}>
            <MaterialCommunityIcons name="arrow-up-bold" size={14} color={officerColors.accent} />
            <Text style={styles.mutedText}>{complaint.upvotes} upvotes</Text>
          </View>
        </View>

        <View style={styles.caseCard}>
          <Text style={styles.caseTitle}>{complaint.title}</Text>
          <View style={styles.caseMeta}>
            <View style={styles.metaItem}>
              <MaterialCommunityIcons name="map-marker-outline" size={15} color={officerColors.accent} />
              <Text style={styles.mutedText}>
                {complaint.location?.ward ?? "Ward not set"}, {complaint.location?.city ?? "City not set"}
              </Text>
            </View>
            <View style={styles.metaItem}>
              <MaterialCommunityIcons name="clock-outline" size={14} color={officerColors.textMuted} />
              <Text style={styles.mutedText}>{timeAgo(complaint.createdAt)}</Text>
            </View>
            <View style={styles.metaItem}>
              <MaterialCommunityIcons name="message-outline" size={14} color={officerColors.textMuted} />
              <Text style={styles.mutedText}>{complaint.comments}</Text>
            </View>
          </View>

          {photos.length ? (
            <View style={styles.photoGallery}>
              <Image source={{ uri: photos[0] }} style={styles.mainPhoto} resizeMode="cover" />
              {photos[1] ? <Image source={{ uri: photos[1] }} style={styles.sidePhoto} resizeMode="cover" /> : null}
              {photos.length > 2 ? (
                <View style={styles.morePhotos}>
                  {photos[2] ? <Image source={{ uri: photos[2] }} style={styles.morePhotoImage} /> : null}
                  <View style={styles.morePhotoShade} />
                  <Text style={styles.morePhotoText}>+{photos.length - 2}</Text>
                </View>
              ) : null}
            </View>
          ) : (
            <View style={styles.noPhoto}>
              <MaterialCommunityIcons name="image-off-outline" size={28} color={officerColors.textMuted} />
              <Text style={styles.mutedText}>No citizen photos attached</Text>
            </View>
          )}
          <Text style={styles.description}>{complaint.description}</Text>
        </View>

        <View style={styles.reuploadCard}>
          <View style={styles.squareIcon}>
            <MaterialCommunityIcons name="cloud-upload-outline" size={21} color={officerColors.textSecondary} />
          </View>
          <View style={styles.flexCopy}>
            <Text style={styles.cardActionTitle}>Request Re-upload from Citizen</Text>
            <Text style={styles.cardActionHint}>Incorrect info or photos? Ask the citizen to resubmit.</Text>
          </View>
          <Pressable
            style={styles.sendSmallButton}
            disabled={submitting}
            onPress={() =>
              confirm("Request photo re-upload", () =>
                addOfficialResponse(
                  complaint.id,
                  "Please re-upload clear and accurate photos for this complaint so our team can continue the review.",
                ),
              )
            }
          >
            <Text style={styles.sendSmallText}>Send →</Text>
          </Pressable>
        </View>

        <LinearGradient
          colors={["rgba(96,56,176,0.24)", "rgba(42,21,80,0.24)"]}
          style={styles.aiCard}
        >
          <View style={styles.aiIcon}>
            <MaterialCommunityIcons name="creation" size={19} color={officerColors.accent} />
          </View>
          <View style={styles.flexCopy}>
            <Text style={styles.aiLabel}>AI VERDICT · {confidence}% CONFIDENCE</Text>
            <Text style={styles.aiText}>
              {complaint.aiAnalysis?.summary ??
                complaint.ai?.summary ??
                `${complaint.category} issue · Severity: ${complaint.priority}.`}
            </Text>
            <Text style={styles.aiHint}>
              Suggested: {complaint.aiAnalysis?.detectedCategory ?? complaint.ai?.suggestedCategory ?? complaint.category}
              {" · "}{complaint.aiAnalysis?.department ?? complaint.assignedDepartment ?? "Department pending"}
            </Text>
          </View>
        </LinearGradient>

        <View style={styles.assignmentCard}>
          <Text style={styles.sectionLabel}>ASSIGNMENT</Text>
          <View style={styles.assigneeRow}>
            <LinearGradient colors={[colors.primary, colors.primaryDeep]} style={styles.avatar}>
              <Text style={styles.avatarText}>{initials(assignmentName)}</Text>
            </LinearGradient>
            <View style={styles.flexCopy}>
              <Text style={styles.assigneeName}>{assignmentName}</Text>
              <Text style={styles.cardActionHint}>
                {complaint.assignedDepartment ?? "Department unassigned"}
                {complaint.assignedOfficerId === user?.id ? " · You" : ""}
              </Text>
            </View>
          </View>
          {canAssign(user?.role) ? (
            <>
              <SelectRow
                label="Assign or reassign"
                value={selectedOfficer}
                options={[
                  { label: "Select", value: "" },
                  ...officers.slice(0, 8).map((officer) => ({ label: officer.name, value: officer.id })),
                ]}
                onChange={setSelectedOfficer}
              />
              <View style={styles.actionGrid}>
                <IconButton
                  icon="account-switch-outline"
                  label={complaint.assignedOfficerId ? "Reassign" : "Assign"}
                  disabled={submitting || !selectedOfficer}
                  onPress={() => confirm("Assign complaint", () => assignComplaint(complaint.id, selectedOfficer))}
                />
                <IconButton
                  icon="account-remove-outline"
                  label="Remove"
                  disabled={submitting || !complaint.assignedOfficerId}
                  onPress={() => confirm("Remove assignment", () => removeComplaintAssignment(complaint.id))}
                  tone="danger"
                />
              </View>
            </>
          ) : null}
        </View>

        <Text style={styles.sectionLabelOutside}>UPDATE STATUS</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statusRow}>
          {statusCards.map((status) => {
            const active = complaint.status === status.value;
            return (
              <Pressable
                key={status.value}
                disabled={submitting}
                style={[styles.statusCard, active ? styles.statusCardActive : null]}
                onPress={() => {
                  setSelectedStatus(status.value);
                  confirm(`Set status to ${status.label}`, () =>
                    updateComplaintStatus(complaint.id, status.value, reason),
                  );
                }}
              >
                <MaterialCommunityIcons name={status.icon} size={21} color={status.color} />
                <Text style={styles.statusCardText}>{status.label}</Text>
                {active ? <View style={[styles.activeDot, { backgroundColor: status.color }]} /> : null}
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={styles.controlsCard}>
          <Text style={styles.sectionLabel}>CASE CONTROLS</Text>
          <TextField value={reason} onChangeText={setReason} placeholder="Reason or resolution note" multiline />
          <SelectRow label="Status" value={selectedStatus} options={statusOptions} onChange={setSelectedStatus} />
          <IconButton
            icon="swap-horizontal"
            label="Apply selected status"
            disabled={submitting}
            onPress={() => confirm("Update status", () => updateComplaintStatus(complaint.id, selectedStatus, reason))}
            tone="neutral"
          />
          <SelectRow label="Priority" value={selectedPriority} options={priorityOptions} onChange={setSelectedPriority} />
          <IconButton
            icon="flag-outline"
            label="Apply priority"
            disabled={submitting}
            onPress={() => confirm("Update priority", () => updateComplaintPriority(complaint.id, selectedPriority, reason))}
            tone="neutral"
          />
          <TextField value={department} onChangeText={setDepartment} placeholder="Department" />
          <View style={styles.actionGrid}>
            <IconButton
              icon="office-building-outline"
              label="Save department"
              disabled={submitting || !department.trim()}
              onPress={() => confirm("Change department", () => updateComplaintDepartment(complaint.id, department, reason))}
              tone="neutral"
            />
            <IconButton
              icon="restore"
              label="Reopen"
              disabled={submitting}
              onPress={() => confirm("Reopen complaint", () => runComplaintAction(complaint.id, "reopen", reason))}
              tone="neutral"
            />
          </View>
        </View>

        <Text style={styles.sectionTitle}>Officer notes</Text>
        <View style={styles.panel}>
          <TextField value={note} onChangeText={setNote} placeholder="Private internal note" multiline />
          <IconButton
            icon={editingNoteId ? "note-edit-outline" : "note-plus-outline"}
            label={editingNoteId ? "Update note" : "Add note"}
            disabled={submitting || !note.trim()}
            onPress={() =>
              void runAction(editingNoteId ? "Note updated." : "Note added.", async () => {
                if (editingNoteId) await editInternalNote(complaint.id, editingNoteId, note);
                else await addInternalNote(complaint.id, note);
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

        <Text style={styles.sectionTitle}>Updates to citizen</Text>
        <View style={styles.panel}>
          <TextField value={response} onChangeText={setResponse} placeholder="Public official response" multiline />
          {officialResponses.map((item) => {
            const responseId = itemId(item);
            return (
              <View key={responseId} style={styles.noteItem}>
                <Text style={styles.officialLabel}>OFFICIAL · {item.authorName}</Text>
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
          })}
        </View>

        <Text style={styles.sectionTitle}>Timeline</Text>
        <View style={styles.timeline}>
          {timeline.map((item) => (
            <View key={item._id} style={styles.timelineItem}>
              <MaterialCommunityIcons name="circle-medium" size={26} color={item.isInternal ? colors.warning : officerColors.accent} />
              <View style={styles.timelineCopy}>
                <Text style={styles.timelineTitle}>{item.title}</Text>
                <Text style={styles.field}>{item.message ?? "No details"} · {new Date(item.createdAt).toLocaleString()}</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      <Modal
        visible={Boolean(pendingConfirmation)}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!submitting) setPendingConfirmation(null);
        }}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalIcon}>
              <MaterialCommunityIcons name="shield-check-outline" size={27} color={officerColors.accent} />
            </View>
            <Text style={styles.modalTitle}>{pendingConfirmation?.label}</Text>
            <Text style={styles.modalMessage}>
              Confirm this change to update the complaint and notify connected screens.
            </Text>
            <View style={styles.modalActions}>
              <Pressable
                style={styles.modalCancel}
                disabled={submitting}
                onPress={() => setPendingConfirmation(null)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={styles.modalConfirm}
                disabled={submitting}
                onPress={() => void runConfirmedAction()}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color={officerColors.background} />
                ) : (
                  <Text style={styles.modalConfirmText}>Confirm</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <View style={[styles.bottomBar, { paddingBottom: Math.max(14, insets.bottom) }]}>
        <Pressable style={styles.messageButton}>
          <MaterialCommunityIcons name="message-text-outline" size={21} color={officerColors.text} />
        </Pressable>
        <Pressable
          style={styles.postButtonShell}
          disabled={submitting || !response.trim()}
          onPress={() =>
            void runAction(editingResponseId ? "Response updated." : "Update posted to citizen.", async () => {
              if (editingResponseId) await editOfficialResponse(complaint.id, editingResponseId, response);
              else await addOfficialResponse(complaint.id, response);
              setResponse("");
              setEditingResponseId(null);
            })
          }
        >
          <LinearGradient
            colors={["#C4B5FD", "#7B4FC8"]}
            style={[styles.postButton, !response.trim() ? styles.disabled : null]}
          >
            {submitting ? (
              <ActivityIndicator color={officerColors.background} />
            ) : (
              <>
                <MaterialCommunityIcons name="send" size={18} color={officerColors.background} />
                <Text style={styles.postButtonText}>Post Update to Citizen</Text>
              </>
            )}
          </LinearGradient>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: officerColors.background },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 14 },
  header: {
    minHeight: 76,
    paddingHorizontal: 20,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: officerColors.surface,
    borderBottomWidth: 1,
    borderBottomColor: officerColors.border,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: officerColors.surfaceRaised,
    borderWidth: 1,
    borderColor: officerColors.borderStrong,
  },
  headerCopy: { flex: 1 },
  caseNumber: {
    color: officerColors.textMuted,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.2,
  },
  headerTitle: {
    color: officerColors.text,
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: -0.4,
    marginTop: 2,
  },
  editButton: {
    minHeight: 36,
    paddingHorizontal: 13,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: officerColors.surfaceRaised,
    borderWidth: 1,
    borderColor: officerColors.borderStrong,
  },
  editButtonText: { color: officerColors.text, fontSize: 12, fontWeight: "900" },
  badges: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 14 },
  statusBadge: {
    color: "#93C5FD",
    backgroundColor: "rgba(147,197,253,0.18)",
    borderRadius: 999,
    overflow: "hidden",
    paddingHorizontal: 10,
    paddingVertical: 5,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  priorityBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: "rgba(239,68,68,0.18)",
  },
  priorityBadgeText: { color: "#FCA5A5", fontSize: 10, fontWeight: "900", letterSpacing: 0.4 },
  upvoteMeta: { marginLeft: "auto", flexDirection: "row", alignItems: "center", gap: 4 },
  mutedText: { color: officerColors.textMuted, fontSize: 11, fontWeight: "600" },
  caseCard: {
    padding: 16,
    marginBottom: 14,
    borderRadius: 18,
    backgroundColor: officerColors.surfaceRaised,
    borderWidth: 1,
    borderColor: officerColors.borderStrong,
  },
  caseTitle: {
    color: officerColors.text,
    fontSize: 19,
    lineHeight: 25,
    fontWeight: "900",
    letterSpacing: -0.3,
    marginBottom: 9,
  },
  caseMeta: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 14 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 3 },
  photoGallery: { height: 108, flexDirection: "row", gap: 6, marginBottom: 14 },
  mainPhoto: { flex: 2, height: "100%", borderRadius: 12, backgroundColor: officerColors.surface },
  sidePhoto: { flex: 1, height: "100%", borderRadius: 12, backgroundColor: officerColors.surface },
  morePhotos: {
    flex: 1,
    height: "100%",
    borderRadius: 12,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  morePhotoImage: { ...StyleSheet.absoluteFillObject, width: "100%", height: "100%" },
  morePhotoShade: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(15,10,31,0.62)" },
  morePhotoText: { color: officerColors.text, fontSize: 16, fontWeight: "900" },
  noPhoto: {
    height: 96,
    borderRadius: 12,
    marginBottom: 14,
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  panel: {
    backgroundColor: officerColors.surface,
    borderColor: officerColors.borderStrong,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
    padding: 14,
    marginBottom: 14,
  },
  description: {
    color: officerColors.textSecondary,
    fontSize: 13,
    lineHeight: 21,
  },
  field: {
    color: officerColors.textMuted,
    fontSize: 12,
    lineHeight: 18,
  },
  reuploadCard: {
    padding: 14,
    marginBottom: 14,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: officerColors.surface,
    borderWidth: 1,
    borderColor: officerColors.borderStrong,
  },
  squareIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  flexCopy: { flex: 1 },
  cardActionTitle: { color: officerColors.text, fontSize: 13, fontWeight: "800" },
  cardActionHint: { color: officerColors.textMuted, fontSize: 11, lineHeight: 16, marginTop: 2 },
  sendSmallButton: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: officerColors.borderStrong,
  },
  sendSmallText: { color: officerColors.accent, fontSize: 12, fontWeight: "900" },
  aiCard: {
    padding: 14,
    marginBottom: 14,
    borderRadius: 16,
    flexDirection: "row",
    gap: 12,
    borderWidth: 1,
    borderColor: "rgba(196,181,253,0.2)",
  },
  aiIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  aiLabel: {
    color: officerColors.accent,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1,
    marginBottom: 5,
  },
  aiText: { color: officerColors.text, fontSize: 13, lineHeight: 20 },
  aiHint: { color: officerColors.textMuted, fontSize: 11, lineHeight: 17, marginTop: 4 },
  assignmentCard: {
    padding: 14,
    marginBottom: 18,
    borderRadius: 16,
    gap: 11,
    backgroundColor: officerColors.surface,
    borderWidth: 1,
    borderColor: officerColors.borderStrong,
  },
  sectionLabel: {
    color: officerColors.textMuted,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1,
  },
  sectionLabelOutside: {
    color: officerColors.textMuted,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1,
    marginBottom: 10,
  },
  assigneeRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  avatar: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  avatarText: { color: officerColors.text, fontSize: 13, fontWeight: "900" },
  assigneeName: { color: officerColors.text, fontSize: 13, fontWeight: "800" },
  actionGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  statusRow: { gap: 8, paddingBottom: 18 },
  statusCard: {
    minWidth: 78,
    minHeight: 76,
    paddingHorizontal: 10,
    paddingVertical: 11,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: officerColors.surface,
    borderWidth: 1,
    borderColor: officerColors.borderStrong,
  },
  statusCardActive: { backgroundColor: "rgba(147,197,253,0.13)", borderColor: "#93C5FD" },
  statusCardText: { color: officerColors.text, fontSize: 10, fontWeight: "800" },
  activeDot: { width: 5, height: 5, borderRadius: 99 },
  controlsCard: {
    padding: 14,
    marginBottom: 20,
    borderRadius: 16,
    gap: 12,
    backgroundColor: officerColors.surface,
    borderWidth: 1,
    borderColor: officerColors.borderStrong,
  },
  sectionTitle: {
    color: officerColors.text,
    fontSize: 17,
    fontWeight: "900",
    marginBottom: 10,
  },
  noteItem: {
    backgroundColor: officerColors.surfaceRaised,
    borderRadius: 8,
    gap: 7,
    padding: 12,
  },
  noteText: {
    color: officerColors.text,
    fontSize: 14,
    lineHeight: 20,
  },
  inlineActions: {
    flexDirection: "row",
    gap: 14,
  },
  link: {
    color: officerColors.accent,
    fontSize: 12,
    fontWeight: "900",
  },
  dangerLink: {
    color: colors.error,
    fontSize: 12,
    fontWeight: "900",
  },
  officialLabel: {
    color: officerColors.accent,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.8,
  },
  timeline: {
    backgroundColor: officerColors.surface,
    borderColor: officerColors.borderStrong,
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    marginBottom: 16,
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
    color: officerColors.text,
    fontSize: 14,
    fontWeight: "900",
  },
  modalBackdrop: {
    flex: 1,
    padding: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(5,3,12,0.76)",
  },
  modalCard: {
    width: "100%",
    maxWidth: 360,
    padding: 20,
    borderRadius: 20,
    alignItems: "center",
    backgroundColor: officerColors.surface,
    borderWidth: 1,
    borderColor: officerColors.borderStrong,
  },
  modalIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: officerColors.surfaceRaised,
  },
  modalTitle: {
    color: officerColors.text,
    fontSize: 19,
    fontWeight: "900",
    textAlign: "center",
    marginTop: 14,
  },
  modalMessage: {
    color: officerColors.textMuted,
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
    marginTop: 7,
  },
  modalActions: { width: "100%", flexDirection: "row", gap: 10, marginTop: 20 },
  modalCancel: {
    flex: 1,
    minHeight: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: officerColors.surfaceRaised,
    borderWidth: 1,
    borderColor: officerColors.borderStrong,
  },
  modalCancelText: { color: officerColors.text, fontSize: 13, fontWeight: "900" },
  modalConfirm: {
    flex: 1,
    minHeight: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: officerColors.accent,
  },
  modalConfirmText: { color: officerColors.background, fontSize: 13, fontWeight: "900" },
  bottomBar: {
    paddingTop: 13,
    paddingHorizontal: 20,
    flexDirection: "row",
    gap: 10,
    backgroundColor: officerColors.surface,
    borderTopWidth: 1,
    borderTopColor: officerColors.borderStrong,
  },
  messageButton: {
    width: 50,
    height: 50,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: officerColors.surfaceRaised,
    borderWidth: 1,
    borderColor: officerColors.borderStrong,
  },
  postButtonShell: { flex: 1 },
  postButton: {
    height: 50,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  postButtonText: { color: officerColors.background, fontSize: 14, fontWeight: "900" },
  disabled: { opacity: 0.48 },
});
