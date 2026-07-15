import { useCallback, useEffect, useRef } from "react";
import { Keyboard, type NativeScrollEvent, type NativeSyntheticEvent, type ScrollView, useWindowDimensions } from "react-native";
import type { TextInput } from "../components/Typography";

export function useKeyboardAwareScroll() {
  const scrollRef = useRef<ScrollView>(null);
  const scrollOffsetRef = useRef(0);
  const keyboardHeightRef = useRef(0);
  const pendingInputRef = useRef<React.RefObject<TextInput | null> | null>(null);
  const timersRef = useRef<Array<ReturnType<typeof setTimeout>>>([]);
  const { height: windowHeight } = useWindowDimensions();

  const ensureInputVisible = useCallback(() => {
    const node = pendingInputRef.current?.current;
    if (!node || typeof node.measureInWindow !== "function") return;
    try {
      node.measureInWindow((_x, y, _width, height) => {
        const visibleBottom = windowHeight - keyboardHeightRef.current - 28;
        const inputBottom = y + height;
        if (inputBottom > visibleBottom) {
          scrollRef.current?.scrollTo({
            y: Math.max(0, scrollOffsetRef.current + inputBottom - visibleBottom),
            animated: true,
          });
        }
      });
    } catch {
      // Web does not expose native measurement in every browser.
    }
  }, [windowHeight]);

  const scheduleVisibilityCheck = useCallback((delay: number) => {
    const timer = setTimeout(ensureInputVisible, delay);
    timersRef.current.push(timer);
  }, [ensureInputVisible]);

  useEffect(() => {
    const showEvent = process.env.EXPO_OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = process.env.EXPO_OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const showSub = Keyboard.addListener(showEvent, (event) => {
      keyboardHeightRef.current = event.endCoordinates.height;
      scheduleVisibilityCheck(0);
      scheduleVisibilityCheck(120);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      keyboardHeightRef.current = 0;
      pendingInputRef.current = null;
    });
    return () => {
      showSub.remove();
      hideSub.remove();
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
    };
  }, [scheduleVisibilityCheck]);

  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollOffsetRef.current = event.nativeEvent.contentOffset.y;
  }, []);

  const scrollToInput = useCallback((inputRef: React.RefObject<TextInput | null>) => {
    pendingInputRef.current = inputRef;
    // The first pass handles an already-open keyboard; the second runs after the
    // opening animation has reported its final height.
    scheduleVisibilityCheck(40);
    scheduleVisibilityCheck(320);
  }, [scheduleVisibilityCheck]);

  const scrollToEnd = useCallback(() => scrollRef.current?.scrollToEnd({ animated: true }), []);

  return { scrollRef, handleScroll, scrollToInput, scrollToEnd };
}
