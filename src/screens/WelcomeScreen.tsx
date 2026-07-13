import { Image, Pressable, StyleSheet, View } from "react-native";
import { Text } from "../components/Typography";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { ProfileStackParamList } from "../navigation/types";
import { colors, radii } from "../theme";

type Props = NativeStackScreenProps<ProfileStackParamList, "Welcome">;

export default function WelcomeScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.welcome, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 24 }]}>
      <View style={styles.wordmarkRow}>
        <View style={styles.miniPin} />
        <Text style={styles.wordmark}>RIDELINK</Text>
      </View>

      <View style={styles.welcomeHero}>
        <Image
          source={require("../../assets/welcome-riders.png")}
          resizeMode="contain"
          style={styles.welcomeImage}
          accessibilityLabel="Two RideLink travelers standing beside a car"
        />
      </View>

      <View style={styles.welcomeContent}>
        <View style={styles.welcomeCopy}>
          <Text style={styles.eyebrow}>RIDE TOGETHER. GO FURTHER.</Text>
          <Text style={styles.title}>Let's get you moving.</Text>
          <Text style={styles.bodyText}>Sign in to manage your trips and bookings, or explore available rides as a guest.</Text>
        </View>
        <View style={styles.welcomeActions}>
          <Pressable style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]} onPress={() => navigation.navigate("SignIn")}>
            <Text style={styles.primaryButtonText}>Sign in</Text>
          </Pressable>
          <Pressable style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]} onPress={() => navigation.navigate("SignUp")}>
            <Text style={styles.secondaryButtonText}>Create an account</Text>
          </Pressable>
        </View>
        <Text style={styles.legal}>By continuing, you agree to RideLink's Terms and Privacy Policy.</Text>
        <Text style={styles.poweredBy}>Powered by Starkite Technologies</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  welcome: { flex: 1, backgroundColor: colors.surface, paddingHorizontal: 26 },
  wordmarkRow: { flexDirection: "row", alignItems: "center", gap: 8, height: 44 },
  miniPin: { width: 14, height: 18, borderRadius: 9, borderBottomRightRadius: 2, backgroundColor: colors.success, transform: [{ rotate: "45deg" }] },
  wordmark: { color: colors.navy, fontSize: 16, fontWeight: "900", letterSpacing: 1.4 },
  welcomeHero: { aspectRatio: 792 / 697, marginTop: 20 },
  welcomeImage: { width: "100%", height: "100%" },
  welcomeContent: { flex: 1, justifyContent: "flex-end", gap: 20, paddingTop: 24 },
  welcomeCopy: { alignItems: "center", gap: 10 },
  eyebrow: { color: colors.success, fontSize: 12, fontWeight: "900", letterSpacing: 1.5 },
  title: { color: colors.ink, fontSize: 32, lineHeight: 42, fontWeight: "900", textAlign: "center" },
  bodyText: { color: colors.muted, fontSize: 16, lineHeight: 24, textAlign: "center", maxWidth: 330 },
  welcomeActions: { alignSelf: "stretch", gap: 12 },
  primaryButton: { minHeight: 56, borderRadius: radii.md, borderCurve: "continuous", backgroundColor: colors.navy, alignItems: "center", justifyContent: "center", paddingHorizontal: 22 },
  primaryButtonText: { color: colors.surface, fontSize: 16, fontWeight: "800" },
  secondaryButton: { minHeight: 56, borderRadius: radii.md, borderCurve: "continuous", borderWidth: 1.5, borderColor: colors.navy, alignItems: "center", justifyContent: "center" },
  secondaryButtonText: { color: colors.navy, fontSize: 16, fontWeight: "800" },
  pressed: { opacity: 0.84, transform: [{ scale: 0.99 }] },
  legal: { color: colors.muted, fontSize: 11, lineHeight: 16, textAlign: "center", paddingHorizontal: 24 },
  poweredBy: { color: colors.muted, fontSize: 11, fontWeight: "700", letterSpacing: 0.5, textAlign: "center", marginTop: 4 },
});
