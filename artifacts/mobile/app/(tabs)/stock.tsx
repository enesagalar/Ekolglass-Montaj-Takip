import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

export default function StockScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { glassStock, updateStock, role, assemblies } = useApp();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 + 84 : insets.bottom + 84;

  const canEdit = role === "admin";

  const totalStock = glassStock.reduce((s, g) => s + g.stock, 0);
  const outOfStockCount = glassStock.filter((g) => g.stock === 0).length;
  const lowStockCount = glassStock.filter((g) => g.stock > 0 && g.stock <= 2).length;

  const usageCounts = glassStock.map((g) => ({
    ...g,
    usedCount: assemblies.filter((a) => a.glassProductId === g.id).length,
  }));

  const handleAdjust = async (productId: string, delta: number) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    updateStock(productId, delta);
  };

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[
        styles.container,
        { paddingTop: topPad + 20, paddingBottom: bottomPad },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.pageTitle, { color: colors.foreground }]}>Stok Takibi</Text>
      <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
        Fiat Ducato Cam Stokları
      </Text>

      {/* Summary */}
      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.summaryValue, { color: colors.primary }]}>{totalStock}</Text>
          <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>Toplam Stok</Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.summaryValue, { color: outOfStockCount > 0 ? colors.destructive : colors.success }]}>
            {outOfStockCount}
          </Text>
          <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>Stok Yok</Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.summaryValue, { color: lowStockCount > 0 ? colors.warning : colors.success }]}>
            {lowStockCount}
          </Text>
          <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>Az Stok</Text>
        </View>
      </View>

      {!canEdit && (
        <View style={[styles.infoBox, { backgroundColor: colors.muted, borderColor: colors.border }]}>
          <Feather name="info" size={14} color={colors.mutedForeground} />
          <Text style={[styles.infoText, { color: colors.mutedForeground }]}>
            Stok düzenleme sadece yöneticiler içindir.
          </Text>
        </View>
      )}

      {/* Product List */}
      <View style={styles.productList}>
        {usageCounts.map((g) => {
          const isLow = g.stock > 0 && g.stock <= 2;
          const isOut = g.stock === 0;
          const statusColor = isOut ? colors.destructive : isLow ? colors.warning : colors.success;

          return (
            <View
              key={g.id}
              style={[
                styles.productCard,
                {
                  backgroundColor: colors.card,
                  borderColor: isOut ? colors.destructive + "40" : isLow ? colors.warning + "40" : colors.border,
                },
              ]}
            >
              <View style={styles.productHeader}>
                <View style={styles.productInfo}>
                  <Text style={[styles.productName, { color: colors.foreground }]}>{g.name}</Text>
                  <Text style={[styles.productCode, { color: colors.mutedForeground }]}>
                    {g.code} · {g.usedCount} montajda kullanıldı
                  </Text>
                </View>
                <View
                  style={[
                    styles.stockIndicator,
                    { backgroundColor: statusColor + "15", borderColor: statusColor + "40" },
                  ]}
                >
                  <Text style={[styles.stockCount, { color: statusColor }]}>{g.stock}</Text>
                  <Text style={[styles.stockUnit, { color: statusColor }]}>adet</Text>
                </View>
              </View>

              <View style={styles.stockBar}>
                <View
                  style={[
                    styles.stockBarFill,
                    {
                      backgroundColor: statusColor,
                      width: `${Math.min(100, (g.stock / 10) * 100)}%` as any,
                    },
                  ]}
                />
              </View>

              {canEdit && (
                <View style={styles.adjustRow}>
                  <Pressable
                    onPress={() => handleAdjust(g.id, -5)}
                    style={[styles.adjustBtn, { backgroundColor: colors.destructive + "10", borderColor: colors.destructive + "30" }]}
                  >
                    <Text style={[styles.adjustBtnText, { color: colors.destructive }]}>-5</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => handleAdjust(g.id, -1)}
                    style={[styles.adjustBtn, { backgroundColor: colors.destructive + "10", borderColor: colors.destructive + "30" }]}
                  >
                    <Text style={[styles.adjustBtnText, { color: colors.destructive }]}>-1</Text>
                  </Pressable>
                  <View style={{ flex: 1 }} />
                  <Pressable
                    onPress={() => handleAdjust(g.id, 1)}
                    style={[styles.adjustBtn, { backgroundColor: colors.success + "10", borderColor: colors.success + "30" }]}
                  >
                    <Text style={[styles.adjustBtnText, { color: colors.success }]}>+1</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => handleAdjust(g.id, 5)}
                    style={[styles.adjustBtn, { backgroundColor: colors.success + "10", borderColor: colors.success + "30" }]}
                  >
                    <Text style={[styles.adjustBtnText, { color: colors.success }]}>+5</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => handleAdjust(g.id, 10)}
                    style={[styles.adjustBtn, { backgroundColor: colors.success + "10", borderColor: colors.success + "30" }]}
                  >
                    <Text style={[styles.adjustBtnText, { color: colors.success }]}>+10</Text>
                  </Pressable>
                </View>
              )}
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 20, gap: 14 },
  pageTitle: { fontSize: 24, fontFamily: "Inter_700Bold" },
  subtitle: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: -8 },
  summaryRow: { flexDirection: "row", gap: 10 },
  summaryCard: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    alignItems: "center",
    gap: 4,
  },
  summaryValue: { fontSize: 28, fontFamily: "Inter_700Bold" },
  summaryLabel: { fontSize: 11, fontFamily: "Inter_500Medium", textAlign: "center" },
  infoBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  infoText: { fontSize: 13, fontFamily: "Inter_400Regular", flex: 1 },
  productList: { gap: 10 },
  productCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 12,
  },
  productHeader: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  productInfo: { flex: 1, gap: 3 },
  productName: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  productCode: { fontSize: 12, fontFamily: "Inter_400Regular" },
  stockIndicator: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignItems: "center",
    minWidth: 58,
  },
  stockCount: { fontSize: 20, fontFamily: "Inter_700Bold" },
  stockUnit: { fontSize: 10, fontFamily: "Inter_500Medium" },
  stockBar: {
    height: 4,
    backgroundColor: "#00000010",
    borderRadius: 2,
    overflow: "hidden",
  },
  stockBarFill: { height: "100%", borderRadius: 2 },
  adjustRow: { flexDirection: "row", gap: 6, alignItems: "center" },
  adjustBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
  },
  adjustBtnText: { fontSize: 13, fontFamily: "Inter_700Bold" },
});
