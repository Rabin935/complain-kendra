import { Text, TextInput } from "@/src/theme/typography";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "../../../constants/colors";
import { useTranslation } from "../../../i18n/LanguageContext";
import {
  fetchComplaintById,
  rateComplaintResolution,
} from "../../user/services/citizen.service";
import type { CitizenComplaint } from "../../user/types/citizen.types";
import type { UserStackParamList } from "../../user/types/user.types";

type Props = NativeStackScreenProps<UserStackParamList, "RateResolution">;

const feedbackOptionKeys = [
  { key: "chipFast", icon: "lightning-bolt-outline" },
  { key: "chipProfessional", icon: "medal-outline" },
  { key: "chipClear", icon: "message-text-outline" },
  { key: "chipQuality", icon: "tools" },
  { key: "chipBetter", icon: "emoticon-confused-outline" },
  { key: "chipCommunication", icon: "phone-outline" },
] as const;

const ratingLabelKeys: Record<number, "rating1" | "rating2" | "rating3" | "rating4" | "rating5"> = {
  1: "rating1",
  2: "rating2",
  3: "rating3",
  4: "rating4",
  5: "rating5",
};

const categoryEmoji: Record<CitizenComplaint["category"], string> = {
  road: "🚧",
  water: "💧",
  power: "💡",
  waste: "🗑️",
  trees: "🌿",
  other: "📍",
};

function resolutionDays(complaint: CitizenComplaint) {
  const start = new Date(complaint.createdAt).getTime();
  const end = new Date(complaint.updatedAt).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end)) return 1;
  return Math.max(1, Math.ceil((end - start) / (24 * 60 * 60 * 1000)));
}

export default function RateResolutionScreen({ route, navigation }: Props) {
  const { t } = useTranslation("rateResolution");
  const { t: tc } = useTranslation("common");
  const complaintId = route.params.complaintId;
  const feedbackOptions = feedbackOptionKeys.map((option) => ({
    label: t(option.key),
    icon: option.icon,
  }));
  const [complaint, setComplaint] = useState<CitizenComplaint | null>(null);
  const [rating, setRating] = useState(4);
  const [selectedFeedback, setSelectedFeedback] = useState<string[]>([]);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void fetchComplaintById(complaintId)
      .then((detail) => {
        if (!active) return;
        setComplaint(detail.complaint);
        if (detail.complaint.status !== "resolved") {
          setError(t("notResolved"));
        }
      })
      .catch((loadError) => {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : t("loadError"));
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [complaintId]);

  const department = useMemo(
    () => complaint?.aiAnalysis?.department ?? t("wardDepartment"),
    [complaint?.aiAnalysis?.department, t],
  );

  function toggleFeedback(label: string) {
    setSelectedFeedback((current) =>
      current.includes(label) ? current.filter((item) => item !== label) : [...current, label],
    );
  }

  async function submitFeedback() {
    if (!complaint || submitting || complaint.status !== "resolved") return;
    setSubmitting(true);
    setError(null);
    const feedbackComment = [
      selectedFeedback.length ? `Highlights: ${selectedFeedback.join(", ")}.` : "",
      comment.trim(),
    ]
      .filter(Boolean)
      .join(" ");

    try {
      await rateComplaintResolution(complaint.id, {
        rating,
        comment: feedbackComment || undefined,
      });
      setSubmitted(true);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : t("submitError"));
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView edges={["top"]} style={styles.safeArea}>
        <View style={styles.state}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.stateText}>{t("loading")}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!complaint) {
    return (
      <SafeAreaView edges={["top"]} style={styles.safeArea}>
        <View style={styles.state}>
          <MaterialCommunityIcons name="alert-circle-outline" size={34} color={colors.error} />
          <Text style={styles.stateTitle}>{t("unavailable")}</Text>
          <Text style={styles.stateText}>{error}</Text>
          <Pressable style={styles.secondaryButton} onPress={() => navigation.goBack()}>
            <Text style={styles.secondaryButtonText}>{t("goBack")}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (submitted) {
    return (
      <SafeAreaView edges={["top"]} style={styles.safeArea}>
        <View style={styles.state}>
          <LinearGradient colors={["#34D399", "#16A34A"]} style={styles.successIcon}>
            <MaterialCommunityIcons name="check" size={48} color="#FFFFFF" />
          </LinearGradient>
          <Text style={styles.successTitle}>{t("thankYou")}</Text>
          <Text style={styles.stateText}>{t("thankYouBody")}</Text>
          <Pressable
            style={styles.secondaryButton}
            onPress={() => navigation.replace("ComplaintDetail", { complaintId })}
          >
            <Text style={styles.secondaryButtonText}>{t("viewComplaint")}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => navigation.goBack()}>
            <MaterialCommunityIcons name="arrow-left" size={20} color={colors.text} />
          </Pressable>
          <Text style={styles.headerTitle}>{t("title")}</Text>
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.hero}>
            <View style={styles.successRing}>
              <LinearGradient colors={["#34D399", "#16A34A"]} style={styles.successIcon}>
                <MaterialCommunityIcons name="check" size={50} color="#FFFFFF" />
              </LinearGradient>
            </View>
            <Text style={styles.heroTitle}>{t("issueResolved")}</Text>
            <Text style={styles.heroSubtitle}>
              <Text style={styles.complaintNo}>#{complaint.complaintNo}</Text>
              {" · "}{complaint.title}
            </Text>
          </View>

          <View style={styles.resolutionCard}>
            <View style={styles.categoryBox}>
              <Text style={styles.categoryEmoji}>{categoryEmoji[complaint.category]}</Text>
            </View>
            <View style={styles.flex}>
              <Text style={styles.resolutionTitle}>
                {t("resolvedInDays", { days: resolutionDays(complaint) })}
              </Text>
              <Text style={styles.resolutionMeta}>{complaint.location.ward} · {department}</Text>
            </View>
            <View style={styles.resolvedBadge}>
              <MaterialCommunityIcons name="check-circle-outline" size={13} color="#166534" />
              <Text style={styles.resolvedText}>{t("resolved")}</Text>
            </View>
          </View>

          <Text style={styles.experienceTitle}>{t("howWasExperience")}</Text>
          <View style={styles.starRow}>
            {[1, 2, 3, 4, 5].map((value) => (
              <Pressable key={value} hitSlop={5} onPress={() => setRating(value)}>
                <MaterialCommunityIcons
                  name={value <= rating ? "star" : "star-outline"}
                  size={42}
                  color={value <= rating ? "#F59E0B" : "#E8E4F0"}
                />
              </Pressable>
            ))}
          </View>
          <Text style={styles.ratingLabel}>{t(ratingLabelKeys[rating])}</Text>

          <Text style={styles.fieldLabel}>{t("whatWentWell")}</Text>
          <View style={styles.feedbackWrap}>
            {feedbackOptions.map((option) => {
              const selected = selectedFeedback.includes(option.label);
              return (
                <Pressable
                  key={option.label}
                  style={[styles.feedbackChip, selected ? styles.feedbackChipActive : null]}
                  onPress={() => toggleFeedback(option.label)}
                >
                  <MaterialCommunityIcons
                    name={option.icon}
                    size={15}
                    color={selected ? colors.primaryDeep : colors.textSecondary}
                  />
                  <Text style={[styles.feedbackText, selected ? styles.feedbackTextActive : null]}>
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.fieldLabel}>
            {t("tellUsMore")} <Text style={styles.optional}>({tc("optional")})</Text>
          </Text>
          <TextInput
            value={comment}
            onChangeText={setComment}
            placeholder={t("feedbackPlaceholder")}
            placeholderTextColor={colors.textMuted}
            multiline
            maxLength={500}
            style={styles.input}
          />

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <Pressable
            style={styles.submitShell}
            disabled={submitting || complaint.status !== "resolved"}
            onPress={() => void submitFeedback()}
          >
            <LinearGradient
              colors={[colors.primaryMid, colors.primary]}
              style={styles.submitButton}
            >
              {submitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Text style={styles.submitText}>{t("submitFeedback")}</Text>
                  <MaterialCommunityIcons name="send" size={18} color="#FFFFFF" />
                </>
              )}
            </LinearGradient>
          </Pressable>
          <Pressable
            style={styles.skipButton}
            onPress={() => navigation.replace("ComplaintDetail", { complaintId })}
          >
            <Text style={styles.skipText}>{t("skipForNow")}</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#FFFFFF" },
  flex: { flex: 1 },
  header: {
    minHeight: 66, paddingHorizontal: 20, flexDirection: "row", alignItems: "center", gap: 14,
  },
  backButton: {
    width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center",
    backgroundColor: "#F8F6FC", borderWidth: 1, borderColor: "#E8E4F0",
  },
  headerTitle: { color: colors.text, fontSize: 19, fontWeight: "900" },
  content: { paddingHorizontal: 22, paddingBottom: 34 },
  hero: { alignItems: "center", paddingTop: 13, paddingBottom: 24 },
  successRing: {
    padding: 21, borderRadius: 999, borderWidth: 1.5, borderStyle: "dashed",
    borderColor: "#EEE8FA", marginBottom: 15,
  },
  successIcon: {
    width: 92, height: 92, borderRadius: 46, alignItems: "center", justifyContent: "center",
    shadowColor: "#16A34A", shadowOpacity: 0.35, shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 }, elevation: 8,
  },
  heroTitle: { color: colors.text, fontSize: 22, fontWeight: "900", letterSpacing: -0.5 },
  heroSubtitle: {
    color: colors.textMuted, fontSize: 13, lineHeight: 20, fontWeight: "600",
    textAlign: "center", marginTop: 6,
  },
  complaintNo: { color: colors.primary, fontWeight: "900" },
  resolutionCard: {
    padding: 14, borderRadius: 18, flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E8E4F0",
    shadowColor: "#2A1550", shadowOpacity: 0.08, shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 }, elevation: 3,
  },
  categoryBox: {
    width: 48, height: 48, borderRadius: 12, alignItems: "center", justifyContent: "center",
    backgroundColor: "#DCFCE7",
  },
  categoryEmoji: { fontSize: 22 },
  resolutionTitle: { color: colors.text, fontSize: 13, fontWeight: "900" },
  resolutionMeta: { color: colors.textMuted, fontSize: 11, fontWeight: "700", marginTop: 3 },
  resolvedBadge: {
    flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 9,
    paddingVertical: 5, borderRadius: 999, backgroundColor: "#DCFCE7",
  },
  resolvedText: { color: "#166534", fontSize: 10, fontWeight: "900" },
  experienceTitle: {
    color: colors.text, fontSize: 15, fontWeight: "900", textAlign: "center",
    marginTop: 24, marginBottom: 13,
  },
  starRow: { flexDirection: "row", justifyContent: "center", gap: 6 },
  ratingLabel: { color: "#F59E0B", fontSize: 13, fontWeight: "900", textAlign: "center", marginTop: 8 },
  fieldLabel: {
    color: colors.textSecondary, fontSize: 12, fontWeight: "900",
    letterSpacing: 0.4, marginTop: 25, marginBottom: 10,
  },
  optional: { color: colors.textMuted, fontWeight: "600", textTransform: "none" },
  feedbackWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  feedbackChip: {
    minHeight: 38, paddingHorizontal: 12, borderRadius: 999, flexDirection: "row",
    alignItems: "center", gap: 6, backgroundColor: "#FFFFFF",
    borderWidth: 1.5, borderColor: "#E8E4F0",
  },
  feedbackChipActive: {
    backgroundColor: "#F6F2FC", borderColor: colors.primary,
    shadowColor: "#EEE8FA", shadowOpacity: 1, shadowRadius: 3,
  },
  feedbackText: { color: colors.textSecondary, fontSize: 12, fontWeight: "800" },
  feedbackTextActive: { color: colors.primaryDeep },
  input: {
    minHeight: 88, padding: 14, borderRadius: 14, color: colors.text,
    fontSize: 14, lineHeight: 20, textAlignVertical: "top",
    backgroundColor: "#F8F6FC", borderWidth: 1.5, borderColor: "#E8E4F0",
  },
  errorText: { color: colors.error, fontSize: 12, fontWeight: "800", marginTop: 10 },
  submitShell: {
    borderRadius: 16, overflow: "hidden", marginTop: 22,
    shadowColor: colors.primary, shadowOpacity: 0.3, shadowRadius: 14,
    shadowOffset: { width: 0, height: 10 }, elevation: 7,
  },
  submitButton: {
    minHeight: 54, borderRadius: 16, flexDirection: "row",
    alignItems: "center", justifyContent: "center", gap: 8,
  },
  submitText: { color: "#FFFFFF", fontSize: 16, fontWeight: "900" },
  skipButton: { alignItems: "center", paddingVertical: 14 },
  skipText: { color: colors.textMuted, fontSize: 13, fontWeight: "700" },
  state: { flex: 1, alignItems: "center", justifyContent: "center", gap: 11, padding: 28 },
  stateTitle: { color: colors.text, fontSize: 18, fontWeight: "900", textAlign: "center" },
  stateText: { color: colors.textMuted, fontSize: 13, lineHeight: 19, fontWeight: "700", textAlign: "center" },
  successTitle: { color: colors.text, fontSize: 23, fontWeight: "900", marginTop: 8 },
  secondaryButton: {
    minHeight: 46, paddingHorizontal: 22, borderRadius: 15,
    alignItems: "center", justifyContent: "center", backgroundColor: colors.primary, marginTop: 8,
  },
  secondaryButtonText: { color: "#FFFFFF", fontSize: 13, fontWeight: "900" },
});
