import { useCallback, useMemo, useRef, useState } from "react";
import { Alert, Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Text, TextInput } from "../components/Typography";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useKeyboardAwareScroll } from "../hooks/useKeyboardAwareScroll";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { RootTabParamList } from "../navigation/types";
import type { Vehicle } from "../types";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import DatePickerField from "../components/DatePickerField";
import { colors, radii, shadow } from "../theme";

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

type Errors = Partial<
  Record<"origin" | "destination" | "date" | "seats" | "price" | "vehicle", string>
>;

type Props = BottomTabScreenProps<RootTabParamList, "PostTrip">;

export default function PostTripScreen({ navigation }: Props) {
  const { idToken, isSignedIn } = useAuth();
  const insets = useSafeAreaInsets();
  const { scrollRef, handleScroll, scrollToInput } = useKeyboardAwareScroll();
  const originRef = useRef<TextInput>(null);
  const destinationRef = useRef<TextInput>(null);
  const seatsRef = useRef<TextInput>(null);
  const priceRef = useRef<TextInput>(null);
  const notesRef = useRef<TextInput>(null);
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [date, setDate] = useState("");
  const [seats, setSeats] = useState("");
  const [price, setPrice] = useState("");
  const [notes, setNotes] = useState("");
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!isSignedIn || !idToken) {
        setVehicles([]);
        return;
      }
      api
        .listVehicles(idToken)
        .then((all) => setVehicles(all.filter((v) => v.verified)))
        .catch(() => {});
    }, [idToken, isSignedIn])
  );

  const selectedVehicle = vehicles.find((v) => v.vehicleId === selectedVehicleId) ?? null;

  const validate = (): Errors => {
    const next: Errors = {};
    if (!origin.trim()) next.origin = "Origin is required";
    if (!destination.trim()) next.destination = "Destination is required";
    if (!date) next.date = "Date is required";
    else if (!DATE_REGEX.test(date)) next.date = "Use format YYYY-MM-DD";
    const seatsNum = Number(seats);
    if (!seats || !Number.isInteger(seatsNum) || seatsNum < 1)
      next.seats = "Enter at least 1 seat";
    const priceNum = Number(price);
    if (!price || Number.isNaN(priceNum) || priceNum <= 0)
      next.price = "Enter a valid price";
    if (!selectedVehicleId) next.vehicle = "Select a vehicle";
    return next;
  };

  const isValid = useMemo(
    () => !!origin && !!destination && !!date && !!seats && !!price && !!selectedVehicleId,
    [origin, destination, date, seats, price, selectedVehicleId],
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
          vehicleId: selectedVehicleId!,
          notes: notes.trim() || undefined,
        },
        idToken,
      );
      Alert.alert("Trip posted", `${origin} -> ${destination} on ${date}`);
      setOrigin("");
      setDestination("");
      setDate("");
      setSeats("");
      setPrice("");
      setNotes("");
      setSelectedVehicleId(null);
      setErrors({});
    } catch (err) {
      Alert.alert(
        "Failed to post trip",
        err instanceof Error ? err.message : "Please try again.",
      );
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
          <Text style={styles.subtitle}>
            Share your route and available seats.
          </Text>
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
        <DatePickerField
          label="Date"
          value={date}
          onChange={setDate}
          error={errors.date}
        />

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
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionLabel}>VEHICLE</Text>
        {vehicles.length === 0 ? (
          <View style={styles.noVehicleBox}>
            <Ionicons name="car-outline" size={22} color={colors.navy} />
            <Text style={styles.noVehicleTitle}>You haven't added a car yet</Text>
            <Text style={styles.noVehicleText}>Add a verified car to your profile before you can post a trip.</Text>
            <Pressable
              style={({ pressed }) => [styles.noVehicleButton, pressed && styles.pressed]}
              onPress={() => navigation.navigate("Profile", { screen: "MyCars" })}
            >
              <Text style={styles.noVehicleButtonText}>Add a car</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <Pressable
              style={[styles.input, styles.vehicleInput, errors.vehicle && styles.inputError]}
              onPress={() => setPickerOpen(true)}
            >
              <Text style={selectedVehicle ? styles.valueText : styles.placeholderText}>
                {selectedVehicle
                  ? `${selectedVehicle.make} ${selectedVehicle.model} (${selectedVehicle.color})`
                  : "Select a vehicle"}
              </Text>
              <Ionicons name="chevron-down" size={18} color={colors.muted} />
            </Pressable>
            {errors.vehicle ? <Text style={styles.errorText}>{errors.vehicle}</Text> : null}
          </>
        )}
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
        <Text style={styles.buttonText}>
          {submitting ? "Publishing..." : "Publish trip"}
        </Text>
      </Pressable>

      <Modal visible={pickerOpen} transparent animationType="slide" onRequestClose={() => setPickerOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setPickerOpen(false)} />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 20 }]}>
          <Text style={styles.sheetTitle}>Choose a vehicle</Text>
          {vehicles.map((v) => (
            <Pressable
              key={v.vehicleId}
              style={styles.sheetRow}
              onPress={() => {
                setSelectedVehicleId(v.vehicleId);
                setErrors((current) => ({ ...current, vehicle: undefined }));
                setPickerOpen(false);
              }}
            >
              <View style={styles.sheetRowText}>
                <Text style={styles.sheetRowTitle}>{v.make} {v.model}</Text>
                <Text style={styles.sheetRowSubtitle}>{v.color}{v.year ? ` · ${v.year}` : ""}</Text>
              </View>
              {v.verified ? (
                <View style={styles.sheetBadge}>
                  <Ionicons name="checkmark-circle" size={12} color={colors.success} />
                  <Text style={styles.sheetBadgeText}>Verified</Text>
                </View>
              ) : null}
            </Pressable>
          ))}
        </View>
      </Modal>
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingBottom: 6,
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderCurve: "continuous",
    backgroundColor: colors.navy,
    alignItems: "center",
    justifyContent: "center",
  },
  headerIconText: {
    color: colors.success,
    fontSize: 24,
    fontWeight: "900",
    lineHeight: 26,
  },
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
  sectionLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.2,
  },
  routeRow: { flexDirection: "row", gap: 12 },
  routeMarkers: { alignItems: "center", paddingTop: 6, paddingBottom: 6 },
  dotOrigin: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.success,
  },
  routeLine: {
    width: 2,
    flex: 1,
    minHeight: 30,
    backgroundColor: colors.line,
    marginVertical: 4,
  },
  dotDestination: {
    width: 10,
    height: 10,
    borderRadius: 3,
    backgroundColor: colors.navy,
  },
  routeFields: { flex: 1 },
  routeFieldWrap: { paddingVertical: 6 },
  routeFieldLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "700",
    marginBottom: 2,
  },
  routeInput: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: "700",
    paddingVertical: 2,
  },
  routeDivider: { height: 1, backgroundColor: colors.line },
  label: {
    fontSize: 12,
    color: colors.text,
    fontWeight: "700",
    marginBottom: 6,
  },
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
  vehicleInput: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  valueText: { color: colors.ink, fontSize: 15, fontWeight: "700" },
  placeholderText: { color: colors.muted, fontSize: 15 },
  inputError: { borderColor: colors.danger },
  errorText: { color: colors.danger, fontSize: 12, marginTop: 5 },
  splitRow: { flexDirection: "row", gap: 12 },
  splitCell: { flex: 1 },
  textArea: { minHeight: 96, textAlignVertical: "top" },
  noVehicleBox: { alignItems: "center", gap: 6, paddingVertical: 8 },
  noVehicleTitle: { color: colors.ink, fontSize: 15, fontWeight: "800", marginTop: 4, textAlign: "center" },
  noVehicleText: { color: colors.muted, fontSize: 13, lineHeight: 19, textAlign: "center" },
  noVehicleButton: {
    marginTop: 10,
    backgroundColor: colors.navy,
    borderRadius: radii.md,
    borderCurve: "continuous",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  noVehicleButtonText: { color: colors.surface, fontSize: 14, fontWeight: "800" },
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
  modalBackdrop: { flex: 1, backgroundColor: "rgba(3,28,58,0.4)" },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    borderCurve: "continuous",
    padding: 20,
    gap: 10,
    ...shadow,
  },
  sheetTitle: { color: colors.ink, fontSize: 18, fontWeight: "800", marginBottom: 4 },
  sheetRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.md,
    borderCurve: "continuous",
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  sheetRowText: { gap: 2 },
  sheetRowTitle: { color: colors.ink, fontSize: 15, fontWeight: "800" },
  sheetRowSubtitle: { color: colors.muted, fontSize: 12 },
  sheetBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.successWash,
    borderRadius: radii.sm,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  sheetBadgeText: { color: colors.success, fontSize: 11, fontWeight: "800" },
});
