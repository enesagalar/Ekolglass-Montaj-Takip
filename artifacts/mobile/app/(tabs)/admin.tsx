import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useMemo } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AssemblyCard } from "@/components/AssemblyCard";
import { AssemblyStatus, useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

const STATUS_LABELS: Record<AssemblyStatus, string> = {
  pending: "Beklemede",
  cutting: "Kesimde",
  cutting_done: "Kesim Tamam",
  installation: "Montajda",
  installation_done: "Montaj Tamam",
  water_test: "Su Testinde",
  water_test_failed: "Test Başarısız",
  completed: "Tamamlandı",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "#94a3b8",
  cutting: "#f59e0b",
  cutting_done: "#f97316",
  installation: "#0a84ff",
  installation_done: "#00bcd4",
  water_test: "#8b5cf6",
  water_test_failed: "#ef4444",
  completed: "#10b981",
};

export default function AdminScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { assemblies, glassStock, consumables, users, role } = useApp();

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

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 + 84 : insets.bottom + 84;

  const stats = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const todayNew = assemblies.filter((a) => new Date(a.createdAt) >= today).length;
    const active = assemblies.filter((a) => a.status !== "completed").length;
    const completed = assemblies.filter((a) => a.status === "completed").length;
    const waterTestFailed = assemblies.filter((a) => a.status === "water_test_failed").length;
    const lowGlassStock = glassStock.filter((g) => g.stock <= 2).length;
    const lowConsumables = consumables.filter((c) => c.stock <= 3).length;
    return { total: assemblies.length, todayNew, active, completed, waterTestFailed, lowGlassStock, lowConsumables };
  }, [assemblies, glassStock, consumables]);

  const statusBreakdown = useMemo(() => {
    const counts: Partial<Record<AssemblyStatus, number>> = {};
    assemblies.forEach((a) => { counts[a.status] = (counts[a.status] || 0) + 1; });
    return (Object.entries(counts) as [AssemblyStatus, number][]).sort((a, b) => {
      const order: AssemblyStatus[] = ["cutting", "installation", "installation_done", "water_test", "water_test_failed", "completed"];
      return order.indexOf(a[0]) - order.indexOf(b[0]);
    });
  }, [assemblies]);

  const urgentItems = useMemo(() => {
    return assemblies
      .filter((a) => a.status === "water_test_failed" || a.status === "water_test")
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [assemblies]);

  const recentActive = useMemo(() => {
    return assemblies
      .filter((a) => a.status !== "completed" && a.status !== "water_test_failed" && a.status !== "water_test")
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 3);
  }, [assemblies]);

  const hasAlerts = stats.waterTestFailed > 0 || stats.lowGlassStock > 0 || stats.lowConsumables > 0;

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[styles.container, { paddingTop: topPad + 20, paddingBottom: bottomPad }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Title */}
      <View style={styles.titleRow}>
        <Text style={[styles.pageTitle, { color: colors.foreground }]}>Yönetim Paneli</Text>
        <Pressable
          onPress={() => router.push("/all-records")}
          style={[styles.allRecordsBtn, { backgroundColor: colors.muted, borderColor: colors.border }]}
        >
          <Feather name="list" size={14} color={colors.foreground} />
          <Text style={[styles.allRecordsBtnText, { color: colors.foreground }]}>Tüm Kayıtlar</Text>
        </Pressable>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <StatCard label="Toplam" value={stats.total} color={colors.foreground} colors={colors} />
        <StatCard label="Aktif" value={stats.active} color={colors.primary} colors={colors} />
        <StatCard label="Tamamlandı" value={stats.completed} color={colors.success} colors={colors} />
      </View>

      {stats.todayNew > 0 && (
        <View style={[styles.todayBanner, { backgroundColor: colors.primary + "10", borderColor: colors.primary + "25" }]}>
          <Feather name="plus-circle" size={15} color={colors.primary} />
          <Text style={[styles.todayText, { color: colors.primary }]}>
            Bugün <Text style={{ fontFamily: "Inter_700Bold" }}>{stats.todayNew}</Text> yeni kayıt açıldı
          </Text>
        </View>
      )}

      {/* Alerts */}
      {hasAlerts && (
        <>
          <Text style={[styles.section, { color: colors.mutedForeground }]}>UYARILAR</Text>
          <View style={styles.alertsColumn}>
            {stats.waterTestFailed > 0 && (
              <AlertBox icon="alert-triangle" color={colors.destructive}
                text={`${stats.waterTestFailed} kayıt su testinden kaldı`} colors={colors} />
            )}
            {stats.lowGlassStock > 0 && (
              <AlertBox icon="package" color={colors.warning}
                text={`${stats.lowGlassStock} cam türünde stok azaldı (≤ 2)`} colors={colors} />
            )}
            {stats.lowConsumables > 0 && (
              <AlertBox icon="droplet" color={colors.warning}
                text={`${stats.lowConsumables} sarf malzemesinde stok azaldı (≤ 3)`} colors={colors} />
            )}
          </View>
        </>
      )}

      {/* Urgent water test items */}
      {urgentItems.length > 0 && (
        <>
          <Text style={[styles.section, { color: colors.mutedForeground }]}>ACİL — SU TESTİ</Text>
          {urgentItems.map((a) => <AssemblyCard key={a.id} assembly={a} />)}
        </>
      )}

      {/* Status breakdown */}
      <Text style={[styles.section, { color: colors.mutedForeground }]}>DURUM DAĞILIMI</Text>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {statusBreakdown.length === 0 ? (
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Henüz kayıt yok</Text>
        ) : statusBreakdown.map(([status, count]) => {
          const color = STATUS_COLORS[status] || colors.mutedForeground;
          const pct = stats.total > 0 ? count / stats.total : 0;
          return (
            <View key={status} style={styles.statusRow}>
              <View style={[styles.statusDot, { backgroundColor: color }]} />
              <Text style={[styles.statusLabel, { color: colors.foreground }]}>{STATUS_LABELS[status as AssemblyStatus]}</Text>
              <View style={styles.statusBarWrap}>
                <View style={[styles.statusBarFill, { backgroundColor: color, width: `${pct * 100}%` as any }]} />
              </View>
              <Text style={[styles.statusCount, { color: colors.mutedForeground }]}>{count}</Text>
            </View>
          );
        })}
      </View>

      {/* Recent active records */}
      {recentActive.length > 0 && (
        <>
          <Text style={[styles.section, { color: colors.mutedForeground }]}>AKTİF KAYITLAR</Text>
          {recentActive.map((a) => <AssemblyCard key={a.id} assembly={a} />)}
        </>
      )}

      {/* Admin actions */}
      <View style={[styles.actionsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <ActionRow icon="users" label="Kullanıcı Yönetimi" onPress={() => router.push("/manage-users" as any)} colors={colors} />
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <ActionRow icon="plus-circle" label="Yeni Kayıt" onPress={() => router.push("/new-assembly")} colors={colors} />
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <ActionRow icon="package" label="Stok Yönetimi" onPress={() => router.push("/(tabs)/stock" as any)} colors={colors} />
      </View>
    </ScrollView>
  );
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

function ActionRow({ icon, label, onPress, colors }: { icon: any; label: string; onPress: () => void; colors: any }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.actionRow, { opacity: pressed ? 0.7 : 1 }]}
    >
      <View style={[styles.actionIcon, { backgroundColor: colors.primary + "15" }]}>
        <Feather name={icon} size={16} color={colors.primary} />
      </View>
      <Text style={[styles.actionLabel, { color: colors.foreground }]}>{label}</Text>
      <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 20, gap: 12 },
  restricted: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16 },
  restrictedText: { fontSize: 15, fontFamily: "Inter_500Medium", textAlign: "center" },
  titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  pageTitle: { fontSize: 24, fontFamily: "Inter_700Bold" },
  allRecordsBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
  allRecordsBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  statsRow: { flexDirection: "row", gap: 10 },
  statCard: { flex: 1, borderRadius: 14, borderWidth: 1, padding: 14, alignItems: "center", gap: 4 },
  statValue: { fontSize: 26, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 11, fontFamily: "Inter_500Medium", textAlign: "center" },
  todayBanner: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12, borderRadius: 10, borderWidth: 1 },
  todayText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  section: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 1, marginTop: 4 },
  alertsColumn: { gap: 8 },
  alertBox: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12, borderRadius: 10, borderWidth: 1 },
  alertText: { fontSize: 13, fontFamily: "Inter_500Medium", flex: 1 },
  card: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 12 },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusLabel: { fontSize: 12, fontFamily: "Inter_500Medium", width: 110 },
  statusBarWrap: { flex: 1, height: 6, backgroundColor: "#00000010", borderRadius: 3, overflow: "hidden" },
  statusBarFill: { height: "100%", borderRadius: 3 },
  statusCount: { fontSize: 12, fontFamily: "Inter_600SemiBold", width: 24, textAlign: "right" },
  emptyText: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center" },
  actionsCard: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  actionRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14 },
  actionIcon: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  actionLabel: { flex: 1, fontSize: 14, fontFamily: "Inter_500Medium" },
  divider: { height: 1, marginHorizontal: 14 },
});
