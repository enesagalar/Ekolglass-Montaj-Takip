import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
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
  PhotoType,
  getBrandGlassCode,
  getBrandName,
  useApp,
} from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

const STATUS_FLOW: AssemblyStatus[] = [
  "pending",
  "cutting",
  "cutting_done",
  "installation",
  "installation_done",
  "water_test",
  "completed",
];

const STATUS_TIMELINE_LABELS: Partial<Record<AssemblyStatus, string>> = {
  pending: "Kayıt Oluşturuldu",
  cutting: "Kesime Başlandı",
  cutting_done: "Kesim Tamamlandı",
  installation: "Montaja Başlandı",
  installation_done: "Montaj Tamamlandı",
  water_test: "Su Testine Gönderildi",
  water_test_failed: "Su Testinden Kaldı",
  completed: "İşlem Tamamlandı",
};

const PHOTO_TYPE_LABELS: Record<string, string> = {
  approval_doc: "Onay Belgesi",
  vin: "Şase",
  cutting_before: "Kesim Öncesi",
  cutting_after: "Kesim Sonrası",
  installation_before: "Montaj Öncesi",
  installation_after: "Montaj Sonrası",
  water_test: "Su Testi",
  defect: "Kusur",
  other: "Diğer",
};

const PHOTO_TYPE_COLORS: Record<string, string> = {
  approval_doc: "#6366f1",
  vin: "#6366f1",
  cutting_before: "#0a84ff",
  cutting_after: "#2563eb",
  installation_before: "#10b981",
  installation_after: "#059669",
  water_test: "#0891b2",
  defect: "#ef4444",
  other: "#8b5cf6",
};

const SEVERITY_COLORS: Record<string, string> = { low: "#f59e0b", medium: "#f97316", high: "#ef4444" };
const SEVERITY_LABELS: Record<string, string> = { low: "Düşük", medium: "Orta", high: "Yüksek" };

const CAPTURE_ANGLES = ["Ön", "Sağ", "Sol", "Arka"];

type CaptureStep = {
  label: string;
  hint: string;
  photoType: PhotoType;
  angle?: string;
  uri?: string;
};

type CaptureFlow = {
  steps: CaptureStep[];
  currentIdx: number;
  pendingStatus: AssemblyStatus;
  extraUpdates?: Partial<{ installationCompletedAt: string; waterTestCustomerApproval: "pending" }>;
} | null;

function getNextStatus(current: AssemblyStatus): AssemblyStatus | null {
  const idx = STATUS_FLOW.indexOf(current);
  if (idx === -1 || idx >= STATUS_FLOW.length - 1) return null;
  return STATUS_FLOW[idx + 1];
}

function formatTs(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
}

function formatDate(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("tr-TR", { day: "numeric", month: "short" });
}

function formatCountdown(targetMs: number): string {
  const remaining = targetMs - Date.now();
  if (remaining <= 0) return "Hazır";
  const h = Math.floor(remaining / 3600000);
  const m = Math.floor((remaining % 3600000) / 60000);
  if (h > 0) return `${h}s ${m}dk`;
  return `${m}dk`;
}

export default function AssemblyDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getAssembly, updateAssembly, addPhoto, addDefect, updateDefect, deleteAssembly, role, currentUser, getGlassProduct } = useApp();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;
  const isAdmin = role === "admin";
  const isCustomer = role === "customer";
  const canEdit = role === "field" || role === "admin";

  const assembly = getAssembly(id);

  const [defectText, setDefectText] = useState("");
  const [defectSeverity, setDefectSeverity] = useState<"low" | "medium" | "high">("low");
  const [showDefectForm, setShowDefectForm] = useState(false);
  const [photoType, setPhotoType] = useState<PhotoType>("other");
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoRecord | null>(null);
  const [captureFlow, setCaptureFlow] = useState<CaptureFlow>(null);
  const [countdown, setCountdown] = useState<string>("");

  // 4-hour countdown
  useEffect(() => {
    if (!assembly?.installationCompletedAt) return;
    const targetMs = new Date(assembly.installationCompletedAt).getTime() + 4 * 3600000;
    const update = () => setCountdown(formatCountdown(targetMs));
    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, [assembly?.installationCompletedAt]);

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

  const currentStatusIdx = STATUS_FLOW.indexOf(
    assembly.status === "water_test_failed" ? "water_test" : assembly.status
  );
  // map water_test_failed to same visual index as water_test for progress bar
  const glassProducts = (assembly.glassProductIds ?? []).map((gid) => getGlassProduct(gid)).filter(Boolean);
  const openDefectCount = assembly.defects.filter((d) => !d.resolved).length;
  const brandName = getBrandName(assembly.vehicleModel ?? "fiat-ducato");

  // Photo capture helpers
  const launchCamera = async (): Promise<string | null> => {
    if (Platform.OS === "web") {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) { Alert.alert("İzin Gerekli", "Galeri için izin gereklidir."); return null; }
      const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.85 });
      if (!r.canceled) return r.assets[0].uri;
      return null;
    }
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) { Alert.alert("İzin Gerekli", "Kamera için izin gereklidir."); return null; }
    const r = await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.85, allowsEditing: false });
    if (!r.canceled) return r.assets[0].uri;
    return null;
  };

  const launchGallery = async (): Promise<string | null> => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert("İzin Gerekli", "Galeri için izin gereklidir."); return null; }
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.85 });
    if (!r.canceled) return r.assets[0].uri;
    return null;
  };

  const handleCapturePhoto = async (useGallery: boolean) => {
    if (!captureFlow) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const uri = useGallery ? await launchGallery() : await launchCamera();
    if (!uri) return;

    const updatedSteps = captureFlow.steps.map((s, i) =>
      i === captureFlow.currentIdx ? { ...s, uri } : s
    );
    setCaptureFlow({ ...captureFlow, steps: updatedSteps });
  };

  const handleCaptureAdvance = async () => {
    if (!captureFlow) return;
    const currentUri = captureFlow.steps[captureFlow.currentIdx]?.uri;
    if (!currentUri) return;

    const nextIdx = captureFlow.currentIdx + 1;

    if (nextIdx >= captureFlow.steps.length) {
      const now = new Date().toISOString();
      const newPhotos: PhotoRecord[] = captureFlow.steps
        .filter((s) => s.uri)
        .map((s) => ({
          id: `photo-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          uri: s.uri!,
          type: s.photoType,
          timestamp: now,
          angle: s.angle,
        }));
      const updatedPhotoList = [...assembly.photos, ...newPhotos];
      const extraUpdates = captureFlow.extraUpdates ?? {};
      updateAssembly(
        assembly.id,
        { status: captureFlow.pendingStatus, photos: updatedPhotoList, ...extraUpdates },
        `Statü değiştirildi: ${STATUS_LABELS[captureFlow.pendingStatus]}`
      );
      setCaptureFlow(null);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      setCaptureFlow({ ...captureFlow, currentIdx: nextIdx });
    }
  };

  type CaptureFlowExtra = Partial<{ installationCompletedAt: string; waterTestCustomerApproval: "pending" }>;

  const startCaptureFlow = (
    stage: "before" | "after",
    pendingStatus: AssemblyStatus,
    extraUpdates?: CaptureFlowExtra
  ) => {
    const steps: CaptureStep[] = stage === "before"
      ? CAPTURE_ANGLES.map((angle) => ({
          label: `Montaj Öncesi · ${angle}`,
          hint: `Montaja başlamadan önce ${angle.toLowerCase()} taraftan çekin`,
          photoType: "installation_before" as PhotoType,
          angle,
        }))
      : CAPTURE_ANGLES.map((angle) => ({
          label: `Montaj Sonrası · ${angle}`,
          hint: `Montaj bitti — ${angle.toLowerCase()} taraftan çekin`,
          photoType: "installation_after" as PhotoType,
          angle,
        }));
    setCaptureFlow({ steps, currentIdx: 0, pendingStatus, extraUpdates });
  };

  const handleAdvanceStatus = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

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
          { text: "Tamamlandı Yap", onPress: () => updateAssembly(assembly.id, { status: "completed", waterTestResult: "passed", completedAt: new Date().toISOString() }, "Admin olarak tamamlandı yapıldı") },
        ]
      );
      return;
    }

    const next = getNextStatus(assembly.status);
    if (!next) return;

    // pending → cutting: start cutting phase
    if (assembly.status === "pending") {
      updateAssembly(assembly.id, { status: "cutting" }, "Kesime başlandı");
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      return;
    }

    // cutting → cutting_done: cutting finished
    if (assembly.status === "cutting") {
      updateAssembly(assembly.id, { status: "cutting_done" }, "Kesim tamamlandı");
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      return;
    }

    // cutting_done → installation: capture 4 montaj öncesi photos
    if (assembly.status === "cutting_done") {
      startCaptureFlow("before", "installation");
      return;
    }

    // installation → installation_done: capture 4 montaj sonrası photos
    if (assembly.status === "installation") {
      startCaptureFlow("after", "installation_done", {
        installationCompletedAt: new Date().toISOString(),
      });
      return;
    }

    // installation_done → water_test: confirm then send
    if (assembly.status === "installation_done") {
      Alert.alert(
        "Su Testine Gönder",
        "Araç su testine gönderilecek. ISRI onayı bekleniyor olarak işaretlenecek.",
        [
          { text: "İptal", style: "cancel" },
          {
            text: "Gönder",
            onPress: async () => {
              updateAssembly(
                assembly.id,
                {
                  status: "water_test",
                  waterTestCustomerApproval: "pending",
                  installationCompletedAt: assembly.installationCompletedAt ?? new Date().toISOString(),
                },
                "Su testine gönderildi"
              );
              await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            },
          },
        ]
      );
      return;
    }

    updateAssembly(assembly.id, { status: next }, `Statü değiştirildi: ${STATUS_LABELS[next]}`);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleCustomerApproval = async (approved: boolean) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const now = new Date().toISOString();
    if (approved) {
      Alert.alert("Su Testi Onayı", "Araç su testinden geçti olarak onaylıyor musunuz?", [
        { text: "İptal", style: "cancel" },
        {
          text: "Onayla",
          onPress: async () => {
            updateAssembly(assembly.id, {
              waterTestCustomerApproval: "approved",
              status: "completed",
              waterTestResult: "passed",
              completedAt: now,
            }, "ISRI tarafından su testi onaylandı");
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ]);
    } else {
      Alert.alert("Su Testi Reddi", "Araç su testinden kaldı olarak işaretlenecek.", [
        { text: "İptal", style: "cancel" },
        {
          text: "Reddet",
          style: "destructive",
          onPress: async () => {
            updateAssembly(assembly.id, {
              waterTestCustomerApproval: "rejected",
              status: "water_test_failed",
              waterTestResult: "failed",
            }, "ISRI tarafından su testi reddedildi");
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          },
        },
      ]);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      "Kaydı Sil",
      `···${assembly.vinLast5 ?? assembly.vin.slice(-5)} numaralı kaydı silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.`,
      [
        { text: "İptal", style: "cancel" },
        {
          text: "Sil",
          style: "destructive",
          onPress: async () => {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            deleteAssembly(assembly.id);
            router.replace("/(tabs)");
          },
        },
      ]
    );
  };

  const handlePickPhoto = async (source: "camera" | "gallery") => {
    const uri = source === "camera" ? await launchCamera() : await launchGallery();
    if (uri) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      addPhoto(assembly.id, { uri, type: photoType });
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

  // Timeline: all statuses that have timestamps
  const timelineStatuses: AssemblyStatus[] = [
    "pending", "cutting", "cutting_done", "installation", "installation_done", "water_test", "water_test_failed", "completed"
  ];
  const timestampEntries = timelineStatuses
    .filter((s) => assembly.statusTimestamps?.[s])
    .map((s) => ({
      status: s,
      label: STATUS_TIMELINE_LABELS[s] ?? s,
      timestamp: assembly.statusTimestamps![s]!,
    }));

  const showWaterTestBlock = assembly.status === "water_test";
  const showInstallationCountdown = !!assembly.installationCompletedAt && !isCustomer;
  const targetWaterTestMs = assembly.installationCompletedAt
    ? new Date(assembly.installationCompletedAt).getTime() + 4 * 3600000
    : 0;
  const waterTestReady = targetWaterTestMs > 0 && Date.now() >= targetWaterTestMs;

  const isAdminWaterTestOverride = isAdmin && assembly.status === "water_test";

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Header */}
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
          <Text style={[styles.headerModel, { color: colors.foreground }]} numberOfLines={1}>
            {brandName} · ···{assembly.vinLast5 ?? assembly.vin?.slice(-5)}
          </Text>
          <Text style={[styles.headerVin, { color: colors.mutedForeground }]}>{CUSTOMER_NAME}</Text>
        </View>
        {isAdmin && (
          <Pressable onPress={handleDelete} style={styles.deleteBtn}>
            <Feather name="trash-2" size={20} color={colors.destructive} />
          </Pressable>
        )}
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: bottomPad + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* --- Status Card --- */}
        <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.statusRow}>
            <StatusBadge status={assembly.status} />
          </View>

          {/* Progress Bar */}
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
                      style={[styles.progressLabel, { color: active ? colors.primary : colors.mutedForeground }]}
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
            <View style={[styles.alertBox, { backgroundColor: colors.destructive + "12", borderColor: colors.destructive + "30" }]}>
              <Feather name="alert-triangle" size={16} color={colors.destructive} />
              <Text style={[styles.alertBoxText, { color: colors.destructive }]}>
                Su testinden kaldı.{isAdmin ? " Admin olarak ilerletebilirsiniz." : " Sadece yönetici ilerletebilir."}
              </Text>
            </View>
          )}

          {assembly.waterTestResult === "passed" && assembly.status === "completed" && (
            <View style={[styles.alertBox, { backgroundColor: colors.success + "12", borderColor: colors.success + "30" }]}>
              <Feather name="check-circle" size={16} color={colors.success} />
              <Text style={[styles.alertBoxText, { color: colors.success }]}>Su testinden başarıyla geçti.</Text>
            </View>
          )}

          {/* --- Water test customer UI --- */}
          {showWaterTestBlock && (
            <>
              {isCustomer ? (
                <View style={[styles.customerApprovalBox, { backgroundColor: colors.primary + "08", borderColor: colors.primary + "30" }]}>
                  {assembly.waterTestCustomerApproval === "pending" ? (
                    <>
                      <Text style={[styles.customerApprovalTitle, { color: colors.foreground }]}>
                        Su Testi Sonucu
                      </Text>
                      {!waterTestReady ? (
                        <>
                          <Text style={[styles.customerApprovalHint, { color: colors.mutedForeground }]}>
                            Araç su test sürecinde. Onay butonu aktif olana kadar bekleniyor.
                          </Text>
                          <View style={[styles.countdownRow, { marginTop: 10 }]}>
                            <Feather name="clock" size={18} color={colors.primary} />
                            <View style={{ flex: 1 }}>
                              <Text style={[styles.countdownTitle, { color: colors.foreground }]}>Su Testi Geri Sayımı</Text>
                              <Text style={[styles.countdownTime, { color: colors.primary }]}>{countdown} kaldı</Text>
                            </View>
                          </View>
                          <View style={[styles.customerApprovalBtns, { marginTop: 10, opacity: 0.35 }]}>
                            <View style={[styles.customerBtn, { backgroundColor: colors.muted, borderColor: colors.border }]}>
                              <Feather name="x-circle" size={18} color={colors.mutedForeground} />
                              <Text style={[styles.customerBtnText, { color: colors.mutedForeground }]}>Testten Kaldı</Text>
                            </View>
                            <View style={[styles.customerBtn, { backgroundColor: colors.muted, borderColor: colors.border }]}>
                              <Feather name="check-circle" size={18} color={colors.mutedForeground} />
                              <Text style={[styles.customerBtnText, { color: colors.mutedForeground }]}>Testten Geçti</Text>
                            </View>
                          </View>
                        </>
                      ) : (
                        <>
                          <Text style={[styles.customerApprovalHint, { color: colors.mutedForeground }]}>
                            Aracın su testi sonucunu değerlendirin.
                          </Text>
                          <View style={styles.customerApprovalBtns}>
                            <Pressable
                              onPress={() => handleCustomerApproval(false)}
                              style={[styles.customerBtn, { backgroundColor: colors.destructive + "15", borderColor: colors.destructive + "50" }]}
                            >
                              <Feather name="x-circle" size={18} color={colors.destructive} />
                              <Text style={[styles.customerBtnText, { color: colors.destructive }]}>Testten Kaldı</Text>
                            </Pressable>
                            <Pressable
                              onPress={() => handleCustomerApproval(true)}
                              style={[styles.customerBtn, { backgroundColor: colors.success + "15", borderColor: colors.success + "50" }]}
                            >
                              <Feather name="check-circle" size={18} color={colors.success} />
                              <Text style={[styles.customerBtnText, { color: colors.success }]}>Testten Geçti</Text>
                            </Pressable>
                          </View>
                        </>
                      )}
                    </>
                  ) : (
                    <View style={styles.approvalDone}>
                      <Feather name="check-circle" size={18} color={colors.success} />
                      <Text style={[styles.approvalDoneText, { color: colors.foreground }]}>Onay verildi</Text>
                    </View>
                  )}
                </View>
              ) : (
                <View style={[styles.alertBox, { backgroundColor: colors.muted, borderColor: colors.border }]}>
                  <Feather name="clock" size={15} color={colors.mutedForeground} />
                  <Text style={[styles.alertBoxText, { color: colors.mutedForeground }]}>
                    ISRI onayı bekleniyor
                  </Text>
                </View>
              )}

              {/* Admin override for water test */}
              {isAdminWaterTestOverride && (
                <Pressable
                  onPress={() => Alert.alert(
                    "Admin Su Testi Geçersiz Kıl",
                    "Su testi sonucunu admin olarak belirleyeceksiniz.",
                    [
                      { text: "İptal", style: "cancel" },
                      { text: "Geçti → Tamamlandı", onPress: () => updateAssembly(assembly.id, { status: "completed", waterTestResult: "passed", waterTestCustomerApproval: "approved", completedAt: new Date().toISOString() }, "Admin tamamlandı yaptı") },
                      { text: "Kaldı → Başarısız", style: "destructive", onPress: () => updateAssembly(assembly.id, { status: "water_test_failed", waterTestResult: "failed", waterTestCustomerApproval: "rejected" }, "Admin başarısız yaptı") },
                    ]
                  )}
                  style={({ pressed }) => [styles.advanceBtn, { backgroundColor: colors.primary + "15", borderWidth: 1, borderColor: colors.primary + "40", opacity: pressed ? 0.85 : 1 }]}
                >
                  <Feather name="shield" size={16} color={colors.primary} />
                  <Text style={[styles.advanceBtnText, { color: colors.primary }]}>Admin Olarak Geçersiz Kıl</Text>
                </Pressable>
              )}
            </>
          )}

          {/* Advance button (field/admin, not water_test, not completed) */}
          {canEdit && assembly.status !== "completed" && assembly.status !== "water_test" && (() => {
            const isFailed = assembly.status === "water_test_failed";
            const isBlocked = isFailed && !isAdmin;
            const btnLabel = isFailed
              ? isAdmin ? "Tamamlandı Yap (Admin)" : "Yönetici Gerekli"
              : assembly.status === "pending" ? "Kesime Başla"
              : assembly.status === "cutting" ? "Kesim Tamamlandı"
              : assembly.status === "cutting_done" ? "Montajı Başlat"
              : assembly.status === "installation" ? "Montajı Tamamla"
              : assembly.status === "installation_done" ? "Su Testine Gönder"
              : STATUS_LABELS[getNextStatus(assembly.status) ?? "completed"];
            const btnIcon: any = isFailed
              ? isAdmin ? "check-circle" : "lock"
              : assembly.status === "pending" ? "scissors"
              : assembly.status === "cutting" ? "check"
              : assembly.status === "cutting_done" ? "play"
              : assembly.status === "installation" ? "check"
              : "arrow-right";
            return (
              <Pressable
                onPress={handleAdvanceStatus}
                style={({ pressed }) => [
                  styles.advanceBtn,
                  {
                    backgroundColor: isBlocked ? colors.muted : colors.primary,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                <Feather name={btnIcon} size={18} color={isBlocked ? colors.mutedForeground : "#fff"} />
                <Text style={[styles.advanceBtnText, { color: isBlocked ? colors.mutedForeground : "#fff" }]}>
                  {btnLabel}
                </Text>
              </Pressable>
            );
          })()}
        </View>

        {/* --- 4-hour countdown (for customer & admin when installation_done+ ) --- */}
        {showInstallationCountdown && assembly.status !== "completed" && (
          <View style={[styles.sectionCard, { backgroundColor: waterTestReady ? colors.success + "12" : colors.primary + "08", borderColor: waterTestReady ? colors.success + "30" : colors.primary + "20" }]}>
            <View style={styles.countdownRow}>
              <Feather name={waterTestReady ? "droplet" : "clock"} size={20} color={waterTestReady ? colors.success : colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.countdownTitle, { color: waterTestReady ? colors.success : colors.foreground }]}>
                  {waterTestReady ? "Su Testine Hazır" : "Su Testi Geri Sayımı"}
                </Text>
                {!waterTestReady && (
                  <Text style={[styles.countdownTime, { color: colors.primary }]}>
                    {countdown} kaldı
                  </Text>
                )}
                <Text style={[styles.countdownHint, { color: colors.mutedForeground }]}>
                  Montaj tamamlanma: {formatDate(assembly.installationCompletedAt)} {formatTs(assembly.installationCompletedAt)}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* --- Info + Glass --- */}
        <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Kayıt Bilgileri</Text>
          <InfoRow label="Firma" value={CUSTOMER_NAME} colors={colors} />
          <InfoRow label="Marka" value={brandName} colors={colors} />
          <InfoRow label="Şase No" value={`···${assembly.vinLast5 ?? assembly.vin?.slice(-5)}`} colors={colors} mono />
          <InfoRow label="Personel" value={assembly.assignedTo} colors={colors} />
          <InfoRow
            label="Kayıt Tarihi"
            value={new Date(assembly.createdAt).toLocaleString("tr-TR", { dateStyle: "short", timeStyle: "short" })}
            colors={colors}
          />
          {assembly.completedAt && (
            <InfoRow label="Tamamlandı" value={new Date(assembly.completedAt).toLocaleString("tr-TR", { dateStyle: "short", timeStyle: "short" })} colors={colors} />
          )}

          {/* Glass list */}
          {glassProducts.map((g, i) => {
            if (!g) return null;
            const brandCode = getBrandGlassCode(assembly.vehicleModel ?? "fiat-ducato", g.suffix);
            return (
              <View key={g.id} style={[styles.glassRow, { backgroundColor: colors.muted, borderColor: colors.border }]}>
                <Text style={[styles.glassRowNum, { color: colors.mutedForeground }]}>{i + 1}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.glassRowName, { color: colors.foreground }]}>{g.name}</Text>
                  <Text style={[styles.glassRowCode, { color: colors.mutedForeground }]}>{brandCode}</Text>
                </View>
              </View>
            );
          })}

          {assembly.notes?.length > 0 && (
            <>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <Text style={[styles.notesText, { color: colors.foreground }]}>{assembly.notes}</Text>
            </>
          )}
        </View>

        {/* --- Status Timeline --- */}
        {timestampEntries.length > 0 && (
          <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Süreç Zaman Çizelgesi</Text>
            <View style={styles.timeline}>
              {timestampEntries.map((entry, i) => (
                <View key={entry.status} style={styles.timelineRow}>
                  <View style={styles.timelineLeft}>
                    <View style={[styles.timelineDot, { backgroundColor: i === timestampEntries.length - 1 ? colors.primary : colors.success }]} />
                    {i < timestampEntries.length - 1 && <View style={[styles.timelineVert, { backgroundColor: colors.border }]} />}
                  </View>
                  <View style={styles.timelineContent}>
                    <Text style={[styles.timelineLabel, { color: colors.foreground }]}>{entry.label}</Text>
                    <Text style={[styles.timelineTs, { color: colors.mutedForeground }]}>
                      {formatDate(entry.timestamp)} · {formatTs(entry.timestamp)}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* --- VIN Photo --- */}
        {assembly.vinPhotoUri && (
          <Pressable
            style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border, padding: 0, overflow: "hidden" }]}
            onPress={() => setSelectedPhoto({ id: "vin", uri: assembly.vinPhotoUri!, type: "vin", timestamp: assembly.createdAt })}
          >
            <View style={styles.vinPhotoHeader}>
              <Feather name="shield" size={14} color={colors.mutedForeground} />
              <Text style={[styles.vinPhotoHeaderText, { color: colors.mutedForeground }]}>Şase Plaka Fotoğrafı</Text>
            </View>
            <Image source={{ uri: assembly.vinPhotoUri }} style={styles.vinPhotoPreview} resizeMode="cover" />
          </Pressable>
        )}

        {/* --- Approval Doc Photo --- */}
        {assembly.approvalDocPhotoUri && (
          <Pressable
            style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border, padding: 0, overflow: "hidden" }]}
            onPress={() => setSelectedPhoto({ id: "approval", uri: assembly.approvalDocPhotoUri!, type: "approval_doc", timestamp: assembly.createdAt })}
          >
            <View style={styles.vinPhotoHeader}>
              <Feather name="file-text" size={14} color={colors.mutedForeground} />
              <Text style={[styles.vinPhotoHeaderText, { color: colors.mutedForeground }]}>Araç Onay Belgesi</Text>
            </View>
            <Image source={{ uri: assembly.approvalDocPhotoUri }} style={styles.vinPhotoPreview} resizeMode="cover" />
          </Pressable>
        )}

        {/* --- Photos --- */}
        <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.sectionTitleRow}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              Fotoğraflar{assembly.photos.length > 0 ? ` (${assembly.photos.length})` : ""}
            </Text>
          </View>

          {canEdit && (
            <>
              <View style={styles.photoTypeRow}>
                {(["installation_before", "installation_after", "water_test", "defect", "other"] as PhotoType[]).map((t) => (
                  <Pressable
                    key={t}
                    onPress={() => setPhotoType(t)}
                    style={[
                      styles.photoTypeChip,
                      {
                        backgroundColor: photoType === t ? (PHOTO_TYPE_COLORS[t] ?? colors.primary) + "20" : colors.muted,
                        borderColor: photoType === t ? PHOTO_TYPE_COLORS[t] ?? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <Text style={[styles.photoTypeText, { color: photoType === t ? PHOTO_TYPE_COLORS[t] ?? colors.primary : colors.mutedForeground }]}>
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
              <Text style={[styles.emptyPhotosText, { color: colors.mutedForeground }]}>Henüz fotoğraf eklenmemiş</Text>
            </View>
          ) : (
            <View style={styles.photoGrid}>
              {assembly.photos.map((photo) => (
                <Pressable key={photo.id} style={styles.photoThumb} onPress={() => setSelectedPhoto(photo)}>
                  <Image source={{ uri: photo.uri }} style={styles.photoImg} />
                  <View style={[styles.photoTypePill, { backgroundColor: PHOTO_TYPE_COLORS[photo.type] ?? "#6366f1" }]}>
                    <Text style={styles.photoTypePillText}>
                      {photo.angle
                        ? `${(PHOTO_TYPE_LABELS[photo.type] ?? photo.type).split(" ")[1] ?? PHOTO_TYPE_LABELS[photo.type]} · ${photo.angle}`
                        : PHOTO_TYPE_LABELS[photo.type] ?? photo.type}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        {/* --- Defects --- */}
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

      {/* --- Capture Flow Overlay --- */}
      {captureFlow && (() => {
        const step = captureFlow.steps[captureFlow.currentIdx];
        const isLast = captureFlow.currentIdx === captureFlow.steps.length - 1;
        const doneCount = captureFlow.steps.filter((s) => s.uri).length;
        return (
          <View style={[styles.captureOverlay, { backgroundColor: colors.background }]}>
            {/* Header */}
            <View style={[styles.captureHeader, { borderBottomColor: colors.border }]}>
              <Pressable onPress={() => setCaptureFlow(null)} style={styles.captureClose}>
                <Feather name="x" size={22} color={colors.foreground} />
              </Pressable>
              <View style={{ flex: 1, alignItems: "center" }}>
                <Text style={[styles.captureHeaderTitle, { color: colors.foreground }]}>Süreç Fotoğrafı</Text>
                <Text style={[styles.captureStepLabel, { color: colors.mutedForeground }]}>
                  Adım {captureFlow.currentIdx + 1} / {captureFlow.steps.length}
                </Text>
              </View>
              <View style={{ width: 30 }} />
            </View>

            <View style={styles.captureBody}>
              {/* Step progress dots */}
              <View style={styles.captureProgressRow}>
                {captureFlow.steps.map((s, i) => (
                  <View key={i} style={[styles.captureProgressDot, {
                    backgroundColor: s.uri
                      ? colors.success
                      : i === captureFlow.currentIdx
                      ? colors.primary
                      : colors.border,
                    width: i === captureFlow.currentIdx ? 28 : 10,
                  }]} />
                ))}
              </View>

              {/* Angle label badge */}
              {step.angle && (
                <View style={[styles.captureAngleBadge, { backgroundColor: colors.primary + "15", borderColor: colors.primary + "40" }]}>
                  <Feather name="compass" size={13} color={colors.primary} />
                  <Text style={[styles.captureAngleText, { color: colors.primary }]}>{step.angle} Taraf</Text>
                </View>
              )}

              <Text style={[styles.captureTitle, { color: colors.foreground }]}>{step.label}</Text>
              <Text style={[styles.captureHint, { color: colors.mutedForeground }]}>{step.hint}</Text>

              {/* Photo preview or empty */}
              {step.uri ? (
                <View style={styles.capturePreviewWrap}>
                  <Image source={{ uri: step.uri }} style={styles.capturePreview} resizeMode="cover" />
                  <View style={[styles.capturePreviewBadge, { backgroundColor: colors.success }]}>
                    <Feather name="check" size={12} color="#fff" />
                    <Text style={styles.capturePreviewBadgeText}>Fotoğraf Alındı</Text>
                  </View>
                </View>
              ) : (
                <View style={[styles.captureEmptyImg, { backgroundColor: colors.muted, borderColor: colors.border }]}>
                  <Feather name="camera" size={44} color={colors.mutedForeground} />
                  <Text style={[styles.captureEmptyText, { color: colors.mutedForeground }]}>
                    {step.angle ? `${step.angle} taraftan fotoğraf çekin` : "Fotoğraf çekin"}
                  </Text>
                </View>
              )}

              {/* Camera / retake buttons */}
              <View style={styles.captureBtnRow}>
                {Platform.OS !== "web" && (
                  <Pressable
                    onPress={() => handleCapturePhoto(false)}
                    style={[styles.capturePrimaryBtn, { backgroundColor: step.uri ? colors.muted : colors.primary, borderWidth: step.uri ? 1 : 0, borderColor: colors.border }]}
                  >
                    <Feather name={step.uri ? "refresh-cw" : "camera"} size={20} color={step.uri ? colors.foreground : "#fff"} />
                    <Text style={[styles.capturePrimaryBtnText, { color: step.uri ? colors.foreground : "#fff" }]}>
                      {step.uri ? "Yeniden Çek" : "Kamera ile Çek"}
                    </Text>
                  </Pressable>
                )}
                <Pressable
                  onPress={() => handleCapturePhoto(true)}
                  style={[styles.captureSecondaryBtn, { backgroundColor: colors.muted, borderColor: colors.border }]}
                >
                  <Feather name="image" size={18} color={colors.foreground} />
                  <Text style={[styles.captureSecondaryBtnText, { color: colors.foreground }]}>Galeriden Seç</Text>
                </Pressable>
              </View>

              {/* Next / finish button */}
              {step.uri && (
                <Pressable
                  onPress={handleCaptureAdvance}
                  style={[styles.captureNextBtn, { backgroundColor: isLast ? colors.success : colors.primary }]}
                >
                  <Feather name={isLast ? "check-circle" : "arrow-right"} size={18} color="#fff" />
                  <Text style={styles.captureNextBtnText}>
                    {isLast
                      ? captureFlow.pendingStatus === "installation"
                        ? "Fotoğrafları Kaydet — Montaja Başla"
                        : "Fotoğrafları Kaydet — Montaj Tamamlandı"
                      : `Sonraki (${doneCount + 1}/${captureFlow.steps.length})`}
                  </Text>
                </Pressable>
              )}
            </View>
          </View>
        );
      })()}

      {/* Full-screen photo viewer */}
      {selectedPhoto && (
        <Pressable style={styles.photoViewer} onPress={() => setSelectedPhoto(null)}>
          <Image source={{ uri: selectedPhoto.uri }} style={styles.photoViewerImg} resizeMode="contain" />
          <View style={styles.photoViewerMeta}>
            <View style={[styles.photoViewerPill, { backgroundColor: PHOTO_TYPE_COLORS[selectedPhoto.type] ?? "#6366f1" }]}>
              <Text style={styles.photoTypePillText}>
                {PHOTO_TYPE_LABELS[selectedPhoto.type] ?? selectedPhoto.type}
                {selectedPhoto.angle ? ` · ${selectedPhoto.angle}` : ""}
              </Text>
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
  progressCircle: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  progressLabel: { fontSize: 9, fontFamily: "Inter_500Medium", textAlign: "center" },
  progressLine: { height: 2, flex: 1, marginTop: 10 },
  alertBox: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12, borderRadius: 10, borderWidth: 1 },
  alertBoxText: { fontSize: 13, fontFamily: "Inter_500Medium", flex: 1 },
  customerApprovalBox: { borderRadius: 12, borderWidth: 1, padding: 14, gap: 10 },
  customerApprovalTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  customerApprovalHint: { fontSize: 13, fontFamily: "Inter_400Regular" },
  customerApprovalBtns: { flexDirection: "row", gap: 10 },
  customerBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 12, borderRadius: 12, borderWidth: 1 },
  customerBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  approvalDone: { flexDirection: "row", alignItems: "center", gap: 8 },
  approvalDoneText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  advanceBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 13, borderRadius: 12 },
  advanceBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  countdownRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  countdownTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  countdownTime: { fontSize: 22, fontFamily: "Inter_700Bold", marginTop: 2 },
  countdownHint: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  infoRow: { flexDirection: "row", justifyContent: "space-between", gap: 16 },
  infoLabel: { fontSize: 13, fontFamily: "Inter_500Medium", width: 90 },
  infoValue: { fontSize: 13, flex: 1, textAlign: "right" },
  divider: { height: 1, marginVertical: 2 },
  notesText: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 22 },
  glassRow: { flexDirection: "row", alignItems: "center", gap: 10, padding: 10, borderRadius: 10, borderWidth: 1 },
  glassRowNum: { fontSize: 12, fontFamily: "Inter_600SemiBold", width: 18, textAlign: "center" },
  glassRowName: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  glassRowCode: { fontSize: 11, fontFamily: "Inter_400Regular" },
  vinPhotoHeader: { flexDirection: "row", alignItems: "center", gap: 6, padding: 14, paddingBottom: 8 },
  vinPhotoHeaderText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  vinPhotoPreview: { width: "100%", height: 160 },
  timeline: { gap: 0 },
  timelineRow: { flexDirection: "row", gap: 12 },
  timelineLeft: { alignItems: "center", width: 14 },
  timelineDot: { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
  timelineVert: { width: 2, flex: 1, marginTop: 4, minHeight: 20 },
  timelineContent: { flex: 1, paddingBottom: 14 },
  timelineLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  timelineTs: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  photoTypeRow: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
  photoTypeChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  photoTypeText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  photoActions: { flexDirection: "row", gap: 10 },
  photoBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 11, borderRadius: 12 },
  photoBtnText: { color: "#fff", fontSize: 14, fontFamily: "Inter_600SemiBold" },
  emptyPhotos: { alignItems: "center", paddingVertical: 20, gap: 8 },
  emptyPhotosText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  photoGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  photoThumb: { width: 96, height: 96, borderRadius: 10, overflow: "hidden" },
  photoImg: { width: "100%", height: "100%" },
  photoTypePill: { position: "absolute", bottom: 4, left: 4, paddingHorizontal: 5, paddingVertical: 2, borderRadius: 4 },
  photoTypePillText: { color: "#fff", fontSize: 9, fontFamily: "Inter_600SemiBold" },
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
  captureOverlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 100 },
  captureHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingVertical: 16, paddingTop: 60, borderBottomWidth: 1,
  },
  captureClose: { padding: 4 },
  captureHeaderTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  captureStepLabel: { fontSize: 13, fontFamily: "Inter_500Medium" },
  captureBody: { flex: 1, padding: 20, gap: 16 },
  captureProgressRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  captureProgressDot: { height: 8, borderRadius: 4 },
  captureAngleBadge: {
    flexDirection: "row", alignItems: "center", gap: 6,
    alignSelf: "flex-start", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1,
  },
  captureAngleText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  captureTitle: { fontSize: 20, fontFamily: "Inter_700Bold" },
  captureHint: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 21, marginTop: -4 },
  capturePreviewWrap: { borderRadius: 16, overflow: "hidden", height: 220, position: "relative" },
  capturePreview: { width: "100%", height: "100%" },
  capturePreviewBadge: {
    position: "absolute", top: 12, right: 12,
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8,
  },
  capturePreviewBadgeText: { color: "#fff", fontSize: 12, fontFamily: "Inter_600SemiBold" },
  captureRetake: {
    position: "absolute", bottom: 12, right: 12,
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, borderWidth: 1,
  },
  captureRetakeText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  captureEmptyImg: {
    height: 200, borderRadius: 16, borderWidth: 2, borderStyle: "dashed",
    alignItems: "center", justifyContent: "center", gap: 10,
  },
  captureEmptyText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  captureBtnRow: { gap: 10 },
  capturePrimaryBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    height: 52, borderRadius: 14, gap: 10,
  },
  capturePrimaryBtnText: { color: "#fff", fontSize: 15, fontFamily: "Inter_600SemiBold" },
  captureSecondaryBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    height: 48, borderRadius: 14, gap: 10, borderWidth: 1,
  },
  captureSecondaryBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  captureNextBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    height: 52, borderRadius: 14, gap: 10,
  },
  captureNextBtnText: { color: "#fff", fontSize: 15, fontFamily: "Inter_600SemiBold" },
  photoViewer: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.92)", alignItems: "center", justifyContent: "center" },
  photoViewerImg: { width: "100%", height: "80%" },
  photoViewerMeta: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 16 },
  photoViewerPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  photoViewerTime: { color: "#fff", fontSize: 13, fontFamily: "Inter_400Regular" },
  photoViewerClose: { position: "absolute", top: 48, right: 20, width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center" },
});
