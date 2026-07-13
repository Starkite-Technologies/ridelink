import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Text, TextInput } from "../components/Typography";
import BackButton from "../components/BackButton";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { ProfileStackParamList } from "../navigation/types";
import { useAuth } from "../auth/AuthContext";
import { colors, radii } from "../theme";

type Props = NativeStackScreenProps<ProfileStackParamList, "ConfirmSignUp">;

export default function ConfirmSignUpScreen({ route, navigation }: Props) {
  const { confirmSignUp } = useAuth();
  const insets = useSafeAreaInsets();
  const { email } = route.params;
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [focused, setFocused] = useState(false);

  const handleConfirm = async () => {
    if (!code) {
      Alert.alert("Missing code", "Enter the verification code sent to your email.");
      return;
    }
    setSubmitting(true);
    try {
      await confirmSignUp(email, code);
    } catch (err) {
      Alert.alert("Unable to continue", err instanceof Error ? err.message : "Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.hero}>
        <BackButton onPress={() => navigation.goBack()} topOffset={insets.top + 16} />
        <View style={styles.logoTile}>
          <View style={styles.brandPin}><View style={styles.brandPinHole} /></View>
          <View style={styles.logoRoad} />
        </View>
        <View style={styles.heroCopy}>
          <Text style={styles.brandName}>RIDELINK</Text>
          <Text style={styles.heroTitle}>Verify your email</Text>
          <Text style={styles.heroSubtitle}>We sent a 6-digit code to {email}</Text>
        </View>
      </View>

      <View style={styles.formArea}>
        <View style={styles.heading}>
          <Text style={styles.formTitle}>Enter code</Text>
          <Text style={styles.formSubtitle}>Check your inbox and enter the verification code below.</Text>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Verification code</Text>
          <TextInput
            style={[styles.input, focused && styles.inputFocused]}
            value={code}
            onChangeText={setCode}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder="123456"
            placeholderTextColor="#8b95a5"
            keyboardType="number-pad"
            autoFocus
          />
        </View>

        <Pressable
          style={({ pressed }) => [styles.button, pressed && styles.pressed, submitting && styles.buttonDisabled]}
          onPress={handleConfirm}
          disabled={submitting}
        >
          {submitting ? <ActivityIndicator color={colors.surface} /> : <Text style={styles.buttonText}>Verify and continue</Text>}
        </Pressable>
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
  heroSubtitle: { color: colors.muted, fontSize: 14, lineHeight: 21, textAlign: "center", maxWidth: 320 },
  formArea: { flex: 1, backgroundColor: colors.surface, padding: 24, gap: 24 },
  heading: { gap: 7 },
  formTitle: { color: colors.ink, fontSize: 25, lineHeight: 31, fontWeight: "900" },
  formSubtitle: { color: colors.muted, fontSize: 14, lineHeight: 21 },
  field: { gap: 7 },
  label: { color: colors.text, fontSize: 13, fontWeight: "800" },
  input: {
    height: 54,
    backgroundColor: colors.wash,
    borderWidth: 1.5,
    borderColor: colors.line,
    borderRadius: radii.md,
    borderCurve: "continuous",
    paddingHorizontal: 16,
    color: colors.ink,
    fontSize: 20,
    letterSpacing: 6,
    textAlign: "center",
  },
  inputFocused: { borderColor: colors.navy, backgroundColor: colors.surface, boxShadow: "0 0 0 3px rgba(3,28,58,0.08)" },
  button: { height: 56, backgroundColor: colors.navy, borderRadius: radii.md, borderCurve: "continuous", alignItems: "center", justifyContent: "center" },
  buttonDisabled: { opacity: 0.6 },
  pressed: { opacity: 0.86, transform: [{ scale: 0.99 }] },
  buttonText: { color: colors.surface, fontSize: 16, fontWeight: "900" },
});
