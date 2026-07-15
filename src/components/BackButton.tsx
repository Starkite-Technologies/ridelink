import { Pressable, StyleSheet } from "react-native";
import { CaretLeft } from "./icons";
import { colors } from "../theme";

export default function BackButton({ onPress, topOffset = 16 }: { onPress: () => void; topOffset?: number }) {
  return (
    <Pressable hitSlop={12} onPress={onPress} style={({ pressed }) => [styles.button, { top: topOffset }, pressed && styles.pressed]} accessibilityRole="button" accessibilityLabel="Back">
      <CaretLeft size={20} color={colors.onBrand} weight="bold" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { position: "absolute", left: 16, zIndex: 2, width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,.08)", borderWidth: 1, borderColor: "rgba(255,255,255,.16)", alignItems: "center", justifyContent: "center" },
  pressed: { opacity: .8, transform: [{ scale: .96 }] },
});
