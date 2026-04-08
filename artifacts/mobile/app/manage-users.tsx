import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState } from "react";
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

import { AppUser, useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

type NewUserForm = { username: string; password: string; name: string; role: "field" | "admin" | "customer" };

const ROLE_LABELS: Record<string, string> = { admin: "Yönetici", field: "Saha Personeli", customer: "ISRI Yetkilisi" };
const ROLE_COLORS: Record<string, string> = { admin: "#8b5cf6", field: "#0a84ff", customer: "#10b981" };
const ROLE_ICONS: Record<string, any> = { admin: "shield", field: "tool", customer: "eye" };

export default function ManageUsersScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { users, addUser, updateUser, deleteUser, currentUser, role } = useApp();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<NewUserForm>({ username: "", password: "", name: "", role: "field" });
  const [formError, setFormError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  if (role !== "admin") {
    return (
      <View style={[styles.restricted, { backgroundColor: colors.background }]}>
        <Feather name="lock" size={40} color={colors.mutedForeground} />
        <Text style={[styles.restrictedText, { color: colors.mutedForeground }]}>
          Bu bölüm sadece yöneticiler içindir
        </Text>
      </View>
    );
  }

  const resetForm = () => {
    setForm({ username: "", password: "", name: "", role: "field" });
    setFormError("");
    setEditingId(null);
    setShowForm(false);
  };

  const handleSave = async () => {
    if (!form.username.trim()) { setFormError("Kullanıcı adı zorunludur."); return; }
    if (!form.name.trim()) { setFormError("Ad Soyad zorunludur."); return; }
    if (!editingId && !form.password) { setFormError("Şifre zorunludur."); return; }

    const existsUsername = users.find(
      (u) => u.username.toLowerCase() === form.username.toLowerCase() && u.id !== editingId
    );
    if (existsUsername) { setFormError("Bu kullanıcı adı zaten kullanımda."); return; }

    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (editingId) {
      const updates: Partial<AppUser> = { username: form.username.trim(), name: form.name.trim(), role: form.role };
      if (form.password) updates.password = form.password;
      updateUser(editingId, updates);
    } else {
      addUser({ username: form.username.trim(), password: form.password, name: form.name.trim(), role: form.role, active: true });
    }

    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    resetForm();
  };

  const handleEdit = (user: AppUser) => {
    setForm({ username: user.username, password: "", name: user.name, role: user.role });
    setEditingId(user.id);
    setShowForm(true);
    setFormError("");
  };

  const handleToggleActive = (user: AppUser) => {
    if (user.id === currentUser?.id) {
      Alert.alert("Uyarı", "Kendi hesabınızı devre dışı bırakamazsınız.");
      return;
    }
    Alert.alert(
      user.active ? "Hesabı Devre Dışı Bırak" : "Hesabı Aktive Et",
      `${user.name} hesabını ${user.active ? "devre dışı bırakmak" : "aktive etmek"} istediğinizden emin misiniz?`,
      [
        { text: "İptal", style: "cancel" },
        { text: "Evet", onPress: () => updateUser(user.id, { active: !user.active }) },
      ]
    );
  };

  const handleDelete = (user: AppUser) => {
    if (user.id === currentUser?.id) {
      Alert.alert("Uyarı", "Kendi hesabınızı silemezsiniz.");
      return;
    }
    Alert.alert("Kullanıcıyı Sil", `${user.name} hesabını kalıcı olarak silmek istediğinizden emin misiniz?`, [
      { text: "İptal", style: "cancel" },
      {
        text: "Sil",
        style: "destructive",
        onPress: async () => {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          deleteUser(user.id);
        },
      },
    ]);
  };

  const groupedUsers = {
    admin: users.filter((u) => u.role === "admin"),
    field: users.filter((u) => u.role === "field"),
    customer: users.filter((u) => u.role === "customer"),
  };

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View
        style={[
          styles.header,
          { paddingTop: topPad + 8, backgroundColor: colors.card, borderBottomColor: colors.border },
        ]}
      >
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Kullanıcı Yönetimi</Text>
        <Pressable
          onPress={() => { setShowForm(!showForm); setEditingId(null); setForm({ username: "", password: "", name: "", role: "field" }); }}
          style={[styles.addBtn, { backgroundColor: colors.primary }]}
        >
          <Feather name={showForm ? "x" : "plus"} size={20} color="#fff" />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: bottomPad + 32 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Add/Edit Form */}
        {showForm && (
          <View style={[styles.formCard, { backgroundColor: colors.card, borderColor: colors.primary + "50" }]}>
            <Text style={[styles.formTitle, { color: colors.foreground }]}>
              {editingId ? "Kullanıcıyı Düzenle" : "Yeni Kullanıcı Ekle"}
            </Text>

            <FormField
              label="Ad Soyad"
              value={form.name}
              onChange={(v) => { setForm((f) => ({ ...f, name: v })); setFormError(""); }}
              placeholder="Mehmet Demir"
              colors={colors}
            />
            <FormField
              label="Kullanıcı Adı"
              value={form.username}
              onChange={(v) => { setForm((f) => ({ ...f, username: v.toLowerCase() })); setFormError(""); }}
              placeholder="mehmet"
              autoCapitalize="none"
              colors={colors}
            />

            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>
                Şifre{editingId ? " (boş bırakılırsa değişmez)" : ""}
              </Text>
              <View style={[styles.inputWrap, { backgroundColor: colors.muted, borderColor: colors.border }]}>
                <TextInput
                  value={form.password}
                  onChangeText={(v) => { setForm((f) => ({ ...f, password: v })); setFormError(""); }}
                  placeholder="şifre"
                  placeholderTextColor={colors.mutedForeground}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  style={[styles.fieldInput, { color: colors.foreground }]}
                />
                <Pressable onPress={() => setShowPassword(!showPassword)}>
                  <Feather name={showPassword ? "eye-off" : "eye"} size={16} color={colors.mutedForeground} />
                </Pressable>
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Rol</Text>
              <View style={styles.roleRow}>
                {(["field", "admin", "customer"] as const).map((r) => (
                  <Pressable
                    key={r}
                    onPress={() => setForm((f) => ({ ...f, role: r }))}
                    style={[
                      styles.roleChip,
                      {
                        backgroundColor: form.role === r ? ROLE_COLORS[r] + "20" : colors.muted,
                        borderColor: form.role === r ? ROLE_COLORS[r] : colors.border,
                      },
                    ]}
                  >
                    <Feather name={ROLE_ICONS[r]} size={13} color={form.role === r ? ROLE_COLORS[r] : colors.mutedForeground} />
                    <Text style={[styles.roleChipText, { color: form.role === r ? ROLE_COLORS[r] : colors.foreground }]}>
                      {ROLE_LABELS[r]}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {formError ? (
              <View style={[styles.errorBox, { backgroundColor: colors.destructive + "12", borderColor: colors.destructive + "30" }]}>
                <Feather name="alert-circle" size={13} color={colors.destructive} />
                <Text style={[styles.errorText, { color: colors.destructive }]}>{formError}</Text>
              </View>
            ) : null}

            <View style={styles.formActions}>
              <Pressable onPress={resetForm} style={[styles.cancelBtn, { borderColor: colors.border }]}>
                <Text style={[styles.cancelBtnText, { color: colors.mutedForeground }]}>İptal</Text>
              </Pressable>
              <Pressable
                onPress={handleSave}
                style={({ pressed }) => [styles.saveBtn, { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1, flex: 1 }]}
              >
                <Feather name="check" size={16} color="#fff" />
                <Text style={styles.saveBtnText}>{editingId ? "Güncelle" : "Ekle"}</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* User lists by role */}
        {(["admin", "field", "customer"] as const).map((roleKey) => {
          const roleUsers = groupedUsers[roleKey];
          if (roleUsers.length === 0) return null;
          const color = ROLE_COLORS[roleKey];
          return (
            <View key={roleKey}>
              <View style={styles.roleSectionHeader}>
                <Feather name={ROLE_ICONS[roleKey]} size={14} color={color} />
                <Text style={[styles.roleSectionTitle, { color }]}>
                  {ROLE_LABELS[roleKey]} ({roleUsers.length})
                </Text>
              </View>
              <View style={styles.userList}>
                {roleUsers.map((user) => {
                  const isMe = user.id === currentUser?.id;
                  const initials = user.name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
                  return (
                    <View
                      key={user.id}
                      style={[
                        styles.userCard,
                        {
                          backgroundColor: colors.card,
                          borderColor: !user.active ? colors.border : isMe ? color + "40" : colors.border,
                          opacity: user.active ? 1 : 0.6,
                        },
                      ]}
                    >
                      <View style={[styles.userAvatar, { backgroundColor: color + "15" }]}>
                        <Text style={[styles.userAvatarText, { color }]}>{initials}</Text>
                      </View>
                      <View style={styles.userInfo}>
                        <View style={styles.userNameRow}>
                          <Text style={[styles.userName, { color: colors.foreground }]}>{user.name}</Text>
                          {isMe && (
                            <View style={[styles.meBadge, { backgroundColor: color + "15" }]}>
                              <Text style={[styles.meBadgeText, { color }]}>Sen</Text>
                            </View>
                          )}
                          {!user.active && (
                            <View style={[styles.meBadge, { backgroundColor: colors.muted }]}>
                              <Text style={[styles.meBadgeText, { color: colors.mutedForeground }]}>Pasif</Text>
                            </View>
                          )}
                        </View>
                        <Text style={[styles.userUsername, { color: colors.mutedForeground }]}>
                          @{user.username}
                        </Text>
                      </View>
                      {!isMe && (
                        <View style={styles.userActions}>
                          <Pressable
                            onPress={() => handleEdit(user)}
                            style={[styles.iconBtn, { backgroundColor: colors.muted }]}
                          >
                            <Feather name="edit-2" size={15} color={colors.foreground} />
                          </Pressable>
                          <Pressable
                            onPress={() => handleToggleActive(user)}
                            style={[styles.iconBtn, { backgroundColor: user.active ? colors.warning + "15" : colors.success + "15" }]}
                          >
                            <Feather name={user.active ? "user-x" : "user-check"} size={15} color={user.active ? colors.warning : colors.success} />
                          </Pressable>
                          <Pressable
                            onPress={() => handleDelete(user)}
                            style={[styles.iconBtn, { backgroundColor: colors.destructive + "15" }]}
                          >
                            <Feather name="trash-2" size={15} color={colors.destructive} />
                          </Pressable>
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            </View>
          );
        })}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function FormField({ label, value, onChange, placeholder, autoCapitalize, colors }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; autoCapitalize?: any; colors: any;
}) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <View style={[styles.inputWrap, { backgroundColor: colors.muted, borderColor: colors.border }]}>
        <TextInput
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor={colors.mutedForeground}
          autoCapitalize={autoCapitalize ?? "words"}
          style={[styles.fieldInput, { color: colors.foreground }]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  restricted: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16 },
  restrictedText: { fontSize: 15, fontFamily: "Inter_500Medium", textAlign: "center" },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingBottom: 14, borderBottomWidth: 1, gap: 12,
  },
  backBtn: { padding: 2 },
  headerTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold", flex: 1 },
  addBtn: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  content: { padding: 16, gap: 16 },
  formCard: { borderRadius: 16, borderWidth: 1.5, padding: 16, gap: 14 },
  formTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  fieldGroup: { gap: 7 },
  fieldLabel: { fontSize: 12, fontFamily: "Inter_500Medium", letterSpacing: 0.3 },
  inputWrap: {
    flexDirection: "row", alignItems: "center",
    borderRadius: 11, borderWidth: 1, paddingHorizontal: 12, height: 46, gap: 8,
  },
  fieldInput: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", height: 46 },
  roleRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  roleChip: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1,
  },
  roleChipText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  errorBox: {
    flexDirection: "row", alignItems: "center", gap: 8,
    padding: 10, borderRadius: 10, borderWidth: 1,
  },
  errorText: { fontSize: 13, fontFamily: "Inter_500Medium", flex: 1 },
  formActions: { flexDirection: "row", gap: 10, marginTop: 4 },
  cancelBtn: { paddingHorizontal: 20, paddingVertical: 13, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  cancelBtnText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  saveBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, paddingVertical: 13, borderRadius: 12 },
  saveBtnText: { color: "#fff", fontSize: 14, fontFamily: "Inter_600SemiBold" },
  roleSectionHeader: { flexDirection: "row", alignItems: "center", gap: 7, marginBottom: 8 },
  roleSectionTitle: { fontSize: 12, fontFamily: "Inter_600SemiBold", letterSpacing: 0.5 },
  userList: { gap: 8 },
  userCard: {
    flexDirection: "row", alignItems: "center", gap: 12,
    padding: 14, borderRadius: 14, borderWidth: 1,
  },
  userAvatar: { width: 44, height: 44, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  userAvatarText: { fontSize: 16, fontFamily: "Inter_700Bold" },
  userInfo: { flex: 1, gap: 3 },
  userNameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  userName: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  userUsername: { fontSize: 12, fontFamily: "Inter_400Regular" },
  meBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  meBadgeText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  userActions: { flexDirection: "row", gap: 6 },
  iconBtn: { width: 34, height: 34, borderRadius: 9, alignItems: "center", justifyContent: "center" },
});
