import { useEffect, useRef } from "react";
import {
  Animated,
  Easing,
  Image,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { colors } from "../constants/colors";

const splashIcon = require("../../assets/images/splash-icon.png");

type StartupSplashScreenProps = {
  message?: string;
};

function createDotAnimation(value: Animated.Value) {
  return Animated.sequence([
    Animated.timing(value, {
      toValue: 1,
      duration: 280,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }),
    Animated.timing(value, {
      toValue: 0,
      duration: 520,
      easing: Easing.inOut(Easing.quad),
      useNativeDriver: true,
    }),
  ]);
}

export default function StartupSplashScreen({
  message = "Preparing your complaint dashboard...",
}: StartupSplashScreenProps) {
  const haloProgress = useRef(new Animated.Value(0)).current;
  const logoFloatProgress = useRef(new Animated.Value(0)).current;
  const ringRotation = useRef(new Animated.Value(0)).current;
  const dotOne = useRef(new Animated.Value(0)).current;
  const dotTwo = useRef(new Animated.Value(0)).current;
  const dotThree = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const haloAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(haloProgress, {
          toValue: 1,
          duration: 1500,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(haloProgress, {
          toValue: 0,
          duration: 1500,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );

    const logoAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(logoFloatProgress, {
          toValue: 1,
          duration: 1200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(logoFloatProgress, {
          toValue: 0,
          duration: 1200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );

    const ringAnimation = Animated.loop(
      Animated.timing(ringRotation, {
        toValue: 1,
        duration: 2600,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    const dotsAnimation = Animated.loop(
      Animated.stagger(170, [
        createDotAnimation(dotOne),
        createDotAnimation(dotTwo),
        createDotAnimation(dotThree),
      ])
    );

    haloAnimation.start();
    logoAnimation.start();
    ringAnimation.start();
    dotsAnimation.start();

    return () => {
      haloAnimation.stop();
      logoAnimation.stop();
      ringAnimation.stop();
      dotsAnimation.stop();
    };
  }, [
    dotOne,
    dotThree,
    dotTwo,
    haloProgress,
    logoFloatProgress,
    ringRotation,
  ]);

  const haloScale = haloProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.15],
  });

  const haloOpacity = haloProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.14, 0.3],
  });

  const logoTranslateY = logoFloatProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [6, -6],
  });

  const logoScale = logoFloatProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.98, 1.04],
  });

  const rotatingRing = ringRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <View style={styles.container}>
      <View style={styles.topGlow} />
      <View style={styles.bottomGlow} />

      <View style={styles.brandWrap}>
        <Animated.View
          style={[
            styles.halo,
            {
              opacity: haloOpacity,
              transform: [{ scale: haloScale }],
            },
          ]}
        />

        <Animated.View
          style={[
            styles.logoShell,
            {
              transform: [{ translateY: logoTranslateY }, { scale: logoScale }],
            },
          ]}
        >
          <Animated.View
            style={[
              styles.rotatingRing,
              { transform: [{ rotate: rotatingRing }] },
            ]}
          />
          <View style={styles.logoBadge}>
            <Image
              source={splashIcon}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>
        </Animated.View>
      </View>

      <Text style={styles.title}>ComplaintHub</Text>
      <Text style={styles.subtitle}>{message}</Text>

      <View style={styles.loaderRow}>
        {[dotOne, dotTwo, dotThree].map((value, index) => {
          const opacity = value.interpolate({
            inputRange: [0, 1],
            outputRange: [0.28, 1],
          });

          const translateY = value.interpolate({
            inputRange: [0, 1],
            outputRange: [0, -8],
          });

          return (
            <Animated.View
              key={index}
              style={[
                styles.loaderDot,
                {
                  opacity,
                  transform: [{ translateY }],
                },
              ]}
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
    paddingHorizontal: 24,
    overflow: "hidden",
  },
  topGlow: {
    position: "absolute",
    top: -100,
    left: -50,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: colors.primaryLight,
    opacity: 0.75,
  },
  bottomGlow: {
    position: "absolute",
    right: -80,
    bottom: -70,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: "rgba(245, 158, 11, 0.12)",
  },
  brandWrap: {
    alignItems: "center",
    justifyContent: "center",
    width: 180,
    height: 180,
    marginBottom: 24,
  },
  halo: {
    position: "absolute",
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: colors.primary,
  },
  logoShell: {
    alignItems: "center",
    justifyContent: "center",
    width: 150,
    height: 150,
  },
  rotatingRing: {
    position: "absolute",
    width: 132,
    height: 132,
    borderRadius: 66,
    borderWidth: 2.5,
    borderColor: "rgba(15, 118, 110, 0.16)",
    borderTopColor: colors.primary,
    borderRightColor: "rgba(245, 158, 11, 0.35)",
  },
  logoBadge: {
    width: 108,
    height: 108,
    borderRadius: 34,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#0F172A",
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: {
      width: 0,
      height: 10,
    },
    elevation: 8,
  },
  logo: {
    width: 70,
    height: 70,
  },
  title: {
    fontSize: 30,
    fontWeight: "800",
    color: colors.text,
    letterSpacing: 0.3,
  },
  subtitle: {
    marginTop: 10,
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    color: colors.textMuted,
    maxWidth: 280,
  },
  loaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginTop: 28,
  },
  loaderDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
});
