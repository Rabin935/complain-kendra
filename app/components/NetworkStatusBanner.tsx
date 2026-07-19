import { Text } from "@/src/theme/typography";
import {
  useEffect,
  useState } from "react";
import { Platform,
  StyleSheet,
  View,
} from "react-native";
import { colors } from "../constants/colors";

function getInitialOnlineState(): boolean {
  if (Platform.OS !== "web" || typeof navigator === "undefined") {
    return true;
  }

  return navigator.onLine;
}

export default function NetworkStatusBanner() {
  const [online, setOnline] = useState(getInitialOnlineState);

  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined") {
      return;
    }

    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (online) {
    return null;
  }

  return (
    <View style={styles.banner}>
      <Text style={styles.text}>You are offline. Some actions will be unavailable until the connection returns.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: colors.warning,
    left: 0,
    paddingHorizontal: 14,
    paddingVertical: 10,
    position: "absolute",
    right: 0,
    top: 0,
    zIndex: 50,
  },
  text: {
    color: colors.surface,
    fontSize: 12,
    fontWeight: "900",
    textAlign: "center",
  },
});
