import { Alert, Pressable, ScrollView, Share, StyleSheet, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import QRCode from "react-native-qrcode-svg";
import { Text } from "../../components/Typography";
import { formatDateTime, formatNad } from "../../long-routes/data";
import type { LongRoutesStackParamList } from "../../navigation/types";
import { colors, radii, shadow } from "../../theme";

type Props = NativeStackScreenProps<LongRoutesStackParamList, "BookingConfirmation">;

export default function BookingConfirmationScreen({ route, navigation }: Props) {
  const { booking } = route.params;
  const share = () => void Share.share({ message: `RideLink booking ${booking.bookingReference}: ${booking.tripSnapshot.departureTown} to ${booking.tripSnapshot.destinationTown}, ${formatDateTime(booking.tripSnapshot.departureDateTime)}, seats ${booking.seatNumbers.join(", ")}.` });
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} contentInsetAdjustmentBehavior="automatic">
      <View style={styles.successIcon}><Text style={styles.successCheck}>✓</Text></View><Text style={styles.title}>Your trip is booked!</Text><Text style={styles.subtitle}>Keep this ticket ready when boarding.</Text>
      <View style={styles.ticket}>
        <View style={styles.ticketTop}><Text style={styles.brand}>RIDELINK</Text><Text style={styles.status}>{booking.bookingStatus}</Text></View>
        <Text style={styles.route}>{booking.tripSnapshot.departureTown}</Text><Text style={styles.arrow}>↓</Text><Text style={styles.route}>{booking.tripSnapshot.destinationTown}</Text>
        <View style={styles.divider} />
        <Detail label="Booking reference" value={booking.bookingReference} /><Detail label="Departure" value={formatDateTime(booking.tripSnapshot.departureDateTime)} /><Detail label="Operator" value={booking.tripSnapshot.operatorName} /><Detail label="Vehicle" value={`${booking.tripSnapshot.vehicle.make} ${booking.tripSnapshot.vehicle.model} • ${booking.tripSnapshot.vehicle.registrationNumber}`} /><Detail label="Seat numbers" value={booking.seatNumbers.join(", ")} /><Detail label="Payment" value={booking.paymentStatus.replace(/_/g, " ")} /><Detail label="Total" value={formatNad(booking.totalAmount)} />
        <View style={styles.qrPlaceholder}><QRCode value={JSON.stringify({ type: "RIDELINK_TICKET", bookingId: booking.bookingId, reference: booking.bookingReference })} size={92} color={colors.navy} backgroundColor={colors.surface} /><Text style={styles.qrRef} selectable>{booking.bookingReference}</Text></View>
      </View>
      <View style={styles.actions}><Pressable style={styles.primaryButton} onPress={() => navigation.navigate("BookingDetail", { bookingId: booking.bookingId })}><Text style={styles.primaryText}>View full ticket</Text></Pressable><Pressable style={styles.secondaryButton} onPress={share}><Text style={styles.secondaryText}>Share booking</Text></Pressable><Pressable style={styles.secondaryButton} onPress={() => Alert.alert("Calendar", "Calendar integration is ready for the device calendar permission flow.")}><Text style={styles.secondaryText}>Add to calendar</Text></Pressable></View>
      <Text style={styles.policy}>Cancellation terms are shown in your booking details. Contact the operator or RideLink support if your pickup details change.</Text>
    </ScrollView>
  );
}

function Detail({ label, value }: { label: string; value: string }) { return <View style={styles.detail}><Text style={styles.detailLabel}>{label}</Text><Text style={styles.detailValue} selectable>{value}</Text></View>; }
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.wash }, content: { padding: 20, alignItems: "center", gap: 9, paddingBottom: 40 }, successIcon: { width: 66, height: 66, borderRadius: 33, backgroundColor: colors.success, alignItems: "center", justifyContent: "center" }, successCheck: { color: colors.surface, fontSize: 32, fontWeight: "900" }, title: { color: colors.ink, fontSize: 24, fontWeight: "900", textAlign: "center" }, subtitle: { color: colors.muted, fontSize: 13, marginBottom: 8 }, ticket: { alignSelf: "stretch", backgroundColor: colors.surface, borderRadius: radii.xl, padding: 18, gap: 8, borderWidth: 1, borderColor: colors.line, ...shadow }, ticketTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }, brand: { color: colors.navy, fontSize: 12, fontWeight: "900", letterSpacing: 1.4 }, status: { color: colors.success, backgroundColor: colors.successWash, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 5, overflow: "hidden", fontSize: 9, fontWeight: "900" }, route: { color: colors.ink, fontSize: 20, fontWeight: "900" }, arrow: { color: colors.success, fontSize: 18 }, divider: { height: 1, backgroundColor: colors.line, marginVertical: 5 }, detail: { flexDirection: "row", justifyContent: "space-between", gap: 18 }, detailLabel: { color: colors.muted, fontSize: 10 }, detailValue: { flex: 1, color: colors.ink, textAlign: "right", fontSize: 11, fontWeight: "800" }, qrPlaceholder: { alignSelf: "center", marginTop: 10, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center", gap: 7, padding: 10, borderWidth: 1, borderColor: colors.line, borderRadius: radii.md }, qrRef: { color: colors.ink, fontSize: 8, fontWeight: "800" }, actions: { alignSelf: "stretch", gap: 9, marginTop: 6 }, primaryButton: { minHeight: 52, backgroundColor: colors.navy, borderRadius: radii.md, alignItems: "center", justifyContent: "center" }, primaryText: { color: colors.surface, fontSize: 14, fontWeight: "900" }, secondaryButton: { minHeight: 48, borderWidth: 1, borderColor: colors.navy, borderRadius: radii.md, alignItems: "center", justifyContent: "center" }, secondaryText: { color: colors.navy, fontSize: 13, fontWeight: "800" }, policy: { color: colors.muted, fontSize: 10, lineHeight: 15, textAlign: "center", paddingHorizontal: 10 },
});
