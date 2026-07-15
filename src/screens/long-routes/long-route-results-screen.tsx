import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Pressable, RefreshControl, StyleSheet, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Text } from "../../components/Typography";
import { StateView } from "../../components/state-view";
import type { LongRouteTrip, TripSearch } from "../../long-routes/types";
import { formatDateTime, formatDuration, formatNad } from "../../long-routes/data";
import type { LongRoutesStackParamList } from "../../navigation/types";
import { api } from "../../api/client";
import { useAuth } from "../../auth/AuthContext";
import { colors, radii, shadow } from "../../theme";

type Props = NativeStackScreenProps<LongRoutesStackParamList, "LongRouteResults">;
const SORTS: Array<{ key: NonNullable<TripSearch["sort"]>; label: string }> = [
  { key: "EARLIEST", label: "Earliest" }, { key: "LOWEST_PRICE", label: "Lowest price" }, { key: "SHORTEST", label: "Shortest" }, { key: "HIGHEST_RATING", label: "Top rated" }, { key: "MOST_SEATS", label: "Most seats" },
];

export default function LongRouteResultsScreen({ route, navigation }: Props) {
  const { idToken } = useAuth();
  const [search, setSearch] = useState(route.params.search);
  const [trips, setTrips] = useState<LongRouteTrip[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [directOnly, setDirectOnly] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const result = await api.searchLongRoutes({ ...search, verifiedOnly, directOnly });
      setTrips(result.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Trips could not be loaded");
    }
  }, [directOnly, search, verifiedOnly]);

  useEffect(() => { setLoading(true); void load().finally(() => setLoading(false)); }, [load]);

  const createRequest = async () => {
    if (!idToken) return Alert.alert("Sign in required", "Sign in to receive matching trip notifications.");
    try {
      await api.createTravelRequest({ ...search, preferredDate: search.date, contactPreferences: ["IN_APP"] }, idToken);
      Alert.alert("Travel request created", "We'll notify you when a matching trip is published.");
    } catch (err) { Alert.alert("Couldn't create request", err instanceof Error ? err.message : "Please try again."); }
  };

  if (loading) return <View style={styles.centered}><ActivityIndicator color={colors.success} /></View>;
  if (error) return <StateView title="Trips couldn't load" message={error} actionLabel="Try again" onAction={() => { setLoading(true); void load().finally(() => setLoading(false)); }} />;
  return (
    <FlatList
      style={styles.screen}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic"
      data={trips}
      keyExtractor={(item) => item.tripId}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load().finally(() => setRefreshing(false)); }} />}
      ListHeaderComponent={
        <View style={styles.header}>
          <Text style={styles.title}>{search.departureTown} to {search.destinationTown}</Text>
          <Text style={styles.subtitle}>{search.date} • {search.passengers} passenger{search.passengers === 1 ? "" : "s"}</Text>
          <View style={styles.filters}>
            <Pressable style={[styles.filter, verifiedOnly && styles.filterActive]} onPress={() => setVerifiedOnly((value) => !value)}><Text style={[styles.filterText, verifiedOnly && styles.filterTextActive]}>Verified only</Text></Pressable>
            <Pressable style={[styles.filter, directOnly && styles.filterActive]} onPress={() => setDirectOnly((value) => !value)}><Text style={[styles.filterText, directOnly && styles.filterTextActive]}>Direct trips</Text></Pressable>
          </View>
          <FlatList horizontal data={SORTS} keyExtractor={(item) => item.key} showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sorts} renderItem={({ item }) => (
            <Pressable style={[styles.sort, search.sort === item.key && styles.sortActive]} onPress={() => setSearch((current) => ({ ...current, sort: item.key }))}><Text style={[styles.sortText, search.sort === item.key && styles.sortTextActive]}>{item.label}</Text></Pressable>
          )} />
          <Text style={styles.count}>{trips.length} trip{trips.length === 1 ? "" : "s"} available</Text>
        </View>
      }
      ListEmptyComponent={<StateView title="No matching trips yet" message="Try another travel date, search a nearby town, or create a request and we'll alert you." actionLabel="Create travel request" onAction={() => void createRequest()} />}
      renderItem={({ item }) => <TripCard trip={item} passengers={search.passengers} onPress={() => navigation.navigate("LongRouteDetail", { tripId: item.tripId, passengers: search.passengers })} />}
    />
  );
}

function TripCard({ trip, onPress }: { trip: LongRouteTrip; passengers: number; onPress: () => void }) {
  return (
    <Pressable style={({ pressed }) => [styles.card, pressed && styles.pressed]} onPress={onPress}>
      <View style={styles.cardHeader}><View style={{ flex: 1 }}><View style={styles.operatorRow}><Text style={styles.operator}>{trip.operatorName}</Text>{trip.operatorVerified ? <Text style={styles.verified}>VERIFIED</Text> : null}</View><Text style={styles.vehicle}>{trip.vehicle.vehicleType} • {trip.vehicle.make} {trip.vehicle.model}</Text></View><View><Text style={styles.price}>{formatNad(trip.basePrice)}</Text><Text style={styles.perSeat}>per seat</Text></View></View>
      <View style={styles.timeline}><View><Text style={styles.time}>{new Date(trip.departureDateTime).toLocaleTimeString("en-NA", { hour: "2-digit", minute: "2-digit" })}</Text><Text style={styles.town}>{trip.departureTown}</Text></View><View style={styles.lineBlock}><View style={styles.line} /><Text style={styles.duration}>{formatDuration(trip.routeDurationMinutes)}</Text></View><View style={{ alignItems: "flex-end" }}><Text style={styles.time}>{new Date(trip.estimatedArrivalDateTime).toLocaleTimeString("en-NA", { hour: "2-digit", minute: "2-digit" })}</Text><Text style={styles.town}>{trip.destinationTown}</Text></View></View>
      <Text style={styles.date}>{formatDateTime(trip.departureDateTime)}</Text>
      <View style={styles.tags}>{trip.amenities.slice(0, 3).map((amenity) => <Text key={amenity} style={styles.tag}>{amenity}</Text>)}</View>
      <View style={styles.cardFooter}><Text style={styles.rating}>★ {trip.driverRating.toFixed(1)}</Text><Text style={styles.seats}>{trip.availableSeatCount} seats left</Text><Text style={styles.policy}>{trip.cancellationPolicy}</Text></View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.wash }, centered: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.wash }, content: { padding: 16, gap: 12, paddingBottom: 30 },
  header: { gap: 10, paddingBottom: 4 }, title: { color: colors.ink, fontSize: 23, fontWeight: "900" }, subtitle: { color: colors.muted, fontSize: 13 }, filters: { flexDirection: "row", gap: 8 }, filter: { borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface, borderRadius: 99, paddingHorizontal: 12, paddingVertical: 8 }, filterActive: { backgroundColor: colors.navy, borderColor: colors.navy }, filterText: { color: colors.text, fontSize: 11, fontWeight: "800" }, filterTextActive: { color: colors.surface }, sorts: { gap: 7 }, sort: { backgroundColor: colors.surface, borderRadius: radii.sm, paddingHorizontal: 11, paddingVertical: 8, borderWidth: 1, borderColor: colors.line }, sortActive: { backgroundColor: colors.successWash, borderColor: colors.success }, sortText: { color: colors.muted, fontSize: 10, fontWeight: "700" }, sortTextActive: { color: colors.success, fontWeight: "900" }, count: { color: colors.text, fontSize: 12, fontWeight: "800" },
  card: { backgroundColor: colors.surface, borderRadius: radii.lg, borderCurve: "continuous", borderWidth: 1, borderColor: colors.line, padding: 16, gap: 13, ...shadow }, pressed: { opacity: 0.85, transform: [{ scale: 0.99 }] }, cardHeader: { flexDirection: "row", gap: 12 }, operatorRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 7 }, operator: { color: colors.ink, fontSize: 15, fontWeight: "900" }, verified: { color: colors.success, backgroundColor: colors.successWash, borderRadius: 5, paddingHorizontal: 6, paddingVertical: 3, overflow: "hidden", fontSize: 8, fontWeight: "900" }, vehicle: { color: colors.muted, fontSize: 11, marginTop: 3 }, price: { color: colors.navy, fontSize: 17, fontWeight: "900", fontVariant: ["tabular-nums"] }, perSeat: { color: colors.muted, fontSize: 9, textAlign: "right" }, timeline: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, time: { color: colors.ink, fontSize: 16, fontWeight: "900", fontVariant: ["tabular-nums"] }, town: { color: colors.text, fontSize: 11, marginTop: 2 }, lineBlock: { flex: 1, alignItems: "center", paddingHorizontal: 10 }, line: { height: 2, alignSelf: "stretch", backgroundColor: colors.line }, duration: { color: colors.muted, fontSize: 9, marginTop: 4 }, date: { color: colors.muted, fontSize: 11 }, tags: { flexDirection: "row", flexWrap: "wrap", gap: 6 }, tag: { color: colors.navy, backgroundColor: colors.wash, borderRadius: 7, paddingHorizontal: 7, paddingVertical: 5, overflow: "hidden", fontSize: 9, fontWeight: "700" }, cardFooter: { flexDirection: "row", flexWrap: "wrap", gap: 8, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.line }, rating: { color: colors.warning, fontSize: 11, fontWeight: "900" }, seats: { color: colors.success, fontSize: 11, fontWeight: "800" }, policy: { color: colors.muted, fontSize: 9, flexBasis: "100%" },
});
