import { Feather } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import {
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PhotoType, useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

const PHOTO_TYPE_LABELS: Record<PhotoType, string> = {
  approval_doc: "Onay Belgesi",
  vin: "Şase Fotoğrafı",
  cutting_before: "Kesim Öncesi",
  cutting_after: "Kesim Sonrası",
  installation_before: "Montaj Öncesi",
  installation_after: "Montaj Sonrası",
  water_test: "Su Testi",
  defect: "Kusur",
  other: "Diğer",
};

const PHOTO_TYPE_COLORS: Record<PhotoType, string> = {
  approval_doc: "#8b5cf6",
  vin: "#6b7280",
  cutting_before: "#f59e0b",
  cutting_after: "#f97316",
  installation_before: "#0a84ff",
  installation_after: "#10b981",
  water_test: "#3b82f6",
  defect: "#ef4444",
  other: "#6b7280",
};

type FilterType = PhotoType | "all";

const FILTER_OPTIONS: { label: string; value: FilterType }[] = [
  { label: "Tümü", value: "all" },
  { label: "Onay Belgesi", value: "approval_doc" },
  { label: "Şase", value: "vin" },
  { label: "Montaj Öncesi", value: "installation_before" },
  { label: "Montaj Sonrası", value: "installation_after" },
  { label: "Su Testi", value: "water_test" },
  { label: "Kusur", value: "defect" },
];

interface FlatPhoto {
  id: string;
  uri: string;
  type: PhotoType;
  angle?: string;
  assemblyId: string;
  vinLast5?: string;
  vehicleModel?: string;
  capturedAt?: string;
}

export default function PhotosScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { assemblies, role, currentUser } = useApp();
  const { width } = useWindowDimensions();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 + 84 : insets.bottom + 84;

  const [filter, setFilter] = useState<FilterType>("all");
  const [fullscreen, setFullscreen] = useState<FlatPhoto | null>(null);

  const cols = width > 500 ? 4 : 3;
  const photoSize = (width - 32 - (cols - 1) * 4) / cols;

  const allPhotos = useMemo((): FlatPhoto[] => {
    const result: FlatPhoto[] = [];
    const visibleAssemblies = role === "field"
      ? assemblies.filter((a) => a.assignedToUserId === currentUser?.id || a.assignedTo === currentUser?.name)
      : assemblies;

    visibleAssemblies.forEach((a) => {
      a.photos.forEach((p) => {
        result.push({
          id: p.id,
          uri: p.uri,
          type: p.type,
          angle: p.angle,
          assemblyId: a.id,
          vinLast5: a.vinLast5,
          vehicleModel: a.vehicleModel,
          capturedAt: p.timestamp,
        });
      });

      if (a.approvalDocPhotoUri) {
        result.push({
          id: `${a.id}-approval`,
          uri: a.approvalDocPhotoUri,
          type: "approval_doc",
          assemblyId: a.id,
          vinLast5: a.vinLast5,
          vehicleModel: a.vehicleModel,
        });
      }

      if (a.vinPhotoUri) {
        result.push({
          id: `${a.id}-vin`,
          uri: a.vinPhotoUri,
          type: "vin",
          assemblyId: a.id,
          vinLast5: a.vinLast5,
          vehicleModel: a.vehicleModel,
        });
      }
    });

    return result.sort((a, b) => (b.capturedAt ?? "").localeCompare(a.capturedAt ?? ""));
  }, [assemblies, role, currentUser]);

  const filtered = useMemo(() => {
    if (filter === "all") return allPhotos;
    return allPhotos.filter((p) => p.type === filter);
  }, [allPhotos, filter]);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 12, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Fotoğraflar</Text>
        <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>
          {filtered.length} fotoğraf
        </Text>
      </View>

      {/* Filter chips */}
      <View style={[styles.filterWrap, { borderBottomColor: colors.border }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {FILTER_OPTIONS.filter((o) => o.value === "all" || allPhotos.some((p) => p.type === o.value)).map((opt) => {
            const active = filter === opt.value;
            const typeColor = opt.value !== "all" ? PHOTO_TYPE_COLORS[opt.value as PhotoType] : colors.foreground;
            return (
              <Pressable
                key={opt.value}
                onPress={() => setFilter(opt.value)}
                style={[styles.chip, {
                  backgroundColor: active ? typeColor : colors.muted,
                  borderColor: active ? typeColor : colors.border,
                }]}
              >
                <Text style={[styles.chipText, { color: active ? "#fff" : colors.mutedForeground }]}>
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {filtered.length === 0 ? (
        <View style={styles.empty}>
          <Feather name="camera-off" size={40} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Fotoğraf yok</Text>
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            {filter === "all" ? "Henüz fotoğraf çekilmemiş" : "Bu türde fotoğraf bulunamadı"}
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.grid, { paddingBottom: bottomPad, paddingTop: 8 }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.gridRow}>
            {filtered.map((photo) => {
              const typeColor = PHOTO_TYPE_COLORS[photo.type] || colors.mutedForeground;
              return (
                <Pressable
                  key={photo.id}
                  onPress={() => setFullscreen(photo)}
                  style={({ pressed }) => [
                    styles.photoWrap,
                    { width: photoSize, height: photoSize, opacity: pressed ? 0.85 : 1 },
                  ]}
                >
                  <Image source={{ uri: photo.uri }} style={styles.photoImg} resizeMode="cover" />
                  <View style={[styles.typeBadge, { backgroundColor: typeColor + "dd" }]}>
                    <Text style={styles.typeBadgeText} numberOfLines={1}>
                      {photo.angle ?? PHOTO_TYPE_LABELS[photo.type]}
                    </Text>
                  </View>
                  {photo.vinLast5 && (
                    <View style={[styles.vinBadge, { backgroundColor: "rgba(0,0,0,0.55)" }]}>
                      <Text style={styles.vinBadgeText}>···{photo.vinLast5}</Text>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      )}

      {/* Fullscreen modal */}
      <Modal visible={!!fullscreen} transparent animationType="fade" onRequestClose={() => setFullscreen(null)}>
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setFullscreen(null)} />

          {fullscreen && (
            <>
              <View style={[styles.modalHeader, { paddingTop: topPad + 8 }]}>
                <View style={[styles.modalTypeBadge, { backgroundColor: PHOTO_TYPE_COLORS[fullscreen.type] }]}>
                  <Text style={styles.modalTypeBadgeText}>
                    {fullscreen.angle
                      ? `${PHOTO_TYPE_LABELS[fullscreen.type]} · ${fullscreen.angle}`
                      : PHOTO_TYPE_LABELS[fullscreen.type]}
                  </Text>
                </View>
                <Pressable onPress={() => setFullscreen(null)} style={styles.modalClose}>
                  <Feather name="x" size={22} color="#fff" />
                </Pressable>
              </View>

              <Image
                source={{ uri: fullscreen.uri }}
                style={styles.modalImage}
                resizeMode="contain"
              />

              {fullscreen.vinLast5 && (
                <View style={styles.modalFooter}>
                  <Feather name="truck" size={14} color="rgba(255,255,255,0.7)" />
                  <Text style={styles.modalFooterText}>···{fullscreen.vinLast5}</Text>
                </View>
              )}
            </>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 14, borderBottomWidth: 1 },
  headerTitle: { fontSize: 22, fontFamily: "Inter_700Bold" },
  headerSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  filterWrap: { borderBottomWidth: 1 },
  filterRow: { paddingHorizontal: 16, paddingVertical: 8, gap: 8, flexDirection: "row", alignItems: "center" },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1 },
  chipText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  grid: { paddingHorizontal: 16 },
  gridRow: { flexDirection: "row", flexWrap: "wrap", gap: 4 },
  photoWrap: { borderRadius: 10, overflow: "hidden", position: "relative" },
  photoImg: { width: "100%", height: "100%" },
  typeBadge: { position: "absolute", bottom: 0, left: 0, right: 0, paddingHorizontal: 6, paddingVertical: 3 },
  typeBadgeText: { fontSize: 9, fontFamily: "Inter_600SemiBold", color: "#fff" },
  vinBadge: { position: "absolute", top: 4, right: 4, paddingHorizontal: 5, paddingVertical: 2, borderRadius: 5 },
  vinBadgeText: { fontSize: 9, fontFamily: "Inter_700Bold", color: "#fff" },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 32 },
  emptyTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.92)", justifyContent: "center" },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 12 },
  modalTypeBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  modalTypeBadgeText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#fff" },
  modalClose: { padding: 8 },
  modalImage: { width: "100%", height: "70%" },
  modalFooter: { flexDirection: "row", alignItems: "center", gap: 8, padding: 16, justifyContent: "center" },
  modalFooterText: { fontSize: 14, fontFamily: "Inter_500Medium", color: "rgba(255,255,255,0.7)" },
});
