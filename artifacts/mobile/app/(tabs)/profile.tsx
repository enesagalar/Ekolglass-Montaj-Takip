import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

const ROLE_LABELS: Record<string, string> = {
  field: "Saha Personeli",
  admin: "Yönetim / Admin",
  customer: "Müşteri",
};

const ROLE_ICONS: Record<string, keyof typeof Feather.glyphMap> = {
  field: "tool",
  admin: "bar-chart-2",
  customer: "eye",
};

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { role, setRole, assemblies } = useApp();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 + 84 : insets.bottom + 84;

  const handleLogout = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await setRole(null);
    router.replace("/login" as any);
  };

  const myAssemblies = assemblies.filter(
    (a) => a.status !== "delivered"
  );

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
          paddingTop: topPad + 20,
          paddingBottom: bottomPad,
        },
      ]}
    >
      <Text style={[styles.pageTitle, { color: colors.foreground }]}>
        Profil
      </Text>

      <View
        style={[
          styles.profileCard,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <View
          style={[
            styles.avatar,
            { backgroundColor: colors.primary + "20" },
          ]}
        >
          <Feather
            name={role ? ROLE_ICONS[role] : "user"}
            size={28}
            color={colors.primary}
          />
        </View>
        <View style={styles.profileInfo}>
          <Text style={[styles.roleName, { color: colors.foreground }]}>
            {role ? ROLE_LABELS[role] : "Bilinmiyor"}
          </Text>
          <Text style={[styles.roleDesc, { color: colors.mutedForeground }]}>
            Cam Montaj Takip Sistemi
          </Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View
          style={[
            styles.statBox,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.statValue, { color: colors.primary }]}>
            {assemblies.length}
          </Text>
          <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
            Toplam
          </Text>
        </View>
        <View
          style={[
            styles.statBox,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.statValue, { color: colors.statusInProgress }]}>
            {myAssemblies.filter((a) => a.status === "in_progress").length}
          </Text>
          <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
            Devam Eden
          </Text>
        </View>
        <View
          style={[
            styles.statBox,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.statValue, { color: colors.success }]}>
            {assemblies.filter((a) => a.status === "completed" || a.status === "delivered").length}
          </Text>
          <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
            Tamamlanan
          </Text>
        </View>
      </View>

      <View style={styles.menuSection}>
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
          HESAP
        </Text>

        <View
          style={[
            styles.menuCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Pressable
            style={[styles.menuItem, { borderBottomColor: colors.border }]}
            onPress={handleLogout}
          >
            <Feather name="log-out" size={18} color={colors.destructive} />
            <Text style={[styles.menuLabel, { color: colors.destructive }]}>
              Çıkış Yap
            </Text>
          </Pressable>
        </View>
      </View>

      <Text style={[styles.version, { color: colors.mutedForeground }]}>
        Sürüm 1.0.0
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    gap: 16,
  },
  pageTitle: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    marginBottom: 4,
  },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
    gap: 16,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  profileInfo: {
    gap: 4,
  },
  roleName: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
  },
  roleDesc: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
  },
  statBox: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    alignItems: "center",
    gap: 4,
  },
  statValue: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
  },
  statLabel: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    textAlign: "center",
  },
  menuSection: {
    gap: 8,
    marginTop: 8,
  },
  sectionLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1,
    paddingLeft: 4,
  },
  menuCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 14,
    borderBottomWidth: 1,
  },
  menuLabel: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
  },
  version: {
    textAlign: "center",
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: "auto",
  },
});
