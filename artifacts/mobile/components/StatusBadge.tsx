import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { AssemblyStatus } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

export const STATUS_LABELS: Record<AssemblyStatus, string> = {
  cutting: "Kesime Başlandı",
  installation: "Montaja Başlandı",
  installation_done: "Montaj Tamamlandı",
  water_test: "Su Testinde",
  water_test_failed: "Test Başarısız",
  completed: "Tamamlandı",
};

interface StatusBadgeProps {
  status: AssemblyStatus;
  size?: "sm" | "md";
}

export function StatusBadge({ status, size = "md" }: StatusBadgeProps) {
  const colors = useColors();

  const getStatusColor = (): string => {
    switch (status) {
      case "cutting": return colors.warning;
      case "installation": return colors.primary;
      case "installation_done": return colors.accent;
      case "water_test": return "#8b5cf6";
      case "water_test_failed": return colors.destructive;
      case "completed": return colors.success;
    }
  };

  const color = getStatusColor();
  const isSmall = size === "sm";

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: color + "20",
          borderColor: color + "40",
          paddingHorizontal: isSmall ? 8 : 12,
          paddingVertical: isSmall ? 3 : 5,
        },
      ]}
    >
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.label, { color, fontSize: isSmall ? 11 : 12 }]}>
        {STATUS_LABELS[status]}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 100,
    borderWidth: 1,
    gap: 5,
    alignSelf: "flex-start",
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  label: { fontFamily: "Inter_600SemiBold", letterSpacing: 0.2 },
});
