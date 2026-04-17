import { Feather } from "@expo/vector-icons";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
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

const TR_MONTHS = ["Oca","Şub","Mar","Nis","May","Haz","Tem","Ağu","Eyl","Eki","Kas","Ara"];

function fmtDate(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  return `${d.getDate()} ${TR_MONTHS[d.getMonth()]} ${d.getFullYear()}, ${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
}

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
  vin?: string;
  vinLast5?: string;
  vehicleModel?: string;
  capturedAt?: string;
}

function PhotoGridItem({
  photo,
  size,
  onPress,
}: {
  photo: FlatPhoto;
  size: number;
  onPress: () => void;
}) {
  const [loaded, setLoaded] = useState(false);
  const typeColor = PHOTO_TYPE_COLORS[photo.type] || "#6b7280";

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.82}
      style={[styles.photoWrap, { width: size, height: size }]}
    >
      {!loaded && (
        <View style={[StyleSheet.absoluteFill, styles.photoSkeleton]}>
          <ActivityIndicator size="small" color="rgba(255,255,255,0.5)" />
        </View>
      )}
      <Image
        source={{ uri: photo.uri }}
        style={styles.photoImg}
        resizeMode="cover"
        onLoad={() => setLoaded(true)}
        fadeDuration={150}
      />
      <View style={[styles.typeBadge, { backgroundColor: typeColor + "dd" }]}>
        <Text style={styles.typeBadgeText} numberOfLines={1}>
          {photo.angle ?? PHOTO_TYPE_LABELS[photo.type]}
        </Text>
      </View>
      {photo.vinLast5 && (
        <View style={[styles.vinBadge]}>
          <Text style={styles.vinBadgeText}>···{photo.vinLast5}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

export default function PhotosScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { assemblies, role, currentUser, refreshAssemblies } = useApp();
  const { width } = useWindowDimensions();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 + 84 : insets.bottom + 84;

  const [filter, setFilter] = useState<FilterType>("all");
  const [vinSearch, setVinSearch] = useState("");
  const [fullscreen, setFullscreen] = useState<FlatPhoto | null>(null);
  const [imgLoading, setImgLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshAssemblies();
    setRefreshing(false);
  }, [refreshAssemblies]);

  const cols = width > 500 ? 4 : 3;
  const photoSize = (width - 32 - (cols - 1) * 4) / cols;

  const allPhotos = useMemo((): FlatPhoto[] => {
    const result: FlatPhoto[] = [];
    const visibleAssemblies =
      role === "field"
        ? assemblies.filter(
            (a) =>
              a.assignedToUserId === currentUser?.id ||
              a.assignedTo === currentUser?.name
          )
        : assemblies;

    visibleAssemblies.forEach((a) => {
      a.photos.forEach((p) => {
        result.push({
          id: p.id,
          uri: p.uri,
          type: p.type,
          angle: p.angle,
          assemblyId: a.id,
          vin: a.vin,
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
          vin: a.vin,
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
          vin: a.vin,
          vinLast5: a.vinLast5,
          vehicleModel: a.vehicleModel,
        });
      }

      a.defects.forEach((d) => {
        if (d.photoUri) {
          result.push({
            id: `defect-${d.id}`,
            uri: d.photoUri,
            type: "defect",
            assemblyId: a.id,
            vin: a.vin,
            vinLast5: a.vinLast5,
            vehicleModel: a.vehicleModel,
            capturedAt: d.timestamp,
          });
        }
      });
    });

    return result.sort((a, b) =>
      (b.capturedAt ?? "").localeCompare(a.capturedAt ?? "")
    );
  }, [assemblies, role, currentUser]);

  const filtered = useMemo(() => {
    let list =
      filter === "all" ? allPhotos : allPhotos.filter((p) => p.type === filter);
    const q = vinSearch.trim().toUpperCase();
    if (q) {
      list = list.filter(
        (p) =>
          (p.vin ?? "").toUpperCase().includes(q) ||
          (p.vinLast5 ?? "").toUpperCase().includes(q)
      );
    }
    return list;
  }, [allPhotos, filter, vinSearch]);

  // Prefetch first 12 images for faster opens
  useEffect(() => {
    const toFetch = filtered.slice(0, 12);
    toFetch.forEach((p) => {
      if (p.uri) Image.prefetch(p.uri).catch(() => {});
    });
  }, [filtered]);

  const openPhoto = useCallback((photo: FlatPhoto) => {
    setImgLoading(true);
    setFullscreen(photo);
  }, []);

  const closePhoto = useCallback(() => {
    setFullscreen(null);
    setImgLoading(false);
  }, []);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: topPad + 12,
            backgroundColor: colors.card,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>
          Fotoğraflar
        </Text>
        <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>
          {filtered.length} fotoğraf
        </Text>
      </View>

      {/* Şase arama */}
      <View
        style={[
          styles.searchWrap,
          { backgroundColor: colors.card, borderBottomColor: colors.border },
        ]}
      >
        <View
          style={[
            styles.searchBox,
            {
              backgroundColor: colors.muted,
              borderColor: vinSearch ? colors.primary : colors.border,
            },
          ]}
        >
          <Feather
            name="search"
            size={15}
            color={vinSearch ? colors.primary : colors.mutedForeground}
          />
          <TextInput
            value={vinSearch}
            onChangeText={setVinSearch}
            placeholder="Şase no ile ara..."
            placeholderTextColor={colors.mutedForeground}
            autoCapitalize="characters"
            autoCorrect={false}
            style={[styles.searchInput, { color: colors.foreground }]}
          />
          {vinSearch.length > 0 && (
            <Pressable onPress={() => setVinSearch("")}>
              <Feather name="x-circle" size={15} color={colors.mutedForeground} />
            </Pressable>
          )}
        </View>
      </View>

      {/* Filter chips */}
      <View style={[styles.filterWrap, { borderBottomColor: colors.border }]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {FILTER_OPTIONS.filter(
            (o) =>
              o.value === "all" ||
              allPhotos.some((p) => p.type === o.value)
          ).map((opt) => {
            const active = filter === opt.value;
            const typeColor =
              opt.value !== "all"
                ? PHOTO_TYPE_COLORS[opt.value as PhotoType]
                : colors.primary;
            return (
              <Pressable
                key={opt.value}
                onPress={() => setFilter(opt.value)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: active ? typeColor : colors.muted,
                    borderColor: active ? typeColor : colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.chipText,
                    { color: active ? "#fff" : colors.mutedForeground },
                  ]}
                >
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {filtered.length === 0 ? (
        <ScrollView
          contentContainerStyle={styles.empty}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
        >
          <Feather name="camera-off" size={40} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
            Fotoğraf yok
          </Text>
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            {vinSearch
              ? `"${vinSearch}" şaseli araç fotoğrafı bulunamadı`
              : filter === "all"
              ? "Henüz fotoğraf çekilmemiş"
              : "Bu türde fotoğraf bulunamadı"}
          </Text>
        </ScrollView>
      ) : (
        <ScrollView
          contentContainerStyle={[
            styles.grid,
            { paddingBottom: bottomPad, paddingTop: 8 },
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
        >
          <View style={styles.gridRow}>
            {filtered.map((photo) => (
              <PhotoGridItem
                key={photo.id}
                photo={photo}
                size={photoSize}
                onPress={() => openPhoto(photo)}
              />
            ))}
          </View>
        </ScrollView>
      )}

      {/* Fullscreen Viewer */}
      <Modal
        visible={!!fullscreen}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={closePhoto}
      >
        <View style={styles.fsOverlay}>
          {fullscreen && (
            <>
              {/* Top bar */}
              <View style={[styles.fsTopBar, { paddingTop: topPad + 8 }]}>
                <View
                  style={[
                    styles.fsTypePill,
                    { backgroundColor: PHOTO_TYPE_COLORS[fullscreen.type] },
                  ]}
                >
                  <Text style={styles.fsTypePillText}>
                    {fullscreen.angle
                      ? `${PHOTO_TYPE_LABELS[fullscreen.type]} · ${fullscreen.angle}`
                      : PHOTO_TYPE_LABELS[fullscreen.type]}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={closePhoto}
                  style={styles.fsCloseBtn}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                  <Feather name="x" size={22} color="#fff" />
                </TouchableOpacity>
              </View>

              {/* Image area */}
              <View style={styles.fsImageArea} pointerEvents="box-none">
                {imgLoading && (
                  <ActivityIndicator
                    size="large"
                    color="#fff"
                    style={StyleSheet.absoluteFill}
                  />
                )}
                <Image
                  source={{ uri: fullscreen.uri }}
                  style={styles.fsImage}
                  resizeMode="contain"
                  onLoadStart={() => setImgLoading(true)}
                  onLoadEnd={() => setImgLoading(false)}
                  onError={() => setImgLoading(false)}
                  fadeDuration={200}
                />
              </View>

              {/* Bottom info */}
              <View
                style={[
                  styles.fsBottomBar,
                  { paddingBottom: insets.bottom + 20 },
                ]}
              >
                {(fullscreen.vin || fullscreen.vinLast5) && (
                  <View style={styles.fsInfoRow}>
                    <Feather name="hash" size={13} color="rgba(255,255,255,0.6)" />
                    <Text style={styles.fsInfoText}>
                      {fullscreen.vin &&
                      fullscreen.vin !== `XXXXX${fullscreen.vinLast5}`
                        ? fullscreen.vin
                        : `···${fullscreen.vinLast5}`}
                    </Text>
                  </View>
                )}
                {fullscreen.capturedAt && (
                  <View style={styles.fsInfoRow}>
                    <Feather
                      name="clock"
                      size={13}
                      color="rgba(255,255,255,0.6)"
                    />
                    <Text style={styles.fsInfoText}>
                      {fmtDate(fullscreen.capturedAt)}
                    </Text>
                  </View>
                )}
                <Text style={styles.fsDismissHint}>
                  Kapatmak için × tuşuna basın
                </Text>
              </View>
            </>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 22, fontFamily: "Inter_700Bold" },
  headerSub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  searchWrap: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    height: 22,
  },
  filterWrap: { borderBottomWidth: 1 },
  filterRow: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  chipText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  grid: { paddingHorizontal: 16 },
  gridRow: { flexDirection: "row", flexWrap: "wrap", gap: 4 },

  photoWrap: { borderRadius: 10, overflow: "hidden", position: "relative" },
  photoSkeleton: {
    backgroundColor: "#1e293b",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
  },
  photoImg: { width: "100%", height: "100%" },
  typeBadge: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  typeBadgeText: {
    fontSize: 9,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },
  vinBadge: {
    position: "absolute",
    top: 4,
    right: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 5,
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  vinBadgeText: { fontSize: 9, fontFamily: "Inter_700Bold", color: "#fff" },

  empty: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 32,
  },
  emptyTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  emptyText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },

  // Fullscreen viewer
  fsOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.96)",
    flexDirection: "column",
  },
  fsTopBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    zIndex: 10,
  },
  fsTypePill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    maxWidth: "75%",
  },
  fsTypePillText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },
  fsCloseBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  fsImageArea: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  fsImage: {
    width: "100%",
    height: "100%",
  },
  fsBottomBar: {
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 6,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  fsInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  fsInfoText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: "rgba(255,255,255,0.75)",
  },
  fsDismissHint: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.3)",
    textAlign: "center",
    marginTop: 6,
  },
});
