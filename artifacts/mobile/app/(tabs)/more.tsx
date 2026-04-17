import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import { Image, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

interface NavItem {
  icon: string;
  label: string;
  sub: string;
  color: string;
  route: string;
  badge?: number;
}

export default function MoreScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { role, currentUser, glassRequests, assemblies } = useApp();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 + 84 : insets.bottom + 84;

  const pendingRequests = glassRequests.filter((r) => r.status === "pending").length;
  const waterFailed = assemblies.filter((a) => a.status === "water_test_failed").length;

  const items: NavItem[] = [
    {
      icon: "plus-circle",
      label: "Yeni Montaj",
      sub: "Yeni kayıt oluştur",
      color: "#0a84ff",
      route: "/new-assembly",
    },
    {
      icon: "package",
      label: "Stok Yönetimi",
      sub: "Cam & malzeme stoku",
      color: "#f59e0b",
      route: "/(tabs)/stock",
    },
    {
      icon: "file-text",
      label: "ISRI Talepleri",
      sub: pendingRequests > 0 ? `${pendingRequests} bekleyen talep` : "Cam talep listesi",
      color: pendingRequests > 0 ? "#ef4444" : "#10b981",
      route: "/(tabs)/requests",
      badge: pendingRequests > 0 ? pendingRequests : undefined,
    },
    {
      icon: "bar-chart",
      label: "Raporlar",
      sub: "Detaylı istatistikler",
      color: "#8b5cf6",
      route: "/(tabs)/reports",
    },
    {
      icon: "users",
      label: "Kullanıcılar",
      sub: "Hesap yönetimi",
      color: "#3b82f6",
      route: "/manage-users",
    },
    {
      icon: "list",
      label: "Tüm Kayıtlar",
      sub: waterFailed > 0 ? `${waterFailed} su testi başarısız` : "Geçmiş montajlar",
      color: waterFailed > 0 ? "#ef4444" : "#64748b",
      route: "/all-records",
      badge: waterFailed > 0 ? waterFailed : undefined,
    },
    {
      icon: "user",
      label: "Profilim",
      sub: currentUser?.name ?? "Hesap ayarları",
      color: "#64748b",
      route: "/(tabs)/profile",
    },
  ];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={[styles.container, { paddingTop: topPad + 20, paddingBottom: bottomPad }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.headerRow}>
        <Image
          source={require("../../assets/images/ekolglass-logo.jpg")}
          style={styles.logo}
          resizeMode="contain"
        />
        <View style={[styles.roleBadge, { backgroundColor: colors.primary + "15", borderColor: colors.primary + "30" }]}>
          <Text style={[styles.roleText, { color: colors.primary }]}>Yönetici</Text>
        </View>
      </View>

      <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>MENÜ</Text>

      <View style={styles.grid}>
        {items.map((item) => (
          <Pressable
            key={item.route + item.label}
            onPress={() => router.push(item.route as any)}
            style={({ pressed }) => [
              styles.navCard,
              { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.75 : 1 },
            ]}
          >
            <View style={[styles.iconWrap, { backgroundColor: item.color + "18" }]}>
              <Feather name={item.icon as any} size={24} color={item.color} />
              {item.badge !== undefined && (
                <View style={[styles.badge, { backgroundColor: item.color }]}>
                  <Text style={styles.badgeText}>{item.badge}</Text>
                </View>
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.navLabel, { color: colors.foreground }]}>{item.label}</Text>
              <Text style={[styles.navSub, { color: colors.mutedForeground }]} numberOfLines={1}>{item.sub}</Text>
            </View>
            <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 20, gap: 14 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 },
  logo: { width: 120, height: 44 },
  roleBadge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
  roleText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  sectionLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 1 },
  grid: { gap: 10 },
  navCard: {
    flexDirection: "row", alignItems: "center", gap: 14,
    borderRadius: 16, borderWidth: 1, padding: 16,
  },
  iconWrap: {
    width: 50, height: 50, borderRadius: 14,
    alignItems: "center", justifyContent: "center",
    position: "relative",
  },
  badge: {
    position: "absolute", top: -4, right: -4,
    width: 18, height: 18, borderRadius: 9,
    alignItems: "center", justifyContent: "center",
  },
  badgeText: { fontSize: 10, fontFamily: "Inter_700Bold", color: "#fff" },
  navLabel: { fontSize: 15, fontFamily: "Inter_700Bold" },
  navSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
});
