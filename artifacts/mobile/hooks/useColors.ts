import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";

import colors from "@/constants/colors";

const THEME_KEY = "@ekolglass_theme";

let _dark = false;
const _subscribers = new Set<(dark: boolean) => void>();
let _initialized = false;

async function initTheme() {
  if (_initialized) return;
  _initialized = true;
  try {
    const stored = await AsyncStorage.getItem(THEME_KEY);
    if (stored !== null) {
      const val = stored === "dark";
      _dark = val;
      _subscribers.forEach((fn) => fn(val));
    }
  } catch {}
}

export function toggleTheme() {
  _dark = !_dark;
  AsyncStorage.setItem(THEME_KEY, _dark ? "dark" : "light").catch(() => {});
  _subscribers.forEach((fn) => fn(_dark));
}

export function useColors() {
  const [dark, setDark] = useState(_dark);

  useEffect(() => {
    _subscribers.add(setDark);
    initTheme();
    return () => {
      _subscribers.delete(setDark);
    };
  }, []);

  const palette = dark ? colors.dark : colors.light;
  return { ...palette, radius: colors.radius, isDark: dark };
}
