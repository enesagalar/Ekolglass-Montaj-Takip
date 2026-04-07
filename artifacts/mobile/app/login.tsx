import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useRef, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

export default function LoginScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { login } = useApp();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const passwordRef = useRef<TextInput>(null);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const handleLogin = async () => {
    if (!username.trim()) { setError("Kullanıcı adı giriniz."); return; }
    if (!password) { setError("Şifre giriniz."); return; }
    setError("");
    setLoading(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const result = await login(username.trim(), password);
    setLoading(false);
    if (result.success) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace("/(tabs)" as any);
    } else {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(result.message ?? "Giriş başarısız.");
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={0}
    >
      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingTop: topPad + 48, paddingBottom: bottomPad + 32 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Logo */}
        <View style={styles.logoSection}>
          <View style={[styles.iconBg, { backgroundColor: colors.primary + "18" }]}>
            <Feather name="wind" size={40} color={colors.primary} />
          </View>
          <Text style={[styles.appName, { color: colors.foreground }]}>
            Cam Montaj Takip
          </Text>
          <Text style={[styles.appSubtitle, { color: colors.mutedForeground }]}>
            ISRI · Fiat Ducato
          </Text>
        </View>

        {/* Card */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>Giriş Yap</Text>
          <Text style={[styles.cardSubtitle, { color: colors.mutedForeground }]}>
            Sisteme erişmek için bilgilerinizi girin
          </Text>

          {/* Username */}
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>
              Kullanıcı Adı
            </Text>
            <View
              style={[
                styles.inputWrap,
                {
                  backgroundColor: colors.muted,
                  borderColor: error && !username ? colors.destructive : colors.border,
                },
              ]}
            >
              <Feather name="user" size={16} color={colors.mutedForeground} />
              <TextInput
                value={username}
                onChangeText={(t) => { setUsername(t); setError(""); }}
                placeholder="kullanıcı adı"
                placeholderTextColor={colors.mutedForeground}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
                onSubmitEditing={() => passwordRef.current?.focus()}
                style={[styles.textInput, { color: colors.foreground }]}
              />
            </View>
          </View>

          {/* Password */}
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>Şifre</Text>
            <View
              style={[
                styles.inputWrap,
                {
                  backgroundColor: colors.muted,
                  borderColor: error ? colors.destructive : colors.border,
                },
              ]}
            >
              <Feather name="lock" size={16} color={colors.mutedForeground} />
              <TextInput
                ref={passwordRef}
                value={password}
                onChangeText={(t) => { setPassword(t); setError(""); }}
                placeholder="şifre"
                placeholderTextColor={colors.mutedForeground}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="done"
                onSubmitEditing={handleLogin}
                style={[styles.textInput, { color: colors.foreground }]}
              />
              <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                <Feather
                  name={showPassword ? "eye-off" : "eye"}
                  size={16}
                  color={colors.mutedForeground}
                />
              </Pressable>
            </View>
          </View>

          {/* Error */}
          {error ? (
            <View style={[styles.errorBox, { backgroundColor: colors.destructive + "12", borderColor: colors.destructive + "30" }]}>
              <Feather name="alert-circle" size={14} color={colors.destructive} />
              <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
            </View>
          ) : null}

          {/* Login Button */}
          <Pressable
            onPress={handleLogin}
            disabled={loading}
            style={({ pressed }) => [
              styles.loginBtn,
              { backgroundColor: loading ? colors.mutedForeground : colors.primary, opacity: pressed ? 0.87 : 1 },
            ]}
          >
            {loading ? (
              <Text style={styles.loginBtnText}>Giriş yapılıyor...</Text>
            ) : (
              <>
                <Feather name="log-in" size={18} color="#fff" />
                <Text style={styles.loginBtnText}>Giriş Yap</Text>
              </>
            )}
          </Pressable>
        </View>

        {/* Hint for demo */}
        <View style={[styles.hintBox, { backgroundColor: colors.muted, borderColor: colors.border }]}>
          <Feather name="info" size={13} color={colors.mutedForeground} />
          <View style={styles.hintContent}>
            <Text style={[styles.hintTitle, { color: colors.foreground }]}>Demo Hesapları</Text>
            <Text style={[styles.hintLine, { color: colors.mutedForeground }]}>Admin: <Text style={{ fontFamily: "Inter_600SemiBold" }}>admin / admin123</Text></Text>
            <Text style={[styles.hintLine, { color: colors.mutedForeground }]}>Personel: <Text style={{ fontFamily: "Inter_600SemiBold" }}>mehmet / 1234</Text></Text>
            <Text style={[styles.hintLine, { color: colors.mutedForeground }]}>Müşteri: <Text style={{ fontFamily: "Inter_600SemiBold" }}>isri / isri2024</Text></Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  container: { paddingHorizontal: 24, gap: 28 },
  logoSection: { alignItems: "center", gap: 10 },
  iconBg: { width: 88, height: 88, borderRadius: 26, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  appName: { fontSize: 26, fontFamily: "Inter_700Bold", textAlign: "center" },
  appSubtitle: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
  card: { borderRadius: 20, borderWidth: 1, padding: 24, gap: 16 },
  cardTitle: { fontSize: 20, fontFamily: "Inter_700Bold" },
  cardSubtitle: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: -8 },
  inputGroup: { gap: 7 },
  inputLabel: { fontSize: 13, fontFamily: "Inter_500Medium" },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    height: 50,
    gap: 10,
  },
  textInput: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular", height: 50 },
  eyeBtn: { padding: 4 },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  errorText: { fontSize: 13, fontFamily: "Inter_500Medium", flex: 1 },
  loginBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 52,
    borderRadius: 14,
    gap: 10,
    marginTop: 4,
  },
  loginBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: "#fff" },
  hintBox: {
    flexDirection: "row",
    gap: 10,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "flex-start",
  },
  hintContent: { flex: 1, gap: 3 },
  hintTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold", marginBottom: 2 },
  hintLine: { fontSize: 12, fontFamily: "Inter_400Regular" },
});
