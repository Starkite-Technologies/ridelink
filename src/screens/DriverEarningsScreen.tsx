import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowRight, ChartLineUp, Wallet } from "../components/icons";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { Text } from "../components/Typography";
import { formatDateTime, formatNad } from "../long-routes/data";
import type { LongRouteTrip } from "../long-routes/types";
import type { RootTabParamList } from "../navigation/types";
import { colors } from "../theme";

type Props = BottomTabScreenProps<RootTabParamList, "WalletTab">;

export default function DriverEarningsScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets(); const { idToken } = useAuth();
  const [trips, setTrips] = useState<LongRouteTrip[]>([]); const [loading, setLoading] = useState(true); const [refreshing, setRefreshing] = useState(false);
  const load = useCallback(async () => { if (!idToken) { setLoading(false); return; } try { setTrips(await api.listDriverLongRoutes(idToken)); } finally { setLoading(false); } }, [idToken]);
  useEffect(() => { void load(); }, [load]);
  const rows = useMemo(() => trips.map((trip) => ({ trip, amount: trip.bookedSeatCount * trip.basePrice })).sort((a, b) => new Date(b.trip.departureDateTime).getTime() - new Date(a.trip.departureDateTime).getTime()), [trips]);
  const total = rows.reduce((sum, row) => sum + row.amount, 0);
  return <ScrollView style={styles.screen} contentContainerStyle={[styles.content, { paddingTop: insets.top + 18 }]} refreshControl={<RefreshControl refreshing={refreshing} tintColor={colors.success} onRefresh={() => { setRefreshing(true); void load().finally(() => setRefreshing(false)); }} />}>
    <Text style={styles.eyebrow}>DRIVER ACCOUNT</Text><Text style={styles.title}>Earnings</Text><Text style={styles.subtitle}>Expected fare value from the seats booked on your trips.</Text>
    <View style={styles.balance}><View style={styles.balanceTop}><View style={styles.balanceIcon}><Wallet size={24} color={colors.navy} weight="fill" /></View><Text style={styles.balanceLabel}>EXPECTED TOTAL</Text></View><Text style={styles.balanceValue}>{formatNad(total)}</Text><View style={styles.balanceFoot}><ChartLineUp size={15} color="#7be5b8" weight="bold" /><Text style={styles.balanceFootText}>{rows.length} trip{rows.length === 1 ? "" : "s"} included</Text></View></View>
    <View style={styles.sectionRow}><Text style={styles.sectionTitle}>Trip breakdown</Text><Text style={styles.sectionCount}>{rows.length}</Text></View>
    {loading ? <View style={styles.loading}><ActivityIndicator color={colors.success} /></View> : rows.length ? rows.map(({ trip, amount }) => <Pressable key={trip.tripId} style={({ pressed }) => [styles.row, pressed && styles.pressed]} onPress={() => navigation.navigate("TripsTab")}><View style={styles.rowCopy}><Text style={styles.route}>{trip.departureTown} → {trip.destinationTown}</Text><Text style={styles.meta}>{formatDateTime(trip.departureDateTime)} · {trip.bookedSeatCount} booked</Text></View><View style={styles.amountCopy}><Text style={styles.amount}>{formatNad(amount)}</Text><ArrowRight size={16} color="#7890aa" /></View></Pressable>) : <View style={styles.empty}><Wallet size={29} color="#7890aa" /><Text style={styles.emptyTitle}>No earnings to show</Text><Text style={styles.emptyBody}>Create a trip and this breakdown will update as seats are booked.</Text><Pressable style={styles.button} onPress={() => navigation.navigate("TripsTab")}><Text style={styles.buttonText}>Create a trip</Text></Pressable></View>}
  </ScrollView>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.wash }, content: { paddingHorizontal: 19, paddingBottom: 34, gap: 15 }, eyebrow: { color: colors.success, fontSize: 9, fontWeight: "800", letterSpacing: 1.2 }, title: { color: colors.ink, fontSize: 29, fontWeight: "800", letterSpacing: -1 }, subtitle: { color: colors.muted, fontSize: 11, lineHeight: 17 }, balance: { minHeight: 181, borderRadius: 24, padding: 19, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, justifyContent: "space-between" }, balanceTop: { flexDirection: "row", alignItems: "center", gap: 10 }, balanceIcon: { width: 40, height: 40, borderRadius: 13, alignItems: "center", justifyContent: "center", backgroundColor: colors.success }, balanceLabel: { color: colors.muted, fontSize: 9, fontWeight: "800", letterSpacing: 1 }, balanceValue: { color: colors.ink, fontSize: 34, fontWeight: "800", letterSpacing: -1.2 }, balanceFoot: { flexDirection: "row", alignItems: "center", gap: 6 }, balanceFootText: { color: colors.success, fontSize: 9, fontWeight: "700" }, sectionRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 4 }, sectionTitle: { color: colors.ink, fontSize: 15, fontWeight: "800" }, sectionCount: { color: colors.success, fontSize: 10, fontWeight: "800" }, row: { minHeight: 76, borderRadius: 18, padding: 14, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, flexDirection: "row", alignItems: "center", gap: 12 }, rowCopy: { flex: 1, gap: 4 }, route: { color: colors.ink, fontSize: 11, fontWeight: "800" }, meta: { color: colors.muted, fontSize: 8 }, amountCopy: { flexDirection: "row", alignItems: "center", gap: 5 }, amount: { color: colors.success, fontSize: 11, fontWeight: "800" }, loading: { minHeight: 130, alignItems: "center", justifyContent: "center" }, empty: { minHeight: 230, borderRadius: 22, alignItems: "center", justifyContent: "center", padding: 24, gap: 8, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line }, emptyTitle: { color: colors.ink, fontSize: 15, fontWeight: "800" }, emptyBody: { color: colors.muted, fontSize: 10, lineHeight: 16, textAlign: "center" }, button: { marginTop: 10, minHeight: 45, paddingHorizontal: 23, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: colors.success }, buttonText: { color: colors.navy, fontSize: 11, fontWeight: "800" }, pressed: { opacity: 0.82, transform: [{ scale: 0.985 }] },
});
