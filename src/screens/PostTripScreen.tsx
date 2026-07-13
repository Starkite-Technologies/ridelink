import { useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Text, TextInput } from "../components/Typography";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import DatePickerField from "../components/DatePickerField";
import { colors, radii } from "../theme";

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

type Errors = Partial<Record<"origin" | "destination" | "date" | "seats" | "price", string>>;

export default function PostTripScreen() {
  const { idToken, isSignedIn } = useAuth();
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [date, setDate] = useState("");
  const [seats, setSeats] = useState("");
  const [price, setPrice] = useState("");
  const [vehicle, setVehicle] = useState("Toyota Corolla");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);

  const validate = (): Errors => {
    const next: Errors = {};
    if (!origin.trim()) next.origin = "Origin is required";
    if (!destination.trim()) next.destination = "Destination is required";
    if (!date) next.date = "Date is required";
    else if (!DATE_REGEX.test(date)) next.date = "Use format YYYY-MM-DD";
    const seatsNum = Number(seats);
    if (!seats || !Number.isInteger(seatsNum) || seatsNum < 1) next.seats = "Enter at least 1 seat";
    const priceNum = Number(price);
    if (!price || Number.isNaN(priceNum) || priceNum <= 0) next.price = "Enter a valid price";
    return next;
  };

  const isValid = useMemo(
    () => !!origin && !!destination && !!date && !!seats && !!price,
    [origin, destination, date, seats, price]
  );

  const handleSubmit = async () => {
    if (!isSignedIn || !idToken) {
      Alert.alert("Sign in required", "Please sign in to post a trip.");
      return;
    }

    const validationErrors = validate();
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    setSubmitting(true);
    try {
      await api.createTrip(
        {
          origin: origin.trim(),
          destination: destination.trim(),
          date,
          seatsAvailable: Number(seats),
          pricePerSeat: Number(price),
        },
        idToken
      );
      Alert.alert("Trip posted", `${origin} -> ${destination} on ${date}`);
      setOrigin("");
      setDestination("");
      setDate("");
      setSeats("");
      setPrice("");
      setVehicle("Toyota Corolla");
      setNotes("");
      setErrors({});
    } catch (err) {
      Alert.alert("Failed to post trip", err instanceof Error ? err.message : "Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <Text style={styles.title}>Post a trip</Text>
        <Text style={styles.subtitle}>Share your route and available seats.</Text>
      </View>

      <Field label="From" value={origin} onChangeText={setOrigin} placeholder="Windhoek" error={errors.origin} />
      <Field label="To" value={destination} onChangeText={setDestination} placeholder="Oshakati" error={errors.destination} />
      <DatePickerField label="Date" value={date} onChange={setDate} error={errors.date} />

      <View style={styles.splitRow}>
        <View style={styles.splitCell}>
          <Field
            label="Available seats"
            value={seats}
            onChangeText={setSeats}
            placeholder="4"
            error={errors.seats}
            keyboardType="number-pad"
          />
        </View>
        <View style={styles.splitCell}>
          <Field
            label="Price per seat (N$)"
            value={price}
            onChangeText={setPrice}
            placeholder="250"
            error={errors.price}
            keyboardType="number-pad"
          />
        </View>
      </View>

      <Field label="Vehicle (optional)" value={vehicle} onChangeText={setVehicle} placeholder="Toyota Corolla" />

      <Text style={styles.label}>Add notes (optional)</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        value={notes}
        onChangeText={setNotes}
        placeholder="Any additional info for passengers..."
        placeholderTextColor={colors.muted}
        multiline
      />

      <Pressable
        style={[styles.button, (!isValid || submitting) && styles.buttonDisabled]}
        onPress={handleSubmit}
        disabled={submitting}
      >
        <Text style={styles.buttonText}>{submitting ? "Publishing..." : "Publish trip"}</Text>
      </Pressable>
    </ScrollView>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  error?: string;
  keyboardType?: "default" | "number-pad";
}) {
  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, error && styles.inputError]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        keyboardType={keyboardType}
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.wash },
  content: { padding: 18, gap: 14, paddingBottom: 36 },
  header: { paddingBottom: 4 },
  title: { color: colors.ink, fontSize: 24, fontWeight: "800" },
  subtitle: { color: colors.muted, fontSize: 13, marginTop: 4 },
  label: { fontSize: 12, color: colors.text, fontWeight: "700", marginBottom: 6 },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.md,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    color: colors.ink,
  },
  inputError: { borderColor: colors.danger },
  errorText: { color: colors.danger, fontSize: 12, marginTop: 5 },
  splitRow: { flexDirection: "row", gap: 12 },
  splitCell: { flex: 1 },
  textArea: { minHeight: 96, textAlignVertical: "top" },
  button: {
    marginTop: 12,
    backgroundColor: colors.navy,
    borderRadius: radii.lg,
    paddingVertical: 17,
    alignItems: "center",
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: colors.surface, fontSize: 16, fontWeight: "800" },
});
