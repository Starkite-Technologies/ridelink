import { forwardRef } from "react";
import { KeyboardAvoidingView, ScrollView, type ScrollViewProps } from "react-native";

export const KeyboardSafeScreen = forwardRef<ScrollView, ScrollViewProps>(({ children, ...props }, ref) => (
  <KeyboardAvoidingView
    style={{ flex: 1 }}
    behavior={process.env.EXPO_OS === "ios" ? "padding" : process.env.EXPO_OS === "android" ? "height" : undefined}
  >
    <ScrollView
      ref={ref}
      contentInsetAdjustmentBehavior="automatic"
      automaticallyAdjustKeyboardInsets={process.env.EXPO_OS === "ios"}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode={process.env.EXPO_OS === "ios" ? "interactive" : "on-drag"}
      {...props}
    >
      {children}
    </ScrollView>
  </KeyboardAvoidingView>
));

KeyboardSafeScreen.displayName = "KeyboardSafeScreen";
