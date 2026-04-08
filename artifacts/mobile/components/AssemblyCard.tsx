import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { AssemblyRecord, CUSTOMER_NAME, getBrandGlassCode, getBrandName, useApp } from "@/context/AppContext";
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
  if (mins < 2) return "Az önce";
  if (mins < 60) return `${mins}dk önce`;
  if (hours < 24) return `${hours}s önce`;
  return date.toLocaleDateString("tr-TR");
}

function formatExactTime(dateStr?: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
}

export function AssemblyCard({ assembly }: AssemblyCardProps) {
  const colors = useColors();
  const { getGlassProduct } = useApp();

  const brandName = getBrandName(assembly.vehicleModel ?? "fiat-ducato");
  const glassLabels = assembly.glassProductIds
    .map((id) => {
      const g = getGlassProduct(id);
      if (!g) return null;
      return getBrandGlassCode(assembly.vehicleModel ?? "fiat-ducato", g.suffix);
    })
    .filter(Boolean) as string[];

  const glassLabel =
    glassLabels.length === 0
      ? "—"
      : glassLabels.length === 1
      ? glassLabels[0]
      : `${glassLabels.length} cam (${glassLabels.slice(0, 2).join(", ")}${glassLabels.length > 2 ? "..." : ""})`;

  const hasOpenDefects = assembly.defects.some((d) => !d.resolved);
  const isWaterTestFailed = assembly.status === "water_test_failed";
  const isWaterTestPending = assembly.status === "water_test" && assembly.waterTestCustomerApproval === "pending";

  const createdTime = formatExactTime(assembly.createdAt);

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: isWaterTestFailed
            ? colors.destructive + "60"
            : isWaterTestPending
            ? colors.warning + "60"
            : colors.border,
          opacity: pressed ? 0.92 : 1,
        },
      ]}
      onPress={() => router.push({ pathname: "/assembly/[id]", params: { id: assembly.id } })}
    >
      {/* Top row */}
      <View style={styles.header}>
        <View style={styles.vinRow}>
          <Feather name="shield" size={13} color={colors.mutedForeground} />
          <Text style={[styles.vin, { color: colors.mutedForeground }]}>
            ···{assembly.vinLast5 ?? assembly.vin?.slice(-5) ?? assembly.vin?.slice(-8)}
          </Text>
        </View>
        <StatusBadge status={assembly.status} size="sm" />
      </View>

      {/* Vehicle */}
      <Text style={[styles.vehicle, { color: colors.foreground }]}>
        {brandName}
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

      {/* Water test pending badge */}
      {isWaterTestPending && (
        <View style={[styles.pendingBadge, { backgroundColor: colors.warning + "15", borderColor: colors.warning + "40" }]}>
          <Feather name="clock" size={11} color={colors.warning} />
          <Text style={[styles.pendingText, { color: colors.warning }]}>Müşteri onayı bekleniyor</Text>
        </View>
      )}

      {/* Footer */}
      <View style={styles.footer}>
        <View style={styles.footerItem}>
          <Feather name="user" size={12} color={colors.mutedForeground} />
          <Text style={[styles.footerText, { color: colors.mutedForeground }]}>
            {assembly.assignedTo}
          </Text>
        </View>

        {createdTime ? (
          <View style={styles.footerItem}>
            <Feather name="clock" size={12} color={colors.mutedForeground} />
            <Text style={[styles.footerText, { color: colors.mutedForeground }]}>{createdTime}</Text>
          </View>
        ) : null}

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
    borderRadius: 16, borderWidth: 1, padding: 14, marginBottom: 10, gap: 7,
  },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  vinRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  vin: { fontSize: 13, fontFamily: "Inter_600SemiBold", letterSpacing: 1.5 },
  vehicle: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  customer: { fontSize: 13, fontFamily: "Inter_400Regular" },
  glassRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  glassLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold", flex: 1 },
  pendingBadge: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 9, paddingVertical: 5, borderRadius: 8, borderWidth: 1, alignSelf: "flex-start",
  },
  pendingText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  footer: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 2 },
  footerItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  footerText: { fontSize: 11, fontFamily: "Inter_400Regular" },
  time: { fontSize: 11, fontFamily: "Inter_400Regular", marginLeft: "auto" },
});
