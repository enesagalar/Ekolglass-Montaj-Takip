import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React from "react";
import {
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { UserRole, useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

interface RoleOption {
  role: UserRole;
  label: string;
  subtitle: string;
  icon: keyof typeof Feather.glyphMap;
  color: string;
}

export default function LoginScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { setRole } = useApp();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const roles: RoleOption[] = [
    {
      role: "field",
      label: "Saha Personeli",
      subtitle: "Montaj kaydı oluştur ve güncelle",
      icon: "tool",
      color: colors.primary,
    },
    {
      role: "admin",
      label: "Yönetim / Admin",
      subtitle: "Tüm kayıtları görüntüle ve yönet",
      icon: "bar-chart-2",
      color: colors.accent,
    },
    {
      role: "customer",
      label: "Müşteri",
      subtitle: "Araç durumunu takip et",
      icon: "eye",
      color: colors.success,
    },
  ];

  const handleSelect = async (role: UserRole) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await setRole(role);
    router.replace("/(tabs)" as any);
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
          paddingTop: topPad + 32,
          paddingBottom: bottomPad + 16,
        },
      ]}
    >
      <View style={styles.header}>
        <View
          style={[
            styles.iconBg,
            { backgroundColor: colors.primary + "15" },
          ]}
        >
          <Feather name="wind" size={36} color={colors.primary} />
        </View>
        <Text style={[styles.title, { color: colors.foreground }]}>
          Cam Montaj Takip
        </Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          Giriş yapmak için rolünüzü seçin
        </Text>
      </View>

      <View style={styles.roles}>
        {roles.map((item) => (
          <Pressable
            key={item.role}
            onPress={() => handleSelect(item.role)}
            style={({ pressed }) => [
              styles.roleCard,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                transform: [{ scale: pressed ? 0.97 : 1 }],
              },
            ]}
          >
            <View
              style={[
                styles.roleIcon,
                { backgroundColor: item.color + "15" },
              ]}
            >
              <Feather name={item.icon} size={24} color={item.color} />
            </View>
            <View style={styles.roleText}>
              <Text style={[styles.roleLabel, { color: colors.foreground }]}>
                {item.label}
              </Text>
              <Text
                style={[styles.roleSubtitle, { color: colors.mutedForeground }]}
              >
                {item.subtitle}
              </Text>
            </View>
            <Feather name="chevron-right" size={20} color={colors.mutedForeground} />
          </Pressable>
        ))}
      </View>

      <Text style={[styles.footer, { color: colors.mutedForeground }]}>
        Bu, demo amaçlı bir uygulamadır.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    gap: 32,
  },
  header: {
    alignItems: "center",
    gap: 12,
  },
  iconBg: {
    width: 80,
    height: 80,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
  roles: {
    gap: 14,
  },
  roleCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
    gap: 16,
  },
  roleIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  roleText: {
    flex: 1,
    gap: 3,
  },
  roleLabel: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  roleSubtitle: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  footer: {
    textAlign: "center",
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
});
