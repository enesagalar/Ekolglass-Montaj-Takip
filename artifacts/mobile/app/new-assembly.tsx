import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
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
  GLASS_POSITIONS,
  VEHICLE_BRANDS,
  VehicleBrand,
  getBrandGlassCode,
  useApp,
} from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

const TOTAL_STEPS = 4;

export default function NewAssemblyScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { addAssembly, glassStock, users, currentUser, role } = useApp();

  const fieldStaff = users.filter((u) => u.role === "field" && u.active);
  const defaultStaff =
    role === "field" && currentUser ? currentUser.name : fieldStaff[0]?.name ?? "";

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const [step, setStep] = useState(0);
  const [selectedBrand, setSelectedBrand] = useState<VehicleBrand | null>(null);
  const [approvalDocUri, setApprovalDocUri] = useState<string | undefined>();
  const [vinLast5, setVinLast5] = useState("");
  const [vinPhotoUri, setVinPhotoUri] = useState<string | undefined>();
  const [selectedGlassIds, setSelectedGlassIds] = useState<string[]>([]);
  const [assignedTo, setAssignedTo] = useState(defaultStaff);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const vinRef = useRef<TextInput>(null);

  const takePhoto = async (source: "camera" | "gallery"): Promise<string | null> => {
    let result: ImagePicker.ImagePickerResult;
    if (source === "camera") {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        Alert.alert("İzin Gerekli", "Kamera için izin gereklidir.");
        return null;
      }
      result = await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.85, allowsEditing: false });
    } else {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert("İzin Gerekli", "Galeri için izin gereklidir.");
        return null;
      }
      result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.85, allowsEditing: false });
    }
    if (!result.canceled && result.assets.length > 0) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      return result.assets[0].uri;
    }
    return null;
  };

  const handlePhotoPress = async (setter: (uri: string) => void) => {
    if (Platform.OS === "web") {
      const uri = await takePhoto("gallery");
      if (uri) setter(uri);
      return;
    }
    Alert.alert("Fotoğraf Kaynağı", "Fotoğrafı nereden eklemek istiyorsunuz?", [
      { text: "Kamera", onPress: async () => { const uri = await takePhoto("camera"); if (uri) setter(uri); } },
      { text: "Galeri", onPress: async () => { const uri = await takePhoto("gallery"); if (uri) setter(uri); } },
      { text: "İptal", style: "cancel" },
    ]);
  };

  const handleNext = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (step < TOTAL_STEPS - 1) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 0) setStep(step - 1);
    else router.back();
  };

  const canGoNext = () => {
    if (step === 0) return selectedBrand !== null;
    if (step === 1) return !!approvalDocUri;
    if (step === 2) return vinLast5.length === 5 && !!vinPhotoUri;
    return true;
  };

  const handleSubmit = async () => {
    if (selectedGlassIds.length === 0) {
      Alert.alert("Hata", "En az bir cam seçiniz.");
      return;
    }
    if (!selectedBrand) return;

    const outOfStock = selectedGlassIds
      .map((id) => glassStock.find((g) => g.id === id))
      .filter((g) => g && g.stock === 0)
      .map((g) => g!.name);

    if (outOfStock.length > 0) {
      Alert.alert(
        "Stok Uyarısı",
        `Aşağıdaki camlar için stok bulunmuyor:\n${outOfStock.join("\n")}\n\nYine de devam edilsin mi?`,
        [
          { text: "İptal", style: "cancel" },
          { text: "Devam Et", onPress: () => createRecord() },
        ]
      );
      return;
    }
    createRecord();
  };

  const createRecord = async () => {
    if (!selectedBrand) return;
    setLoading(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const assignedUser = users.find((u) => u.name === assignedTo);
    const rec = addAssembly({
      vehicleModel: selectedBrand.id,
      vin: `XXXXX${vinLast5.toUpperCase()}`,
      vinLast5: vinLast5.toUpperCase(),
      approvalDocPhotoUri: approvalDocUri,
      vinPhotoUri,
      glassProductIds: selectedGlassIds,
      assignedTo,
      assignedToUserId: assignedUser?.id,
      notes: notes.trim(),
      status: "cutting" as AssemblyStatus,
      statusTimestamps: {},
      photos: [],
      defects: [],
    });
    setLoading(false);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.replace({ pathname: "/assembly/[id]", params: { id: rec.id } });
  };

  const renderProgressBar = () => (
    <View style={styles.progressBar}>
      {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
        <React.Fragment key={i}>
          <View style={[
            styles.progressDot,
            { backgroundColor: i <= step ? colors.primary : colors.border },
          ]}>
            {i < step ? (
              <Feather name="check" size={10} color="#fff" />
            ) : (
              <Text style={[styles.progressDotText, { color: i === step ? "#fff" : colors.mutedForeground }]}>
                {i + 1}
              </Text>
            )}
          </View>
          {i < TOTAL_STEPS - 1 && (
            <View style={[styles.progressLine, { backgroundColor: i < step ? colors.primary : colors.border }]} />
          )}
        </React.Fragment>
      ))}
    </View>
  );

  const STEP_TITLES = [
    "Araç Markası",
    "Araç Onay Belgesi",
    "Şase Numarası",
    "Cam & Personel Seçimi",
  ];

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      {/* Header */}
      <View
        style={[
          styles.header,
          { paddingTop: topPad + 8, backgroundColor: colors.card, borderBottomColor: colors.border },
        ]}
      >
        <Pressable onPress={handleBack} style={styles.headerBtn}>
          <Feather name={step === 0 ? "x" : "arrow-left"} size={22} color={colors.foreground} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Yeni Montaj Kaydı</Text>
          <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>
            {step + 1}/{TOTAL_STEPS} — {STEP_TITLES[step]}
          </Text>
        </View>
        <View style={{ width: 36 }} />
      </View>

      {/* Progress */}
      <View style={[styles.progressWrap, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        {renderProgressBar()}
      </View>

      <ScrollView
        contentContainerStyle={[styles.form, { paddingBottom: bottomPad + 80 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ---- STEP 0: Brand selection ---- */}
        {step === 0 && (
          <View style={styles.stepContent}>
            <Text style={[styles.stepTitle, { color: colors.foreground }]}>Araç Markasını Seçin</Text>
            <Text style={[styles.stepSub, { color: colors.mutedForeground }]}>
              Montaj yapılacak araç markasını seçin. Cam kodları buna göre belirlenir.
            </Text>
            <View style={styles.brandGrid}>
              {VEHICLE_BRANDS.map((brand) => {
                const isSelected = selectedBrand?.id === brand.id;
                return (
                  <Pressable
                    key={brand.id}
                    onPress={() => setSelectedBrand(brand)}
                    style={[
                      styles.brandCard,
                      {
                        backgroundColor: isSelected ? colors.primary + "12" : colors.card,
                        borderColor: isSelected ? colors.primary : colors.border,
                        borderWidth: isSelected ? 2 : 1,
                      },
                    ]}
                  >
                    <View style={[styles.brandIconWrap, { backgroundColor: isSelected ? colors.primary + "20" : colors.muted }]}>
                      <Feather name="truck" size={26} color={isSelected ? colors.primary : colors.mutedForeground} />
                    </View>
                    <Text style={[styles.brandName, { color: isSelected ? colors.primary : colors.foreground }]}>
                      {brand.name}
                    </Text>
                    <Text style={[styles.brandCode, { color: colors.mutedForeground }]}>
                      {brand.prefix}-IS
                    </Text>
                    {isSelected && (
                      <View style={[styles.brandCheck, { backgroundColor: colors.primary }]}>
                        <Feather name="check" size={12} color="#fff" />
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        {/* ---- STEP 1: Approval document photo ---- */}
        {step === 1 && (
          <View style={styles.stepContent}>
            <Text style={[styles.stepTitle, { color: colors.foreground }]}>Araç Onay Belgesi Fotoğrafı</Text>
            <Text style={[styles.stepSub, { color: colors.mutedForeground }]}>
              Araçta bulunan onay belgesinin fotoğrafını yükleyin. Bu fotoğraf olmadan kayıt açılamaz.
            </Text>

            <View style={[styles.mandatoryBadge, { backgroundColor: colors.destructive + "12", borderColor: colors.destructive + "30" }]}>
              <Feather name="alert-circle" size={13} color={colors.destructive} />
              <Text style={[styles.mandatoryText, { color: colors.destructive }]}>Zorunlu alan</Text>
            </View>

            {approvalDocUri ? (
              <Pressable onPress={() => handlePhotoPress(setApprovalDocUri)} style={styles.photoPreviewWrap}>
                <Image source={{ uri: approvalDocUri }} style={styles.photoPreview} resizeMode="cover" />
                <View style={[styles.photoPreviewOverlay, { backgroundColor: "rgba(0,0,0,0.45)" }]}>
                  <Feather name="refresh-cw" size={20} color="#fff" />
                  <Text style={styles.photoPreviewOverlayText}>Değiştir</Text>
                </View>
                <View style={[styles.photoPreviewBadge, { backgroundColor: colors.success }]}>
                  <Feather name="check" size={12} color="#fff" />
                  <Text style={styles.photoPreviewBadgeText}>Yüklendi</Text>
                </View>
              </Pressable>
            ) : (
              <Pressable
                onPress={() => handlePhotoPress(setApprovalDocUri)}
                style={[styles.photoEmpty, { backgroundColor: colors.muted, borderColor: colors.primary + "60" }]}
              >
                <View style={[styles.photoEmptyIcon, { backgroundColor: colors.primary + "15" }]}>
                  <Feather name="file-text" size={32} color={colors.primary} />
                </View>
                <Text style={[styles.photoEmptyTitle, { color: colors.foreground }]}>
                  Onay Belgesi Fotoğrafı Ekle
                </Text>
                <Text style={[styles.photoEmptyHint, { color: colors.mutedForeground }]}>
                  Kamera veya galeriden fotoğraf seçin
                </Text>
              </Pressable>
            )}
          </View>
        )}

        {/* ---- STEP 2: VIN last 5 + VIN photo ---- */}
        {step === 2 && (
          <View style={styles.stepContent}>
            <Text style={[styles.stepTitle, { color: colors.foreground }]}>Şase Numarası (Son 5 Hane)</Text>
            <Text style={[styles.stepSub, { color: colors.mutedForeground }]}>
              Araç şase numarasının son 5 hanesini girin ve şase plakanın fotoğrafını çekin.
            </Text>

            <View style={[styles.vinInputWrap, { backgroundColor: colors.muted, borderColor: vinLast5.length === 5 ? colors.success : colors.border }]}>
              <Text style={[styles.vinPrefix, { color: colors.mutedForeground }]}>•••••••••••••</Text>
              <TextInput
                ref={vinRef}
                value={vinLast5}
                onChangeText={(t) => setVinLast5(t.replace(/[^A-Za-z0-9]/g, "").toUpperCase())}
                placeholder="X X X X X"
                placeholderTextColor={colors.mutedForeground}
                autoCapitalize="characters"
                autoCorrect={false}
                maxLength={5}
                style={[styles.vinInput, { color: colors.foreground }]}
              />
              {vinLast5.length === 5 && (
                <Feather name="check-circle" size={18} color={colors.success} />
              )}
            </View>
            <Text style={[styles.vinHint, { color: colors.mutedForeground }]}>
              Tam 5 karakter girilmelidir ({vinLast5.length}/5)
            </Text>

            <View style={styles.divider} />

            <Text style={[styles.fieldLabel, { color: colors.foreground }]}>Şase Plaka Fotoğrafı</Text>
            <Text style={[styles.fieldSub, { color: colors.mutedForeground }]}>Zorunlu — şase plakasının okunabilir fotoğrafı</Text>

            {vinPhotoUri ? (
              <Pressable onPress={() => handlePhotoPress(setVinPhotoUri)} style={styles.photoPreviewWrap}>
                <Image source={{ uri: vinPhotoUri }} style={styles.photoPreview} resizeMode="cover" />
                <View style={[styles.photoPreviewOverlay, { backgroundColor: "rgba(0,0,0,0.45)" }]}>
                  <Feather name="refresh-cw" size={20} color="#fff" />
                  <Text style={styles.photoPreviewOverlayText}>Değiştir</Text>
                </View>
                <View style={[styles.photoPreviewBadge, { backgroundColor: colors.success }]}>
                  <Feather name="check" size={12} color="#fff" />
                  <Text style={styles.photoPreviewBadgeText}>Yüklendi</Text>
                </View>
              </Pressable>
            ) : (
              <Pressable
                onPress={() => handlePhotoPress(setVinPhotoUri)}
                style={[styles.photoEmpty, { backgroundColor: colors.muted, borderColor: colors.border }]}
              >
                <View style={[styles.photoEmptyIcon, { backgroundColor: colors.primary + "15" }]}>
                  <Feather name="camera" size={32} color={colors.primary} />
                </View>
                <Text style={[styles.photoEmptyTitle, { color: colors.foreground }]}>Şase Fotoğrafı Ekle</Text>
                <Text style={[styles.photoEmptyHint, { color: colors.mutedForeground }]}>
                  Plakayı net görecek şekilde fotoğraf çekin
                </Text>
              </Pressable>
            )}
          </View>
        )}

        {/* ---- STEP 3: Glass + staff + notes ---- */}
        {step === 3 && selectedBrand && (
          <View style={styles.stepContent}>
            <Text style={[styles.stepTitle, { color: colors.foreground }]}>Cam ve Personel Seçimi</Text>

            {/* Customer info banner */}
            <View style={[styles.infoBanner, { backgroundColor: colors.primary + "10", borderColor: colors.primary + "30" }]}>
              <View style={styles.infoBannerRow}>
                <Feather name="truck" size={13} color={colors.primary} />
                <Text style={[styles.infoBannerLabel, { color: colors.mutedForeground }]}>Marka</Text>
                <Text style={[styles.infoBannerValue, { color: colors.foreground }]}>{selectedBrand.name}</Text>
              </View>
              <View style={styles.infoBannerRow}>
                <Feather name="shield" size={13} color={colors.primary} />
                <Text style={[styles.infoBannerLabel, { color: colors.mutedForeground }]}>Şase</Text>
                <Text style={[styles.infoBannerValue, { color: colors.foreground }]}>...{vinLast5}</Text>
              </View>
              <View style={styles.infoBannerRow}>
                <Feather name="user" size={13} color={colors.primary} />
                <Text style={[styles.infoBannerLabel, { color: colors.mutedForeground }]}>Müşteri</Text>
                <Text style={[styles.infoBannerValue, { color: colors.foreground }]}>{CUSTOMER_NAME}</Text>
              </View>
            </View>

            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
              CAM SEÇİMİ ({selectedGlassIds.length > 0 ? `${selectedGlassIds.length} seçildi` : "en az 1 gerekli"})
            </Text>
            <View style={styles.glassList}>
              {GLASS_POSITIONS.map((g) => {
                const stockItem = glassStock.find((s) => s.id === g.id);
                const isSelected = selectedGlassIds.includes(g.id);
                const outOfStock = (stockItem?.stock ?? 0) === 0;
                const code = getBrandGlassCode(selectedBrand.id, g.suffix);
                return (
                  <Pressable
                    key={g.id}
                    onPress={() => {
                      setSelectedGlassIds((prev) =>
                        prev.includes(g.id) ? prev.filter((x) => x !== g.id) : [...prev, g.id]
                      );
                    }}
                    style={[
                      styles.glassItem,
                      {
                        backgroundColor: isSelected ? colors.primary + "12" : colors.card,
                        borderColor: isSelected ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.checkbox,
                        {
                          borderColor: isSelected ? colors.primary : colors.border,
                          backgroundColor: isSelected ? colors.primary : "transparent",
                        },
                      ]}
                    >
                      {isSelected && <Feather name="check" size={11} color="#fff" />}
                    </View>
                    <View style={styles.glassItemText}>
                      <Text style={[styles.glassName, { color: isSelected ? colors.primary : colors.foreground }]}>
                        {g.name}
                      </Text>
                      <Text style={[styles.glassCode, { color: colors.mutedForeground }]}>{code}</Text>
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
                      <Text style={[styles.stockBadgeText, { color: outOfStock ? colors.destructive : colors.success }]}>
                        {outOfStock ? "Yok" : `${stockItem?.stock ?? 0}`}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>

            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>ATANAN PERSONEL</Text>
            {role === "field" ? (
              <View style={[styles.staffChip, { backgroundColor: colors.primary + "12", borderColor: colors.primary, alignSelf: "flex-start" }]}>
                <Feather name="user" size={13} color={colors.primary} />
                <Text style={[styles.staffChipText, { color: colors.primary }]}>{assignedTo}</Text>
              </View>
            ) : (
              <View style={styles.staffPicker}>
                {fieldStaff.map((s) => (
                  <Pressable
                    key={s.id}
                    onPress={() => setAssignedTo(s.name)}
                    style={[
                      styles.staffChip,
                      {
                        backgroundColor: assignedTo === s.name ? colors.primary + "15" : colors.muted,
                        borderColor: assignedTo === s.name ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <Feather name="user" size={13} color={assignedTo === s.name ? colors.primary : colors.mutedForeground} />
                    <Text style={[styles.staffChipText, { color: assignedTo === s.name ? colors.primary : colors.foreground }]}>
                      {s.name}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}

            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>NOTLAR (İSTEĞE BAĞLI)</Text>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="Ek bilgi, özel talimatlar..."
              placeholderTextColor={colors.mutedForeground}
              multiline
              numberOfLines={3}
              style={[styles.textarea, { backgroundColor: colors.muted, borderColor: colors.border, color: colors.foreground }]}
            />

            <Pressable
              onPress={handleSubmit}
              disabled={loading || selectedGlassIds.length === 0}
              style={({ pressed }) => [
                styles.submitBtn,
                {
                  backgroundColor: selectedGlassIds.length === 0 ? colors.muted : loading ? colors.mutedForeground : colors.primary,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <Feather name="check" size={20} color={selectedGlassIds.length === 0 ? colors.mutedForeground : "#fff"} />
              <Text style={[styles.submitText, { color: selectedGlassIds.length === 0 ? colors.mutedForeground : "#fff" }]}>
                {loading ? "Kaydediliyor..." : `Kaydı Oluştur${selectedGlassIds.length > 0 ? ` (${selectedGlassIds.length} cam)` : ""}`}
              </Text>
            </Pressable>
          </View>
        )}
      </ScrollView>

      {/* Footer Next Button (steps 0-2) */}
      {step < 3 && (
        <View style={[styles.footer, { backgroundColor: colors.background, borderTopColor: colors.border, paddingBottom: bottomPad + 12 }]}>
          <Pressable
            onPress={handleNext}
            disabled={!canGoNext()}
            style={({ pressed }) => [
              styles.nextBtn,
              { backgroundColor: canGoNext() ? colors.primary : colors.muted, opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <Text style={[styles.nextBtnText, { color: canGoNext() ? "#fff" : colors.mutedForeground }]}>
              İleri →
            </Text>
          </Pressable>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row", alignItems: "center", paddingHorizontal: 20,
    paddingBottom: 14, borderBottomWidth: 1, gap: 12,
  },
  headerBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  headerCenter: { flex: 1 },
  headerTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  headerSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 1 },
  progressWrap: { paddingVertical: 14, paddingHorizontal: 24, borderBottomWidth: 1 },
  progressBar: { flexDirection: "row", alignItems: "center" },
  progressDot: {
    width: 28, height: 28, borderRadius: 14,
    alignItems: "center", justifyContent: "center",
  },
  progressDotText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  progressLine: { flex: 1, height: 2 },
  form: { padding: 20 },
  stepContent: { gap: 14 },
  stepTitle: { fontSize: 20, fontFamily: "Inter_700Bold" },
  stepSub: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20, marginTop: -6 },
  brandGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  brandCard: {
    width: "47%", borderRadius: 16, padding: 16, alignItems: "center", gap: 8,
    position: "relative", minHeight: 130,
  },
  brandIconWrap: { width: 56, height: 56, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  brandName: { fontSize: 14, fontFamily: "Inter_600SemiBold", textAlign: "center" },
  brandCode: { fontSize: 11, fontFamily: "Inter_400Regular" },
  brandCheck: {
    position: "absolute", top: 10, right: 10,
    width: 22, height: 22, borderRadius: 11,
    alignItems: "center", justifyContent: "center",
  },
  mandatoryBadge: {
    flexDirection: "row", alignItems: "center", gap: 7,
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 10, borderWidth: 1, alignSelf: "flex-start",
  },
  mandatoryText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  photoPreviewWrap: { width: "100%", height: 200, borderRadius: 16, overflow: "hidden", position: "relative" },
  photoPreview: { width: "100%", height: "100%" },
  photoPreviewOverlay: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, paddingVertical: 10,
  },
  photoPreviewOverlayText: { color: "#fff", fontSize: 14, fontFamily: "Inter_600SemiBold" },
  photoPreviewBadge: {
    position: "absolute", top: 10, right: 10,
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8,
  },
  photoPreviewBadgeText: { color: "#fff", fontSize: 11, fontFamily: "Inter_600SemiBold" },
  photoEmpty: {
    height: 180, borderRadius: 16, borderWidth: 2, borderStyle: "dashed",
    alignItems: "center", justifyContent: "center", gap: 10, padding: 20,
  },
  photoEmptyIcon: { width: 64, height: 64, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  photoEmptyTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold", textAlign: "center" },
  photoEmptyHint: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center" },
  vinInputWrap: {
    flexDirection: "row", alignItems: "center",
    borderRadius: 14, borderWidth: 2, paddingHorizontal: 16, height: 56, gap: 10,
  },
  vinPrefix: { fontSize: 14, fontFamily: "Inter_400Regular", letterSpacing: 2 },
  vinInput: { flex: 1, fontSize: 22, fontFamily: "Inter_700Bold", letterSpacing: 4, height: 56 },
  vinHint: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: -6 },
  divider: { height: 1, backgroundColor: "transparent", marginVertical: 4 },
  fieldLabel: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  fieldSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: -10 },
  infoBanner: { borderRadius: 12, borderWidth: 1, padding: 12, gap: 6 },
  infoBannerRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  infoBannerLabel: { fontSize: 12, fontFamily: "Inter_500Medium", width: 60 },
  infoBannerValue: { fontSize: 13, fontFamily: "Inter_600SemiBold", flex: 1 },
  sectionLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 1, marginTop: 4, marginBottom: -4 },
  glassList: { gap: 7 },
  glassItem: {
    flexDirection: "row", alignItems: "center", padding: 12,
    borderRadius: 12, borderWidth: 1, gap: 10,
  },
  checkbox: {
    width: 22, height: 22, borderRadius: 6, borderWidth: 2,
    alignItems: "center", justifyContent: "center",
  },
  glassItemText: { flex: 1, gap: 2 },
  glassName: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  glassCode: { fontSize: 11, fontFamily: "Inter_400Regular" },
  stockBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1 },
  stockBadgeText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  staffPicker: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  staffChip: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 12, paddingVertical: 9, borderRadius: 10, borderWidth: 1,
  },
  staffChipText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  textarea: {
    borderRadius: 12, borderWidth: 1, padding: 14,
    fontSize: 14, fontFamily: "Inter_400Regular", minHeight: 80, textAlignVertical: "top",
  },
  submitBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    height: 54, borderRadius: 14, gap: 10, marginTop: 10,
  },
  submitText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  footer: { paddingHorizontal: 20, paddingTop: 12, borderTopWidth: 1 },
  nextBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    height: 52, borderRadius: 14,
  },
  nextBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
});
