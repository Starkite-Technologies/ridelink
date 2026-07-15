import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { CaretDown, Check } from "./icons";
import { Text } from "./Typography";
import { colors, radii } from "../theme";

export type DropdownOption = { label: string; value: string; description?: string };

export function DropdownField({ label, value, options, onChange, placeholder = "Select an option", disabled = false }: {
  label: string;
  value: string;
  options: DropdownOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value);
  return <View style={styles.field}>
    <Text style={styles.label}>{label}</Text>
    <Pressable accessibilityRole="button" accessibilityState={{ expanded: open, disabled }} disabled={disabled} style={({ pressed }) => [styles.control, open && styles.controlOpen, pressed && styles.pressed, disabled && styles.disabled]} onPress={() => setOpen((current) => !current)}>
      <View style={styles.controlCopy}><Text style={[styles.value, !selected && styles.placeholder]} numberOfLines={1}>{selected?.label ?? placeholder}</Text>{selected?.description ? <Text style={styles.selectedDescription} numberOfLines={1}>{selected.description}</Text> : null}</View>
      <CaretDown size={18} color={colors.muted} weight="bold" />
    </Pressable>
    {open ? <View accessibilityRole="menu" style={styles.menu}>{options.map((option) => {
      const active = option.value === value;
      return <Pressable key={option.value} accessibilityRole="menuitem" style={({ pressed }) => [styles.option, active && styles.optionActive, pressed && styles.pressed]} onPress={() => { onChange(option.value); setOpen(false); }}>
        <View style={styles.optionCopy}><Text style={[styles.optionLabel, active && styles.optionLabelActive]}>{option.label}</Text>{option.description ? <Text style={styles.optionDescription}>{option.description}</Text> : null}</View>
        {active ? <Check size={17} color={colors.success} weight="bold" /> : null}
      </Pressable>;
    })}</View> : null}
  </View>;
}

const styles = StyleSheet.create({
  field: { gap: 7 },
  label: { color: colors.text, fontSize: 11, fontWeight: "800" },
  control: { minHeight: 54, borderRadius: radii.md, borderCurve: "continuous", borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", gap: 10 },
  controlOpen: { borderColor: colors.success },
  controlCopy: { flex: 1, gap: 2 },
  value: { color: colors.ink, fontSize: 13, fontWeight: "800" },
  placeholder: { color: colors.muted, fontWeight: "600" },
  selectedDescription: { color: colors.muted, fontSize: 8 },
  menu: { borderRadius: radii.md, borderCurve: "continuous", borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface, overflow: "hidden", boxShadow: "0 12px 28px rgba(0,0,0,.22)" },
  option: { minHeight: 53, paddingHorizontal: 13, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.line, flexDirection: "row", alignItems: "center", gap: 10 },
  optionActive: { backgroundColor: colors.successWash },
  optionCopy: { flex: 1, gap: 2 },
  optionLabel: { color: colors.ink, fontSize: 12, fontWeight: "700" },
  optionLabelActive: { color: colors.success, fontWeight: "800" },
  optionDescription: { color: colors.muted, fontSize: 8, lineHeight: 12 },
  pressed: { opacity: 0.82 },
  disabled: { opacity: 0.5 },
});
