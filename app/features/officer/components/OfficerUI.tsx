import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { colors } from "../../../constants/colors";

export function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {action}
      </View>
      {children}
    </View>
  );
}

export function Badge({ label, tone = "neutral" }: { label: string; tone?: "neutral" | "info" | "warning" | "danger" | "success" }) {
  return <Text style={[styles.badge, styles[`badge_${tone}`]]}>{label}</Text>;
}

export function IconButton({
  icon,
  label,
  onPress,
  disabled = false,
  tone = "primary",
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  tone?: "primary" | "neutral" | "danger";
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        styles[`button_${tone}`],
        disabled ? styles.buttonDisabled : null,
        pressed && !disabled ? styles.buttonPressed : null,
      ]}
    >
      <MaterialCommunityIcons
        name={icon}
        size={18}
        color={tone === "neutral" ? colors.text : colors.surface}
      />
      <Text style={[styles.buttonLabel, tone === "neutral" ? styles.buttonLabelNeutral : null]}>
        {label}
      </Text>
    </Pressable>
  );
}

export function TextField({
  value,
  onChangeText,
  placeholder,
  multiline = false,
}: {
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  multiline?: boolean;
}) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={colors.textMuted}
      multiline={multiline}
      style={[styles.input, multiline ? styles.multiline : null]}
    />
  );
}

export function EmptyState({ title, message }: { title: string; message: string }) {
  return (
    <View style={styles.stateBox}>
      <MaterialCommunityIcons name="text-box-search-outline" size={28} color={colors.textMuted} />
      <Text style={styles.stateTitle}>{title}</Text>
      <Text style={styles.stateMessage}>{message}</Text>
    </View>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <View style={styles.stateBox}>
      <MaterialCommunityIcons name="alert-circle-outline" size={28} color={colors.error} />
      <Text style={styles.stateTitle}>Unable to load</Text>
      <Text style={styles.stateMessage}>{message}</Text>
      <IconButton icon="refresh" label="Retry" onPress={onRetry} tone="neutral" />
    </View>
  );
}

export function LoadingState({ label = "Loading..." }: { label?: string }) {
  return (
    <View style={styles.stateBox}>
      <ActivityIndicator color={colors.primary} />
      <Text style={styles.stateMessage}>{label}</Text>
    </View>
  );
}

export function Toast({ message, tone = "success" }: { message: string | null; tone?: "success" | "danger" }) {
  if (!message) {
    return null;
  }

  return (
    <View style={[styles.toast, tone === "danger" ? styles.toastDanger : null]}>
      <Text style={styles.toastText}>{message}</Text>
    </View>
  );
}

export function SelectRow<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: Array<{ label: string; value: T }>;
  onChange: (value: T) => void;
}) {
  return (
    <View style={styles.selectBlock}>
      <Text style={styles.selectLabel}>{label}</Text>
      <View style={styles.selectRow}>
        {options.map((option) => (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            style={[styles.segment, value === option.value ? styles.segmentActive : null]}
          >
            <Text style={[styles.segmentText, value === option.value ? styles.segmentTextActive : null]}>
              {option.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export const styles = StyleSheet.create({
  section: {
    marginTop: 18,
    gap: 12,
  },
  sectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "800",
  },
  badge: {
    alignSelf: "flex-start",
    borderRadius: 999,
    overflow: "hidden",
    paddingHorizontal: 10,
    paddingVertical: 5,
    fontSize: 11,
    fontWeight: "800",
    textTransform: "capitalize",
  },
  badge_neutral: {
    backgroundColor: colors.surfaceMuted,
    color: colors.textSecondary,
  },
  badge_info: {
    backgroundColor: "#DBEAFE",
    color: "#1D4ED8",
  },
  badge_warning: {
    backgroundColor: "#FEF3C7",
    color: "#92400E",
  },
  badge_danger: {
    backgroundColor: "#FEE2E2",
    color: "#B91C1C",
  },
  badge_success: {
    backgroundColor: "#DCFCE7",
    color: "#15803D",
  },
  button: {
    alignItems: "center",
    borderRadius: 8,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    minHeight: 42,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  button_primary: {
    backgroundColor: colors.primary,
  },
  button_neutral: {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
    borderWidth: 1,
  },
  button_danger: {
    backgroundColor: colors.error,
  },
  buttonDisabled: {
    opacity: 0.55,
  },
  buttonPressed: {
    opacity: 0.86,
  },
  buttonLabel: {
    color: colors.surface,
    fontSize: 13,
    fontWeight: "800",
  },
  buttonLabelNeutral: {
    color: colors.text,
  },
  input: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    color: colors.text,
    fontSize: 14,
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  multiline: {
    minHeight: 92,
    textAlignVertical: "top",
  },
  stateBox: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: 10,
    padding: 22,
  },
  stateTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "800",
  },
  stateMessage: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
  },
  toast: {
    backgroundColor: colors.success,
    borderRadius: 8,
    left: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    position: "absolute",
    right: 16,
    top: 12,
    zIndex: 20,
  },
  toastDanger: {
    backgroundColor: colors.error,
  },
  toastText: {
    color: colors.surface,
    fontSize: 13,
    fontWeight: "800",
    textAlign: "center",
  },
  selectBlock: {
    gap: 8,
  },
  selectLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  selectRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  segment: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  segmentActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  segmentText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "800",
  },
  segmentTextActive: {
    color: colors.surface,
  },
});
