import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Text } from "../components/Typography";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { ProfileStackParamList } from "../navigation/types";
import { useAuth } from "../auth/AuthContext";
import { colors, radii, shadow } from "../theme";

type Props = NativeStackScreenProps<ProfileStackParamList, "ProfileHome">;

const MENU = ["My trips", "My bookings", "Payment methods", "Settings", "Help & support"];

export default function ProfileScreen({ navigation }: Props) {
  const { email, firstName, lastName, phoneNumber, isSignedIn, signOut } = useAuth();
  const displayName = [firstName, lastName].filter(Boolean).join(" ") || email?.split("@")[0] || "RideLink member";

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} contentInsetAdjustmentBehavior="automatic">
      <View style={styles.header}>
        <Text style={styles.title}>Profile</Text>
        <View style={styles.profileRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{displayName.charAt(0).toUpperCase()}</Text>
          </View>
          <View>
            <Text style={styles.name}>{displayName}</Text>
            <Text style={styles.email}>{isSignedIn ? email : "Sign in to continue"}</Text>
            {phoneNumber ? <Text style={styles.phone}>{phoneNumber}</Text> : null}
          </View>
        </View>
      </View>

      {isSignedIn ? (
        <>
          <View style={styles.menu}>
            {MENU.map((item) => (
              <View key={item} style={styles.menuRow}>
                <Text style={styles.menuText}>{item}</Text>
                <Text style={styles.chevron}>{">"}</Text>
              </View>
            ))}
          </View>
          <Pressable style={styles.signOutButton} onPress={signOut}>
            <Text style={styles.signOutText}>Sign out</Text>
          </Pressable>
        </>
      ) : (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Travel together. Go further.</Text>
          <Text style={styles.cardText}>Create an account to post trips, book seats, and manage your rides.</Text>
          <Pressable style={styles.button} onPress={() => navigation.navigate("SignIn")}>
            <Text style={styles.buttonText}>Sign In</Text>
          </Pressable>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.wash },
  content: { padding: 18, gap: 18, paddingBottom: 36 },
  header: { backgroundColor: colors.surface, borderRadius: radii.lg, padding: 18, gap: 20, ...shadow },
  title: { color: colors.ink, fontSize: 24, fontWeight: "800" },
  profileRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  avatar: { width: 62, height: 62, borderRadius: 31, backgroundColor: colors.navy, alignItems: "center", justifyContent: "center" },
  avatarText: { color: colors.surface, fontSize: 23, fontWeight: "800" },
  name: { color: colors.ink, fontSize: 17, fontWeight: "800" },
  email: { color: colors.muted, fontSize: 13, marginTop: 2 },
  phone: { color: colors.muted, fontSize: 13, marginTop: 2 },
  menu: { backgroundColor: colors.surface, borderRadius: radii.lg, overflow: "hidden", borderWidth: 1, borderColor: colors.line },
  menuRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  menuText: { color: colors.text, fontSize: 15, fontWeight: "700" },
  chevron: { color: colors.muted, fontSize: 16, fontWeight: "800" },
  signOutButton: { alignItems: "center", padding: 14 },
  signOutText: { color: colors.danger, fontSize: 15, fontWeight: "800" },
  card: { backgroundColor: colors.surface, borderRadius: radii.lg, padding: 20, gap: 12, ...shadow },
  cardTitle: { color: colors.ink, fontSize: 22, fontWeight: "800" },
  cardText: { color: colors.muted, fontSize: 14, lineHeight: 21 },
  button: { marginTop: 8, backgroundColor: colors.navy, borderRadius: radii.md, paddingVertical: 15, alignItems: "center" },
  buttonText: { color: colors.surface, fontSize: 16, fontWeight: "800" },
});
