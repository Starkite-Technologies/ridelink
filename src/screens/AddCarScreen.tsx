import { useRef, useState } from "react";
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Text, TextInput } from "../components/Typography";
import BackButton from "../components/BackButton";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useKeyboardAwareScroll } from "../hooks/useKeyboardAwareScroll";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { ProfileStackParamList } from "../navigation/types";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { colors, radii, shadow } from "../theme";

type Props = NativeStackScreenProps<ProfileStackParamList, "AddCar">;

type Errors = Partial<Record<"make" | "model" | "color", string>>;

export default function AddCarScreen({ navigation }: Props) {
  const { idToken } = useAuth();
  const insets = useSafeAreaInsets();
  const { scrollRef, handleScroll, scrollToInput } = useKeyboardAwareScroll();
  const modelRef = useRef<TextInput>(null);
  const colorRef = useRef<TextInput>(null);
  const yearRef = useRef<TextInput>(null);
  const plateRef = useRef<TextInput>(null);

  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [color, setColor] = useState("");
  const [year, setYear] = useState("");
  const [plate, setPlate] = useState("");
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const pickPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Photo access needed", "Allow photo access to add a picture of your car.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.7,
    });
    if (result.canceled || !result.assets?.[0]) return;
    setPhotoUri(result.assets[0].uri);
  };

  const validate = (): Errors => {
    const next: Errors = {};
    if (!make.trim()) next.make = "Make is required";
    if (!model.trim()) next.model = "Model is required";
    if (!color.trim()) next.color = "Color is required";
    return next;
  };

  const handleSubmit = async () => {
    if (!idToken) {
      Alert.alert("Sign in required", "Please sign in to add a car.");
      return;
    }

    const validationErrors = validate();
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    setSubmitting(true);
    try {
      let photoUrl: string | undefined;
      if (photoUri) {
        setUploadingPhoto(true);
        const { uploadUrl, photoUrl: uploadedUrl } = await api.getPhotoUploadUrl("image/jpeg", idToken);
        const blob = await (await fetch(photoUri)).blob();
        await fetch(uploadUrl, { method: "PUT", body: blob, headers: { "Content-Type": "image/jpeg" } });
        photoUrl = uploadedUrl;
        setUploadingPhoto(false);
      }

      await api.createVehicle(
        {
          make: make.trim(),
          model: model.trim(),
          color: color.trim(),
          year: year ? Number(year) : undefined,
          plate: plate.trim() || undefined,
          photoUrl,
        },
        idToken
      );
      navigation.goBack();
    } catch (err) {
      setUploadingPhoto(false);
      Alert.alert("Couldn't add car", err instanceof Error ? err.message : "Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView
      ref={scrollRef}
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      onScroll={handleScroll}
      scrollEventThrottle={16}
    >
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <BackButton onPress={() => navigation.goBack()} topOffset={insets.top + 16} />
        <Text style={styles.title}>Add a car</Text>
        <Text style={styles.subtitle}>This car will be available to select whenever you post a trip.</Text>
      </View>

      <View style={styles.card}>
        <Pressable style={styles.photoTile} onPress={pickPhoto}>
          {photoUri ? (
            <Image source={{ uri: photoUri }} style={styles.photoPreview} />
          ) : (
            <>
              <Ionicons name="camera-outline" size={26} color={colors.navy} />
              <Text style={styles.photoTileText}>Add photo</Text>
            </>
          )}
        </Pressable>

        <Field label="Make" value={make} onChangeText={setMake} placeholder="Toyota" error={errors.make}
          onFocus={() => scrollToInput(modelRef)} onSubmitEditing={() => modelRef.current?.focus()} />
        <Field inputRef={modelRef} label="Model" value={model} onChangeText={setModel} placeholder="Corolla" error={errors.model}
          onFocus={() => scrollToInput(modelRef)} onSubmitEditing={() => colorRef.current?.focus()} />
        <Field inputRef={colorRef} label="Color" value={color} onChangeText={setColor} placeholder="White" error={errors.color}
          onFocus={() => scrollToInput(colorRef)} onSubmitEditing={() => yearRef.current?.focus()} />

        <View style={styles.splitRow}>
          <View style={styles.splitCell}>
            <Field inputRef={yearRef} label="Year (optional)" value={year} onChangeText={setYear} placeholder="2021"
              keyboardType="number-pad" onFocus={() => scrollToInput(yearRef)} onSubmitEditing={() => plateRef.current?.focus()} />
          </View>
          <View style={styles.splitCell}>
            <Field inputRef={plateRef} label="Plate (optional)" value={plate} onChangeText={setPlate} placeholder="N123-ABC"
              onFocus={() => scrollToInput(plateRef)} />
          </View>
        </View>
      </View>

      <Pressable
        style={({ pressed }) => [styles.button, pressed && styles.pressed, submitting && styles.buttonDisabled]}
        onPress={handleSubmit}
        disabled={submitting}
      >
        {submitting ? (
          <ActivityIndicator color={colors.surface} />
        ) : (
          <Text style={styles.buttonText}>{uploadingPhoto ? "Uploading photo..." : "Add car"}</Text>
        )}
      </Pressable>
    </ScrollView>
  );
}

function Field({
  inputRef,
  label,
  value,
  onChangeText,
  onFocus,
  onSubmitEditing,
  placeholder,
  error,
  keyboardType,
}: {
  inputRef?: React.RefObject<TextInput | null>;
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  onFocus?: () => void;
  onSubmitEditing?: () => void;
  placeholder: string;
  error?: string;
  keyboardType?: "default" | "number-pad";
}) {
  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        ref={inputRef}
        style={[styles.input, error && styles.inputError]}
        value={value}
        onChangeText={onChangeText}
        onFocus={onFocus}
        onSubmitEditing={onSubmitEditing}
        returnKeyType="next"
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        keyboardType={keyboardType}
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.wash },
  content: { padding: 18, gap: 14, paddingBottom: 36 },
  header: { gap: 6, paddingBottom: 6 },
  title: { color: colors.ink, fontSize: 24, fontWeight: "800" },
  subtitle: { color: colors.muted, fontSize: 13 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderCurve: "continuous",
    borderWidth: 1,
    borderColor: colors.line,
    padding: 16,
    gap: 14,
    ...shadow,
  },
  photoTile: {
    alignSelf: "flex-start",
    width: 96,
    height: 96,
    borderRadius: radii.lg,
    borderCurve: "continuous",
    backgroundColor: colors.wash,
    borderWidth: 1,
    borderColor: colors.line,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    overflow: "hidden",
  },
  photoTileText: { color: colors.navy, fontSize: 11, fontWeight: "800" },
  photoPreview: { width: "100%", height: "100%" },
  label: { fontSize: 12, color: colors.text, fontWeight: "700", marginBottom: 6 },
  input: {
    backgroundColor: colors.wash,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.md,
    borderCurve: "continuous",
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    color: colors.ink,
  },
  inputError: { borderColor: colors.danger },
  errorText: { color: colors.danger, fontSize: 12, marginTop: 5 },
  splitRow: { flexDirection: "row", gap: 12 },
  splitCell: { flex: 1 },
  button: {
    marginTop: 4,
    backgroundColor: colors.navy,
    borderRadius: radii.lg,
    borderCurve: "continuous",
    paddingVertical: 17,
    alignItems: "center",
  },
  pressed: { opacity: 0.9, transform: [{ scale: 0.99 }] },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: colors.surface, fontSize: 16, fontWeight: "800" },
});
