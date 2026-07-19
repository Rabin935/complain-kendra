import { Text, TextInput } from "@/src/theme/typography";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { NavigationProp, useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import * as Linking from "expo-linking";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "../../../constants/colors";
import type { UserStackParamList } from "../types/user.types";

type HelpNavigation = NavigationProp<UserStackParamList>;
type IconName = React.ComponentProps<typeof MaterialCommunityIcons>["name"];

const supportEmail = "help@ck.np";
const supportPhone = "1660-01-CK";

const categories: Array<{
  icon: IconName;
  color: string;
  title: string;
  count: number;
  background: string;
}> = [
  { icon: "rocket-launch-outline", color: "#6038B0", title: "Getting Started", count: 8, background: "#EEE8FA" },
  { icon: "clipboard-text-outline", color: "#2563EB", title: "Filing Reports", count: 12, background: "#DBEAFE" },
  { icon: "lightning-bolt", color: "#D97706", title: "AI Analysis", count: 6, background: "#FEF3C7" },
  { icon: "account-outline", color: "#16A34A", title: "Account", count: 9, background: "#DCFCE7" },
  { icon: "lock-outline", color: "#DC2626", title: "Privacy", count: 5, background: "#FEE2E2" },
  { icon: "circle-multiple-outline", color: "#6038B0", title: "Civic Points", count: 4, background: "#EEE8FA" },
];

const faqs = [
  {
    question: "How long until my complaint is reviewed?",
    answer:
      "Most complaints are acknowledged within 24 hours by your ward office. AI verification & routing happens instantly.",
    helpful: 42,
  },
  {
    question: "Can I edit a complaint after submitting?",
    answer:
      "You can update a complaint while it is pending. Once ward review begins, contact support to request a correction.",
  },
  {
    question: "How are Civic Points earned?",
    answer:
      "Earn Civic Points by submitting verified reports, adding helpful evidence, and participating responsibly.",
  },
  {
    question: "What if AI mis-classifies my report?",
    answer:
      "You can correct the suggested category before submitting. Ward officers can also reclassify a report during review.",
  },
];

export default function HelpSupportScreen() {
  const navigation = useNavigation<HelpNavigation>();
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [query, setQuery] = useState("");

  const visibleFaqs = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return faqs;
    return faqs.filter(
      ({ question, answer }) =>
        question.toLowerCase().includes(normalized) ||
        answer.toLowerCase().includes(normalized),
    );
  }, [query]);

  const openChat = () => {
    void Linking.openURL(
      `mailto:${supportEmail}?subject=${encodeURIComponent("ComplainKendra support chat")}`,
    );
  };

  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable
          accessibilityLabel="Go back"
          style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
          onPress={() => navigation.goBack()}
        >
          <MaterialCommunityIcons name="arrow-left" size={20} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>Help & Support</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.searchBox}>
          <MaterialCommunityIcons name="magnify" size={18} color={colors.textMuted} />
          <TextInput
            accessibilityLabel="Search help articles"
            value={query}
            onChangeText={setQuery}
            placeholder="Search help articles..."
            placeholderTextColor={colors.textMuted}
            returnKeyType="search"
            style={styles.searchInput}
          />
          <MaterialCommunityIcons name="microphone" size={18} color={colors.primary} />
        </View>

        <Pressable onPress={openChat} style={({ pressed }) => pressed && styles.pressed}>
          <LinearGradient
            colors={[colors.primaryMid, colors.primaryDeep]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.chatCard}
          >
            <View style={styles.chatIcon}>
              <MaterialCommunityIcons name="message-text-outline" size={22} color="#FFFFFF" />
            </View>
            <View style={styles.chatCopy}>
              <Text style={styles.chatTitle}>Chat with us</Text>
              <Text style={styles.chatMeta}>Avg response · 4 min · Mon-Fri 9–6</Text>
            </View>
            <MaterialCommunityIcons name="arrow-right" size={20} color="#FFFFFF" />
          </LinearGradient>
        </Pressable>

        <Text style={styles.sectionTitle}>Browse by category</Text>
        <View style={styles.categoryGrid}>
          {categories.map((item) => (
            <Pressable
              key={item.title}
              style={({ pressed }) => [styles.categoryCard, pressed && styles.pressed]}
              onPress={() => setQuery(item.title)}
            >
              <View style={[styles.categoryIcon, { backgroundColor: item.background }]}>
                <MaterialCommunityIcons name={item.icon} size={20} color={item.color} />
              </View>
              <View>
                <Text style={styles.categoryTitle}>{item.title}</Text>
                <Text style={styles.categoryCount}>{item.count} articles</Text>
              </View>
            </Pressable>
          ))}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitleInline}>Popular questions</Text>
          <Pressable onPress={() => setQuery("")}>
            <Text style={styles.seeAll}>See all</Text>
          </Pressable>
        </View>

        <View style={styles.faqCard}>
          {visibleFaqs.length ? (
            visibleFaqs.map((faq) => {
              const index = faqs.indexOf(faq);
              const expanded = openFaq === index;
              return (
                <Pressable
                  key={faq.question}
                  style={[
                    styles.faqItem,
                    expanded && styles.faqItemExpanded,
                    faq === visibleFaqs[visibleFaqs.length - 1] && styles.faqItemLast,
                  ]}
                  onPress={() => setOpenFaq(expanded ? null : index)}
                >
                  <View style={styles.faqHeader}>
                    <Text style={styles.faqQuestion}>{faq.question}</Text>
                    <MaterialCommunityIcons
                      name={expanded ? "chevron-up" : "chevron-down"}
                      size={20}
                      color={expanded ? colors.primary : colors.textMuted}
                    />
                  </View>
                  {expanded ? (
                    <View style={styles.faqAnswerBlock}>
                      <Text style={styles.faqAnswer}>{faq.answer}</Text>
                      {faq.helpful ? (
                        <View style={styles.helpfulRow}>
                          <MaterialCommunityIcons
                            name="thumb-up-outline"
                            size={12}
                            color={colors.textMuted}
                          />
                          <Text style={styles.helpful}>Helpful ({faq.helpful})</Text>
                        </View>
                      ) : null}
                    </View>
                  ) : null}
                </Pressable>
              );
            })
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No matching questions</Text>
              <Text style={styles.emptyText}>Try another keyword or browse a category.</Text>
            </View>
          )}
        </View>

        <View style={styles.contactCard}>
          <ContactOption
            icon="phone"
            tintColor="#16A34A"
            title="Call"
            detail={supportPhone}
            color="#22C55E18"
            onPress={() => void Linking.openURL("tel:+97716600125")}
          />
          <ContactOption
            icon="email-outline"
            tintColor="#2563EB"
            title="Email"
            detail={supportEmail}
            color="#2563EB18"
            onPress={() => void Linking.openURL(`mailto:${supportEmail}`)}
          />
          <ContactOption
            icon="whatsapp"
            tintColor="#16A34A"
            title="WhatsApp"
            detail="+977 98…"
            color="#16A34A18"
            onPress={() => void Linking.openURL("https://wa.me/9779800000000")}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function ContactOption({
  icon,
  title,
  detail,
  color,
  tintColor,
  onPress,
}: {
  icon: IconName;
  title: string;
  detail: string;
  color: string;
  tintColor: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      style={({ pressed }) => [styles.contactOption, pressed && styles.pressed]}
      onPress={onPress}
    >
      <View style={[styles.contactIcon, { backgroundColor: color }]}>
        <MaterialCommunityIcons name={icon} size={19} color={tintColor} />
      </View>
      <Text style={styles.contactTitle}>{title}</Text>
      <Text numberOfLines={1} style={styles.contactDetail}>
        {detail}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F5F2FB" },
  header: {
    minHeight: 66,
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceMuted,
  },
  pressed: { opacity: 0.72 },
  title: { flex: 1, color: colors.text, fontSize: 19, fontWeight: "800" },
  content: { paddingHorizontal: 12, paddingBottom: 32 },
  searchBox: {
    minHeight: 52,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    marginBottom: 18,
    shadowColor: "#2A1550",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  searchInput: { flex: 1, minHeight: 48, color: colors.text, fontSize: 14 },
  chatCard: {
    minHeight: 84,
    borderRadius: 20,
    padding: 18,
    marginBottom: 22,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  chatIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    backgroundColor: "rgba(255,255,255,0.20)",
    alignItems: "center",
    justifyContent: "center",
  },
  chatCopy: { flex: 1 },
  chatTitle: { color: "#FFFFFF", fontSize: 16, fontWeight: "800" },
  chatMeta: { color: "rgba(255,255,255,0.75)", fontSize: 11, marginTop: 3 },
  sectionTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 12,
  },
  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 10,
    marginBottom: 22,
  },
  categoryCard: {
    width: "48.5%",
    minHeight: 113,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 14,
    justifyContent: "space-between",
  },
  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  categoryTitle: { color: colors.text, fontSize: 13, fontWeight: "800" },
  categoryCount: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  sectionTitleInline: { color: colors.text, fontSize: 14, fontWeight: "800" },
  seeAll: { color: colors.primary, fontSize: 12, fontWeight: "700" },
  faqCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    overflow: "hidden",
  },
  faqItem: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  faqItemExpanded: { backgroundColor: colors.primaryLight },
  faqItemLast: { borderBottomWidth: 0 },
  faqHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  faqQuestion: {
    flex: 1,
    color: colors.text,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
  },
  faqAnswerBlock: { marginTop: 10 },
  faqAnswer: { color: colors.textSecondary, fontSize: 12, lineHeight: 19 },
  helpfulRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  helpful: { color: colors.primary, fontSize: 11, fontWeight: "700", marginTop: 10 },
  emptyState: { padding: 20, alignItems: "center" },
  emptyTitle: { color: colors.text, fontSize: 13, fontWeight: "700" },
  emptyText: { color: colors.textMuted, fontSize: 11, marginTop: 4 },
  contactCard: {
    marginTop: 22,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    flexDirection: "row",
    gap: 12,
  },
  contactOption: { flex: 1, minWidth: 0, alignItems: "center" },
  contactIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  contactTitle: { color: colors.text, fontSize: 12, fontWeight: "700" },
  contactDetail: {
    width: "100%",
    color: colors.textMuted,
    fontSize: 10,
    textAlign: "center",
    marginTop: 2,
  },
});
