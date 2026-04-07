import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { StatusBadge, STATUS_LABELS } from "@/components/StatusBadge";
import {
  AssemblyStatus,
  CUSTOMER_NAME,
  DefectRecord,
  PhotoRecord,
  VEHICLE_MODEL,
  useApp,
} from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

const STATUS_FLOW: AssemblyStatus[] = [
  "cutting",
  "installation",
  "installation_done",
  "water_test",
  "completed",
];

const PHOTO_TYPE_LABELS: Record<string, string> = {
  vin: "Şase",
  before: "Önce",
  after: "Sonra",
  defect: "Kusur",
  other: "Diğer",
};
const PHOTO_TYPE_COLORS: Record<string, string> = {
  vin: "#6366f1",
  before: "#0a84ff",
  after: "#10b981",
  defect: "#ef4444",
  other: "#8b5cf6",
};
const SEVERITY_COLORS: Record<string, string> = { low: "#f59e0b", medium: "#f97316", high: "#ef4444" };
const SEVERITY_LABELS: Record<string, string> = { low: "Düşük", medium: "Orta", high: "Yüksek" };

function getNextStatus(current: AssemblyStatus): AssemblyStatus | null {
  const idx = STATUS_FLOW.indexOf(current);
  if (idx === -1 || idx >= STATUS_FLOW.length - 1) return null;
  return STATUS_FLOW[idx + 1];
}

export default function AssemblyDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getAssembly, updateAssembly, addPhoto, addDefect, updateDefect, deleteAssembly, role, getGlassProduct } = useApp();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const assembly = getAssembly(id);

  const [defectText, setDefectText] = useState("");
  const [defectSeverity, setDefectSeverity] = useState<"low" | "medium" | "high">("low");
  const [showDefectForm, setShowDefectForm] = useState(false);
  const [photoType, setPhotoType] = useState<"before" | "after" | "defect" | "other">("before");
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoRecord | null>(null);

  if (!assembly) {
    return (
      <View style={[styles.notFound, { backgroundColor: colors.background }]}>
        <Feather name="alert-circle" size={40} color={colors.mutedForeground} />
        <Text style={[styles.notFoundText, { color: colors.mutedForeground }]}>Kayıt bulunamadı</Text>
        <Pressable onPress={() => router.back()}>
          <Text style={[styles.backLink, { color: colors.primary }]}>Geri Dön</Text>
        </Pressable>
      </View>
    );
  }

  const canEdit = role === "field" || role === "admin";
  const isAdmin = role === "admin";
  const currentStatusIdx = STATUS_FLOW.indexOf(assembly.status === "water_test_failed" ? "water_test" : assembly.status);
  const glassProduct = getGlassProduct(assembly.glassProductId);
  const openDefectCount = assembly.defects.filter((d) => !d.resolved).length;

  // Determine if user can advance status
  const canAdvance = canEdit && assembly.status !== "completed" && assembly.status !== "water_test_failed";

  const handleAdvanceStatus = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // If moving to water_test result phase
    if (assembly.status === "water_test") {
      Alert.alert(
        "Su Testi Sonucu",
        "Araç su testinden geçti mi?",
        [
          {
            text: "Testten Kaldı",
            style: "destructive",
            onPress: async () => {
              updateAssembly(assembly.id, { status: "water_test_failed", waterTestResult: "failed" });
              await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            },
          },
          {
            text: "Testten Geçti",
            onPress: async () => {
              updateAssembly(assembly.id, { status: "completed", waterTestResult: "passed", completedAt: new Date().toISOString() });
              await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            },
          },
        ]
      );
      return;
    }

    // If water test failed, only admin can override
    if (assembly.status === "water_test_failed") {
      if (!isAdmin) {
        Alert.alert("Yetkisiz İşlem", "Su testinden kalan kayıt sadece yönetici tarafından ilerletilebilir.");
        return;
      }
      Alert.alert(
        "Su Testi Geçersiz Kıl",
        "Admin olarak su test sonucunu geçersiz kılarak tamamlandı olarak işaretlemek istediğinizden emin misiniz?",
        [
          { text: "İptal", style: "cancel" },
          {
            text: "Tamamlandı Yap",
            onPress: () => {
              updateAssembly(assembly.id, { status: "completed", waterTestResult: "passed", completedAt: new Date().toISOString() });
            },
          },
        ]
      );
      return;
    }

    const next = getNextStatus(assembly.status);
    if (!next) return;

    // Confirm moving to water test
    if (next === "water_test") {
      Alert.alert(
        "Su Testine Gönder",
        "Araç su testine gönderilecek. Devam edilsin mi?",
        [
          { text: "İptal", style: "cancel" },
          {
            text: "Evet, Gönder",
            onPress: async () => {
              updateAssembly(assembly.id, { status: "water_test" });
              await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            },
          },
        ]
      );
      return;
    }

    updateAssembly(assembly.id, { status: next });
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleDelete = () => {
    Alert.alert(
      "Kaydı Sil",
      `${assembly.vin.slice(-8)} numaralı kaydı silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.`,
      [
        { text: "İptal", style: "cancel" },
        {
          text: "Sil",
          style: "destructive",
          onPress: async () => {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            deleteAssembly(assembly.id);
            router.replace("/(tabs)" as any);
          },
        },
      ]
    );
  };

  const handlePickPhoto = async (source: "camera" | "gallery") => {
    let result: ImagePicker.ImagePickerResult;
    if (source === "camera") {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) { Alert.alert("İzin Gerekli", "Kamera için izin gereklidir."); return; }
      result = await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.7, allowsEditing: true, aspect: [4, 3] });
    } else {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) { Alert.alert("İzin Gerekli", "Galeri için izin gereklidir."); return; }
      result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.7, allowsEditing: true, aspect: [4, 3] });
    }
    if (!result.canceled && result.assets.length > 0) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      addPhoto(assembly.id, { uri: result.assets[0].uri, type: photoType });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const handleAddPhotoPress = () => {
    if (Platform.OS === "web") { handlePickPhoto("gallery"); return; }
    Alert.alert("Fotoğraf Ekle", `Tür: ${PHOTO_TYPE_LABELS[photoType]}`, [
      { text: "Kamera", onPress: () => handlePickPhoto("camera") },
      { text: "Galeri", onPress: () => handlePickPhoto("gallery") },
      { text: "İptal", style: "cancel" },
    ]);
  };

  const handleAddDefect = async () => {
    if (!defectText.trim()) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    addDefect(assembly.id, { description: defectText.trim(), severity: defectSeverity, resolved: false });
    setDefectText("");
    setDefectSeverity("low");
    setShowDefectForm(false);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleToggleDefect = async (defect: DefectRecord) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    updateDefect(assembly.id, defect.id, { resolved: !defect.resolved });
  };

  const nextStatus = assembly.status !== "water_test_failed" ? getNextStatus(assembly.status) : null;
  const showWaterTestBlock = assembly.status === "water_test" || assembly.status === "water_test_failed";

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          { paddingTop: topPad + 8, backgroundColor: colors.card, borderBottomColor: colors.border },
        ]}
      >
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerModel, { color: colors.foreground }]}>
            {glassProduct?.name ?? "Cam Montaj"}
          </Text>
          <Text style={[styles.headerVin, { color: colors.mutedForeground }]}>{assembly.vin}</Text>
        </View>
        {canEdit && (
          <Pressable onPress={handleDelete} style={styles.deleteBtn}>
            <Feather name="trash-2" size={20} color={colors.destructive} />
          </Pressable>
        )}
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: bottomPad + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Status + Advance */}
        <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.statusRow}>
            <StatusBadge status={assembly.status} />
          </View>

          {/* Progress */}
          <View style={styles.progressContainer}>
            {STATUS_FLOW.map((s, i) => {
              const active = i <= currentStatusIdx;
              return (
                <React.Fragment key={s}>
                  <View style={styles.progressStep}>
                    <View
                      style={[
                        styles.progressCircle,
                        { backgroundColor: active ? colors.primary : colors.border, borderColor: active ? colors.primary : colors.border },
                      ]}
                    >
                      {active && <Feather name="check" size={10} color="#fff" />}
                    </View>
                    <Text
                      style={[
                        styles.progressLabel,
                        { color: active ? colors.primary : colors.mutedForeground },
                      ]}
                      numberOfLines={2}
                    >
                      {STATUS_LABELS[s]}
                    </Text>
                  </View>
                  {i < STATUS_FLOW.length - 1 && (
                    <View style={[styles.progressLine, { backgroundColor: active && i < currentStatusIdx ? colors.primary : colors.border }]} />
                  )}
                </React.Fragment>
              );
            })}
          </View>

          {/* Water test failed notice */}
          {assembly.status === "water_test_failed" && (
            <View style={[styles.failedBox, { backgroundColor: colors.destructive + "12", borderColor: colors.destructive + "30" }]}>
              <Feather name="alert-triangle" size={16} color={colors.destructive} />
              <Text style={[styles.failedText, { color: colors.destructive }]}>
                Su testinden kaldı. {isAdmin ? "Admin olarak ilerletebilirsiniz." : "Sadece yönetici ilerletebilir."}
              </Text>
            </View>
          )}

          {assembly.waterTestResult === "passed" && assembly.status === "completed" && (
            <View style={[styles.passedBox, { backgroundColor: colors.success + "12", borderColor: colors.success + "30" }]}>
              <Feather name="check-circle" size={16} color={colors.success} />
              <Text style={[styles.passedText, { color: colors.success }]}>Su testinden başarıyla geçti.</Text>
            </View>
          )}

          {/* Advance button */}
          {canEdit && assembly.status !== "completed" && (
            <Pressable
              onPress={handleAdvanceStatus}
              style={({ pressed }) => [
                styles.advanceBtn,
                {
                  backgroundColor:
                    assembly.status === "water_test_failed"
                      ? isAdmin ? colors.primary : colors.muted
                      : colors.primary,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <Feather
                name={assembly.status === "water_test" ? "help-circle" : "arrow-right"}
                size={18}
                color="#fff"
              />
              <Text style={styles.advanceBtnText}>
                {assembly.status === "water_test"
                  ? "Su Testi Sonucunu Gir"
                  : assembly.status === "water_test_failed"
                  ? isAdmin ? "Tamamlandı Yap (Admin)" : "Yönetici Gerekli"
                  : `${STATUS_LABELS[getNextStatus(assembly.status) ?? "completed"]} →`}
              </Text>
            </Pressable>
          )}
        </View>

        {/* Glass + Info */}
        <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Kayıt Bilgileri</Text>
          <InfoRow label="Müşteri" value={CUSTOMER_NAME} colors={colors} />
          <InfoRow label="Araç" value={VEHICLE_MODEL} colors={colors} />
          <InfoRow label="Şase No" value={assembly.vin} colors={colors} mono />
          {glassProduct && (
            <>
              <InfoRow label="Cam" value={glassProduct.name} colors={colors} />
              <InfoRow label="Ürün Kodu" value={glassProduct.code} colors={colors} mono />
            </>
          )}
          <InfoRow label="Personel" value={assembly.assignedTo} colors={colors} />
          <InfoRow label="Oluşturuldu" value={new Date(assembly.createdAt).toLocaleString("tr-TR")} colors={colors} />
          {assembly.completedAt && (
            <InfoRow label="Tamamlandı" value={new Date(assembly.completedAt).toLocaleString("tr-TR")} colors={colors} />
          )}
          {assembly.notes.length > 0 && (
            <>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <Text style={[styles.notesText, { color: colors.foreground }]}>{assembly.notes}</Text>
            </>
          )}
        </View>

        {/* VIN Photo (if exists) */}
        {assembly.vinPhotoUri && (
          <Pressable
            style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border, padding: 0, overflow: "hidden" }]}
            onPress={() => setSelectedPhoto({ id: "vin", uri: assembly.vinPhotoUri!, type: "vin", timestamp: assembly.createdAt })}
          >
            <View style={styles.vinPhotoHeader}>
              <Feather name="shield" size={14} color={colors.mutedForeground} />
              <Text style={[styles.vinPhotoHeaderText, { color: colors.mutedForeground }]}>
                Şase Plaka Fotoğrafı
              </Text>
            </View>
            <Image source={{ uri: assembly.vinPhotoUri }} style={styles.vinPhotoPreview} resizeMode="cover" />
          </Pressable>
        )}

        {/* Photos */}
        <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.sectionTitleRow}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              Fotoğraflar{assembly.photos.length > 0 ? ` (${assembly.photos.length})` : ""}
            </Text>
          </View>

          {canEdit && (
            <>
              <View style={styles.photoTypeRow}>
                {(["before", "after", "defect", "other"] as const).map((t) => (
                  <Pressable
                    key={t}
                    onPress={() => setPhotoType(t)}
                    style={[
                      styles.photoTypeChip,
                      {
                        backgroundColor: photoType === t ? PHOTO_TYPE_COLORS[t] + "20" : colors.muted,
                        borderColor: photoType === t ? PHOTO_TYPE_COLORS[t] : colors.border,
                      },
                    ]}
                  >
                    <Text style={[styles.photoTypeText, { color: photoType === t ? PHOTO_TYPE_COLORS[t] : colors.mutedForeground }]}>
                      {PHOTO_TYPE_LABELS[t]}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <View style={styles.photoActions}>
                <Pressable
                  onPress={() => handlePickPhoto("camera")}
                  style={[styles.photoBtn, { backgroundColor: colors.primary, flex: 1 }]}
                >
                  <Feather name="camera" size={16} color="#fff" />
                  <Text style={styles.photoBtnText}>Kamera</Text>
                </Pressable>
                <Pressable
                  onPress={() => handlePickPhoto("gallery")}
                  style={[styles.photoBtn, { backgroundColor: colors.muted, borderColor: colors.border, borderWidth: 1, flex: 1 }]}
                >
                  <Feather name="image" size={16} color={colors.foreground} />
                  <Text style={[styles.photoBtnText, { color: colors.foreground }]}>Galeri</Text>
                </Pressable>
              </View>
            </>
          )}

          {assembly.photos.length === 0 ? (
            <View style={styles.emptyPhotos}>
              <Feather name="camera" size={28} color={colors.mutedForeground} />
              <Text style={[styles.emptyPhotosText, { color: colors.mutedForeground }]}>
                Henüz fotoğraf eklenmemiş
              </Text>
            </View>
          ) : (
            <View style={styles.photoGrid}>
              {assembly.photos.map((photo) => (
                <Pressable key={photo.id} style={styles.photoThumb} onPress={() => setSelectedPhoto(photo)}>
                  <Image source={{ uri: photo.uri }} style={styles.photoImg} />
                  <View style={[styles.photoTypePill, { backgroundColor: PHOTO_TYPE_COLORS[photo.type] }]}>
                    <Text style={styles.photoTypePillText}>{PHOTO_TYPE_LABELS[photo.type]}</Text>
                  </View>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        {/* Defects */}
        <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.sectionTitleRow}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              Kusurlar{assembly.defects.length > 0 ? ` (${openDefectCount} açık)` : ""}
            </Text>
            {canEdit && (
              <Pressable
                onPress={() => setShowDefectForm(!showDefectForm)}
                style={[styles.addDefectBtn, { backgroundColor: colors.destructive + "15" }]}
              >
                <Feather name="plus" size={14} color={colors.destructive} />
                <Text style={[styles.addDefectText, { color: colors.destructive }]}>Ekle</Text>
              </Pressable>
            )}
          </View>

          {showDefectForm && (
            <View style={[styles.defectForm, { backgroundColor: colors.muted, borderColor: colors.border }]}>
              <TextInput
                value={defectText}
                onChangeText={setDefectText}
                placeholder="Kusur açıklaması..."
                placeholderTextColor={colors.mutedForeground}
                style={[styles.defectInput, { color: colors.foreground }]}
                multiline
              />
              <View style={styles.severityRow}>
                {(["low", "medium", "high"] as const).map((s) => (
                  <Pressable
                    key={s}
                    onPress={() => setDefectSeverity(s)}
                    style={[
                      styles.severityChip,
                      {
                        backgroundColor: defectSeverity === s ? SEVERITY_COLORS[s] + "25" : "transparent",
                        borderColor: defectSeverity === s ? SEVERITY_COLORS[s] : colors.border,
                      },
                    ]}
                  >
                    <Text style={[styles.severityText, { color: defectSeverity === s ? SEVERITY_COLORS[s] : colors.mutedForeground }]}>
                      {SEVERITY_LABELS[s]}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <Pressable onPress={handleAddDefect} style={[styles.defectSubmit, { backgroundColor: colors.destructive }]}>
                <Text style={styles.defectSubmitText}>Kaydet</Text>
              </Pressable>
            </View>
          )}

          {assembly.defects.length === 0 ? (
            <Text style={[styles.emptyDefects, { color: colors.mutedForeground }]}>Kayıtlı kusur yok</Text>
          ) : (
            <View style={styles.defectList}>
              {assembly.defects.map((d) => (
                <Pressable
                  key={d.id}
                  onPress={() => canEdit && handleToggleDefect(d)}
                  style={[
                    styles.defectItem,
                    {
                      backgroundColor: d.resolved ? colors.success + "10" : colors.destructive + "08",
                      borderColor: d.resolved ? colors.success + "30" : colors.destructive + "20",
                    },
                  ]}
                >
                  <Feather name={d.resolved ? "check-circle" : "alert-circle"} size={16} color={d.resolved ? colors.success : SEVERITY_COLORS[d.severity]} />
                  <View style={styles.defectInfo}>
                    <Text style={[styles.defectDesc, { color: d.resolved ? colors.mutedForeground : colors.foreground, textDecorationLine: d.resolved ? "line-through" : "none" }]}>
                      {d.description}
                    </Text>
                    <Text style={[styles.defectMeta, { color: colors.mutedForeground }]}>
                      {SEVERITY_LABELS[d.severity]} · {new Date(d.timestamp).toLocaleString("tr-TR")}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Full-screen photo viewer */}
      {selectedPhoto && (
        <Pressable style={styles.photoViewer} onPress={() => setSelectedPhoto(null)}>
          <Image source={{ uri: selectedPhoto.uri }} style={styles.photoViewerImg} resizeMode="contain" />
          <View style={styles.photoViewerMeta}>
            <View style={[styles.photoViewerPill, { backgroundColor: PHOTO_TYPE_COLORS[selectedPhoto.type] }]}>
              <Text style={styles.photoTypePillText}>{PHOTO_TYPE_LABELS[selectedPhoto.type]}</Text>
            </View>
            <Text style={styles.photoViewerTime}>{new Date(selectedPhoto.timestamp).toLocaleString("tr-TR")}</Text>
          </View>
          <Pressable style={styles.photoViewerClose} onPress={() => setSelectedPhoto(null)}>
            <Feather name="x" size={22} color="#fff" />
          </Pressable>
        </Pressable>
      )}
    </View>
  );
}

function InfoRow({ label, value, colors, mono }: { label: string; value: string; colors: any; mono?: boolean }) {
  return (
    <View style={styles.infoRow}>
      <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <Text style={[styles.infoValue, { color: colors.foreground, fontFamily: mono ? "Inter_500Medium" : "Inter_400Regular", letterSpacing: mono ? 0.5 : 0 }]} selectable>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  notFound: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16 },
  notFoundText: { fontSize: 15, fontFamily: "Inter_500Medium" },
  backLink: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingBottom: 14, borderBottomWidth: 1, gap: 12 },
  backBtn: { padding: 2 },
  deleteBtn: { padding: 6, borderRadius: 8 },
  headerCenter: { flex: 1 },
  headerModel: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  headerVin: { fontSize: 12, fontFamily: "Inter_400Regular", letterSpacing: 0.5 },
  content: { padding: 16, gap: 12 },
  sectionCard: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 10 },
  sectionTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  sectionTitleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  statusRow: { flexDirection: "row", alignItems: "center" },
  progressContainer: { flexDirection: "row", alignItems: "flex-start" },
  progressStep: { alignItems: "center", gap: 4, width: 52 },
  progressCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  progressLabel: { fontSize: 9, fontFamily: "Inter_500Medium", textAlign: "center" },
  progressLine: { height: 2, flex: 1, marginTop: 10 },
  failedBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  failedText: { fontSize: 13, fontFamily: "Inter_500Medium", flex: 1 },
  passedBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  passedText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  advanceBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 13,
    borderRadius: 12,
  },
  advanceBtnText: { color: "#fff", fontSize: 14, fontFamily: "Inter_600SemiBold" },
  infoRow: { flexDirection: "row", justifyContent: "space-between", gap: 16 },
  infoLabel: { fontSize: 13, fontFamily: "Inter_500Medium", width: 90 },
  infoValue: { fontSize: 13, flex: 1, textAlign: "right" },
  divider: { height: 1, marginVertical: 2 },
  notesText: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 22 },
  vinPhotoHeader: { flexDirection: "row", alignItems: "center", gap: 6, padding: 14, paddingBottom: 8 },
  vinPhotoHeaderText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  vinPhotoPreview: { width: "100%", height: 160 },
  photoTypeRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  photoTypeChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, borderWidth: 1 },
  photoTypeText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  photoActions: { flexDirection: "row", gap: 10 },
  photoBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 11, borderRadius: 12 },
  photoBtnText: { color: "#fff", fontSize: 14, fontFamily: "Inter_600SemiBold" },
  emptyPhotos: { alignItems: "center", paddingVertical: 20, gap: 8 },
  emptyPhotosText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  photoGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  photoThumb: { width: 96, height: 96, borderRadius: 10, overflow: "hidden" },
  photoImg: { width: "100%", height: "100%" },
  photoTypePill: { position: "absolute", bottom: 4, left: 4, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  photoTypePillText: { color: "#fff", fontSize: 10, fontFamily: "Inter_600SemiBold" },
  addDefectBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  addDefectText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  defectForm: { borderRadius: 12, borderWidth: 1, padding: 12, gap: 10 },
  defectInput: { fontSize: 14, fontFamily: "Inter_400Regular", minHeight: 60, textAlignVertical: "top" },
  severityRow: { flexDirection: "row", gap: 8 },
  severityChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  severityText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  defectSubmit: { paddingVertical: 10, borderRadius: 10, alignItems: "center" },
  defectSubmitText: { color: "#fff", fontSize: 14, fontFamily: "Inter_600SemiBold" },
  emptyDefects: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", paddingVertical: 8 },
  defectList: { gap: 8 },
  defectItem: { flexDirection: "row", alignItems: "flex-start", gap: 10, padding: 12, borderRadius: 10, borderWidth: 1 },
  defectInfo: { flex: 1, gap: 3 },
  defectDesc: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20 },
  defectMeta: { fontSize: 11, fontFamily: "Inter_400Regular" },
  photoViewer: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.92)", alignItems: "center", justifyContent: "center" },
  photoViewerImg: { width: "100%", height: "80%" },
  photoViewerMeta: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 16 },
  photoViewerPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  photoViewerTime: { color: "#fff", fontSize: 13, fontFamily: "Inter_400Regular" },
  photoViewerClose: { position: "absolute", top: 48, right: 20, width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center" },
});
