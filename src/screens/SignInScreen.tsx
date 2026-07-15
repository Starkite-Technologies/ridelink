import { useRef, useState } from "react";
import { ActivityIndicator, Image, Pressable, StyleSheet, View } from "react-native";
import { Envelope, Eye, EyeSlash, LockKey } from "../components/icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../auth/AuthContext";
import BackButton from "../components/BackButton";
import { Text, TextInput } from "../components/Typography";
import { KeyboardSafeScreen } from "../components/keyboard-safe-screen";
import { useKeyboardAwareScroll } from "../hooks/useKeyboardAwareScroll";
import { friendlyAuthError } from "../auth/auth-errors";
import type { ProfileStackParamList } from "../navigation/types";
import { colors, radii } from "../theme";

type Props = NativeStackScreenProps<ProfileStackParamList, "SignIn">;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const allowLoadingStateToPaint = () => new Promise<void>((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0)));

export default function SignInScreen({ navigation }: Props) {
  const { signIn } = useAuth();
  const insets = useSafeAreaInsets();
  const { scrollRef, handleScroll, scrollToInput } = useKeyboardAwareScroll();
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; form?: string }>({});
  const [submitting, setSubmitting] = useState(false);
  const [focused, setFocused] = useState<"email" | "password" | null>(null);
  const [unconfirmedEmail, setUnconfirmedEmail] = useState("");

  const handleSignIn = async () => {
    const cleanEmail = email.trim().toLowerCase();
    const nextErrors: typeof errors = {};
    if (!EMAIL_REGEX.test(cleanEmail)) nextErrors.email = "Enter a valid email address";
    if (!password) nextErrors.password = "Enter your password";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      (nextErrors.email ? emailRef : passwordRef).current?.focus();
      return;
    }
    setSubmitting(true);
    setUnconfirmedEmail("");
    await allowLoadingStateToPaint();
    try { await signIn(cleanEmail, password); }
    catch (error) {
      const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";
      setUnconfirmedEmail(code === "UserNotConfirmedException" ? cleanEmail : "");
      setErrors({ form: friendlyAuthError(error, "SIGN_IN") });
    }
    finally { setSubmitting(false); }
  };

  return (
    <KeyboardSafeScreen ref={scrollRef} style={styles.screen} contentContainerStyle={[styles.content, { paddingTop: insets.top + 18, paddingBottom: insets.bottom + 24 }]} onScroll={handleScroll} scrollEventThrottle={16}>
      <BackButton onPress={() => navigation.navigate("Welcome")} topOffset={insets.top + 16} />
      <View style={styles.brandRow}><Image source={require("../../assets/favicon.png")} style={styles.logo} /><Text style={styles.wordmark}>RideLink</Text></View>
      <View style={styles.heading}><Text style={styles.eyebrow}>WELCOME BACK</Text><Text style={styles.title}>Sign in to your account.</Text><Text style={styles.subtitle}>RideLink opens the Passenger or Driver experience connected to this email.</Text></View>
      <View style={styles.formCard}>
        <View style={styles.field}><Text style={styles.label}>Email address</Text><View style={[styles.inputShell, focused === "email" && styles.inputFocused, errors.email && styles.inputError]}><Envelope size={20} color={colors.muted} weight="bold" /><TextInput ref={emailRef} style={styles.input} value={email} onChangeText={(value) => { setEmail(value); setUnconfirmedEmail(""); setErrors((current) => ({ ...current, email: undefined, form: undefined })); }} onFocus={() => { setFocused("email"); scrollToInput(emailRef); }} onBlur={() => setFocused(null)} placeholder="you@example.com" placeholderTextColor="#73839a" autoCapitalize="none" autoCorrect={false} spellCheck={false} autoComplete="email" textContentType="emailAddress" keyboardType="email-address" returnKeyType="next" onSubmitEditing={() => passwordRef.current?.focus()} /></View>{errors.email ? <Text style={styles.errorText} selectable>{errors.email}</Text> : null}</View>
        <View style={styles.field}><View style={styles.passwordLabelRow}><Text style={styles.label}>Password</Text><Pressable hitSlop={8} onPress={() => navigation.navigate("ForgotPassword")}><Text style={styles.forgotLink}>Forgot password?</Text></Pressable></View><View style={[styles.inputShell, focused === "password" && styles.inputFocused, errors.password && styles.inputError]}><LockKey size={20} color={colors.muted} weight="bold" /><TextInput ref={passwordRef} style={styles.input} value={password} onChangeText={(value) => { setPassword(value); setUnconfirmedEmail(""); setErrors((current) => ({ ...current, password: undefined, form: undefined })); }} onFocus={() => { setFocused("password"); scrollToInput(passwordRef); }} onBlur={() => setFocused(null)} placeholder="Enter your password" placeholderTextColor="#73839a" autoCapitalize="none" autoCorrect={false} autoComplete="current-password" textContentType="password" secureTextEntry={!showPassword} returnKeyType="done" onSubmitEditing={() => void handleSignIn()} /><Pressable accessibilityRole="button" accessibilityLabel={showPassword ? "Hide password" : "Show password"} hitSlop={10} onPress={() => setShowPassword((visible) => !visible)}>{showPassword ? <EyeSlash size={20} color={colors.muted} /> : <Eye size={20} color={colors.muted} />}</Pressable></View>{errors.password ? <Text style={styles.errorText} selectable>{errors.password}</Text> : null}</View>
        {errors.form ? <View style={styles.formError}><Text style={styles.formErrorText} selectable>{errors.form}</Text>{unconfirmedEmail ? <Pressable hitSlop={8} onPress={() => navigation.navigate("ConfirmSignUp", { email: unconfirmedEmail })}><Text style={styles.verifyLink}>Enter or resend verification code</Text></Pressable> : null}</View> : null}
        <Pressable accessibilityRole="button" accessibilityState={{ busy: submitting, disabled: submitting }} disabled={submitting} style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed, submitting && styles.disabled]} onPress={() => void handleSignIn()}>{submitting ? <View style={styles.loadingRow}><ActivityIndicator color={colors.navy} /><Text style={styles.primaryButtonText}>Signing in…</Text></View> : <Text style={styles.primaryButtonText}>Sign in</Text>}</Pressable>
      </View>
      <View style={styles.footerRow}><Text style={styles.footerText}>New to RideLink?</Text><Pressable onPress={() => navigation.navigate("Welcome")}><Text style={styles.footerLink}>Choose an account type</Text></Pressable></View>
    </KeyboardSafeScreen>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.navy }, content: { flexGrow: 1, paddingHorizontal: 22, gap: 28 },
  brandRow: { paddingTop: 58, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9 }, logo: { width: 38, height: 38, borderRadius: 12 }, wordmark: { color: colors.surface, fontSize: 19, fontWeight: "900" },
  heading: { gap: 10 }, eyebrow: { color: colors.success, fontSize: 9, fontWeight: "900", letterSpacing: 1.4 }, title: { color: colors.surface, fontSize: 34, lineHeight: 40, fontWeight: "900", letterSpacing: -1 }, subtitle: { color: "rgba(255,255,255,.58)", fontSize: 12, lineHeight: 19 },
  formCard: { padding: 18, gap: 18, borderRadius: radii.xl, borderCurve: "continuous", borderWidth: 1, borderColor: "rgba(255,255,255,.1)", backgroundColor: colors.navySoft, boxShadow: "0 18px 38px rgba(0,0,0,.2)" }, field: { gap: 7 }, passwordLabelRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, label: { color: "rgba(255,255,255,.82)", fontSize: 11, fontWeight: "800" }, forgotLink: { color: colors.success, fontSize: 9, fontWeight: "800" }, inputShell: { height: 56, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, borderRadius: radii.md, borderCurve: "continuous", borderWidth: 1, borderColor: "rgba(255,255,255,.1)", backgroundColor: "rgba(255,255,255,.045)" }, input: { flex: 1, height: "100%", color: colors.surface, fontSize: 14 }, inputFocused: { borderColor: colors.success, boxShadow: "0 0 0 3px rgba(20,184,122,.12)" }, inputError: { borderColor: colors.danger }, errorText: { color: "#ff9b9b", fontSize: 10 },
  formError: { padding: 12, borderRadius: radii.md, backgroundColor: "rgba(213,52,52,.13)", borderWidth: 1, borderColor: "rgba(255,110,110,.24)", gap: 8 }, formErrorText: { color: "#ffb4b4", fontSize: 11, lineHeight: 17 }, verifyLink: { color: colors.success, fontSize: 10, fontWeight: "800" }, primaryButton: { height: 55, borderRadius: radii.md, borderCurve: "continuous", alignItems: "center", justifyContent: "center", backgroundColor: colors.success }, loadingRow: { flexDirection: "row", alignItems: "center", gap: 9 }, primaryButtonText: { color: colors.navy, fontSize: 14, fontWeight: "900" }, footerRow: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 5 }, footerText: { color: "rgba(255,255,255,.5)", fontSize: 12 }, footerLink: { color: colors.success, fontSize: 12, fontWeight: "900" }, disabled: { opacity: .7 }, pressed: { opacity: .86, transform: [{ scale: .99 }] },
});
