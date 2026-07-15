import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { Text } from "./Typography";
import { colors, radii } from "../theme";

export function StateView({
  title,
  message,
  actionLabel,
  onAction,
  loading = false,
}: {
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  loading?: boolean;
}) {
  return (
    <View style={styles.container}>
      <View style={styles.icon}>{loading ? <ActivityIndicator color={colors.success} /> : <Text style={styles.iconText}>RL</Text>}</View>
      <Text style={styles.title} selectable>{title}</Text>
      <Text style={styles.message} selectable>{message}</Text>
      {actionLabel && onAction ? (
        <Pressable style={({ pressed }) => [styles.button, pressed && styles.pressed]} onPress={onAction}>
          <Text style={styles.buttonText}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, minHeight: 300, alignItems: "center", justifyContent: "center", padding: 28, gap: 8 },
  icon: { width: 56, height: 56, borderRadius: 18, backgroundColor: colors.successWash, alignItems: "center", justifyContent: "center", marginBottom: 6 },
  iconText: { color: colors.success, fontSize: 13, fontWeight: "900" },
  title: { color: colors.ink, fontSize: 18, fontWeight: "900", textAlign: "center" },
  message: { color: colors.muted, fontSize: 14, lineHeight: 21, textAlign: "center", maxWidth: 330 },
  button: { marginTop: 10, minHeight: 46, backgroundColor: colors.navy, borderRadius: radii.md, paddingHorizontal: 20, alignItems: "center", justifyContent: "center" },
  buttonText: { color: colors.surface, fontWeight: "800" },
  pressed: { opacity: 0.82, transform: [{ scale: 0.98 }] },
});
