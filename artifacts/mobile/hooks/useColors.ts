import { useEffect, useState } from "react";

import colors from "@/constants/colors";

function isDarkTime(): boolean {
  const h = new Date().getHours();
  return h >= 20 || h < 6;
}

/**
 * Time-based theme: 06:00–20:00 → Light, 20:00–06:00 → Dark.
 * Automatically switches at threshold hours without needing device settings.
 */
export function useColors() {
  const [dark, setDark] = useState(isDarkTime);

  useEffect(() => {
    const interval = setInterval(() => setDark(isDarkTime()), 60_000);
    return () => clearInterval(interval);
  }, []);

  const palette = dark ? colors.dark : colors.light;
  return { ...palette, radius: colors.radius, isDark: dark };
}
