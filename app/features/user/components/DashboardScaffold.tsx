import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { ReactNode } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "../../../constants/colors";
import type { DashboardMetric, DashboardShortcut } from "../types/user.types";

interface DashboardScaffoldProps {
  badge: string;
  title: string;
  description: string;
  sectionTitle: string;
  sectionDescription: string;
  metrics: DashboardMetric[];
  shortcuts: DashboardShortcut[];
  footer?: ReactNode;
}

function getToneStyles(tone: DashboardShortcut["tone"]) {
  switch (tone) {
    case "accent":
      return {
        backgroundColor: "#FFF7ED",
        borderColor: "#FED7AA",
        iconBackgroundColor: "#FDBA74",
        iconColor: "#9A3412",
      };
    case "neutral":
      return {
        backgroundColor: "#F8FAFC",
        borderColor: "#D8E1EA",
        iconBackgroundColor: "#D9E7F3",
        iconColor: "#16324F",
      };
    case "primary":
    default:
      return {
        backgroundColor: "#EFFCF8",
        borderColor: "#B7E9DA",
        iconBackgroundColor: "#B8F0E1",
        iconColor: colors.primaryDark,
      };
  }
}

export default function DashboardScaffold({
  badge,
  title,
  description,
  sectionTitle,
  sectionDescription,
  metrics,
  shortcuts,
  footer,
}: DashboardScaffoldProps) {
  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroCard}>
          <Text style={styles.badge}>{badge}</Text>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.description}>{description}</Text>
        </View>

        <View style={styles.metricsRow}>
          {metrics.map((metric) => (
            <View key={metric.label} style={styles.metricCard}>
              <Text style={styles.metricValue}>{metric.value}</Text>
              <Text style={styles.metricLabel}>{metric.label}</Text>
              <Text style={styles.metricCaption}>{metric.caption}</Text>
            </View>
          ))}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{sectionTitle}</Text>
          <Text style={styles.sectionDescription}>{sectionDescription}</Text>
        </View>

        <View style={styles.shortcutList}>
          {shortcuts.map((shortcut) => {
            const toneStyles = getToneStyles(shortcut.tone);

            return (
              <View
                key={shortcut.title}
                style={[
                  styles.shortcutCard,
                  {
                    backgroundColor: toneStyles.backgroundColor,
                    borderColor: toneStyles.borderColor,
                  },
                ]}
              >
                <View
                  style={[
                    styles.shortcutIconWrapper,
                    { backgroundColor: toneStyles.iconBackgroundColor },
                  ]}
                >
                  <MaterialCommunityIcons
                    name={shortcut.icon as keyof typeof MaterialCommunityIcons.glyphMap}
                    size={22}
                    color={toneStyles.iconColor}
                  />
                </View>
                <View style={styles.shortcutCopy}>
                  <Text style={styles.shortcutTitle}>{shortcut.title}</Text>
                  <Text style={styles.shortcutDescription}>{shortcut.description}</Text>
                </View>
              </View>
            );
          })}
        </View>

        {footer ? <View style={styles.footer}>{footer}</View> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 120,
  },
  heroCard: {
    backgroundColor: "#10202B",
    borderRadius: 30,
    padding: 24,
    marginBottom: 18,
    shadowColor: "#08131C",
    shadowOpacity: 0.16,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 16 },
    elevation: 10,
  },
  badge: {
    alignSelf: "flex-start",
    color: colors.primaryLight,
    backgroundColor: "rgba(204,251,241,0.12)",
    borderRadius: 999,
    overflow: "hidden",
    paddingHorizontal: 12,
    paddingVertical: 6,
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 14,
  },
  title: {
    color: colors.surface,
    fontSize: 28,
    fontWeight: "800",
    marginBottom: 10,
  },
  description: {
    color: "#BFD1DB",
    fontSize: 15,
    lineHeight: 22,
  },
  metricsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },
  metricCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
  },
  metricValue: {
    color: colors.text,
    fontSize: 28,
    fontWeight: "800",
    marginBottom: 6,
  },
  metricLabel: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 4,
  },
  metricCaption: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  sectionHeader: {
    marginBottom: 14,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 6,
  },
  sectionDescription: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  shortcutList: {
    gap: 12,
  },
  shortcutCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 18,
    borderRadius: 22,
    borderWidth: 1,
  },
  shortcutIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  shortcutCopy: {
    flex: 1,
    gap: 4,
  },
  shortcutTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "800",
  },
  shortcutDescription: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
  },
  footer: {
    marginTop: 20,
  },
});
