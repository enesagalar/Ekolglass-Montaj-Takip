import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useMemo } from "react";
import { Image, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
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
  const { assemblies, glassStock, consumables, users, role, glassRequests } = useApp();

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
    const pendingRequests = glassRequests.filter((r) => r.status === "pending").length;
    return { total: assemblies.length, todayNew, active, completed, waterTestFailed, lowGlassStock, lowConsumables, pendingRequests };
  }, [assemblies, glassStock, consumables, glassRequests]);

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

  const pendingGlassRequests = useMemo(() => {
    return glassRequests.filter((r) => r.status === "pending")
      .sort((a, b) => new Date(a.requestedDate).getTime() - new Date(b.requestedDate).getTime())
      .slice(0, 3);
  }, [glassRequests]);

  const hasAlerts = stats.waterTestFailed > 0 || stats.lowGlassStock > 0 || stats.lowConsumables > 0 || stats.pendingRequests > 0;

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[styles.container, { paddingTop: topPad + 20, paddingBottom: bottomPad }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Title */}
      <View style={styles.titleRow}>
        <View style={{ flex: 1 }}>
          <Image source={require("../../assets/images/ekolglass-logo.jpg")} style={styles.logoImg} resizeMode="contain" />
        </View>
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
            {stats.pendingRequests > 0 && (
              <Pressable onPress={() => router.push("/(tabs)/requests" as any)}>
                <AlertBox icon="file-text" color="#f59e0b"
                  text={`${stats.pendingRequests} bekleyen ISRI cam talebi`} colors={colors} />
              </Pressable>
            )}
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

      {/* ISRI Requests Preview */}
      {pendingGlassRequests.length > 0 && (
        <>
          <View style={styles.sectionRow}>
            <Text style={[styles.section, { color: colors.mutedForeground }]}>ISRI CAM TALEPLERİ</Text>
            <Pressable onPress={() => router.push("/(tabs)/requests" as any)}>
              <Text style={[styles.seeAllText, { color: colors.primary }]}>Tümünü Gör</Text>
            </Pressable>
          </View>
          {pendingGlassRequests.map((req) => {
            const dateStr = req.requestedDate ? req.requestedDate.split("-").reverse().join("/") : "";
            return (
              <Pressable
                key={req.id}
                onPress={() => router.push("/(tabs)/requests" as any)}
                style={({ pressed }) => [styles.reqPreviewCard, { backgroundColor: colors.card, borderColor: "#f59e0b40", opacity: pressed ? 0.85 : 1 }]}
              >
                <View style={styles.reqPreviewRow}>
                  <View style={[styles.reqDot, { backgroundColor: "#f59e0b" }]} />
                  <Text style={[styles.reqPreviewName, { color: colors.foreground }]}>{req.requestedByName}</Text>
                  <View style={[styles.reqBadge, { backgroundColor: "#f59e0b18", borderColor: "#f59e0b40" }]}>
                    <Text style={[styles.reqBadgeText, { color: "#f59e0b" }]}>Beklemede</Text>
                  </View>
                </View>
                <Text style={[styles.reqPreviewDate, { color: colors.mutedForeground }]}>
                  Talep tarihi: {dateStr}
                </Text>
                <Text style={[styles.reqPreviewItems, { color: colors.foreground }]}>
                  {req.items.map((i) => `${i.glassName} (${i.quantity})`).join(" · ")}
                </Text>
              </Pressable>
            );
          })}
        </>
      )}

      {/* Admin Quick Actions — 2×2 grid */}
      <Text style={[styles.section, { color: colors.mutedForeground }]}>HIZLI İŞLEMLER</Text>
      <View style={styles.actionsGrid}>
        <QuickAction
          icon="plus-circle"
          label="Yeni Kayıt"
          sub="Montaj ekle"
          color="#0a84ff"
          onPress={() => router.push("/new-assembly")}
          colors={colors}
        />
        <QuickAction
          icon="users"
          label="Kullanıcılar"
          sub="Hesap yönetimi"
          color="#8b5cf6"
          onPress={() => router.push("/manage-users" as any)}
          colors={colors}
        />
        <QuickAction
          icon="package"
          label="Stok"
          sub="Malzeme takibi"
          color="#f59e0b"
          onPress={() => router.push("/(tabs)/stock" as any)}
          colors={colors}
        />
        <QuickAction
          icon="file-text"
          label="ISRI Talepleri"
          sub={stats.pendingRequests > 0 ? `${stats.pendingRequests} bekleyen` : "Talep listesi"}
          color={stats.pendingRequests > 0 ? "#ef4444" : "#10b981"}
          onPress={() => router.push("/(tabs)/requests" as any)}
          colors={colors}
          badge={stats.pendingRequests > 0 ? stats.pendingRequests : undefined}
        />
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

function QuickAction({ icon, label, sub, color, onPress, colors, badge }: {
  icon: any; label: string; sub: string; color: string; onPress: () => void; colors: any; badge?: number;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.quickAction, { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.78 : 1 }]}
    >
      <View style={[styles.quickActionIcon, { backgroundColor: color + "18" }]}>
        <Feather name={icon} size={22} color={color} />
        {badge !== undefined && (
          <View style={[styles.quickBadge, { backgroundColor: color }]}>
            <Text style={styles.quickBadgeText}>{badge}</Text>
          </View>
        )}
      </View>
      <Text style={[styles.quickActionLabel, { color: colors.foreground }]}>{label}</Text>
      <Text style={[styles.quickActionSub, { color: colors.mutedForeground }]}>{sub}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 20, gap: 12 },
  restricted: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16 },
  restrictedText: { fontSize: 15, fontFamily: "Inter_500Medium", textAlign: "center" },
  titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  pageTitle: { fontSize: 24, fontFamily: "Inter_700Bold" },
  logoImg: { width: 130, height: 50 },
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
  actionsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  quickAction: { width: "47%", borderRadius: 16, borderWidth: 1, padding: 16, gap: 8 },
  quickActionIcon: { width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center", position: "relative" },
  quickActionLabel: { fontSize: 14, fontFamily: "Inter_700Bold" },
  quickActionSub: { fontSize: 11, fontFamily: "Inter_400Regular" },
  quickBadge: { position: "absolute", top: -4, right: -4, width: 18, height: 18, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  quickBadgeText: { fontSize: 10, fontFamily: "Inter_700Bold", color: "#fff" },
  sectionRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  seeAllText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  reqPreviewCard: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 6 },
  reqPreviewRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  reqDot: { width: 8, height: 8, borderRadius: 4 },
  reqPreviewName: { flex: 1, fontSize: 14, fontFamily: "Inter_600SemiBold" },
  reqBadge: { borderRadius: 20, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 3 },
  reqBadgeText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  reqPreviewDate: { fontSize: 12, fontFamily: "Inter_500Medium" },
  reqPreviewItems: { fontSize: 12, fontFamily: "Inter_400Regular" },
});
