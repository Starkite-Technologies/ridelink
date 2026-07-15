import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Text } from "../../components/Typography";
import { SeatMap } from "../../components/seat-map";
import { StateView } from "../../components/state-view";
import type { SeatAvailability } from "../../long-routes/types";
import { formatNad } from "../../long-routes/data";
import type { LongRoutesStackParamList } from "../../navigation/types";
import { api } from "../../api/client";
import { useAuth } from "../../auth/AuthContext";
import { colors, radii } from "../../theme";

type Props = NativeStackScreenProps<LongRoutesStackParamList, "SeatSelection">;

export default function SeatSelectionScreen({ route, navigation }: Props) {
  const { idToken } = useAuth();
  const [availability, setAvailability] = useState<SeatAvailability | null>(null);
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [holding, setHolding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const heldSeatsRef = useRef<string[]>([]);
  const proceedingRef = useRef(false);

  const loadSeats = useCallback(async (quiet = false) => {
    if (!quiet) setError(null);
    try {
      const result = await api.getTripSeats(route.params.tripId);
      setAvailability(result);
      setSelectedSeats((current) => current.filter((seatNumber) => result.seats.some((seat) => seat.seatNumber === seatNumber && seat.status === "AVAILABLE")));
    } catch (err) {
      if (!quiet) setError(err instanceof Error ? err.message : "Seats could not be loaded");
    }
  }, [route.params.tripId]);

  useEffect(() => {
    void loadSeats().finally(() => setLoading(false));
    const interval = setInterval(() => void loadSeats(true), 10_000);
    return () => clearInterval(interval);
  }, [loadSeats]);

  useEffect(() => () => {
    if (!proceedingRef.current && heldSeatsRef.current.length && idToken) {
      void api.releaseSeats(route.params.tripId, heldSeatsRef.current, idToken).catch(() => undefined);
    }
  }, [idToken, route.params.tripId]);

  const toggleSeat = (seatNumber: string) => setSelectedSeats((current) => current.includes(seatNumber) ? current.filter((seat) => seat !== seatNumber) : current.length < route.params.passengers ? [...current, seatNumber] : current);

  const continueBooking = async () => {
    if (!idToken) return Alert.alert("Sign in required", "Sign in to hold and book seats.");
    if (selectedSeats.length !== route.params.passengers) return Alert.alert("Select every seat", `Choose ${route.params.passengers} seat${route.params.passengers === 1 ? "" : "s"} to continue.`);
    setHolding(true);
    try {
      const hold = await api.holdSeats(route.params.tripId, selectedSeats, route.params.passengers, idToken);
      heldSeatsRef.current = hold.seatNumbers;
      proceedingRef.current = true;
      navigation.navigate("PassengerDetails", { tripId: route.params.tripId, seatNumbers: hold.seatNumbers, holdExpiresAt: hold.holdExpiresAt });
    } catch (err) {
      Alert.alert("Seat no longer available", err instanceof Error ? err.message : "Refresh the seat map and choose another seat.", [{ text: "Refresh seats", onPress: () => void loadSeats() }]);
    } finally { setHolding(false); }
  };

  if (loading) return <View style={styles.centered}><ActivityIndicator color={colors.success} /></View>;
  if (error || !availability) return <StateView title="Seat map unavailable" message={error ?? "This vehicle layout could not be loaded."} actionLabel="Refresh seats" onAction={() => { setLoading(true); void loadSeats().finally(() => setLoading(false)); }} />;
  const total = availability.seats.filter((seat) => selectedSeats.includes(seat.seatNumber)).reduce((sum, seat) => sum + seat.price, 0);
  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} contentInsetAdjustmentBehavior="automatic">
        <View style={styles.header}><Text style={styles.title}>Choose your exact seat</Text><Text style={styles.subtitle}>Select {route.params.passengers} available seat{route.params.passengers === 1 ? "" : "s"}. Availability refreshes automatically.</Text></View>
        <View style={styles.selectionCount}><Text style={styles.selectionLabel}>Seats selected</Text><Text style={styles.selectionValue}>{selectedSeats.length}/{route.params.passengers}</Text></View>
        <SeatMap seats={availability.seats} layoutTemplateId={availability.layoutTemplateId} selectedSeats={selectedSeats} onToggleSeat={toggleSeat} maxSelections={route.params.passengers} />
        <View style={styles.notice}><Text style={styles.noticeTitle}>Five-minute seat hold</Text><Text style={styles.noticeText}>When you continue, RideLink reserves these seats while you add passenger details. The backend verifies availability again before booking.</Text></View>
      </ScrollView>
      <View style={styles.footer}><View><Text style={styles.total}>{formatNad(total)}</Text><Text style={styles.totalMeta}>{selectedSeats.length ? `Seats ${selectedSeats.join(", ")}` : "No seats selected"}</Text></View><Pressable style={[styles.button, (selectedSeats.length !== route.params.passengers || holding) && styles.disabled]} disabled={selectedSeats.length !== route.params.passengers || holding} onPress={() => void continueBooking()}><Text style={styles.buttonText}>{holding ? "Holding seats..." : "Continue"}</Text></Pressable></View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface }, centered: { flex: 1, alignItems: "center", justifyContent: "center" }, content: { padding: 18, gap: 18, paddingBottom: 118 }, header: { gap: 5 }, title: { color: colors.ink, fontSize: 23, fontWeight: "900" }, subtitle: { color: colors.muted, fontSize: 13, lineHeight: 19 }, selectionCount: { flexDirection: "row", justifyContent: "space-between", backgroundColor: colors.wash, borderRadius: radii.md, padding: 13 }, selectionLabel: { color: colors.text, fontSize: 12, fontWeight: "800" }, selectionValue: { color: colors.success, fontSize: 14, fontWeight: "900", fontVariant: ["tabular-nums"] }, notice: { backgroundColor: colors.warningWash, borderRadius: radii.md, padding: 14, gap: 4 }, noticeTitle: { color: "#8c5b05", fontSize: 12, fontWeight: "900" }, noticeText: { color: colors.text, fontSize: 11, lineHeight: 17 }, footer: { position: "absolute", bottom: 0, left: 0, right: 0, minHeight: 88, padding: 14, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.line, flexDirection: "row", alignItems: "center", gap: 15, boxShadow: "0 -8px 22px rgba(15,23,42,0.08)" }, total: { color: colors.ink, fontSize: 19, fontWeight: "900", fontVariant: ["tabular-nums"] }, totalMeta: { color: colors.muted, fontSize: 10, marginTop: 2, maxWidth: 120 }, button: { flex: 1, minHeight: 52, backgroundColor: colors.navy, borderRadius: radii.md, alignItems: "center", justifyContent: "center" }, buttonText: { color: colors.surface, fontSize: 15, fontWeight: "900" }, disabled: { opacity: 0.45 },
});
