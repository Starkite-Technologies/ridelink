import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Image, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowRight, Bus, CalendarDots, Car, MapPin, Plus, SteeringWheel, UsersThree, Wallet } from "../components/icons";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { Text } from "../components/Typography";
import { formatDateTime, formatNad } from "../long-routes/data";
import type { DriverVerification, DriverVerificationStatus, LongRouteBooking, LongRouteTrip, Vehicle } from "../long-routes/types";
import type { RootTabParamList } from "../navigation/types";
import { colors, radii } from "../theme";

type Props = BottomTabScreenProps<RootTabParamList, "HomeTab">;

export default function DashboardScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { idToken, firstName, lastName, email, accountType } = useAuth();
  const previewRole = Platform.OS === "web" && __DEV__ && typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("previewRole") : null;
  const isDriver = (previewRole ?? accountType) === "DRIVER";
  const [bookings, setBookings] = useState<LongRouteBooking[]>([]);
  const [driverTrips, setDriverTrips] = useState<LongRouteTrip[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [driverVerification, setDriverVerification] = useState<DriverVerificationStatus>("NOT_STARTED");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadWarning, setLoadWarning] = useState(false);

  const displayName = [firstName, lastName].filter(Boolean).join(" ") || email?.split("@")[0] || (isDriver ? "Driver" : "Passenger");

  const load = useCallback(async () => {
    if (!idToken) {
      setLoading(false);
      return;
    }
    const requests = isDriver
      ? [api.listDriverLongRoutes(idToken), api.listVehicles(idToken), api.getDriverVerification(idToken)]
      : [api.listLongRouteBookings(idToken)];
    const results = await Promise.allSettled(requests);
    if (isDriver) {
      if (results[0]?.status === "fulfilled") setDriverTrips(results[0].value as LongRouteTrip[]);
      if (results[1]?.status === "fulfilled") setVehicles(results[1].value as Vehicle[]);
      if (results[2]?.status === "fulfilled") setDriverVerification((results[2].value as DriverVerification).status);
    } else if (results[0]?.status === "fulfilled") {
      setBookings(results[0].value as LongRouteBooking[]);
    }
    setLoadWarning(results.some((result) => result.status === "rejected"));
    setLoading(false);
  }, [idToken, isDriver]);

  useEffect(() => { void load(); }, [load]);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 16 }]}
      contentInsetAdjustmentBehavior="never"
      refreshControl={<RefreshControl refreshing={refreshing} tintColor={colors.success} onRefresh={() => { setRefreshing(true); void load().finally(() => setRefreshing(false)); }} />}
    >
      <View style={styles.brandRow}>
        <View style={styles.brandIdentity}>
          <Image source={require("../../assets/favicon.png")} style={styles.brandLogo} />
          <Text style={styles.brandName}>RideLink</Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Open account" style={styles.avatar} onPress={() => navigation.navigate("Profile")}>
          <Text style={styles.avatarText}>{displayName.charAt(0).toUpperCase()}</Text>
        </Pressable>
      </View>

      <View style={styles.greetingRow}>
        <View style={styles.greetingCopy}>
          <Text style={styles.hello}>Hello, {firstName || displayName}</Text>
          <Text style={styles.headline}>{isDriver ? "Ready to move Namibia?" : "Where are you going next?"}</Text>
        </View>
        <View style={styles.roleBadge}>
          {isDriver ? <SteeringWheel size={14} color="#7be5b8" weight="fill" /> : <UsersThree size={14} color="#7be5b8" weight="fill" />}
          <Text style={styles.roleText}>{isDriver ? "DRIVER" : "PASSENGER"}</Text>
        </View>
      </View>

      {loadWarning ? <View style={styles.warning}><Text style={styles.warningText}>Some live details could not load. Pull down to retry.</Text></View> : null}

      {isDriver ? (
        <DriverHome
          loading={loading}
          trips={driverTrips}
          vehicles={vehicles}
          verificationStatus={driverVerification}
          onCreateTrip={() => navigation.navigate("TripsTab")}
          onManageTrips={() => navigation.navigate("TripsTab")}
          onPassengers={() => navigation.navigate("ActivityTab")}
          onEarnings={() => navigation.navigate("WalletTab")}
        />
      ) : (
        <PassengerHome
          loading={loading}
          bookings={bookings}
          onLongRoutes={() => navigation.navigate("TripsTab")}
          onLocalRides={() => navigation.navigate("ActivityTab")}
          onBookings={() => navigation.navigate("WalletTab")}
        />
      )}
    </ScrollView>
  );
}

function PassengerHome({ loading, bookings, onLongRoutes, onLocalRides, onBookings }: { loading: boolean; bookings: LongRouteBooking[]; onLongRoutes: () => void; onLocalRides: () => void; onBookings: () => void }) {
  const upcoming = useMemo(() => bookings.filter((booking) => !["CANCELLED", "EXPIRED"].includes(booking.bookingStatus)).sort((a, b) => new Date(a.tripSnapshot.departureDateTime).getTime() - new Date(b.tripSnapshot.departureDateTime).getTime())[0], [bookings]);
  return (
    <>
      <View style={styles.featureGrid}>
        <FeatureCard icon={Bus} accent="green" eyebrow="TRAVEL BETWEEN TOWNS" title="Long routes" body="Book a verified trip and choose your seat." onPress={onLongRoutes} />
        <FeatureCard icon={Car} accent="amber" eyebrow="MOVE AROUND TOWN" title="Local rides" body="Find a nearby driver for your daily trip." onPress={onLocalRides} />
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Upcoming journey</Text>
        <Pressable onPress={onBookings} hitSlop={10}><Text style={styles.sectionLink}>View bookings</Text></Pressable>
      </View>
      {loading ? <LoadingCard /> : upcoming ? (
        <Pressable style={({ pressed }) => [styles.journeyCard, pressed && styles.pressed]} onPress={onBookings}>
          <View style={styles.journeyLine}>
            <View style={styles.dateTile}>
              <Text style={styles.dateMonth}>{new Date(upcoming.tripSnapshot.departureDateTime).toLocaleDateString(undefined, { month: "short" }).toUpperCase()}</Text>
              <Text style={styles.dateDay}>{new Date(upcoming.tripSnapshot.departureDateTime).getDate()}</Text>
            </View>
            <View style={styles.journeyCopy}>
              <Text style={styles.journeyRoute}>{upcoming.tripSnapshot.departureTown} → {upcoming.tripSnapshot.destinationTown}</Text>
              <Text style={styles.journeyMeta}>{formatDateTime(upcoming.tripSnapshot.departureDateTime)}</Text>
              <Text style={styles.journeyMeta}>{upcoming.tripSnapshot.operatorName}</Text>
            </View>
            <ArrowRight size={20} color="#7890aa" />
          </View>
          <View style={styles.journeyFooter}>
            <Text style={styles.reference}>Ref {upcoming.bookingReference}</Text>
            <Text style={styles.status}>{upcoming.bookingStatus.replace(/_/g, " ")}</Text>
          </View>
        </Pressable>
      ) : (
        <Pressable style={({ pressed }) => [styles.emptyCard, pressed && styles.pressed]} onPress={onLongRoutes}>
          <View style={styles.emptyIcon}><MapPin size={22} color={colors.success} weight="fill" /></View>
          <View style={styles.emptyCopy}><Text style={styles.emptyTitle}>No journey booked yet</Text><Text style={styles.emptyBody}>Your next confirmed trip will appear here.</Text></View>
          <ArrowRight size={20} color="#7890aa" />
        </Pressable>
      )}
    </>
  );
}

function DriverHome({ loading, trips, vehicles, verificationStatus, onCreateTrip, onManageTrips, onPassengers, onEarnings }: { loading: boolean; trips: LongRouteTrip[]; vehicles: Vehicle[]; verificationStatus: DriverVerificationStatus; onCreateTrip: () => void; onManageTrips: () => void; onPassengers: () => void; onEarnings: () => void }) {
  const activeTrips = useMemo(() => trips.filter((trip) => !["COMPLETED", "CANCELLED"].includes(trip.status)), [trips]);
  const nextTrip = useMemo(() => [...activeTrips].sort((a, b) => new Date(a.departureDateTime).getTime() - new Date(b.departureDateTime).getTime())[0], [activeTrips]);
  const passengers = trips.reduce((total, trip) => total + trip.bookedSeatCount, 0);
  const expected = trips.reduce((total, trip) => total + trip.bookedSeatCount * trip.basePrice, 0);
  return (
    <>
      <View style={styles.driverActions}>
        {verificationStatus !== "APPROVED" ? <Pressable style={({ pressed }) => [styles.verificationNotice, pressed && styles.pressed]} onPress={onCreateTrip}><View style={styles.verificationNoticeCopy}><Text style={styles.verificationNoticeTitle}>{verificationStatus === "PENDING" ? "Verification is with Admin" : verificationStatus === "REJECTED" ? "Verification needs changes" : "Complete your Driver profile"}</Text><Text style={styles.verificationNoticeBody}>Your dashboard is open. Trip creation unlocks after approval.</Text></View><ArrowRight size={18} color="#f2a72d" /></Pressable> : null}
        <Pressable style={({ pressed }) => [styles.createButton, verificationStatus !== "APPROVED" && styles.createButtonLocked, pressed && styles.pressed]} onPress={onCreateTrip}><Plus size={20} color={colors.navy} weight="bold" /><Text style={styles.createButtonText}>{verificationStatus === "APPROVED" ? "Create a new trip" : "Open verification"}</Text></Pressable>
        <Pressable style={({ pressed }) => [styles.outlineButton, pressed && styles.pressed]} onPress={onManageTrips}><Text style={styles.outlineButtonText}>Manage trips</Text><ArrowRight size={18} color="#9cafc2" /></Pressable>
      </View>

      <Text style={styles.sectionTitle}>Today at a glance</Text>
      {loading ? <LoadingCard /> : (
        <View style={styles.metricsGrid}>
          <Metric icon={SteeringWheel} value={String(activeTrips.length)} label="Active trips" />
          <Metric icon={UsersThree} value={String(passengers)} label="Passengers" onPress={onPassengers} />
          <Metric icon={Car} value={String(vehicles.length)} label="Vehicles" />
          <Metric icon={Wallet} value={formatNad(expected)} label="Expected" compact onPress={onEarnings} />
        </View>
      )}

      <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Next departure</Text><Pressable onPress={onManageTrips}><Text style={styles.sectionLink}>Manage</Text></Pressable></View>
      {nextTrip ? (
        <Pressable style={({ pressed }) => [styles.journeyCard, pressed && styles.pressed]} onPress={onManageTrips}>
          <View style={styles.journeyLine}>
            <View style={styles.dateTile}><CalendarDots size={23} color={colors.success} weight="fill" /></View>
            <View style={styles.journeyCopy}><Text style={styles.journeyRoute}>{nextTrip.departureTown} → {nextTrip.destinationTown}</Text><Text style={styles.journeyMeta}>{formatDateTime(nextTrip.departureDateTime)}</Text><Text style={styles.journeyMeta}>{nextTrip.bookedSeatCount}/{nextTrip.totalSeatCount} seats booked</Text></View>
            <ArrowRight size={20} color="#7890aa" />
          </View>
        </Pressable>
      ) : !loading ? (
        <Pressable style={({ pressed }) => [styles.emptyCard, pressed && styles.pressed]} onPress={onCreateTrip}><View style={styles.emptyIcon}><Plus size={22} color={colors.success} weight="bold" /></View><View style={styles.emptyCopy}><Text style={styles.emptyTitle}>No departure scheduled</Text><Text style={styles.emptyBody}>Create your first trip and start accepting passengers.</Text></View><ArrowRight size={20} color="#7890aa" /></Pressable>
      ) : null}
    </>
  );
}

type IconComponent = typeof Bus;

function FeatureCard({ icon: Icon, accent, eyebrow, title, body, onPress }: { icon: IconComponent; accent: "green" | "amber"; eyebrow: string; title: string; body: string; onPress: () => void }) {
  const tint = accent === "green" ? colors.success : "#f2a72d";
  return <Pressable style={({ pressed }) => [styles.featureCard, pressed && styles.pressed]} onPress={onPress}><View style={[styles.featureIcon, { backgroundColor: `${tint}1f` }]}><Icon size={25} color={tint} weight="fill" /></View><Text style={[styles.featureEyebrow, { color: tint }]}>{eyebrow}</Text><Text style={styles.featureTitle}>{title}</Text><Text style={styles.featureBody}>{body}</Text><View style={styles.exploreRow}><Text style={[styles.exploreText, { color: tint }]}>Explore</Text><ArrowRight size={16} color={tint} /></View></Pressable>;
}

function Metric({ icon: Icon, value, label, compact, onPress }: { icon: IconComponent; value: string; label: string; compact?: boolean; onPress?: () => void }) {
  const content = <><View style={styles.metricIcon}><Icon size={18} color={colors.success} weight="fill" /></View><Text style={[styles.metricValue, compact && styles.metricValueCompact]} numberOfLines={1}>{value}</Text><Text style={styles.metricLabel}>{label}</Text></>;
  return onPress ? <Pressable style={({ pressed }) => [styles.metric, pressed && styles.pressed]} onPress={onPress}>{content}</Pressable> : <View style={styles.metric}>{content}</View>;
}

function LoadingCard() { return <View style={styles.loadingCard}><ActivityIndicator color={colors.success} /></View>; }

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.wash },
  content: { paddingHorizontal: 19, paddingBottom: 34, gap: 18 },
  brandRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  brandIdentity: { flexDirection: "row", alignItems: "center", gap: 10 },
  brandLogo: { width: 38, height: 38, borderRadius: 12 },
  brandName: { color: colors.ink, fontSize: 18, fontWeight: "800", letterSpacing: -0.5 },
  avatar: { width: 40, height: 40, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line },
  avatarText: { color: colors.ink, fontSize: 15, fontWeight: "800" },
  greetingRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginTop: 2 },
  greetingCopy: { flex: 1, gap: 3 },
  hello: { color: colors.muted, fontSize: 12, fontWeight: "600" },
  headline: { color: colors.ink, fontSize: 28, lineHeight: 34, fontWeight: "800", letterSpacing: -1.1, maxWidth: 280 },
  roleBadge: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 4, borderRadius: 99, backgroundColor: "rgba(20,184,122,0.13)", paddingHorizontal: 9, paddingVertical: 7, borderWidth: 1, borderColor: "rgba(20,184,122,0.23)" },
  roleText: { color: "#7be5b8", fontSize: 8, fontWeight: "800", letterSpacing: 0.9 },
  warning: { borderRadius: radii.md, padding: 12, backgroundColor: "rgba(242,167,45,0.12)", borderWidth: 1, borderColor: "rgba(242,167,45,0.25)" },
  warningText: { color: "#f4c46f", fontSize: 10, lineHeight: 15 },
  featureGrid: { flexDirection: "row", gap: 12 },
  featureCard: { flex: 1, minHeight: 224, padding: 15, borderRadius: 21, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line },
  featureIcon: { width: 45, height: 45, borderRadius: 14, alignItems: "center", justifyContent: "center", marginBottom: 18 },
  featureEyebrow: { minHeight: 27, fontSize: 8, lineHeight: 12, fontWeight: "800", letterSpacing: 0.65 },
  featureTitle: { color: colors.ink, fontSize: 18, fontWeight: "800", marginTop: 2 },
  featureBody: { color: colors.muted, fontSize: 10, lineHeight: 15, marginTop: 5 },
  exploreRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: "auto" },
  exploreText: { fontSize: 10, fontWeight: "800" },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 3 },
  sectionTitle: { color: colors.ink, fontSize: 16, fontWeight: "800", letterSpacing: -0.25 },
  sectionLink: { color: colors.success, fontSize: 10, fontWeight: "700" },
  journeyCard: { borderRadius: 20, padding: 15, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, gap: 14 },
  journeyLine: { flexDirection: "row", alignItems: "center", gap: 12 },
  dateTile: { width: 49, height: 53, borderRadius: 15, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(20,184,122,0.13)" },
  dateMonth: { color: colors.success, fontSize: 8, fontWeight: "800", letterSpacing: 0.8 },
  dateDay: { color: colors.ink, fontSize: 19, fontWeight: "800" },
  journeyCopy: { flex: 1, gap: 3 },
  journeyRoute: { color: colors.ink, fontSize: 13, fontWeight: "800" },
  journeyMeta: { color: colors.muted, fontSize: 9, lineHeight: 13 },
  journeyFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingTop: 12, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.07)" },
  reference: { color: "#8da0b5", fontSize: 9, fontWeight: "600" },
  status: { color: colors.success, fontSize: 8, fontWeight: "800", backgroundColor: "rgba(20,184,122,0.13)", borderRadius: 99, overflow: "hidden", paddingHorizontal: 8, paddingVertical: 5 },
  emptyCard: { flexDirection: "row", alignItems: "center", gap: 12, padding: 15, borderRadius: 20, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line },
  emptyIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: "rgba(20,184,122,0.13)", alignItems: "center", justifyContent: "center" },
  emptyCopy: { flex: 1, gap: 3 },
  emptyTitle: { color: colors.ink, fontSize: 12, fontWeight: "800" },
  emptyBody: { color: colors.muted, fontSize: 9, lineHeight: 14 },
  driverActions: { gap: 10 }, verificationNotice: { minHeight: 68, borderRadius: 17, padding: 13, flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "rgba(242,167,45,.11)", borderWidth: 1, borderColor: "rgba(242,167,45,.24)" }, verificationNoticeCopy: { flex: 1, gap: 3 }, verificationNoticeTitle: { color: colors.ink, fontSize: 11, fontWeight: "800" }, verificationNoticeBody: { color: colors.muted, fontSize: 8, lineHeight: 12 },
  createButton: { height: 55, borderRadius: 17, backgroundColor: colors.success, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9 },
  createButtonLocked: { backgroundColor: "#f2a72d" },
  createButtonText: { color: colors.navy, fontSize: 13, fontWeight: "800" },
  outlineButton: { height: 50, borderRadius: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16 },
  outlineButtonText: { color: colors.ink, fontSize: 11, fontWeight: "700" },
  metricsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 11 },
  metric: { width: "48%", minHeight: 115, borderRadius: 20, padding: 14, justifyContent: "center", backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line },
  metricIcon: { width: 33, height: 33, borderRadius: 11, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(20,184,122,0.12)", marginBottom: 8 },
  metricValue: { color: colors.ink, fontSize: 22, fontWeight: "800", fontVariant: ["tabular-nums"] },
  metricValueCompact: { fontSize: 15 },
  metricLabel: { color: colors.muted, fontSize: 9, fontWeight: "600", marginTop: 2 },
  loadingCard: { minHeight: 104, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line },
  pressed: { opacity: 0.82, transform: [{ scale: 0.985 }] },
});
