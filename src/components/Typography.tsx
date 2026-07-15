import { forwardRef } from "react";
import {
  StyleSheet,
  Text as NativeText,
  TextInput as NativeTextInput,
  type TextInputProps,
  type TextProps,
} from "react-native";
import { colors } from "../theme";

const fontForWeight = (weight: TextProps["style"] extends infer _ ? string | number | undefined : never) => {
  const numericWeight = typeof weight === "string" ? Number.parseInt(weight, 10) : weight;
  if (numericWeight && numericWeight >= 800) return "Manrope_800ExtraBold";
  if (numericWeight && numericWeight >= 700) return "Manrope_700Bold";
  if (numericWeight && numericWeight >= 600) return "Manrope_600SemiBold";
  if (numericWeight && numericWeight >= 500) return "Manrope_500Medium";
  return "Manrope_400Regular";
};

export const Text = forwardRef<NativeText, TextProps>(({ style, ...props }, ref) => {
  const flattened = StyleSheet.flatten(style);
  const weight = flattened?.fontWeight;
  const foreground = flattened?.color === colors.surface ? colors.onBrand : undefined;
  return <NativeText ref={ref} {...props} style={[style, foreground ? { color: foreground } : null, { fontFamily: fontForWeight(weight), fontWeight: "normal" }]} />;
});

Text.displayName = "RideLinkText";

export type TextInput = NativeTextInput;

export const TextInput = forwardRef<NativeTextInput, TextInputProps>(({ style, ...props }, ref) => {
  const flattened = StyleSheet.flatten(style);
  const weight = flattened?.fontWeight;
  const foreground = flattened?.color === colors.surface ? colors.onBrand : undefined;
  return <NativeTextInput ref={ref} {...props} style={[style, foreground ? { color: foreground } : null, { fontFamily: fontForWeight(weight), fontWeight: "normal" }]} />;
});

TextInput.displayName = "RideLinkTextInput";
