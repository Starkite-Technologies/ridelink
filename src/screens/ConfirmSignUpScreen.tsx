import { useRef, useState } from "react";
import { ActivityIndicator, Alert, Image, Pressable, StyleSheet, View } from "react-native";
import { EnvelopeSimple } from "../components/icons";
import { Text, TextInput } from "../components/Typography";
import BackButton from "../components/BackButton";
import { KeyboardSafeScreen } from "../components/keyboard-safe-screen";
import { useKeyboardAwareScroll } from "../hooks/useKeyboardAwareScroll";
import { friendlyAuthError } from "../auth/auth-errors";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { ProfileStackParamList } from "../navigation/types";
import { useAuth } from "../auth/AuthContext";
import { colors } from "../theme";

type Props = NativeStackScreenProps<ProfileStackParamList, "ConfirmSignUp">;

export default function ConfirmSignUpScreen({ route, navigation }: Props) {
  const { confirmSignUp, resendSignUpCode } = useAuth();
  const insets = useSafeAreaInsets();
  const { email, accountType } = route.params;
  const { scrollRef, handleScroll, scrollToInput } = useKeyboardAwareScroll();
  const codeRef = useRef<TextInput>(null);
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [focused, setFocused] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const handleConfirm = async () => {
    if (code.trim().length !== 6) { setError("Enter the complete 6-digit code from your email."); codeRef.current?.focus(); return; }
    setSubmitting(true);
    setError("");
    let sessionStarted = false;
    try {
      const signedIn = await confirmSignUp(email, code.trim());
      sessionStarted = signedIn;
      if (!signedIn) Alert.alert("Email verified", "Your email is verified. Sign in with the password you created.", [{ text: "Continue to sign in", onPress: () => navigation.replace("SignIn") }]);
    }
    catch (caught) { setError(friendlyAuthError(caught, "VERIFY")); }
    // A successful confirmation swaps the entire auth navigator immediately.
    // Avoid updating this unmounted screen during that transition.
    finally { if (!sessionStarted) setSubmitting(false); }
  };

  const accountLabel = accountType ? `${accountType} ACCOUNT` : "RIDELINK ACCOUNT";
  const accountName = accountType === "DRIVER" ? "driver" : accountType === "PASSENGER" ? "passenger" : "RideLink";

  return <KeyboardSafeScreen ref={scrollRef} style={styles.screen} contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 32 }]} onScroll={handleScroll} scrollEventThrottle={16}>
    <BackButton onPress={() => navigation.goBack()} />
    <View style={styles.brandRow}><Image source={require("../../assets/favicon.png")} style={styles.logo} /><Text style={styles.brand}>RideLink</Text></View>
    <View style={styles.iconTile}><EnvelopeSimple size={32} color={colors.success} weight="fill" /></View>
    <View style={styles.heading}><Text style={styles.eyebrow}>{accountLabel}</Text><Text style={styles.title}>Check your email</Text><Text style={styles.subtitle}>We sent a 6-digit verification code to</Text><Text style={styles.email} selectable>{email}</Text></View>
    <View style={styles.formCard}>
      <Text style={styles.label}>Verification code</Text>
      <TextInput ref={codeRef} value={code} onChangeText={(value) => { setCode(value.replace(/\D/g, "").slice(0, 6)); setError(""); setNotice(""); }} onFocus={() => { setFocused(true); scrollToInput(codeRef); }} onBlur={() => setFocused(false)} style={[styles.input, focused && styles.inputFocused, error && styles.inputError]} placeholder="000000" placeholderTextColor="#5e738a" keyboardType="number-pad" textContentType="oneTimeCode" autoComplete="one-time-code" returnKeyType="done" onSubmitEditing={() => void handleConfirm()} autoFocus />
      {error ? <Text style={styles.error} selectable>{error}</Text> : null}
      {notice ? <Text style={styles.notice} selectable>{notice}</Text> : null}
      <Pressable style={({ pressed }) => [styles.button, pressed && styles.pressed, submitting && styles.disabled]} disabled={submitting} onPress={handleConfirm}>{submitting ? <ActivityIndicator color={colors.navy} /> : <Text style={styles.buttonText}>Verify {accountName} account</Text>}</Pressable>
      <Pressable disabled={resending} hitSlop={10} onPress={async () => { setResending(true); setError(""); setNotice(""); try { await resendSignUpCode(email); setNotice("A new verification code was sent. Use the latest code in your inbox."); } catch (caught) { setError(friendlyAuthError(caught, "RESEND")); } finally { setResending(false); } }}><Text style={styles.resend}>{resending ? "Sending a new code…" : "Didn’t receive it? Resend code"}</Text></Pressable>
    </View>
    <Text style={styles.note}>{accountType ? `After verification, RideLink opens only the ${accountName} experience for this login.` : "After verification, sign in to open the experience connected to this account."}</Text>
  </KeyboardSafeScreen>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.navy }, content: { flexGrow: 1, paddingHorizontal: 20, gap: 21 }, brandRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9, marginTop: 9 }, logo: { width: 36, height: 36, borderRadius: 11 }, brand: { color: "#fff", fontSize: 18, fontWeight: "800" }, iconTile: { alignSelf: "center", width: 74, height: 74, borderRadius: 24, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(20,184,122,0.12)", borderWidth: 1, borderColor: "rgba(20,184,122,0.22)", marginTop: 14 }, heading: { alignItems: "center", gap: 6 }, eyebrow: { color: colors.success, fontSize: 9, fontWeight: "800", letterSpacing: 1.1 }, title: { color: "#fff", fontSize: 28, fontWeight: "800", letterSpacing: -0.9, textAlign: "center" }, subtitle: { color: "#8da0b5", fontSize: 11, textAlign: "center" }, email: { color: "#fff", fontSize: 11, fontWeight: "700", textAlign: "center" }, formCard: { padding: 17, gap: 14, borderRadius: 22, backgroundColor: "#0b294b", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" }, label: { color: "#b6c3d0", fontSize: 10, fontWeight: "700" }, input: { height: 59, borderRadius: 16, backgroundColor: "#071f3d", borderWidth: 1.5, borderColor: "rgba(255,255,255,0.1)", color: "#fff", textAlign: "center", fontSize: 22, letterSpacing: 7 }, inputFocused: { borderColor: colors.success }, inputError: { borderColor: colors.danger }, error: { color: "#ffaaaa", fontSize: 10, lineHeight: 15, textAlign: "center" }, notice: { color: "#7be5b8", fontSize: 10, lineHeight: 15, textAlign: "center" }, button: { height: 54, borderRadius: 16, backgroundColor: colors.success, alignItems: "center", justifyContent: "center" }, buttonText: { color: colors.navy, fontSize: 12, fontWeight: "800" }, resend: { color: colors.success, fontSize: 10, fontWeight: "700", textAlign: "center", paddingVertical: 3 }, note: { color: "#6f849a", fontSize: 9, lineHeight: 15, textAlign: "center", paddingHorizontal: 20 }, disabled: { opacity: 0.55 }, pressed: { opacity: 0.82, transform: [{ scale: 0.985 }] },
});
