import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Image, Pressable, StyleSheet, View } from "react-native";
import { Text, TextInput } from "../components/Typography";
import BackButton from "../components/BackButton";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useKeyboardAwareScroll } from "../hooks/useKeyboardAwareScroll";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { ProfileStackParamList } from "../navigation/types";
import { useAuth } from "../auth/AuthContext";
import type { AccountType } from "../auth/AuthContext";
import { Car, Check, Eye, EyeSlash, User } from "../components/icons";
import { KeyboardSafeScreen } from "../components/keyboard-safe-screen";
import { friendlyAuthError } from "../auth/auth-errors";
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

type FormErrors = { firstName?: string; lastName?: string; phoneNumber?: string; email?: string; password?: string; terms?: string; form?: string };

export default function SignUpScreen({ navigation, route }: Props) {
  const { signUp } = useAuth();
  const insets = useSafeAreaInsets();
  const { scrollRef, handleScroll, scrollToInput, scrollToEnd } = useKeyboardAwareScroll();
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
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [focusedField, setFocusedField] = useState<"firstName" | "lastName" | "phoneNumber" | "email" | "password" | null>(null);
  const [accountType, setAccountType] = useState<AccountType>(route.params?.accountType ?? "PASSENGER");
  const pendingInvalidField = useRef<"firstName" | "lastName" | "phoneNumber" | "email" | "password" | "terms" | null>(null);
  const [validationAttempt, setValidationAttempt] = useState(0);

  useEffect(() => {
    if (validationAttempt === 0) return;
    const invalidField = pendingInvalidField.current;
    const invalidRef = invalidField === "firstName" ? firstNameRef : invalidField === "lastName" ? lastNameRef : invalidField === "phoneNumber" ? phoneRef : invalidField === "email" ? emailRef : invalidField === "password" ? passwordRef : null;
    const focusTimer = setTimeout(() => {
      if (invalidRef) {
        invalidRef.current?.focus();
        scrollToInput(invalidRef);
      } else {
        scrollToEnd();
      }
    }, 80);
    return () => clearTimeout(focusTimer);
  }, [validationAttempt, scrollToEnd, scrollToInput]);

  const handleSignUp = async () => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = phoneNumber.replace(/[^\d+]/g, "");
    const nextErrors: FormErrors = {};

    if (!firstName.trim()) nextErrors.firstName = "Enter your first name";
    if (!lastName.trim()) nextErrors.lastName = "Enter your last name";
    if (!PHONE_REGEX.test(cleanPhone)) nextErrors.phoneNumber = "Include a valid country code, for example +1234567890";
    if (!EMAIL_REGEX.test(cleanEmail)) nextErrors.email = "Enter a valid email address";
    if (!isPasswordValid(password)) nextErrors.password = "Your password doesn't meet all the requirements below";
    if (!acceptedTerms) nextErrors.terms = "Accept the terms to continue";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      pendingInvalidField.current = nextErrors.firstName ? "firstName" : nextErrors.lastName ? "lastName" : nextErrors.phoneNumber ? "phoneNumber" : nextErrors.email ? "email" : nextErrors.password ? "password" : "terms";
      setValidationAttempt((attempt) => attempt + 1);
      return;
    }

    setSubmitting(true);
    try {
      await signUp({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phoneNumber: cleanPhone,
        email: cleanEmail,
        password,
        accountType,
      });
      navigation.navigate("ConfirmSignUp", { email: cleanEmail, accountType });
    } catch (error) {
      setErrors((current) => ({ ...current, form: friendlyAuthError(error, "SIGN_UP") }));
      scrollToEnd();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardSafeScreen
      ref={scrollRef}
      style={styles.screen}
      contentContainerStyle={styles.content}
      onScroll={handleScroll}
      scrollEventThrottle={16}
    >
      <View style={styles.hero}>
        <BackButton onPress={() => navigation.navigate("Welcome")} topOffset={insets.top + 16} />
        <View style={styles.logoRow}><Image source={require("../../assets/favicon.png")} style={styles.logoTile} /><Text style={styles.wordmark}>RideLink</Text></View>
        <View style={styles.heroCopy}>
          <Text style={styles.brandName}>RIDELINK</Text>
          <Text style={styles.heroTitle}>Create your account</Text>
          <Text style={styles.heroSubtitle}>Join a trusted community making every journey easier together.</Text>
        </View>
      </View>

      <View style={styles.formArea}>
        <View style={styles.heading}>
          <Text style={styles.formTitle}>Get started</Text>
          <Text style={styles.formSubtitle}>Choose one account type. It cannot be switched after registration.</Text>
        </View>

        <View style={styles.roleSelector}>
          <RoleOption accountType="PASSENGER" selected={accountType === "PASSENGER"} onPress={() => setAccountType("PASSENGER")} />
          <RoleOption accountType="DRIVER" selected={accountType === "DRIVER"} onPress={() => setAccountType("DRIVER")} />
        </View>

        <View style={styles.fields}>
          <View style={styles.field}>
            <Text style={styles.label}>First name</Text>
            <TextInput
              ref={firstNameRef}
              style={[styles.input, focusedField === "firstName" && styles.inputFocused, errors.firstName && styles.inputError]}
              value={firstName}
              onChangeText={(value) => {
                setFirstName(value);
                if (errors.firstName || errors.form) setErrors((current) => ({ ...current, firstName: undefined, form: undefined }));
              }}
              onFocus={() => {
                setFocusedField("firstName");
                scrollToInput(firstNameRef);
              }}
              onBlur={() => setFocusedField(null)}
              placeholder="First name"
              placeholderTextColor="#8b95a5"
              autoCapitalize="words"
              autoCorrect={false}
              autoComplete="given-name"
              textContentType="givenName"
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
                if (errors.lastName || errors.form) setErrors((current) => ({ ...current, lastName: undefined, form: undefined }));
              }}
              onFocus={() => {
                setFocusedField("lastName");
                scrollToInput(lastNameRef);
              }}
              onBlur={() => setFocusedField(null)}
              placeholder="Last name"
              placeholderTextColor="#8b95a5"
              autoCapitalize="words"
              autoCorrect={false}
              autoComplete="family-name"
              textContentType="familyName"
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
                if (errors.phoneNumber || errors.form) setErrors((current) => ({ ...current, phoneNumber: undefined, form: undefined }));
              }}
              onFocus={() => {
                setFocusedField("phoneNumber");
                scrollToInput(phoneRef);
              }}
              onBlur={() => setFocusedField(null)}
              placeholder="+1234567890"
              placeholderTextColor="#8b95a5"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="tel"
              textContentType="telephoneNumber"
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
                if (errors.email || errors.form) setErrors((current) => ({ ...current, email: undefined, form: undefined }));
              }}
              onFocus={() => {
                setFocusedField("email");
                scrollToInput(emailRef);
              }}
              onBlur={() => setFocusedField(null)}
              placeholder="you@example.com"
              placeholderTextColor="#8b95a5"
              autoCapitalize="none"
              autoCorrect={false}
              spellCheck={false}
              autoComplete="email"
              textContentType="emailAddress"
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
                  if (errors.password || errors.form) setErrors((current) => ({ ...current, password: undefined, form: undefined }));
                }}
                onFocus={() => {
                  setFocusedField("password");
                  scrollToInput(passwordRef);
                }}
                onBlur={() => setFocusedField(null)}
                placeholder="At least 8 characters"
                placeholderTextColor="#8b95a5"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="new-password"
                textContentType="newPassword"
                secureTextEntry={!showPassword}
                returnKeyType="done"
              />
              <Pressable hitSlop={10} onPress={() => setShowPassword((visible) => !visible)}>
                {showPassword ? <EyeSlash size={20} color={colors.success} /> : <Eye size={20} color={colors.success} />}
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
                        {met ? <Check size={10} color={colors.navy} weight="bold" /> : null}
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
              {acceptedTerms ? <Check size={13} color={colors.navy} weight="bold" /> : null}
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

        {errors.form ? (
          <View style={styles.formError}>
            <Text style={styles.formErrorText} selectable>{errors.form}</Text>
            <Pressable hitSlop={8} onPress={() => navigation.navigate("SignIn")}><Text style={styles.formErrorLink}>Go to sign in</Text></Pressable>
          </View>
        ) : null}

        <View style={styles.signInRow}>
          <Text style={styles.signInText}>Already have an account?</Text>
          <Pressable hitSlop={8} onPress={() => navigation.navigate("SignIn")}>
            <Text style={styles.signInLink}>Sign in</Text>
          </Pressable>
        </View>
      </View>
    </KeyboardSafeScreen>
  );
}

function RoleOption({ accountType, selected, onPress }: { accountType: AccountType; selected: boolean; onPress: () => void }) {
  const Icon = accountType === "DRIVER" ? Car : User;
  return (
    <Pressable accessibilityRole="radio" accessibilityState={{ checked: selected }} style={[styles.roleOption, selected && styles.roleOptionSelected]} onPress={onPress}>
      <View style={[styles.roleIcon, selected && styles.roleIconSelected]}><Icon size={22} color={selected ? colors.navy : colors.muted} weight="bold" /></View>
      <Text style={[styles.roleTitle, selected && styles.roleTitleSelected]}>{accountType === "DRIVER" ? "Driver" : "Passenger"}</Text>
      <Text style={styles.roleBody}>{accountType === "DRIVER" ? "Publish and manage trips" : "Find and book rides"}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.navy },
  content: { flexGrow: 1 },
  hero: { minHeight: 265, backgroundColor: colors.navy, alignItems: "center", justifyContent: "center", paddingHorizontal: 24, paddingVertical: 30, gap: 16 },
  logoRow: { flexDirection: "row", alignItems: "center", gap: 9 },
  logoTile: { width: 42, height: 42, borderRadius: 13 },
  wordmark: { color: colors.surface, fontSize: 20, fontWeight: "900" },
  heroCopy: { alignItems: "center", gap: 6 },
  brandName: { color: colors.success, fontSize: 10, fontWeight: "900", letterSpacing: 1.6 },
  heroTitle: { color: colors.surface, fontSize: 29, lineHeight: 35, fontWeight: "900", textAlign: "center" },
  heroSubtitle: { color: "rgba(255,255,255,.58)", fontSize: 13, lineHeight: 20, textAlign: "center", maxWidth: 340 },
  formArea: { flex: 1, backgroundColor: colors.navySoft, padding: 22, gap: 22, borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl },
  heading: { gap: 7 },
  roleSelector: { flexDirection: "row", gap: 10 },
  roleOption: { flex: 1, minHeight: 128, borderRadius: radii.lg, borderCurve: "continuous", padding: 14, gap: 5, borderWidth: 1.5, borderColor: "rgba(255,255,255,.1)", backgroundColor: "rgba(255,255,255,.035)" },
  roleOptionSelected: { borderColor: colors.success, backgroundColor: "rgba(20,184,122,.13)", boxShadow: "0 8px 20px rgba(20,184,122,0.12)" },
  roleIcon: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,.08)" },
  roleIconSelected: { backgroundColor: colors.success },
  roleTitle: { color: colors.surface, fontSize: 14, fontWeight: "900" },
  roleTitleSelected: { color: colors.surface },
  roleBody: { color: "rgba(255,255,255,.48)", fontSize: 10, lineHeight: 15 },
  formTitle: { color: colors.surface, fontSize: 25, lineHeight: 31, fontWeight: "900" },
  formSubtitle: { color: "rgba(255,255,255,.52)", fontSize: 13, lineHeight: 20 },
  fields: { gap: 18 },
  field: { gap: 7 },
  label: { color: "rgba(255,255,255,.82)", fontSize: 12, fontWeight: "800" },
  input: { height: 54, backgroundColor: "rgba(255,255,255,.045)", borderWidth: 1.5, borderColor: "rgba(255,255,255,.1)", borderRadius: radii.md, borderCurve: "continuous", paddingHorizontal: 16, color: colors.surface, fontSize: 15 },
  passwordInput: { height: 54, backgroundColor: "rgba(255,255,255,.045)", borderWidth: 1.5, borderColor: "rgba(255,255,255,.1)", borderRadius: radii.md, borderCurve: "continuous", paddingLeft: 16, paddingRight: 14, flexDirection: "row", alignItems: "center", gap: 10 },
  passwordTextInput: { flex: 1, height: "100%", color: colors.surface, fontSize: 15 },
  showPassword: { color: colors.success, fontSize: 12, fontWeight: "800" },
  requirements: { marginTop: 10, gap: 8 },
  requirementRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  requirementDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,.2)",
    backgroundColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
  },
  requirementDotMet: { backgroundColor: colors.success, borderColor: colors.success },
  requirementCheck: { color: colors.surface, fontSize: 10, fontWeight: "900", lineHeight: 11 },
  requirementText: { color: "rgba(255,255,255,.46)", fontSize: 12, fontWeight: "600" },
  requirementTextMet: { color: colors.success, fontWeight: "800" },
  inputFocused: { borderColor: colors.success, backgroundColor: "rgba(255,255,255,.06)", boxShadow: "0 0 0 3px rgba(20,184,122,.1)" },
  inputError: { borderColor: colors.danger, backgroundColor: "rgba(213,52,52,.08)" },
  errorText: { color: "#ff9b9b", fontSize: 11, lineHeight: 16 },
  formError: { padding: 13, gap: 7, borderRadius: radii.md, backgroundColor: "rgba(213,52,52,.13)", borderWidth: 1, borderColor: "rgba(255,110,110,.24)" },
  formErrorText: { color: "#ffb4b4", fontSize: 11, lineHeight: 17 },
  formErrorLink: { color: colors.success, fontSize: 10, fontWeight: "800" },
  termsGroup: { gap: 7 },
  termsRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: "rgba(255,255,255,.25)", backgroundColor: "transparent", alignItems: "center", justifyContent: "center" },
  checkboxChecked: { backgroundColor: colors.success, borderColor: colors.success },
  checkmark: { color: colors.navy, fontSize: 8, fontWeight: "900" },
  termsText: { flex: 1, color: "rgba(255,255,255,.66)", fontSize: 12, lineHeight: 19 },
  signUpButton: { height: 56, backgroundColor: colors.success, borderRadius: radii.md, borderCurve: "continuous", alignItems: "center", justifyContent: "center", boxShadow: "0 10px 20px rgba(20,184,122,0.2)" },
  signUpButtonText: { color: colors.navy, fontSize: 16, fontWeight: "900" },
  buttonDisabled: { opacity: 0.6 },
  pressed: { opacity: 0.86, transform: [{ scale: 0.99 }] },
  signInRow: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", alignItems: "center", gap: 5, paddingBottom: 12 },
  signInText: { color: "rgba(255,255,255,.5)", fontSize: 13 },
  signInLink: { color: colors.success, fontSize: 13, fontWeight: "900" },
});
