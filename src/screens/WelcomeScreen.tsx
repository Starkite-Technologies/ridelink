import { Image, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ArrowRight, Car, SignIn, User } from "../components/icons";
import { Text } from "../components/Typography";
import type { ProfileStackParamList } from "../navigation/types";
import { colors, radii } from "../theme";

type Props = NativeStackScreenProps<ProfileStackParamList, "Welcome">;

export default function WelcomeScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView style={styles.screen} contentContainerStyle={[styles.content, { paddingTop: insets.top + 22, paddingBottom: insets.bottom + 24 }]} contentInsetAdjustmentBehavior="never">
      <View style={styles.brandRow}>
        <Image source={require("../../assets/favicon.png")} style={styles.logo} />
        <Text style={styles.wordmark}>RideLink</Text>
      </View>

      <View style={styles.heroCopy}>
        <Text style={styles.eyebrow}>MOVE WITH CONFIDENCE</Text>
        <Text style={styles.title}>One app.{"\n"}Two clear journeys.</Text>
        <Text style={styles.subtitle}>Create either a Passenger account to book rides or a Driver account to publish and manage trips.</Text>
      </View>

      <View style={styles.roles} accessibilityRole="radiogroup">
        <RoleCard
          title="I am a passenger"
          body="Search local and long routes, choose seats, and keep every ticket in one place."
          icon={User}
          onPress={() => navigation.navigate("SignUp", { accountType: "PASSENGER" })}
        />
        <RoleCard
          title="I am a driver"
          body="Register a vehicle, publish trips, manage passengers, and track your operations."
          icon={Car}
          onPress={() => navigation.navigate("SignUp", { accountType: "DRIVER" })}
        />
      </View>

      <Pressable style={({ pressed }) => [styles.signInButton, pressed && styles.pressed]} onPress={() => navigation.navigate("SignIn")}>
        <SignIn size={20} color={colors.navy} weight="bold" />
        <Text style={styles.signInText}>I already have an account</Text>
      </Pressable>
      <Text style={styles.legal}>Your account type is permanent and keeps the Passenger and Driver experiences separate.</Text>
    </ScrollView>
  );
}

function RoleCard({ title, body, icon: Icon, onPress }: { title: string; body: string; icon: typeof User; onPress: () => void }) {
  return (
    <Pressable style={({ pressed }) => [styles.roleCard, pressed && styles.pressed]} onPress={onPress}>
      <View style={styles.roleIcon}><Icon size={28} color={colors.navy} weight="fill" /></View>
      <View style={styles.roleCopy}><Text style={styles.roleTitle}>{title}</Text><Text style={styles.roleBody}>{body}</Text></View>
      <ArrowRight size={20} color={colors.success} weight="bold" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.navy },
  content: { flexGrow: 1, paddingHorizontal: 22, gap: 28 },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  logo: { width: 42, height: 42, borderRadius: 13 },
  wordmark: { color: colors.surface, fontSize: 20, fontWeight: "900", letterSpacing: -0.5 },
  heroCopy: { gap: 13, paddingTop: 24 },
  eyebrow: { color: colors.success, fontSize: 10, fontWeight: "900", letterSpacing: 1.5 },
  title: { color: colors.surface, fontSize: 42, lineHeight: 47, fontWeight: "900", letterSpacing: -1.6 },
  subtitle: { color: "rgba(255,255,255,.66)", fontSize: 14, lineHeight: 22, maxWidth: 340 },
  roles: { gap: 12 },
  roleCard: { minHeight: 132, flexDirection: "row", alignItems: "center", gap: 14, padding: 17, borderRadius: radii.lg, borderCurve: "continuous", borderWidth: 1, borderColor: "rgba(255,255,255,.12)", backgroundColor: colors.navySoft, boxShadow: "0 16px 34px rgba(0,0,0,.18)" },
  roleIcon: { width: 52, height: 52, borderRadius: 17, borderCurve: "continuous", alignItems: "center", justifyContent: "center", backgroundColor: colors.success },
  roleCopy: { flex: 1, gap: 5 },
  roleTitle: { color: colors.surface, fontSize: 16, fontWeight: "900" },
  roleBody: { color: "rgba(255,255,255,.56)", fontSize: 10, lineHeight: 16 },
  signInButton: { minHeight: 54, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9, borderRadius: radii.md, borderCurve: "continuous", backgroundColor: colors.success },
  signInText: { color: colors.navy, fontSize: 14, fontWeight: "900" },
  legal: { color: "rgba(255,255,255,.42)", fontSize: 10, lineHeight: 16, textAlign: "center", paddingHorizontal: 18 },
  pressed: { opacity: .86, transform: [{ scale: .99 }] },
});
