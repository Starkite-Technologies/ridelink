import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowRight, Car, Check, IdentificationCard, ShieldCheck } from "../../components/icons";
import { Text, TextInput } from "../../components/Typography";
import { DropdownField } from "../../components/dropdown-field";
import { api, uploadVerificationImage } from "../../api/client";
import { useAuth } from "../../auth/AuthContext";
import type { DriverVerification, DriverVerificationInput, SeatTemplateId } from "../../long-routes/types";
import type { DriverStackParamList } from "../../navigation/types";
import { colors, radii } from "../../theme";

type Props = NativeStackScreenProps<DriverStackParamList, "DriverVerification">;
type UploadPurpose = "ID_FRONT" | "ID_BACK" | "SELFIE" | "VEHICLE";
type PreviewKey = "idFront" | "idBack" | "selfie" | `vehicle${number}`;

const EMPTY: DriverVerificationInput = {
  completionStep: 0,
  personalDetails: { firstName: "", lastName: "", dateOfBirth: "", idType: "NATIONAL_ID", idNumber: "", phoneNumber: "", address: "" },
  documents: { idFrontKey: "", idBackKey: "", selfieKey: "", vehiclePhotoKeys: [] },
  selfieConsent: false,
  vehicleDetails: { make: "", model: "", color: "", registrationNumber: "", layoutTemplateId: "MINIBUS_2_1" },
};

const STEPS = ["Personal & ID", "Selfie check", "Vehicle", "Vehicle photos", "Review"];

export default function DriverVerificationScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { idToken, firstName, lastName } = useAuth();
  const [form, setForm] = useState<DriverVerificationInput>({ ...EMPTY, personalDetails: { ...EMPTY.personalDetails, firstName: firstName ?? "", lastName: lastName ?? "" } });
  const [status, setStatus] = useState<DriverVerification["status"]>("NOT_STARTED");
  const [reviewNote, setReviewNote] = useState("");
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState("");
  const [previews, setPreviews] = useState<Partial<Record<PreviewKey, string>>>({});

  const load = useCallback(async () => {
    if (!idToken) return setLoading(false);
    try {
      const record = await api.getDriverVerification(idToken);
      setStatus(record.status);
      setReviewNote(record.reviewNote ?? "");
      setStep(Math.min(4, record.completionStep ?? 0));
      if (record.personalDetails) setForm({
        completionStep: record.completionStep ?? 0,
        personalDetails: record.personalDetails,
        documents: record.documents,
        selfieConsent: record.selfieConsent,
        vehicleDetails: record.vehicleDetails,
      });
    } catch (caught) {
      Alert.alert("Verification unavailable", caught instanceof Error ? caught.message : "Please try again.");
    } finally { setLoading(false); }
  }, [idToken]);

  useEffect(() => { void load(); }, [load]);

  const updatePersonal = (key: keyof DriverVerificationInput["personalDetails"], value: string) => setForm((current) => ({ ...current, personalDetails: { ...current.personalDetails, [key]: value } }));
  const updateVehicle = (key: keyof DriverVerificationInput["vehicleDetails"], value: string) => setForm((current) => ({ ...current, vehicleDetails: { ...current.vehicleDetails, [key]: value } }));

  const capture = async (purpose: UploadPurpose, previewKey: PreviewKey, camera = false) => {
    if (!idToken || uploading) return;
    try {
      const permission = camera ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) return Alert.alert("Permission required", camera ? "Allow camera access to take your verification selfie." : "Allow photo access to select verification images.");
      const result = camera
        ? await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.75, cameraType: ImagePicker.CameraType.front })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.75 });
      if (result.canceled || !result.assets[0]) return;
      const asset = result.assets[0];
      const contentType = asset.mimeType && ["image/jpeg", "image/png", "image/webp"].includes(asset.mimeType) ? asset.mimeType : "image/jpeg";
      setUploading(previewKey);
      const signed = await api.createDriverVerificationUpload(purpose, contentType, idToken);
      await uploadVerificationImage(signed.uploadUrl, asset.uri, contentType);
      setPreviews((current) => ({ ...current, [previewKey]: asset.uri }));
      setForm((current) => {
        if (purpose === "ID_FRONT") return { ...current, documents: { ...current.documents, idFrontKey: signed.key } };
        if (purpose === "ID_BACK") return { ...current, documents: { ...current.documents, idBackKey: signed.key } };
        if (purpose === "SELFIE") return { ...current, documents: { ...current.documents, selfieKey: signed.key } };
        return { ...current, documents: { ...current.documents, vehiclePhotoKeys: [...current.documents.vehiclePhotoKeys, signed.key].slice(0, 6) } };
      });
    } catch (caught) {
      Alert.alert("Photo upload failed", caught instanceof Error ? caught.message : "Please try again.");
    } finally { setUploading(""); }
  };

  const stepValid = useMemo(() => {
    if (step === 0) return Object.values(form.personalDetails).every(Boolean) && Boolean(form.documents.idFrontKey && form.documents.idBackKey);
    if (step === 1) return Boolean(form.documents.selfieKey && form.selfieConsent);
    if (step === 2) return Object.values(form.vehicleDetails).every(Boolean);
    if (step === 3) return form.documents.vehiclePhotoKeys.length >= 3;
    return true;
  }, [form, step]);

  const next = () => {
    if (!stepValid) return Alert.alert("Finish this step", step === 3 ? "Add at least three vehicle photos." : "Complete every item before continuing.");
    setForm((current) => ({ ...current, completionStep: Math.max(current.completionStep, step + 1) }));
    setStep((current) => Math.min(4, current + 1));
  };

  const saveDraft = async () => {
    if (!idToken) return;
    setSubmitting(true);
    try { await api.saveDriverVerification({ ...form, completionStep: step }, idToken); navigation.goBack(); }
    catch (caught) { Alert.alert("Draft not saved", caught instanceof Error ? caught.message : "Please try again."); }
    finally { setSubmitting(false); }
  };

  const submit = async () => {
    if (!idToken) return;
    setSubmitting(true);
    try {
      const record = await api.submitDriverVerification({ ...form, completionStep: 4 }, idToken);
      setStatus(record.status);
      setStep(4);
    } catch (caught) { Alert.alert("Could not submit", caught instanceof Error ? caught.message : "Check every section and try again."); }
    finally { setSubmitting(false); }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator color={colors.success} /></View>;
  if (status === "PENDING" || status === "APPROVED") return <StatusScreen approved={status === "APPROVED"} onRefresh={() => void load()} onDone={() => navigation.goBack()} />;

  return <ScrollView style={styles.screen} contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 28 }]} keyboardShouldPersistTaps="handled">
    <View style={styles.hero}>
      <Text style={styles.eyebrow}>DRIVER VERIFICATION</Text>
      <Text style={styles.title}>{status === "REJECTED" ? "Update your verification" : "Get ready to drive"}</Text>
      <Text style={styles.subtitle}>You can browse your Driver space now. Trip creation unlocks after Admin approval.</Text>
      {status === "REJECTED" ? <View style={styles.rejected}><Text style={styles.rejectedTitle}>Admin requested changes</Text><Text style={styles.rejectedBody}>{reviewNote}</Text></View> : null}
    </View>
    <View style={styles.progress}>{STEPS.map((label, index) => <View key={label} style={styles.progressItem}><View style={[styles.dot, index <= step && styles.dotActive]}>{index < step ? <Check size={12} color={colors.navy} weight="bold" /> : <Text style={[styles.dotText, index <= step && styles.dotTextActive]}>{index + 1}</Text>}</View><Text style={[styles.progressLabel, index === step && styles.progressLabelActive]} numberOfLines={1}>{label}</Text></View>)}</View>

    {step === 0 ? <Section icon={IdentificationCard} title="Personal details and ID" body="Enter your legal details exactly as they appear on your identity document.">
      <Field label="First name" value={form.personalDetails.firstName} onChangeText={(value) => updatePersonal("firstName", value)} />
      <Field label="Last name" value={form.personalDetails.lastName} onChangeText={(value) => updatePersonal("lastName", value)} />
      <Field label="Date of birth" value={form.personalDetails.dateOfBirth} placeholder="YYYY-MM-DD" onChangeText={(value) => updatePersonal("dateOfBirth", value)} />
      <DropdownField label="Identity document" value={form.personalDetails.idType} onChange={(value) => updatePersonal("idType", value)} options={[{ value: "NATIONAL_ID", label: "Namibian national ID" }, { value: "PASSPORT", label: "Passport" }, { value: "DRIVER_LICENSE", label: "Driver licence" }]} />
      <Field label="ID or passport number" value={form.personalDetails.idNumber} onChangeText={(value) => updatePersonal("idNumber", value)} />
      <Field label="Mobile number" value={form.personalDetails.phoneNumber} keyboardType="phone-pad" onChangeText={(value) => updatePersonal("phoneNumber", value)} />
      <Field label="Residential address" value={form.personalDetails.address} onChangeText={(value) => updatePersonal("address", value)} />
      <View style={styles.photoRow}><PhotoTile label="ID front" uri={previews.idFront} uploaded={Boolean(form.documents.idFrontKey)} busy={uploading === "idFront"} onPress={() => void capture("ID_FRONT", "idFront")} /><PhotoTile label="ID back" uri={previews.idBack} uploaded={Boolean(form.documents.idBackKey)} busy={uploading === "idBack"} onPress={() => void capture("ID_BACK", "idBack")} /></View>
    </Section> : null}

    {step === 1 ? <Section icon={ShieldCheck} title="Selfie identity check" body="Take a clear live selfie so Admin can match you with your ID.">
      <PhotoTile large label="Take selfie" uri={previews.selfie} uploaded={Boolean(form.documents.selfieKey)} busy={uploading === "selfie"} onPress={() => void capture("SELFIE", "selfie", true)} />
      <Pressable style={styles.consent} onPress={() => setForm((current) => ({ ...current, selfieConsent: !current.selfieConsent }))}><View style={[styles.checkbox, form.selfieConsent && styles.checkboxChecked]}>{form.selfieConsent ? <Check size={14} color={colors.navy} weight="bold" /> : null}</View><Text style={styles.consentText}>I confirm this is a live photo of me and consent to identity verification.</Text></Pressable>
    </Section> : null}

    {step === 2 ? <Section icon={Car} title="Vehicle details" body="Add the vehicle you will use for RideLink passenger trips.">
      <Field label="Make" value={form.vehicleDetails.make} placeholder="Toyota" onChangeText={(value) => updateVehicle("make", value)} />
      <Field label="Model" value={form.vehicleDetails.model} placeholder="Quantum" onChangeText={(value) => updateVehicle("model", value)} />
      <Field label="Colour" value={form.vehicleDetails.color} placeholder="Silver" onChangeText={(value) => updateVehicle("color", value)} />
      <Field label="Registration number" value={form.vehicleDetails.registrationNumber} placeholder="N 12345 W" autoCapitalize="characters" onChangeText={(value) => updateVehicle("registrationNumber", value)} />
      <DropdownField label="Seat layout" value={form.vehicleDetails.layoutTemplateId} onChange={(value) => updateVehicle("layoutTemplateId", value as SeatTemplateId)} options={[{ value: "SEVEN_SEATER", label: "7-seater" }, { value: "MINIBUS_2_1", label: "14-seat minibus" }, { value: "SHUTTLE", label: "18-seat shuttle" }, { value: "BUS_2_2", label: "Coach / bus" }]} />
    </Section> : null}

    {step === 3 ? <Section icon={Car} title="Vehicle photos" body="Upload at least front, rear, and side views. Make sure the registration is readable.">
      <View style={styles.photoGrid}>{Array.from({ length: Math.max(3, form.documents.vehiclePhotoKeys.length + 1) }, (_, index) => <PhotoTile key={index} label={index === 0 ? "Front" : index === 1 ? "Rear" : index === 2 ? "Side" : "Extra"} uri={previews[`vehicle${index}`]} uploaded={Boolean(form.documents.vehiclePhotoKeys[index])} busy={uploading === `vehicle${index}`} onPress={() => void capture("VEHICLE", `vehicle${index}`)} />)}</View>
      <Text style={styles.counter}>{form.documents.vehiclePhotoKeys.length}/3 required photos uploaded</Text>
    </Section> : null}

    {step === 4 ? <Section icon={ShieldCheck} title="Ready for Admin review" body="Check your details, then submit. You can keep browsing while RideLink reviews your profile.">
      <Review label="Driver" value={`${form.personalDetails.firstName} ${form.personalDetails.lastName}`} />
      <Review label="Identity" value={`${form.personalDetails.idType.replace(/_/g, " ")} · ${form.personalDetails.idNumber}`} />
      <Review label="Vehicle" value={`${form.vehicleDetails.make} ${form.vehicleDetails.model} · ${form.vehicleDetails.registrationNumber}`} />
      <Review label="Uploads" value={`ID front/back, selfie, ${form.documents.vehiclePhotoKeys.length} vehicle photos`} />
    </Section> : null}

    <View style={styles.actions}>{step > 0 ? <Pressable style={styles.secondary} disabled={submitting} onPress={() => setStep((current) => current - 1)}><Text style={styles.secondaryText}>Back</Text></Pressable> : <Pressable style={styles.secondary} disabled={submitting} onPress={() => void saveDraft()}><Text style={styles.secondaryText}>Save & exit</Text></Pressable>}{step < 4 ? <Pressable style={styles.primary} onPress={next}><Text style={styles.primaryText}>Continue</Text><ArrowRight size={17} color={colors.navy} /></Pressable> : <Pressable style={styles.primary} disabled={submitting} onPress={() => void submit()}>{submitting ? <ActivityIndicator color={colors.navy} /> : <Text style={styles.primaryText}>Submit for review</Text>}</Pressable>}</View>
  </ScrollView>;
}

function StatusScreen({ approved, onRefresh, onDone }: { approved: boolean; onRefresh: () => void; onDone: () => void }) {
  return <View style={styles.statusScreen}><View style={[styles.statusIcon, approved && styles.statusIconApproved]}><ShieldCheck size={42} color={approved ? colors.success : "#f2a72d"} weight="fill" /></View><Text style={styles.statusTitle}>{approved ? "You're approved to drive" : "Admin review in progress"}</Text><Text style={styles.statusBody}>{approved ? "Your identity and vehicle are verified. You can now create and publish trips." : "Your verification was submitted successfully. You can browse the whole Driver app while the RideLink Admin team checks it."}</Text><Pressable style={styles.primaryWide} onPress={approved ? onDone : onRefresh}><Text style={styles.primaryText}>{approved ? "Return to Driver space" : "Refresh status"}</Text></Pressable>{!approved ? <Pressable onPress={onDone}><Text style={styles.browseLink}>Keep browsing Driver space</Text></Pressable> : null}</View>;
}

type Icon = typeof Car;
function Section({ icon: IconComponent, title, body, children }: { icon: Icon; title: string; body: string; children: React.ReactNode }) { return <View style={styles.section}><View style={styles.sectionHeader}><View style={styles.sectionIcon}><IconComponent size={23} color={colors.success} weight="fill" /></View><View style={styles.sectionCopy}><Text style={styles.sectionTitle}>{title}</Text><Text style={styles.sectionBody}>{body}</Text></View></View>{children}</View>; }
function Field({ label, ...props }: { label: string } & React.ComponentProps<typeof TextInput>) { return <View style={styles.field}><Text style={styles.label}>{label}</Text><TextInput style={styles.input} placeholderTextColor={colors.muted} {...props} /></View>; }
function PhotoTile({ label, uri, uploaded, busy, onPress, large }: { label: string; uri?: string; uploaded: boolean; busy: boolean; onPress: () => void; large?: boolean }) { return <Pressable style={[styles.photoTile, large && styles.photoTileLarge]} disabled={busy} onPress={onPress}>{uri ? <Image source={{ uri }} style={styles.photo} contentFit="cover" /> : <View style={styles.photoPlaceholder}>{busy ? <ActivityIndicator color={colors.success} /> : uploaded ? <Check size={25} color={colors.success} weight="bold" /> : <IdentificationCard size={25} color={colors.muted} />}</View>}<View style={styles.photoLabelRow}><Text style={styles.photoLabel}>{uploaded ? `${label} uploaded` : label}</Text>{uploaded ? <Check size={13} color={colors.success} weight="bold" /> : null}</View></Pressable>; }
function Review({ label, value }: { label: string; value: string }) { return <View style={styles.review}><Text style={styles.reviewLabel}>{label}</Text><Text style={styles.reviewValue}>{value}</Text></View>; }

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.wash }, center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.wash }, content: { padding: 18, gap: 16 }, hero: { gap: 7 }, eyebrow: { color: colors.success, fontSize: 9, fontWeight: "800", letterSpacing: 1.2 }, title: { color: colors.ink, fontSize: 28, lineHeight: 34, fontWeight: "800", letterSpacing: -0.8 }, subtitle: { color: colors.muted, fontSize: 10, lineHeight: 16 }, rejected: { marginTop: 8, padding: 13, borderRadius: radii.md, backgroundColor: colors.dangerWash, borderWidth: 1, borderColor: colors.danger }, rejectedTitle: { color: "#ffaaaa", fontSize: 10, fontWeight: "800" }, rejectedBody: { color: "#ffc4c4", fontSize: 9, lineHeight: 14, marginTop: 4 },
  progress: { flexDirection: "row", justifyContent: "space-between", gap: 3 }, progressItem: { flex: 1, alignItems: "center", gap: 5 }, dot: { width: 25, height: 25, borderRadius: 13, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface }, dotActive: { backgroundColor: colors.success, borderColor: colors.success }, dotText: { color: colors.muted, fontSize: 9, fontWeight: "800" }, dotTextActive: { color: colors.navy }, progressLabel: { color: colors.muted, fontSize: 7, textAlign: "center" }, progressLabelActive: { color: colors.ink, fontWeight: "800" },
  section: { padding: 16, gap: 15, borderRadius: 22, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line }, sectionHeader: { flexDirection: "row", gap: 11 }, sectionIcon: { width: 43, height: 43, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: colors.successWash }, sectionCopy: { flex: 1, gap: 3 }, sectionTitle: { color: colors.ink, fontSize: 15, fontWeight: "800" }, sectionBody: { color: colors.muted, fontSize: 9, lineHeight: 14 }, field: { gap: 6 }, label: { color: colors.ink, fontSize: 10, fontWeight: "700" }, input: { height: 50, paddingHorizontal: 13, borderRadius: 14, color: colors.ink, backgroundColor: colors.wash, borderWidth: 1, borderColor: colors.line, fontSize: 12 },
  photoRow: { flexDirection: "row", gap: 10 }, photoGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 }, photoTile: { width: "48%", minHeight: 128, overflow: "hidden", borderRadius: 15, backgroundColor: colors.wash, borderWidth: 1, borderColor: colors.line }, photoTileLarge: { width: "100%", minHeight: 230 }, photo: { width: "100%", flex: 1, minHeight: 92 }, photoPlaceholder: { flex: 1, minHeight: 92, alignItems: "center", justifyContent: "center" }, photoLabelRow: { minHeight: 35, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 10 }, photoLabel: { color: colors.ink, fontSize: 9, fontWeight: "700" }, consent: { flexDirection: "row", alignItems: "flex-start", gap: 10, padding: 12, borderRadius: 14, backgroundColor: colors.wash }, checkbox: { width: 22, height: 22, borderRadius: 7, borderWidth: 1, borderColor: colors.line, alignItems: "center", justifyContent: "center" }, checkboxChecked: { backgroundColor: colors.success, borderColor: colors.success }, consentText: { flex: 1, color: colors.muted, fontSize: 9, lineHeight: 14 }, counter: { color: colors.success, fontSize: 9, fontWeight: "700" },
  review: { gap: 3, paddingBottom: 11, borderBottomWidth: 1, borderBottomColor: colors.line }, reviewLabel: { color: colors.muted, fontSize: 8 }, reviewValue: { color: colors.ink, fontSize: 11, fontWeight: "700" }, actions: { flexDirection: "row", gap: 10 }, primary: { flex: 1, minHeight: 51, borderRadius: 16, backgroundColor: colors.success, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7 }, primaryWide: { width: "100%", minHeight: 52, borderRadius: 16, backgroundColor: colors.success, alignItems: "center", justifyContent: "center" }, primaryText: { color: colors.navy, fontSize: 11, fontWeight: "800" }, secondary: { flex: 1, minHeight: 51, borderRadius: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, alignItems: "center", justifyContent: "center" }, secondaryText: { color: colors.ink, fontSize: 11, fontWeight: "700" },
  statusScreen: { flex: 1, padding: 28, backgroundColor: colors.wash, alignItems: "center", justifyContent: "center", gap: 16 }, statusIcon: { width: 86, height: 86, borderRadius: 29, backgroundColor: "rgba(242,167,45,.13)", alignItems: "center", justifyContent: "center" }, statusIconApproved: { backgroundColor: colors.successWash }, statusTitle: { color: colors.ink, fontSize: 23, fontWeight: "800", textAlign: "center" }, statusBody: { color: colors.muted, maxWidth: 350, fontSize: 11, lineHeight: 18, textAlign: "center", marginBottom: 7 }, browseLink: { color: colors.success, fontSize: 10, fontWeight: "800", padding: 10 },
});
