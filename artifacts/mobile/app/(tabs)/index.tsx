import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
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
import { AssemblyStatus, useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

const FILTERS: { label: string; value: AssemblyStatus | "all" }[] = [
  { label: "Tümü", value: "all" },
  { label: "Beklemede", value: "cutting" },
  { label: "Montajda", value: "installation" },
  { label: "Montaj Tamam", value: "installation_done" },
  { label: "Su Testi", value: "water_test" },
  { label: "Test Başarısız", value: "water_test_failed" },
  { label: "Tamamlandı", value: "completed" },
];

function isSameDay(date1: Date, date2: Date) {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

export default function AssemblyListScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { assemblies, role } = useApp();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<AssemblyStatus | "all">("all");

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 + 84 : insets.bottom + 84;

  const today = new Date();
  const todayStr = today.toLocaleDateString("tr-TR", {
    day: "numeric", month: "long", year: "numeric",
  });

  const todayAssemblies = useMemo(
    () => assemblies.filter((a) => isSameDay(new Date(a.createdAt), today) || isSameDay(new Date(a.updatedAt), today)),
    [assemblies]
  );

  const statusCounts = useMemo(() => {
    const counts: Partial<Record<AssemblyStatus | "all", number>> = { all: todayAssemblies.length };
    todayAssemblies.forEach((a) => {
      counts[a.status] = (counts[a.status] || 0) + 1;
    });
    return counts;
  }, [todayAssemblies]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return todayAssemblies
      .filter((a) => {
        const matchStatus = filter === "all" || a.status === filter;
        const matchSearch =
          !q ||
          (a.vinLast5 ?? a.vin)?.toLowerCase().includes(q) ||
          a.vin?.toLowerCase().includes(q) ||
          a.assignedTo.toLowerCase().includes(q);
        return matchStatus && matchSearch;
      })
      .sort((a, b) => {
        const priority: Record<AssemblyStatus, number> = {
          water_test_failed: 0,
          water_test: 1,
          installation_done: 2,
          installation: 3,
          cutting: 4,
          completed: 5,
        };
        const pa = priority[a.status] ?? 9;
        const pb = priority[b.status] ?? 9;
        if (pa !== pb) return pa - pb;
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      });
  }, [todayAssemblies, filter, search]);

  const urgentCount = todayAssemblies.filter((a) => a.status === "water_test_failed").length;
  const waterTestPendingCount = todayAssemblies.filter((a) => a.status === "water_test" && a.waterTestCustomerApproval === "pending").length;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.topBar,
          { paddingTop: topPad + 8, backgroundColor: colors.background, borderBottomColor: colors.border },
        ]}
      >
        <View style={styles.titleRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: colors.foreground }]}>
              {role === "customer" ? "Araç Takip" : "Bugünkü İş"}
            </Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
              {todayStr} · {todayAssemblies.length} kayıt
            </Text>
          </View>

          <View style={styles.titleActions}>
            {/* All records */}
            <Pressable
              onPress={() => router.push("/all-records" )}
              style={[styles.iconBtn, { backgroundColor: colors.muted }]}
            >
              <Feather name="archive" size={18} color={colors.foreground} />
            </Pressable>

            {/* New assembly */}
            {(role === "field" || role === "admin") && (
              <Pressable
                onPress={async () => {
                  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  router.push("/new-assembly" );
                }}
                style={[styles.addBtn, { backgroundColor: colors.primary }]}
              >
                <Feather name="plus" size={20} color="#fff" />
              </Pressable>
            )}
          </View>
        </View>

        {/* Alert banners */}
        {urgentCount > 0 && role !== "customer" && (
          <Pressable
            onPress={() => setFilter("water_test_failed")}
            style={[styles.alertBanner, { backgroundColor: colors.destructive + "12", borderColor: colors.destructive + "30" }]}
          >
            <Feather name="alert-triangle" size={14} color={colors.destructive} />
            <Text style={[styles.alertText, { color: colors.destructive }]}>
              {urgentCount} kayıt su testinden kaldı — hemen ilgilenin
            </Text>
          </Pressable>
        )}

        {waterTestPendingCount > 0 && role === "customer" && (
          <Pressable
            onPress={() => setFilter("water_test")}
            style={[styles.alertBanner, { backgroundColor: colors.warning + "12", borderColor: colors.warning + "30" }]}
          >
            <Feather name="clock" size={14} color={colors.warning} />
            <Text style={[styles.alertText, { color: colors.warning }]}>
              {waterTestPendingCount} araç su testi onayınızı bekliyor
            </Text>
          </Pressable>
        )}

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

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {FILTERS.map((item) => {
            const active = filter === item.value;
            const count = statusCounts[item.value] ?? 0;
            const isFailedFilter = item.value === "water_test_failed";
            return (
              <Pressable
                key={item.value}
                onPress={() => setFilter(item.value)}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: active
                      ? isFailedFilter ? colors.destructive : colors.primary
                      : colors.muted,
                    borderColor: active
                      ? isFailedFilter ? colors.destructive : colors.primary
                      : isFailedFilter && count > 0
                      ? colors.destructive + "60"
                      : colors.border,
                  },
                ]}
              >
                <Text style={[
                  styles.filterLabel,
                  { color: active ? "#fff" : isFailedFilter && count > 0 ? colors.destructive : colors.mutedForeground },
                ]}>
                  {item.label}
                </Text>
                {count > 0 && (
                  <View style={[
                    styles.filterCount,
                    { backgroundColor: active ? "rgba(255,255,255,0.25)" : isFailedFilter && count > 0 ? colors.destructive + "20" : colors.border },
                  ]}>
                    <Text style={[styles.filterCountText, { color: active ? "#fff" : isFailedFilter && count > 0 ? colors.destructive : colors.mutedForeground }]}>
                      {count}
                    </Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {filtered.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={[styles.emptyIcon, { backgroundColor: colors.muted }]}>
            <Feather name="sun" size={32} color={colors.mutedForeground} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
            {search || filter !== "all" ? "Kayıt bulunamadı" : "Bugün henüz kayıt yok"}
          </Text>
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            {search || filter !== "all"
              ? "Farklı filtre veya arama deneyin"
              : role !== "customer"
              ? "Yeni montaj kaydı oluşturmak için + butonuna basın"
              : "Bugün planlanmış araç bulunmuyor"}
          </Text>
          {!search && filter === "all" && (
            <Pressable
              onPress={() => router.push("/all-records" )}
              style={[styles.viewAllBtn, { borderColor: colors.border }]}
            >
              <Feather name="archive" size={15} color={colors.mutedForeground} />
              <Text style={[styles.viewAllText, { color: colors.mutedForeground }]}>Geçmiş Kayıtları Gör</Text>
            </Pressable>
          )}
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(a) => a.id}
          renderItem={({ item }) => <AssemblyCard assembly={item} />}
          contentContainerStyle={[styles.list, { paddingBottom: bottomPad }]}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: { paddingHorizontal: 20, gap: 12, paddingBottom: 12, borderBottomWidth: 1 },
  titleRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  title: { fontSize: 24, fontFamily: "Inter_700Bold" },
  subtitle: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
  titleActions: { flexDirection: "row", gap: 8, marginTop: 4 },
  iconBtn: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  addBtn: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  alertBanner: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: 12, paddingVertical: 9, borderRadius: 10, borderWidth: 1,
  },
  alertText: { fontSize: 13, fontFamily: "Inter_600SemiBold", flex: 1 },
  searchBar: {
    flexDirection: "row", alignItems: "center", borderRadius: 12,
    borderWidth: 1, paddingHorizontal: 12, height: 44, gap: 8,
  },
  searchInput: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", height: 44 },
  filterRow: { paddingVertical: 2, gap: 8 },
  filterChip: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1,
  },
  filterLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  filterCount: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 8 },
  filterCountText: { fontSize: 11, fontFamily: "Inter_700Bold" },
  list: { paddingHorizontal: 16, paddingTop: 14 },
  emptyContainer: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 14 },
  emptyIcon: { width: 72, height: 72, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold", textAlign: "center" },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 22 },
  viewAllBtn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: 18, paddingVertical: 11, borderRadius: 12, borderWidth: 1, marginTop: 4,
  },
  viewAllText: { fontSize: 14, fontFamily: "Inter_500Medium" },
});
