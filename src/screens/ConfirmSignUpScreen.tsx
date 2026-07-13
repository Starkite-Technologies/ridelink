import { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet } from "react-native";
import { Text, TextInput } from "../components/Typography";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { ProfileStackParamList } from "../navigation/types";
import { useAuth } from "../auth/AuthContext";
import { colors, radii, shadow } from "../theme";

type Props = NativeStackScreenProps<ProfileStackParamList, "ConfirmSignUp">;

export default function ConfirmSignUpScreen({ route }: Props) {
  const { confirmSignUp } = useAuth();
  const { email } = route.params;
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);

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
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>Verify your email</Text>
      <Text style={styles.subtitle}>We sent a code to {email}</Text>

      <Text style={styles.label}>Verification code</Text>
      <TextInput
        style={styles.input}
        value={code}
        onChangeText={setCode}
        placeholder="123456"
        placeholderTextColor={colors.muted}
        keyboardType="number-pad"
      />

      <Pressable style={[styles.button, submitting && styles.buttonDisabled]} onPress={handleConfirm} disabled={submitting}>
        <Text style={styles.buttonText}>{submitting ? "Finishing setup..." : "Verify and continue"}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.wash },
  content: { margin: 20, padding: 20, justifyContent: "center", flexGrow: 1, backgroundColor: colors.surface, borderRadius: radii.xl, ...shadow },
  title: { color: colors.ink, fontSize: 24, fontWeight: "800", marginBottom: 8, textAlign: "center" },
  subtitle: { color: colors.muted, fontSize: 14, textAlign: "center", marginBottom: 24 },
  label: { color: colors.text, fontSize: 12, fontWeight: "700", marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.md,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    color: colors.ink,
  },
  button: { marginTop: 24, backgroundColor: colors.navy, borderRadius: radii.md, paddingVertical: 15, alignItems: "center" },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: colors.surface, fontSize: 16, fontWeight: "800" },
});
