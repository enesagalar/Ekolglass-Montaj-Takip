import { BlurView } from "expo-blur";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Redirect, Tabs } from "expo-router";
import { Icon, Label, NativeTabs } from "expo-router/unstable-native-tabs";
import { SymbolView } from "expo-symbols";
import { Feather } from "@expo/vector-icons";
import React from "react";
import { Platform, StyleSheet, View, useColorScheme } from "react-native";

import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

function NativeTabLayout({ showAdmin }: { showAdmin: boolean }) {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <Icon sf={{ default: "list.bullet", selected: "list.bullet" }} />
        <Label>Kayıtlar</Label>
      </NativeTabs.Trigger>
      {showAdmin && (
        <NativeTabs.Trigger name="admin">
          <Icon sf={{ default: "chart.bar", selected: "chart.bar.fill" }} />
          <Label>Panel</Label>
        </NativeTabs.Trigger>
      )}
      <NativeTabs.Trigger name="stock">
        <Icon sf={{ default: "shippingbox", selected: "shippingbox.fill" }} />
        <Label>Stok</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="profile">
        <Icon sf={{ default: "person", selected: "person.fill" }} />
        <Label>Profil</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

function ClassicTabLayout({ showAdmin }: { showAdmin: boolean }) {
  const colors = useColors();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: isIOS ? "transparent" : colors.background,
          borderTopWidth: isWeb ? 1 : 0,
          borderTopColor: colors.border,
          elevation: 0,
          ...(isWeb ? { height: 84 } : {}),
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView intensity={100} tint={isDark ? "dark" : "light"} style={StyleSheet.absoluteFill} />
          ) : isWeb ? (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.background }]} />
          ) : null,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Kayıtlar",
          tabBarIcon: ({ color }) =>
            isIOS ? <SymbolView name="list.bullet" tintColor={color} size={22} /> : <Feather name="list" size={22} color={color} />,
        }}
      />
      {showAdmin ? (
        <Tabs.Screen
          name="admin"
          options={{
            title: "Panel",
            tabBarIcon: ({ color }) =>
              isIOS ? <SymbolView name="chart.bar" tintColor={color} size={22} /> : <Feather name="bar-chart-2" size={22} color={color} />,
          }}
        />
      ) : (
        <Tabs.Screen name="admin" options={{ href: null }} />
      )}
      <Tabs.Screen
        name="stock"
        options={{
          title: "Stok",
          tabBarIcon: ({ color }) =>
            isIOS ? <SymbolView name="shippingbox" tintColor={color} size={22} /> : <Feather name="package" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profil",
          tabBarIcon: ({ color }) =>
            isIOS ? <SymbolView name="person" tintColor={color} size={22} /> : <Feather name="user" size={22} color={color} />,
        }}
      />
    </Tabs>
  );
}

export default function TabLayout() {
  const { role } = useApp();

  if (!role) return <Redirect href="/login" />;

  const showAdmin = role === "admin";

  if (isLiquidGlassAvailable()) return <NativeTabLayout showAdmin={showAdmin} />;
  return <ClassicTabLayout showAdmin={showAdmin} />;
}
