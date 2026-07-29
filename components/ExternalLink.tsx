import * as WebBrowser from "expo-web-browser";
import React from "react";
import { Linking, Platform, Pressable, type GestureResponderEvent } from "react-native";

type ExternalLinkProps = {
  href: string;
  children?: React.ReactNode;
  style?: React.ComponentProps<typeof Pressable>["style"];
};

export function ExternalLink({ href, children, style }: ExternalLinkProps) {
  async function openLink(event: GestureResponderEvent) {
    if (Platform.OS !== "web") {
      event.preventDefault();
      await WebBrowser.openBrowserAsync(href);
      return;
    }

    await Linking.openURL(href);
  }

  return (
    <Pressable accessibilityRole="link" onPress={openLink} style={style}>
      {children}
    </Pressable>
  );
}
