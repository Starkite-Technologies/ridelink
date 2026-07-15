import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Appearance } from "react-native";
import { paletteValues } from "./theme";

export type ThemeMode = "dark" | "light";

type ThemeState = {
  mode: ThemeMode;
  isDark: boolean;
  setMode: (mode: ThemeMode) => Promise<void>;
  toggleMode: () => Promise<void>;
};

const STORAGE_KEY = "ridelink.theme-mode";
const ThemeContext = createContext<ThemeState | null>(null);

function applyColorScheme(mode: ThemeMode) {
  if (typeof Appearance.setColorScheme === "function") Appearance.setColorScheme(mode);
  if (process.env.EXPO_OS === "web" && typeof document !== "undefined") {
    document.documentElement.style.colorScheme = mode;
    Object.entries(paletteValues[mode]).forEach(([name, value]) => document.documentElement.style.setProperty(`--ridelink-${name}`, value));
  }
}

// Blue dark mode is always the first paint. A saved light preference is applied
// as soon as storage is read.
applyColorScheme("dark");

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>("dark");

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      const nextMode: ThemeMode = stored === "light" ? "light" : "dark";
      setModeState(nextMode);
      applyColorScheme(nextMode);
    }).catch(() => applyColorScheme("dark"));
  }, []);

  const setMode = useCallback(async (nextMode: ThemeMode) => {
    setModeState(nextMode);
    applyColorScheme(nextMode);
    await AsyncStorage.setItem(STORAGE_KEY, nextMode);
  }, []);

  const toggleMode = useCallback(async () => {
    await setMode(mode === "dark" ? "light" : "dark");
  }, [mode, setMode]);

  const value = useMemo(() => ({ mode, isDark: mode === "dark", setMode, toggleMode }), [mode, setMode, toggleMode]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppTheme() {
  const value = React.use(ThemeContext);
  if (!value) throw new Error("useAppTheme must be used inside ThemeProvider");
  return value;
}
