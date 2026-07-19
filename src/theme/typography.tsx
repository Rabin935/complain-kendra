import React, { forwardRef } from "react";
import {
  StyleSheet,
  Text as NativeText,
  TextInput as NativeTextInput,
  type TextInputProps as NativeTextInputProps,
  type TextProps as NativeTextProps,
} from "react-native";

export type TextProps = NativeTextProps;
export type TextInputProps = NativeTextInputProps;
export type TextInput = React.ElementRef<typeof NativeTextInput>;

export const interFonts = {
  regular: "Inter_400Regular",
  medium: "Inter_500Medium",
  semibold: "Inter_600SemiBold",
  bold: "Inter_700Bold",
} as const;

type TextStyleInput = NativeTextProps["style"] | NativeTextInputProps["style"];

function resolveInterFamily(style: TextStyleInput) {
  const flattened = StyleSheet.flatten(style);
  const weight = flattened?.fontWeight?.toString();

  if (weight === "500") {
    return interFonts.medium;
  }

  if (weight === "600") {
    return interFonts.semibold;
  }

  if (weight === "700" || weight === "bold") {
    return interFonts.semibold;
  }

  if (weight === "800" || weight === "900") {
    return interFonts.bold;
  }

  return interFonts.regular;
}

export function withInterFont(style: TextStyleInput) {
  return [
    style,
    {
      fontFamily: resolveInterFamily(style),
      fontWeight: undefined,
    },
  ];
}

export const Text = forwardRef<React.ElementRef<typeof NativeText>, NativeTextProps>(
  ({ style, ...props }, ref) => <NativeText ref={ref} {...props} style={withInterFont(style)} />
);

Text.displayName = "Text";

export const TextInput = forwardRef<TextInput, NativeTextInputProps>(({ style, ...props }, ref) => (
  <NativeTextInput ref={ref} {...props} style={withInterFont(style)} />
));

TextInput.displayName = "TextInput";
