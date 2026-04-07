import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { AssemblyStatus } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

const STATUS_LABELS: Record<AssemblyStatus, string> = {
  pending: "Bekliyor",
  in_progress: "Devam Ediyor",
  qc_check: "KK Kontrolü",
  completed: "Tamamlandı",
  delivered: "Teslim Edildi",
};

interface StatusBadgeProps {
  status: AssemblyStatus;
  size?: "sm" | "md";
}

export function StatusBadge({ status, size = "md" }: StatusBadgeProps) {
  const colors = useColors();

  const getStatusColor = (): string => {
    switch (status) {
      case "pending": return colors.statusPending;
      case "in_progress": return colors.statusInProgress;
      case "qc_check": return colors.statusQC;
      case "completed": return colors.statusCompleted;
      case "delivered": return colors.statusDelivered;
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
      <Text
        style={[
          styles.label,
          { color, fontSize: isSmall ? 11 : 12 },
        ]}
      >
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
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  label: {
    fontWeight: "600",
    letterSpacing: 0.2,
  },
});
