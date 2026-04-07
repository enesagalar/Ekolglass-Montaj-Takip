import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { AssemblyRecord, CUSTOMER_NAME, VEHICLE_MODEL, useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import { StatusBadge } from "./StatusBadge";

interface AssemblyCardProps {
  assembly: AssemblyRecord;
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const mins = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (mins < 60) return `${mins}dk önce`;
  if (hours < 24) return `${hours}s önce`;
  return date.toLocaleDateString("tr-TR");
}

export function AssemblyCard({ assembly }: AssemblyCardProps) {
  const colors = useColors();
  const { getGlassProduct } = useApp();

  const glassNames = assembly.glassProductIds
    .map((id) => getGlassProduct(id))
    .filter(Boolean)
    .map((g) => g!.code);

  const glassLabel =
    glassNames.length === 0
      ? "—"
      : glassNames.length === 1
      ? glassNames[0]
      : `${glassNames.length} cam (${glassNames.join(", ")})`;

  const hasOpenDefects = assembly.defects.some((d) => !d.resolved);

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor:
            assembly.status === "water_test_failed"
              ? colors.destructive + "50"
              : colors.border,
          opacity: pressed ? 0.92 : 1,
        },
      ]}
      onPress={() => router.push(`/assembly/${assembly.id}` as any)}
    >
      {/* Top row */}
      <View style={styles.header}>
        <View style={styles.vinRow}>
          <Feather name="shield" size={13} color={colors.mutedForeground} />
          <Text style={[styles.vin, { color: colors.mutedForeground }]}>
            {assembly.vin.slice(-10)}
          </Text>
        </View>
        <StatusBadge status={assembly.status} size="sm" />
      </View>

      {/* Vehicle */}
      <Text style={[styles.vehicle, { color: colors.foreground }]}>
        {VEHICLE_MODEL}
        <Text style={[styles.customer, { color: colors.mutedForeground }]}>
          {" "}· {CUSTOMER_NAME}
        </Text>
      </Text>

      {/* Glass codes */}
      <View style={styles.glassRow}>
        <Feather name="grid" size={12} color={colors.primary} />
        <Text style={[styles.glassLabel, { color: colors.primary }]} numberOfLines={1}>
          {glassLabel}
        </Text>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <View style={styles.footerItem}>
          <Feather name="user" size={12} color={colors.mutedForeground} />
          <Text style={[styles.footerText, { color: colors.mutedForeground }]}>
            {assembly.assignedTo}
          </Text>
        </View>

        {assembly.photos.length > 0 && (
          <View style={styles.footerItem}>
            <Feather name="camera" size={12} color={colors.mutedForeground} />
            <Text style={[styles.footerText, { color: colors.mutedForeground }]}>
              {assembly.photos.length}
            </Text>
          </View>
        )}

        {assembly.defects.length > 0 && (
          <View style={styles.footerItem}>
            <Feather
              name="alert-triangle"
              size={12}
              color={hasOpenDefects ? colors.destructive : colors.success}
            />
            <Text
              style={[
                styles.footerText,
                { color: hasOpenDefects ? colors.destructive : colors.mutedForeground },
              ]}
            >
              {assembly.defects.length} kusur
            </Text>
          </View>
        )}

        <Text style={[styles.time, { color: colors.mutedForeground }]}>
          {formatTime(assembly.updatedAt)}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
    gap: 7,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  vinRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  vin: { fontSize: 12, fontFamily: "Inter_500Medium", letterSpacing: 0.8 },
  vehicle: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  customer: { fontSize: 13, fontFamily: "Inter_400Regular" },
  glassRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  glassLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold", flex: 1 },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 2,
  },
  footerItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  footerText: { fontSize: 11, fontFamily: "Inter_400Regular" },
  time: { fontSize: 11, fontFamily: "Inter_400Regular", marginLeft: "auto" },
});
