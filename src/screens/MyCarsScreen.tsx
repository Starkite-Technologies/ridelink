import { useCallback, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Image, Pressable, StyleSheet, View } from "react-native";
import { Text } from "../components/Typography";
import BackButton from "../components/BackButton";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { ProfileStackParamList } from "../navigation/types";
import type { Vehicle } from "../types";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { colors, radii, shadow } from "../theme";

type Props = NativeStackScreenProps<ProfileStackParamList, "MyCars">;

export default function MyCarsScreen({ navigation }: Props) {
  const { idToken, isSignedIn } = useAuth();
  const insets = useSafeAreaInsets();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!isSignedIn || !idToken) {
      setVehicles([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    api
      .listVehicles(idToken)
      .then(setVehicles)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load your cars"))
      .finally(() => setLoading(false));
  }, [idToken, isSignedIn]);

  useFocusEffect(load);

  const handleDelete = (vehicle: Vehicle) => {
    Alert.alert("Remove car", `Remove ${vehicle.make} ${vehicle.model} from your account?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          if (!idToken) return;
          try {
            await api.deleteVehicle(vehicle.vehicleId, idToken);
            setVehicles((current) => current.filter((v) => v.vehicleId !== vehicle.vehicleId));
          } catch (err) {
            Alert.alert("Couldn't remove car", err instanceof Error ? err.message : "Please try again.");
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={vehicles}
        keyExtractor={(vehicle) => vehicle.vehicleId}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
            <BackButton onPress={() => navigation.goBack()} topOffset={insets.top + 16} />
            <View style={styles.headerRow}>
              <Text style={styles.title}>My Cars</Text>
              <Pressable
                style={({ pressed }) => [styles.addButton, pressed && styles.pressed]}
                onPress={() => navigation.navigate("AddCar")}
              >
                <Ionicons name="add" size={18} color={colors.surface} />
                <Text style={styles.addButtonText}>Add a car</Text>
              </Pressable>
            </View>
            <Text style={styles.subtitle}>Cars you add here are verified and ready to use when you post a trip.</Text>
          </View>
        }
        ListEmptyComponent={
          !loading && !error ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Ionicons name="car-outline" size={26} color={colors.navy} />
              </View>
              <Text style={styles.emptyTitle}>Add your first car</Text>
              <Text style={styles.empty}>You'll need at least one car on file before you can post a trip.</Text>
              <Pressable
                style={({ pressed }) => [styles.emptyButton, pressed && styles.pressed]}
                onPress={() => navigation.navigate("AddCar")}
              >
                <Text style={styles.emptyButtonText}>Add a car</Text>
              </Pressable>
            </View>
          ) : loading ? (
            <View style={styles.centered}>
              <ActivityIndicator color={colors.navy} />
            </View>
          ) : (
            <View style={styles.centered}>
              <Text style={styles.error}>{error}</Text>
            </View>
          )
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            {item.photoUrl ? (
              <Image source={{ uri: item.photoUrl }} style={styles.thumb} />
            ) : (
              <View style={[styles.thumb, styles.thumbPlaceholder]}>
                <Text style={styles.thumbPlaceholderText}>{item.make.charAt(0).toUpperCase()}</Text>
              </View>
            )}
            <View style={styles.cardBody}>
              <Text style={styles.cardTitle}>
                {item.make} {item.model}
              </Text>
              <Text style={styles.cardSubtitle}>
                {item.color}
                {item.year ? ` · ${item.year}` : ""}
              </Text>
              {item.verified ? (
                <View style={styles.verifiedBadge}>
                  <Ionicons name="checkmark-circle" size={12} color={colors.success} />
                  <Text style={styles.verifiedBadgeText}>Verified</Text>
                </View>
              ) : null}
            </View>
            <Pressable hitSlop={10} onPress={() => handleDelete(item)}>
              <Ionicons name="trash-outline" size={20} color={colors.muted} />
            </Pressable>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.wash },
  centered: { alignItems: "center", justifyContent: "center", paddingVertical: 40 },
  error: { color: colors.danger },
  list: { padding: 16, gap: 12, flexGrow: 1 },
  header: { gap: 10, paddingBottom: 8 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  title: { color: colors.ink, fontSize: 24, fontWeight: "800" },
  subtitle: { color: colors.muted, fontSize: 13, lineHeight: 19 },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.navy,
    borderRadius: radii.md,
    borderCurve: "continuous",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  addButtonText: { color: colors.surface, fontSize: 13, fontWeight: "800" },
  pressed: { opacity: 0.86, transform: [{ scale: 0.99 }] },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderCurve: "continuous",
    borderWidth: 1,
    borderColor: colors.line,
    padding: 14,
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    ...shadow,
  },
  thumb: { width: 56, height: 56, borderRadius: radii.md, borderCurve: "continuous", backgroundColor: colors.wash },
  thumbPlaceholder: { alignItems: "center", justifyContent: "center" },
  thumbPlaceholderText: { color: colors.navy, fontSize: 20, fontWeight: "900" },
  cardBody: { flex: 1, gap: 4 },
  cardTitle: { color: colors.ink, fontSize: 16, fontWeight: "800" },
  cardSubtitle: { color: colors.muted, fontSize: 13 },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 4,
    backgroundColor: colors.successWash,
    borderRadius: radii.sm,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginTop: 2,
  },
  verifiedBadgeText: { color: colors.success, fontSize: 11, fontWeight: "800" },
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
  emptyTitle: { color: colors.ink, fontSize: 16, fontWeight: "800", textAlign: "center" },
  empty: { textAlign: "center", color: colors.muted, fontSize: 13, lineHeight: 19 },
  emptyButton: {
    marginTop: 14,
    backgroundColor: colors.navy,
    borderRadius: radii.md,
    borderCurve: "continuous",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  emptyButtonText: { color: colors.surface, fontSize: 14, fontWeight: "800" },
});
