import { MaterialCommunityIcons } from "@expo/vector-icons";
import { StyleSheet } from "react-native";
import { colors } from "../../../constants/colors";

interface UserTabIconProps {
  icon: string;
  focused: boolean;
}

export default function UserTabIcon({ icon, focused }: UserTabIconProps) {
  return (
    <MaterialCommunityIcons
      name={icon as React.ComponentProps<typeof MaterialCommunityIcons>["name"]}
      size={22}
      color={focused ? colors.primary : colors.textMuted}
      style={styles.icon}
    />
  );
}

const styles = StyleSheet.create({
  icon: {
    marginBottom: -2,
  },
});
