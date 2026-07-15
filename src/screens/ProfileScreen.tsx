import { Pressable, ScrollView, StyleSheet, Switch, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { EnvelopeSimple, IdentificationCard, Moon, Phone, SignOut, SteeringWheel, Sun, User, UsersThree } from "../components/icons";
import { useAuth } from "../auth/AuthContext";
import { Text } from "../components/Typography";
import type { ProfileStackParamList } from "../navigation/types";
import { colors } from "../theme";
import { useAppTheme } from "../theme-context";

type Props = NativeStackScreenProps<ProfileStackParamList, "ProfileHome">;

export default function ProfileScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { email, firstName, lastName, phoneNumber, isSignedIn, accountType, signOut } = useAuth();
  const { mode, toggleMode } = useAppTheme();
  const previewRole = process.env.EXPO_OS === "web" && __DEV__ && typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("previewRole") : null;
  const isDriver = (previewRole ?? accountType) === "DRIVER";
  const displayName = [firstName, lastName].filter(Boolean).join(" ") || email?.split("@")[0] || (isDriver ? "RideLink driver" : "RideLink passenger");
  return <ScrollView style={styles.screen} contentContainerStyle={[styles.content, { paddingTop: insets.top + 18 }]} contentInsetAdjustmentBehavior="never">
    <Text style={styles.eyebrow}>{isDriver ? "DRIVER ACCOUNT" : "PASSENGER ACCOUNT"}</Text>
    <Text style={styles.title}>Your account</Text>
    <View style={styles.identityCard}>
      <View style={styles.avatar}><Text style={styles.avatarText}>{displayName.charAt(0).toUpperCase()}</Text></View>
      <View style={styles.identityCopy}><Text style={styles.name}>{displayName}</Text><Text style={styles.email} numberOfLines={1}>{email || "Preview account"}</Text></View>
      <View style={styles.roleIcon}>{isDriver ? <SteeringWheel size={22} color={colors.success} weight="fill" /> : <UsersThree size={22} color={colors.success} weight="fill" />}</View>
    </View>

    <View style={styles.roleCard}>
      <View style={styles.roleHeader}><IdentificationCard size={20} color={colors.success} weight="fill" /><Text style={styles.roleTitle}>{isDriver ? "Driver access" : "Passenger access"}</Text></View>
      <Text style={styles.roleBody}>{isDriver ? "This login is dedicated to publishing trips, managing passengers, vehicles, and earnings." : "This login is dedicated to searching routes, booking seats, and keeping your travel tickets."}</Text>
      <View style={styles.lockedBadge}><Text style={styles.lockedText}>ACCOUNT TYPE LOCKED</Text></View>
    </View>

    <Text style={styles.sectionTitle}>Account details</Text>
    <View style={styles.detailsCard}>
      <Detail icon={User} label="Full name" value={displayName} />
      <Detail icon={EnvelopeSimple} label="Email" value={email || "Not available"} />
      <Detail icon={Phone} label="Phone" value={phoneNumber || "Not provided"} last />
    </View>

    <Text style={styles.sectionTitle}>Appearance</Text>
    <View style={styles.themeCard}><View style={styles.themeIcon}>{mode === "dark" ? <Moon size={19} color={colors.success} weight="fill" /> : <Sun size={19} color={colors.warning} weight="fill" />}</View><View style={styles.themeCopy}><Text style={styles.themeTitle}>Blue dark mode</Text><Text style={styles.themeBody}>Turn this off when you want the light interface.</Text></View><Switch accessibilityLabel="Blue dark mode" value={mode === "dark"} onValueChange={() => void toggleMode()} trackColor={{ false: colors.line, true: colors.success }} thumbColor={mode === "dark" ? colors.navy : colors.surface} /></View>

    {isSignedIn ? <Pressable accessibilityRole="button" style={({ pressed }) => [styles.signOutButton, pressed && styles.pressed]} onPress={signOut}><SignOut size={19} color="#ff8f8f" weight="bold" /><Text style={styles.signOutText}>Sign out of RideLink</Text></Pressable> : <Pressable style={styles.signOutButton} onPress={() => navigation.navigate("SignIn")}><Text style={styles.signOutText}>Return to sign in</Text></Pressable>}
    <Text style={styles.version}>RideLink 1.0.0 · {isDriver ? "Driver" : "Passenger"}</Text>
  </ScrollView>;
}

type IconComponent = typeof User;
function Detail({ icon: Icon, label, value, last }: { icon: IconComponent; label: string; value: string; last?: boolean }) {
  return <View style={[styles.detail, last && styles.detailLast]}><View style={styles.detailIcon}><Icon size={17} color={colors.muted} /></View><View style={styles.detailCopy}><Text style={styles.detailLabel}>{label}</Text><Text style={styles.detailValue} numberOfLines={1}>{value}</Text></View></View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.wash }, content: { paddingHorizontal: 19, paddingBottom: 34, gap: 16 }, eyebrow: { color: colors.success, fontSize: 9, fontWeight: "800", letterSpacing: 1.2 }, title: { color: colors.ink, fontSize: 29, fontWeight: "800", letterSpacing: -1 }, identityCard: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16, borderRadius: 22, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line }, avatar: { width: 56, height: 56, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: colors.success }, avatarText: { color: colors.navy, fontSize: 22, fontWeight: "800" }, identityCopy: { flex: 1, gap: 3 }, name: { color: colors.ink, fontSize: 16, fontWeight: "800" }, email: { color: colors.muted, fontSize: 9 }, roleIcon: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: colors.successWash }, roleCard: { gap: 9, padding: 16, borderRadius: 21, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.success }, roleHeader: { flexDirection: "row", alignItems: "center", gap: 8 }, roleTitle: { color: colors.ink, fontSize: 13, fontWeight: "800" }, roleBody: { color: colors.muted, fontSize: 10, lineHeight: 16 }, lockedBadge: { alignSelf: "flex-start", borderRadius: 99, paddingHorizontal: 9, paddingVertical: 6, backgroundColor: colors.successWash }, lockedText: { color: colors.success, fontSize: 7, fontWeight: "800", letterSpacing: 0.7 }, sectionTitle: { color: colors.ink, fontSize: 15, fontWeight: "800", marginTop: 2 }, detailsCard: { borderRadius: 21, paddingHorizontal: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line }, detail: { minHeight: 69, flexDirection: "row", alignItems: "center", gap: 11, borderBottomWidth: 1, borderBottomColor: colors.line }, detailLast: { borderBottomWidth: 0 }, detailIcon: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: colors.wash }, detailCopy: { flex: 1, gap: 3 }, detailLabel: { color: colors.muted, fontSize: 8, fontWeight: "700" }, detailValue: { color: colors.ink, fontSize: 11, fontWeight: "700" }, themeCard: { minHeight: 72, borderRadius: 19, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, padding: 13, flexDirection: "row", alignItems: "center", gap: 11 }, themeIcon: { width: 41, height: 41, borderRadius: 13, backgroundColor: colors.successWash, alignItems: "center", justifyContent: "center" }, themeCopy: { flex: 1, gap: 3 }, themeTitle: { color: colors.ink, fontSize: 11, fontWeight: "800" }, themeBody: { color: colors.muted, fontSize: 8, lineHeight: 12 }, signOutButton: { minHeight: 52, borderRadius: 17, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9, backgroundColor: colors.dangerWash, borderWidth: 1, borderColor: "rgba(255,143,143,0.2)" }, signOutText: { color: "#ff8f8f", fontSize: 11, fontWeight: "800" }, version: { color: colors.muted, fontSize: 8, textAlign: "center" }, pressed: { opacity: 0.82, transform: [{ scale: 0.985 }] },
});
