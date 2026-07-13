import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Text } from "../components/Typography";
import BackButton from "../components/BackButton";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { TripsStackParamList } from "../navigation/types";
import type { Trip } from "../types";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { colors, radii } from "../theme";

type Props = NativeStackScreenProps<TripsStackParamList, "TripDetail">;

export default function TripDetailScreen({ route, navigation }: Props) {
  const { idToken, isSignedIn } = useAuth();
  const insets = useSafeAreaInsets();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);

  useEffect(() => {
    api
      .getTrip(route.params.tripId)
      .then(setTrip)
      .catch(() => setTrip(null))
      .finally(() => setLoading(false));
  }, [route.params.tripId]);

  const handleBook = async () => {
    if (!isSignedIn || !idToken) {
      Alert.alert("Sign in required", "Please sign in to book a seat.");
      return;
    }
    if (!trip) return;

    setBooking(true);
    try {
      await api.createBooking(trip.tripId, 1, idToken);
      Alert.alert("Booked!", "Your seat has been booked.");
      const updated = await api.getTrip(trip.tripId);
      setTrip(updated);
    } catch (err) {
      Alert.alert("Booking failed", err instanceof Error ? err.message : "Please try again.");
    } finally {
      setBooking(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!trip) {
    return (
      <View style={styles.centered}>
        <Text>Trip not found.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} contentInsetAdjustmentBehavior="automatic">
      <View style={[styles.hero, { paddingTop: insets.top }]}>
        <BackButton onPress={() => navigation.goBack()} topOffset={insets.top + 16} />
        <View style={styles.sun} />
        <View style={styles.road} />
        <Text style={styles.heroTitle}>Trip details</Text>
      </View>

      <View style={styles.summary}>
        <View style={styles.routeRow}>
          <Text style={styles.route}>{trip.origin}{" -> "}{trip.destination}</Text>
          <Text style={styles.status}>Open</Text>
        </View>
        <Text style={styles.meta}>{trip.date} - 08:00</Text>
      </View>

      <View style={styles.driverCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{trip.driverName.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={styles.driverText}>
          <Text style={styles.driverName}>{trip.driverName}</Text>
          <Text style={styles.rating}>4.8 rating</Text>
        </View>
        <Pressable style={styles.messageButton}>
          <Text style={styles.messageText}>Message</Text>
        </Pressable>
      </View>

      <View style={styles.infoList}>
        <InfoRow label="Pickup" value={trip.origin} />
        <InfoRow label="Drop-off" value={trip.destination} />
        <InfoRow label="Available seats" value={`${trip.seatsAvailable}`} />
        <InfoRow label="Price per seat" value={`N$${trip.pricePerSeat}`} />
        <InfoRow label="Vehicle" value="Toyota Corolla" />
        <InfoRow label="Amenities" value="Aircon - Music - Luggage" />
      </View>

      <Pressable
        style={[styles.button, (booking || trip.seatsAvailable < 1) && styles.buttonDisabled]}
        onPress={handleBook}
        disabled={booking || trip.seatsAvailable < 1}
      >
        <Text style={styles.buttonText}>
          {trip.seatsAvailable < 1 ? "Fully Booked" : booking ? "Booking..." : "Book a seat"}
        </Text>
      </Pressable>
    </ScrollView>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIcon}>
        <Text style={styles.infoIconText}>{label.charAt(0)}</Text>
      </View>
      <View style={styles.infoCopy}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  content: { paddingBottom: 28 },
  centered: { flex: 1, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" },
  hero: { minHeight: 210, backgroundColor: colors.navy, overflow: "hidden", justifyContent: "flex-end", padding: 20 },
  sun: { position: "absolute", right: 28, top: 70, width: 62, height: 62, borderRadius: 31, backgroundColor: "#f59e42" },
  road: {
    position: "absolute",
    left: -20,
    bottom: -58,
    width: 360,
    height: 150,
    borderRadius: 120,
    backgroundColor: colors.navySoft,
    transform: [{ rotate: "-8deg" }],
  },
  heroTitle: { color: colors.surface, fontSize: 16, fontWeight: "800", textAlign: "center" },
  summary: { padding: 20, gap: 6, borderBottomWidth: 1, borderBottomColor: colors.line },
  routeRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  route: { flex: 1, color: colors.ink, fontSize: 22, fontWeight: "800" },
  status: {
    color: colors.success,
    backgroundColor: colors.successWash,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
    overflow: "hidden",
    fontSize: 12,
    fontWeight: "800",
  },
  meta: { color: colors.muted, fontSize: 14 },
  driverCard: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingVertical: 16, gap: 12 },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.navy, alignItems: "center", justifyContent: "center" },
  avatarText: { color: colors.surface, fontSize: 18, fontWeight: "800" },
  driverText: { flex: 1 },
  driverName: { color: colors.ink, fontSize: 16, fontWeight: "800" },
  rating: { color: colors.warning, fontSize: 12, marginTop: 2 },
  messageButton: { borderWidth: 1, borderColor: colors.line, borderRadius: radii.md, paddingHorizontal: 14, paddingVertical: 9 },
  messageText: { color: colors.navy, fontWeight: "800" },
  infoList: { paddingHorizontal: 20, gap: 16 },
  infoRow: { flexDirection: "row", gap: 12 },
  infoIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: colors.wash,
    alignItems: "center",
    justifyContent: "center",
  },
  infoIconText: { color: colors.navy, fontSize: 12, fontWeight: "800" },
  infoCopy: { flex: 1, gap: 2 },
  infoLabel: { color: colors.ink, fontSize: 14, fontWeight: "700" },
  infoValue: { color: colors.text, fontSize: 14 },
  button: {
    marginHorizontal: 20,
    marginTop: 28,
    backgroundColor: colors.navy,
    borderRadius: radii.lg,
    paddingVertical: 17,
    alignItems: "center",
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: colors.surface, fontSize: 16, fontWeight: "800" },
});
