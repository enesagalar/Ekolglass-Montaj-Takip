import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AssemblyCard } from "@/components/AssemblyCard";
import { AssemblyStatus, VEHICLE_BRANDS, useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

const STATUS_FILTERS: { label: string; value: AssemblyStatus | "all" }[] = [
  { label: "Tümü", value: "all" },
  { label: "Kesim", value: "cutting" },
  { label: "Montaj", value: "installation" },
  { label: "Montaj Tamam", value: "installation_done" },
  { label: "Su Testi", value: "water_test" },
  { label: "Başarısız", value: "water_test_failed" },
  { label: "Tamamlandı", value: "completed" },
];

type DateRange = "today" | "week" | "month" | "all";
const DATE_RANGES: { label: string; value: DateRange }[] = [
  { label: "Bugün", value: "today" },
  { label: "Hafta", value: "week" },
  { label: "Ay", value: "month" },
  { label: "Tümü", value: "all" },
];

function getDateStart(range: DateRange): Date {
  const now = new Date();
  if (range === "today") { const d = new Date(now); d.setHours(0, 0, 0, 0); return d; }
  if (range === "week") { const d = new Date(now); d.setDate(d.getDate() - 7); d.setHours(0, 0, 0, 0); return d; }
  if (range === "month") { const d = new Date(now); d.setDate(1); d.setHours(0, 0, 0, 0); return d; }
  return new Date(0);
}

export default function AllRecordsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { assemblies } = useApp();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<AssemblyStatus | "all">("all");
  const [brandFilter, setBrandFilter] = useState<string>("all");
  const [dateRange, setDateRange] = useState<DateRange>("all");
  const dateStart = useMemo(() => getDateStart(dateRange), [dateRange]);

  const statusCounts = useMemo(() => {
    const counts: Partial<Record<AssemblyStatus | "all", number>> = { all: assemblies.length };
    assemblies.forEach((a) => { counts[a.status] = (counts[a.status] || 0) + 1; });
    return counts;
  }, [assemblies]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return assemblies
      .filter((a) => {
        const matchStatus = statusFilter === "all" || a.status === statusFilter;
        const matchBrand = brandFilter === "all" || a.vehicleModel === brandFilter;
        const matchDate = new Date(a.createdAt) >= dateStart;
        const matchSearch =
          !q ||
          (a.vinLast5 ?? a.vin)?.toLowerCase().includes(q) ||
          a.vin?.toLowerCase().includes(q) ||
          a.assignedTo.toLowerCase().includes(q);
        return matchStatus && matchBrand && matchDate && matchSearch;
      })
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [assemblies, statusFilter, brandFilter, dateRange, dateStart, search]);

  const summaryStats = useMemo(() => {
    const completed = filtered.filter((a) => a.status === "completed").length;
    const active = filtered.filter((a) => a.status !== "completed").length;
    const failed = filtered.filter((a) => a.status === "water_test_failed").length;
    const photos = filtered.reduce((s, a) => s + a.photos.length, 0);
    return { completed, active, failed, photos };
  }, [filtered]);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 8, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Tüm Kayıtlar</Text>
          <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>
            {filtered.length} / {assemblies.length} kayıt gösteriliyor
          </Text>
        </View>
      </View>

      {/* Controls */}
      <View style={[styles.controls, { borderBottomColor: colors.border }]}>
        {/* Search */}
        <View style={[styles.searchBar, { backgroundColor: colors.muted, borderColor: colors.border }]}>
          <Feather name="search" size={16} color={colors.mutedForeground} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Şase no veya personel ara..."
            placeholderTextColor={colors.mutedForeground}
            style={[styles.searchInput, { color: colors.foreground }]}
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch("")}>
              <Feather name="x" size={16} color={colors.mutedForeground} />
            </Pressable>
          )}
        </View>

        {/* Date range */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          {DATE_RANGES.map((r) => (
            <Pressable
              key={r.value}
              onPress={() => setDateRange(r.value)}
              style={[styles.chip, { backgroundColor: dateRange === r.value ? colors.foreground : colors.muted, borderColor: colors.border }]}
            >
              <Text style={[styles.chipText, { color: dateRange === r.value ? colors.background : colors.mutedForeground }]}>
                {r.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Brand filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          <Pressable
            onPress={() => setBrandFilter("all")}
            style={[styles.chip, { backgroundColor: brandFilter === "all" ? colors.foreground : colors.muted, borderColor: colors.border }]}
          >
            <Text style={[styles.chipText, { color: brandFilter === "all" ? colors.background : colors.mutedForeground }]}>Tüm Markalar</Text>
          </Pressable>
          {VEHICLE_BRANDS.map((b) => (
            <Pressable
              key={b.id}
              onPress={() => setBrandFilter(b.id)}
              style={[styles.chip, { backgroundColor: brandFilter === b.id ? colors.foreground : colors.muted, borderColor: colors.border }]}
            >
              <Text style={[styles.chipText, { color: brandFilter === b.id ? colors.background : colors.mutedForeground }]}>{b.name}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Status filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          {STATUS_FILTERS.map((item) => {
            const active = statusFilter === item.value;
            const count = statusCounts[item.value] ?? 0;
            const isDanger = item.value === "water_test_failed";
            return (
              <Pressable
                key={item.value}
                onPress={() => setStatusFilter(item.value)}
                style={[styles.chip, {
                  backgroundColor: active ? (isDanger ? colors.destructive : colors.primary) : colors.muted,
                  borderColor: active ? (isDanger ? colors.destructive : colors.primary) : isDanger && count > 0 ? colors.destructive + "60" : colors.border,
                }]}
              >
                <Text style={[styles.chipText, { color: active ? "#fff" : isDanger && count > 0 ? colors.destructive : colors.mutedForeground }]}>
                  {item.label}
                </Text>
                {count > 0 && (
                  <View style={[styles.chipCount, { backgroundColor: active ? "rgba(255,255,255,0.25)" : colors.border }]}>
                    <Text style={[styles.chipCountText, { color: active ? "#fff" : colors.mutedForeground }]}>{count}</Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Summary stats bar */}
      {filtered.length > 0 && (
        <View style={[styles.summaryBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <SummaryStat icon="check-circle" value={summaryStats.completed} label="Tamam" color={colors.success} colors={colors} />
          <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
          <SummaryStat icon="activity" value={summaryStats.active} label="Aktif" color={colors.primary} colors={colors} />
          <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
          <SummaryStat icon="alert-triangle" value={summaryStats.failed} label="Başarısız" color={summaryStats.failed > 0 ? colors.destructive : colors.mutedForeground} colors={colors} />
          <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
          <SummaryStat icon="camera" value={summaryStats.photos} label="Fotoğraf" color={colors.mutedForeground} colors={colors} />
        </View>
      )}

      {filtered.length === 0 ? (
        <View style={styles.empty}>
          <Feather name="inbox" size={40} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Kayıt bulunamadı</Text>
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            Filtre veya arama kriterlerini değiştirin
          </Text>
          {(statusFilter !== "all" || brandFilter !== "all" || dateRange !== "all" || search) && (
            <Pressable
              onPress={() => { setStatusFilter("all"); setBrandFilter("all"); setDateRange("all"); setSearch(""); }}
              style={[styles.clearBtn, { backgroundColor: colors.primary + "15", borderColor: colors.primary + "30" }]}
            >
              <Feather name="x-circle" size={14} color={colors.primary} />
              <Text style={[styles.clearBtnText, { color: colors.primary }]}>Filtreleri Temizle</Text>
            </Pressable>
          )}
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(a) => a.id}
          renderItem={({ item }) => <AssemblyCard assembly={item} />}
          contentContainerStyle={[styles.list, { paddingBottom: bottomPad + 20 }]}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

function SummaryStat({ icon, value, label, color, colors }: { icon: any; value: number; label: string; color: string; colors: any }) {
  return (
    <View style={styles.summaryStatItem}>
      <Feather name={icon} size={13} color={color} />
      <Text style={[styles.summaryStatValue, { color }]}>{value}</Text>
      <Text style={[styles.summaryStatLabel, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingHorizontal: 20, paddingBottom: 14, borderBottomWidth: 1,
  },
  backBtn: { padding: 2 },
  headerTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold" },
  headerSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 1 },
  controls: { borderBottomWidth: 1, paddingBottom: 6 },
  searchBar: {
    flexDirection: "row", alignItems: "center", borderRadius: 12,
    borderWidth: 1, paddingHorizontal: 12, height: 44, gap: 8, marginHorizontal: 16, marginTop: 12,
  },
  searchInput: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", height: 44 },
  chipRow: { paddingHorizontal: 16, paddingVertical: 6, gap: 8, flexDirection: "row", alignItems: "center" },
  chip: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  chipText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  chipCount: { paddingHorizontal: 5, paddingVertical: 1, borderRadius: 8 },
  chipCountText: { fontSize: 11, fontFamily: "Inter_700Bold" },
  chipDivider: { width: 1, height: 20 },
  summaryBar: { flexDirection: "row", paddingVertical: 10, paddingHorizontal: 16, borderBottomWidth: 1 },
  summaryStatItem: { flex: 1, alignItems: "center", gap: 2 },
  summaryStatValue: { fontSize: 16, fontFamily: "Inter_700Bold" },
  summaryStatLabel: { fontSize: 10, fontFamily: "Inter_400Regular" },
  summaryDivider: { width: 1, marginVertical: 2 },
  list: { paddingHorizontal: 16, paddingTop: 14 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 32 },
  emptyTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
  clearBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 16, paddingVertical: 9, borderRadius: 20, borderWidth: 1, marginTop: 4 },
  clearBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
});
