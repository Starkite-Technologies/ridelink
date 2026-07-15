import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import * as Location from "expo-location";
import { Text, TextInput } from "../../components/Typography";
import { SeatMap } from "../../components/seat-map";
import { StateView } from "../../components/state-view";
import DatePickerField from "../../components/DatePickerField";
import type { LongRouteTrip, SeatAvailability } from "../../long-routes/types";
import { formatDateTime, formatNad } from "../../long-routes/data";
import type { DriverStackParamList } from "../../navigation/types";
import { api } from "../../api/client";
import { useAuth } from "../../auth/AuthContext";
import { colors, radii, shadow } from "../../theme";

type Props = NativeStackScreenProps<DriverStackParamList, "DriverTripManagement">;
const NEXT_ACTION: Partial<Record<LongRouteTrip["status"], { action: string; label: string }>> = {
  DRAFT: { action: "PUBLISH", label: "Publish trip" }, PUBLISHED: { action: "CLOSE_BOOKING", label: "Close bookings" }, BOOKING_OPEN: { action: "CLOSE_BOOKING", label: "Close bookings" }, BOOKING_CLOSED: { action: "BOARDING", label: "Start boarding" }, BOARDING: { action: "START", label: "Depart" }, DEPARTED: { action: "IN_PROGRESS", label: "Mark in progress" }, IN_PROGRESS: { action: "ARRIVE", label: "Mark arrived" }, ARRIVED: { action: "COMPLETE", label: "Complete trip" },
};

export default function DriverTripManagementScreen({ route, navigation }: Props) {
  const { idToken } = useAuth();
  const [trip, setTrip] = useState<LongRouteTrip | null>(null);
  const [seats, setSeats] = useState<SeatAvailability | null>(null);
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [announcement, setAnnouncement] = useState("");
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleTime, setRescheduleTime] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [sharingLocation, setSharingLocation] = useState(false);
  const locationSubscription = useRef<Location.LocationSubscription | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => { if (!idToken) return; try { const [tripResult, seatResult] = await Promise.all([api.getDriverLongRoute(route.params.tripId, idToken), api.getDriverTripSeats(route.params.tripId, idToken)]); setTrip(tripResult); setSeats(seatResult); setSelectedSeats([]); setSharingLocation(Boolean(locationSubscription.current)); const localDeparture = new Date(tripResult.departureDateTime); setRescheduleDate(localDeparture.toISOString().slice(0, 10)); setRescheduleTime(localDeparture.toLocaleTimeString("en-NA", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Africa/Windhoek" })); setError(null); } catch (err) { setError(err instanceof Error ? err.message : "Trip could not be loaded"); } }, [idToken, route.params.tripId]);
  useEffect(() => { void load().finally(() => setLoading(false)); }, [load]);
  useEffect(() => () => locationSubscription.current?.remove(), []);
  const perform = async (action: string, payload: Record<string, unknown> = {}) => { if (!idToken) return; setBusy(true); try { await api.updateDriverLongRoute(route.params.tripId, { action, ...payload }, idToken); if (["ARRIVE", "COMPLETE", "CANCEL"].includes(action)) { locationSubscription.current?.remove(); locationSubscription.current = null; setSharingLocation(false); } await load(); Alert.alert("Trip updated", action === "SEND_ANNOUNCEMENT" ? "The announcement was sent to booked passengers." : "The new status is now visible to passengers."); } catch (err) { Alert.alert("Update failed", err instanceof Error ? err.message : "Try again."); } finally { setBusy(false); } };
  const startLocationSharing = async () => {
    if (!idToken) return;
    const permission = await Location.requestForegroundPermissionsAsync();
    if (!permission.granted) return Alert.alert("Location permission denied", "Enable location access in device settings to share your position during this trip.");
    try {
      locationSubscription.current?.remove();
      locationSubscription.current = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, timeInterval: 15_000, distanceInterval: 500 },
        (position) => void api.updateDriverLongRoute(route.params.tripId, { action: "UPDATE_LOCATION", latitude: position.coords.latitude, longitude: position.coords.longitude, accuracy: position.coords.accuracy ?? 0 }, idToken).catch(() => undefined)
      );
      setSharingLocation(true);
      Alert.alert("Location sharing started", "Only passengers connected to this active trip can see the latest trip position.");
    } catch (err) { Alert.alert("Location unavailable", err instanceof Error ? err.message : "Try again."); }
  };
  const stopLocationSharing = async () => {
    locationSubscription.current?.remove();
    locationSubscription.current = null;
    setSharingLocation(false);
    if (idToken) await api.updateDriverLongRoute(route.params.tripId, { action: "STOP_LOCATION_SHARING" }, idToken).catch(() => undefined);
  };
  if (loading) return <View style={styles.centered}><ActivityIndicator color={colors.success} /></View>;
  if (error || !trip || !seats) return <StateView title="Trip management unavailable" message={error ?? "Trip not found"} actionLabel="Try again" onAction={() => { setLoading(true); void load().finally(() => setLoading(false)); }} />;
  const next = NEXT_ACTION[trip.status];
  const seatAction = selectedSeats.some((number) => seats.seats.find((seat) => seat.seatNumber === number)?.status === "BLOCKED") ? "UNBLOCK_SEATS" : "BLOCK_SEATS";
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} contentInsetAdjustmentBehavior="automatic" keyboardShouldPersistTaps="handled">
      <View style={styles.hero}><Text style={styles.status}>{trip.status.replace(/_/g, " ")}</Text><Text style={styles.route}>{trip.departureTown} to {trip.destinationTown}</Text><Text style={styles.meta}>{formatDateTime(trip.departureDateTime)} • {trip.vehicle.registrationNumber}</Text></View>
      <View style={styles.stats}><Stat label="Booked" value={`${trip.bookedSeatCount}/${trip.totalSeatCount}`} /><Stat label="Available" value={String(trip.availableSeatCount)} /><Stat label="Expected earnings" value={formatNad(trip.bookedSeatCount * trip.basePrice)} /></View>
      <View style={styles.actions}>{next ? <Pressable style={styles.primary} disabled={busy} onPress={() => void perform(next.action)}><Text style={styles.primaryText}>{next.label}</Text></Pressable> : null}<Pressable style={styles.secondary} onPress={() => navigation.navigate("PassengerManifest", { tripId: trip.tripId })}><Text style={styles.secondaryText}>Passenger manifest & check-in</Text></Pressable>{["BOARDING", "DEPARTED", "IN_PROGRESS"].includes(trip.status) ? <Pressable style={sharingLocation ? styles.locationStop : styles.locationStart} onPress={() => sharingLocation ? void stopLocationSharing() : void startLocationSharing()}><Text style={sharingLocation ? styles.locationStopText : styles.locationStartText}>{sharingLocation ? "Stop location sharing" : "Share live trip location"}</Text></Pressable> : null}{!["COMPLETED", "CANCELLED"].includes(trip.status) ? <Pressable style={styles.dangerButton} disabled={busy} onPress={() => Alert.alert("Cancel this trip?", "All affected passengers must be notified and supported with refunds.", [{ text: "Keep trip", style: "cancel" }, { text: "Cancel trip", style: "destructive", onPress: () => void perform("CANCEL") }])}><Text style={styles.dangerText}>Cancel trip</Text></Pressable> : null}</View>
      {trip.recurringSeriesId ? <View style={styles.card}><Text style={styles.sectionTitle}>Recurring series</Text><Text style={styles.helper}>Pause or resume future occurrences that do not yet have bookings. Booked dates remain unchanged.</Text><Pressable style={styles.secondary} disabled={busy} onPress={() => void perform(trip.seriesPaused ? "RESUME_SERIES" : "PAUSE_SERIES")}><Text style={styles.secondaryText}>{trip.seriesPaused ? "Resume future trips" : "Pause future trips"}</Text></Pressable></View> : null}
      <View style={styles.card}><Text style={styles.sectionTitle}>Seat and passenger management</Text><Text style={styles.helper}>Tap available or blocked seats, then update their status. Booked and held seats cannot be changed.</Text><SeatMap seats={seats.seats} layoutTemplateId={seats.layoutTemplateId} selectedSeats={selectedSeats} maxSelections={8} interactiveStatuses={["AVAILABLE", "BLOCKED"]} onToggleSeat={(seatNumber) => { const seat = seats.seats.find((item) => item.seatNumber === seatNumber); if (!seat || !["AVAILABLE", "BLOCKED"].includes(seat.status)) return; setSelectedSeats((current) => current.includes(seatNumber) ? current.filter((item) => item !== seatNumber) : [...current, seatNumber]); }} />{selectedSeats.length ? <Pressable style={styles.secondary} disabled={busy} onPress={() => void perform(seatAction, { seatNumbers: selectedSeats })}><Text style={styles.secondaryText}>{seatAction === "BLOCK_SEATS" ? "Block" : "Unblock"} seats {selectedSeats.join(", ")}</Text></Pressable> : null}</View>
      <View style={styles.card}><Text style={styles.sectionTitle}>Announcement to passengers</Text><TextInput style={styles.input} value={announcement} onChangeText={setAnnouncement} placeholder="Pickup change, delay, boarding update..." placeholderTextColor={colors.muted} multiline maxLength={500} /><Pressable style={[styles.primary, !announcement.trim() && styles.disabled]} disabled={!announcement.trim() || busy} onPress={() => void perform("SEND_ANNOUNCEMENT", { message: announcement.trim() }).then(() => setAnnouncement(""))}><Text style={styles.primaryText}>Send to all booked passengers</Text></Pressable></View>
      {["DRAFT", "PUBLISHED", "BOOKING_OPEN"].includes(trip.status) ? <View style={styles.card}><Text style={styles.sectionTitle}>Reschedule departure</Text><Text style={styles.helper}>All booked passengers receive an in-app reschedule notification.</Text><DatePickerField label="New departure date" value={rescheduleDate} onChange={setRescheduleDate} /><TextInput style={styles.timeInput} value={rescheduleTime} onChangeText={setRescheduleTime} placeholder="08:00" placeholderTextColor={colors.muted} /><Pressable style={styles.secondary} disabled={busy} onPress={() => { const departure = new Date(`${rescheduleDate}T${rescheduleTime}:00+02:00`); if (Number.isNaN(departure.getTime())) return Alert.alert("Invalid departure", "Enter a valid date and 24-hour time."); void perform("RESCHEDULE", { departureDateTime: departure.toISOString() }); }}><Text style={styles.secondaryText}>Save new departure</Text></Pressable></View> : null}
      <View style={styles.card}><Text style={styles.sectionTitle}>Trip details</Text><Detail label="Booking closes" value={formatDateTime(trip.bookingCloseDateTime)} /><Detail label="Price per seat" value={formatNad(trip.basePrice)} /><Detail label="Pickup" value={trip.pickupPoints[0]?.name ?? "Not set"} /><Detail label="Drop-off" value={trip.dropOffPoints[0]?.name ?? "Not set"} /><Detail label="Cancellation" value={trip.cancellationPolicy} /></View>
    </ScrollView>
  );
}

function Stat({ label, value }: { label: string; value: string }) { return <View style={styles.stat}><Text style={styles.statValue}>{value}</Text><Text style={styles.statLabel}>{label}</Text></View>; }
function Detail({ label, value }: { label: string; value: string }) { return <View style={styles.detail}><Text style={styles.detailLabel}>{label}</Text><Text style={styles.detailValue}>{value}</Text></View>; }
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.wash }, centered: { flex: 1, alignItems: "center", justifyContent: "center" }, content: { padding: 18, gap: 14, paddingBottom: 36 }, hero: { backgroundColor: colors.navy, borderRadius: radii.lg, padding: 17, gap: 5 }, status: { alignSelf: "flex-start", color: colors.success, backgroundColor: colors.navySoft, borderRadius: 7, paddingHorizontal: 8, paddingVertical: 5, overflow: "hidden", fontSize: 8, fontWeight: "900" }, route: { color: colors.surface, fontSize: 20, fontWeight: "900" }, meta: { color: "#c9d7e6", fontSize: 10 }, stats: { flexDirection: "row", gap: 8 }, stat: { flex: 1, backgroundColor: colors.surface, borderRadius: radii.md, borderWidth: 1, borderColor: colors.line, padding: 11, gap: 3 }, statValue: { color: colors.navy, fontSize: 14, fontWeight: "900", fontVariant: ["tabular-nums"] }, statLabel: { color: colors.muted, fontSize: 8 }, actions: { gap: 8 }, primary: { minHeight: 50, backgroundColor: colors.navy, borderRadius: radii.md, alignItems: "center", justifyContent: "center", paddingHorizontal: 12 }, primaryText: { color: colors.surface, fontSize: 12, fontWeight: "900" }, secondary: { minHeight: 48, borderWidth: 1, borderColor: colors.navy, borderRadius: radii.md, alignItems: "center", justifyContent: "center", paddingHorizontal: 12 }, secondaryText: { color: colors.navy, fontSize: 11, fontWeight: "900", textAlign: "center" }, locationStart: { minHeight: 48, backgroundColor: colors.success, borderRadius: radii.md, alignItems: "center", justifyContent: "center" }, locationStartText: { color: colors.navy, fontSize: 11, fontWeight: "900" }, locationStop: { minHeight: 48, borderWidth: 1, borderColor: colors.warning, backgroundColor: colors.warningWash, borderRadius: radii.md, alignItems: "center", justifyContent: "center" }, locationStopText: { color: "#8c5b05", fontSize: 11, fontWeight: "900" }, dangerButton: { minHeight: 45, alignItems: "center", justifyContent: "center" }, dangerText: { color: colors.danger, fontSize: 11, fontWeight: "900" }, card: { backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.line, padding: 15, gap: 12, ...shadow }, sectionTitle: { color: colors.ink, fontSize: 15, fontWeight: "900" }, helper: { color: colors.muted, fontSize: 10, lineHeight: 15 }, input: { minHeight: 92, textAlignVertical: "top", borderWidth: 1, borderColor: colors.line, borderRadius: radii.md, padding: 12, backgroundColor: colors.wash, color: colors.ink, fontSize: 13 }, timeInput: { minHeight: 48, borderWidth: 1, borderColor: colors.line, borderRadius: radii.md, paddingHorizontal: 12, backgroundColor: colors.wash, color: colors.ink, fontSize: 13 }, disabled: { opacity: 0.45 }, detail: { flexDirection: "row", justifyContent: "space-between", gap: 14, borderBottomWidth: 1, borderBottomColor: colors.line, paddingBottom: 9 }, detailLabel: { color: colors.muted, fontSize: 10 }, detailValue: { flex: 1, color: colors.ink, fontSize: 10, fontWeight: "800", textAlign: "right" },
});
