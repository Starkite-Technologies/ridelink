import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, Share, StyleSheet, View } from "react-native";
import QRCode from "react-native-qrcode-svg";
import { Text, TextInput } from "../../components/Typography";
import { StateView } from "../../components/state-view";
import type { LongRouteBooking } from "../../long-routes/types";
import { formatDateTime, formatNad } from "../../long-routes/data";
import { api } from "../../api/client";
import { useAuth } from "../../auth/AuthContext";
import { colors, radii, shadow } from "../../theme";

export default function BookingDetailScreen({ route, navigation }: { route: { params: { bookingId: string } }; navigation: { goBack: () => void } }) {
  const { idToken } = useAuth();
  const [booking, setBooking] = useState<LongRouteBooking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCancellation, setShowCancellation] = useState(false);
  const [reason, setReason] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const [rating, setRating] = useState(5);
  const [review, setReview] = useState("");
  const [reviewed, setReviewed] = useState(false);

  const load = useCallback(async () => {
    if (!idToken) return;
    try {
      setBooking(await api.getLongRouteBooking(route.params.bookingId, idToken));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Booking could not be loaded");
    }
  }, [idToken, route.params.bookingId]);

  useEffect(() => {
    void load().finally(() => setLoading(false));
    const interval = setInterval(() => void load(), 15_000);
    return () => clearInterval(interval);
  }, [load]);

  const cancel = async () => {
    if (!idToken || !reason.trim()) return Alert.alert("Cancellation reason required", "Tell us why you need to cancel.");
    setCancelling(true);
    try {
      const result = await api.cancelLongRouteBooking(route.params.bookingId, reason.trim(), idToken);
      Alert.alert("Booking cancelled", `Refund status: ${result.refundStatus.replace(/_/g, " ")}. Refund amount: ${formatNad(result.refundAmount)}.`);
      setShowCancellation(false);
      await load();
    } catch (err) {
      Alert.alert("Cancellation unavailable", err instanceof Error ? err.message : "Contact RideLink support.");
    } finally {
      setCancelling(false);
    }
  };

  const submitReview = async () => {
    if (!idToken || !booking) return;
    try {
      await api.createReview(booking.tripId, {
        bookingId: booking.bookingId,
        rating,
        categories: { professionalism: rating, cleanliness: rating, comfort: rating, punctuality: rating, safety: rating },
        comment: review.trim(),
      }, idToken);
      setReviewed(true);
      Alert.alert("Thank you", "Your verified trip review was submitted.");
    } catch (err) {
      Alert.alert("Review not submitted", err instanceof Error ? err.message : "Try again.");
    }
  };

  if (loading) return <View style={styles.centered}><ActivityIndicator color={colors.success} /></View>;
  if (error || !booking) return <StateView title="Booking unavailable" message={error ?? "Booking not found"} actionLabel="Go back" onAction={navigation.goBack} />;

  const canCancel = !["CANCELLED", "COMPLETED", "REFUNDED", "MISSED"].includes(booking.bookingStatus);
  const tripIsActive = booking.trip && ["BOARDING", "DEPARTED", "IN_PROGRESS", "ARRIVED"].includes(booking.trip.status);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} contentInsetAdjustmentBehavior="automatic" keyboardShouldPersistTaps="handled">
      <View style={styles.hero}>
        <Text style={styles.brand}>RIDELINK DIGITAL TICKET</Text>
        <Text style={styles.route}>{booking.tripSnapshot.departureTown} to {booking.tripSnapshot.destinationTown}</Text>
        <Text style={styles.status}>{booking.bookingStatus.replace(/_/g, " ")}</Text>
      </View>

      {tripIsActive && booking.trip ? (
        <View style={styles.liveCard}>
          <View style={styles.liveHeader}><View style={styles.liveDot} /><Text style={styles.liveTitle}>LIVE TRIP • {booking.trip.status.replace(/_/g, " ")}</Text></View>
          {booking.trip.locationSharingActive && booking.trip.currentLocation ? (
            <>
              <Text style={styles.livePosition}>Current position: {booking.trip.currentLocation.latitude.toFixed(4)}, {booking.trip.currentLocation.longitude.toFixed(4)}</Text>
              <Text style={styles.liveMeta}>Updated {formatDateTime(booking.trip.currentLocation.updatedAt)} • Accuracy {Math.round(booking.trip.currentLocation.accuracy)} m</Text>
            </>
          ) : <Text style={styles.liveMeta}>The driver has not started location sharing. Trip status updates still refresh automatically.</Text>}
        </View>
      ) : null}

      <View style={styles.ticket}>
        <View style={styles.qr}>
          <QRCode value={JSON.stringify({ type: "RIDELINK_TICKET", bookingId: booking.bookingId, reference: booking.bookingReference })} size={96} color={colors.navy} backgroundColor={colors.surface} />
          <Text style={styles.qrReference} selectable>{booking.bookingReference}</Text>
        </View>
        <Text style={styles.reference} selectable>{booking.bookingReference}</Text>
        <Detail label="Departure" value={formatDateTime(booking.tripSnapshot.departureDateTime)} />
        <Detail label="Seats" value={booking.seatNumbers.join(", ")} />
        <Detail label="Operator" value={booking.tripSnapshot.operatorName} />
        <Detail label="Vehicle" value={`${booking.tripSnapshot.vehicle.make} ${booking.tripSnapshot.vehicle.model}`} />
        <Detail label="Registration" value={booking.tripSnapshot.vehicle.registrationNumber} />
        <Detail label="Pickup" value={booking.pickupPoint?.name ?? "See operator instructions"} />
        <Detail label="Drop-off" value={booking.dropOffPoint?.name ?? "See operator instructions"} />
        <Detail label="Payment" value={booking.paymentStatus.replace(/_/g, " ")} />
        <Detail label="Total" value={formatNad(booking.totalAmount)} />
      </View>

      {booking.passengers?.length ? <View style={styles.card}><Text style={styles.sectionTitle}>Passengers</Text>{booking.passengers.map((passenger) => <Detail key={passenger.seatNumber} label={`Seat ${passenger.seatNumber}`} value={passenger.fullName} />)}</View> : null}

      {booking.bookingStatus === "COMPLETED" && !reviewed ? (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Rate this trip</Text>
          <Text style={styles.supportText}>Only completed, verified bookings can leave a review.</Text>
          <View style={styles.ratingRow}>{[1, 2, 3, 4, 5].map((value) => <Pressable key={value} onPress={() => setRating(value)}><Text style={[styles.star, value <= rating && styles.starActive]}>{"\u2605"}</Text></Pressable>)}</View>
          <TextInput style={styles.input} value={review} onChangeText={setReview} placeholder="Driver professionalism, cleanliness, comfort, punctuality, and safety" placeholderTextColor={colors.muted} multiline />
          <Pressable style={styles.secondary} onPress={() => void submitReview()}><Text style={styles.secondaryText}>Submit verified review</Text></Pressable>
        </View>
      ) : null}

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Safety and support</Text>
        <Text style={styles.supportText}>Use your booking reference when contacting the operator. Call emergency services for immediate danger; report trip or vehicle concerns to RideLink support.</Text>
        <Pressable style={styles.secondary} onPress={() => void Share.share({ message: `Follow my RideLink trip: ${booking.tripSnapshot.departureTown} to ${booking.tripSnapshot.destinationTown}, ${formatDateTime(booking.tripSnapshot.departureDateTime)}. Booking ${booking.bookingReference}.` })}><Text style={styles.secondaryText}>Share trip details</Text></Pressable>
      </View>

      {canCancel ? (
        <View style={styles.card}>
          <Pressable style={styles.cancelToggle} onPress={() => setShowCancellation((value) => !value)}><Text style={styles.cancelToggleText}>Cancel booking</Text></Pressable>
          {showCancellation ? (
            <View style={styles.cancelForm}>
              <Text style={styles.warning}>Cancellation charges and the refund amount are calculated by the server from this trip's cutoff policy.</Text>
              <TextInput style={styles.input} value={reason} onChangeText={setReason} placeholder="Reason for cancellation" placeholderTextColor={colors.muted} multiline />
              <Pressable style={[styles.dangerButton, cancelling && styles.disabled]} disabled={cancelling} onPress={() => Alert.alert("Confirm cancellation", "This releases your seats and cannot be undone.", [{ text: "Keep booking", style: "cancel" }, { text: "Cancel booking", style: "destructive", onPress: () => void cancel() }])}><Text style={styles.dangerText}>{cancelling ? "Cancelling..." : "Confirm cancellation"}</Text></Pressable>
            </View>
          ) : null}
        </View>
      ) : null}
    </ScrollView>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return <View style={styles.detail}><Text style={styles.detailLabel}>{label}</Text><Text style={styles.detailValue} selectable>{value}</Text></View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.wash }, centered: { flex: 1, alignItems: "center", justifyContent: "center" }, content: { padding: 18, gap: 14, paddingBottom: 40 },
  hero: { backgroundColor: colors.navy, borderRadius: radii.lg, padding: 17, gap: 5 }, brand: { color: colors.success, fontSize: 9, fontWeight: "900", letterSpacing: 1.2 }, route: { color: colors.surface, fontSize: 20, fontWeight: "900" }, status: { alignSelf: "flex-start", color: colors.success, backgroundColor: colors.navySoft, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 5, overflow: "hidden", fontSize: 8, fontWeight: "900" },
  liveCard: { backgroundColor: colors.successWash, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.success, padding: 14, gap: 5 }, liveHeader: { flexDirection: "row", alignItems: "center", gap: 7 }, liveDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.success }, liveTitle: { color: colors.success, fontSize: 10, fontWeight: "900" }, livePosition: { color: colors.ink, fontSize: 12, fontWeight: "800" }, liveMeta: { color: colors.text, fontSize: 9, lineHeight: 14 },
  ticket: { backgroundColor: colors.surface, borderRadius: radii.xl, borderWidth: 1, borderColor: colors.line, padding: 17, gap: 9, ...shadow }, qr: { alignSelf: "center", backgroundColor: colors.surface, alignItems: "center", justifyContent: "center", gap: 6, padding: 9, borderWidth: 1, borderColor: colors.line, borderRadius: radii.md }, qrReference: { color: colors.ink, fontSize: 8, fontWeight: "800" }, reference: { color: colors.navy, fontSize: 16, fontWeight: "900", textAlign: "center", marginBottom: 5 },
  detail: { flexDirection: "row", justifyContent: "space-between", gap: 12, borderBottomWidth: 1, borderBottomColor: colors.line, paddingBottom: 8 }, detailLabel: { color: colors.muted, fontSize: 10 }, detailValue: { flex: 1, color: colors.ink, fontSize: 10, fontWeight: "800", textAlign: "right" },
  card: { backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.line, padding: 15, gap: 11 }, sectionTitle: { color: colors.ink, fontSize: 14, fontWeight: "900" }, supportText: { color: colors.muted, fontSize: 10, lineHeight: 16 }, ratingRow: { flexDirection: "row", justifyContent: "center", gap: 8 }, star: { color: colors.line, fontSize: 30 }, starActive: { color: colors.warning },
  secondary: { minHeight: 45, borderWidth: 1, borderColor: colors.navy, borderRadius: radii.md, alignItems: "center", justifyContent: "center" }, secondaryText: { color: colors.navy, fontSize: 11, fontWeight: "900" }, cancelToggle: { minHeight: 42, alignItems: "center", justifyContent: "center" }, cancelToggleText: { color: colors.danger, fontSize: 11, fontWeight: "900" }, cancelForm: { gap: 10 }, warning: { color: colors.text, backgroundColor: colors.warningWash, borderRadius: radii.sm, padding: 10, fontSize: 9, lineHeight: 14 }, input: { minHeight: 80, textAlignVertical: "top", borderWidth: 1, borderColor: colors.line, borderRadius: radii.md, padding: 11, color: colors.ink }, dangerButton: { minHeight: 48, backgroundColor: colors.danger, borderRadius: radii.md, alignItems: "center", justifyContent: "center" }, dangerText: { color: colors.surface, fontSize: 11, fontWeight: "900" }, disabled: { opacity: 0.45 },
});
