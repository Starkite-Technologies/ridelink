import { Alert, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Text } from "../components/Typography";
import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { ProfileStackParamList } from "../navigation/types";
import { useAuth } from "../auth/AuthContext";
import { colors, radii, shadow } from "../theme";

type Props = NativeStackScreenProps<ProfileStackParamList, "ProfileHome">;

type MenuItem = {
  key: string;
  label: string;
  icon: ComponentProps<typeof Ionicons>["name"];
  iconBg: string;
  iconColor: string;
};

const MENU: MenuItem[] = [
  { key: "trips", label: "My trips", icon: "list-outline", iconBg: colors.wash, iconColor: colors.navy },
  { key: "cars", label: "My Cars", icon: "car-outline", iconBg: colors.wash, iconColor: colors.navy },
  { key: "bookings", label: "My bookings", icon: "bookmark-outline", iconBg: colors.successWash, iconColor: colors.success },
  { key: "payments", label: "Payment methods", icon: "card-outline", iconBg: colors.warningWash, iconColor: colors.warning },
  { key: "settings", label: "Settings", icon: "settings-outline", iconBg: colors.wash, iconColor: colors.navy },
  { key: "support", label: "Help & support", icon: "help-circle-outline", iconBg: colors.successWash, iconColor: colors.success },
];

export default function ProfileScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { email, firstName, lastName, phoneNumber, isSignedIn, signOut } = useAuth();
  const displayName = [firstName, lastName].filter(Boolean).join(" ") || email?.split("@")[0] || "RideLink member";

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} contentInsetAdjustmentBehavior="automatic">
      <View style={[styles.hero, { paddingTop: insets.top + 20 }]}>
        <View style={styles.heroTopRow}>
          <Text style={styles.heroLabel}>PROFILE</Text>
          {isSignedIn ? (
            <Pressable hitSlop={10} style={styles.editButton}>
              <Text style={styles.editButtonText}>Edit</Text>
            </Pressable>
          ) : null}
        </View>

        <View style={styles.profileRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{displayName.charAt(0).toUpperCase()}</Text>
          </View>
          <View style={styles.identity}>
            <Text style={styles.name}>{displayName}</Text>
            <Text style={styles.email}>{isSignedIn ? email : "Sign in to unlock your account"}</Text>
            {phoneNumber ? <Text style={styles.phone}>{phoneNumber}</Text> : null}
          </View>
        </View>

        {isSignedIn ? (
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>0</Text>
              <Text style={styles.statLabel}>Trips taken</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statValue}>—</Text>
              <Text style={styles.statLabel}>Rating</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statValue}>New</Text>
              <Text style={styles.statLabel}>Member since</Text>
            </View>
          </View>
        ) : null}
      </View>

      <View style={styles.body}>
        {isSignedIn ? (
          <>
            <View style={styles.menu}>
              {MENU.map((item, index) => (
                <Pressable
                  key={item.key}
                  style={({ pressed }) => [
                    styles.menuRow,
                    index === MENU.length - 1 && styles.menuRowLast,
                    pressed && styles.menuRowPressed,
                  ]}
                  onPress={() => {
                    if (item.key === "cars") {
                      navigation.navigate("MyCars");
                    } else if (item.key === "bookings") {
                      navigation.getParent()?.navigate("Bookings");
                    } else {
                      Alert.alert(item.label, "Coming soon.");
                    }
                  }}
                >
                  <View style={[styles.menuIcon, { backgroundColor: item.iconBg }]}>
                    <Ionicons name={item.icon} size={17} color={item.iconColor} />
                  </View>
                  <Text style={styles.menuText}>{item.label}</Text>
                  <Ionicons name="chevron-forward" size={16} color={colors.muted} />
                </Pressable>
              ))}
            </View>

            <Pressable style={({ pressed }) => [styles.signOutButton, pressed && styles.pressed]} onPress={signOut}>
              <Text style={styles.signOutText}>Sign out</Text>
            </Pressable>

            <Text style={styles.version}>RideLink v1.0.0</Text>
          </>
        ) : (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Travel together. Go further.</Text>
            <Text style={styles.cardText}>Create an account to post trips, book seats, and manage your rides.</Text>
            <Pressable style={({ pressed }) => [styles.button, pressed && styles.pressed]} onPress={() => navigation.navigate("SignIn")}>
              <Text style={styles.buttonText}>Sign in</Text>
            </Pressable>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.wash },
  content: { paddingBottom: 36 },
  hero: {
    backgroundColor: colors.navy,
    paddingHorizontal: 20,
    paddingBottom: 24,
    borderBottomLeftRadius: radii.xl,
    borderBottomRightRadius: radii.xl,
    borderCurve: "continuous",
    gap: 20,
  },
  heroTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  heroLabel: { color: "rgba(255,255,255,0.6)", fontSize: 12, fontWeight: "900", letterSpacing: 1.6 },
  editButton: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
    borderRadius: radii.sm,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  editButtonText: { color: colors.surface, fontSize: 12, fontWeight: "800" },
  profileRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.success,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.24)",
  },
  avatarText: { color: colors.navy, fontSize: 24, fontWeight: "900" },
  identity: { flex: 1, gap: 2 },
  name: { color: colors.surface, fontSize: 19, fontWeight: "900" },
  email: { color: "rgba(255,255,255,0.72)", fontSize: 13 },
  phone: { color: "rgba(255,255,255,0.72)", fontSize: 13 },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: radii.lg,
    borderCurve: "continuous",
    paddingVertical: 16,
  },
  stat: { flex: 1, alignItems: "center", gap: 4 },
  statValue: { color: colors.surface, fontSize: 17, fontWeight: "900" },
  statLabel: { color: "rgba(255,255,255,0.62)", fontSize: 11, fontWeight: "700" },
  statDivider: { width: 1, height: 28, backgroundColor: "rgba(255,255,255,0.16)" },
  body: { paddingHorizontal: 18, paddingTop: 20, gap: 18 },
  menu: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderCurve: "continuous",
    borderWidth: 1,
    borderColor: colors.line,
    overflow: "hidden",
    ...shadow,
  },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  menuRowLast: { borderBottomWidth: 0 },
  menuRowPressed: { backgroundColor: colors.wash },
  menuIcon: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  menuText: { flex: 1, color: colors.text, fontSize: 15, fontWeight: "700" },
  signOutButton: {
    alignItems: "center",
    paddingVertical: 15,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderCurve: "continuous",
    borderWidth: 1,
    borderColor: colors.line,
  },
  signOutText: { color: colors.danger, fontSize: 15, fontWeight: "800" },
  pressed: { opacity: 0.86, transform: [{ scale: 0.99 }] },
  version: { textAlign: "center", color: colors.muted, fontSize: 12, marginTop: 4 },
  card: { backgroundColor: colors.surface, borderRadius: radii.lg, borderCurve: "continuous", padding: 20, gap: 12, ...shadow },
  cardTitle: { color: colors.ink, fontSize: 22, fontWeight: "800" },
  cardText: { color: colors.muted, fontSize: 14, lineHeight: 21 },
  button: { marginTop: 8, backgroundColor: colors.navy, borderRadius: radii.md, borderCurve: "continuous", paddingVertical: 15, alignItems: "center" },
  buttonText: { color: colors.surface, fontSize: 16, fontWeight: "800" },
});
