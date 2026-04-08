import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AssemblyCard } from "@/components/AssemblyCard";
import { AssemblyStatus, VEHICLE_BRANDS, useApp } from "@/context/AppContext";
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

type DateRange = "today" | "week" | "month" | "all";
const DATE_RANGES: { label: string; value: DateRange }[] = [
  { label: "Bugün", value: "today" },
  { label: "Bu Hafta", value: "week" },
  { label: "Bu Ay", value: "month" },
  { label: "Tümü", value: "all" },
];

function getDateStart(range: DateRange): Date {
  const now = new Date();
  if (range === "today") { const d = new Date(now); d.setHours(0, 0, 0, 0); return d; }
  if (range === "week") { const d = new Date(now); d.setDate(d.getDate() - 7); d.setHours(0, 0, 0, 0); return d; }
  if (range === "month") { const d = new Date(now); d.setDate(1); d.setHours(0, 0, 0, 0); return d; }
  return new Date(0);
}

function getLast7Days(): string[] {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().split("T")[0]);
  }
  return days;
}

function formatDayLabel(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("tr-TR", { weekday: "short" });
}

export default function AdminScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { assemblies, glassStock, consumables, users, role } = useApp();
  const [dateRange, setDateRange] = useState<DateRange>("today");

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

  const rangeStart = useMemo(() => getDateStart(dateRange), [dateRange]);

  const rangeAssemblies = useMemo(
    () => assemblies.filter((a) => new Date(a.createdAt) >= rangeStart),
    [assemblies, rangeStart]
  );

  const stats = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const todayAssemblies = assemblies.filter((a) => new Date(a.createdAt) >= today);
    const active = assemblies.filter((a) => a.status !== "completed").length;
    const waterTestFailed = assemblies.filter((a) => a.status === "water_test_failed").length;
    const completedRange = rangeAssemblies.filter((a) => a.status === "completed").length;
    const openDefects = assemblies.reduce((s, a) => s + a.defects.filter((d) => !d.resolved).length, 0);
    const lowGlassStock = glassStock.filter((g) => g.stock <= 2).length;
    const lowConsumables = consumables.filter((c) => c.stock <= 3).length;
    const totalPhotos = assemblies.reduce((s, a) => s + a.photos.length, 0);
    const completionRate = assemblies.length > 0
      ? Math.round((assemblies.filter((a) => a.status === "completed").length / assemblies.length) * 100)
      : 0;
    const activeStaff = users.filter((u) => u.role === "field" && u.active).length;
    return {
      total: assemblies.length,
      todayNew: todayAssemblies.length,
      rangeNew: rangeAssemblies.length,
      active,
      waterTestFailed,
      completedRange,
      openDefects,
      lowGlassStock,
      lowConsumables,
      totalPhotos,
      completionRate,
      activeStaff,
    };
  }, [assemblies, glassStock, consumables, users, rangeAssemblies]);

  const statusBreakdown = useMemo(() => {
    const counts: Partial<Record<AssemblyStatus, number>> = {};
    assemblies.forEach((a) => { counts[a.status] = (counts[a.status] || 0) + 1; });
    return (Object.entries(counts) as [AssemblyStatus, number][]).sort((a, b) => {
      const order: AssemblyStatus[] = ["cutting", "installation", "installation_done", "water_test", "water_test_failed", "completed"];
      return order.indexOf(a[0]) - order.indexOf(b[0]);
    });
  }, [assemblies]);

  const brandBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    rangeAssemblies.forEach((a) => {
      const brand = VEHICLE_BRANDS.find((b) => b.id === (a.vehicleModel ?? "fiat-ducato"))?.name ?? "Diğer";
      map[brand] = (map[brand] || 0) + 1;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [rangeAssemblies]);

  const staffBreakdown = useMemo(() => {
    const map: Record<string, { active: number; completed: number }> = {};
    assemblies.forEach((a) => {
      if (!map[a.assignedTo]) map[a.assignedTo] = { active: 0, completed: 0 };
      if (a.status === "completed") map[a.assignedTo].completed++;
      else map[a.assignedTo].active++;
    });
    return Object.entries(map)
      .map(([name, v]) => ({ name, ...v, total: v.active + v.completed }))
      .sort((a, b) => b.total - a.total);
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

  const last7Days = useMemo(() => getLast7Days(), []);
  const weeklyTrend = useMemo(() => {
    return last7Days.map((day) => ({
      day,
      label: formatDayLabel(day),
      count: assemblies.filter((a) => a.createdAt.startsWith(day)).length,
      completed: assemblies.filter((a) => a.completedAt?.startsWith(day)).length,
    }));
  }, [assemblies, last7Days]);
  const maxWeeklyCount = Math.max(1, ...weeklyTrend.map((d) => d.count));

  const topPadStyle = Platform.OS === "web" ? topPad + 20 : topPad + 20;

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[styles.container, { paddingTop: topPadStyle, paddingBottom: bottomPad }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.titleRow}>
        <Text style={[styles.pageTitle, { color: colors.foreground }]}>Yönetim Paneli</Text>
        <Pressable
          onPress={() => router.push("/all-records")}
          style={[styles.quickBtn, { backgroundColor: colors.muted, borderColor: colors.border }]}
        >
          <Feather name="list" size={14} color={colors.foreground} />
          <Text style={[styles.quickBtnText, { color: colors.foreground }]}>Tüm Kayıtlar</Text>
        </Pressable>
      </View>

      {/* Date range selector */}
      <View style={styles.dateRangeRow}>
        {DATE_RANGES.map((r) => (
          <Pressable
            key={r.value}
            onPress={() => setDateRange(r.value)}
            style={[
              styles.dateRangeChip,
              { backgroundColor: dateRange === r.value ? colors.foreground : colors.muted, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.dateRangeText, { color: dateRange === r.value ? colors.background : colors.mutedForeground }]}>
              {r.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Period stats */}
      <SectionLabel label={`${DATE_RANGES.find((r) => r.value === dateRange)?.label.toUpperCase()} — ÖZET`} colors={colors} />
      <View style={styles.statsRow}>
        <StatCard label="Yeni Kayıt" value={stats.rangeNew} color={colors.primary} colors={colors} />
        <StatCard label="Tamamlandı" value={stats.completedRange} color={colors.success} colors={colors} />
        <StatCard label="Toplam Aktif" value={stats.active} color={colors.warning} colors={colors} />
      </View>
      <View style={styles.statsRow}>
        <StatCard label="Toplam Kayıt" value={stats.total} color={colors.foreground} colors={colors} />
        <StatCard label="Tamamlanma %" value={stats.completionRate} color={stats.completionRate >= 70 ? colors.success : colors.warning} colors={colors} suffix="%" />
        <StatCard label="Açık Kusur" value={stats.openDefects} color={stats.openDefects > 0 ? colors.destructive : colors.success} colors={colors} />
      </View>

      {/* Quick stats row */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, flexDirection: "row" }]}>
        <QuickStat icon="users" label="Saha Personeli" value={String(stats.activeStaff)} colors={colors} />
        <View style={[styles.quickStatDivider, { backgroundColor: colors.border }]} />
        <QuickStat icon="camera" label="Toplam Fotoğraf" value={String(stats.totalPhotos)} colors={colors} />
        <View style={[styles.quickStatDivider, { backgroundColor: colors.border }]} />
        <QuickStat icon="alert-triangle" label="Su Test Başarısız" value={String(stats.waterTestFailed)} colors={colors} danger={stats.waterTestFailed > 0} />
      </View>

      {/* Alerts */}
      {(stats.waterTestFailed > 0 || stats.lowGlassStock > 0 || stats.lowConsumables > 0) && (
        <>
          <SectionLabel label="UYARILAR" colors={colors} />
          <View style={styles.alertsColumn}>
            {stats.waterTestFailed > 0 && (
              <AlertBox icon="alert-triangle" color={colors.destructive} text={`${stats.waterTestFailed} kayıt su testinden kaldı — admin onayı gerekli`} colors={colors} />
            )}
            {stats.lowGlassStock > 0 && (
              <AlertBox icon="package" color={colors.warning} text={`${stats.lowGlassStock} cam türünde stok azaldı (≤ 2)`} colors={colors} />
            )}
            {stats.lowConsumables > 0 && (
              <AlertBox icon="droplet" color={colors.warning} text={`${stats.lowConsumables} sarf malzemesinde stok azaldı (≤ 3)`} colors={colors} />
            )}
          </View>
        </>
      )}

      {/* Urgent */}
      {urgentItems.length > 0 && (
        <>
          <SectionLabel label="ACİL — SU TESTİ" colors={colors} />
          {urgentItems.map((a) => <AssemblyCard key={a.id} assembly={a} />)}
        </>
      )}

      {/* Weekly trend chart */}
      <SectionLabel label="SON 7 GÜN — YENİ KAYITLAR" colors={colors} />
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.trendChart}>
          {weeklyTrend.map((d) => {
            const barH = maxWeeklyCount > 0 ? Math.max(4, Math.round((d.count / maxWeeklyCount) * 60)) : 4;
            const isToday = d.day === new Date().toISOString().split("T")[0];
            return (
              <View key={d.day} style={styles.trendColumn}>
                <Text style={[styles.trendCount, { color: d.count > 0 ? colors.foreground : colors.mutedForeground }]}>
                  {d.count > 0 ? d.count : ""}
                </Text>
                <View style={[styles.trendBar, { height: barH, backgroundColor: isToday ? colors.primary : colors.primary + "50" }]} />
                <Text style={[styles.trendDay, { color: isToday ? colors.primary : colors.mutedForeground, fontFamily: isToday ? "Inter_700Bold" : "Inter_400Regular" }]}>
                  {d.label}
                </Text>
              </View>
            );
          })}
        </View>
        <View style={styles.trendLegend}>
          <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
          <Text style={[styles.legendText, { color: colors.mutedForeground }]}>Yeni kayıt</Text>
        </View>
      </View>

      {/* Status breakdown */}
      <SectionLabel label="DURUM DAĞILIMI" colors={colors} />
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {statusBreakdown.length === 0 ? (
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Kayıt yok</Text>
        ) : statusBreakdown.map(([status, count]) => {
          const color = STATUS_COLORS[status] || colors.mutedForeground;
          const pct = stats.total > 0 ? count / stats.total : 0;
          return (
            <View key={status} style={styles.statusRow}>
              <View style={[styles.statusDot, { backgroundColor: color }]} />
              <Text style={[styles.statusLabel, { color: colors.foreground }]}>{STATUS_LABELS[status]}</Text>
              <View style={styles.statusBarWrap}>
                <View style={[styles.statusBarFill, { backgroundColor: color, width: `${pct * 100}%` as any }]} />
              </View>
              <Text style={[styles.statusCount, { color: colors.mutedForeground }]}>{count}</Text>
            </View>
          );
        })}
      </View>

      {/* Brand breakdown */}
      {brandBreakdown.length > 0 && (
        <>
          <SectionLabel label="ARAÇ MARKASI DAĞILIMI" colors={colors} />
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {brandBreakdown.map(([brand, count], idx) => {
              const max = brandBreakdown[0][1];
              const pct = count / max;
              const brandColors = ["#0a84ff", "#10b981", "#f59e0b", "#8b5cf6"];
              const color = brandColors[idx % brandColors.length];
              return (
                <View key={brand} style={styles.staffRow}>
                  <View style={styles.staffLeft}>
                    <Feather name="truck" size={13} color={color} />
                    <Text style={[styles.staffName, { color: colors.foreground }]}>{brand}</Text>
                  </View>
                  <View style={styles.barContainer}>
                    <View style={[styles.barFill, { backgroundColor: color, width: `${pct * 100}%` as any }]} />
                  </View>
                  <Text style={[styles.staffCount, { color: colors.mutedForeground }]}>{count}</Text>
                </View>
              );
            })}
          </View>
        </>
      )}

      {/* Staff breakdown */}
      {staffBreakdown.length > 0 && (
        <>
          <SectionLabel label="PERSONEL PERFORMANSI" colors={colors} />
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {staffBreakdown.map(({ name, active, completed, total }) => {
              const max = staffBreakdown[0].total;
              const pct = total / max;
              return (
                <View key={name} style={styles.staffRowDetail}>
                  <View style={styles.staffLeft}>
                    <View style={[styles.staffAvatar, { backgroundColor: colors.primary + "20" }]}>
                      <Text style={[styles.staffAvatarText, { color: colors.primary }]}>
                        {name.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase()}
                      </Text>
                    </View>
                    <View>
                      <Text style={[styles.staffName, { color: colors.foreground }]}>{name}</Text>
                      <Text style={[styles.staffSub, { color: colors.mutedForeground }]}>
                        {active} aktif · {completed} tamamlandı
                      </Text>
                    </View>
                  </View>
                  <View style={styles.barContainerTall}>
                    <View style={[styles.barFill, { backgroundColor: colors.primary, width: `${pct * 100}%` as any }]} />
                  </View>
                  <Text style={[styles.staffCount, { color: colors.mutedForeground }]}>{total}</Text>
                </View>
              );
            })}
          </View>
        </>
      )}

      {/* Active records */}
      {recentActive.length > 0 && (
        <>
          <SectionLabel label="AKTİF KAYITLAR (SON 4)" colors={colors} />
          {recentActive.map((a) => <AssemblyCard key={a.id} assembly={a} />)}
        </>
      )}

      {/* Quick actions */}
      <SectionLabel label="HIZLI İŞLEMLER" colors={colors} />
      <View style={styles.quickActionsGrid}>
        <QuickAction icon="users" label="Kullanıcı Yönetimi" onPress={() => router.push("/manage-users" as any)} colors={colors} />
        <QuickAction icon="archive" label="Tüm Kayıtlar" onPress={() => router.push("/all-records")} colors={colors} />
        <QuickAction icon="package" label="Stok Yönetimi" onPress={() => router.push("/(tabs)/stock" as any)} colors={colors} />
        <QuickAction icon="plus-circle" label="Yeni Kayıt" onPress={() => router.push("/new-assembly")} colors={colors} />
      </View>
    </ScrollView>
  );
}

function SectionLabel({ label, colors }: { label: string; colors: any }) {
  return <Text style={[styles.section, { color: colors.mutedForeground }]}>{label}</Text>;
}

function StatCard({ label, value, color, colors, suffix = "" }: { label: string; value: number; color: string; colors: any; suffix?: string }) {
  return (
    <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[styles.statValue, { color }]}>{value}{suffix}</Text>
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

function QuickStat({ icon, label, value, colors, danger }: { icon: any; label: string; value: string; colors: any; danger?: boolean }) {
  return (
    <View style={styles.quickStatItem}>
      <Feather name={icon} size={16} color={danger ? colors.destructive : colors.primary} />
      <Text style={[styles.quickStatValue, { color: danger ? colors.destructive : colors.foreground }]}>{value}</Text>
      <Text style={[styles.quickStatLabel, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

function QuickAction({ icon, label, onPress, colors }: { icon: any; label: string; onPress: () => void; colors: any }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.quickActionBtn, { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.75 : 1 }]}
    >
      <View style={[styles.quickActionIcon, { backgroundColor: colors.primary + "15" }]}>
        <Feather name={icon} size={18} color={colors.primary} />
      </View>
      <Text style={[styles.quickActionLabel, { color: colors.foreground }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 20, gap: 12 },
  restricted: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16 },
  restrictedText: { fontSize: 15, fontFamily: "Inter_500Medium", textAlign: "center" },
  titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  pageTitle: { fontSize: 24, fontFamily: "Inter_700Bold" },
  quickBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
  quickBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  dateRangeRow: { flexDirection: "row", gap: 8 },
  dateRangeChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  dateRangeText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  section: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 1, marginTop: 4 },
  statsRow: { flexDirection: "row", gap: 10 },
  statCard: { flex: 1, borderRadius: 14, borderWidth: 1, padding: 14, alignItems: "center", gap: 4 },
  statValue: { fontSize: 26, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 11, fontFamily: "Inter_500Medium", textAlign: "center" },
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
  staffRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  staffRowDetail: { flexDirection: "row", alignItems: "center", gap: 10 },
  staffLeft: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1 },
  staffAvatar: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  staffAvatarText: { fontSize: 11, fontFamily: "Inter_700Bold" },
  staffName: { fontSize: 13, fontFamily: "Inter_500Medium" },
  staffSub: { fontSize: 11, fontFamily: "Inter_400Regular" },
  barContainer: { flex: 1, height: 8, backgroundColor: "#00000010", borderRadius: 4, overflow: "hidden" },
  barContainerTall: { width: 60, height: 8, backgroundColor: "#00000010", borderRadius: 4, overflow: "hidden" },
  barFill: { height: "100%", borderRadius: 4 },
  staffCount: { fontSize: 13, fontFamily: "Inter_600SemiBold", width: 24, textAlign: "right" },
  emptyText: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center" },
  quickStatItem: { flex: 1, alignItems: "center", gap: 4, paddingVertical: 4 },
  quickStatValue: { fontSize: 20, fontFamily: "Inter_700Bold" },
  quickStatLabel: { fontSize: 10, fontFamily: "Inter_400Regular", textAlign: "center" },
  quickStatDivider: { width: 1, height: "100%" },
  trendChart: { flexDirection: "row", alignItems: "flex-end", gap: 6, height: 80 },
  trendColumn: { flex: 1, alignItems: "center", gap: 4, justifyContent: "flex-end" },
  trendCount: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  trendBar: { width: "100%", borderRadius: 4, minHeight: 4 },
  trendDay: { fontSize: 10 },
  trendLegend: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 11, fontFamily: "Inter_400Regular" },
  quickActionsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  quickActionBtn: { width: "47%", borderRadius: 14, borderWidth: 1, padding: 14, alignItems: "center", gap: 10 },
  quickActionIcon: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  quickActionLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold", textAlign: "center" },
});
