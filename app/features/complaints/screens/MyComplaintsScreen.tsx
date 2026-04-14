import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { colors } from "../../../constants/colors";
import { useAuth } from "../../auth/context/AuthContext";
import { getMyComplaints } from "../services/complaint.service";
import type { Complaint } from "../types/complaint.types";

export default function MyComplaintsScreen() {
  const { token } = useAuth();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchComplaints = useCallback(async () => {
    if (!token) {
      setError("Authentication token not available.");
      setLoading(false);
      return;
    }

    try {
      setError(null);
      const result = await getMyComplaints(token);
      setComplaints(result.complaints || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch complaints.";
      setError(message);
      console.error("Failed to fetch complaints:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      void fetchComplaints();
    }, [fetchComplaints]),
  );

  function getStatusColor(status: string): string {
    switch (status) {
      case "Pending":
        return colors.error;
      case "In Progress":
        return colors.accent;
      case "Resolved":
        return colors.success;
      default:
        return colors.textMuted;
    }
  }

  function getStatusIcon(status: string): string {
    switch (status) {
      case "Pending":
        return "clock-outline";
      case "In Progress":
        return "progress-clock";
      case "Resolved":
        return "check-circle";
      default:
        return "help-circle";
    }
  }

  function renderComplaintItem({ item }: { item: Complaint }) {
    const createdDate = new Date(item.createdAt).toLocaleDateString();

    return (
      <View style={styles.complaintCard}>
        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <Text style={styles.complaintTitle} numberOfLines={2}>
              {item.title}
            </Text>
            <View style={[styles.statusBadge, { borderColor: getStatusColor(item.status) }]}>
              <MaterialCommunityIcons
                name={getStatusIcon(item.status)}
                size={14}
                color={getStatusColor(item.status)}
              />
              <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                {item.status}
              </Text>
            </View>
          </View>

          <Text style={styles.description} numberOfLines={2}>
            {item.description}
          </Text>

          <View style={styles.cardMeta}>
            <View style={styles.metaItem}>
              <MaterialCommunityIcons name="folder-outline" size={14} color={colors.textMuted} />
              <Text style={styles.metaText}>{item.category}</Text>
            </View>

            <View style={styles.metaItem}>
              <MaterialCommunityIcons name="calendar-outline" size={14} color={colors.textMuted} />
              <Text style={styles.metaText}>{createdDate}</Text>
            </View>
          </View>

          {item.location?.address ? (
            <View style={styles.locationContainer}>
              <MaterialCommunityIcons name="map-marker-outline" size={14} color={colors.textMuted} />
              <Text style={styles.locationText} numberOfLines={1}>
                {item.location.address}
              </Text>
            </View>
          ) : null}

          {item.aiSeverity ? (
            <View style={styles.severityContainer}>
              <Text style={styles.severityLabel}>AI Severity:</Text>
              <View style={styles.severityBar}>
                <View
                  style={[
                    styles.severityFill,
                    {
                      width: `${(item.aiSeverity / 10) * 100}%`,
                      backgroundColor:
                        item.aiSeverity >= 7
                          ? colors.error
                          : item.aiSeverity >= 4
                            ? colors.accent
                            : colors.success,
                    },
                  ]}
                />
              </View>
              <Text style={styles.severityValue}>{item.aiSeverity}/10</Text>
            </View>
          ) : null}
        </View>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading your complaints...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <MaterialCommunityIcons name="alert-circle" size={48} color={colors.error} />
        <Text style={styles.errorText}>{error}</Text>
        <Pressable style={styles.retryButton} onPress={() => void fetchComplaints()}>
          <Text style={styles.retryButtonText}>Try Again</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.badge}>Tracking</Text>
        <Text style={styles.title}>My Complaints</Text>
        <Text style={styles.subtitle}>View and track your submitted complaints</Text>
      </View>

      {complaints.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons name="file-document-outline" size={48} color={colors.primary} />
          <Text style={styles.emptyText}>No complaints yet</Text>
          <Text style={styles.emptySubtext}>Submit your first complaint to see it here</Text>
        </View>
      ) : (
        <FlatList
          data={complaints}
          renderItem={renderComplaintItem}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContent}
          scrollIndicatorInsets={{ bottom: 80 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => {
            setRefreshing(true);
            void fetchComplaints();
          }} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  badge: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.primary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textMuted,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
    gap: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
  },
  emptySubtext: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: "center",
  },
  loadingText: {
    fontSize: 14,
    color: colors.textMuted,
    fontWeight: "500",
  },
  errorText: {
    fontSize: 14,
    color: colors.error,
    textAlign: "center",
    fontWeight: "500",
  },
  retryButton: {
    marginTop: 12,
    backgroundColor: colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 6,
  },
  retryButtonText: {
    color: colors.surface,
    fontWeight: "600",
    fontSize: 14,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 80,
  },
  complaintCard: {
    backgroundColor: colors.surface,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  cardContent: {
    padding: 14,
    gap: 10,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 8,
  },
  complaintTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
    flex: 1,
  },
  statusBadge: {
    flexDirection: "row",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    gap: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
  },
  description: {
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 16,
  },
  cardMeta: {
    flexDirection: "row",
    gap: 12,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: "500",
  },
  locationContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  locationText: {
    fontSize: 11,
    color: colors.textMuted,
    flex: 1,
  },
  severityContainer: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  severityLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 6,
  },
  severityBar: {
    height: 6,
    backgroundColor: colors.border,
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 4,
  },
  severityFill: {
    height: "100%",
    borderRadius: 3,
  },
  severityValue: {
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: "500",
  },
});
