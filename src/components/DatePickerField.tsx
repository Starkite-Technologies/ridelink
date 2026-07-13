import { Platform, Pressable, StyleSheet, View } from "react-native";
import { Text, TextInput } from "./Typography";
import { useState } from "react";
import DateTimePicker from "@react-native-community/datetimepicker";
import { colors, radii } from "../theme";

type Props = {
  label: string;
  value: string;
  onChange: (isoDate: string) => void;
  error?: string;
};

function toIsoDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

export default function DatePickerField({ label, value, onChange, error }: Props) {
  const [showPicker, setShowPicker] = useState(false);

  if (Platform.OS === "web") {
    return (
      <View>
        <Text style={styles.label}>{label}</Text>
        <TextInput
          style={[styles.input, error && styles.inputError]}
          value={value}
          onChangeText={onChange}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={colors.muted}
        />
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </View>
    );
  }

  const dateValue = value ? new Date(value) : new Date();

  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      <Pressable style={[styles.input, error && styles.inputError]} onPress={() => setShowPicker(true)}>
        <Text style={value ? styles.valueText : styles.placeholderText}>{value || "Select a date"}</Text>
      </Pressable>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      {showPicker && (
        <DateTimePicker
          value={dateValue}
          mode="date"
          minimumDate={new Date()}
          onChange={(event, selectedDate) => {
            setShowPicker(Platform.OS === "ios");
            if (event.type === "set" && selectedDate) {
              onChange(toIsoDate(selectedDate));
            } else if (Platform.OS === "android") {
              setShowPicker(false);
            }
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 12, color: colors.text, fontWeight: "700", marginBottom: 6 },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.md,
    paddingHorizontal: 14,
    paddingVertical: 13,
    justifyContent: "center",
  },
  inputError: { borderColor: colors.danger },
  valueText: { fontSize: 15, color: colors.ink },
  placeholderText: { fontSize: 15, color: colors.muted },
  errorText: { color: colors.danger, fontSize: 12, marginTop: 5 },
});
