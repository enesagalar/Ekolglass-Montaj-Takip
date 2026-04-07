import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

type TabKey = "glass" | "consumables";

export default function StockScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { glassStock, consumables, updateStock, updateConsumable, role, assemblies } = useApp();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 + 84 : insets.bottom + 84;

  const canEdit = role === "admin";
  const [activeTab, setActiveTab] = useState<TabKey>("glass");

  const glassTotalStock = glassStock.reduce((s, g) => s + g.stock, 0);
  const glassOutCount = glassStock.filter((g) => g.stock === 0).length;
  const glassLowCount = glassStock.filter((g) => g.stock > 0 && g.stock <= 2).length;

  const consTotalStock = consumables.reduce((s, c) => s + c.stock, 0);
  const consOutCount = consumables.filter((c) => c.stock === 0).length;
  const consLowCount = consumables.filter((c) => c.stock > 0 && c.stock <= 3).length;

  const handleAdjustGlass = async (id: string, delta: number) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    updateStock(id, delta);
  };

  const handleAdjustCons = async (id: string, delta: number) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    updateConsumable(id, delta);
  };

  const usageCounts = glassStock.map((g) => ({
    ...g,
    usedCount: assemblies.filter((a) => a.glassProductIds.includes(g.id)).length,
  }));

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.topBar,
          { paddingTop: topPad + 20, backgroundColor: colors.background, borderBottomColor: colors.border },
        ]}
      >
        <Text style={[styles.pageTitle, { color: colors.foreground }]}>Stok Takibi</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Fiat Ducato — ISRI</Text>

        {/* Tabs */}
        <View style={[styles.tabRow, { backgroundColor: colors.muted, borderColor: colors.border }]}>
          {(["glass", "consumables"] as TabKey[]).map((t) => (
            <Pressable
              key={t}
              onPress={() => setActiveTab(t)}
              style={[
                styles.tab,
                activeTab === t && { backgroundColor: colors.card, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
              ]}
            >
              <Feather
                name={t === "glass" ? "grid" : "droplet"}
                size={14}
                color={activeTab === t ? colors.primary : colors.mutedForeground}
              />
              <Text
                style={[
                  styles.tabText,
                  { color: activeTab === t ? colors.primary : colors.mutedForeground },
                ]}
              >
                {t === "glass" ? "Cam Stoku" : "Sarf Malzeme"}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.container, { paddingBottom: bottomPad }]}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === "glass" ? (
          <>
            {/* Glass summary */}
            <View style={styles.summaryRow}>
              <SummaryCard label="Toplam" value={glassTotalStock} color={colors.primary} colors={colors} />
              <SummaryCard label="Stok Yok" value={glassOutCount} color={glassOutCount > 0 ? colors.destructive : colors.success} colors={colors} />
              <SummaryCard label="Az Stok" value={glassLowCount} color={glassLowCount > 0 ? colors.warning : colors.success} colors={colors} />
            </View>

            {!canEdit && <InfoBox colors={colors} />}

            {usageCounts.map((g) => {
              const isLow = g.stock > 0 && g.stock <= 2;
              const isOut = g.stock === 0;
              const statusColor = isOut ? colors.destructive : isLow ? colors.warning : colors.success;
              return (
                <StockItemCard
                  key={g.id}
                  name={g.name}
                  code={g.code}
                  stock={g.stock}
                  unit="adet"
                  meta={`${g.usedCount} montajda kullanıldı`}
                  statusColor={statusColor}
                  canEdit={canEdit}
                  onAdjust={(d) => handleAdjustGlass(g.id, d)}
                  colors={colors}
                />
              );
            })}
          </>
        ) : (
          <>
            {/* Consumables summary */}
            <View style={styles.summaryRow}>
              <SummaryCard label="Toplam" value={consTotalStock} color={colors.primary} colors={colors} />
              <SummaryCard label="Stok Yok" value={consOutCount} color={consOutCount > 0 ? colors.destructive : colors.success} colors={colors} />
              <SummaryCard label="Az Stok" value={consLowCount} color={consLowCount > 0 ? colors.warning : colors.success} colors={colors} />
            </View>

            {!canEdit && <InfoBox colors={colors} />}

            {consumables.map((c) => {
              const isLow = c.stock > 0 && c.stock <= 3;
              const isOut = c.stock === 0;
              const statusColor = isOut ? colors.destructive : isLow ? colors.warning : colors.success;
              const categoryIcon: any = c.category === "chemical" ? "droplet" : c.category === "tool" ? "tool" : "box";
              return (
                <StockItemCard
                  key={c.id}
                  name={c.name}
                  code={c.unit}
                  stock={c.stock}
                  unit={c.unit}
                  meta={c.category === "chemical" ? "Kimyasal" : c.category === "tool" ? "Alet/Ekipman" : "Diğer"}
                  statusColor={statusColor}
                  canEdit={canEdit}
                  onAdjust={(d) => handleAdjustCons(c.id, d)}
                  colors={colors}
                  icon={categoryIcon}
                />
              );
            })}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function SummaryCard({ label, value, color, colors }: { label: string; value: number; color: string; colors: any }) {
  return (
    <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[styles.summaryValue, { color }]}>{value}</Text>
      <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

function InfoBox({ colors }: { colors: any }) {
  return (
    <View style={[styles.infoBox, { backgroundColor: colors.muted, borderColor: colors.border }]}>
      <Feather name="info" size={13} color={colors.mutedForeground} />
      <Text style={[styles.infoText, { color: colors.mutedForeground }]}>
        Stok düzenleme sadece yöneticiler içindir.
      </Text>
    </View>
  );
}

function StockItemCard({
  name, code, stock, unit, meta, statusColor, canEdit, onAdjust, colors, icon
}: {
  name: string; code: string; stock: number; unit: string; meta: string;
  statusColor: string; canEdit: boolean; onAdjust: (d: number) => void; colors: any; icon?: string;
}) {
  return (
    <View
      style={[
        styles.productCard,
        {
          backgroundColor: colors.card,
          borderColor: stock === 0 ? colors.destructive + "40" : stock <= 3 ? colors.warning + "40" : colors.border,
        },
      ]}
    >
      <View style={styles.productHeader}>
        <View style={styles.productInfo}>
          <Text style={[styles.productName, { color: colors.foreground }]}>{name}</Text>
          <Text style={[styles.productCode, { color: colors.mutedForeground }]}>
            {code} · {meta}
          </Text>
        </View>
        <View style={[styles.stockIndicator, { backgroundColor: statusColor + "15", borderColor: statusColor + "40" }]}>
          <Text style={[styles.stockCount, { color: statusColor }]}>{stock}</Text>
          <Text style={[styles.stockUnit, { color: statusColor }]}>{unit}</Text>
        </View>
      </View>

      <View style={styles.stockBar}>
        <View
          style={[
            styles.stockBarFill,
            { backgroundColor: statusColor, width: `${Math.min(100, (stock / 20) * 100)}%` as any },
          ]}
        />
      </View>

      {canEdit && (
        <View style={styles.adjustRow}>
          {[-5, -1].map((d) => (
            <Pressable
              key={d}
              onPress={() => onAdjust(d)}
              style={[styles.adjustBtn, { backgroundColor: colors.destructive + "10", borderColor: colors.destructive + "30" }]}
            >
              <Text style={[styles.adjustBtnText, { color: colors.destructive }]}>{d}</Text>
            </Pressable>
          ))}
          <View style={{ flex: 1 }} />
          {[1, 5, 10].map((d) => (
            <Pressable
              key={d}
              onPress={() => onAdjust(d)}
              style={[styles.adjustBtn, { backgroundColor: colors.success + "10", borderColor: colors.success + "30" }]}
            >
              <Text style={[styles.adjustBtnText, { color: colors.success }]}>+{d}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: { paddingHorizontal: 20, paddingBottom: 14, borderBottomWidth: 1, gap: 8 },
  pageTitle: { fontSize: 24, fontFamily: "Inter_700Bold" },
  subtitle: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: -4 },
  tabRow: {
    flexDirection: "row",
    borderRadius: 12,
    borderWidth: 1,
    padding: 4,
    gap: 4,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 9,
    borderRadius: 9,
  },
  tabText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  container: { padding: 16, gap: 10 },
  summaryRow: { flexDirection: "row", gap: 10 },
  summaryCard: { flex: 1, borderRadius: 14, borderWidth: 1, padding: 12, alignItems: "center", gap: 3 },
  summaryValue: { fontSize: 26, fontFamily: "Inter_700Bold" },
  summaryLabel: { fontSize: 11, fontFamily: "Inter_500Medium", textAlign: "center" },
  infoBox: { flexDirection: "row", alignItems: "center", gap: 8, padding: 10, borderRadius: 10, borderWidth: 1 },
  infoText: { fontSize: 12, fontFamily: "Inter_400Regular", flex: 1 },
  productCard: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 10 },
  productHeader: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  productInfo: { flex: 1, gap: 3 },
  productName: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  productCode: { fontSize: 11, fontFamily: "Inter_400Regular" },
  stockIndicator: { borderRadius: 10, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 5, alignItems: "center", minWidth: 52 },
  stockCount: { fontSize: 20, fontFamily: "Inter_700Bold" },
  stockUnit: { fontSize: 10, fontFamily: "Inter_500Medium" },
  stockBar: { height: 4, backgroundColor: "#00000010", borderRadius: 2, overflow: "hidden" },
  stockBarFill: { height: "100%", borderRadius: 2 },
  adjustRow: { flexDirection: "row", gap: 6, alignItems: "center" },
  adjustBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  adjustBtnText: { fontSize: 12, fontFamily: "Inter_700Bold" },
});
