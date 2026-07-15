import { useMemo, useRef, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Text, TextInput } from "../components/Typography";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useKeyboardAwareScroll } from "../hooks/useKeyboardAwareScroll";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import DatePickerField from "../components/DatePickerField";
import { colors, radii, shadow } from "../theme";

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

type Errors = Partial<Record<"origin" | "destination" | "date" | "seats" | "price", string>>;

export default function PostTripScreen() {
  const { idToken, isSignedIn } = useAuth();
  const insets = useSafeAreaInsets();
  const { scrollRef, handleScroll, scrollToInput } = useKeyboardAwareScroll();
  const originRef = useRef<TextInput>(null);
  const destinationRef = useRef<TextInput>(null);
  const seatsRef = useRef<TextInput>(null);
  const priceRef = useRef<TextInput>(null);
  const vehicleRef = useRef<TextInput>(null);
  const notesRef = useRef<TextInput>(null);
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
    <ScrollView
      ref={scrollRef}
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      onScroll={handleScroll}
      scrollEventThrottle={16}
    >
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={styles.headerIcon}>
          <Text style={styles.headerIconText}>+</Text>
        </View>
        <View style={styles.headerCopy}>
          <Text style={styles.title}>Post a trip</Text>
          <Text style={styles.subtitle}>Share your route and available seats.</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionLabel}>ROUTE</Text>
        <View style={styles.routeRow}>
          <View style={styles.routeMarkers}>
            <View style={styles.dotOrigin} />
            <View style={styles.routeLine} />
            <View style={styles.dotDestination} />
          </View>
          <View style={styles.routeFields}>
            <RouteField
              inputRef={originRef}
              label="From"
              value={origin}
              onChangeText={setOrigin}
              onFocus={() => scrollToInput(originRef)}
              placeholder="Windhoek"
              error={errors.origin}
            />
            <View style={styles.routeDivider} />
            <RouteField
              inputRef={destinationRef}
              label="To"
              value={destination}
              onChangeText={setDestination}
              onFocus={() => scrollToInput(destinationRef)}
              placeholder="Oshakati"
              error={errors.destination}
            />
          </View>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionLabel}>TRIP DETAILS</Text>
        <DatePickerField label="Date" value={date} onChange={setDate} error={errors.date} />

        <View style={styles.splitRow}>
          <View style={styles.splitCell}>
            <Field
              inputRef={seatsRef}
              label="Available seats"
              value={seats}
              onChangeText={setSeats}
              onFocus={() => scrollToInput(seatsRef)}
              placeholder="4"
              error={errors.seats}
              keyboardType="number-pad"
            />
          </View>
          <View style={styles.splitCell}>
            <Field
              inputRef={priceRef}
              label="Price per seat (N$)"
              value={price}
              onChangeText={setPrice}
              onFocus={() => scrollToInput(priceRef)}
              placeholder="250"
              error={errors.price}
              keyboardType="number-pad"
            />
          </View>
        </View>

        <Field
          inputRef={vehicleRef}
          label="Vehicle (optional)"
          value={vehicle}
          onChangeText={setVehicle}
          onFocus={() => scrollToInput(vehicleRef)}
          placeholder="Toyota Corolla"
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionLabel}>NOTES</Text>
        <TextInput
          ref={notesRef}
          style={[styles.input, styles.textArea]}
          value={notes}
          onChangeText={setNotes}
          onFocus={() => scrollToInput(notesRef)}
          placeholder="Any additional info for passengers..."
          placeholderTextColor={colors.muted}
          multiline
        />
      </View>

      <Pressable
        style={({ pressed }) => [
          styles.button,
          pressed && styles.pressed,
          (!isValid || submitting) && styles.buttonDisabled,
        ]}
        onPress={handleSubmit}
        disabled={submitting}
      >
        <Text style={styles.buttonText}>{submitting ? "Publishing..." : "Publish trip"}</Text>
      </Pressable>
    </ScrollView>
  );
}

function RouteField({
  inputRef,
  label,
  value,
  onChangeText,
  onFocus,
  placeholder,
  error,
}: {
  inputRef?: React.RefObject<TextInput | null>;
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  onFocus?: () => void;
  placeholder: string;
  error?: string;
}) {
  return (
    <View style={styles.routeFieldWrap}>
      <Text style={styles.routeFieldLabel}>{label}</Text>
      <TextInput
        ref={inputRef}
        style={styles.routeInput}
        value={value}
        onChangeText={onChangeText}
        onFocus={onFocus}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

function Field({
  inputRef,
  label,
  value,
  onChangeText,
  onFocus,
  placeholder,
  error,
  keyboardType,
}: {
  inputRef?: React.RefObject<TextInput | null>;
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  onFocus?: () => void;
  placeholder: string;
  error?: string;
  keyboardType?: "default" | "number-pad";
}) {
  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        ref={inputRef}
        style={[styles.input, error && styles.inputError]}
        value={value}
        onChangeText={onChangeText}
        onFocus={onFocus}
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
  header: { flexDirection: "row", alignItems: "center", gap: 14, paddingBottom: 6 },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderCurve: "continuous",
    backgroundColor: colors.navy,
    alignItems: "center",
    justifyContent: "center",
  },
  headerIconText: { color: colors.success, fontSize: 24, fontWeight: "900", lineHeight: 26 },
  headerCopy: { flex: 1 },
  title: { color: colors.ink, fontSize: 24, fontWeight: "800" },
  subtitle: { color: colors.muted, fontSize: 13, marginTop: 2 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderCurve: "continuous",
    borderWidth: 1,
    borderColor: colors.line,
    padding: 16,
    gap: 14,
    ...shadow,
  },
  sectionLabel: { color: colors.muted, fontSize: 11, fontWeight: "900", letterSpacing: 1.2 },
  routeRow: { flexDirection: "row", gap: 12 },
  routeMarkers: { alignItems: "center", paddingTop: 6, paddingBottom: 6 },
  dotOrigin: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.success },
  routeLine: { width: 2, flex: 1, minHeight: 30, backgroundColor: colors.line, marginVertical: 4 },
  dotDestination: { width: 10, height: 10, borderRadius: 3, backgroundColor: colors.navy },
  routeFields: { flex: 1 },
  routeFieldWrap: { paddingVertical: 6 },
  routeFieldLabel: { color: colors.muted, fontSize: 11, fontWeight: "700", marginBottom: 2 },
  routeInput: { color: colors.ink, fontSize: 16, fontWeight: "700", paddingVertical: 2 },
  routeDivider: { height: 1, backgroundColor: colors.line },
  label: { fontSize: 12, color: colors.text, fontWeight: "700", marginBottom: 6 },
  input: {
    backgroundColor: colors.wash,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.md,
    borderCurve: "continuous",
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
    marginTop: 4,
    backgroundColor: colors.navy,
    borderRadius: radii.lg,
    borderCurve: "continuous",
    paddingVertical: 17,
    alignItems: "center",
  },
  pressed: { opacity: 0.9, transform: [{ scale: 0.99 }] },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: colors.surface, fontSize: 16, fontWeight: "800" },
});
