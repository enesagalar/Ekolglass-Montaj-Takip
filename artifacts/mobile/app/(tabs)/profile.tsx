import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React from "react";
import {
  Alert,
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

const ROLE_LABELS: Record<string, string> = {
  admin: "Yönetici",
  field: "Saha Personeli",
  customer: "Müşteri",
};

const ROLE_COLORS: Record<string, string> = {
  admin: "#8b5cf6",
  field: "#0a84ff",
  customer: "#10b981",
};

const ROLE_ICONS: Record<string, any> = {
  admin: "shield",
  field: "tool",
  customer: "eye",
};

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { currentUser, role, logout, assemblies } = useApp();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 + 84 : insets.bottom + 84;

  const handleLogout = () => {
    Alert.alert("Çıkış Yap", "Oturumunuzu kapatmak istediğinizden emin misiniz?", [
      { text: "İptal", style: "cancel" },
      {
        text: "Çıkış Yap",
        style: "destructive",
        onPress: async () => {
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          logout();
          router.replace("/login" as any);
        },
      },
    ]);
  };

  if (!currentUser) return null;

  const roleColor = ROLE_COLORS[currentUser.role] ?? colors.primary;
  const initials = currentUser.name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const myAssemblies = role === "field"
    ? assemblies.filter((a) => a.assignedToUserId === currentUser.id || a.assignedTo === currentUser.name)
    : assemblies;

  const activeCount = myAssemblies.filter((a) => a.status !== "completed").length;
  const completedCount = myAssemblies.filter((a) => a.status === "completed").length;
  const photoCount = myAssemblies.reduce((s, a) => s + a.photos.length, 0);

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[styles.container, { paddingTop: topPad + 20, paddingBottom: bottomPad }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Profile card */}
      <View style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.avatar, { backgroundColor: roleColor + "20" }]}>
          <Text style={[styles.avatarText, { color: roleColor }]}>{initials}</Text>
        </View>
        <View style={styles.profileInfo}>
          <Text style={[styles.profileName, { color: colors.foreground }]}>{currentUser.name}</Text>
          <Text style={[styles.profileUsername, { color: colors.mutedForeground }]}>@{currentUser.username}</Text>
        </View>
        <View style={[styles.roleBadge, { backgroundColor: roleColor + "15", borderColor: roleColor + "30" }]}>
          <Feather name={ROLE_ICONS[currentUser.role]} size={12} color={roleColor} />
          <Text style={[styles.roleBadgeText, { color: roleColor }]}>{ROLE_LABELS[currentUser.role]}</Text>
        </View>
      </View>

      {/* Stats */}
      {role !== "customer" && (
        <View style={styles.statsRow}>
          <StatBox label="Aktif" value={activeCount} color={colors.primary} colors={colors} />
          <StatBox label="Tamamlandı" value={completedCount} color={colors.success} colors={colors} />
          <StatBox label="Fotoğraf" value={photoCount} color={colors.accent} colors={colors} />
        </View>
      )}

      {/* Admin actions */}
      {role === "admin" && (
        <View style={[styles.actionsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <ActionRow
            icon="users"
            label="Kullanıcı Yönetimi"
            onPress={() => router.push("/manage-users" as any)}
            colors={colors}
          />
        </View>
      )}

      {/* Logout */}
      <Pressable
        onPress={handleLogout}
        style={({ pressed }) => [
          styles.logoutBtn,
          { backgroundColor: colors.destructive + "12", borderColor: colors.destructive + "30", opacity: pressed ? 0.8 : 1 },
        ]}
      >
        <Feather name="log-out" size={18} color={colors.destructive} />
        <Text style={[styles.logoutText, { color: colors.destructive }]}>Çıkış Yap</Text>
      </Pressable>
    </ScrollView>
  );
}

function StatBox({ label, value, color, colors }: { label: string; value: number; color: string; colors: any }) {
  return (
    <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

function ActionRow({ icon, label, onPress, colors }: { icon: any; label: string; onPress: () => void; colors: any }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.actionRow, { opacity: pressed ? 0.7 : 1 }]}
    >
      <View style={[styles.actionIcon, { backgroundColor: colors.primary + "15" }]}>
        <Feather name={icon} size={16} color={colors.primary} />
      </View>
      <Text style={[styles.actionLabel, { color: colors.foreground }]}>{label}</Text>
      <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 20, gap: 14 },
  profileCard: { borderRadius: 18, borderWidth: 1, padding: 18, flexDirection: "row", alignItems: "center", gap: 14 },
  avatar: { width: 56, height: 56, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 20, fontFamily: "Inter_700Bold" },
  profileInfo: { flex: 1, gap: 3 },
  profileName: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  profileUsername: { fontSize: 12, fontFamily: "Inter_400Regular" },
  roleBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 8, borderWidth: 1 },
  roleBadgeText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  statsRow: { flexDirection: "row", gap: 10 },
  statBox: { flex: 1, borderRadius: 14, borderWidth: 1, padding: 14, alignItems: "center", gap: 4 },
  statValue: { fontSize: 24, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 11, fontFamily: "Inter_500Medium", textAlign: "center" },
  actionsCard: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  actionRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14 },
  actionIcon: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  actionLabel: { flex: 1, fontSize: 14, fontFamily: "Inter_500Medium" },
  logoutBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 16, borderRadius: 14, borderWidth: 1 },
  logoutText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
});
