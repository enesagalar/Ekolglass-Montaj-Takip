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
import { StatusBadge } from "@/components/StatusBadge";
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

export default function AssemblyListScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { assemblies, role } = useApp();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<AssemblyStatus | "all">("all");

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 + 84 : insets.bottom + 84;

  const statusCounts = useMemo(() => {
    const counts: Partial<Record<AssemblyStatus | "all", number>> = { all: assemblies.length };
    assemblies.forEach((a) => {
      counts[a.status] = (counts[a.status] || 0) + 1;
    });
    return counts;
  }, [assemblies]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return assemblies
      .filter((a) => {
        const matchStatus = filter === "all" || a.status === filter;
        const matchSearch =
          !q || a.vin.toLowerCase().includes(q) || a.assignedTo.toLowerCase().includes(q);
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
  }, [assemblies, filter, search]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.topBar,
          {
            paddingTop: topPad + 8,
            backgroundColor: colors.background,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <View style={styles.titleRow}>
          <View>
            <Text style={[styles.title, { color: colors.foreground }]}>
              {role === "customer" ? "Araç Takip" : "Montaj Kayıtları"}
            </Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
              {statusCounts.all} kayıt
              {statusCounts["water_test_failed"] ? ` · ` : ""}
              {statusCounts["water_test_failed"] ? (
                `${statusCounts["water_test_failed"]} test başarısız`
              ) : null}
            </Text>
          </View>
          {(role === "field" || role === "admin") && (
            <Pressable
              onPress={async () => {
                await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                router.push("/new-assembly" as any);
              }}
              style={[styles.addBtn, { backgroundColor: colors.primary }]}
            >
              <Feather name="plus" size={20} color="#fff" />
            </Pressable>
          )}
        </View>

        <View
          style={[
            styles.searchBar,
            { backgroundColor: colors.muted, borderColor: colors.border },
          ]}
        >
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

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
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
                      ? isFailedFilter
                        ? colors.destructive
                        : colors.primary
                      : colors.muted,
                    borderColor: active
                      ? isFailedFilter
                        ? colors.destructive
                        : colors.primary
                      : isFailedFilter && count > 0
                      ? colors.destructive + "60"
                      : colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.filterLabel,
                    {
                      color: active
                        ? "#fff"
                        : isFailedFilter && count > 0
                        ? colors.destructive
                        : colors.mutedForeground,
                    },
                  ]}
                >
                  {item.label}
                </Text>
                {item.value !== "all" && count > 0 && (
                  <View
                    style={[
                      styles.filterCount,
                      {
                        backgroundColor: active
                          ? "rgba(255,255,255,0.3)"
                          : isFailedFilter
                          ? colors.destructive + "20"
                          : colors.primary + "20",
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.filterCountText,
                        {
                          color: active
                            ? "#fff"
                            : isFailedFilter
                            ? colors.destructive
                            : colors.primary,
                        },
                      ]}
                    >
                      {count}
                    </Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(a) => a.id}
        contentContainerStyle={[styles.list, { paddingBottom: bottomPad }]}
        renderItem={({ item }) => <AssemblyCard assembly={item} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="inbox" size={40} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              {search ? "Arama sonucu bulunamadı" : "Kayıt bulunamadı"}
            </Text>
          </View>
        }
        scrollEnabled
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: { paddingHorizontal: 20, paddingBottom: 10, borderBottomWidth: 1, gap: 10 },
  titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { fontSize: 24, fontFamily: "Inter_700Bold" },
  subtitle: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 1 },
  addBtn: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 42,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", height: 42 },
  filterRow: { gap: 8, paddingRight: 4, paddingBottom: 2 },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 100,
    borderWidth: 1,
  },
  filterLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  filterCount: { paddingHorizontal: 5, paddingVertical: 1, borderRadius: 6 },
  filterCountText: { fontSize: 10, fontFamily: "Inter_700Bold" },
  list: { padding: 14 },
  empty: { alignItems: "center", paddingTop: 80, gap: 12 },
  emptyText: { fontSize: 15, fontFamily: "Inter_500Medium" },
});
