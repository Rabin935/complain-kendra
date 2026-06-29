import type { ExpoConfig } from "expo/config";
import { existsSync } from "node:fs";

const iosGoogleServicesFile = "./GoogleService-Info.plist";
const androidGoogleServicesFile = "./google-services.json";

const config: ExpoConfig = {
  name: "ComplaintHub",
  slug: "ComplaintHub",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  scheme: "complainthub",
  userInterfaceStyle: "automatic",
  newArchEnabled: true,
  splash: {
    image: "./assets/images/splash-icon.png",
    resizeMode: "contain",
    backgroundColor: "#F4F7FB",
  },
  ios: {
    supportsTablet: true,
    // Manual Google Sign-In setup:
    // 1. Download GoogleService-Info.plist from Firebase / Google Cloud Console.
    // 2. Place it in the project root at ./GoogleService-Info.plist.
    // 3. Run `npm run prebuild` or an EAS build so Expo can copy it into the native iOS project.
    ...(existsSync(iosGoogleServicesFile)
      ? { googleServicesFile: iosGoogleServicesFile }
      : {}),
  },
  android: {
    adaptiveIcon: {
      foregroundImage: "./assets/images/adaptive-icon.png",
      backgroundColor: "#ffffff",
    },
    edgeToEdgeEnabled: true,
    predictiveBackGestureEnabled: false,
    // Manual Google Sign-In setup:
    // 1. Download google-services.json from Firebase / Google Cloud Console.
    // 2. Place it in the project root at ./google-services.json.
    // 3. After `npm run prebuild`, confirm android/app/src/main/AndroidManifest.xml still matches
    //    the package name and Google metadata generated from your config file if you keep native
    //    Android files checked into source control.
    ...(existsSync(androidGoogleServicesFile)
      ? { googleServicesFile: androidGoogleServicesFile }
      : {}),
  },
  web: {
    bundler: "metro",
    output: "static",
    favicon: "./assets/images/favicon.png",
  },
  plugins: [
    "expo-router",
    "expo-sqlite",
    "expo-web-browser",
    // The Expo plugin links google-services.json / GoogleService-Info.plist during native builds.
    "@react-native-google-signin/google-signin",
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    googleWebClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? "",
  },
};

export default config;
