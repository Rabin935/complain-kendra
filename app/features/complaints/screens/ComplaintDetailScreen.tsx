import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "../../../constants/colors";
import {
  categoryMeta,
  sampleProfile,
} from "../../user/data/citizenSampleData";
import {
  fetchComplaintById,
  followComplaintApi,
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
  const [detail, setDetail] = useState<ComplaintDetailPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [upvoting, setUpvoting] = useState(false);
  const [following, setFollowing] = useState(false);

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
    void loadDetail();
  }, [complaintId]);

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
          <Pressable style={styles.primaryButton} onPress={() => void loadDetail()}>
            <Text style={styles.primaryButtonText}>Retry</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const meta = categoryMeta[complaint.category];
  const reporterName = complaint.reporterPrivate ? "Private citizen" : complaint.reporterName ?? sampleProfile.name;

  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} tintColor={colors.primary} onRefresh={() => void loadDetail(true)} />
        }
      >
        <View style={styles.header}>
          <Pressable style={styles.iconButton} onPress={() => navigation.goBack()}>
            <MaterialCommunityIcons name="arrow-left" size={22} color={colors.text} />
          </Pressable>
          <View style={styles.headerActions}>
            <Pressable
              style={[styles.followButton, complaint.followed ? styles.followButtonActive : null]}
              onPress={() => void handleFollow()}
              disabled={following}
            >
              <MaterialCommunityIcons
                name={complaint.followed ? "bookmark-check" : "bookmark-plus-outline"}
                size={18}
                color={complaint.followed ? colors.surface : colors.primary}
              />
            </Pressable>
            <Pressable style={styles.iconButton} onPress={() => void handleUpvote()} disabled={upvoting}>
              <MaterialCommunityIcons name="arrow-up-bold-outline" size={20} color={colors.text} />
            </Pressable>
          </View>
        </View>

        <View style={styles.hero}>
          <View style={[styles.categoryMark, { backgroundColor: meta.softColor }]}>
            <MaterialCommunityIcons
              name={meta.icon as keyof typeof MaterialCommunityIcons.glyphMap}
              size={24}
              color={meta.color}
            />
          </View>
          <Text style={styles.complaintNo}>{complaint.complaintNo}</Text>
          <Text style={styles.title}>{complaint.title}</Text>
          <Text style={styles.subtitle}>{complaint.location.address}</Text>

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
          </View>
        </View>

        {mapTileUrl ? (
          <View style={styles.mapCard}>
            <Image source={{ uri: mapTileUrl }} style={styles.mapImage} resizeMode="cover" />
            <View style={styles.mapOverlay} />
            <View style={styles.pinMarker}>
              <MaterialCommunityIcons name="map-marker" size={34} color={colors.error} />
            </View>
          </View>
        ) : null}

        {complaint.photos.length ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Images</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photoRow}>
              {complaint.photos.map((photo, index) => (
                <View key={`${photo}-${index}`} style={styles.photoCard}>
                  <Image source={{ uri: photo }} style={styles.photoImage} />
                </View>
              ))}
            </ScrollView>
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
          <Text style={styles.sectionTitle}>Timeline</Text>
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

        <View style={styles.section}>
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
        </View>

        <View style={styles.footerActions}>
          <Pressable
            style={[styles.secondaryButton, complaint.followed ? styles.secondaryButtonActive : null]}
            onPress={() => void handleFollow()}
            disabled={following}
          >
            <MaterialCommunityIcons
              name={complaint.followed ? "bookmark-check" : "bookmark-outline"}
              size={18}
              color={complaint.followed ? colors.surface : colors.primary}
            />
            <Text
              style={[
                styles.secondaryButtonText,
                complaint.followed ? styles.secondaryButtonTextActive : null,
              ]}
            >
              {complaint.followed ? "Following" : "Follow"}
            </Text>
          </Pressable>

          <Pressable style={styles.primaryButton} onPress={() => void handleUpvote()} disabled={upvoting}>
            {upvoting ? <ActivityIndicator color={colors.surface} /> : null}
            <MaterialCommunityIcons name="arrow-up-bold-outline" size={18} color={colors.surface} />
            <Text style={styles.primaryButtonText}>{upvoting ? "Voting..." : "Upvote"}</Text>
          </Pressable>
        </View>
      </ScrollView>
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

function CommentCard({ comment }: { comment: ComplaintComment }) {
  return (
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
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 118,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 10,
    paddingBottom: 14,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  followButton: {
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  followButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  hero: {
    padding: 18,
    borderRadius: 24,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
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
    color: colors.primary,
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  title: {
    color: colors.text,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "900",
    marginTop: 6,
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
    marginTop: 14,
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
  footerActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 18,
  },
  secondaryButton: {
    flex: 1,
    minHeight: 52,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  secondaryButtonText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: "900",
  },
  secondaryButtonTextActive: {
    color: colors.surface,
  },
  primaryButton: {
    flex: 1,
    minHeight: 52,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    backgroundColor: colors.primary,
  },
  primaryButtonText: {
    color: colors.surface,
    fontSize: 14,
    fontWeight: "900",
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
