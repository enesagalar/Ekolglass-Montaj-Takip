import { Feather } from "@expo/vector-icons";
import React, { useMemo } from "react";
import { Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AssemblyCard } from "@/components/AssemblyCard";
import { AssemblyStatus, useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

const STATUS_LABELS: Record<AssemblyStatus, string> = {
  cutting: "Kesim",
  installation: "Montaj",
  installation_done: "Montaj Tamam",
  water_test: "Su Testi",
  water_test_failed: "Test Başarısız",
  completed: "Tamamlandı",
};

const STATUS_COLORS: Record<string, string> = {
  cutting: "#f59e0b",
  installation: "#0a84ff",
  installation_done: "#00bcd4",
  water_test: "#8b5cf6",
  water_test_failed: "#ef4444",
  completed: "#10b981",
};

export default function AdminScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { assemblies, glassStock, consumables, role } = useApp();

  if (role !== "admin") {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background }}>
        <Feather name="lock" size={36} color={colors.mutedForeground} />
        <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_500Medium", marginTop: 12 }}>
          Bu bölüm sadece yöneticiler içindir
        </Text>
      </View>
    );
  }

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 + 84 : insets.bottom + 84;

  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayAssemblies = assemblies.filter((a) => new Date(a.createdAt) >= today);
    const active = assemblies.filter((a) => a.status !== "completed").length;
    const waterTestFailed = assemblies.filter((a) => a.status === "water_test_failed").length;
    const completedToday = todayAssemblies.filter((a) => a.status === "completed").length;
    const openDefects = assemblies.reduce((s, a) => s + a.defects.filter((d) => !d.resolved).length, 0);
    const lowGlassStock = glassStock.filter((g) => g.stock <= 2).length;
    const lowConsumables = consumables.filter((c) => c.stock <= 3).length;
    return { total: assemblies.length, todayNew: todayAssemblies.length, active, waterTestFailed, completedToday, openDefects, lowGlassStock, lowConsumables };
  }, [assemblies, glassStock, consumables]);

  const statusBreakdown = useMemo(() => {
    const counts: Partial<Record<AssemblyStatus, number>> = {};
    assemblies.forEach((a) => { counts[a.status] = (counts[a.status] || 0) + 1; });
    return Object.entries(counts) as [AssemblyStatus, number][];
  }, [assemblies]);

  const staffBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    assemblies.filter((a) => a.status !== "completed").forEach((a) => {
      map[a.assignedTo] = (map[a.assignedTo] || 0) + 1;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [assemblies]);

  const urgentItems = useMemo(() => {
    return assemblies
      .filter((a) => a.status === "water_test_failed" || a.status === "water_test")
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [assemblies]);

  const recentActive = useMemo(() => {
    return assemblies
      .filter((a) => a.status !== "completed" && a.status !== "water_test_failed")
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 4);
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
      contentContainerStyle={[styles.container, { paddingTop: topPad + 20, paddingBottom: bottomPad }]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.pageTitle, { color: colors.foreground }]}>Yönetim Paneli</Text>

      <SectionLabel label="BUGÜN" colors={colors} />
      <View style={styles.statsRow}>
        <StatCard label="Yeni Kayıt" value={stats.todayNew} color={colors.primary} colors={colors} />
        <StatCard label="Tamamlandı" value={stats.completedToday} color={colors.success} colors={colors} />
        <StatCard label="Açık Kusur" value={stats.openDefects} color={stats.openDefects > 0 ? colors.destructive : colors.success} colors={colors} />
      </View>

      {(stats.waterTestFailed > 0 || stats.lowGlassStock > 0 || stats.lowConsumables > 0) && (
        <>
          <SectionLabel label="UYARILAR" colors={colors} />
          <View style={styles.alertsColumn}>
            {stats.waterTestFailed > 0 && (
              <AlertBox
                icon="alert-triangle"
                color={colors.destructive}
                text={`${stats.waterTestFailed} kayıt su testinden kaldı — admin onayı gerekli`}
                colors={colors}
              />
            )}
            {stats.lowGlassStock > 0 && (
              <AlertBox
                icon="package"
                color={colors.warning}
                text={`${stats.lowGlassStock} cam türünde stok azaldı`}
                colors={colors}
              />
            )}
            {stats.lowConsumables > 0 && (
              <AlertBox
                icon="droplet"
                color={colors.warning}
                text={`${stats.lowConsumables} sarf malzemesinde stok azaldı`}
                colors={colors}
              />
            )}
          </View>
        </>
      )}

      {urgentItems.length > 0 && (
        <>
          <SectionLabel label="ACİL — SU TESTİ" colors={colors} />
          {urgentItems.map((a) => <AssemblyCard key={a.id} assembly={a} />)}
        </>
      )}

      <SectionLabel label="DURUM DAĞILIMI" colors={colors} />
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {statusBreakdown.map(([status, count]) => {
          const color = STATUS_COLORS[status] || colors.mutedForeground;
          const pct = stats.total > 0 ? count / stats.total : 0;
          return (
            <View key={status} style={styles.statusRow}>
              <View style={[styles.statusDot, { backgroundColor: color }]} />
              <Text style={[styles.statusLabel, { color: colors.foreground }]}>
                {STATUS_LABELS[status]}
              </Text>
              <View style={styles.statusBarWrap}>
                <View style={[styles.statusBarFill, { backgroundColor: color, width: `${pct * 100}%` as any }]} />
              </View>
              <Text style={[styles.statusCount, { color: colors.mutedForeground }]}>{count}</Text>
            </View>
          );
        })}
      </View>

      {staffBreakdown.length > 0 && (
        <>
          <SectionLabel label="PERSONEL YÜKÜ (AKTİF)" colors={colors} />
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {staffBreakdown.map(([name, count]) => {
              const maxCount = staffBreakdown[0][1];
              const pct = count / maxCount;
              return (
                <View key={name} style={styles.staffRow}>
                  <View style={styles.staffLeft}>
                    <Feather name="user" size={13} color={colors.mutedForeground} />
                    <Text style={[styles.staffName, { color: colors.foreground }]}>{name}</Text>
                  </View>
                  <View style={styles.barContainer}>
                    <View style={[styles.barFill, { backgroundColor: colors.primary, width: `${pct * 100}%` as any }]} />
                  </View>
                  <Text style={[styles.staffCount, { color: colors.mutedForeground }]}>{count}</Text>
                </View>
              );
            })}
          </View>
        </>
      )}

      {recentActive.length > 0 && (
        <>
          <SectionLabel label="AKTİF KAYITLAR" colors={colors} />
          {recentActive.map((a) => <AssemblyCard key={a.id} assembly={a} />)}
        </>
      )}
    </ScrollView>
  );
}

function SectionLabel({ label, colors }: { label: string; colors: any }) {
  return <Text style={[styles.section, { color: colors.mutedForeground }]}>{label}</Text>;
}

function StatCard({ label, value, color, colors }: { label: string; value: number; color: string; colors: any }) {
  return (
    <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

function AlertBox({ icon, color, text, colors }: { icon: any; color: string; text: string; colors: any }) {
  return (
    <View style={[styles.alertBox, { backgroundColor: color + "10", borderColor: color + "30" }]}>
      <Feather name={icon} size={14} color={color} />
      <Text style={[styles.alertText, { color }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 20, gap: 12 },
  pageTitle: { fontSize: 24, fontFamily: "Inter_700Bold", marginBottom: 4 },
  section: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 1, marginTop: 4 },
  statsRow: { flexDirection: "row", gap: 10 },
  statCard: { flex: 1, borderRadius: 14, borderWidth: 1, padding: 14, alignItems: "center", gap: 4 },
  statValue: { fontSize: 28, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 11, fontFamily: "Inter_500Medium", textAlign: "center" },
  alertsColumn: { gap: 8 },
  alertBox: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12, borderRadius: 10, borderWidth: 1 },
  alertText: { fontSize: 13, fontFamily: "Inter_500Medium", flex: 1 },
  card: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 12 },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusLabel: { fontSize: 12, fontFamily: "Inter_500Medium", width: 100 },
  statusBarWrap: { flex: 1, height: 6, backgroundColor: "#00000010", borderRadius: 3, overflow: "hidden" },
  statusBarFill: { height: "100%", borderRadius: 3 },
  statusCount: { fontSize: 12, fontFamily: "Inter_600SemiBold", width: 24, textAlign: "right" },
  staffRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  staffLeft: { flexDirection: "row", alignItems: "center", gap: 6, width: 130 },
  staffName: { fontSize: 13, fontFamily: "Inter_500Medium", flex: 1 },
  barContainer: { flex: 1, height: 8, backgroundColor: "#00000010", borderRadius: 4, overflow: "hidden" },
  barFill: { height: "100%", borderRadius: 4 },
  staffCount: { fontSize: 13, fontFamily: "Inter_600SemiBold", width: 20, textAlign: "right" },
  restricted: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16 },
  restrictedText: { fontSize: 15, fontFamily: "Inter_500Medium", textAlign: "center" },
});
