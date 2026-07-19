import { Text } from "@/src/theme/typography";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "../../../constants/colors";
import { useAuth } from "../../auth/context/AuthContext";
import { fetchLeaderboard } from "../services/citizen.service";
import type { CitizenLeaderboardEntry } from "../types/citizen.types";

type Period = "weekly" | "monthly" | "all";

const periods: Array<{ label: string; value: Period }> = [
  { label: "Weekly", value: "weekly" },
  { label: "Monthly", value: "monthly" },
  { label: "All time", value: "all" },
];

const avatarColors = [
  ["#FBBF24", "#F59E0B"],
  ["#EF4444", "#B91C1C"],
  ["#6038B0", "#3E2075"],
  ["#3B82F6", "#1D4ED8"],
  ["#22C55E", "#15803D"],
] as const;

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function Avatar({
  entry,
  size,
  index = 0,
  round = false,
}: {
  entry: CitizenLeaderboardEntry;
  size: number;
  index?: number;
  round?: boolean;
}) {
  const radius = round ? size / 2 : 12;

  if (entry.avatarUrl) {
    return <Image source={{ uri: entry.avatarUrl }} style={{ width: size, height: size, borderRadius: radius }} />;
  }

  return (
    <LinearGradient
      colors={avatarColors[index % avatarColors.length]}
      style={{ width: size, height: size, borderRadius: radius, alignItems: "center", justifyContent: "center" }}
    >
      <Text style={{ color: "#FFFFFF", fontSize: size * 0.3, fontWeight: "900" }}>{initials(entry.name)}</Text>
    </LinearGradient>
  );
}

function PodiumPerson({
  entry,
  index,
}: {
  entry: CitizenLeaderboardEntry;
  index: number;
}) {
  const winner = entry.rank === 1;
  const medalColor = entry.rank === 1 ? "#FBBF24" : entry.rank === 2 ? "#CBD5E1" : "#FB923C";

  return (
    <View style={[styles.podiumPerson, winner ? styles.podiumWinner : null]}>
      {winner ? <MaterialCommunityIcons name="crown" size={26} color="#FBBF24" style={styles.crown} /> : null}
      <View style={[styles.podiumAvatarRing, { borderColor: medalColor }]}>
        <Avatar entry={entry} size={winner ? 66 : 50} index={index} round />
      </View>
      <View style={[styles.podiumRank, { backgroundColor: medalColor }]}>
        <Text style={styles.podiumRankText}>{entry.rank}</Text>
      </View>
      <Text style={[styles.podiumName, winner ? styles.podiumWinnerName : null]} numberOfLines={1}>
        {entry.name.split(" ")[0]}
      </Text>
      <Text style={styles.podiumPoints}>{entry.points.toLocaleString()} {winner ? "pts" : ""}</Text>
    </View>
  );
}

export default function LeaderboardScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [period, setPeriod] = useState<Period>("monthly");
  const [leaders, setLeaders] = useState<CitizenLeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    const result = await fetchLeaderboard(period);
    setLeaders(result.data);
    setError(result.error ?? null);
    setLoading(false);
    setRefreshing(false);
  }, [period]);

  useEffect(() => {
    void load();
  }, [load]);

  const current = useMemo(() => leaders.find((entry) => entry.id === user?.id), [leaders, user?.id]);
  const topThree = leaders.slice(0, 3);
  const podium = [topThree[1], topThree[0], topThree[2]].filter(
    (entry): entry is CitizenLeaderboardEntry => Boolean(entry),
  );
  const periodLabel = periods.find((item) => item.value === period)?.label ?? "All time";

  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} tintColor={colors.primary} onRefresh={() => void load(true)} />
        }
      >
        <LinearGradient
          colors={[colors.primaryMid, colors.primary, colors.primaryDark]}
          start={{ x: 0.05, y: 0 }}
          end={{ x: 0.95, y: 1 }}
          style={styles.hero}
        >
          <View style={styles.gridA} />
          <View style={styles.gridB} />
          <View style={styles.gridC} />

          <View style={styles.header}>
            <Pressable style={styles.headerButton} onPress={() => navigation.goBack()}>
              <MaterialCommunityIcons name="arrow-left" size={21} color="#FFFFFF" />
            </Pressable>
            <View style={styles.headerCopy}>
              <Text style={styles.eyebrow}>CIVIC HEROES</Text>
              <Text style={styles.title}>Leaderboard</Text>
            </View>
            <View style={styles.headerButton}>
              <MaterialCommunityIcons name="information-outline" size={20} color="#FFFFFF" />
            </View>
          </View>

          <View style={styles.periodRow}>
            {periods.map((item) => {
              const selected = period === item.value;
              return (
                <Pressable
                  key={item.value}
                  style={[styles.periodChip, selected ? styles.periodChipActive : null]}
                  onPress={() => setPeriod(item.value)}
                >
                  <Text style={[styles.periodText, selected ? styles.periodTextActive : null]}>{item.label}</Text>
                </Pressable>
              );
            })}
          </View>

          {!loading && podium.length ? (
            <View style={styles.podium}>
              {podium.map((entry, index) => <PodiumPerson key={entry.id} entry={entry} index={index} />)}
            </View>
          ) : (
            <View style={styles.heroLoader}>
              <ActivityIndicator color="#FFFFFF" />
            </View>
          )}
        </LinearGradient>

        <View style={styles.body}>
          {current ? (
            <View style={styles.currentCard}>
              <LinearGradient colors={[colors.primary, colors.primaryDeep]} style={styles.currentRank}>
                <Text style={styles.currentRankLabel}>RANK</Text>
                <Text style={styles.currentRankNumber}>{current.rank}</Text>
              </LinearGradient>
              <View style={styles.flex}>
                <Text style={styles.currentTitle}>You're climbing!</Text>
                <Text style={styles.currentHint}>
                  {current.points.toLocaleString()} pts · {current.levelTitle}
                </Text>
              </View>
              <MaterialCommunityIcons name="trending-up" size={25} color={colors.success} />
            </View>
          ) : null}

          <View style={styles.listHeading}>
            <Text style={styles.listHeadingText}>{periodLabel} · Community</Text>
            <View style={styles.scopeAction}>
              <MaterialCommunityIcons name="map-marker-outline" size={15} color={colors.primary} />
              <Text style={styles.scopeText}>All wards</Text>
            </View>
          </View>

          {error && leaders.length === 0 ? (
            <View style={styles.state}>
              <MaterialCommunityIcons name="cloud-alert-outline" size={30} color={colors.error} />
              <Text style={styles.stateTitle}>Leaderboard unavailable</Text>
              <Text style={styles.stateText}>{error}</Text>
              <Pressable style={styles.retry} onPress={() => void load()}>
                <Text style={styles.retryText}>Try Again</Text>
              </Pressable>
            </View>
          ) : null}

          {!loading && !error && leaders.length === 0 ? (
            <View style={styles.state}>
              <MaterialCommunityIcons name="trophy-outline" size={34} color={colors.textMuted} />
              <Text style={styles.stateTitle}>No rankings yet</Text>
              <Text style={styles.stateText}>Citizens will appear here after earning points in this period.</Text>
            </View>
          ) : null}

          <View style={styles.list}>
            {leaders.map((entry, index) => {
              const isMe = entry.id === user?.id;
              return (
                <View key={entry.id} style={[styles.row, isMe ? styles.rowMe : null]}>
                  <Text style={styles.rowRank}>{entry.rank}</Text>
                  <Avatar entry={entry} size={40} index={index} />
                  <View style={styles.flex}>
                    <View style={styles.nameRow}>
                      <Text style={styles.rowName} numberOfLines={1}>{entry.name}</Text>
                      {isMe ? <Text style={styles.you}>YOU</Text> : null}
                    </View>
                    <Text style={styles.rowMeta} numberOfLines={1}>
                      {entry.ward ?? "Ward not set"} · Level {entry.level}
                    </Text>
                  </View>
                  <View style={styles.score}>
                    <Text style={styles.scoreValue}>{entry.points.toLocaleString()}</Text>
                    <View style={styles.gain}>
                      <MaterialCommunityIcons name="arrow-up" size={11} color={colors.success} />
                      <Text style={styles.gainText}>points</Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F5F2FB" },
  content: { paddingBottom: 36 },
  hero: {
    minHeight: 390,
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: 78,
    overflow: "hidden",
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  gridA: { position: "absolute", top: 0, bottom: 0, left: "33%", width: 1, backgroundColor: "rgba(255,255,255,0.08)" },
  gridB: { position: "absolute", top: 0, bottom: 0, left: "66%", width: 1, backgroundColor: "rgba(255,255,255,0.08)" },
  gridC: { position: "absolute", left: 0, right: 0, top: 150, height: 1, backgroundColor: "rgba(255,255,255,0.08)" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headerButton: {
    width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.15)", borderWidth: 1, borderColor: "rgba(255,255,255,0.25)",
  },
  headerCopy: { flex: 1, alignItems: "center" },
  eyebrow: { color: "rgba(255,255,255,0.7)", fontSize: 11, fontWeight: "900", letterSpacing: 1.5 },
  title: { color: "#FFFFFF", fontSize: 19, fontWeight: "900", marginTop: 2 },
  periodRow: { flexDirection: "row", justifyContent: "center", gap: 6, marginTop: 20 },
  periodChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.15)", borderWidth: 1, borderColor: "rgba(255,255,255,0.2)",
  },
  periodChipActive: { backgroundColor: "#FFFFFF", borderColor: "#FFFFFF" },
  periodText: { color: "#FFFFFF", fontSize: 12, fontWeight: "900" },
  periodTextActive: { color: colors.primary },
  podium: { flexDirection: "row", alignItems: "flex-end", justifyContent: "center", gap: 18, minHeight: 190, marginTop: 13 },
  podiumPerson: { width: 82, alignItems: "center" },
  podiumWinner: { marginBottom: 13 },
  crown: { marginBottom: 3 },
  podiumAvatarRing: { borderWidth: 3, borderRadius: 999, padding: 1 },
  podiumRank: {
    minWidth: 25, height: 20, paddingHorizontal: 6, borderRadius: 999,
    alignItems: "center", justifyContent: "center", marginTop: -8,
  },
  podiumRankText: { color: "#FFFFFF", fontSize: 10, fontWeight: "900" },
  podiumName: { width: 82, color: "#FFFFFF", fontSize: 12, fontWeight: "900", textAlign: "center", marginTop: 7 },
  podiumWinnerName: { fontSize: 14 },
  podiumPoints: { color: "rgba(255,255,255,0.72)", fontSize: 11, fontWeight: "700", marginTop: 2 },
  heroLoader: { minHeight: 190, alignItems: "center", justifyContent: "center" },
  body: { paddingHorizontal: 20, marginTop: -48 },
  currentCard: {
    minHeight: 74, padding: 14, borderRadius: 20, flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E8E4F0",
    shadowColor: "#2A1550", shadowOpacity: 0.18, shadowRadius: 18, shadowOffset: { width: 0, height: 10 }, elevation: 8,
  },
  currentRank: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  currentRankLabel: { color: "rgba(255,255,255,0.72)", fontSize: 8, fontWeight: "900" },
  currentRankNumber: { color: "#FFFFFF", fontSize: 18, fontWeight: "900", lineHeight: 19 },
  flex: { flex: 1, minWidth: 0 },
  currentTitle: { color: colors.text, fontSize: 13, fontWeight: "900" },
  currentHint: { color: colors.textMuted, fontSize: 11, fontWeight: "700", marginTop: 3 },
  listHeading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 17, marginBottom: 10 },
  listHeadingText: { color: colors.text, fontSize: 14, fontWeight: "900" },
  scopeAction: { flexDirection: "row", alignItems: "center", gap: 3 },
  scopeText: { color: colors.primary, fontSize: 12, fontWeight: "900" },
  list: { gap: 8 },
  row: {
    minHeight: 68, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", gap: 12,
    borderRadius: 18, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E8E4F0",
  },
  rowMe: { backgroundColor: "#F6F2FC", borderColor: "#DED2F2", shadowColor: "#DED2F2", shadowOpacity: 1, shadowRadius: 3 },
  rowRank: { width: 27, color: colors.textMuted, fontSize: 14, fontWeight: "900", textAlign: "center" },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  rowName: { flexShrink: 1, color: colors.text, fontSize: 14, fontWeight: "900" },
  you: {
    color: "#FFFFFF", backgroundColor: colors.primary, borderRadius: 999, overflow: "hidden",
    paddingHorizontal: 6, paddingVertical: 2, fontSize: 8, fontWeight: "900",
  },
  rowMeta: { color: colors.textMuted, fontSize: 11, fontWeight: "700", marginTop: 3 },
  score: { alignItems: "flex-end" },
  scoreValue: { color: colors.primary, fontSize: 15, fontWeight: "900" },
  gain: { flexDirection: "row", alignItems: "center", gap: 2, marginTop: 2 },
  gainText: { color: colors.success, fontSize: 9, fontWeight: "800" },
  state: { minHeight: 210, alignItems: "center", justifyContent: "center", gap: 9, paddingHorizontal: 24 },
  stateTitle: { color: colors.text, fontSize: 16, fontWeight: "900", textAlign: "center" },
  stateText: { color: colors.textMuted, fontSize: 12, lineHeight: 18, fontWeight: "700", textAlign: "center" },
  retry: { paddingHorizontal: 20, paddingVertical: 11, borderRadius: 14, backgroundColor: colors.primary },
  retryText: { color: "#FFFFFF", fontSize: 12, fontWeight: "900" },
});
