import type { ReactNode } from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { colors } from "../../../constants/colors";

export function DevConsoleField(props: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  secureTextEntry?: boolean;
  multiline?: boolean;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{props.label}</Text>
      <TextInput
        value={props.value}
        onChangeText={props.onChangeText}
        secureTextEntry={props.secureTextEntry}
        multiline={props.multiline}
        textAlignVertical={props.multiline ? "top" : "center"}
        style={[styles.input, props.multiline ? styles.textarea : null]}
        placeholderTextColor={colors.textMuted}
      />
    </View>
  );
}

export function DevConsoleSelect(props: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{props.label}</Text>
      <View style={styles.optionRow}>
        {props.options.map((option) => {
          const active = props.value === option;

          return (
            <Pressable
              key={option}
              onPress={() => props.onChange(option)}
              style={[styles.chip, active ? styles.chipActive : null]}
            >
              <Text style={[styles.chipText, active ? styles.chipTextActive : null]}>
                {option}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function DevConsoleToggle(props: {
  label: string;
  value: boolean;
  onToggle: (value: boolean) => void;
}) {
  return (
    <Pressable style={styles.toggleRow} onPress={() => props.onToggle(!props.value)}>
      <View style={styles.toggleCopy}>
        <Text style={styles.label}>{props.label}</Text>
        <Text style={styles.toggleText}>
          {props.value ? "Enabled" : "Disabled"}
        </Text>
      </View>
      <View style={[styles.toggleBadge, props.value ? styles.toggleBadgeOn : null]}>
        <MaterialCommunityIcons
          name={props.value ? "check" : "close"}
          size={16}
          color={colors.surface}
        />
      </View>
    </Pressable>
  );
}

export function DevConsoleButton(props: {
  label: string;
  onPress: () => void | Promise<void>;
  tone?: "primary" | "secondary" | "danger";
}) {
  const tone = props.tone ?? "primary";

  return (
    <Pressable
      onPress={() => void props.onPress()}
      style={[
        styles.button,
        tone === "primary"
          ? styles.buttonPrimary
          : tone === "danger"
            ? styles.buttonDanger
            : styles.buttonSecondary,
      ]}
    >
      <Text
        style={[
          styles.buttonText,
          tone === "secondary" ? styles.buttonTextSecondary : null,
        ]}
      >
        {props.label}
      </Text>
    </Pressable>
  );
}

export function DevConsoleSection(props: {
  title: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{props.title}</Text>
      {props.children}
    </View>
  );
}

export function DevConsoleActionRow(props: { children: ReactNode }) {
  return <View style={styles.actionRow}>{props.children}</View>;
}

const styles = StyleSheet.create({
  actionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 8,
  },
  button: {
    minHeight: 40,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonDanger: {
    backgroundColor: "#FFF1F2",
    borderColor: "#FCA5A5",
  },
  buttonPrimary: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  buttonSecondary: {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
  },
  buttonText: {
    color: colors.surface,
    fontSize: 12,
    fontWeight: "900",
  },
  buttonTextSecondary: {
    color: colors.primary,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "800",
  },
  chipTextActive: {
    color: colors.surface,
  },
  field: {
    marginTop: 8,
  },
  input: {
    minHeight: 44,
    marginTop: 6,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    color: colors.text,
    fontSize: 14,
    fontWeight: "700",
  },
  label: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  optionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 6,
  },
  section: {
    marginTop: 14,
    padding: 16,
    borderRadius: 22,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "900",
  },
  textarea: {
    minHeight: 88,
    paddingVertical: 12,
  },
  toggleBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.textMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  toggleBadgeOn: {
    backgroundColor: colors.success,
  },
  toggleCopy: {
    flex: 1,
    gap: 4,
  },
  toggleRow: {
    marginTop: 8,
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  toggleText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: "700",
  },
});
