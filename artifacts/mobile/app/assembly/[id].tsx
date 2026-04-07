import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { StatusBadge } from "@/components/StatusBadge";
import { AssemblyStatus, DefectRecord, useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

const STATUS_FLOW: AssemblyStatus[] = [
  "pending",
  "in_progress",
  "qc_check",
  "completed",
  "delivered",
];

const STATUS_LABELS: Record<AssemblyStatus, string> = {
  pending: "Bekliyor",
  in_progress: "Devam Ediyor",
  qc_check: "KK Kontrolü",
  completed: "Tamamlandı",
  delivered: "Teslim Edildi",
};

const SEVERITY_COLORS: Record<string, string> = {
  low: "#f59e0b",
  medium: "#f97316",
  high: "#ef4444",
};

const SEVERITY_LABELS: Record<string, string> = {
  low: "Düşük",
  medium: "Orta",
  high: "Yüksek",
};

export default function AssemblyDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getAssembly, updateAssembly, addDefect, updateDefect, deleteAssembly, role } = useApp();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const assembly = getAssembly(id);

  const [defectText, setDefectText] = useState("");
  const [defectSeverity, setDefectSeverity] = useState<"low" | "medium" | "high">("low");
  const [showDefectForm, setShowDefectForm] = useState(false);
  const [showStatusPicker, setShowStatusPicker] = useState(false);

  if (!assembly) {
    return (
      <View style={[styles.notFound, { backgroundColor: colors.background }]}>
        <Feather name="alert-circle" size={40} color={colors.mutedForeground} />
        <Text style={[styles.notFoundText, { color: colors.mutedForeground }]}>
          Kayıt bulunamadı
        </Text>
        <Pressable onPress={() => router.back()}>
          <Text style={[styles.backLink, { color: colors.primary }]}>Geri Dön</Text>
        </Pressable>
      </View>
    );
  }

  const canEdit = role === "field" || role === "admin";
  const currentStatusIdx = STATUS_FLOW.indexOf(assembly.status);

  const handleStatusChange = async (newStatus: AssemblyStatus) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const updates: Partial<typeof assembly> = { status: newStatus };
    if (newStatus === "completed" && !assembly.completedAt) {
      updates.completedAt = new Date().toISOString();
    }
    if (newStatus === "delivered" && !assembly.deliveredAt) {
      updates.deliveredAt = new Date().toISOString();
    }
    updateAssembly(assembly.id, updates);
    setShowStatusPicker(false);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleAddDefect = async () => {
    if (!defectText.trim()) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    addDefect(assembly.id, {
      description: defectText.trim(),
      severity: defectSeverity,
      resolved: false,
    });
    setDefectText("");
    setDefectSeverity("low");
    setShowDefectForm(false);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleToggleDefect = async (defect: DefectRecord) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    updateDefect(assembly.id, defect.id, { resolved: !defect.resolved });
  };

  const handleDelete = () => {
    Alert.alert(
      "Kaydı Sil",
      "Bu montaj kaydını silmek istediğinizden emin misiniz?",
      [
        { text: "İptal", style: "cancel" },
        {
          text: "Sil",
          style: "destructive",
          onPress: () => {
            deleteAssembly(assembly.id);
            router.replace("/(tabs)" as any);
          },
        },
      ]
    );
  };

  const openDefectCount = assembly.defects.filter((d) => !d.resolved).length;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          {
            paddingTop: topPad + 8,
            backgroundColor: colors.card,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerModel, { color: colors.foreground }]}>
            {assembly.vehicleModel}
          </Text>
          <Text style={[styles.headerVin, { color: colors.mutedForeground }]}>
            {assembly.vin}
          </Text>
        </View>
        {canEdit && role === "admin" && (
          <Pressable onPress={handleDelete}>
            <Feather name="trash-2" size={20} color={colors.destructive} />
          </Pressable>
        )}
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: bottomPad + 32 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            styles.statusSection,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <View style={styles.statusRow}>
            <StatusBadge status={assembly.status} />
            {canEdit && (
              <Pressable
                onPress={() => setShowStatusPicker(!showStatusPicker)}
                style={[
                  styles.changeStatusBtn,
                  { backgroundColor: colors.muted, borderColor: colors.border },
                ]}
              >
                <Text
                  style={[styles.changeStatusText, { color: colors.foreground }]}
                >
                  Durumu Güncelle
                </Text>
                <Feather
                  name={showStatusPicker ? "chevron-up" : "chevron-down"}
                  size={14}
                  color={colors.mutedForeground}
                />
              </Pressable>
            )}
          </View>

          <View style={styles.progressBar}>
            {STATUS_FLOW.map((s, i) => (
              <View
                key={s}
                style={[
                  styles.progressDot,
                  {
                    backgroundColor:
                      i <= currentStatusIdx ? colors.primary : colors.border,
                    flex: i < STATUS_FLOW.length - 1 ? 1 : undefined,
                  },
                ]}
              />
            ))}
          </View>

          {showStatusPicker && (
            <View style={styles.statusPicker}>
              {STATUS_FLOW.map((s) => (
                <Pressable
                  key={s}
                  onPress={() => handleStatusChange(s)}
                  style={[
                    styles.statusOption,
                    {
                      backgroundColor:
                        assembly.status === s
                          ? colors.primary + "15"
                          : "transparent",
                      borderColor:
                        assembly.status === s ? colors.primary : colors.border,
                    },
                  ]}
                >
                  {assembly.status === s && (
                    <Feather name="check" size={14} color={colors.primary} />
                  )}
                  <Text
                    style={[
                      styles.statusOptionText,
                      {
                        color:
                          assembly.status === s
                            ? colors.primary
                            : colors.foreground,
                      },
                    ]}
                  >
                    {STATUS_LABELS[s]}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        <SectionCard title="Araç Bilgileri" colors={colors}>
          <InfoRow label="Şase No" value={assembly.vin} colors={colors} mono />
          <InfoRow label="Model" value={assembly.vehicleModel} colors={colors} />
          <InfoRow label="Renk" value={assembly.vehicleColor || "—"} colors={colors} />
          <InfoRow label="Cam Tipi" value={assembly.glassType} colors={colors} />
          <InfoRow
            label="Parça No"
            value={assembly.glassPartNumber || "—"}
            colors={colors}
            mono
          />
        </SectionCard>

        <SectionCard title="Müşteri" colors={colors}>
          <InfoRow label="Ad" value={assembly.customerName} colors={colors} />
          <InfoRow
            label="Telefon"
            value={assembly.customerPhone || "—"}
            colors={colors}
          />
        </SectionCard>

        <SectionCard title="Atama & Zaman" colors={colors}>
          <InfoRow label="Personel" value={assembly.assignedTo} colors={colors} />
          <InfoRow
            label="Oluşturuldu"
            value={new Date(assembly.createdAt).toLocaleString("tr-TR")}
            colors={colors}
          />
          <InfoRow
            label="Güncellendi"
            value={new Date(assembly.updatedAt).toLocaleString("tr-TR")}
            colors={colors}
          />
          {assembly.completedAt && (
            <InfoRow
              label="Tamamlandı"
              value={new Date(assembly.completedAt).toLocaleString("tr-TR")}
              colors={colors}
            />
          )}
        </SectionCard>

        {assembly.notes.length > 0 && (
          <SectionCard title="Notlar" colors={colors}>
            <Text style={[styles.notesText, { color: colors.foreground }]}>
              {assembly.notes}
            </Text>
          </SectionCard>
        )}

        <View
          style={[
            styles.sectionCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <View style={styles.sectionTitleRow}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              Kusurlar{" "}
              {assembly.defects.length > 0 && (
                <Text style={{ color: colors.mutedForeground }}>
                  ({openDefectCount} açık)
                </Text>
              )}
            </Text>
            {canEdit && (
              <Pressable
                onPress={() => setShowDefectForm(!showDefectForm)}
                style={[
                  styles.addDefectBtn,
                  { backgroundColor: colors.destructive + "15" },
                ]}
              >
                <Feather name="plus" size={14} color={colors.destructive} />
                <Text style={[styles.addDefectText, { color: colors.destructive }]}>
                  Kusur Ekle
                </Text>
              </Pressable>
            )}
          </View>

          {showDefectForm && (
            <View
              style={[
                styles.defectForm,
                { backgroundColor: colors.muted, borderColor: colors.border },
              ]}
            >
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
                        backgroundColor:
                          defectSeverity === s
                            ? SEVERITY_COLORS[s] + "25"
                            : "transparent",
                        borderColor:
                          defectSeverity === s
                            ? SEVERITY_COLORS[s]
                            : colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.severityText,
                        {
                          color:
                            defectSeverity === s
                              ? SEVERITY_COLORS[s]
                              : colors.mutedForeground,
                        },
                      ]}
                    >
                      {SEVERITY_LABELS[s]}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <Pressable
                onPress={handleAddDefect}
                style={[
                  styles.defectSubmit,
                  { backgroundColor: colors.destructive },
                ]}
              >
                <Text style={styles.defectSubmitText}>Kusuru Kaydet</Text>
              </Pressable>
            </View>
          )}

          {assembly.defects.length === 0 ? (
            <Text style={[styles.emptyDefects, { color: colors.mutedForeground }]}>
              Kayıtlı kusur yok
            </Text>
          ) : (
            <View style={styles.defectList}>
              {assembly.defects.map((d) => (
                <Pressable
                  key={d.id}
                  onPress={() => canEdit && handleToggleDefect(d)}
                  style={[
                    styles.defectItem,
                    {
                      backgroundColor: d.resolved
                        ? colors.success + "10"
                        : colors.destructive + "08",
                      borderColor: d.resolved
                        ? colors.success + "30"
                        : colors.destructive + "20",
                    },
                  ]}
                >
                  <Feather
                    name={d.resolved ? "check-circle" : "alert-circle"}
                    size={16}
                    color={d.resolved ? colors.success : SEVERITY_COLORS[d.severity]}
                  />
                  <View style={styles.defectInfo}>
                    <Text
                      style={[
                        styles.defectDesc,
                        {
                          color: d.resolved
                            ? colors.mutedForeground
                            : colors.foreground,
                          textDecorationLine: d.resolved ? "line-through" : "none",
                        },
                      ]}
                    >
                      {d.description}
                    </Text>
                    <Text
                      style={[styles.defectMeta, { color: colors.mutedForeground }]}
                    >
                      {SEVERITY_LABELS[d.severity]} ·{" "}
                      {new Date(d.timestamp).toLocaleString("tr-TR")}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function SectionCard({
  title,
  children,
  colors,
}: {
  title: string;
  children: React.ReactNode;
  colors: any;
}) {
  return (
    <View
      style={[
        styles.sectionCard,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
        {title}
      </Text>
      {children}
    </View>
  );
}

function InfoRow({
  label,
  value,
  colors,
  mono,
}: {
  label: string;
  value: string;
  colors: any;
  mono?: boolean;
}) {
  return (
    <View style={styles.infoRow}>
      <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>
        {label}
      </Text>
      <Text
        style={[
          styles.infoValue,
          {
            color: colors.foreground,
            fontFamily: mono ? "Inter_500Medium" : "Inter_400Regular",
            letterSpacing: mono ? 0.5 : 0,
          },
        ]}
        selectable
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  notFound: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  notFoundText: { fontSize: 15, fontFamily: "Inter_500Medium" },
  backLink: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    gap: 12,
  },
  backBtn: { padding: 2 },
  headerCenter: { flex: 1 },
  headerModel: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
  },
  headerVin: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    letterSpacing: 0.5,
  },
  content: {
    padding: 16,
    gap: 12,
  },
  statusSection: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 14,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  changeStatusBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
  },
  changeStatusText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  progressBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  progressDot: {
    height: 6,
    borderRadius: 3,
    minWidth: 24,
  },
  statusPicker: {
    gap: 8,
  },
  statusOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
  },
  statusOptionText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  sectionCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 2,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 16,
  },
  infoLabel: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    width: 100,
  },
  infoValue: {
    fontSize: 13,
    flex: 1,
    textAlign: "right",
  },
  notesText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 22,
  },
  addDefectBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addDefectText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  defectForm: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    gap: 10,
  },
  defectInput: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    minHeight: 60,
    textAlignVertical: "top",
  },
  severityRow: {
    flexDirection: "row",
    gap: 8,
  },
  severityChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  severityText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  defectSubmit: {
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  defectSubmitText: {
    color: "#fff",
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  emptyDefects: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    paddingVertical: 8,
  },
  defectList: {
    gap: 8,
  },
  defectItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  defectInfo: {
    flex: 1,
    gap: 3,
  },
  defectDesc: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
  },
  defectMeta: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
});
