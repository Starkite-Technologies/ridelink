import { useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { Text, TextInput } from "../components/Typography";
import BackButton from "../components/BackButton";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useKeyboardAwareScroll } from "../hooks/useKeyboardAwareScroll";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { ProfileStackParamList } from "../navigation/types";
import { useAuth } from "../auth/AuthContext";
import { colors, radii } from "../theme";

type Props = NativeStackScreenProps<ProfileStackParamList, "SignIn">;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function SignInScreen({ navigation }: Props) {
  const { signIn } = useAuth();
  const insets = useSafeAreaInsets();
  const { scrollRef, handleScroll, scrollToInput } = useKeyboardAwareScroll();
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [submitting, setSubmitting] = useState(false);
  const [focusedField, setFocusedField] = useState<"email" | "password" | null>(null);

  const handleSignIn = async () => {
    const cleanEmail = email.trim().toLowerCase();
    const nextErrors: { email?: string; password?: string } = {};

    if (!EMAIL_REGEX.test(cleanEmail)) nextErrors.email = "Enter a valid email address";
    if (!password) nextErrors.password = "Enter your password";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    try {
      await signIn(cleanEmail, password);
    } catch (error) {
      Alert.alert("Unable to sign in", error instanceof Error ? error.message : "Check your details and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView
      ref={scrollRef}
      style={styles.screen}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      onScroll={handleScroll}
      scrollEventThrottle={16}
    >
      <View style={styles.hero}>
        <BackButton onPress={() => navigation.navigate("Welcome")} topOffset={insets.top + 16} />
        <View style={styles.heroBrand}>
          <View style={styles.logoTile}>
            <View style={styles.brandPin}><View style={styles.brandPinHole} /></View>
            <View style={styles.logoRoad} />
          </View>
        </View>
        <View style={styles.heroCopy}>
          <Text style={styles.brandName}>RIDELINK</Text>
          <Text style={styles.heroTitle}>Welcome back</Text>
          <Text style={styles.heroSubtitle}>Your next ride is closer than you think.</Text>
        </View>
      </View>

      <View style={styles.formArea}>
        <View style={styles.heading}>
          <Text style={styles.formTitle}>Sign in</Text>
          <Text style={styles.formSubtitle}>Use the email connected to your RideLink account.</Text>
        </View>

        <View style={styles.fields}>
          <View style={styles.field}>
            <Text style={styles.label}>Email address</Text>
            <TextInput
              ref={emailRef}
              style={[styles.input, focusedField === "email" && styles.inputFocused, errors.email && styles.inputError]}
              value={email}
              onChangeText={(value) => {
                setEmail(value);
                if (errors.email) setErrors((current) => ({ ...current, email: undefined }));
              }}
              onFocus={() => {
                setFocusedField("email");
                scrollToInput(emailRef);
              }}
              onBlur={() => setFocusedField(null)}
              placeholder="you@example.com"
              placeholderTextColor="#8b95a5"
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
            />
            {errors.email ? <Text style={styles.errorText} selectable>{errors.email}</Text> : null}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Password</Text>
            <View style={[styles.passwordInput, focusedField === "password" && styles.inputFocused, errors.password && styles.inputError]}>
              <TextInput
                ref={passwordRef}
                style={styles.passwordTextInput}
                value={password}
                onChangeText={(value) => {
                  setPassword(value);
                  if (errors.password) setErrors((current) => ({ ...current, password: undefined }));
                }}
                onFocus={() => {
                  setFocusedField("password");
                  scrollToInput(passwordRef);
                }}
                onBlur={() => setFocusedField(null)}
                placeholder="Enter your password"
                placeholderTextColor="#8b95a5"
                autoCapitalize="none"
                autoComplete="current-password"
                secureTextEntry={!showPassword}
                returnKeyType="done"
                onSubmitEditing={handleSignIn}
              />
              <Pressable hitSlop={10} onPress={() => setShowPassword((visible) => !visible)}>
                <Text style={styles.showPassword}>{showPassword ? "Hide" : "Show"}</Text>
              </Pressable>
            </View>
            {errors.password ? <Text style={styles.errorText} selectable>{errors.password}</Text> : null}
          </View>
        </View>

        <Pressable
          style={({ pressed }) => [styles.signInButton, pressed && styles.pressed, submitting && styles.buttonDisabled]}
          onPress={handleSignIn}
          disabled={submitting}
        >
          {submitting ? <ActivityIndicator color={colors.navy} /> : <Text style={styles.signInButtonText}>Sign in</Text>}
        </Pressable>

        <View style={styles.createAccountRow}>
          <Text style={styles.createAccountText}>New to RideLink?</Text>
          <Pressable hitSlop={8} onPress={() => navigation.navigate("SignUp")}>
            <Text style={styles.createAccountLink}>Create an account</Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.wash },
  content: { flexGrow: 1 },
  hero: { minHeight: 250, backgroundColor: colors.heroTint, alignItems: "center", justifyContent: "center", paddingHorizontal: 24, paddingVertical: 30, gap: 16 },
  heroBrand: { alignItems: "center", justifyContent: "center" },
  logoTile: { width: 92, height: 92, borderRadius: 24, borderCurve: "continuous", backgroundColor: colors.navy, overflow: "hidden", alignItems: "center", justifyContent: "center", boxShadow: "0 12px 24px rgba(3,28,58,0.16)" },
  brandPin: { width: 40, height: 40, borderRadius: 20, borderBottomRightRadius: 6, backgroundColor: "#65e5c2", transform: [{ rotate: "45deg" }], alignItems: "center", justifyContent: "center", zIndex: 2 },
  brandPinHole: { width: 13, height: 13, borderRadius: 7, backgroundColor: colors.navy },
  logoRoad: { position: "absolute", width: 116, height: 28, borderRadius: 20, left: 12, bottom: -2, backgroundColor: colors.surface, transform: [{ rotate: "-18deg" }] },
  brandName: { color: colors.success, fontSize: 12, fontWeight: "900", letterSpacing: 1.8 },
  heroCopy: { alignItems: "center", gap: 6 },
  heroTitle: { color: colors.ink, fontSize: 30, lineHeight: 36, fontWeight: "900", textAlign: "center" },
  heroSubtitle: { color: colors.muted, fontSize: 14, lineHeight: 21, textAlign: "center" },
  formArea: { flex: 1, backgroundColor: colors.surface, padding: 24, gap: 24 },
  heading: { gap: 7 },
  formTitle: { color: colors.ink, fontSize: 25, lineHeight: 31, fontWeight: "900" },
  formSubtitle: { color: colors.muted, fontSize: 14, lineHeight: 21 },
  fields: { gap: 18 },
  field: { gap: 7 },
  label: { color: colors.text, fontSize: 13, fontWeight: "800" },
  input: { height: 54, backgroundColor: colors.wash, borderWidth: 1.5, borderColor: colors.line, borderRadius: radii.md, borderCurve: "continuous", paddingHorizontal: 16, color: colors.ink, fontSize: 16 },
  passwordInput: { height: 54, backgroundColor: colors.wash, borderWidth: 1.5, borderColor: colors.line, borderRadius: radii.md, borderCurve: "continuous", paddingLeft: 16, paddingRight: 14, flexDirection: "row", alignItems: "center", gap: 10 },
  passwordTextInput: { flex: 1, height: "100%", color: colors.ink, fontSize: 16 },
  showPassword: { color: colors.navy, fontSize: 13, fontWeight: "800" },
  inputFocused: { borderColor: colors.navy, backgroundColor: colors.surface, boxShadow: "0 0 0 3px rgba(3,28,58,0.08)" },
  inputError: { borderColor: colors.danger, backgroundColor: "#fff8f8" },
  errorText: { color: colors.danger, fontSize: 12, lineHeight: 16 },
  signInButton: { height: 56, backgroundColor: colors.success, borderRadius: radii.md, borderCurve: "continuous", alignItems: "center", justifyContent: "center", boxShadow: "0 10px 20px rgba(20,184,122,0.2)" },
  signInButtonText: { color: colors.navy, fontSize: 16, fontWeight: "900" },
  buttonDisabled: { opacity: 0.6 },
  pressed: { opacity: 0.86, transform: [{ scale: 0.99 }] },
  createAccountRow: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", alignItems: "center", gap: 5, paddingBottom: 12 },
  createAccountText: { color: colors.muted, fontSize: 14 },
  createAccountLink: { color: colors.navy, fontSize: 14, fontWeight: "900" },
});
