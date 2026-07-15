import { useRef, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Text, TextInput } from "../components/Typography";
import BackButton from "../components/BackButton";
import FormBanner from "../components/FormBanner";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useKeyboardAwareScroll } from "../hooks/useKeyboardAwareScroll";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { ProfileStackParamList } from "../navigation/types";
import { useAuth } from "../auth/AuthContext";
import { mapSignUpError } from "../auth/cognitoErrors";
import { colors, radii } from "../theme";

type Props = NativeStackScreenProps<ProfileStackParamList, "SignUp">;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^\+[1-9]\d{7,14}$/;

const PASSWORD_REQUIREMENTS: { key: string; label: string; test: (pw: string) => boolean }[] = [
  { key: "length", label: "At least 8 characters", test: (pw) => pw.length >= 8 },
  { key: "lowercase", label: "One lowercase letter", test: (pw) => /[a-z]/.test(pw) },
  { key: "number", label: "One number", test: (pw) => /[0-9]/.test(pw) },
];

function isPasswordValid(pw: string) {
  return PASSWORD_REQUIREMENTS.every((req) => req.test(pw));
}

export default function SignUpScreen({ navigation }: Props) {
  const { signUp } = useAuth();
  const insets = useSafeAreaInsets();
  const { scrollRef, handleScroll, scrollToInput } = useKeyboardAwareScroll();
  const firstNameRef = useRef<TextInput>(null);
  const lastNameRef = useRef<TextInput>(null);
  const phoneRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [errors, setErrors] = useState<{ firstName?: string; lastName?: string; phoneNumber?: string; email?: string; password?: string; terms?: string }>({});
  const [bannerError, setBannerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [focusedField, setFocusedField] = useState<"firstName" | "lastName" | "phoneNumber" | "email" | "password" | null>(null);

  const handleSignUp = async () => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = phoneNumber.replace(/[^\d+]/g, "");
    const nextErrors: { firstName?: string; lastName?: string; phoneNumber?: string; email?: string; password?: string; terms?: string } = {};

    if (!firstName.trim()) nextErrors.firstName = "Enter your first name";
    if (!lastName.trim()) nextErrors.lastName = "Enter your last name";
    if (!PHONE_REGEX.test(cleanPhone)) nextErrors.phoneNumber = "Include a valid country code, for example +1234567890";
    if (!EMAIL_REGEX.test(cleanEmail)) nextErrors.email = "Enter a valid email address";
    if (!isPasswordValid(password)) nextErrors.password = "Your password doesn't meet all the requirements below";
    if (!acceptedTerms) nextErrors.terms = "Accept the terms to continue";
    setErrors(nextErrors);
    setBannerError(null);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    try {
      await signUp({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phoneNumber: cleanPhone,
        email: cleanEmail,
        password,
      });
      navigation.navigate("ConfirmSignUp", { email: cleanEmail });
    } catch (error) {
      const mapped = mapSignUpError(error);
      if (mapped.kind === "field") {
        setErrors((current) => ({ ...current, [mapped.field]: mapped.message }));
      } else {
        setBannerError(mapped.message);
      }
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
        <View style={styles.logoTile}>
          <View style={styles.brandPin}><View style={styles.brandPinHole} /></View>
          <View style={styles.logoRoad} />
        </View>
        <View style={styles.heroCopy}>
          <Text style={styles.brandName}>RIDELINK</Text>
          <Text style={styles.heroTitle}>Create your account</Text>
          <Text style={styles.heroSubtitle}>Join a trusted community making every journey easier together.</Text>
        </View>
      </View>

      <View style={styles.formArea}>
        <View style={styles.heading}>
          <Text style={styles.formTitle}>Get started</Text>
          <Text style={styles.formSubtitle}>Enter your details, then verify your email address.</Text>
        </View>

        {bannerError ? <FormBanner message={bannerError} /> : null}

        <View style={styles.fields}>
          <View style={styles.field}>
            <Text style={styles.label}>First name</Text>
            <TextInput
              ref={firstNameRef}
              style={[styles.input, focusedField === "firstName" && styles.inputFocused, errors.firstName && styles.inputError]}
              value={firstName}
              onChangeText={(value) => {
                setFirstName(value);
                if (errors.firstName) setErrors((current) => ({ ...current, firstName: undefined }));
              }}
              onFocus={() => {
                setFocusedField("firstName");
                scrollToInput(firstNameRef);
              }}
              onBlur={() => setFocusedField(null)}
              placeholder="First name"
              placeholderTextColor="#8b95a5"
              autoCapitalize="words"
              autoComplete="given-name"
              returnKeyType="next"
              onSubmitEditing={() => lastNameRef.current?.focus()}
            />
            {errors.firstName ? <Text style={styles.errorText} selectable>{errors.firstName}</Text> : null}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Last name</Text>
            <TextInput
              ref={lastNameRef}
              style={[styles.input, focusedField === "lastName" && styles.inputFocused, errors.lastName && styles.inputError]}
              value={lastName}
              onChangeText={(value) => {
                setLastName(value);
                if (errors.lastName) setErrors((current) => ({ ...current, lastName: undefined }));
              }}
              onFocus={() => {
                setFocusedField("lastName");
                scrollToInput(lastNameRef);
              }}
              onBlur={() => setFocusedField(null)}
              placeholder="Last name"
              placeholderTextColor="#8b95a5"
              autoCapitalize="words"
              autoComplete="family-name"
              returnKeyType="next"
              onSubmitEditing={() => phoneRef.current?.focus()}
            />
            {errors.lastName ? <Text style={styles.errorText} selectable>{errors.lastName}</Text> : null}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Phone number</Text>
            <TextInput
              ref={phoneRef}
              style={[styles.input, focusedField === "phoneNumber" && styles.inputFocused, errors.phoneNumber && styles.inputError]}
              value={phoneNumber}
              onChangeText={(value) => {
                setPhoneNumber(value);
                if (errors.phoneNumber) setErrors((current) => ({ ...current, phoneNumber: undefined }));
              }}
              onFocus={() => {
                setFocusedField("phoneNumber");
                scrollToInput(phoneRef);
              }}
              onBlur={() => setFocusedField(null)}
              placeholder="+1234567890"
              placeholderTextColor="#8b95a5"
              autoCapitalize="none"
              autoComplete="tel"
              keyboardType="phone-pad"
              returnKeyType="next"
              onSubmitEditing={() => emailRef.current?.focus()}
            />
            {errors.phoneNumber ? <Text style={styles.errorText} selectable>{errors.phoneNumber}</Text> : null}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Email address</Text>
            <TextInput
              ref={emailRef}
              style={[styles.input, focusedField === "email" && styles.inputFocused, errors.email && styles.inputError]}
              value={email}
              onChangeText={(value) => {
                setEmail(value);
                if (errors.email) setErrors((current) => ({ ...current, email: undefined }));
                if (bannerError) setBannerError(null);
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
                  if (bannerError) setBannerError(null);
                }}
                onFocus={() => {
                  setFocusedField("password");
                  scrollToInput(passwordRef);
                }}
                onBlur={() => setFocusedField(null)}
                placeholder="At least 8 characters"
                placeholderTextColor="#8b95a5"
                autoCapitalize="none"
                autoComplete="new-password"
                secureTextEntry={!showPassword}
                returnKeyType="done"
              />
              <Pressable hitSlop={10} onPress={() => setShowPassword((visible) => !visible)}>
                <Text style={styles.showPassword}>{showPassword ? "Hide" : "Show"}</Text>
              </Pressable>
            </View>
            {errors.password ? <Text style={styles.errorText} selectable>{errors.password}</Text> : null}
            {focusedField === "password" || password.length > 0 ? (
              <View style={styles.requirements}>
                {PASSWORD_REQUIREMENTS.map((requirement) => {
                  const met = requirement.test(password);
                  return (
                    <View key={requirement.key} style={styles.requirementRow}>
                      <View style={[styles.requirementDot, met && styles.requirementDotMet]}>
                        {met ? <Text style={styles.requirementCheck}>{"✓"}</Text> : null}
                      </View>
                      <Text style={[styles.requirementText, met && styles.requirementTextMet]}>{requirement.label}</Text>
                    </View>
                  );
                })}
              </View>
            ) : null}
          </View>
        </View>

        <View style={styles.termsGroup}>
          <Pressable
            style={styles.termsRow}
            onPress={() => {
              setAcceptedTerms((accepted) => !accepted);
              if (errors.terms) setErrors((current) => ({ ...current, terms: undefined }));
            }}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: acceptedTerms }}
          >
            <View style={[styles.checkbox, acceptedTerms && styles.checkboxChecked]}>
              {acceptedTerms ? <Text style={styles.checkmark}>OK</Text> : null}
            </View>
            <Text style={styles.termsText}>I agree to RideLink's Terms and Privacy Policy.</Text>
          </Pressable>
          {errors.terms ? <Text style={styles.errorText} selectable>{errors.terms}</Text> : null}
        </View>

        <Pressable
          style={({ pressed }) => [styles.signUpButton, pressed && styles.pressed, submitting && styles.buttonDisabled]}
          onPress={handleSignUp}
          disabled={submitting}
        >
          {submitting ? <ActivityIndicator color={colors.navy} /> : <Text style={styles.signUpButtonText}>Create account</Text>}
        </Pressable>

        <View style={styles.signInRow}>
          <Text style={styles.signInText}>Already have an account?</Text>
          <Pressable hitSlop={8} onPress={() => navigation.navigate("SignIn")}>
            <Text style={styles.signInLink}>Sign in</Text>
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
  logoTile: { width: 92, height: 92, borderRadius: 24, borderCurve: "continuous", backgroundColor: colors.navy, overflow: "hidden", alignItems: "center", justifyContent: "center", boxShadow: "0 12px 24px rgba(3,28,58,0.16)" },
  brandPin: { width: 40, height: 40, borderRadius: 20, borderBottomRightRadius: 6, backgroundColor: "#65e5c2", transform: [{ rotate: "45deg" }], alignItems: "center", justifyContent: "center", zIndex: 2 },
  brandPinHole: { width: 13, height: 13, borderRadius: 7, backgroundColor: colors.navy },
  logoRoad: { position: "absolute", width: 116, height: 28, borderRadius: 20, left: 12, bottom: -2, backgroundColor: colors.surface, transform: [{ rotate: "-18deg" }] },
  heroCopy: { alignItems: "center", gap: 6 },
  brandName: { color: colors.success, fontSize: 12, fontWeight: "900", letterSpacing: 1.8 },
  heroTitle: { color: colors.ink, fontSize: 29, lineHeight: 35, fontWeight: "900", textAlign: "center" },
  heroSubtitle: { color: colors.muted, fontSize: 14, lineHeight: 21, textAlign: "center", maxWidth: 340 },
  formArea: { flex: 1, backgroundColor: colors.surface, padding: 24, gap: 22 },
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
  requirements: { marginTop: 10, gap: 8 },
  requirementRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  requirementDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  requirementDotMet: { backgroundColor: colors.success, borderColor: colors.success },
  requirementCheck: { color: colors.surface, fontSize: 10, fontWeight: "900", lineHeight: 11 },
  requirementText: { color: colors.muted, fontSize: 12, fontWeight: "600" },
  requirementTextMet: { color: colors.success, fontWeight: "800" },
  inputFocused: { borderColor: colors.navy, backgroundColor: colors.surface, boxShadow: "0 0 0 3px rgba(3,28,58,0.08)" },
  inputError: { borderColor: colors.danger, backgroundColor: "#fff8f8" },
  errorText: { color: colors.danger, fontSize: 12, lineHeight: 16 },
  termsGroup: { gap: 7 },
  termsRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: "#b8c2cf", backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" },
  checkboxChecked: { backgroundColor: colors.success, borderColor: colors.success },
  checkmark: { color: colors.navy, fontSize: 8, fontWeight: "900" },
  termsText: { flex: 1, color: colors.text, fontSize: 13, lineHeight: 19 },
  signUpButton: { height: 56, backgroundColor: colors.success, borderRadius: radii.md, borderCurve: "continuous", alignItems: "center", justifyContent: "center", boxShadow: "0 10px 20px rgba(20,184,122,0.2)" },
  signUpButtonText: { color: colors.navy, fontSize: 16, fontWeight: "900" },
  buttonDisabled: { opacity: 0.6 },
  pressed: { opacity: 0.86, transform: [{ scale: 0.99 }] },
  signInRow: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", alignItems: "center", gap: 5, paddingBottom: 12 },
  signInText: { color: colors.muted, fontSize: 14 },
  signInLink: { color: colors.navy, fontSize: 14, fontWeight: "900" },
});
