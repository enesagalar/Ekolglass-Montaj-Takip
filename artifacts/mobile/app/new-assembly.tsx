import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Image,
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

import {
  AssemblyStatus,
  CUSTOMER_NAME,
  GLASS_PRODUCTS,
  VEHICLE_MODEL,
  useApp,
} from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

export default function NewAssemblyScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { addAssembly, staffMembers, glassStock } = useApp();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const [vin, setVin] = useState("");
  const [vinPhotoUri, setVinPhotoUri] = useState<string | undefined>();
  const [selectedGlassId, setSelectedGlassId] = useState(GLASS_PRODUCTS[0].id);
  const [assignedTo, setAssignedTo] = useState(staffMembers[0]);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const handleVinPhoto = async (source: "camera" | "gallery") => {
    let result: ImagePicker.ImagePickerResult;
    if (source === "camera") {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) { Alert.alert("İzin Gerekli", "Kamera için izin gereklidir."); return; }
      result = await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.8, allowsEditing: true });
    } else {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) { Alert.alert("İzin Gerekli", "Galeri için izin gereklidir."); return; }
      result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.8, allowsEditing: true });
    }
    if (!result.canceled && result.assets.length > 0) {
      setVinPhotoUri(result.assets[0].uri);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleVinPhotoPress = () => {
    if (Platform.OS === "web") { handleVinPhoto("gallery"); return; }
    Alert.alert("Şase Fotoğrafı", "Fotoğraf kaynağını seçin", [
      { text: "Kamera", onPress: () => handleVinPhoto("camera") },
      { text: "Galeri", onPress: () => handleVinPhoto("gallery") },
      { text: "İptal", style: "cancel" },
    ]);
  };

  const selectedGlass = glassStock.find((g) => g.id === selectedGlassId);

  const handleSubmit = async () => {
    if (!vin.trim()) { Alert.alert("Hata", "Şase numarası zorunludur."); return; }
    if (vin.trim().length < 8) { Alert.alert("Hata", "Geçerli bir şase numarası giriniz."); return; }
    if (selectedGlass && selectedGlass.stock === 0) {
      Alert.alert("Stok Uyarısı", `${selectedGlass.name} ürününde stok bulunmamaktadır. Yine de devam edilsin mi?`, [
        { text: "İptal", style: "cancel" },
        { text: "Devam Et", onPress: () => createRecord() },
      ]);
      return;
    }
    createRecord();
  };

  const createRecord = async () => {
    setLoading(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const rec = addAssembly({
      vin: vin.trim().toUpperCase(),
      vinPhotoUri,
      glassProductId: selectedGlassId,
      assignedTo,
      notes: notes.trim(),
      status: "cutting" as AssemblyStatus,
      photos: [],
      defects: [],
    });
    setLoading(false);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.replace(`/assembly/${rec.id}` as any);
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          { paddingTop: topPad + 8, backgroundColor: colors.background, borderBottomColor: colors.border },
        ]}
      >
        <Pressable onPress={() => router.back()}>
          <Feather name="x" size={24} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Yeni Montaj Kaydı</Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView
          contentContainerStyle={[styles.form, { paddingBottom: bottomPad + 32 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Fixed info */}
          <View style={[styles.fixedInfo, { backgroundColor: colors.primary + "10", borderColor: colors.primary + "30" }]}>
            <View style={styles.fixedRow}>
              <Feather name="user" size={14} color={colors.primary} />
              <Text style={[styles.fixedLabel, { color: colors.mutedForeground }]}>Müşteri</Text>
              <Text style={[styles.fixedValue, { color: colors.foreground }]}>{CUSTOMER_NAME}</Text>
            </View>
            <View style={styles.fixedRow}>
              <Feather name="truck" size={14} color={colors.primary} />
              <Text style={[styles.fixedLabel, { color: colors.mutedForeground }]}>Araç</Text>
              <Text style={[styles.fixedValue, { color: colors.foreground }]}>{VEHICLE_MODEL}</Text>
            </View>
          </View>

          {/* VIN */}
          <SectionLabel label="ŞASE NUMARASI" colors={colors} />
          <View style={styles.field}>
            <TextInput
              value={vin}
              onChangeText={(t) => setVin(t.toUpperCase())}
              placeholder="VF3YHWMFB13459XXX"
              placeholderTextColor={colors.mutedForeground}
              autoCapitalize="characters"
              maxLength={17}
              style={[styles.input, { backgroundColor: colors.muted, borderColor: colors.border, color: colors.foreground }]}
            />
          </View>

          {/* VIN Photo */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>Şase Plaka Fotoğrafı</Text>
            {vinPhotoUri ? (
              <Pressable onPress={handleVinPhotoPress} style={styles.vinPhotoContainer}>
                <Image source={{ uri: vinPhotoUri }} style={styles.vinPhoto} resizeMode="cover" />
                <View style={[styles.vinPhotoOverlay, { backgroundColor: "rgba(0,0,0,0.45)" }]}>
                  <Feather name="camera" size={18} color="#fff" />
                  <Text style={styles.vinPhotoOverlayText}>Değiştir</Text>
                </View>
              </Pressable>
            ) : (
              <Pressable
                onPress={handleVinPhotoPress}
                style={[styles.vinPhotoEmpty, { backgroundColor: colors.muted, borderColor: colors.border }]}
              >
                <Feather name="camera" size={24} color={colors.mutedForeground} />
                <Text style={[styles.vinPhotoEmptyText, { color: colors.mutedForeground }]}>
                  Şase plaka fotoğrafı ekle
                </Text>
              </Pressable>
            )}
          </View>

          {/* Glass Selection */}
          <SectionLabel label="CAM SEÇİMİ" colors={colors} />
          <View style={styles.glassList}>
            {glassStock.map((g) => {
              const isSelected = selectedGlassId === g.id;
              const outOfStock = g.stock === 0;
              return (
                <Pressable
                  key={g.id}
                  onPress={() => setSelectedGlassId(g.id)}
                  style={[
                    styles.glassItem,
                    {
                      backgroundColor: isSelected ? colors.primary + "12" : colors.card,
                      borderColor: isSelected ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <View style={styles.glassItemLeft}>
                    <View
                      style={[
                        styles.glassRadio,
                        {
                          borderColor: isSelected ? colors.primary : colors.border,
                          backgroundColor: isSelected ? colors.primary : "transparent",
                        },
                      ]}
                    >
                      {isSelected && <Feather name="check" size={10} color="#fff" />}
                    </View>
                    <View style={styles.glassItemText}>
                      <Text
                        style={[
                          styles.glassName,
                          { color: isSelected ? colors.primary : colors.foreground },
                        ]}
                      >
                        {g.name}
                      </Text>
                      <Text style={[styles.glassCode, { color: colors.mutedForeground }]}>
                        {g.code}
                      </Text>
                    </View>
                  </View>
                  <View
                    style={[
                      styles.stockBadge,
                      {
                        backgroundColor: outOfStock ? colors.destructive + "15" : colors.success + "15",
                        borderColor: outOfStock ? colors.destructive + "40" : colors.success + "40",
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.stockBadgeText,
                        { color: outOfStock ? colors.destructive : colors.success },
                      ]}
                    >
                      {outOfStock ? "Stok Yok" : `${g.stock} adet`}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>

          {/* Staff */}
          <SectionLabel label="ATANAN PERSONEL" colors={colors} />
          <View style={styles.staffPicker}>
            {staffMembers.map((s) => (
              <Pressable
                key={s}
                onPress={() => setAssignedTo(s)}
                style={[
                  styles.staffChip,
                  {
                    backgroundColor: assignedTo === s ? colors.primary + "15" : colors.muted,
                    borderColor: assignedTo === s ? colors.primary : colors.border,
                  },
                ]}
              >
                <Feather name="user" size={13} color={assignedTo === s ? colors.primary : colors.mutedForeground} />
                <Text
                  style={[styles.staffChipText, { color: assignedTo === s ? colors.primary : colors.foreground }]}
                >
                  {s}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Notes */}
          <SectionLabel label="NOTLAR (İSTEĞE BAĞLI)" colors={colors} />
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="Ek bilgi, özel talimatlar..."
            placeholderTextColor={colors.mutedForeground}
            multiline
            numberOfLines={3}
            style={[
              styles.textarea,
              { backgroundColor: colors.muted, borderColor: colors.border, color: colors.foreground },
            ]}
          />

          <Pressable
            onPress={handleSubmit}
            disabled={loading}
            style={({ pressed }) => [
              styles.submitBtn,
              { backgroundColor: loading ? colors.mutedForeground : colors.primary, opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <Feather name="check" size={20} color="#fff" />
            <Text style={styles.submitText}>{loading ? "Kaydediliyor..." : "Kaydı Oluştur"}</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function SectionLabel({ label, colors }: { label: string; colors: any }) {
  return <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>{label}</Text>;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold" },
  form: { padding: 20, gap: 12 },
  fixedInfo: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    gap: 8,
  },
  fixedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  fixedLabel: { fontSize: 13, fontFamily: "Inter_400Regular", width: 60 },
  fixedValue: { fontSize: 13, fontFamily: "Inter_600SemiBold", flex: 1 },
  sectionLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1,
    marginTop: 8,
    marginBottom: -4,
  },
  field: { gap: 8 },
  label: { fontSize: 13, fontFamily: "Inter_500Medium" },
  input: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    letterSpacing: 1,
  },
  vinPhotoContainer: {
    width: "100%",
    height: 150,
    borderRadius: 12,
    overflow: "hidden",
    position: "relative",
  },
  vinPhoto: { width: "100%", height: "100%" },
  vinPhotoOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
  },
  vinPhotoOverlayText: { color: "#fff", fontSize: 13, fontFamily: "Inter_600SemiBold" },
  vinPhotoEmpty: {
    height: 100,
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  vinPhotoEmptyText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  glassList: { gap: 8 },
  glassItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  glassItemLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  glassRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  glassItemText: { flex: 1, gap: 2 },
  glassName: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  glassCode: { fontSize: 12, fontFamily: "Inter_400Regular" },
  stockBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  stockBadgeText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  staffPicker: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  staffChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
  },
  staffChipText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  textarea: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    minHeight: 80,
    textAlignVertical: "top",
  },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 54,
    borderRadius: 14,
    gap: 10,
    marginTop: 12,
  },
  submitText: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: "#fff" },
});
