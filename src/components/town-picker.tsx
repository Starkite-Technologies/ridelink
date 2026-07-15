import { useMemo, useState } from "react";
import { FlatList, Modal, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text, TextInput } from "./Typography";
import { NAMIBIAN_TOWNS } from "../long-routes/data";
import { colors, radii } from "../theme";

export function TownPicker({ label, value, onChange, excludedTown, error }: { label: string; value: string; onChange: (town: string) => void; excludedTown?: string; error?: string }) {
  const insets = useSafeAreaInsets();
  const [visible, setVisible] = useState(false);
  const [query, setQuery] = useState("");
  const towns = useMemo(
    () => NAMIBIAN_TOWNS.filter((town) => town !== excludedTown && town.toLowerCase().includes(query.trim().toLowerCase())),
    [excludedTown, query]
  );
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <Pressable style={[styles.input, error && styles.inputError]} onPress={() => setVisible(true)} accessibilityRole="button">
        <Text style={value ? styles.value : styles.placeholder}>{value || "Choose a town"}</Text>
        <Text style={styles.chevron}>v</Text>
      </Pressable>
      {error ? <Text style={styles.error} selectable>{error}</Text> : null}
      <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setVisible(false)}>
        <View style={[styles.modal, { paddingTop: insets.top + 12, paddingBottom: insets.bottom }]}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>Choose a town</Text>
              <Text style={styles.modalSubtitle}>Search supported Namibian destinations</Text>
            </View>
            <Pressable hitSlop={12} onPress={() => setVisible(false)}><Text style={styles.close}>Close</Text></Pressable>
          </View>
          <TextInput
            value={query}
            onChangeText={setQuery}
            style={styles.search}
            placeholder="Search towns"
            placeholderTextColor={colors.muted}
            autoFocus
          />
          <FlatList
            data={towns}
            keyExtractor={(town) => town}
            keyboardShouldPersistTaps="handled"
            contentInsetAdjustmentBehavior="automatic"
            renderItem={({ item }) => (
              <Pressable
                style={({ pressed }) => [styles.option, pressed && styles.optionPressed]}
                onPress={() => {
                  onChange(item);
                  setQuery("");
                  setVisible(false);
                }}
              >
                <View style={styles.pin} />
                <Text style={styles.optionText}>{item}</Text>
                {item === value ? <Text style={styles.selected}>Selected</Text> : null}
              </Pressable>
            )}
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: 6 },
  label: { color: colors.text, fontSize: 12, fontWeight: "800" },
  input: { minHeight: 52, borderWidth: 1, borderColor: colors.line, borderRadius: radii.md, backgroundColor: colors.surface, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  inputError: { borderColor: colors.danger },
  value: { color: colors.ink, fontSize: 15, fontWeight: "700" },
  placeholder: { color: colors.muted, fontSize: 15 },
  chevron: { color: colors.muted, fontSize: 12, fontWeight: "800" },
  error: { color: colors.danger, fontSize: 12 },
  modal: { flex: 1, backgroundColor: colors.surface, paddingHorizontal: 20, gap: 16 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  modalTitle: { color: colors.ink, fontSize: 22, fontWeight: "900" },
  modalSubtitle: { color: colors.muted, fontSize: 12, marginTop: 2 },
  close: { color: colors.navy, fontWeight: "800" },
  search: { height: 50, borderRadius: radii.md, backgroundColor: colors.wash, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 15, color: colors.ink, fontSize: 15 },
  option: { minHeight: 56, flexDirection: "row", alignItems: "center", gap: 12, borderBottomWidth: 1, borderBottomColor: colors.line },
  optionPressed: { opacity: 0.6 },
  pin: { width: 12, height: 15, borderRadius: 7, borderBottomRightRadius: 2, backgroundColor: colors.success, transform: [{ rotate: "45deg" }] },
  optionText: { flex: 1, color: colors.ink, fontSize: 15, fontWeight: "700" },
  selected: { color: colors.success, fontSize: 11, fontWeight: "800" },
});
