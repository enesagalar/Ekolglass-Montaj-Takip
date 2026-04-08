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
import { AssemblyStatus, useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

const FILTERS: { label: string; value: AssemblyStatus | "all" }[] = [
  { label: "Tümü", value: "all" },
  { label: "Kesim", value: "cutting" },
  { label: "Montaj", value: "installation" },
  { label: "Montaj Tamam", value: "installation_done" },
  { label: "Su Testi", value: "water_test" },
  { label: "Test Başarısız", value: "water_test_failed" },
  { label: "Tamamlandı", value: "completed" },
];

type SortOptionValue = "updated" | "created" | "status";
const SORT_OPTIONS: { label: string; value: SortOptionValue }[] = [
  { label: "Güncelleme", value: "updated" },
  { label: "Oluşturma", value: "created" },
  { label: "Statü", value: "status" },
];

export default function AllRecordsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { assemblies } = useApp();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<AssemblyStatus | "all">("all");
  const [sortBy, setSortBy] = useState<SortOptionValue>("updated");

  const statusCounts = useMemo(() => {
    const counts: Partial<Record<AssemblyStatus | "all", number>> = { all: assemblies.length };
    assemblies.forEach((a) => { counts[a.status] = (counts[a.status] || 0) + 1; });
    return counts;
  }, [assemblies]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return assemblies
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
        if (sortBy === "updated") return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        if (sortBy === "created") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        const priority: Record<AssemblyStatus, number> = {
          water_test_failed: 0, water_test: 1, installation_done: 2,
          installation: 3, cutting: 4, completed: 5,
        };
        return (priority[a.status] ?? 9) - (priority[b.status] ?? 9);
      });
  }, [assemblies, filter, search, sortBy]);

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
            {assemblies.length} toplam kayıt
          </Text>
        </View>
      </View>

      {/* Search + sort + filter */}
      <View style={[styles.controls, { borderBottomColor: colors.border }]}>
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

        {/* Sort */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sortRow}>
          {SORT_OPTIONS.map((opt) => (
            <Pressable
              key={opt.value}
              onPress={() => setSortBy(opt.value)}
              style={[
                styles.sortChip,
                {
                  backgroundColor: sortBy === opt.value ? colors.foreground : colors.muted,
                  borderColor: sortBy === opt.value ? colors.foreground : colors.border,
                },
              ]}
            >
              <Text style={[styles.sortChipText, { color: sortBy === opt.value ? colors.background : colors.mutedForeground }]}>
                {opt.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Status filter */}
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
                      : isFailedFilter && count > 0 ? colors.destructive + "60" : colors.border,
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
                    { backgroundColor: active ? "rgba(255,255,255,0.25)" : colors.border },
                  ]}>
                    <Text style={[styles.filterCountText, { color: active ? "#fff" : colors.mutedForeground }]}>
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
        <View style={styles.empty}>
          <Feather name="inbox" size={36} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Kayıt bulunamadı</Text>
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            Farklı filtre veya arama deneyin
          </Text>
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

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingHorizontal: 20, paddingBottom: 14, borderBottomWidth: 1,
  },
  backBtn: { padding: 2 },
  headerTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold" },
  headerSub: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 1 },
  controls: { paddingHorizontal: 16, paddingVertical: 12, gap: 10, borderBottomWidth: 1 },
  searchBar: {
    flexDirection: "row", alignItems: "center", borderRadius: 12,
    borderWidth: 1, paddingHorizontal: 12, height: 44, gap: 8,
  },
  searchInput: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", height: 44 },
  sortRow: { gap: 8, paddingVertical: 2 },
  sortChip: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1,
  },
  sortChipText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  filterRow: { paddingVertical: 2, gap: 8 },
  filterChip: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1,
  },
  filterLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  filterCount: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 8 },
  filterCountText: { fontSize: 11, fontFamily: "Inter_700Bold" },
  list: { paddingHorizontal: 16, paddingTop: 14 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 32 },
  emptyTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
});
