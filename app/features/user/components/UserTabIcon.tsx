import { MaterialCommunityIcons } from "@expo/vector-icons";
import { StyleSheet, View } from "react-native";
import { colors } from "../../../constants/colors";

interface UserTabIconProps {
  icon: string;
  focused: boolean;
  emphasized?: boolean;
}

export default function UserTabIcon({
  icon,
  focused,
  emphasized = false,
}: UserTabIconProps) {
  return (
    <View
      style={[
        styles.iconShell,
        emphasized ? styles.iconShellEmphasized : null,
        focused ? styles.iconShellFocused : styles.iconShellIdle,
      ]}
    >
      {emphasized ? <View style={styles.plusGlow} /> : null}
      <MaterialCommunityIcons
        name={icon as keyof typeof MaterialCommunityIcons.glyphMap}
        size={emphasized ? 30 : 21}
        color={emphasized || focused ? colors.surface : colors.textMuted}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  iconShell: {
    alignItems: "center",
    justifyContent: "center",
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
  },
  iconShellEmphasized: {
    width: 62,
    height: 62,
    borderRadius: 31,
    marginTop: -28,
    backgroundColor: colors.primary,
    borderColor: "rgba(255,255,255,0.64)",
    shadowColor: colors.primary,
    shadowOpacity: 0.32,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 14 },
    elevation: 12,
  },
  iconShellFocused: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  iconShellIdle: {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
  },
  plusGlow: {
    position: "absolute",
    top: 8,
    left: 8,
    right: 8,
    height: 18,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
});
