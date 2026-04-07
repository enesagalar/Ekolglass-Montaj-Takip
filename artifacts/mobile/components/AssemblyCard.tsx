import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { AssemblyRecord } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import { StatusBadge } from "./StatusBadge";

interface AssemblyCardProps {
  assembly: AssemblyRecord;
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const mins = Math.floor(diff / (1000 * 60));

  if (mins < 60) return `${mins}dk önce`;
  if (hours < 24) return `${hours}s önce`;
  return date.toLocaleDateString("tr-TR");
}

export function AssemblyCard({ assembly }: AssemblyCardProps) {
  const colors = useColors();

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          opacity: pressed ? 0.92 : 1,
        },
      ]}
      onPress={() => router.push(`/assembly/${assembly.id}` as any)}
    >
      <View style={styles.header}>
        <View style={styles.vinRow}>
          <Feather name="shield" size={14} color={colors.mutedForeground} />
          <Text style={[styles.vin, { color: colors.mutedForeground }]}>
            {assembly.vin.slice(-8)}
          </Text>
        </View>
        <StatusBadge status={assembly.status} size="sm" />
      </View>

      <Text style={[styles.model, { color: colors.foreground }]}>
        {assembly.vehicleModel}
        <Text style={{ color: colors.mutedForeground }}> · {assembly.vehicleColor}</Text>
      </Text>

      <Text style={[styles.glass, { color: colors.primary }]}>
        {assembly.glassType}
      </Text>

      <View style={styles.footer}>
        <View style={styles.footerItem}>
          <Feather name="user" size={13} color={colors.mutedForeground} />
          <Text style={[styles.footerText, { color: colors.mutedForeground }]}>
            {assembly.assignedTo}
          </Text>
        </View>

        <View style={styles.footerItem}>
          {assembly.defects.length > 0 && (
            <>
              <Feather
                name="alert-triangle"
                size={13}
                color={
                  assembly.defects.some((d) => !d.resolved)
                    ? colors.destructive
                    : colors.success
                }
              />
              <Text
                style={[
                  styles.footerText,
                  {
                    color: assembly.defects.some((d) => !d.resolved)
                      ? colors.destructive
                      : colors.mutedForeground,
                  },
                ]}
              >
                {assembly.defects.length} kusur
              </Text>
            </>
          )}
        </View>

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
    padding: 16,
    marginBottom: 12,
    gap: 8,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  vinRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  vin: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    letterSpacing: 1,
  },
  model: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  glass: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 4,
  },
  footerItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  footerText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  time: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginLeft: "auto",
  },
});
