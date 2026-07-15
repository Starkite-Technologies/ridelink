import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Text } from "../../components/Typography";
import { StateView } from "../../components/state-view";
import type { LongRouteTrip } from "../../long-routes/types";
import { formatDateTime, formatNad } from "../../long-routes/data";
import type { LongRoutesStackParamList } from "../../navigation/types";
import { api } from "../../api/client";
import { useAuth } from "../../auth/AuthContext";
import { colors, radii, shadow } from "../../theme";

type Props = NativeStackScreenProps<LongRoutesStackParamList, "Payment">;
const METHODS = [
  { key: "PAY_DRIVER", title: "Pay the driver", note: "Cash on boarding, where enabled" },
  { key: "PAY_OFFICE", title: "Pay at transport office", note: "Booking awaits operator verification" },
  { key: "EFT", title: "Electronic funds transfer", note: "Payment instructions follow confirmation" },
  { key: "MOBILE_WALLET", title: "Mobile wallet", note: "Provider connection ready; payment stays pending" },
];

export default function PaymentScreen({ route, navigation }: Props) {
  const { idToken } = useAuth();
  const [trip, setTrip] = useState<LongRouteTrip | null>(null);
  const [method, setMethod] = useState("PAY_DRIVER");
  const [insurance, setInsurance] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const idempotencyKey = useRef(`booking-${route.params.tripId}-${Date.now()}-${Math.random().toString(36).slice(2)}`).current;
  const bookingCompletedRef = useRef(false);
  useEffect(() => { api.getLongRoute(route.params.tripId).then(setTrip).catch((err) => setError(err instanceof Error ? err.message : "Trip could not be loaded")); }, [route.params.tripId]);
  useEffect(() => () => {
    if (!bookingCompletedRef.current && idToken) void api.releaseSeats(route.params.tripId, route.params.seatNumbers, idToken).catch(() => undefined);
  }, [idToken, route.params.seatNumbers, route.params.tripId]);
  if (error) return <StateView title="Checkout unavailable" message={error} actionLabel="Go back" onAction={() => navigation.goBack()} />;
  if (!trip) return <View style={styles.centered}><ActivityIndicator color={colors.success} /></View>;
  const subtotal = trip.basePrice * route.params.seatNumbers.length;
  const insuranceFee = insurance ? 25 * route.params.seatNumbers.length : 0;
  const total = subtotal + trip.bookingFee + insuranceFee;
  const confirm = async () => {
    if (!idToken) return Alert.alert("Session expired", "Sign in again before completing your booking.");
    if (Date.parse(route.params.holdExpiresAt) <= Date.now()) return Alert.alert("Seat hold expired", "Return to the seat map and select seats again.", [{ text: "Select seats", onPress: () => navigation.popTo("SeatSelection", { tripId: route.params.tripId, passengers: route.params.seatNumbers.length }) }]);
    setSubmitting(true);
    try {
      const booking = await api.createLongRouteBooking(route.params.tripId, { seatNumbers: route.params.seatNumbers, passengers: route.params.passengers, pickupPoint: route.params.pickupPoint, dropOffPoint: route.params.dropOffPoint, paymentMethod: method, includeInsurance: insurance, idempotencyKey }, idToken);
      bookingCompletedRef.current = true;
      navigation.reset({ index: 1, routes: [{ name: "LongRouteHome" }, { name: "BookingConfirmation", params: { booking } }] });
    } catch (err) {
      Alert.alert("Booking not completed", err instanceof Error ? err.message : "No payment was taken. Please try again.", [{ text: "OK" }, { text: "Choose seats", onPress: () => navigation.popTo("SeatSelection", { tripId: route.params.tripId, passengers: route.params.seatNumbers.length }) }]);
    } finally { setSubmitting(false); }
  };
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} contentInsetAdjustmentBehavior="automatic">
      <View><Text style={styles.title}>Review and pay</Text><Text style={styles.subtitle}>All charges are shown before you confirm.</Text></View>
      <View style={styles.tripCard}><Text style={styles.route}>{trip.departureTown} to {trip.destinationTown}</Text><Text style={styles.meta}>{formatDateTime(trip.departureDateTime)}</Text><Text style={styles.meta}>{trip.operatorName} • {trip.vehicle.make} {trip.vehicle.model}</Text><Text style={styles.meta}>Pickup: {route.params.pickupPoint.name}</Text><Text style={styles.meta}>Drop-off: {route.params.dropOffPoint.name}</Text><Text style={styles.seats}>Seats {route.params.seatNumbers.join(", ")}</Text></View>
      <View style={styles.card}><Text style={styles.sectionTitle}>Price summary</Text><Price label={`${route.params.seatNumbers.length} passenger${route.params.seatNumbers.length === 1 ? "" : "s"} × ${formatNad(trip.basePrice)}`} value={subtotal} /><Price label="Booking fee" value={trip.bookingFee} /><Price label="Luggage fee" value={0} /><Pressable style={styles.insuranceRow} onPress={() => setInsurance((value) => !value)}><View style={[styles.checkbox, insurance && styles.checkboxActive]}>{insurance ? <Text style={styles.check}>OK</Text> : null}</View><View style={{ flex: 1 }}><Text style={styles.insuranceTitle}>Optional travel protection</Text><Text style={styles.insuranceNote}>N$25 per passenger</Text></View><Text style={styles.price}>{formatNad(insuranceFee)}</Text></Pressable><View style={styles.totalRow}><Text style={styles.totalLabel}>Total payable</Text><Text style={styles.total}>{formatNad(total)}</Text></View></View>
      <View style={styles.card}><Text style={styles.sectionTitle}>Payment method</Text>{METHODS.map((item) => <Pressable key={item.key} style={[styles.method, method === item.key && styles.methodActive]} onPress={() => setMethod(item.key)}><View style={[styles.radio, method === item.key && styles.radioActive]} /> <View style={{ flex: 1 }}><Text style={styles.methodTitle}>{item.title}</Text><Text style={styles.methodNote}>{item.note}</Text></View></Pressable>)}<Text style={styles.security}>RideLink never stores raw card details. Online provider confirmation will be added through the payment adapter.</Text></View>
      <Pressable style={[styles.button, submitting && styles.disabled]} disabled={submitting} onPress={() => void confirm()}>{submitting ? <ActivityIndicator color={colors.onBrand} /> : <Text style={styles.buttonText}>Confirm booking • {formatNad(total)}</Text>}</Pressable>
    </ScrollView>
  );
}

function Price({ label, value }: { label: string; value: number }) { return <View style={styles.priceRow}><Text style={styles.priceLabel}>{label}</Text><Text style={styles.price}>{formatNad(value)}</Text></View>; }
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.wash }, centered: { flex: 1, alignItems: "center", justifyContent: "center" }, content: { padding: 18, gap: 14, paddingBottom: 38 }, title: { color: colors.ink, fontSize: 23, fontWeight: "900" }, subtitle: { color: colors.muted, fontSize: 12, marginTop: 3 }, tripCard: { backgroundColor: colors.navy, borderRadius: radii.lg, padding: 16, gap: 4 }, route: { color: colors.surface, fontSize: 18, fontWeight: "900" }, meta: { color: "#c9d7e6", fontSize: 11 }, seats: { color: colors.success, fontSize: 12, fontWeight: "900", marginTop: 4 }, card: { backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.line, padding: 16, gap: 12, ...shadow }, sectionTitle: { color: colors.ink, fontSize: 15, fontWeight: "900" }, priceRow: { flexDirection: "row", justifyContent: "space-between", gap: 12 }, priceLabel: { flex: 1, color: colors.text, fontSize: 12 }, price: { color: colors.ink, fontSize: 12, fontWeight: "800", fontVariant: ["tabular-nums"] }, insuranceRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 4 }, checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: colors.line, alignItems: "center", justifyContent: "center" }, checkboxActive: { backgroundColor: colors.success, borderColor: colors.success }, check: { color: colors.navy, fontSize: 7, fontWeight: "900" }, insuranceTitle: { color: colors.text, fontSize: 12, fontWeight: "800" }, insuranceNote: { color: colors.muted, fontSize: 10, marginTop: 2 }, totalRow: { flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 12 }, totalLabel: { color: colors.ink, fontSize: 15, fontWeight: "900" }, total: { color: colors.navy, fontSize: 18, fontWeight: "900", fontVariant: ["tabular-nums"] }, method: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderColor: colors.line, borderRadius: radii.md, padding: 12 }, methodActive: { borderColor: colors.success, backgroundColor: colors.successWash }, radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: "#b3bdc9" }, radioActive: { borderWidth: 5, borderColor: colors.success, backgroundColor: colors.surface }, methodTitle: { color: colors.ink, fontSize: 12, fontWeight: "800" }, methodNote: { color: colors.muted, fontSize: 10, marginTop: 2 }, security: { color: colors.muted, fontSize: 10, lineHeight: 15 }, button: { minHeight: 56, backgroundColor: colors.navy, borderRadius: radii.md, alignItems: "center", justifyContent: "center" }, buttonText: { color: colors.surface, fontSize: 15, fontWeight: "900" }, disabled: { opacity: 0.5 },
});
