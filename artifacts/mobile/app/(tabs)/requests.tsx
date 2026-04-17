import { Feather } from "@expo/vector-icons";
import React, { useCallback, useMemo, useState } from "react";
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { GLASS_POSITIONS, GlassRequest, GlassRequestItem, useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const TR_MONTHS = ["Ocak","Şubat","Mart","Nisan","Mayıs","Haziran","Temmuz","Ağustos","Eylül","Ekim","Kasım","Aralık"];
const TR_DAYS   = ["Pazar","Pazartesi","Salı","Çarşamba","Perşembe","Cuma","Cumartesi"];

function displayDate(iso: string): string {
  if (!iso) return "";
  const dateOnly = iso.length > 10 ? iso.slice(0, 10) : iso;
  const [y, m, d] = dateOnly.split("-");
  if (!y || !m || !d) return iso;
  const dt = new Date(Number(y), Number(m) - 1, Number(d));
  return `${d} ${TR_MONTHS[Number(m) - 1]} ${y}, ${TR_DAYS[dt.getDay()]}`;
}

function displayDateTime(iso: string): string {
  if (!iso) return "";
  const dt = new Date(iso);
  const d = String(dt.getDate()).padStart(2, "0");
  const m = TR_MONTHS[dt.getMonth()];
  const y = dt.getFullYear();
  const h = String(dt.getHours()).padStart(2, "0");
  const min = String(dt.getMinutes()).padStart(2, "0");
  return `${d} ${m} ${y}, ${h}:${min}`;
}

function tomorrow(): Date {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d;
}

const STATUS_LABEL: Record<string, string> = {
  pending: "Beklemede",
  approved: "Onaylandı",
  rejected: "Reddedildi",
};

const STATUS_COLOR: Record<string, string> = {
  pending: "#f59e0b",
  approved: "#10b981",
  rejected: "#ef4444",
};

export default function RequestsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { role, glassRequests, addGlassRequest, updateGlassRequest, deleteGlassRequest, glassStock, refreshGlassRequests } = useApp();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 + 84 : insets.bottom + 84;

  if (role === "customer") {
    return (
      <CustomerRequestsView
        colors={colors}
        topPad={topPad}
        bottomPad={bottomPad}
        glassRequests={glassRequests}
        addGlassRequest={addGlassRequest}
        glassStock={glassStock}
        refreshGlassRequests={refreshGlassRequests}
      />
    );
  }

  if (role === "admin") {
    return (
      <AdminRequestsView
        colors={colors}
        topPad={topPad}
        bottomPad={bottomPad}
        glassRequests={glassRequests}
        updateGlassRequest={updateGlassRequest}
        deleteGlassRequest={deleteGlassRequest}
        refreshGlassRequests={refreshGlassRequests}
      />
    );
  }

  return (
    <View style={[styles.center, { backgroundColor: colors.background }]}>
      <Feather name="lock" size={40} color={colors.mutedForeground} />
      <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Bu bölüme erişiminiz yok</Text>
    </View>
  );
}

// ==== CUSTOMER VIEW ====

function CustomerRequestsView({
  colors, topPad, bottomPad, glassRequests, addGlassRequest, glassStock, refreshGlassRequests,
}: any) {
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [selectedDate, setSelectedDate] = useState<Date>(tomorrow());
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<"form" | "history">("form");
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshGlassRequests?.();
    setRefreshing(false);
  }, [refreshGlassRequests]);

  const hasItems = Object.values(quantities).some((q) => q > 0);

  const setQty = (id: string, delta: number) => {
    setQuantities((prev) => {
      const cur = prev[id] ?? 0;
      const next = Math.max(0, cur + delta);
      if (next === 0) {
        const rest = { ...prev };
        delete rest[id];
        return rest;
      }
      return { ...prev, [id]: next };
    });
  };

  const changeDay = (delta: number) => {
    const next = new Date(selectedDate);
    next.setDate(next.getDate() + delta);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    if (next >= today) setSelectedDate(next);
  };

  const handleSubmit = async () => {
    if (!hasItems) {
      Alert.alert("Uyarı", "En az bir cam türü ve miktarı seçiniz.");
      return;
    }
    setLoading(true);
    try {
      const items: GlassRequestItem[] = Object.entries(quantities)
        .filter(([, q]) => q > 0)
        .map(([id, quantity]) => {
          const glass = glassStock.find((g: any) => g.id === id) ?? GLASS_POSITIONS.find((g) => g.id === id);
          return { glassId: id, glassName: glass?.name ?? id, quantity };
        });
      await addGlassRequest({ items, requestedDate: formatDate(selectedDate), notes });
      setQuantities({});
      setNotes("");
      setSelectedDate(tomorrow());
      setTab("history");
      Alert.alert("Başarılı", "Cam talebiniz iletildi.");
    } catch (e: any) {
      Alert.alert("Hata", e.message ?? "Talep gönderilemedi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 16, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <Text style={[styles.pageTitle, { color: colors.foreground }]}>Cam Talebi</Text>
        <Text style={[styles.pageSubtitle, { color: colors.mutedForeground }]}>ISRI · Ekolglass</Text>
      </View>

      {/* Tabs */}
      <View style={[styles.tabRow, { backgroundColor: colors.muted, borderBottomColor: colors.border }]}>
        {(["form", "history"] as const).map((t) => (
          <Pressable key={t} onPress={() => setTab(t)} style={[styles.tabBtn, tab === t && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}>
            <Text style={[styles.tabBtnText, { color: tab === t ? colors.primary : colors.mutedForeground }]}>
              {t === "form" ? "Yeni Talep" : "Geçmiş Talepler"}
            </Text>
          </Pressable>
        ))}
      </View>

      {tab === "form" ? (
        <ScrollView
          contentContainerStyle={[styles.container, { paddingBottom: bottomPad }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Date picker */}
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>TESLİMAT TARİHİ</Text>
            <View style={styles.dateRow}>
              <Pressable onPress={() => changeDay(-1)} style={[styles.dateBtn, { backgroundColor: colors.muted, borderColor: colors.border }]}>
                <Feather name="chevron-left" size={20} color={colors.foreground} />
              </Pressable>
              <View style={[styles.dateDisplay, { backgroundColor: colors.muted, borderColor: colors.border }]}>
                <Feather name="calendar" size={16} color={colors.primary} />
                <Text style={[styles.dateText, { color: colors.foreground }]}>{displayDate(formatDate(selectedDate))}</Text>
              </View>
              <Pressable onPress={() => changeDay(1)} style={[styles.dateBtn, { backgroundColor: colors.muted, borderColor: colors.border }]}>
                <Feather name="chevron-right" size={20} color={colors.foreground} />
              </Pressable>
            </View>
          </View>

          {/* Glass items */}
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>CAM SEÇİMİ</Text>
            {GLASS_POSITIONS.map((glass) => {
              const qty = quantities[glass.id] ?? 0;
              return (
                <View key={glass.id} style={[styles.glassRow, { borderBottomColor: colors.border }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.glassName, { color: colors.foreground }]}>{glass.name}</Text>
                    <Text style={[styles.glassCode, { color: colors.mutedForeground }]}>{glass.suffix}</Text>
                  </View>
                  <View style={styles.qtyRow}>
                    <Pressable onPress={() => setQty(glass.id, -1)} style={[styles.qtyBtn, { backgroundColor: qty > 0 ? colors.primary + "15" : colors.muted, borderColor: colors.border }]}>
                      <Feather name="minus" size={14} color={qty > 0 ? colors.primary : colors.mutedForeground} />
                    </Pressable>
                    <Text style={[styles.qtyText, { color: qty > 0 ? colors.primary : colors.mutedForeground }]}>{qty}</Text>
                    <Pressable onPress={() => setQty(glass.id, 1)} style={[styles.qtyBtn, { backgroundColor: colors.primary + "15", borderColor: colors.border }]}>
                      <Feather name="plus" size={14} color={colors.primary} />
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </View>

          {/* Notes */}
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>NOT (İSTEĞE BAĞLI)</Text>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="Özel açıklama veya not..."
              placeholderTextColor={colors.mutedForeground}
              multiline
              numberOfLines={3}
              style={[styles.notesInput, { color: colors.foreground, backgroundColor: colors.muted, borderColor: colors.border }]}
            />
          </View>

          {/* Summary */}
          {hasItems && (
            <View style={[styles.summaryCard, { backgroundColor: colors.primary + "10", borderColor: colors.primary + "25" }]}>
              <Text style={[styles.summaryTitle, { color: colors.primary }]}>Talep Özeti</Text>
              {Object.entries(quantities).filter(([, q]) => q > 0).map(([id, q]) => {
                const glass = GLASS_POSITIONS.find((g) => g.id === id);
                return (
                  <Text key={id} style={[styles.summaryItem, { color: colors.foreground }]}>
                    • {glass?.name ?? id}: <Text style={{ fontFamily: "Inter_700Bold" }}>{q} adet</Text>
                  </Text>
                );
              })}
              <Text style={[styles.summaryDate, { color: colors.mutedForeground }]}>
                Talep tarihi: {displayDate(formatDate(selectedDate))}
              </Text>
            </View>
          )}

          <Pressable
            onPress={handleSubmit}
            disabled={loading || !hasItems}
            style={({ pressed }) => [styles.submitBtn, {
              backgroundColor: hasItems ? colors.primary : colors.mutedForeground,
              opacity: pressed ? 0.85 : 1,
            }]}
          >
            <Feather name="send" size={18} color="#fff" />
            <Text style={styles.submitBtnText}>{loading ? "Gönderiliyor..." : "Talebi Gönder"}</Text>
          </Pressable>
        </ScrollView>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.container, { paddingBottom: bottomPad }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
        >
          {glassRequests.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Feather name="inbox" size={40} color={colors.mutedForeground} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Henüz talep gönderilmedi</Text>
            </View>
          ) : [...glassRequests].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map((req) => (
            <RequestCard key={req.id} req={req} colors={colors} isAdmin={false} />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

// ==== ADMIN VIEW ====

function AdminRequestsView({ colors, topPad, bottomPad, glassRequests, updateGlassRequest, deleteGlassRequest, refreshGlassRequests }: any) {
  const [filter, setFilter] = useState<"pending" | "all">("pending");
  const [reviewModal, setReviewModal] = useState<GlassRequest | null>(null);
  const [adminNote, setAdminNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshGlassRequests?.();
    setRefreshing(false);
  }, [refreshGlassRequests]);

  const filtered = useMemo(() => {
    const list = filter === "pending"
      ? glassRequests.filter((r: GlassRequest) => r.status === "pending")
      : [...glassRequests];
    return list.sort((a: GlassRequest, b: GlassRequest) => new Date(a.requestedDate).getTime() - new Date(b.requestedDate).getTime());
  }, [glassRequests, filter]);

  const pendingCount = glassRequests.filter((r: GlassRequest) => r.status === "pending").length;

  const handleReview = async (status: "approved" | "rejected") => {
    if (!reviewModal) return;
    setLoading(true);
    try {
      await updateGlassRequest(reviewModal.id, { status, adminNote });
      setReviewModal(null);
      setAdminNote("");
    } catch (e: any) {
      Alert.alert("Hata", e.message ?? "İşlem başarısız.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert("Sil", "Bu talep silinsin mi?", [
      { text: "Vazgeç", style: "cancel" },
      { text: "Sil", style: "destructive", onPress: () => deleteGlassRequest(id) },
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 16, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <View>
          <Text style={[styles.pageTitle, { color: colors.foreground }]}>ISRI Talepleri</Text>
          {pendingCount > 0 && (
            <Text style={[styles.pageSubtitle, { color: colors.warning ?? "#f59e0b" }]}>{pendingCount} bekleyen talep</Text>
          )}
        </View>
      </View>

      {/* Filter */}
      <View style={[styles.tabRow, { backgroundColor: colors.muted, borderBottomColor: colors.border }]}>
        {(["pending", "all"] as const).map((f) => (
          <Pressable key={f} onPress={() => setFilter(f)} style={[styles.tabBtn, filter === f && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}>
            <Text style={[styles.tabBtnText, { color: filter === f ? colors.primary : colors.mutedForeground }]}>
              {f === "pending" ? `Bekleyenler (${pendingCount})` : "Tümü"}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={[styles.container, { paddingBottom: bottomPad }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {filtered.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Feather name="check-circle" size={40} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              {filter === "pending" ? "Bekleyen talep yok" : "Henüz talep gönderilmedi"}
            </Text>
          </View>
        ) : filtered.map((req: GlassRequest) => (
          <RequestCard
            key={req.id}
            req={req}
            colors={colors}
            isAdmin
            onReview={() => { setReviewModal(req); setAdminNote(req.adminNote ?? ""); }}
            onDelete={() => handleDelete(req.id)}
          />
        ))}
      </ScrollView>

      {/* Review Modal */}
      <Modal visible={!!reviewModal} transparent animationType="slide" onRequestClose={() => setReviewModal(null)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Talep Değerlendirme</Text>
            {reviewModal && (
              <>
                <Text style={[styles.modalCustomer, { color: colors.mutedForeground }]}>
                  {reviewModal.requestedByName} · {displayDate(reviewModal.requestedDate)}
                </Text>
                <View style={[styles.modalItems, { backgroundColor: colors.muted, borderColor: colors.border }]}>
                  {reviewModal.items.map((item, i) => (
                    <Text key={i} style={[styles.modalItem, { color: colors.foreground }]}>
                      • {item.glassName}: {item.quantity} adet
                    </Text>
                  ))}
                </View>
                {reviewModal.notes ? (
                  <Text style={[styles.modalNote, { color: colors.mutedForeground }]}>Not: {reviewModal.notes}</Text>
                ) : null}
                <TextInput
                  value={adminNote}
                  onChangeText={setAdminNote}
                  placeholder="Admin notu (isteğe bağlı)..."
                  placeholderTextColor={colors.mutedForeground}
                  style={[styles.adminNoteInput, { color: colors.foreground, backgroundColor: colors.muted, borderColor: colors.border }]}
                  multiline
                />
                <View style={styles.modalBtns}>
                  <Pressable
                    onPress={() => handleReview("rejected")}
                    disabled={loading}
                    style={({ pressed }) => [styles.rejectBtn, { borderColor: colors.destructive, opacity: pressed ? 0.8 : 1 }]}
                  >
                    <Feather name="x" size={16} color={colors.destructive} />
                    <Text style={[styles.rejectBtnText, { color: colors.destructive }]}>Reddet</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => handleReview("approved")}
                    disabled={loading}
                    style={({ pressed }) => [styles.approveBtn, { backgroundColor: colors.success ?? "#10b981", opacity: pressed ? 0.8 : 1 }]}
                  >
                    <Feather name="check" size={16} color="#fff" />
                    <Text style={styles.approveBtnText}>{loading ? "..." : "Onayla"}</Text>
                  </Pressable>
                </View>
                <Pressable onPress={() => setReviewModal(null)} style={styles.cancelBtn}>
                  <Text style={[styles.cancelBtnText, { color: colors.mutedForeground }]}>Vazgeç</Text>
                </Pressable>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ==== REQUEST CARD ====
function RequestCard({ req, colors, isAdmin, onReview, onDelete }: {
  req: GlassRequest; colors: any; isAdmin: boolean; onReview?: () => void; onDelete?: () => void;
}) {
  const statusColor = STATUS_COLOR[req.status] ?? "#94a3b8";
  const statusLabel = STATUS_LABEL[req.status] ?? req.status;
  return (
    <View style={[styles.reqCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.reqCardHeader}>
        {isAdmin && (
          <Text style={[styles.reqCustomer, { color: colors.foreground }]}>{req.requestedByName}</Text>
        )}
        <View style={[styles.statusBadge, { backgroundColor: statusColor + "18", borderColor: statusColor + "40" }]}>
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          <Text style={[styles.statusBadgeText, { color: statusColor }]}>{statusLabel}</Text>
        </View>
      </View>
      <View style={{ gap: 4, marginBottom: 4 }}>
        <View style={styles.reqDateRow}>
          <Feather name="calendar" size={13} color={colors.primary} />
          <Text style={[styles.reqDate, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
            Teslimat: {displayDate(req.requestedDate)}
          </Text>
        </View>
        <View style={styles.reqDateRow}>
          <Feather name="clock" size={12} color={colors.mutedForeground} />
          <Text style={[styles.reqDate, { color: colors.mutedForeground, fontSize: 11 }]}>
            Gönderildi: {displayDateTime(req.createdAt)}
          </Text>
        </View>
      </View>
      {req.items.map((item, i) => (
        <Text key={i} style={[styles.reqItem, { color: colors.foreground }]}>
          • {item.glassName}: <Text style={{ fontFamily: "Inter_700Bold" }}>{item.quantity} adet</Text>
        </Text>
      ))}
      {req.notes ? (
        <Text style={[styles.reqNotes, { color: colors.mutedForeground }]}>Not: {req.notes}</Text>
      ) : null}
      {req.adminNote ? (
        <Text style={[styles.reqAdminNote, { color: req.status === "rejected" ? "#ef4444" : "#10b981" }]}>
          Admin: {req.adminNote}
        </Text>
      ) : null}
      {isAdmin && req.status === "pending" && (
        <View style={styles.reqActions}>
          <Pressable onPress={onReview} style={[styles.reviewBtn, { backgroundColor: colors.primary }]}>
            <Feather name="edit-2" size={14} color="#fff" />
            <Text style={styles.reviewBtnText}>Değerlendir</Text>
          </Pressable>
          <Pressable onPress={onDelete} style={[styles.deleteBtn, { borderColor: colors.destructive }]}>
            <Feather name="trash-2" size={14} color={colors.destructive} />
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  header: { paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1 },
  pageTitle: { fontSize: 24, fontFamily: "Inter_700Bold" },
  pageSubtitle: { fontSize: 13, fontFamily: "Inter_500Medium", marginTop: 2 },
  tabRow: { flexDirection: "row", borderBottomWidth: 1 },
  tabBtn: { flex: 1, alignItems: "center", paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: "transparent" },
  tabBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  container: { paddingHorizontal: 16, paddingTop: 16, gap: 14 },
  card: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 12 },
  sectionLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 0.8 },
  dateRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  dateBtn: { width: 40, height: 40, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  dateDisplay: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, height: 44, borderRadius: 10, borderWidth: 1 },
  dateText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  glassRow: { flexDirection: "row", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1 },
  glassName: { fontSize: 13, fontFamily: "Inter_500Medium" },
  glassCode: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  qtyRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  qtyBtn: { width: 32, height: 32, borderRadius: 8, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  qtyText: { fontSize: 15, fontFamily: "Inter_700Bold", minWidth: 24, textAlign: "center" },
  notesInput: { borderRadius: 10, borderWidth: 1, padding: 12, fontSize: 14, fontFamily: "Inter_400Regular", minHeight: 80, textAlignVertical: "top" },
  summaryCard: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 6 },
  summaryTitle: { fontSize: 12, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
  summaryItem: { fontSize: 13, fontFamily: "Inter_400Regular" },
  summaryDate: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 4 },
  submitBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", height: 52, borderRadius: 14, gap: 10 },
  submitBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: "#fff" },
  emptyContainer: { paddingTop: 60, alignItems: "center", gap: 12 },
  emptyText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  reqCard: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 8 },
  reqCardHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  reqCustomer: { fontSize: 15, fontFamily: "Inter_600SemiBold", flex: 1 },
  statusBadge: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusBadgeText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  reqDateRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  reqDate: { fontSize: 12, fontFamily: "Inter_500Medium" },
  reqItem: { fontSize: 13, fontFamily: "Inter_400Regular" },
  reqNotes: { fontSize: 12, fontFamily: "Inter_400Regular", fontStyle: "italic" },
  reqAdminNote: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  reqActions: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 },
  reviewBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 9, borderRadius: 10 },
  reviewBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#fff" },
  deleteBtn: { width: 38, height: 38, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  modalOverlay: { flex: 1, backgroundColor: "#00000055", justifyContent: "flex-end" },
  modalCard: { borderRadius: 24, borderWidth: 1, padding: 24, margin: 12, gap: 14 },
  modalTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  modalCustomer: { fontSize: 13, fontFamily: "Inter_500Medium" },
  modalItems: { borderRadius: 10, borderWidth: 1, padding: 12, gap: 4 },
  modalItem: { fontSize: 13, fontFamily: "Inter_500Medium" },
  modalNote: { fontSize: 12, fontFamily: "Inter_400Regular", fontStyle: "italic" },
  adminNoteInput: { borderRadius: 10, borderWidth: 1, padding: 12, fontSize: 14, fontFamily: "Inter_400Regular", minHeight: 60, textAlignVertical: "top" },
  modalBtns: { flexDirection: "row", gap: 10 },
  rejectBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 12, borderRadius: 12, borderWidth: 1.5 },
  rejectBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  approveBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 12, borderRadius: 12 },
  approveBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#fff" },
  cancelBtn: { alignItems: "center", paddingVertical: 8 },
  cancelBtnText: { fontSize: 14, fontFamily: "Inter_500Medium" },
});
