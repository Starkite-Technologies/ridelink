import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowRight, SteeringWheel, UsersThree } from "../components/icons";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { Text } from "../components/Typography";
import { formatDateTime } from "../long-routes/data";
import type { LongRouteTrip } from "../long-routes/types";
import type { RootTabParamList } from "../navigation/types";
import { colors } from "../theme";

type Props = BottomTabScreenProps<RootTabParamList, "ActivityTab">;

export default function DriverPassengersScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { idToken } = useAuth();
  const [trips, setTrips] = useState<LongRouteTrip[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const load = useCallback(async () => {
    if (!idToken) { setLoading(false); return; }
    try { setTrips(await api.listDriverLongRoutes(idToken)); } finally { setLoading(false); }
  }, [idToken]);
  useEffect(() => { void load(); }, [load]);
  const activeTrips = trips.filter((trip) => !["COMPLETED", "CANCELLED"].includes(trip.status));
  const passengers = activeTrips.reduce((total, trip) => total + trip.bookedSeatCount, 0);

  return <ScrollView style={styles.screen} contentContainerStyle={[styles.content, { paddingTop: insets.top + 18 }]} refreshControl={<RefreshControl refreshing={refreshing} tintColor={colors.success} onRefresh={() => { setRefreshing(true); void load().finally(() => setRefreshing(false)); }} />}>
    <Text style={styles.eyebrow}>DRIVER ACCOUNT</Text>
    <Text style={styles.title}>Passengers</Text>
    <Text style={styles.subtitle}>See how many people are booked across your active departures.</Text>
    <View style={styles.summary}><View style={styles.summaryIcon}><UsersThree size={26} color={colors.success} weight="fill" /></View><View><Text style={styles.summaryValue}>{passengers}</Text><Text style={styles.summaryLabel}>booked passengers</Text></View></View>
    <View style={styles.sectionRow}><Text style={styles.sectionTitle}>Active trips</Text><Text style={styles.sectionCount}>{activeTrips.length}</Text></View>
    {loading ? <View style={styles.loading}><ActivityIndicator color={colors.success} /></View> : activeTrips.length ? activeTrips.map((trip) => <Pressable key={trip.tripId} style={({ pressed }) => [styles.tripCard, pressed && styles.pressed]} onPress={() => navigation.navigate("TripsTab")}>
      <View style={styles.tripIcon}><SteeringWheel size={21} color={colors.success} weight="fill" /></View><View style={styles.tripCopy}><Text style={styles.route}>{trip.departureTown} → {trip.destinationTown}</Text><Text style={styles.meta}>{formatDateTime(trip.departureDateTime)}</Text><Text style={styles.booked}>{trip.bookedSeatCount} of {trip.totalSeatCount} seats booked</Text></View><ArrowRight size={19} color="#7890aa" />
    </Pressable>) : <View style={styles.empty}><UsersThree size={28} color="#7890aa" /><Text style={styles.emptyTitle}>No passengers yet</Text><Text style={styles.emptyBody}>Bookings will appear here after you publish a trip.</Text><Pressable style={styles.button} onPress={() => navigation.navigate("TripsTab")}><Text style={styles.buttonText}>Create a trip</Text></Pressable></View>}
  </ScrollView>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.wash }, content: { paddingHorizontal: 19, paddingBottom: 34, gap: 15 }, eyebrow: { color: colors.success, fontSize: 9, fontWeight: "800", letterSpacing: 1.2 }, title: { color: colors.ink, fontSize: 29, fontWeight: "800", letterSpacing: -1 }, subtitle: { color: colors.muted, fontSize: 11, lineHeight: 17, maxWidth: 310 }, summary: { minHeight: 105, borderRadius: 22, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, flexDirection: "row", alignItems: "center", gap: 14, padding: 17 }, summaryIcon: { width: 50, height: 50, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: colors.successWash }, summaryValue: { color: colors.ink, fontSize: 26, fontWeight: "800" }, summaryLabel: { color: colors.muted, fontSize: 10 }, sectionRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 4 }, sectionTitle: { color: colors.ink, fontSize: 15, fontWeight: "800" }, sectionCount: { color: colors.success, fontSize: 10, fontWeight: "800" }, tripCard: { minHeight: 92, borderRadius: 19, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, padding: 14, flexDirection: "row", alignItems: "center", gap: 11 }, tripIcon: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: colors.successWash }, tripCopy: { flex: 1, gap: 3 }, route: { color: colors.ink, fontSize: 12, fontWeight: "800" }, meta: { color: colors.muted, fontSize: 9 }, booked: { color: colors.success, fontSize: 9, fontWeight: "700" }, loading: { minHeight: 130, alignItems: "center", justifyContent: "center" }, empty: { minHeight: 230, borderRadius: 22, alignItems: "center", justifyContent: "center", padding: 24, gap: 8, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line }, emptyTitle: { color: colors.ink, fontSize: 15, fontWeight: "800" }, emptyBody: { color: colors.muted, fontSize: 10, lineHeight: 16, textAlign: "center" }, button: { marginTop: 10, minHeight: 45, paddingHorizontal: 23, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: colors.success }, buttonText: { color: colors.navy, fontSize: 11, fontWeight: "800" }, pressed: { opacity: 0.82, transform: [{ scale: 0.985 }] },
});
