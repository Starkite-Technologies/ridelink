import { Pressable, StyleSheet, View } from "react-native";
import { Text } from "./Typography";
import { colors, radii } from "../theme";

export default function FormBanner({
  message,
  actionLabel,
  onAction,
}: {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.banner}>
      <Text style={styles.bannerText} selectable>
        {message}
      </Text>
      {actionLabel && onAction ? (
        <Pressable hitSlop={8} onPress={onAction}>
          <Text style={styles.bannerAction}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: colors.dangerWash,
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: radii.md,
    borderCurve: "continuous",
    padding: 14,
    gap: 6,
  },
  bannerText: { color: colors.danger, fontSize: 13, lineHeight: 19, fontWeight: "700" },
  bannerAction: { color: colors.navy, fontSize: 13, fontWeight: "900" },
});
