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
      <MaterialCommunityIcons
        name={icon as keyof typeof MaterialCommunityIcons.glyphMap}
        size={emphasized ? 24 : 21}
        color={focused ? colors.primaryLight : "#ECF5F5"}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  iconShell: {
    alignItems: "center",
    justifyContent: "center",
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
  },
  iconShellEmphasized: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginTop: -6,
  },
  iconShellFocused: {
    backgroundColor: colors.primary,
    borderColor: "rgba(255,255,255,0.22)",
    shadowColor: colors.primary,
    shadowOpacity: 0.28,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  iconShellIdle: {
    backgroundColor: "#1F2E39",
    borderColor: "rgba(255,255,255,0.12)",
  },
});
