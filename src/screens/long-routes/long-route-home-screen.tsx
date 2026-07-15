import { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Text } from "../../components/Typography";
import DatePickerField from "../../components/DatePickerField";
import { TownPicker } from "../../components/town-picker";
import { POPULAR_ROUTES, formatDateTime, formatNad } from "../../long-routes/data";
import type { LongRouteBooking, LongRouteNotification, TripSearch } from "../../long-routes/types";
import type { LongRoutesStackParamList } from "../../navigation/types";
import { useAuth } from "../../auth/AuthContext";
import { api } from "../../api/client";
import { colors, radii, shadow } from "../../theme";

type Props = NativeStackScreenProps<LongRoutesStackParamList, "LongRouteHome">;
const RECENT_KEY = "ridelink.long-routes.recent-searches.v1";

export default function LongRouteHomeScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { idToken } = useAuth();
  const [departureTown, setDepartureTown] = useState("Windhoek");
  const [destinationTown, setDestinationTown] = useState("Oshakati");
  const [date, setDate] = useState(new Date(Date.now() + 86_400_000).toISOString().slice(0, 10));
  const [passengers, setPassengers] = useState(1);
  const [recent, setRecent] = useState<TripSearch[]>([]);
  const [upcoming, setUpcoming] = useState<LongRouteBooking | null>(null);
  const [notifications, setNotifications] = useState<LongRouteNotification[]>([]);

  useEffect(() => {
    AsyncStorage.getItem(RECENT_KEY).then((value) => {
      if (value) setRecent(JSON.parse(value) as TripSearch[]);
    }).catch(() => undefined);
    if (idToken) {
      api.listLongRouteBookings(idToken).then((items) => {
        const next = items.find((booking) => !["CANCELLED", "COMPLETED", "REFUNDED"].includes(booking.bookingStatus));
        setUpcoming(next ?? null);
      }).catch(() => undefined);
      api.listLongRouteNotifications(idToken).then((items) => setNotifications(items.slice(0, 3))).catch(() => undefined);
    }
  }, [idToken]);

  const search = async (input: TripSearch = { departureTown, destinationTown, date, passengers }) => {
    if (!input.departureTown || !input.destinationTown) {
      Alert.alert("Choose your route", "Select a departure and destination town.");
      return;
    }
    if (input.departureTown === input.destinationTown) {
      Alert.alert("Choose another destination", "Departure and destination cannot be the same.");
      return;
    }
    const updated = [input, ...recent.filter((item) => item.departureTown !== input.departureTown || item.destinationTown !== input.destinationTown)].slice(0, 3);
    setRecent(updated);
    await AsyncStorage.setItem(RECENT_KEY, JSON.stringify(updated)).catch(() => undefined);
    navigation.navigate("LongRouteResults", { search: input });
  };

  const swap = () => {
    setDepartureTown(destinationTown);
    setDestinationTown(departureTown);
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={[styles.content, { paddingTop: insets.top + 18, paddingBottom: insets.bottom + 30 }]} contentInsetAdjustmentBehavior="automatic" keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <View><Text style={styles.eyebrow}>LONG ROUTES</Text><Text style={styles.title}>Where are you travelling?</Text></View>
        <View style={styles.profileBadge}><View style={styles.profileDot} /><Text style={styles.profileBadgeText}>Passenger</Text></View>
      </View>

      {upcoming ? (
        <Pressable style={styles.upcoming} onPress={() => navigation.navigate("BookingDetail", { bookingId: upcoming.bookingId })}>
          <View style={styles.upcomingBadge}><Text style={styles.upcomingBadgeText}>UPCOMING</Text></View>
          <Text style={styles.upcomingRoute}>{upcoming.tripSnapshot.departureTown} to {upcoming.tripSnapshot.destinationTown}</Text>
          <Text style={styles.upcomingMeta}>{formatDateTime(upcoming.tripSnapshot.departureDateTime)} • Seats {upcoming.seatNumbers.join(", ")}</Text>
        </Pressable>
      ) : null}

      {notifications.length ? <View style={styles.notificationCard}><View style={styles.notificationHeader}><Text style={styles.sectionTitle}>Trip updates</Text><Text style={styles.notificationCount}>{notifications.length} NEW</Text></View>{notifications.map((item) => <View key={item.notificationId} style={styles.notificationRow}><View style={styles.notificationDot} /><View style={{ flex: 1 }}><Text style={styles.notificationTitle}>{item.title}</Text><Text style={styles.notificationMessage}>{item.message}</Text></View></View>)}</View> : null}

      <View style={styles.searchCard}>
        <TownPicker label="Leaving from" value={departureTown} onChange={setDepartureTown} excludedTown={destinationTown} />
        <Pressable style={styles.swap} onPress={swap} accessibilityLabel="Swap departure and destination"><Text style={styles.swapText}>↕</Text></Pressable>
        <TownPicker label="Going to" value={destinationTown} onChange={setDestinationTown} excludedTown={departureTown} />
        <DatePickerField label="Travel date" value={date} onChange={setDate} />
        <View style={styles.passengerRow}>
          <View><Text style={styles.passengerLabel}>Passengers</Text><Text style={styles.passengerHint}>Select up to 8 seats</Text></View>
          <View style={styles.stepper}>
            <Pressable style={styles.stepperButton} onPress={() => setPassengers((value) => Math.max(1, value - 1))}><Text style={styles.stepperText}>−</Text></Pressable>
            <Text style={styles.passengerCount}>{passengers}</Text>
            <Pressable style={styles.stepperButton} onPress={() => setPassengers((value) => Math.min(8, value + 1))}><Text style={styles.stepperText}>+</Text></Pressable>
          </View>
        </View>
        <Pressable style={({ pressed }) => [styles.searchButton, pressed && styles.pressed]} onPress={() => void search()}>
          <Text style={styles.searchButtonText}>Search long-route trips</Text>
        </Pressable>
      </View>

      {recent.length ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent searches</Text>
          {recent.map((item) => (
            <Pressable key={`${item.departureTown}-${item.destinationTown}`} style={styles.recentRow} onPress={() => void search(item)}>
              <View style={styles.routeDot} />
              <View style={{ flex: 1 }}><Text style={styles.recentRoute}>{item.departureTown} to {item.destinationTown}</Text><Text style={styles.recentMeta}>{item.date} • {item.passengers} passenger{item.passengers === 1 ? "" : "s"}</Text></View>
              <Text style={styles.arrow}>›</Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Popular routes</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.popularList}>
          {POPULAR_ROUTES.map((route) => (
            <Pressable key={`${route.from}-${route.to}`} style={styles.popularCard} onPress={() => void search({ departureTown: route.from, destinationTown: route.to, date, passengers })}>
              <Text style={styles.popularRoute}>{route.from}</Text><Text style={styles.popularArrow}>→</Text><Text style={styles.popularRoute}>{route.to}</Text>
              <Text style={styles.popularPrice}>From {formatNad(route.fromPrice)}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.wash },
  content: { paddingHorizontal: 18, gap: 18 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 16 },
  eyebrow: { color: colors.success, fontSize: 11, fontWeight: "900", letterSpacing: 1.4 },
  title: { color: colors.ink, fontSize: 27, lineHeight: 34, fontWeight: "900", marginTop: 3, maxWidth: 300 },
  profileBadge: { flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 99, backgroundColor: colors.surface, paddingHorizontal: 10, paddingVertical: 8, borderWidth: 1, borderColor: colors.line },
  profileDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.success },
  profileBadgeText: { color: colors.navy, fontSize: 9, fontWeight: "900" },
  upcoming: { backgroundColor: colors.navy, borderRadius: radii.lg, borderCurve: "continuous", padding: 16, gap: 4 },
  upcomingBadge: { alignSelf: "flex-start", backgroundColor: colors.success, borderRadius: 99, paddingHorizontal: 8, paddingVertical: 4 },
  upcomingBadgeText: { color: colors.navy, fontSize: 8, fontWeight: "900", letterSpacing: 0.8 },
  upcomingRoute: { color: colors.surface, fontSize: 16, fontWeight: "900", marginTop: 4 },
  upcomingMeta: { color: "#c9d7e6", fontSize: 11 },
  notificationCard: { backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.line, padding: 14, gap: 10, ...shadow },
  notificationHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  notificationCount: { color: colors.success, fontSize: 8, fontWeight: "900" },
  notificationRow: { flexDirection: "row", alignItems: "flex-start", gap: 9 },
  notificationDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.success, marginTop: 4 },
  notificationTitle: { color: colors.ink, fontSize: 11, fontWeight: "900" },
  notificationMessage: { color: colors.muted, fontSize: 9, lineHeight: 14, marginTop: 2 },
  searchCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: radii.xl, borderCurve: "continuous", padding: 18, gap: 14, ...shadow },
  swap: { alignSelf: "center", width: 36, height: 36, borderRadius: 18, backgroundColor: colors.successWash, alignItems: "center", justifyContent: "center", marginVertical: -5, zIndex: 1 },
  swapText: { color: colors.success, fontSize: 18, fontWeight: "900" },
  passengerRow: { minHeight: 56, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  passengerLabel: { color: colors.text, fontSize: 12, fontWeight: "800" },
  passengerHint: { color: colors.muted, fontSize: 11, marginTop: 2 },
  stepper: { flexDirection: "row", alignItems: "center", gap: 14 },
  stepperButton: { width: 38, height: 38, borderRadius: 12, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.wash, alignItems: "center", justifyContent: "center" },
  stepperText: { color: colors.navy, fontSize: 20, fontWeight: "800" },
  passengerCount: { minWidth: 22, color: colors.ink, textAlign: "center", fontSize: 18, fontWeight: "900", fontVariant: ["tabular-nums"] },
  searchButton: { minHeight: 54, borderRadius: radii.md, backgroundColor: colors.navy, alignItems: "center", justifyContent: "center" },
  searchButtonText: { color: colors.surface, fontSize: 15, fontWeight: "900" },
  pressed: { opacity: 0.86, transform: [{ scale: 0.99 }] },
  section: { gap: 10 },
  sectionTitle: { color: colors.ink, fontSize: 17, fontWeight: "900" },
  recentRow: { minHeight: 62, backgroundColor: colors.surface, borderRadius: radii.md, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", gap: 11 },
  routeDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.success },
  recentRoute: { color: colors.ink, fontSize: 13, fontWeight: "800" },
  recentMeta: { color: colors.muted, fontSize: 11, marginTop: 2 },
  arrow: { color: colors.navy, fontSize: 24 },
  popularList: { gap: 10, paddingRight: 20 },
  popularCard: { width: 170, minHeight: 122, backgroundColor: colors.heroTint, borderRadius: radii.lg, padding: 15, borderWidth: 1, borderColor: "#d9ece8" },
  popularRoute: { color: colors.ink, fontSize: 13, fontWeight: "800" },
  popularArrow: { color: colors.success, fontSize: 17, marginVertical: 2 },
  popularPrice: { color: colors.navy, fontSize: 11, fontWeight: "800", marginTop: 8 },
});
