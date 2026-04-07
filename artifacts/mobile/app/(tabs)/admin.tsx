import { Feather } from "@expo/vector-icons";
import React, { useMemo } from "react";
import {
  FlatList,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AssemblyCard } from "@/components/AssemblyCard";
import { StatCard } from "@/components/StatCard";
import { AssemblyStatus, useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

const STATUS_ORDER: AssemblyStatus[] = [
  "pending",
  "in_progress",
  "qc_check",
  "completed",
  "delivered",
];

export default function AdminScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { assemblies, role } = useApp();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 + 84 : insets.bottom + 84;

  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayAssemblies = assemblies.filter(
      (a) => new Date(a.createdAt) >= today
    );
    const inProgress = assemblies.filter((a) => a.status === "in_progress").length;
    const qcPending = assemblies.filter((a) => a.status === "qc_check").length;
    const completedToday = todayAssemblies.filter(
      (a) => a.status === "completed" || a.status === "delivered"
    ).length;
    const openDefects = assemblies.reduce(
      (sum, a) => sum + a.defects.filter((d) => !d.resolved).length,
      0
    );

    return {
      total: assemblies.length,
      todayNew: todayAssemblies.length,
      inProgress,
      qcPending,
      completedToday,
      openDefects,
    };
  }, [assemblies]);

  const staffBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    assemblies.forEach((a) => {
      if (a.status !== "delivered") {
        map[a.assignedTo] = (map[a.assignedTo] || 0) + 1;
      }
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [assemblies]);

  const recentActive = useMemo(() => {
    return assemblies
      .filter((a) => a.status !== "delivered")
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 5);
  }, [assemblies]);

  if (role !== "admin") {
    return (
      <View style={[styles.restricted, { backgroundColor: colors.background }]}>
        <Feather name="lock" size={40} color={colors.mutedForeground} />
        <Text style={[styles.restrictedText, { color: colors.mutedForeground }]}>
          Bu bölüm sadece yöneticiler içindir
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[
        styles.container,
        { paddingTop: topPad + 20, paddingBottom: bottomPad },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.pageTitle, { color: colors.foreground }]}>
        Yönetim Paneli
      </Text>

      <Text style={[styles.section, { color: colors.mutedForeground }]}>
        BUGÜN
      </Text>
      <View style={styles.statsRow}>
        <StatCard label="Yeni Kayıt" value={stats.todayNew} color={colors.primary} />
        <StatCard
          label="Tamamlandı"
          value={stats.completedToday}
          color={colors.success}
        />
        <StatCard
          label="Açık Kusur"
          value={stats.openDefects}
          color={stats.openDefects > 0 ? colors.destructive : colors.success}
        />
      </View>

      <Text style={[styles.section, { color: colors.mutedForeground }]}>
        GENEL DURUM
      </Text>
      <View style={styles.statsRow}>
        <StatCard label="Devam Ediyor" value={stats.inProgress} color={colors.statusInProgress} />
        <StatCard label="KK Bekliyor" value={stats.qcPending} color={colors.statusQC} />
        <StatCard label="Toplam" value={stats.total} color={colors.mutedForeground} />
      </View>

      {staffBreakdown.length > 0 && (
        <>
          <Text style={[styles.section, { color: colors.mutedForeground }]}>
            PERSONEL YÜKÜ
          </Text>
          <View
            style={[
              styles.staffCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            {staffBreakdown.map(([name, count], i) => {
              const maxCount = staffBreakdown[0][1];
              const pct = count / maxCount;
              return (
                <View key={name} style={styles.staffRow}>
                  <Text
                    style={[styles.staffName, { color: colors.foreground }]}
                  >
                    {name}
                  </Text>
                  <View style={styles.barContainer}>
                    <View
                      style={[
                        styles.barFill,
                        {
                          backgroundColor: colors.primary,
                          width: `${pct * 100}%` as any,
                        },
                      ]}
                    />
                  </View>
                  <Text
                    style={[styles.staffCount, { color: colors.mutedForeground }]}
                  >
                    {count}
                  </Text>
                </View>
              );
            })}
          </View>
        </>
      )}

      <Text style={[styles.section, { color: colors.mutedForeground }]}>
        AKTİF KAYITLAR
      </Text>
      {recentActive.map((a) => (
        <AssemblyCard key={a.id} assembly={a} />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    gap: 12,
  },
  pageTitle: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    marginBottom: 8,
  },
  section: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1,
    marginTop: 8,
    marginBottom: -4,
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
  },
  staffCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 14,
  },
  staffRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  staffName: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    width: 110,
  },
  barContainer: {
    flex: 1,
    height: 8,
    backgroundColor: "#00000010",
    borderRadius: 4,
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    borderRadius: 4,
  },
  staffCount: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    width: 20,
    textAlign: "right",
  },
  restricted: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  restrictedText: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    textAlign: "center",
  },
});
