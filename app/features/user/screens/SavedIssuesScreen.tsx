import { Text } from "@/src/theme/typography";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { NavigationProp, useFocusEffect, useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "../../../constants/colors";
import { fetchSavedIssues, followComplaint } from "../services/citizen.service";
import type { CitizenComplaint } from "../types/citizen.types";
import type { UserStackParamList } from "../types/user.types";
import { formatCompactDate, statusColors, statusLabels } from "../utils/citizenUi";

const categoryEmoji: Record<CitizenComplaint["category"], string> = {
  road: "🚧",
  water: "💧",
  power: "💡",
  waste: "🗑️",
  trees: "🌿",
  other: "📍",
};

export default function SavedIssuesScreen() {
  const navigation = useNavigation<NavigationProp<UserStackParamList>>();
  const [issues, setIssues] = useState<CitizenComplaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    const result = await fetchSavedIssues();
    setIssues(result.data);
    setError(result.error ?? null);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useFocusEffect(useCallback(() => {
    void load();
  }, [load]));

  async function removeSavedIssue(id: string) {
    setRemovingId(id);
    const result = await followComplaint(id, false);
    if (result.source === "api") {
      setIssues((current) => current.filter((issue) => issue.id !== id));
    } else {
      setError(result.error ?? "Unable to remove this saved issue.");
    }
    setRemovingId(null);
  }

  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <LinearGradient
        colors={[colors.primaryMid, colors.primary, colors.primaryDark]}
        style={styles.header}
      >
        <Pressable style={styles.backButton} onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="arrow-left" size={21} color="#FFFFFF" />
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>YOUR COLLECTION</Text>
          <Text style={styles.title}>Saved Issues</Text>
        </View>
        <View style={styles.headerIcon}>
          <MaterialCommunityIcons name="bookmark" size={20} color="#FCD34D" />
        </View>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} tintColor={colors.primary} onRefresh={() => void load(true)} />
        }
      >
        <View style={styles.summary}>
          <View style={styles.summaryIcon}>
            <MaterialCommunityIcons name="bookmark-multiple" size={22} color="#F59E0B" />
          </View>
          <View style={styles.flex}>
            <Text style={styles.summaryTitle}>{issues.length} saved {issues.length === 1 ? "issue" : "issues"}</Text>
            <Text style={styles.summaryHint}>Follow important reports and receive their updates.</Text>
          </View>
        </View>

        {loading ? (
          <View style={styles.state}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.stateText}>Loading saved issues...</Text>
          </View>
        ) : null}

        {!loading && error && issues.length === 0 ? (
          <View style={styles.state}>
            <MaterialCommunityIcons name="cloud-alert-outline" size={32} color={colors.error} />
            <Text style={styles.stateTitle}>Unable to load saved issues</Text>
            <Text style={styles.stateText}>{error}</Text>
            <Pressable style={styles.primaryButton} onPress={() => void load()}>
              <Text style={styles.primaryButtonText}>Try Again</Text>
            </Pressable>
          </View>
        ) : null}

        {!loading && !error && issues.length === 0 ? (
          <View style={styles.state}>
            <View style={styles.emptyIcon}>
              <MaterialCommunityIcons name="bookmark-outline" size={38} color={colors.primary} />
            </View>
            <Text style={styles.stateTitle}>No saved issues yet</Text>
            <Text style={styles.stateText}>Open a complaint and follow it to save it here.</Text>
            <Pressable
              style={styles.primaryButton}
              onPress={() => navigation.navigate("MainTabs", { screen: "Browse" })}
            >
              <Text style={styles.primaryButtonText}>Browse Issues</Text>
            </Pressable>
          </View>
        ) : null}

        <View style={styles.list}>
          {issues.map((issue) => {
            const statusColor = statusColors[issue.status];
            const statusBackground =
              issue.status === "resolved"
                ? "#DCFCE7"
                : issue.status === "rejected"
                  ? "#FEE2E2"
                  : issue.status === "pending"
                    ? "#FEF3C7"
                    : "#DBEAFE";
            return (
              <Pressable
                key={issue.id}
                style={styles.card}
                onPress={() => navigation.navigate("ComplaintDetail", { complaintId: issue.id })}
              >
                <View style={styles.cardTop}>
                  <View style={styles.categoryIcon}>
                    <Text style={styles.categoryEmoji}>{categoryEmoji[issue.category]}</Text>
                  </View>
                  <View style={styles.flex}>
                    <Text style={styles.cardTitle} numberOfLines={2}>{issue.title}</Text>
                    <Text style={styles.cardMeta} numberOfLines={1}>
                      {issue.location.ward} · {formatCompactDate(issue.createdAt)}
                    </Text>
                  </View>
                  <Pressable
                    style={styles.bookmarkButton}
                    disabled={removingId === issue.id}
                    onPress={(event) => {
                      event.stopPropagation();
                      void removeSavedIssue(issue.id);
                    }}
                  >
                    {removingId === issue.id ? (
                      <ActivityIndicator size="small" color="#F59E0B" />
                    ) : (
                      <MaterialCommunityIcons name="bookmark" size={22} color="#F59E0B" />
                    )}
                  </Pressable>
                </View>
                <View style={styles.cardFooter}>
                  <Text style={[styles.status, { color: statusColor, backgroundColor: statusBackground }]}>
                    {statusLabels[issue.status]}
                  </Text>
                  <Text style={styles.footerMeta}>▲ {issue.upvotes}  ·  💬 {issue.comments}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F5F2FB" },
  header: {
    minHeight: 88, paddingHorizontal: 20, flexDirection: "row", alignItems: "center", gap: 12,
    borderBottomLeftRadius: 28, borderBottomRightRadius: 28,
  },
  backButton: {
    width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.15)", borderWidth: 1, borderColor: "rgba(255,255,255,0.25)",
  },
  headerCopy: { flex: 1 },
  eyebrow: { color: "rgba(255,255,255,0.7)", fontSize: 10, fontWeight: "900", letterSpacing: 1.4 },
  title: { color: "#FFFFFF", fontSize: 21, fontWeight: "900", marginTop: 2 },
  headerIcon: {
    width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  content: { padding: 20, paddingBottom: 40 },
  summary: {
    padding: 14, borderRadius: 18, flexDirection: "row", alignItems: "center", gap: 11,
    backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E8E4F0",
  },
  summaryIcon: {
    width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center",
    backgroundColor: "#FEF3C7",
  },
  flex: { flex: 1, minWidth: 0 },
  summaryTitle: { color: colors.text, fontSize: 14, fontWeight: "900" },
  summaryHint: { color: colors.textMuted, fontSize: 11, lineHeight: 16, fontWeight: "700", marginTop: 3 },
  list: { gap: 10, marginTop: 16 },
  card: {
    padding: 14, borderRadius: 18, backgroundColor: "#FFFFFF",
    borderWidth: 1, borderColor: "#E8E4F0",
  },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 11 },
  categoryIcon: {
    width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center",
    backgroundColor: "#F4EEFD",
  },
  categoryEmoji: { fontSize: 20 },
  cardTitle: { color: colors.text, fontSize: 14, lineHeight: 19, fontWeight: "900" },
  cardMeta: { color: colors.textMuted, fontSize: 10, fontWeight: "700", marginTop: 4 },
  bookmarkButton: { width: 38, height: 38, alignItems: "center", justifyContent: "center" },
  cardFooter: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    marginTop: 12, paddingTop: 11, borderTopWidth: 1, borderTopColor: "#E8E4F0",
  },
  status: {
    overflow: "hidden", borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4,
    fontSize: 9, fontWeight: "900",
  },
  footerMeta: { color: colors.textMuted, fontSize: 10, fontWeight: "800" },
  state: { minHeight: 300, alignItems: "center", justifyContent: "center", gap: 10, paddingHorizontal: 26 },
  emptyIcon: {
    width: 72, height: 72, borderRadius: 24, alignItems: "center", justifyContent: "center",
    backgroundColor: "#EEE8FA",
  },
  stateTitle: { color: colors.text, fontSize: 17, fontWeight: "900", textAlign: "center" },
  stateText: { color: colors.textMuted, fontSize: 12, lineHeight: 18, fontWeight: "700", textAlign: "center" },
  primaryButton: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 15, backgroundColor: colors.primary },
  primaryButtonText: { color: "#FFFFFF", fontSize: 12, fontWeight: "900" },
});
