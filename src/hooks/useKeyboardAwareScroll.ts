import { useEffect, useRef } from "react";
import { Dimensions, Keyboard, Platform, type NativeScrollEvent, type NativeSyntheticEvent, type ScrollView } from "react-native";
import type { TextInput } from "../components/Typography";

export function useKeyboardAwareScroll() {
  const scrollRef = useRef<ScrollView>(null);
  const scrollOffsetRef = useRef(0);
  const keyboardHeightRef = useRef(0);

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const showSub = Keyboard.addListener(showEvent, (event) => {
      keyboardHeightRef.current = event.endCoordinates.height;
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      keyboardHeightRef.current = 0;
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollOffsetRef.current = event.nativeEvent.contentOffset.y;
  };

  const scrollToInput = (inputRef: React.RefObject<TextInput | null>) => {
    setTimeout(() => {
      const node = inputRef.current;
      if (!node || typeof node.measureInWindow !== "function") return;
      try {
        node.measureInWindow((x, y, width, height) => {
          const windowHeight = Dimensions.get("window").height;
          const visibleBottom = windowHeight - keyboardHeightRef.current - 24;
          const inputBottom = y + height;
          if (inputBottom > visibleBottom) {
            const delta = inputBottom - visibleBottom;
            scrollRef.current?.scrollTo({ y: scrollOffsetRef.current + delta, animated: true });
          }
        });
      } catch {
        // measureInWindow isn't supported on this platform (e.g. react-native-web) - skip.
      }
    }, 60);
  };

  return { scrollRef, handleScroll, scrollToInput };
}
