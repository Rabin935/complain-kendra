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
  TextInput,
  View,
} from "react-native";
import { colors } from "../../../constants/colors";
import { useAuth } from "../../auth/context/AuthContext";
import { getMyComplaints, getAllComplaints } from "../services/complaint.service";
import type { Complaint } from "../types/complaint.types";

type ViewMode = "my" | "browse";

export default function MyComplaintsScreen() {
  const { token } = useAuth();
  const [viewMode, setViewMode] = useState<ViewMode>("my");
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [filteredComplaints, setFilteredComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const categories = ["Road Damage", "Garbage", "Water Supply", "Electricity", "Drainage", "Other"];

  const fetchComplaints = useCallback(async () => {
    if (!token) {
      setError("Authentication token not available.");
      setLoading(false);
      return;
    }

    try {
      setError(null);
      const result = viewMode === "my"
        ? await getMyComplaints(token)
        : await getAllComplaints(token);
      setComplaints(result.complaints || []);
      applyFilters(result.complaints || [], searchQuery, selectedCategory);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch complaints.";
      setError(message);
      console.error("Failed to fetch complaints:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, viewMode, searchQuery, selectedCategory]);

  function applyFilters(
    items: Complaint[],
    query: string,
    category: string | null,
  ) {
    let filtered = items;

    if (query.trim()) {
      const lowerQuery = query.toLowerCase();
      filtered = filtered.filter(
        (complaint) =>
          complaint.title.toLowerCase().includes(lowerQuery) ||
          complaint.description.toLowerCase().includes(lowerQuery),
      );
    }

    if (category) {
      filtered = filtered.filter((complaint) => complaint.category === category);
    }

    setFilteredComplaints(filtered);
  }

  useFocusEffect(
    useCallback(() => {
      void fetchComplaints();
    }, [fetchComplaints]),
  );

  function handleSearch(query: string) {
    setSearchQuery(query);
    applyFilters(complaints, query, selectedCategory);
  }

  function toggleCategory(category: string) {
    const nextCategory = selectedCategory === category ? null : category;
    setSelectedCategory(nextCategory);
    applyFilters(complaints, searchQuery, nextCategory);
  }

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

          {item.aiSeverity && viewMode === "my" ? (
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

          {item.aiSummary && viewMode === "browse" ? (
            <View style={styles.aiSummaryContainer}>
              <View style={styles.aiSummaryHeader}>
                <MaterialCommunityIcons
                  name="wand-outline"
                  size={12}
                  color={colors.accent}
                />
                <Text style={styles.aiSummaryLabel}>AI Summary</Text>
              </View>
              <Text style={styles.aiSummaryText}>{item.aiSummary}</Text>
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
        <Text style={styles.loadingText}>
          Loading {viewMode === "my" ? "your complaints" : "complaints"}...
        </Text>
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
        <Text style={styles.badge}>{viewMode === "my" ? "Tracking" : "Community"}</Text>
        <Text style={styles.title}>{viewMode === "my" ? "My Complaints" : "Browse Complaints"}</Text>
        <Text style={styles.subtitle}>
          {viewMode === "my"
            ? "View and track your submitted complaints"
            : "See what others in your community are reporting"}
        </Text>

        {/* View Toggle */}
        <View style={styles.toggleContainer}>
          <Pressable
            style={[styles.toggleButton, viewMode === "my" && styles.toggleButtonActive]}
            onPress={() => {
              setViewMode("my");
              setSearchQuery("");
              setSelectedCategory(null);
            }}
          >
            <MaterialCommunityIcons
              name="file-document-outline"
              size={16}
              color={viewMode === "my" ? colors.surface : colors.textMuted}
            />
            <Text style={[styles.toggleButtonText, viewMode === "my" && styles.toggleButtonActiveText]}>
              My Complaints
            </Text>
          </Pressable>

          <Pressable
            style={[styles.toggleButton, viewMode === "browse" && styles.toggleButtonActive]}
            onPress={() => {
              setViewMode("browse");
              setSearchQuery("");
              setSelectedCategory(null);
            }}
          >
            <MaterialCommunityIcons
              name="compass-outline"
              size={16}
              color={viewMode === "browse" ? colors.surface : colors.textMuted}
            />
            <Text
              style={[
                styles.toggleButtonText,
                viewMode === "browse" && styles.toggleButtonActiveText,
              ]}
            >
              Browse
            </Text>
          </Pressable>
        </View>

        {/* Search Bar - only for browse mode */}
        {viewMode === "browse" ? (
          <View style={styles.searchContainer}>
            <MaterialCommunityIcons name="magnify" size={18} color={colors.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search complaints..."
              placeholderTextColor={colors.textMuted}
              value={searchQuery}
              onChangeText={handleSearch}
            />
            {searchQuery ? (
              <Pressable onPress={() => handleSearch("")}>
                <MaterialCommunityIcons name="close" size={18} color={colors.textMuted} />
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </View>

      {/* Category Filter - only for browse mode */}
      {viewMode === "browse" ? (
        <View style={styles.filterContainer}>
          <FlatList
            horizontal
            data={categories}
            renderItem={({ item }) => (
              <Pressable
                style={[
                  styles.categoryChip,
                  selectedCategory === item && styles.categoryChipActive,
                ]}
                onPress={() => toggleCategory(item)}
              >
                <Text
                  style={[
                    styles.categoryChipText,
                    selectedCategory === item && styles.categoryChipActiveText,
                  ]}
                >
                  {item}
                </Text>
              </Pressable>
            )}
            keyExtractor={(item) => item}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterScroll}
          />
        </View>
      ) : null}

      {filteredComplaints.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons
            name={viewMode === "my" ? "file-document-outline" : "inbox-outline"}
            size={48}
            color={colors.primary}
          />
          <Text style={styles.emptyText}>
            {complaints.length === 0
              ? viewMode === "my"
                ? "No complaints yet"
                : "No complaints found"
              : "No results found"}
          </Text>
          <Text style={styles.emptySubtext}>
            {complaints.length === 0
              ? viewMode === "my"
                ? "Submit your first complaint to see it here"
                : "Be the first to report an issue"
              : "Try adjusting your search"}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredComplaints}
          renderItem={renderComplaintItem}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContent}
          scrollIndicatorInsets={{ bottom: 80 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                void fetchComplaints();
              }}
            />
          }
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
    paddingBottom: 12,
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
    marginBottom: 12,
  },
  toggleContainer: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  toggleButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  toggleButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  toggleButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textMuted,
  },
  toggleButtonActiveText: {
    color: colors.surface,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.background,
    borderRadius: 8,
    paddingHorizontal: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 8,
    fontSize: 13,
    color: colors.text,
  },
  filterContainer: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: 8,
  },
  filterScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.background,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textMuted,
  },
  categoryChipActiveText: {
    color: colors.surface,
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
    paddingHorizontal: 32,
    gap: 12,
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
  aiSummaryContainer: {
    backgroundColor: colors.background,
    padding: 8,
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: colors.accent,
  },
  aiSummaryHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 4,
  },
  aiSummaryLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: colors.accent,
  },
  aiSummaryText: {
    fontSize: 11,
    color: colors.textMuted,
    lineHeight: 14,
  },
});

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
