import { BlurView } from "expo-blur";
import { Feather } from "@expo/vector-icons";
import { Redirect, Tabs } from "expo-router";
import { SymbolView } from "expo-symbols";
import React from "react";
import { Platform, StyleSheet, View } from "react-native";

import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

export default function TabLayout() {
  const { role, assemblies, glassRequests } = useApp();
  const colors = useColors();
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";

  if (!role) return <Redirect href="/login" />;

  const showAdmin = role === "admin";
  const showNew = role === "field" || role === "admin";
  const showRequests = role === "admin" || role === "customer";
  const showAccounting = role === "accounting" || role === "admin" || role === "customer";
  const showReports = role === "admin" || role === "accounting";
  const pendingRequestsCount = glassRequests.filter((r) => r.status === "pending").length;

  const urgentCount = assemblies.filter((a) => a.status === "water_test_failed").length;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: isIOS ? "transparent" : colors.card,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          elevation: 0,
          height: isWeb ? 84 : undefined,
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView
              intensity={100}
              tint={colors.isDark ? "dark" : "light"}
              style={StyleSheet.absoluteFill}
            />
          ) : (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.card }]} />
          ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Kayıtlar",
          tabBarBadge: urgentCount > 0 && role === "admin" ? urgentCount : undefined,
          tabBarBadgeStyle: { backgroundColor: colors.destructive, fontSize: 10 },
          tabBarIcon: ({ color, size }) =>
            isIOS ? (
              <SymbolView name="list.bullet" tintColor={color} size={size} />
            ) : (
              <Feather name="list" size={size} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="admin"
        options={{
          title: "Panel",
          href: showAdmin ? undefined : null,
          tabBarIcon: ({ color, size }) =>
            isIOS ? (
              <SymbolView name="chart.bar.fill" tintColor={color} size={size} />
            ) : (
              <Feather name="bar-chart-2" size={size} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="photos"
        options={{
          title: "Fotoğraflar",
          tabBarIcon: ({ color, size }) =>
            isIOS ? (
              <SymbolView name="photo.stack" tintColor={color} size={size} />
            ) : (
              <Feather name="image" size={size} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="stock"
        options={{
          title: "Stok",
          href: role === "field" || role === "accounting" || role === "customer" ? null : undefined,
          tabBarIcon: ({ color, size }) =>
            isIOS ? (
              <SymbolView name="shippingbox" tintColor={color} size={size} />
            ) : (
              <Feather name="package" size={size} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="requests"
        options={{
          title: "Talepler",
          href: showRequests ? undefined : null,
          tabBarBadge: showAdmin && pendingRequestsCount > 0 ? pendingRequestsCount : undefined,
          tabBarBadgeStyle: { backgroundColor: "#f59e0b", fontSize: 10 },
          tabBarIcon: ({ color, size }) =>
            isIOS ? (
              <SymbolView name="tray.and.arrow.up" tintColor={color} size={size} />
            ) : (
              <Feather name="file-text" size={size} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="accounting"
        options={{
          title: role === "accounting" ? "Faturalar" : "Faturalar",
          href: showAccounting ? undefined : null,
          tabBarIcon: ({ color, size }) =>
            isIOS ? (
              <SymbolView name="doc.text.fill" tintColor={color} size={size} />
            ) : (
              <Feather name="file-text" size={size} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="reports"
        options={{
          title: "Raporlar",
          href: showReports ? undefined : null,
          tabBarIcon: ({ color, size }) =>
            isIOS ? (
              <SymbolView name="chart.bar.doc.horizontal" tintColor={color} size={size} />
            ) : (
              <Feather name="bar-chart" size={size} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profil",
          tabBarIcon: ({ color, size }) =>
            isIOS ? (
              <SymbolView name="person.fill" tintColor={color} size={size} />
            ) : (
              <Feather name="user" size={size} color={color} />
            ),
        }}
      />
    </Tabs>
  );
}
