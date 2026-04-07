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

import { CUSTOMER_NAME, VEHICLE_MODEL, useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

const ROLE_LABELS: Record<string, string> = {
  admin: "Yönetici",
  field: "Saha Personeli",
  customer: "Müşteri",
};

const ROLE_ICONS: Record<string, any> = {
  admin: "shield",
  field: "tool",
  customer: "eye",
};

const ROLE_COLORS: Record<string, string> = {
  admin: "#8b5cf6",
  field: "#0a84ff",
  customer: "#10b981",
};

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { currentUser, role, logout, assemblies } = useApp();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 + 84 : insets.bottom + 84;

  const myAssemblies = assemblies.filter((a) => {
    if (role === "field") return a.assignedToUserId === currentUser?.id || a.assignedTo === currentUser?.name;
    return true;
  });

  const myCompleted = myAssemblies.filter((a) => a.status === "completed").length;
  const myActive = myAssemblies.filter((a) => a.status !== "completed").length;
  const myPhotos = myAssemblies.reduce((s, a) => s + a.photos.length, 0);

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

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[styles.container, { paddingTop: topPad + 20, paddingBottom: bottomPad }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Avatar + name */}
      <View style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.avatar, { backgroundColor: roleColor + "20" }]}>
          <Text style={[styles.avatarText, { color: roleColor }]}>{initials}</Text>
        </View>
        <View style={styles.profileInfo}>
          <Text style={[styles.profileName, { color: colors.foreground }]}>{currentUser.name}</Text>
          <Text style={[styles.profileUsername, { color: colors.mutedForeground }]}>
            @{currentUser.username}
          </Text>
        </View>
        <View style={[styles.roleBadge, { backgroundColor: roleColor + "15", borderColor: roleColor + "30" }]}>
          <Feather name={ROLE_ICONS[currentUser.role]} size={13} color={roleColor} />
          <Text style={[styles.roleBadgeText, { color: roleColor }]}>
            {ROLE_LABELS[currentUser.role]}
          </Text>
        </View>
      </View>

      {/* Stats */}
      {role !== "customer" && (
        <View style={styles.statsRow}>
          <StatCard label="Aktif" value={myActive} color={colors.primary} colors={colors} />
          <StatCard label="Tamamlandı" value={myCompleted} color={colors.success} colors={colors} />
          <StatCard label="Fotoğraf" value={myPhotos} color={colors.accent} colors={colors} />
        </View>
      )}

      {/* Project info */}
      <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Proje Bilgileri</Text>
        <InfoRow icon="user" label="Müşteri" value={CUSTOMER_NAME} colors={colors} />
        <InfoRow icon="truck" label="Araç" value={VEHICLE_MODEL} colors={colors} />
        <InfoRow icon="layers" label="Toplam Kayıt" value={String(assemblies.length)} colors={colors} />
      </View>

      {/* Admin shortcuts */}
      {role === "admin" && (
        <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Yönetici İşlemleri</Text>
          <Pressable
            onPress={() => router.push("/manage-users" as any)}
            style={({ pressed }) => [
              styles.actionRow,
              { borderTopColor: colors.border, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <View style={[styles.actionIcon, { backgroundColor: "#8b5cf620" }]}>
              <Feather name="users" size={18} color="#8b5cf6" />
            </View>
            <View style={styles.actionText}>
              <Text style={[styles.actionLabel, { color: colors.foreground }]}>Kullanıcı Yönetimi</Text>
              <Text style={[styles.actionSub, { color: colors.mutedForeground }]}>
                Personel ve müşteri hesapları
              </Text>
            </View>
            <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
          </Pressable>
        </View>
      )}

      {/* App info */}
      <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Uygulama</Text>
        <InfoRow icon="info" label="Versiyon" value="1.0.0" colors={colors} />
        <InfoRow icon="calendar" label="Tarih" value={new Date().toLocaleDateString("tr-TR")} colors={colors} />
      </View>

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

function StatCard({ label, value, color, colors }: { label: string; value: number; color: string; colors: any }) {
  return (
    <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

function InfoRow({ icon, label, value, colors }: { icon: any; label: string; value: string; colors: any }) {
  return (
    <View style={[styles.infoRow, { borderTopColor: colors.border }]}>
      <Feather name={icon} size={15} color={colors.mutedForeground} style={{ width: 20 }} />
      <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <Text style={[styles.infoValue, { color: colors.foreground }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 20, gap: 14 },
  profileCard: { borderRadius: 18, borderWidth: 1, padding: 20, flexDirection: "row", alignItems: "center", gap: 14 },
  avatar: { width: 60, height: 60, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 22, fontFamily: "Inter_700Bold" },
  profileInfo: { flex: 1, gap: 3 },
  profileName: { fontSize: 17, fontFamily: "Inter_600SemiBold" },
  profileUsername: { fontSize: 13, fontFamily: "Inter_400Regular" },
  roleBadge: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1 },
  roleBadgeText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  statsRow: { flexDirection: "row", gap: 10 },
  statCard: { flex: 1, borderRadius: 14, borderWidth: 1, padding: 14, alignItems: "center", gap: 4 },
  statValue: { fontSize: 26, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 11, fontFamily: "Inter_500Medium", textAlign: "center" },
  sectionCard: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 0 },
  sectionTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold", marginBottom: 10 },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, borderTopWidth: 1 },
  infoLabel: { fontSize: 13, fontFamily: "Inter_500Medium", width: 90 },
  infoValue: { fontSize: 13, fontFamily: "Inter_400Regular", flex: 1, textAlign: "right" },
  actionRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingTop: 14, borderTopWidth: 1 },
  actionIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  actionText: { flex: 1, gap: 2 },
  actionLabel: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  actionSub: { fontSize: 12, fontFamily: "Inter_400Regular" },
  logoutBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 16, borderRadius: 14, borderWidth: 1 },
  logoutText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
});
