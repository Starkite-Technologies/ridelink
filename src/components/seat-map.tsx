import { memo, useMemo, useRef } from "react";
import { Animated, Pressable, StyleSheet, useWindowDimensions, View } from "react-native";
import * as Haptics from "expo-haptics";
import { Text } from "./Typography";
import type { SeatStatus, TripSeat } from "../long-routes/types";
import { SEAT_TEMPLATE_META } from "../long-routes/data";
import { colors, radii } from "../theme";

const STATUS_COLORS: Record<SeatStatus, { background: string; border: string; text: string }> = {
  AVAILABLE: { background: colors.surface, border: "#b9c5d3", text: colors.navy },
  SELECTED: { background: colors.success, border: colors.success, text: colors.navy },
  HELD: { background: colors.warningWash, border: colors.warning, text: "#8c5b05" },
  BOOKED: { background: "#d7dce3", border: "#c1c7d0", text: "#7b8491" },
  BLOCKED: { background: colors.dangerWash, border: colors.danger, text: colors.danger },
  UNAVAILABLE: { background: "#eef0f3", border: "#d8dde4", text: "#9ca4af" },
  DRIVER: { background: colors.navy, border: colors.navy, text: colors.surface },
};

function AnimatedSeat({ seat, status, onPress, disabled, size }: { seat: TripSeat; status: SeatStatus; onPress: () => void; disabled: boolean; size: number }) {
  const scale = useRef(new Animated.Value(1)).current;
  const palette = STATUS_COLORS[status];
  const handlePress = () => {
    Animated.sequence([
      Animated.spring(scale, { toValue: 1.12, useNativeDriver: true, speed: 28, bounciness: 8 }),
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 24, bounciness: 5 }),
    ]).start();
    if (process.env.EXPO_OS === "ios") void Haptics.selectionAsync();
    onPress();
  };
  return (
    <Animated.View style={{ width: size, height: size + 6, transform: [{ scale }, { translateY: status === "SELECTED" ? -3 : 0 }] }}>
      <Pressable
        disabled={disabled}
        onPress={handlePress}
        accessibilityRole="button"
        accessibilityLabel={seat.seatType === "DRIVER" ? "Driver seat" : `Seat ${seat.seatNumber}, ${status.toLowerCase()}`}
        style={[styles.seat, { width: size, height: size, backgroundColor: palette.background, borderColor: palette.border }]}
      >
        <View style={[styles.headrest, { borderColor: palette.border }]} />
        <Text style={[styles.seatNumber, { color: palette.text }]}>{seat.seatType === "DRIVER" ? "D" : seat.seatNumber}</Text>
      </Pressable>
    </Animated.View>
  );
}

const MemoSeat = memo(AnimatedSeat);

export function SeatMap({ seats, layoutTemplateId, selectedSeats, onToggleSeat, maxSelections, interactiveStatuses = ["AVAILABLE"] }: { seats: TripSeat[]; layoutTemplateId: keyof typeof SEAT_TEMPLATE_META; selectedSeats: string[]; onToggleSeat: (seatNumber: string) => void; maxSelections: number; interactiveStatuses?: SeatStatus[] }) {
  const { width } = useWindowDimensions();
  const meta = SEAT_TEMPLATE_META[layoutTemplateId];
  const seatSize = Math.max(42, Math.min(58, (Math.min(width, 430) - 88) / meta.columns));
  const maxRow = Math.max(...seats.map((seat) => seat.row));
  const rows = useMemo(() => Array.from({ length: maxRow + 1 }, (_, row) => row), [maxRow]);
  const columns = Array.from({ length: meta.columns }, (_, column) => column);
  return (
    <View style={styles.wrapper}>
      <View style={styles.frontLabel}><Text style={styles.frontText}>FRONT OF VEHICLE</Text></View>
      <View style={styles.cabin}>
        <View style={styles.dashboard}>
          <View style={styles.wheel}><View style={styles.wheelCenter} /></View>
          <Text style={styles.dashboardText}>{meta.label}</Text>
          <View style={styles.door}><Text style={styles.doorText}>DOOR</Text></View>
        </View>
        <View style={styles.rows}>
          {rows.map((row) => (
            <View key={row} style={styles.row}>
              {columns.map((column) => {
                const seat = seats.find((candidate) => candidate.row === row && candidate.column === column);
                if (!seat) return <View key={column} style={{ width: seatSize, height: seatSize + 6 }} />;
                const status: SeatStatus = selectedSeats.includes(seat.seatNumber) ? "SELECTED" : seat.status;
                const disabled = status !== "SELECTED" && !interactiveStatuses.includes(seat.status);
                return (
                  <MemoSeat
                    key={seat.seatNumber}
                    seat={seat}
                    status={status}
                    size={seatSize}
                    disabled={disabled || (status !== "SELECTED" && selectedSeats.length >= maxSelections)}
                    onPress={() => onToggleSeat(seat.seatNumber)}
                  />
                );
              })}
            </View>
          ))}
        </View>
        <View style={styles.rear}><Text style={styles.rearText}>REAR</Text></View>
      </View>
      <View style={styles.legend}>
        {(["AVAILABLE", "SELECTED", "HELD", "BOOKED", "BLOCKED"] as SeatStatus[]).map((status) => (
          <View key={status} style={styles.legendItem}>
            <View style={[styles.legendSwatch, { backgroundColor: STATUS_COLORS[status].background, borderColor: STATUS_COLORS[status].border }]} />
            <Text style={styles.legendText}>{status.charAt(0) + status.slice(1).toLowerCase()}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { alignItems: "center", gap: 12 },
  frontLabel: { backgroundColor: colors.navy, borderRadius: 99, paddingHorizontal: 14, paddingVertical: 6 },
  frontText: { color: colors.surface, fontSize: 9, fontWeight: "900", letterSpacing: 1.2 },
  cabin: { width: "100%", maxWidth: 410, backgroundColor: "#edf2f6", borderWidth: 2, borderColor: "#cbd5df", borderRadius: 50, borderCurve: "continuous", padding: 18, overflow: "hidden", boxShadow: "inset 0 2px 8px rgba(3,28,58,0.08)" },
  dashboard: { height: 52, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 5, borderBottomWidth: 1, borderBottomColor: "#cbd5df", marginBottom: 14 },
  dashboardText: { color: colors.muted, fontSize: 10, fontWeight: "800" },
  wheel: { width: 32, height: 32, borderRadius: 16, borderWidth: 4, borderColor: colors.navy, alignItems: "center", justifyContent: "center" },
  wheelCenter: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.navy },
  door: { width: 38, height: 28, borderWidth: 1.5, borderColor: colors.success, borderRadius: 6, alignItems: "center", justifyContent: "center" },
  doorText: { color: colors.success, fontSize: 7, fontWeight: "900" },
  rows: { gap: 10 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  seat: { borderWidth: 2, borderRadius: radii.md, borderCurve: "continuous", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 8px rgba(3,28,58,0.10)" },
  headrest: { position: "absolute", top: 5, width: "58%", height: 6, borderWidth: 1.5, borderRadius: 4 },
  seatNumber: { fontSize: 13, fontWeight: "900", marginTop: 6, fontVariant: ["tabular-nums"] },
  rear: { alignItems: "center", paddingTop: 14, marginTop: 12, borderTopWidth: 1, borderTopColor: "#cbd5df" },
  rearText: { color: colors.muted, fontSize: 8, fontWeight: "900", letterSpacing: 1.2 },
  legend: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 12 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  legendSwatch: { width: 14, height: 14, borderRadius: 4, borderWidth: 1.5 },
  legendText: { color: colors.muted, fontSize: 10, fontWeight: "700" },
});
