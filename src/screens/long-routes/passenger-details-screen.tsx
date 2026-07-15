import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Text, TextInput } from "../../components/Typography";
import type { LongRouteTrip, PassengerDetails } from "../../long-routes/types";
import type { LongRoutesStackParamList } from "../../navigation/types";
import { useAuth } from "../../auth/AuthContext";
import { api } from "../../api/client";
import { colors, radii, shadow } from "../../theme";

type Props = NativeStackScreenProps<LongRoutesStackParamList, "PassengerDetails">;
const PHONE = /^(\+264|0)\d{8,9}$/;

export default function PassengerDetailsScreen({ route, navigation }: Props) {
  const auth = useAuth();
  const initial = useMemo(() => route.params.seatNumbers.map((seatNumber, index): PassengerDetails => ({ seatNumber, fullName: index === 0 ? [auth.firstName, auth.lastName].filter(Boolean).join(" ") : "", phoneNumber: index === 0 ? auth.phoneNumber ?? "" : "", identificationNumber: "", ageCategory: "ADULT", emergencyContact: "", luggageDetails: "One standard bag", specialAssistance: "None" })), [auth.firstName, auth.lastName, auth.phoneNumber, route.params.seatNumbers]);
  const [passengers, setPassengers] = useState(initial);
  const [trip, setTrip] = useState<LongRouteTrip | null>(null);
  const [pickupIndex, setPickupIndex] = useState(0);
  const [dropOffIndex, setDropOffIndex] = useState(0);
  const proceedingRef = useRef(false);
  const [seconds, setSeconds] = useState(Math.max(0, Math.floor((Date.parse(route.params.holdExpiresAt) - Date.now()) / 1000)));
  useEffect(() => {
    const timer = setInterval(() => setSeconds(Math.max(0, Math.floor((Date.parse(route.params.holdExpiresAt) - Date.now()) / 1000))), 1000);
    return () => clearInterval(timer);
  }, [route.params.holdExpiresAt]);
  useEffect(() => { api.getLongRoute(route.params.tripId).then(setTrip).catch(() => undefined); }, [route.params.tripId]);
  useEffect(() => { if (seconds === 0) Alert.alert("Seat hold expired", "Your seats have been released. Return to the seat map to select again.", [{ text: "Select seats", onPress: () => navigation.goBack() }]); }, [navigation, seconds]);
  useEffect(() => () => {
    if (!proceedingRef.current && auth.idToken) void api.releaseSeats(route.params.tripId, route.params.seatNumbers, auth.idToken).catch(() => undefined);
  }, [auth.idToken, route.params.seatNumbers, route.params.tripId]);
  const update = (index: number, field: keyof PassengerDetails, value: string) => setPassengers((current) => current.map((passenger, itemIndex) => itemIndex === index ? { ...passenger, [field]: value } : passenger));
  const continueToPayment = () => {
    const invalid = passengers.find((passenger) => passenger.fullName.trim().length < 3 || !PHONE.test(passenger.phoneNumber.replace(/\s/g, "")) || !passenger.emergencyContact.trim());
    if (invalid) return Alert.alert("Check passenger details", `Enter a full name, valid Namibian phone number, and emergency contact for seat ${invalid.seatNumber}.`);
    proceedingRef.current = true;
    navigation.navigate("Payment", {
      tripId: route.params.tripId,
      seatNumbers: route.params.seatNumbers,
      holdExpiresAt: route.params.holdExpiresAt,
      passengers,
      pickupPoint: trip?.pickupPoints[pickupIndex] ?? { id: "ORIGIN", name: trip?.departureTown ?? "Departure point" },
      dropOffPoint: trip?.dropOffPoints[dropOffIndex] ?? { id: "DESTINATION", name: trip?.destinationTown ?? "Destination point" },
    });
  };
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} contentInsetAdjustmentBehavior="automatic" keyboardShouldPersistTaps="handled">
      <View style={styles.header}><View><Text style={styles.title}>Passenger details</Text><Text style={styles.subtitle}>Tell us who is travelling in each seat.</Text></View><View style={styles.timer}><Text style={styles.timerLabel}>HOLD</Text><Text style={styles.timerValue}>{Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}</Text></View></View>
      {passengers.map((passenger, index) => (
        <View key={passenger.seatNumber} style={styles.card}>
          <View style={styles.cardTitleRow}><Text style={styles.cardTitle}>Passenger {index + 1}</Text><Text style={styles.seatBadge}>Seat {passenger.seatNumber}</Text></View>
          <Field label="Full name *" value={passenger.fullName} onChangeText={(value) => update(index, "fullName", value)} placeholder="As shown on ID" />
          <Field label="Phone number *" value={passenger.phoneNumber} onChangeText={(value) => update(index, "phoneNumber", value)} placeholder="+264 81 123 4567" keyboardType="phone-pad" />
          <Field label="ID or passport number" value={passenger.identificationNumber} onChangeText={(value) => update(index, "identificationNumber", value)} placeholder="Optional unless operator requires it" />
          <Text style={styles.label}>Age category</Text>
          <View style={styles.options}>{(["ADULT", "CHILD", "INFANT", "SENIOR"] as const).map((category) => <Pressable key={category} style={[styles.option, passenger.ageCategory === category && styles.optionActive]} onPress={() => update(index, "ageCategory", category)}><Text style={[styles.optionText, passenger.ageCategory === category && styles.optionTextActive]}>{category.charAt(0) + category.slice(1).toLowerCase()}</Text></Pressable>)}</View>
          <Field label="Emergency contact *" value={passenger.emergencyContact} onChangeText={(value) => update(index, "emergencyContact", value)} placeholder="Name and phone number" />
          <Field label="Luggage" value={passenger.luggageDetails} onChangeText={(value) => update(index, "luggageDetails", value)} placeholder="Number and type of bags" />
          <Field label="Special assistance" value={passenger.specialAssistance} onChangeText={(value) => update(index, "specialAssistance", value)} placeholder="Mobility, medical, or other needs" />
        </View>
      ))}
      {trip ? <View style={styles.card}>
        <Text style={styles.cardTitle}>Pickup and drop-off</Text>
        <Text style={styles.label}>Pickup point</Text>
        <View style={styles.options}>{trip.pickupPoints.map((point, index) => <Pressable key={point.id ?? `${point.name}-${index}`} style={[styles.pointOption, pickupIndex === index && styles.pointOptionActive]} onPress={() => setPickupIndex(index)}><Text style={[styles.optionText, pickupIndex === index && styles.optionTextActive]}>{point.name}</Text>{point.address ? <Text style={[styles.pointAddress, pickupIndex === index && styles.pointAddressActive]}>{point.address}</Text> : null}</Pressable>)}</View>
        <Text style={styles.label}>Drop-off point</Text>
        <View style={styles.options}>{trip.dropOffPoints.map((point, index) => <Pressable key={point.id ?? `${point.name}-${index}`} style={[styles.pointOption, dropOffIndex === index && styles.pointOptionActive]} onPress={() => setDropOffIndex(index)}><Text style={[styles.optionText, dropOffIndex === index && styles.optionTextActive]}>{point.name}</Text>{point.address ? <Text style={[styles.pointAddress, dropOffIndex === index && styles.pointAddressActive]}>{point.address}</Text> : null}</Pressable>)}</View>
      </View> : null}
      <Pressable style={[styles.button, seconds === 0 && styles.disabled]} disabled={seconds === 0} onPress={continueToPayment}><Text style={styles.buttonText}>Review and choose payment</Text></Pressable>
    </ScrollView>
  );
}

function Field({ label, ...props }: { label: string; value: string; onChangeText: (value: string) => void; placeholder: string; keyboardType?: "default" | "phone-pad" }) { return <View style={styles.field}><Text style={styles.label}>{label}</Text><TextInput {...props} style={styles.input} placeholderTextColor={colors.muted} /></View>; }
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.wash }, content: { padding: 18, gap: 14, paddingBottom: 36 }, header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 }, title: { color: colors.ink, fontSize: 23, fontWeight: "900" }, subtitle: { color: colors.muted, fontSize: 12, marginTop: 3 }, timer: { backgroundColor: colors.warningWash, borderRadius: radii.md, paddingHorizontal: 12, paddingVertical: 8, alignItems: "center" }, timerLabel: { color: "#8c5b05", fontSize: 7, fontWeight: "900", letterSpacing: 0.8 }, timerValue: { color: "#8c5b05", fontSize: 15, fontWeight: "900", fontVariant: ["tabular-nums"] }, card: { backgroundColor: colors.surface, borderRadius: radii.lg, padding: 16, borderWidth: 1, borderColor: colors.line, gap: 12, ...shadow }, cardTitleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, cardTitle: { color: colors.ink, fontSize: 16, fontWeight: "900" }, seatBadge: { color: colors.success, backgroundColor: colors.successWash, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, overflow: "hidden", fontSize: 10, fontWeight: "900" }, field: { gap: 6 }, label: { color: colors.text, fontSize: 11, fontWeight: "800" }, input: { minHeight: 49, borderRadius: radii.md, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.wash, paddingHorizontal: 13, color: colors.ink, fontSize: 14 }, options: { flexDirection: "row", flexWrap: "wrap", gap: 7 }, option: { borderWidth: 1, borderColor: colors.line, borderRadius: 99, paddingHorizontal: 11, paddingVertical: 8 }, optionActive: { backgroundColor: colors.navy, borderColor: colors.navy }, pointOption: { minWidth: "47%", flexGrow: 1, borderWidth: 1, borderColor: colors.line, borderRadius: radii.md, paddingHorizontal: 11, paddingVertical: 10, gap: 3 }, pointOptionActive: { backgroundColor: colors.navy, borderColor: colors.navy }, pointAddress: { color: colors.muted, fontSize: 8 }, pointAddressActive: { color: "#c9d7e6" }, optionText: { color: colors.muted, fontSize: 10, fontWeight: "700" }, optionTextActive: { color: colors.surface }, button: { minHeight: 54, backgroundColor: colors.navy, borderRadius: radii.md, alignItems: "center", justifyContent: "center" }, buttonText: { color: colors.surface, fontSize: 15, fontWeight: "900" }, disabled: { opacity: 0.45 },
});
