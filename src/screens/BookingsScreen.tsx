import { useCallback, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, View } from "react-native";
import { Text } from "../components/Typography";
import { useFocusEffect } from "@react-navigation/native";
import { api, type Booking } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { colors, radii, shadow } from "../theme";

export default function BookingsScreen() {
  const { idToken, isSignedIn } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!isSignedIn || !idToken) {
        setBookings([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      api
        .listBookings(idToken)
        .then(setBookings)
        .catch((err) => setError(err instanceof Error ? err.message : "Failed to load bookings"))
        .finally(() => setLoading(false));
    }, [idToken, isSignedIn])
  );

  if (!isSignedIn) {
    return (
      <View style={styles.centered}>
        <Text style={styles.empty}>Sign in to see your bookings.</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.error}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={bookings}
        keyExtractor={(booking) => booking.bookingId}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title}>My Bookings</Text>
            <View style={styles.segment}>
              <Text style={styles.segmentActive}>Upcoming</Text>
              <Text style={styles.segmentText}>Past</Text>
            </View>
          </View>
        }
        ListEmptyComponent={<Text style={styles.empty}>No bookings yet.</Text>}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.routeBlock}>
                <Text style={styles.route}>Trip {item.tripId}</Text>
                <Text style={styles.meta}>{item.createdAt}</Text>
              </View>
              <Text style={styles.status}>{item.status}</Text>
            </View>
            <View style={styles.details}>
              <Detail label="Driver" value={item.riderId.slice(0, 10)} />
              <Detail label="Seat" value={`${item.seats} seat`} />
              <Detail label="Price" value="Confirmed" />
            </View>
            <View style={styles.detailButton}>
              <Text style={styles.detailButtonText}>View details</Text>
            </View>
          </View>
        )}
      />
    </View>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detail}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.wash },
  centered: { flex: 1, backgroundColor: colors.wash, alignItems: "center", justifyContent: "center" },
  error: { color: colors.danger },
  list: { padding: 16, gap: 12, flexGrow: 1 },
  header: { gap: 18, paddingBottom: 4 },
  title: { color: colors.ink, fontSize: 24, fontWeight: "800" },
  segment: {
    alignSelf: "center",
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: 4,
    borderWidth: 1,
    borderColor: colors.line,
  },
  segmentActive: {
    backgroundColor: colors.navy,
    color: colors.surface,
    borderRadius: radii.sm,
    overflow: "hidden",
    paddingHorizontal: 22,
    paddingVertical: 10,
    fontWeight: "800",
  },
  segmentText: { color: colors.muted, paddingHorizontal: 22, paddingVertical: 10, fontWeight: "700" },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 16,
    gap: 16,
    ...shadow,
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
  routeBlock: { flex: 1, gap: 4 },
  route: { color: colors.ink, fontSize: 16, fontWeight: "800" },
  meta: { color: colors.muted, fontSize: 12 },
  status: {
    color: colors.success,
    backgroundColor: colors.successWash,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    overflow: "hidden",
    fontSize: 12,
    fontWeight: "800",
  },
  details: { flexDirection: "row", justifyContent: "space-between", gap: 10 },
  detail: { flex: 1, gap: 4 },
  detailLabel: { color: colors.muted, fontSize: 11, fontWeight: "700" },
  detailValue: { color: colors.ink, fontSize: 12, fontWeight: "800" },
  detailButton: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.md,
    alignItems: "center",
    paddingVertical: 11,
  },
  detailButtonText: { color: colors.navy, fontWeight: "800" },
  empty: { textAlign: "center", marginTop: 40, color: colors.muted },
});
