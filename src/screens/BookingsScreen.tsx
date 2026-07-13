import { useCallback, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from "react-native";
import { Text } from "../components/Typography";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api, type Booking } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { colors, radii, shadow } from "../theme";

export default function BookingsScreen() {
  const { idToken, isSignedIn } = useAuth();
  const insets = useSafeAreaInsets();
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
        <View style={styles.emptyIcon}>
          <Text style={styles.emptyIconText}>BK</Text>
        </View>
        <Text style={styles.emptyTitle}>Sign in to see your bookings</Text>
        <Text style={styles.empty}>Your upcoming and past trips will show up here.</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.navy} />
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
          <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
            <Text style={styles.title}>My Bookings</Text>
            <View style={styles.segment}>
              <Text style={styles.segmentActive}>Upcoming</Text>
              <Text style={styles.segmentText}>Past</Text>
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Text style={styles.emptyIconText}>BK</Text>
            </View>
            <Text style={styles.emptyTitle}>No bookings yet</Text>
            <Text style={styles.empty}>Once you book a seat on a trip, it'll show up here.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.tripIcon}>
                <Text style={styles.tripIconText}>TR</Text>
              </View>
              <View style={styles.routeBlock}>
                <Text style={styles.route}>Booking #{item.bookingId.slice(0, 8).toUpperCase()}</Text>
                <Text style={styles.meta}>{item.createdAt}</Text>
              </View>
              <Text style={styles.status}>{item.status}</Text>
            </View>
            <View style={styles.details}>
              <Detail label="Seats" value={`${item.seats}`} />
              <Detail label="Trip ref" value={item.tripId.slice(0, 8).toUpperCase()} />
              <Detail label="Payment" value="Confirmed" />
            </View>
            <Pressable style={({ pressed }) => [styles.detailButton, pressed && styles.pressed]}>
              <Text style={styles.detailButtonText}>View details</Text>
              <Text style={styles.detailButtonArrow}>{"->"}</Text>
            </Pressable>
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
  centered: { flex: 1, backgroundColor: colors.wash, alignItems: "center", justifyContent: "center", paddingHorizontal: 32, gap: 6 },
  error: { color: colors.danger },
  list: { padding: 16, gap: 12, flexGrow: 1 },
  header: { gap: 18, paddingBottom: 4 },
  title: { color: colors.ink, fontSize: 24, fontWeight: "800" },
  segment: {
    alignSelf: "center",
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderCurve: "continuous",
    padding: 4,
    borderWidth: 1,
    borderColor: colors.line,
  },
  segmentActive: {
    backgroundColor: colors.navy,
    color: colors.surface,
    borderRadius: radii.sm,
    borderCurve: "continuous",
    overflow: "hidden",
    paddingHorizontal: 22,
    paddingVertical: 10,
    fontWeight: "800",
  },
  segmentText: { color: colors.muted, paddingHorizontal: 22, paddingVertical: 10, fontWeight: "700" },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderCurve: "continuous",
    borderWidth: 1,
    borderColor: colors.line,
    padding: 16,
    gap: 16,
    ...shadow,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  tripIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderCurve: "continuous",
    backgroundColor: colors.successWash,
    alignItems: "center",
    justifyContent: "center",
  },
  tripIconText: { color: colors.success, fontSize: 11, fontWeight: "900" },
  routeBlock: { flex: 1, gap: 2 },
  route: { color: colors.ink, fontSize: 15, fontWeight: "800" },
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.md,
    borderCurve: "continuous",
    paddingVertical: 11,
  },
  pressed: { opacity: 0.7 },
  detailButtonText: { color: colors.navy, fontWeight: "800" },
  detailButtonArrow: { color: colors.navy, fontWeight: "800" },
  emptyState: { alignItems: "center", paddingHorizontal: 32, paddingTop: 40, gap: 6 },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    borderCurve: "continuous",
    backgroundColor: colors.wash,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  emptyIconText: { color: colors.navy, fontSize: 13, fontWeight: "900" },
  emptyTitle: { color: colors.ink, fontSize: 16, fontWeight: "800", textAlign: "center" },
  empty: { textAlign: "center", color: colors.muted, fontSize: 13, lineHeight: 19 },
});
