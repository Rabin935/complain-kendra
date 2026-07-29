import { Text } from "@/src/theme/typography";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useRef, useState } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";

type StartupSplashScreenProps = {
  message?: string;
};

const verticalGridLines = [32, 64, 96, 128, 160, 192, 224, 256, 288, 320, 352];
const horizontalGridLines = [32, 64, 96, 128, 160, 192, 224, 256, 288, 320, 352, 384, 416, 448, 480, 512, 544, 576, 608, 640, 672, 704, 736, 768, 800, 832];

export default function StartupSplashScreen({
  message = "Connecting to your ward",
}: StartupSplashScreenProps) {
  const floatProgress = useRef(new Animated.Value(0)).current;
  const pulseProgress = useRef(new Animated.Value(0)).current;
  const loadingProgress = useRef(new Animated.Value(0)).current;
  const [percentage, setPercentage] = useState(0);

  useEffect(() => {
    const floatAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(floatProgress, {
          toValue: 1,
          duration: 1200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(floatProgress, {
          toValue: 0,
          duration: 1200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseProgress, {
          toValue: 1,
          duration: 1500,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulseProgress, {
          toValue: 0,
          duration: 1500,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );

    floatAnimation.start();
    pulseAnimation.start();

    return () => {
      floatAnimation.stop();
      pulseAnimation.stop();
    };
  }, [floatProgress, pulseProgress]);

  useEffect(() => {
    const listenerId = loadingProgress.addListener(({ value }) => {
      setPercentage(Math.round(value));
    });
    const loadingAnimation = Animated.timing(loadingProgress, {
      toValue: 100,
      duration: 700,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    });

    loadingAnimation.start();

    return () => {
      loadingAnimation.stop();
      loadingProgress.removeListener(listenerId);
    };
  }, [loadingProgress]);

  const logoTransform = {
    transform: [
      {
        translateY: floatProgress.interpolate({
          inputRange: [0, 1],
          outputRange: [5, -5],
        }),
      },
      {
        scale: floatProgress.interpolate({
          inputRange: [0, 1],
          outputRange: [0.99, 1.03],
        }),
      },
    ],
  };

  const ringTransform = {
    opacity: pulseProgress.interpolate({
      inputRange: [0, 1],
      outputRange: [0.35, 0.8],
    }),
    transform: [
      {
        scale: pulseProgress.interpolate({
          inputRange: [0, 1],
          outputRange: [0.96, 1.07],
        }),
      },
    ],
  };

  return (
    <LinearGradient
      colors={["#7B4FC8", "#6038B0", "#3E2075"]}
      start={{ x: 0.05, y: 0 }}
      end={{ x: 0.95, y: 1 }}
      style={styles.container}
    >
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        {verticalGridLines.map((left) => (
          <View key={`v-${left}`} style={[styles.verticalGridLine, { left }]} />
        ))}
        {horizontalGridLines.map((top) => (
          <View key={`h-${top}`} style={[styles.horizontalGridLine, { top }]} />
        ))}
      </View>

      <StatusPill label="Ward 12" color="#F59E0B" style={styles.wardPill} />
      <StatusPill label="Resolved" color="#22C55E" style={styles.resolvedPill} />
      <StatusPill label="In Progress" color="#3B82F6" style={styles.progressPill} />

      <View style={styles.brandArea}>
        <View style={styles.logoStage}>
          <Animated.View style={[styles.outerRing, ringTransform]} />
          <View style={styles.innerRing} />
          <Animated.View style={[styles.logoBadge, logoTransform]}>
            <MaterialCommunityIcons name="map-marker" size={50} color="#6038B0" />
          </Animated.View>
        </View>

        <Text style={styles.title}>
          Complain<Text style={styles.titleAccent}>Kendra</Text>
        </Text>
        <Text style={styles.subtitle}>AI-POWERED CIVIC REPORTING</Text>
      </View>

      <View style={styles.loadingArea}>
        <View style={styles.loadingTrack}>
          <Animated.View
            style={[
              styles.loadingFill,
              {
                width: loadingProgress.interpolate({
                  inputRange: [0, 100],
                  outputRange: ["0%", "100%"],
                }),
              },
            ]}
          />
        </View>
        <View style={styles.loadingCopy}>
          <View style={styles.loadingDot} />
          <Text numberOfLines={1} style={styles.loadingMessage}>{message}</Text>
          <Text style={styles.percentage}>{percentage}%</Text>
        </View>
        <Text style={styles.footer}>MADE FOR NEPAL · V 1.0</Text>
      </View>
    </LinearGradient>
  );
}

function StatusPill({
  label,
  color,
  style,
}: {
  label: string;
  color: string;
  style: object;
}) {
  return (
    <View style={[styles.statusPill, style]}>
      <View style={[styles.statusDot, { backgroundColor: color }]} />
      <Text style={styles.statusLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  verticalGridLine: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  horizontalGridLine: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  statusPill: {
    position: "absolute",
    zIndex: 2,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.20)",
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  wardPill: {
    top: 92,
    left: 10,
    transform: [{ rotate: "-4deg" }],
  },
  resolvedPill: {
    top: 140,
    right: 20,
    transform: [{ rotate: "3deg" }],
  },
  progressPill: {
    top: "54%",
    left: 18,
    transform: [{ rotate: "5deg" }],
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  statusLabel: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  brandArea: {
    zIndex: 1,
    alignItems: "center",
    marginTop: -20,
  },
  logoStage: {
    width: 240,
    height: 240,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  outerRing: {
    position: "absolute",
    width: 240,
    height: 240,
    borderRadius: 120,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "rgba(255,255,255,0.20)",
  },
  innerRing: {
    position: "absolute",
    width: 168,
    height: 168,
    borderRadius: 84,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "rgba(255,255,255,0.25)",
  },
  logoBadge: {
    width: 104,
    height: 104,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F4EEFD",
    shadowColor: "#2A1550",
    shadowOpacity: 0.35,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 18 },
    elevation: 12,
  },
  loadingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 7,
    backgroundColor: "#22C55E",
  },
  title: {
    color: "#FFFFFF",
    fontSize: 36,
    lineHeight: 40,
    fontWeight: "800",
    letterSpacing: -1.4,
  },
  titleAccent: {
    color: "#C4B5FD",
  },
  subtitle: {
    color: "rgba(255,255,255,0.65)",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 2,
    marginTop: 10,
  },
  loadingArea: {
    position: "absolute",
    left: 20,
    right: 20,
    bottom: 44,
  },
  loadingTrack: {
    height: 4,
    borderRadius: 999,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.20)",
    marginBottom: 16,
  },
  loadingFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
  },
  loadingCopy: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  loadingMessage: {
    flex: 1,
    color: "rgba(255,255,255,0.65)",
    fontSize: 11,
    fontWeight: "600",
  },
  percentage: {
    color: "rgba(255,255,255,0.65)",
    fontSize: 11,
    fontWeight: "600",
  },
  footer: {
    color: "rgba(255,255,255,0.40)",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 2.5,
    textAlign: "center",
    marginTop: 28,
  },
});
