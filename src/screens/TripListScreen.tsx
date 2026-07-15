import { useCallback, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, View } from "react-native";
import { Text } from "../components/Typography";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { TripsStackParamList } from "../navigation/types";
import type { Trip } from "../types";
import { api } from "../api/client";
import { colors, radii, shadow } from "../theme";

type Props = NativeStackScreenProps<TripsStackParamList, "TripList">;

export default function TripListScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTrips = useCallback(async () => {
    try {
      setError(null);
      const data = await api.listTrips();
      setTrips(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load trips");
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadTrips().finally(() => setLoading(false));
    }, [loadTrips])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadTrips();
    setRefreshing(false);
  };

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
        data={trips}
        keyExtractor={(trip) => trip.tripId}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        ListHeaderComponent={
          <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
            <View style={styles.titleRow}>
              <View>
                <View style={styles.workspaceLabel}><View style={styles.workspaceDot} /><Text style={styles.workspaceText}>PASSENGER WORKSPACE</Text></View>
                <Text style={styles.title}>Local rides</Text>
                <Text style={styles.subtitle}>Find your next ride</Text>
              </View>
              <View style={styles.searchButton}>
                <Text style={styles.searchText}>S</Text>
              </View>
            </View>

            <View style={styles.filterGrid}>
              <View style={styles.filterCard}>
                <Text style={styles.filterLabel}>From</Text>
                <Text style={styles.filterValue}>Windhoek</Text>
              </View>
              <View style={styles.filterCard}>
                <Text style={styles.filterLabel}>To</Text>
                <Text style={styles.filterValue}>Anywhere</Text>
              </View>
              <View style={styles.filterCard}>
                <Text style={styles.filterLabel}>Date</Text>
                <Text style={styles.filterValue}>Next ride</Text>
              </View>
              <View style={styles.filterCard}>
                <Text style={styles.filterLabel}>Filters</Text>
                <Text style={styles.filterValue}>All</Text>
              </View>
            </View>

            <Text style={styles.count}>{trips.length} trips found</Text>
          </View>
        }
        ListEmptyComponent={<Text style={styles.empty}>No trips yet. Be the first to post one!</Text>}
        renderItem={({ item }) => (
          <Pressable style={styles.card} onPress={() => navigation.navigate("TripDetail", { tripId: item.tripId })}>
            <View style={styles.cardTop}>
              <View style={styles.routeBlock}>
                <Text style={styles.route}>{item.origin}{" -> "}{item.destination}</Text>
                <Text style={styles.meta}>{item.date} - {item.driverName}</Text>
              </View>
              <View style={styles.priceBlock}>
                <Text style={styles.price}>N${item.pricePerSeat}</Text>
                <Text style={styles.perSeat}>per seat</Text>
              </View>
            </View>
            <View style={styles.cardBottom}>
              <View style={styles.driverAvatar}>
                <Text style={styles.driverInitial}>{item.driverName.charAt(0).toUpperCase()}</Text>
              </View>
              <View style={styles.driverInfo}>
                <Text style={styles.driverName}>{item.driverName}</Text>
                <Text style={styles.seats}>{item.seatsAvailable} seats left</Text>
              </View>
              <View style={styles.carBadge}>
                <Text style={styles.carText}>CAR</Text>
              </View>
            </View>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.wash },
  centered: { flex: 1, backgroundColor: colors.wash, alignItems: "center", justifyContent: "center" },
  error: { color: colors.danger },
  list: { padding: 16, paddingBottom: 24, gap: 12 },
  header: { gap: 16, paddingBottom: 4 },
  titleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  workspaceLabel: { flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 3 },
  workspaceDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.success },
  workspaceText: { color: colors.success, fontSize: 8, fontWeight: "900", letterSpacing: 0.8 },
  title: { color: colors.ink, fontSize: 28, fontWeight: "800" },
  subtitle: { color: colors.muted, fontSize: 13, marginTop: 2 },
  searchButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
  },
  searchText: { color: colors.navy, fontSize: 13, fontWeight: "800" },
  filterGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  filterCard: {
    width: "48%",
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 12,
    gap: 4,
  },
  filterLabel: { color: colors.muted, fontSize: 11, fontWeight: "700" },
  filterValue: { color: colors.ink, fontSize: 14, fontWeight: "700" },
  count: { color: colors.text, fontSize: 13, fontWeight: "700" },
  empty: { textAlign: "center", marginTop: 40, color: colors.muted },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: 16,
    gap: 16,
    borderWidth: 1,
    borderColor: colors.line,
    ...shadow,
  },
  cardTop: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
  routeBlock: { flex: 1, gap: 4 },
  route: { color: colors.ink, fontSize: 17, fontWeight: "800" },
  meta: { color: colors.muted, fontSize: 13 },
  priceBlock: { alignItems: "flex-end" },
  price: { color: colors.ink, fontSize: 16, fontWeight: "800", fontVariant: ["tabular-nums"] },
  perSeat: { color: colors.muted, fontSize: 11 },
  cardBottom: { flexDirection: "row", alignItems: "center", gap: 10 },
  driverAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.navy,
    alignItems: "center",
    justifyContent: "center",
  },
  driverInitial: { color: colors.surface, fontSize: 15, fontWeight: "800" },
  driverInfo: { flex: 1 },
  driverName: { color: colors.ink, fontSize: 13, fontWeight: "700" },
  seats: { color: colors.success, fontSize: 12, marginTop: 2 },
  carBadge: { backgroundColor: colors.wash, borderRadius: radii.sm, paddingHorizontal: 12, paddingVertical: 8 },
  carText: { color: colors.navy, fontSize: 11, fontWeight: "800" },
});
