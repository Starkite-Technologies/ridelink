import { useRef, useState } from "react";
import { ActivityIndicator, Image, Pressable, StyleSheet, View } from "react-native";
import { EnvelopeSimple, Eye, EyeSlash, Key } from "../components/icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../auth/AuthContext";
import BackButton from "../components/BackButton";
import { Text, TextInput } from "../components/Typography";
import { KeyboardSafeScreen } from "../components/keyboard-safe-screen";
import { useKeyboardAwareScroll } from "../hooks/useKeyboardAwareScroll";
import { friendlyAuthError } from "../auth/auth-errors";
import type { ProfileStackParamList } from "../navigation/types";
import { colors } from "../theme";

type Props = NativeStackScreenProps<ProfileStackParamList, "ForgotPassword">;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ForgotPasswordScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { requestPasswordReset, confirmPasswordReset } = useAuth();
  const { scrollRef, handleScroll, scrollToInput } = useKeyboardAwareScroll();
  const emailRef = useRef<TextInput>(null); const codeRef = useRef<TextInput>(null); const passwordRef = useRef<TextInput>(null);
  const [stage, setStage] = useState<"EMAIL" | "CODE">("EMAIL");
  const [email, setEmail] = useState(""); const [code, setCode] = useState(""); const [password, setPassword] = useState("");
  const [error, setError] = useState(""); const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const submit = async () => {
    const cleanEmail = email.trim().toLowerCase();
    if (!EMAIL_REGEX.test(cleanEmail)) { setError("Enter the email used for your RideLink account."); emailRef.current?.focus(); return; }
    if (stage === "CODE" && code.trim().length !== 6) { setError("Enter the complete 6-digit verification code."); codeRef.current?.focus(); return; }
    if (stage === "CODE" && (password.length < 8 || !/[a-z]/.test(password) || !/[0-9]/.test(password))) { setError("Use at least 8 characters with a lowercase letter and a number."); passwordRef.current?.focus(); return; }
    setSubmitting(true); setError("");
    try {
      if (stage === "EMAIL") { await requestPasswordReset(cleanEmail); setStage("CODE"); }
      else { await confirmPasswordReset(cleanEmail, code.trim(), password); navigation.replace("SignIn"); }
    } catch (caught) { setError(friendlyAuthError(caught, stage === "EMAIL" ? "RESET_REQUEST" : "RESET_CONFIRM")); }
    finally { setSubmitting(false); }
  };
  return <KeyboardSafeScreen ref={scrollRef} style={styles.screen} contentContainerStyle={[styles.content, { paddingTop: insets.top + 18, paddingBottom: insets.bottom + 32 }]} onScroll={handleScroll} scrollEventThrottle={16}>
    <BackButton onPress={() => navigation.goBack()} />
    <View style={styles.brand}><Image source={require("../../assets/favicon.png")} style={styles.logo} /><Text style={styles.wordmark}>RideLink</Text></View>
    <View style={styles.icon}>{stage === "EMAIL" ? <EnvelopeSimple size={30} color={colors.success} weight="fill" /> : <Key size={30} color={colors.success} weight="fill" />}</View>
    <View style={styles.heading}><Text style={styles.eyebrow}>SECURE ACCOUNT RECOVERY</Text><Text style={styles.title}>{stage === "EMAIL" ? "Reset your password" : "Create a new password"}</Text><Text style={styles.subtitle}>{stage === "EMAIL" ? "We'll email a verification code to the address on your account." : `Enter the code sent to ${email.trim().toLowerCase()}.`}</Text></View>
    <View style={styles.card}>
      <Text style={styles.label}>Email address</Text><TextInput ref={emailRef} editable={stage === "EMAIL"} style={[styles.input, stage === "CODE" && styles.inputDisabled]} value={email} onChangeText={(value) => { setEmail(value); setError(""); }} onFocus={() => scrollToInput(emailRef)} autoCapitalize="none" autoCorrect={false} spellCheck={false} autoComplete="email" textContentType="emailAddress" keyboardType="email-address" returnKeyType={stage === "EMAIL" ? "go" : "next"} onSubmitEditing={() => stage === "EMAIL" ? void submit() : codeRef.current?.focus()} placeholder="you@example.com" placeholderTextColor="#61768e" />
      {stage === "CODE" ? <><Text style={styles.label}>Verification code</Text><TextInput ref={codeRef} style={styles.input} value={code} onChangeText={(value) => { setCode(value.replace(/\D/g, "").slice(0, 6)); setError(""); }} onFocus={() => scrollToInput(codeRef)} keyboardType="number-pad" autoComplete="one-time-code" textContentType="oneTimeCode" returnKeyType="next" onSubmitEditing={() => passwordRef.current?.focus()} placeholder="000000" placeholderTextColor="#61768e" /><Text style={styles.label}>New password</Text><View style={styles.passwordShell}><TextInput ref={passwordRef} style={styles.passwordInput} value={password} onChangeText={(value) => { setPassword(value); setError(""); }} onFocus={() => scrollToInput(passwordRef)} secureTextEntry={!showPassword} autoCorrect={false} autoComplete="new-password" textContentType="newPassword" returnKeyType="done" onSubmitEditing={() => void submit()} placeholder="At least 8 characters" placeholderTextColor="#61768e" /><Pressable accessibilityRole="button" accessibilityLabel={showPassword ? "Hide password" : "Show password"} hitSlop={10} onPress={() => setShowPassword((visible) => !visible)}>{showPassword ? <EyeSlash size={20} color="#8da0b5" /> : <Eye size={20} color="#8da0b5" />}</Pressable></View><Text style={styles.passwordHint}>At least 8 characters, one lowercase letter, and one number.</Text></> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Pressable disabled={submitting} style={({ pressed }) => [styles.button, pressed && styles.pressed, submitting && styles.disabled]} onPress={() => void submit()}>{submitting ? <ActivityIndicator color={colors.navy} /> : <Text style={styles.buttonText}>{stage === "EMAIL" ? "Send verification code" : "Update password"}</Text>}</Pressable>
      {stage === "CODE" ? <Pressable hitSlop={8} onPress={() => setStage("EMAIL")}><Text style={styles.link}>Use a different email</Text></Pressable> : null}
    </View>
  </KeyboardSafeScreen>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.navy }, content: { flexGrow: 1, paddingHorizontal: 21, gap: 20 }, brand: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 9, marginTop: 52 }, logo: { width: 37, height: 37, borderRadius: 11 }, wordmark: { color: "#fff", fontSize: 18, fontWeight: "800" }, icon: { alignSelf: "center", width: 69, height: 69, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(20,184,122,0.12)", borderWidth: 1, borderColor: "rgba(20,184,122,0.22)" }, heading: { alignItems: "center", gap: 8 }, eyebrow: { color: colors.success, fontSize: 8, fontWeight: "800", letterSpacing: 1.1 }, title: { color: "#fff", fontSize: 27, fontWeight: "800", letterSpacing: -0.8, textAlign: "center" }, subtitle: { color: "#8da0b5", fontSize: 10, lineHeight: 16, textAlign: "center" }, card: { padding: 17, gap: 11, borderRadius: 22, backgroundColor: "#0b294b", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" }, label: { color: "#b6c3d0", fontSize: 10, fontWeight: "700", marginTop: 3 }, input: { height: 54, borderRadius: 15, paddingHorizontal: 14, color: "#fff", backgroundColor: "#071f3d", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" }, inputDisabled: { color: "#8da0b5", opacity: 0.72 }, passwordShell: { height: 54, borderRadius: 15, paddingLeft: 14, paddingRight: 13, flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#071f3d", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" }, passwordInput: { flex: 1, height: "100%", color: "#fff" }, passwordHint: { color: "#70859c", fontSize: 8, lineHeight: 13 }, error: { color: "#ff9b9b", fontSize: 9, lineHeight: 14 }, button: { height: 53, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: colors.success, marginTop: 5 }, buttonText: { color: colors.navy, fontSize: 11, fontWeight: "800" }, link: { color: colors.success, textAlign: "center", fontSize: 9, fontWeight: "700", paddingVertical: 4 }, disabled: { opacity: 0.55 }, pressed: { opacity: 0.82, transform: [{ scale: 0.985 }] },
});
