import { Text } from "@/src/theme/typography";
import type { ReactNode } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { officerColors } from "../../../constants/theme";

export default function OfficerScreen({
  title,
  subtitle,
  children,
  footerGap = true,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footerGap?: boolean;
}) {
  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={[styles.content, footerGap ? styles.contentWithTabs : null]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.eyebrow}>Officer Console</Text>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: officerColors.background,
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 14,
  },
  contentWithTabs: {
    paddingBottom: 110,
  },
  header: {
    gap: 5,
    marginBottom: 16,
  },
  eyebrow: {
    color: officerColors.textMuted,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },
  title: {
    color: officerColors.text,
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: -0.4,
  },
  subtitle: {
    color: officerColors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
});
