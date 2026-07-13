import { Pressable, StyleSheet } from "react-native";
import { Text } from "./Typography";
import { colors } from "../theme";

type Props = {
  onPress: () => void;
  topOffset?: number;
};

export default function BackButton({ onPress, topOffset = 16 }: Props) {
  return (
    <Pressable
      hitSlop={12}
      onPress={onPress}
      style={({ pressed }) => [styles.button, { top: topOffset }, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel="Back"
    >
      <Text style={styles.chevron}>{"‹"}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    position: "absolute",
    left: 16,
    zIndex: 1,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 6px 14px rgba(3,28,58,0.12)",
  },
  pressed: { opacity: 0.8, transform: [{ scale: 0.96 }] },
  chevron: { color: colors.navy, fontSize: 22, fontWeight: "900", marginRight: 1 },
});
