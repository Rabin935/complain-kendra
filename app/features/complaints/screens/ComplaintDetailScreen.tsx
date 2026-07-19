import { Text, TextInput } from "@/src/theme/typography";
import {
  MaterialCommunityIcons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect,
  useMemo,
  useRef,
  useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "../../../constants/colors";
import { radii, shadows } from "../../../constants/theme";
import { useRealtime } from "../../realtime/context/RealtimeContext";
import { useRealtimeInvalidation } from "../../realtime/hooks/useRealtimeInvalidation";
import { useAuth } from "../../auth/context/AuthContext";
import {
  sampleProfile,
} from "../../user/data/citizenSampleData";
import {
  addComplaintComment,
  deleteCitizenComplaint,
  fetchComplaintById,
  followComplaintApi,
  rateComplaintResolution,
  unfollowComplaintApi,
  upvoteComplaintApi,
} from "../../user/services/citizen.service";
import type {
  CitizenComplaint,
  ComplaintComment,
  ComplaintDetailPayload,
  ComplaintTimelineItem,
} from "../../user/types/citizen.types";
import type { UserStackParamList } from "../../user/types/user.types";
import {
  formatCompactDate,
  priorityColors,
  priorityLabels,
  statusColors,
  statusLabels,
} from "../../user/utils/citizenUi";

type ComplaintDetailProps = NativeStackScreenProps<UserStackParamList, "ComplaintDetail">;

export default function ComplaintDetailScreen({ navigation, route }: ComplaintDetailProps) {
  const { complaintId } = route.params;
  const { user } = useAuth();
  const { joinComplaint } = useRealtime();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const commentsY = useRef(0);

  function scrollToComments() {
    scrollRef.current?.scrollTo({ y: Math.max(commentsY.current - 12, 0), animated: true });
  }
  const [detail, setDetail] = useState<ComplaintDetailPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [upvoting, setUpvoting] = useState(false);
  const [following, setFollowing] = useState(false);
  const [commentDraft, setCommentDraft] = useState("");
  const [commenting, setCommenting] = useState(false);
  const [rating, setRating] = useState(5);
  const [ratingComment, setRatingComment] = useState("");
  const [ratingSaving, setRatingSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const complaint = detail?.complaint ?? null;
  const timeline = detail?.timeline ?? [];
  const comments = detail?.comments ?? [];
  const showComments = comments.slice(0, 3);

  const mapTileUrl = useMemo(() => {
    if (!complaint?.location.lat || !complaint.location.lng) {
      return null;
    }

    const zoom = 15;
    const latitudeRad = (complaint.location.lat * Math.PI) / 180;
    const tileCount = 2 ** zoom;
    const x = Math.floor(((complaint.location.lng + 180) / 360) * tileCount);
    const y = Math.floor(
      ((1 - Math.log(Math.tan(latitudeRad) + 1 / Math.cos(latitudeRad)) / Math.PI) / 2) *
        tileCount,
    );

    return `https://tile.openstreetmap.org/${zoom}/${x}/${y}.png`;
  }, [complaint?.location.lat, complaint?.location.lng]);

  useEffect(() => {
    joinComplaint(complaintId);
    void loadDetail();
  }, [complaintId, joinComplaint]);
  useRealtimeInvalidation(
    ["complaint:status_updated", "complaint:resolved", "complaint:new_comment", "complaint:upvoted"],
    () => void loadDetail(true),
    (payload) => payload.complaintId === complaintId,
  );

  async function loadDetail(isRefresh = false) {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError(null);

    try {
      const response = await fetchComplaintById(complaintId);
      setDetail(response);
      setFollowing(false);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load complaint details.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function handleUpvote() {
    if (!complaint || upvoting) {
      return;
    }

    setUpvoting(true);
    setDetail((current) =>
      current
        ? {
            ...current,
            complaint: {
              ...current.complaint,
              upvotes: current.complaint.upvotes + 1,
            },
          }
        : current,
    );

    try {
      await upvoteComplaintApi(complaint.id);
    } catch (upvoteError) {
      setDetail((current) =>
        current
          ? {
              ...current,
              complaint: {
                ...current.complaint,
                upvotes: Math.max(0, current.complaint.upvotes - 1),
              },
            }
          : current,
      );
      setError(upvoteError instanceof Error ? upvoteError.message : "Unable to upvote complaint.");
    } finally {
      setUpvoting(false);
    }
  }

  async function handleFollow() {
    if (!complaint) {
      return;
    }

    const nextFollowed = !complaint.followed;
    setFollowing(true);
    setDetail((current) =>
      current
        ? {
            ...current,
            complaint: {
              ...current.complaint,
              followed: nextFollowed,
            },
          }
        : current,
    );

    try {
      if (nextFollowed) {
        await followComplaintApi(complaint.id);
      } else {
        await unfollowComplaintApi(complaint.id);
      }
    } catch (followError) {
      setDetail((current) =>
        current
          ? {
              ...current,
              complaint: {
                ...current.complaint,
                followed: !nextFollowed,
              },
            }
          : current,
      );
      setError(followError instanceof Error ? followError.message : "Unable to update follow state.");
    } finally {
      setFollowing(false);
    }
  }

  async function handleShare() {
    if (!complaint) {
      return;
    }

    await Share.share({
      message: `${complaint.title}\n${complaint.location.address}\nComplaint ${complaint.complaintNo}`,
    });
  }

  function confirmDelete() {
    if (!complaint || deleting) {
      return;
    }

    setDeleteError(null);
    setDeleteConfirmVisible(true);
  }

  async function handleDeleteComplaint() {
    if (!complaint || deleting) {
      return;
    }

    setDeleting(true);
    setDeleteError(null);

    try {
      await deleteCitizenComplaint(complaint.id);
      setDeleteConfirmVisible(false);
      navigation.goBack();
    } catch (deleteComplaintError) {
      setDeleteError(
        deleteComplaintError instanceof Error
          ? deleteComplaintError.message
          : "Unable to delete complaint. Please try again.",
      );
    } finally {
      setDeleting(false);
    }
  }

  async function handleAddComment() {
    if (!complaint || !commentDraft.trim() || commenting) {
      return;
    }

    setCommenting(true);

    try {
      const comment = await addComplaintComment(complaint.id, commentDraft);
      setDetail((current) =>
        current
          ? {
              ...current,
              comments: [...current.comments, comment],
              complaint: {
                ...current.complaint,
                comments: current.complaint.comments + 1,
              },
            }
          : current,
      );
      setCommentDraft("");
    } catch (commentError) {
      setError(commentError instanceof Error ? commentError.message : "Unable to add comment.");
    } finally {
      setCommenting(false);
    }
  }

  async function handleRateResolution() {
    if (!complaint || ratingSaving) {
      return;
    }

    setRatingSaving(true);

    try {
      await rateComplaintResolution(complaint.id, {
        rating,
        comment: ratingComment,
      });
      setRatingComment("");
      setError(null);
    } catch (rateError) {
      setError(rateError instanceof Error ? rateError.message : "Unable to save rating.");
    } finally {
      setRatingSaving(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView edges={["top"]} style={styles.safeArea}>
        <View style={styles.loadingState}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.loadingText}>Loading complaint detail...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !complaint) {
    return (
      <SafeAreaView edges={["top"]} style={styles.safeArea}>
        <View style={styles.errorState}>
          <MaterialCommunityIcons name="alert-circle-outline" size={42} color={colors.error} />
          <Text style={styles.errorTitle}>{error ?? "Complaint not found."}</Text>
          <Pressable style={styles.retryButton} onPress={() => void loadDetail()}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const reporterName = complaint.reporterPrivate ? "Private citizen" : complaint.reporterName ?? sampleProfile.name;
  const isOwnComplaint = Boolean(user?.id && complaint.reporterId && user.id === complaint.reporterId);

  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} tintColor={colors.primary} onRefresh={() => void loadDetail(true)} />
        }
      >
        <View style={styles.mapHero}>
          {mapTileUrl ? (
            <>
            <Image source={{ uri: mapTileUrl }} style={styles.mapImage} resizeMode="cover" />
            <View style={styles.mapOverlay} />
            <View style={styles.pinMarker}>
              <MaterialCommunityIcons name="map-marker" size={42} color={colors.primary} />
            </View>
            </>
          ) : (
            <View style={styles.mapFallback} />
          )}

          <View style={styles.header}>
            <Pressable style={styles.iconButton} onPress={() => navigation.goBack()}>
              <MaterialCommunityIcons name="arrow-left" size={20} color={colors.text} />
            </Pressable>
            <View style={styles.headerActions}>
              <Pressable style={styles.iconButton} onPress={() => void handleShare()}>
                <MaterialCommunityIcons name="share-variant-outline" size={19} color={colors.text} />
              </Pressable>
              {isOwnComplaint ? (
                <Pressable
                  accessibilityLabel="Delete complaint"
                  style={styles.deleteButton}
                  onPress={confirmDelete}
                  disabled={deleting}
                >
                  {deleting ? (
                    <ActivityIndicator size="small" color={colors.error} />
                  ) : (
                    <MaterialCommunityIcons name="trash-can-outline" size={19} color={colors.error} />
                  )}
                </Pressable>
              ) : null}
              <Pressable
                style={[styles.followButton, complaint.followed ? styles.followButtonActive : null]}
                onPress={() => void handleFollow()}
                disabled={following}
              >
                <MaterialCommunityIcons
                  name={complaint.followed ? "bookmark-check" : "bookmark-outline"}
                  size={18}
                  color={complaint.followed ? colors.surface : colors.text}
                />
              </Pressable>
            </View>
          </View>
        </View>

        <View style={styles.detailSheet}>
          <View style={styles.badgeRow}>
            <View style={[styles.statusBadge, { backgroundColor: `${statusColors[complaint.status]}18` }]}>
              <Text style={[styles.statusText, { color: statusColors[complaint.status] }]}>
                {statusLabels[complaint.status]}
              </Text>
            </View>
            <View style={[styles.priorityBadge, { backgroundColor: `${priorityColors[complaint.priority]}14` }]}>
              <Text style={[styles.priorityText, { color: priorityColors[complaint.priority] }]}>
                {priorityLabels[complaint.priority]}
              </Text>
            </View>
            <Text style={styles.complaintNo}>{complaint.complaintNo}</Text>
          </View>

          <Text style={styles.title}>{complaint.title}</Text>
          <View style={styles.detailMetaRow}>
            <Text style={styles.detailMeta}>📍 {complaint.location.ward}, {complaint.location.city}</Text>
            <Text style={styles.detailMeta}>⏱ {formatCompactDate(complaint.createdAt)}</Text>
            <Text style={styles.detailMeta}>👁 {complaint.followers} followers</Text>
          </View>

          <View style={styles.reporterCard}>
            <View style={styles.reporterAvatar}>
              <Text style={styles.reporterInitials}>
                {reporterName.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase()}
              </Text>
            </View>
            <View style={styles.reporterCopy}>
              <Text style={styles.reporterName}>{reporterName} ✅</Text>
              <Text style={styles.reporterMeta}>Resident · {complaint.location.ward}</Text>
            </View>
            <Pressable onPress={scrollToComments}>
              <Text style={styles.reporterMessage}>💬</Text>
            </Pressable>
          </View>

          <Text style={styles.description}>{complaint.description}</Text>

          {complaint.photos.length ? (
            <View style={styles.photoGallery}>
              <Image source={{ uri: complaint.photos[0] }} style={styles.photoMain} />
              {complaint.photos.length > 1 ? (
                <View style={styles.photoSide}>
                  <Image source={{ uri: complaint.photos[1] }} style={styles.photoSmall} />
                  {complaint.photos[2] ? (
                    <View style={styles.photoSmall}>
                      <Image source={{ uri: complaint.photos[2] }} style={styles.photoMoreImage} />
                      {complaint.photos.length > 3 ? (
                        <>
                          <View style={styles.photoMoreOverlay} />
                          <Text style={styles.photoMoreText}>+{complaint.photos.length - 3}</Text>
                        </>
                      ) : null}
                    </View>
                  ) : null}
                </View>
              ) : null}
            </View>
          ) : null}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>AI Analysis</Text>
          {complaint.aiAnalysis ? (
            <View style={styles.analysisCard}>
              <View style={styles.analysisRow}>
                <AnalysisChip label="Verified" value={complaint.aiVerified ? "Yes" : "No"} />
                <AnalysisChip label="Priority" value={complaint.aiAnalysis.priority} />
                <AnalysisChip label="ETA" value={`${complaint.aiAnalysis.etaDays} days`} />
              </View>
              <Text style={styles.analysisText}>{complaint.aiSummary ?? complaint.aiAnalysis.summary}</Text>
              <Text style={styles.analysisMeta}>
                {complaint.aiAnalysis.department} · Confidence {complaint.aiAnalysis.confidence}%
              </Text>
            </View>
          ) : (
            <View style={styles.emptyInline}>
              <Text style={styles.emptyInlineText}>AI analysis is not available yet.</Text>
            </View>
          )}
        </View>

        <View style={styles.statsRow}>
          <StatPill icon="arrow-up-bold-outline" label="Upvotes" value={`${complaint.upvotes}`} />
          <StatPill icon="comment-outline" label="Comments" value={`${complaint.comments}`} />
          <StatPill icon="bookmark-outline" label="Followers" value={`${complaint.followers}`} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Status Timeline</Text>
          <View style={styles.timelineCard}>
            {timeline.map((item, index) => (
              <TimelineRow
                key={`${item.label}-${index}`}
                item={item}
                first={index === 0}
                last={index === timeline.length - 1}
              />
            ))}
          </View>
        </View>

        <View
          style={styles.section}
          onLayout={(event) => {
            commentsY.current = event.nativeEvent.layout.y;
          }}
        >
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Comments</Text>
            <Text style={styles.sectionCount}>{comments.length}</Text>
          </View>
          {showComments.length ? (
            <View style={styles.commentsList}>
              {showComments.map((comment) => (
                <CommentCard key={comment.id} comment={comment} />
              ))}
            </View>
          ) : (
            <View style={styles.emptyInline}>
              <Text style={styles.emptyInlineText}>No comments yet.</Text>
            </View>
          )}
          <View style={styles.commentComposer}>
            <TextInput
              value={commentDraft}
              onChangeText={setCommentDraft}
              placeholder="Add a public comment..."
              placeholderTextColor={colors.textMuted}
              multiline
              style={styles.commentInput}
            />
            <Pressable style={styles.commentButton} onPress={() => void handleAddComment()} disabled={commenting}>
              {commenting ? <ActivityIndicator color={colors.surface} /> : null}
              <Text style={styles.commentButtonText}>{commenting ? "Posting..." : "Post"}</Text>
            </Pressable>
          </View>
        </View>

        {complaint.status === "resolved" ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Rate Resolution</Text>
            <View style={styles.ratingCard}>
              <View style={styles.starRow}>
                {[1, 2, 3, 4, 5].map((value) => (
                  <Pressable key={value} onPress={() => setRating(value)}>
                    <MaterialCommunityIcons
                      name={value <= rating ? "star" : "star-outline"}
                      size={28}
                      color="#F59E0B"
                    />
                  </Pressable>
                ))}
              </View>
              <TextInput
                value={ratingComment}
                onChangeText={setRatingComment}
                placeholder="Optional feedback for the officer..."
                placeholderTextColor={colors.textMuted}
                multiline
                style={styles.commentInput}
              />
              <Pressable style={styles.commentButton} onPress={() => void handleRateResolution()} disabled={ratingSaving}>
                {ratingSaving ? <ActivityIndicator color={colors.surface} /> : null}
                <Text style={styles.commentButtonText}>{ratingSaving ? "Saving..." : "Submit rating"}</Text>
              </Pressable>
            </View>
          </View>
        ) : null}
        </View>
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 14 }]}>
        <Pressable
          style={styles.miniPill}
          onPress={() => void handleUpvote()}
          disabled={upvoting}
        >
          {upvoting ? (
            <ActivityIndicator color={colors.primary} size="small" />
          ) : (
            <MaterialCommunityIcons name="arrow-up-bold" size={18} color={colors.primary} />
          )}
          <Text style={styles.miniPillValue}>{complaint.upvotes}</Text>
        </Pressable>

        <Pressable style={styles.miniPillNeutral} onPress={scrollToComments}>
          <MaterialCommunityIcons name="comment-outline" size={18} color={colors.textSecondary} />
          <Text style={styles.miniPillValueNeutral}>{complaint.comments}</Text>
        </Pressable>

        <Pressable
          style={styles.followUpdatesShell}
          onPress={() => void handleFollow()}
          disabled={following}
        >
          <LinearGradient
            colors={[colors.primaryMid, colors.primary]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={styles.followUpdates}
          >
            {following ? (
              <ActivityIndicator color={colors.surface} />
            ) : (
              <>
                <MaterialCommunityIcons
                  name={complaint.followed ? "bell-check" : "bell-ring-outline"}
                  size={18}
                  color={colors.surface}
                />
                <Text style={styles.followUpdatesText}>
                  {complaint.followed ? "Following" : "Follow Updates"}
                </Text>
              </>
            )}
          </LinearGradient>
        </Pressable>
      </View>

      <Modal
        visible={deleteConfirmVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!deleting) setDeleteConfirmVisible(false);
        }}
      >
        <View style={styles.deleteModalBackdrop}>
          <View style={styles.deleteModalCard}>
            <View style={styles.deleteModalIcon}>
              <MaterialCommunityIcons name="trash-can-outline" size={26} color={colors.error} />
            </View>
            <Text style={styles.deleteModalTitle}>Delete complaint?</Text>
            <Text style={styles.deleteModalText}>
              This permanently removes your complaint and cannot be undone.
            </Text>
            {deleteError ? <Text style={styles.deleteModalError}>{deleteError}</Text> : null}
            <View style={styles.deleteModalActions}>
              <Pressable
                style={styles.deleteCancelButton}
                onPress={() => setDeleteConfirmVisible(false)}
                disabled={deleting}
              >
                <Text style={styles.deleteCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.deleteConfirmButton, deleting ? styles.deleteDisabled : null]}
                onPress={() => void handleDeleteComplaint()}
                disabled={deleting}
              >
                {deleting ? (
                  <ActivityIndicator size="small" color={colors.surface} />
                ) : (
                  <Text style={styles.deleteConfirmText}>Delete</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function AnalysisChip({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.analysisChip}>
      <Text style={styles.analysisChipLabel}>{label}</Text>
      <Text style={styles.analysisChipValue}>{value}</Text>
    </View>
  );
}

function StatPill({
  icon,
  label,
  value,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.statPill}>
      <MaterialCommunityIcons name={icon} size={18} color={colors.primary} />
      <Text style={styles.statPillValue}>{value}</Text>
      <Text style={styles.statPillLabel}>{label}</Text>
    </View>
  );
}

function TimelineRow({
  item,
  first,
  last,
}: {
  item: ComplaintTimelineItem;
  first: boolean;
  last: boolean;
}) {
  return (
    <View style={styles.timelineRow}>
      <View style={styles.timelineRail}>
        <View style={[styles.timelineDot, item.done ? styles.timelineDotActive : null]} />
        {!last ? <View style={styles.timelineLine} /> : null}
      </View>
      <View style={styles.timelineBody}>
        <Text style={styles.timelineLabel}>{item.label}</Text>
        <Text style={styles.timelineText}>{item.at}</Text>
      </View>
    </View>
  );
}

function CommentCard({ comment, depth = 0 }: { comment: ComplaintComment; depth?: number }) {
  return (
    <View style={depth > 0 ? styles.replyWrap : null}>
      <View style={styles.commentCard}>
      <View style={styles.commentAvatar}>
        <Text style={styles.commentAvatarText}>{comment.authorName.slice(0, 1).toUpperCase()}</Text>
      </View>
      <View style={styles.commentBody}>
        <View style={styles.commentTop}>
          <Text style={styles.commentAuthor}>{comment.authorName}</Text>
          <Text style={styles.commentMeta}>
            {comment.authorType}
            {comment.official ? " · Official" : ""}
          </Text>
        </View>
        <Text style={styles.commentText}>{comment.body}</Text>
        <View style={styles.commentFooter}>
          <MaterialCommunityIcons name="arrow-up-bold-outline" size={14} color={colors.textMuted} />
          <Text style={styles.commentFooterText}>{comment.upvoteCount}</Text>
          <Text style={styles.commentFooterText}>{formatCompactDate(comment.createdAt)}</Text>
        </View>
      </View>
      </View>
      {comment.replies.map((reply) => (
        <CommentCard key={reply.id} comment={reply} depth={depth + 1} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingBottom: 0,
    backgroundColor: colors.surface,
  },
  mapHero: {
    height: 260,
    position: "relative",
    overflow: "hidden",
    backgroundColor: "#DCD3F0",
  },
  header: {
    position: "absolute",
    top: 8,
    left: 16,
    right: 16,
    zIndex: 3,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.92)",
    shadowColor: colors.primaryDeep,
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  followButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.92)",
    shadowColor: colors.primaryDeep,
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  deleteButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.92)",
    shadowColor: colors.primaryDeep,
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  followButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  detailSheet: {
    marginTop: -28,
    paddingHorizontal: 22,
    paddingTop: 20,
    paddingBottom: 28,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: colors.surface,
  },
  categoryMark: {
    width: 52,
    height: 52,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  complaintNo: {
    marginLeft: "auto",
    color: colors.primary,
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  title: {
    color: colors.text,
    fontSize: 22,
    lineHeight: 27,
    fontWeight: "900",
    marginTop: 8,
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "700",
    marginTop: 8,
  },
  badgeRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "900",
  },
  priorityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  priorityText: {
    fontSize: 11,
    fontWeight: "900",
  },
  mapCard: {
    height: 200,
    marginTop: 14,
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  mapImage: {
    width: "100%",
    height: "100%",
  },
  mapOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(96,56,176,0.05)",
  },
  pinMarker: {
    position: "absolute",
    left: "50%",
    top: "50%",
    marginLeft: -17,
    marginTop: -34,
  },
  mapFallback: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#DCD3F0",
  },
  detailMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 8,
    marginBottom: 16,
  },
  detailMeta: {
    color: colors.textMuted,
    fontSize: 11,
  },
  reporterCard: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
    marginBottom: 18,
  },
  reporterAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
  },
  reporterInitials: {
    color: colors.surface,
    fontSize: 12,
    fontWeight: "800",
  },
  reporterCopy: {
    flex: 1,
  },
  reporterName: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "700",
  },
  reporterMeta: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  reporterMessage: {
    fontSize: 21,
  },
  description: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 23,
    marginBottom: 18,
  },
  photoGallery: {
    height: 140,
    flexDirection: "row",
    gap: 6,
    marginBottom: 22,
  },
  photoMain: {
    flex: 2,
    height: "100%",
    borderRadius: 16,
    backgroundColor: "#FEF3C7",
  },
  photoSide: {
    flex: 1,
    gap: 6,
  },
  photoSmall: {
    flex: 1,
    width: "100%",
    borderRadius: 14,
    overflow: "hidden",
  },
  photoMoreImage: {
    width: "100%",
    height: "100%",
  },
  photoMoreOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.58)",
  },
  photoMoreText: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    textAlign: "center",
    textAlignVertical: "center",
    color: colors.surface,
    fontSize: 16,
    fontWeight: "800",
  },
  section: {
    marginTop: 18,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "900",
    marginBottom: 10,
  },
  sectionCount: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "800",
  },
  photoRow: {
    gap: 10,
    paddingRight: 4,
  },
  photoCard: {
    width: 170,
    height: 120,
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  photoImage: {
    width: "100%",
    height: "100%",
  },
  analysisCard: {
    padding: 14,
    borderRadius: 22,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  analysisRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  analysisChip: {
    minWidth: 88,
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderRadius: 14,
    backgroundColor: colors.surfaceMuted,
  },
  analysisChipLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  analysisChipValue: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "900",
    marginTop: 5,
  },
  analysisText: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "700",
  },
  analysisMeta: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "700",
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 18,
  },
  statPill: {
    flex: 1,
    minHeight: 88,
    borderRadius: 20,
    padding: 12,
    alignItems: "flex-start",
    justifyContent: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statPillValue: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "900",
    marginTop: 8,
  },
  statPillLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "800",
    marginTop: 2,
  },
  timelineCard: {
    padding: 14,
    borderRadius: 22,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  timelineRow: {
    flexDirection: "row",
    gap: 12,
  },
  timelineRail: {
    width: 18,
    alignItems: "center",
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 2,
    borderColor: colors.surfaceMuted,
  },
  timelineDotActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: colors.border,
    marginTop: 4,
  },
  timelineBody: {
    flex: 1,
    paddingBottom: 12,
  },
  timelineLabel: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "900",
  },
  timelineText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 4,
  },
  commentsList: {
    gap: 10,
  },
  replyWrap: {
    marginLeft: 18,
    marginTop: 8,
    borderLeftWidth: 2,
    borderLeftColor: colors.border,
    paddingLeft: 10,
  },
  commentCard: {
    flexDirection: "row",
    gap: 10,
    padding: 14,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  commentAvatar: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EEE7FA",
  },
  commentAvatarText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: "900",
  },
  commentBody: {
    flex: 1,
    gap: 6,
  },
  commentTop: {
    gap: 2,
  },
  commentAuthor: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "900",
  },
  commentMeta: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "800",
  },
  commentText: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "700",
  },
  commentFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
  },
  commentFooterText: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "800",
    marginRight: 8,
  },
  commentComposer: {
    marginTop: 12,
    gap: 10,
  },
  commentInput: {
    minHeight: 84,
    borderRadius: 18,
    padding: 14,
    color: colors.text,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    fontSize: 13,
    fontWeight: "700",
    textAlignVertical: "top",
  },
  commentButton: {
    minHeight: 46,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    backgroundColor: colors.primary,
  },
  commentButtonText: {
    color: colors.surface,
    fontSize: 13,
    fontWeight: "900",
  },
  ratingCard: {
    padding: 14,
    borderRadius: 20,
    gap: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  starRow: {
    flexDirection: "row",
    gap: 6,
  },
  retryButton: {
    marginTop: 4,
    minHeight: 46,
    paddingHorizontal: 22,
    borderRadius: radii.button,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
  },
  retryButtonText: {
    color: colors.surface,
    fontSize: 14,
    fontWeight: "900",
  },
  bottomBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 14,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    ...shadows.card,
    shadowOffset: { width: 0, height: -10 },
  },
  miniPill: {
    width: 56,
    minHeight: 50,
    borderRadius: radii.field,
    alignItems: "center",
    justifyContent: "center",
    gap: 1,
    backgroundColor: colors.primaryLight,
    borderWidth: 1.5,
    borderColor: colors.primarySoft,
  },
  miniPillValue: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: "800",
  },
  miniPillNeutral: {
    width: 56,
    minHeight: 50,
    borderRadius: radii.field,
    alignItems: "center",
    justifyContent: "center",
    gap: 1,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  miniPillValueNeutral: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: "800",
  },
  followUpdatesShell: {
    flex: 1,
    borderRadius: radii.field,
    overflow: "hidden",
    ...shadows.button,
  },
  followUpdates: {
    minHeight: 50,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  followUpdatesText: {
    color: colors.surface,
    fontSize: 14,
    fontWeight: "800",
  },
  deleteModalBackdrop: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 22,
    backgroundColor: "rgba(21,18,31,0.48)",
  },
  deleteModalCard: {
    width: "100%",
    maxWidth: 360,
    padding: 20,
    borderRadius: 24,
    alignItems: "center",
    backgroundColor: colors.surface,
  },
  deleteModalIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FEE2E2",
  },
  deleteModalTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "800",
    marginTop: 14,
  },
  deleteModalText: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
    marginTop: 7,
  },
  deleteModalError: {
    width: "100%",
    color: colors.error,
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
    marginTop: 12,
  },
  deleteModalActions: {
    width: "100%",
    flexDirection: "row",
    gap: 10,
    marginTop: 20,
  },
  deleteCancelButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
  },
  deleteCancelText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: "800",
  },
  deleteConfirmButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.error,
  },
  deleteConfirmText: {
    color: colors.surface,
    fontSize: 13,
    fontWeight: "800",
  },
  deleteDisabled: {
    opacity: 0.68,
  },
  emptyInline: {
    padding: 14,
    borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyInlineText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "700",
  },
  loadingState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  loadingText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: "700",
  },
  errorState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 28,
  },
  errorTitle: {
    color: colors.text,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "900",
    textAlign: "center",
  },
});
