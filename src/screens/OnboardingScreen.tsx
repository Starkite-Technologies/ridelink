import { useRef, useState } from "react";
import {
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { Text } from "../components/Typography";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { setHasSeenOnboarding } from "../onboarding/onboardingStorage";
import { colors, radii } from "../theme";

type Slide = {
  key: string;
  eyebrow: string;
  title: string;
  body: string;
  art: "find" | "post" | "book";
};

const SLIDES: Slide[] = [
  {
    key: "find",
    eyebrow: "FIND YOUR WAY",
    title: "Find a ride",
    body: "Discover trusted drivers heading your way and choose the trip that suits you.",
    art: "find",
  },
  {
    key: "post",
    eyebrow: "SHARE THE JOURNEY",
    title: "Post a trip",
    body: "Share your route, set your price and make every empty seat count.",
    art: "post",
  },
  {
    key: "book",
    eyebrow: "TRAVEL TOGETHER",
    title: "Book a seat",
    body: "Reserve your place in a few taps and travel comfortably wherever you're headed.",
    art: "book",
  },
];

function Illustration({ type }: { type: Slide["art"] }) {
  if (type === "find") {
    return (
      <View style={styles.artboard}>
        <Image
          source={require("../../assets/find-a-ride-onboarding.png")}
          resizeMode="contain"
          style={styles.onboardingImage}
          accessibilityLabel="A rider finding a nearby trip on a map"
        />
      </View>
    );
  }

  if (type === "post") {
    return (
      <View style={styles.artboard}>
        <Image
          source={require("../../assets/post-a-ride-onboarding.png")}
          resizeMode="contain"
          style={styles.onboardingImage}
          accessibilityLabel="A driver posting an available ride"
        />
      </View>
    );
  }

  return (
    <View style={styles.artboard}>
      <Image
        source={require("../../assets/book-a-seat-onboarding.png")}
        resizeMode="contain"
        style={styles.onboardingImage}
        accessibilityLabel="A passenger selecting and booking a seat"
      />
    </View>
  );
}

export default function OnboardingScreen({ onDone }: { onDone: () => void }) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(0);
  const listRef = useRef<FlatList<Slide>>(null);

  const finish = async () => {
    await setHasSeenOnboarding();
    onDone();
  };

  const next = () => {
    if (index < SLIDES.length - 1) {
      listRef.current?.scrollToIndex({ index: index + 1, animated: true });
      return;
    }
    finish();
  };

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    setIndex(Math.round(event.nativeEvent.contentOffset.x / width));
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom + 18 }]}>
      <View style={styles.topBar}>
        <View style={styles.wordmarkRow}><View style={styles.miniPin} /><Text style={styles.wordmark}>RIDELINK</Text></View>
        <Pressable hitSlop={12} onPress={finish}><Text style={styles.skipText}>Skip</Text></Pressable>
      </View>
      <FlatList
        ref={listRef}
        data={SLIDES}
        keyExtractor={(item) => item.key}
        horizontal
        pagingEnabled
        bounces={false}
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        renderItem={({ item }) => (
          <View style={[styles.slide, { width }]}>
            <Illustration type={item.art} />
            <View style={styles.copy}>
              <Text style={styles.eyebrow}>{item.eyebrow}</Text>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.bodyText}>{item.body}</Text>
            </View>
          </View>
        )}
      />
      <View style={styles.bottom}>
        <View style={styles.dots}>
          {SLIDES.map((slide, dotIndex) => <View key={slide.key} style={[styles.dot, dotIndex === index && styles.activeDot]} />)}
        </View>
        <Pressable style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]} onPress={next}>
          <Text style={styles.primaryButtonText}>{index === SLIDES.length - 1 ? "Get started" : "Next"}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  topBar: { height: 64, paddingHorizontal: 24, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  wordmarkRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  miniPin: { width: 14, height: 18, borderRadius: 9, borderBottomRightRadius: 2, backgroundColor: colors.success, transform: [{ rotate: "45deg" }] },
  wordmark: { color: colors.navy, fontSize: 16, fontWeight: "900", letterSpacing: 1.4 },
  skipText: { color: colors.navySoft, fontSize: 15, fontWeight: "700" },
  slide: { paddingHorizontal: 24, justifyContent: "center", gap: 38 },
  artboard: { height: 350, borderRadius: 28, borderCurve: "continuous", backgroundColor: "#eaf4f7", overflow: "hidden" },
  onboardingImage: { width: "100%", height: "100%", backgroundColor: colors.surface },
  cloud: { position: "absolute", width: 66, height: 18, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.92)" },
  city: { position: "absolute", left: 0, right: 0, bottom: 55, flexDirection: "row", alignItems: "flex-end", justifyContent: "space-around", paddingHorizontal: 30 },
  building: { width: 42, backgroundColor: "#c9dce7", borderTopLeftRadius: 5, borderTopRightRadius: 5 },
  mountains: { position: "absolute", right: -20, bottom: 60, width: 230, height: 150, backgroundColor: "#c6dce9", transform: [{ rotate: "45deg" }] },
  road: { position: "absolute", left: -35, right: -35, bottom: -74, height: 155, borderRadius: 80, backgroundColor: "#d8e3e9", transform: [{ rotate: "-5deg" }] },
  pin: { position: "absolute", right: 48, top: 78, width: 72, height: 72, borderRadius: 36, borderBottomRightRadius: 9, backgroundColor: colors.success, transform: [{ rotate: "45deg" }], alignItems: "center", justifyContent: "center", boxShadow: "0 10px 22px rgba(20,184,122,0.28)" },
  pinHole: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.surface },
  person: { position: "absolute", left: 55, bottom: 48, width: 70, height: 145, alignItems: "center" },
  head: { width: 42, height: 42, borderRadius: 21, backgroundColor: "#bf704c", zIndex: 2 },
  body: { width: 66, height: 96, borderRadius: 24, borderBottomLeftRadius: 8, borderBottomRightRadius: 8, backgroundColor: colors.navySoft },
  phone: { position: "absolute", right: -2, top: 53, width: 20, height: 35, borderRadius: 5, backgroundColor: colors.ink, borderWidth: 2, borderColor: "#eef5f8" },
  car: { position: "absolute", left: 42, right: 42, bottom: 60, height: 88, borderRadius: 28, backgroundColor: colors.success, borderCurve: "continuous", boxShadow: "0 14px 24px rgba(3,28,58,0.18)" },
  carRoof: { position: "absolute", left: 50, right: 50, top: -46, height: 60, borderTopLeftRadius: 28, borderTopRightRadius: 28, backgroundColor: colors.navySoft, borderWidth: 8, borderColor: colors.success },
  wheel: { position: "absolute", bottom: -18, width: 42, height: 42, borderRadius: 21, backgroundColor: colors.ink, borderWidth: 8, borderColor: "#b9cbd5" },
  luggage: { position: "absolute", width: 92, height: 30, borderRadius: 8, backgroundColor: colors.warning, top: -77, left: "35%" },
  plusBadge: { position: "absolute", right: 34, top: 42, width: 58, height: 58, borderRadius: 29, alignItems: "center", justifyContent: "center", backgroundColor: colors.navy, boxShadow: "0 10px 20px rgba(3,28,58,0.2)" },
  plusText: { color: colors.surface, fontSize: 34, lineHeight: 38, fontWeight: "500" },
  seat: { position: "absolute", left: 48, bottom: 54, width: 118, height: 180 },
  seatBack: { position: "absolute", width: 88, height: 135, borderRadius: 34, backgroundColor: colors.navySoft, right: 0 },
  seatBase: { position: "absolute", width: 112, height: 54, borderRadius: 20, backgroundColor: colors.navy, bottom: 0, left: 0 },
  checkBadge: { position: "absolute", right: 36, top: 46, width: 62, height: 62, borderRadius: 31, alignItems: "center", justifyContent: "center", backgroundColor: colors.success, boxShadow: "0 10px 20px rgba(20,184,122,0.26)" },
  checkText: { color: colors.surface, fontSize: 34, fontWeight: "800" },
  copy: { alignItems: "center", gap: 10, paddingHorizontal: 12 },
  eyebrow: { color: colors.success, fontSize: 12, fontWeight: "900", letterSpacing: 1.5 },
  title: { color: colors.ink, fontSize: 32, lineHeight: 42, fontWeight: "900", textAlign: "center" },
  bodyText: { color: colors.muted, fontSize: 16, lineHeight: 24, textAlign: "center", maxWidth: 330 },
  bottom: { paddingHorizontal: 24, gap: 22 },
  dots: { height: 12, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#d5dce5" },
  activeDot: { width: 26, backgroundColor: colors.navy },
  primaryButton: { minHeight: 56, borderRadius: radii.md, borderCurve: "continuous", backgroundColor: colors.navy, alignItems: "center", justifyContent: "center", paddingHorizontal: 22 },
  primaryButtonText: { color: colors.surface, fontSize: 16, fontWeight: "800" },
  pressed: { opacity: 0.84, transform: [{ scale: 0.99 }] },
});
