import { Feather } from "@expo/vector-icons";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
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

import { AssemblyRecord, VEHICLE_BRANDS, useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api";

interface Invoice {
  id: string;
  assembly_id: string;
  invoice_number: string;
  notes: string;
  created_by_name: string;
  created_at: string;
  updated_at: string;
  vin?: string;
  vin_last5?: string;
  vehicle_model?: string;
  status?: string;
  assigned_to?: string;
}

function getBrandName(vehicleModel: string): string {
  return VEHICLE_BRANDS.find((b) => b.id === vehicleModel)?.name ?? vehicleModel;
}

const INVOICE_PREFIX = `EKL${new Date().getFullYear()}`;

const STATUS_LABEL: Record<string, string> = {
  pending: "Beklemede",
  cutting: "Kesimde",
  cutting_done: "Kesim Tamam",
  installation: "Montajda",
  installation_done: "Montaj Tamam",
  water_test: "Su Testi",
  water_test_failed: "Test Başarısız",
  completed: "Tamamlandı",
};

const STATUS_FILTER_OPTIONS = [
  { label: "Tümü", value: "all" },
  { label: "Beklemede", value: "pending" },
  { label: "Kesimde", value: "cutting" },
  { label: "Kesim Tamam", value: "cutting_done" },
  { label: "Montajda", value: "installation" },
  { label: "Montaj Tamam", value: "installation_done" },
  { label: "Su Testi", value: "water_test" },
  { label: "Tamamlandı", value: "completed" },
];

export default function AccountingScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { role, assemblies, refreshAssemblies } = useApp();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 + 84 : insets.bottom + 84;

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modal state
  const [modalAssembly, setModalAssembly] = useState<AssemblyRecord | null>(null);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [invoiceSuffix, setInvoiceSuffix] = useState(""); // 5-digit suffix only
  const [invoiceNotes, setInvoiceNotes] = useState("");
  const [saving, setSaving] = useState(false);

  // Filter state
  const [vinSearch, setVinSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const loadInvoices = useCallback(async () => {
    try {
      const data = await apiGet<Invoice[]>("/invoices");
      setInvoices(data);
    } catch {
      // ignore
    } finally {
      setLoadingInvoices(false);
    }
  }, []);

  useEffect(() => {
    loadInvoices();
  }, [loadInvoices]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadInvoices(), refreshAssemblies()]);
    setRefreshing(false);
  }, [loadInvoices, refreshAssemblies]);

  // Map assemblyId → invoice
  const invoiceMap = new Map<string, Invoice>();
  for (const inv of invoices) {
    invoiceMap.set(inv.assembly_id, inv);
  }

  const openModal = (assembly: AssemblyRecord) => {
    const existing = invoiceMap.get(assembly.id);
    const existingNum = existing?.invoice_number ?? "";
    const suffix = existingNum.startsWith(INVOICE_PREFIX)
      ? existingNum.slice(INVOICE_PREFIX.length)
      : existingNum;
    setModalAssembly(assembly);
    setEditingInvoice(existing ?? null);
    setInvoiceSuffix(suffix);
    setInvoiceNotes(existing?.notes ?? "");
  };

  const closeModal = () => {
    setModalAssembly(null);
    setEditingInvoice(null);
    setInvoiceSuffix("");
    setInvoiceNotes("");
  };

  const handleSave = async () => {
    if (!modalAssembly) return;
    const suffix = invoiceSuffix.trim();
    if (!suffix) {
      Alert.alert("Uyarı", "Fatura numarası boş olamaz.");
      return;
    }
    const fullInvoiceNumber = `${INVOICE_PREFIX}${suffix}`;
    setSaving(true);
    try {
      if (editingInvoice) {
        const updated = await apiPatch<Invoice>(`/invoices/${editingInvoice.id}`, {
          invoiceNumber: fullInvoiceNumber,
          notes: invoiceNotes,
        });
        setInvoices((prev) => prev.map((i) => i.id === updated.id ? updated : i));
      } else {
        const created = await apiPost<Invoice>("/invoices", {
          assemblyId: modalAssembly.id,
          invoiceNumber: fullInvoiceNumber,
          notes: invoiceNotes,
        });
        setInvoices((prev) => [created, ...prev]);
      }
      closeModal();
    } catch (e: any) {
      Alert.alert("Hata", e.message ?? "İşlem başarısız.");
    } finally {
      setSaving(false);
    }
  };

  const filteredAssemblies = useMemo(() => {
    let list = [...assemblies].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
    if (statusFilter !== "all") {
      list = list.filter((a) => a.status === statusFilter);
    }
    const q = vinSearch.trim().toUpperCase();
    if (q) {
      list = list.filter((a) =>
        (a.vin ?? "").toUpperCase().includes(q) ||
        (a.vinLast5 ?? "").toUpperCase().includes(q)
      );
    }
    return list;
  }, [assemblies, statusFilter, vinSearch]);

  const handleDelete = (inv: Invoice) => {
    Alert.alert("Faturayı Sil", `${inv.invoice_number} silinsin mi?`, [
      { text: "Vazgeç", style: "cancel" },
      {
        text: "Sil", style: "destructive",
        onPress: async () => {
          try {
            await apiDelete(`/invoices/${inv.id}`);
            setInvoices((prev) => prev.filter((i) => i.id !== inv.id));
          } catch (e: any) {
            Alert.alert("Hata", e.message ?? "Silinemedi.");
          }
        },
      },
    ]);
  };

  // Accounting + Admin: list of assemblies (can add/edit invoice)
  if (role === "accounting" || role === "admin") {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: topPad + 12, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.foreground }]}>Faturalar</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            {filteredAssemblies.length} montaj · {invoices.length} fatura girilmiş
          </Text>
        </View>

        {/* VIN Search */}
        <View style={[styles.searchWrap, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <View style={[styles.searchBox, { backgroundColor: colors.muted, borderColor: vinSearch ? colors.primary : colors.border }]}>
            <Feather name="search" size={15} color={vinSearch ? colors.primary : colors.mutedForeground} />
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

        {/* Status Filter Chips */}
        <View style={[styles.filterWrap, { borderBottomColor: colors.border }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
            {STATUS_FILTER_OPTIONS.map((opt) => {
              const active = statusFilter === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  onPress={() => setStatusFilter(opt.value)}
                  style={[styles.filterChip, { backgroundColor: active ? colors.primary : colors.muted, borderColor: active ? colors.primary : colors.border }]}
                >
                  <Text style={[styles.filterChipText, { color: active ? "#fff" : colors.mutedForeground }]}>{opt.label}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {loadingInvoices ? (
          <View style={styles.centerLoad}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : (
          <FlatList
            data={filteredAssemblies}
            keyExtractor={(a) => a.id}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
            }
            contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: bottomPad, gap: 10 }}
            showsVerticalScrollIndicator={false}
            renderItem={({ item: assembly }) => {
              const inv = invoiceMap.get(assembly.id);
              return (
                <Pressable
                  onPress={() => openModal(assembly)}
                  style={[styles.assemblyCard, { backgroundColor: colors.card, borderColor: inv ? colors.primary + "40" : colors.border }]}
                >
                  <View style={styles.assemblyCardTop}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.vinText, { color: colors.foreground }]}>
                        {assembly.vin || "—"}
                      </Text>
                      <Text style={[styles.brandText, { color: colors.mutedForeground }]}>
                        {getBrandName(assembly.vehicleModel)} · {assembly.assignedTo}
                      </Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: colors.muted }]}>
                      <Text style={[styles.statusText, { color: colors.mutedForeground }]}>
                        {STATUS_LABEL[assembly.status] ?? assembly.status}
                      </Text>
                    </View>
                  </View>
                  {inv ? (
                    <View style={[styles.invoiceRow, { backgroundColor: colors.primary + "10", borderColor: colors.primary + "25" }]}>
                      <Feather name="file-text" size={13} color={colors.primary} />
                      <Text style={[styles.invoiceNum, { color: colors.primary }]}>{inv.invoice_number}</Text>
                      {inv.notes ? (
                        <Text style={[styles.invoiceNote, { color: colors.mutedForeground }]} numberOfLines={1}>
                          · {inv.notes}
                        </Text>
                      ) : null}
                      <Pressable onPress={() => handleDelete(inv)} style={styles.deleteBtn}>
                        <Feather name="trash-2" size={13} color={colors.destructive} />
                      </Pressable>
                    </View>
                  ) : (
                    <View style={[styles.addInvoiceRow, { borderColor: colors.border }]}>
                      <Feather name="plus-circle" size={13} color={colors.mutedForeground} />
                      <Text style={[styles.addInvoiceText, { color: colors.mutedForeground }]}>Fatura numarası ekle</Text>
                    </View>
                  )}
                </Pressable>
              );
            }}
          />
        )}

        {/* Add/Edit Modal */}
        <Modal visible={!!modalAssembly} transparent animationType="slide" onRequestClose={closeModal}>
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 24}
          >
            <View style={styles.modalOverlay}>
              <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                {/* Handle bar */}
                <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />

                <Text style={[styles.modalTitle, { color: colors.foreground }]}>
                  {editingInvoice ? "Faturayı Düzenle" : "Fatura Ekle"}
                </Text>
                {modalAssembly && (
                  <View style={styles.modalVinRow}>
                    <Feather name="hash" size={13} color={colors.primary} />
                    <Text style={[styles.modalSubtitle, { color: colors.mutedForeground }]}>
                      {modalAssembly.vin || "—"} · {getBrandName(modalAssembly.vehicleModel)}
                    </Text>
                  </View>
                )}

                <View style={styles.modalField}>
                  <Text style={[styles.modalLabel, { color: colors.mutedForeground }]}>FATURA NUMARASI</Text>
                  <View style={[styles.invoiceInputRow, { backgroundColor: colors.muted, borderColor: invoiceSuffix ? colors.primary : colors.border }]}>
                    <View style={[styles.invoicePrefixBox, { borderRightColor: colors.border }]}>
                      <Text style={[styles.invoicePrefixText, { color: colors.mutedForeground }]}>{INVOICE_PREFIX}</Text>
                    </View>
                    <TextInput
                      value={invoiceSuffix}
                      onChangeText={(t) => setInvoiceSuffix(t.replace(/[^0-9]/g, ""))}
                      placeholder="00001"
                      placeholderTextColor={colors.mutedForeground}
                      keyboardType="numeric"
                      maxLength={5}
                      autoFocus
                      style={[styles.invoiceSuffixInput, { color: colors.foreground }]}
                    />
                    {invoiceSuffix.length > 0 && (
                      <View style={[styles.invoicePreviewBadge, { backgroundColor: colors.primary + "15" }]}>
                        <Text style={[styles.invoicePreviewText, { color: colors.primary }]}>
                          {INVOICE_PREFIX}{invoiceSuffix}
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.modalHint, { color: colors.mutedForeground }]}>
                    5 haneli sıra numarasını girin · Tam kod: {INVOICE_PREFIX}{invoiceSuffix || "XXXXX"}
                  </Text>
                </View>

                <View style={styles.modalField}>
                  <Text style={[styles.modalLabel, { color: colors.mutedForeground }]}>NOT (İSTEĞE BAĞLI)</Text>
                  <TextInput
                    value={invoiceNotes}
                    onChangeText={setInvoiceNotes}
                    placeholder="Açıklama..."
                    placeholderTextColor={colors.mutedForeground}
                    multiline
                    numberOfLines={2}
                    style={[styles.modalInput, styles.modalInputMulti, { color: colors.foreground, backgroundColor: colors.muted, borderColor: colors.border }]}
                  />
                </View>

                <View style={styles.modalBtns}>
                  <Pressable onPress={closeModal} style={[styles.modalCancelBtn, { borderColor: colors.border }]}>
                    <Text style={[styles.modalCancelText, { color: colors.mutedForeground }]}>Vazgeç</Text>
                  </Pressable>
                  <Pressable
                    onPress={handleSave}
                    disabled={saving || !invoiceSuffix.trim()}
                    style={[styles.modalSaveBtn, { backgroundColor: invoiceSuffix.trim() ? colors.primary : colors.mutedForeground }]}
                  >
                    <Feather name="save" size={15} color="#fff" />
                    <Text style={styles.modalSaveText}>{saving ? "Kaydediliyor..." : "Kaydet"}</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </View>
    );
  }

  // Customer: read-only invoice list
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 12, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Faturalar</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          {invoices.length} fatura kaydı
        </Text>
      </View>

      {loadingInvoices ? (
        <View style={styles.centerLoad}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={invoices}
          keyExtractor={(i) => i.id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: bottomPad, gap: 10 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Feather name="file-text" size={40} color={colors.mutedForeground} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Henüz fatura girilmemiş</Text>
            </View>
          }
          renderItem={({ item: inv }) => (
            <View style={[styles.invoiceCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.invoiceCardTop}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.invoiceCardNum, { color: colors.primary }]}>{inv.invoice_number}</Text>
                  <Text style={[styles.invoiceCardVin, { color: colors.foreground }]}>{inv.vin || inv.vin_last5 || "—"}</Text>
                  <Text style={[styles.invoiceCardBrand, { color: colors.mutedForeground }]}>
                    {getBrandName(inv.vehicle_model ?? "")} · {STATUS_LABEL[inv.status ?? ""] ?? inv.status}
                  </Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: colors.muted }]}>
                  <Text style={[styles.statusText, { color: colors.mutedForeground }]}>
                    {new Date(inv.created_at).toLocaleDateString("tr-TR")}
                  </Text>
                </View>
              </View>
              {inv.notes ? (
                <Text style={[styles.invoiceCardNote, { color: colors.mutedForeground }]}>{inv.notes}</Text>
              ) : null}
              <Text style={[styles.invoiceCardBy, { color: colors.mutedForeground }]}>
                Girildi: {inv.created_by_name}
              </Text>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 12, borderBottomWidth: 1, gap: 3 },
  title: { fontSize: 24, fontFamily: "Inter_700Bold" },
  subtitle: { fontSize: 13, fontFamily: "Inter_400Regular" },
  centerLoad: { flex: 1, alignItems: "center", justifyContent: "center" },
  // Search
  searchWrap: { paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1 },
  searchBox: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
  searchInput: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", height: 22 },
  // Filter chips
  filterWrap: { borderBottomWidth: 1 },
  filterRow: { paddingHorizontal: 16, paddingVertical: 8, gap: 8, flexDirection: "row", alignItems: "center" },
  filterChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1 },
  filterChipText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  // Assembly cards
  assemblyCard: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 10 },
  assemblyCardTop: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  vinText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  brandText: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusText: { fontSize: 11, fontFamily: "Inter_500Medium" },
  invoiceRow: {
    flexDirection: "row", alignItems: "center", gap: 7,
    paddingHorizontal: 10, paddingVertical: 7, borderRadius: 10, borderWidth: 1,
  },
  invoiceNum: { fontSize: 13, fontFamily: "Inter_700Bold", flex: 1 },
  invoiceNote: { fontSize: 12, fontFamily: "Inter_400Regular", flexShrink: 1 },
  deleteBtn: { padding: 4 },
  addInvoiceRow: {
    flexDirection: "row", alignItems: "center", gap: 7,
    paddingHorizontal: 10, paddingVertical: 7, borderRadius: 10, borderWidth: 1, borderStyle: "dashed",
  },
  addInvoiceText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  modalCard: {
    borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1,
    padding: 24, paddingTop: 16, gap: 16,
  },
  modalHandle: { width: 36, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 4 },
  modalTitle: { fontSize: 20, fontFamily: "Inter_700Bold" },
  modalVinRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: -8 },
  modalSubtitle: { fontSize: 13, fontFamily: "Inter_400Regular" },
  modalField: { gap: 6 },
  modalLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 0.6 },
  modalHint: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  // EKL invoice input
  invoiceInputRow: {
    flexDirection: "row", alignItems: "center", borderRadius: 12, borderWidth: 1.5, overflow: "hidden",
  },
  invoicePrefixBox: {
    paddingHorizontal: 14, height: 48, justifyContent: "center",
    borderRightWidth: 1, backgroundColor: "transparent",
  },
  invoicePrefixText: { fontSize: 15, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
  invoiceSuffixInput: { flex: 1, paddingHorizontal: 12, height: 48, fontSize: 18, fontFamily: "Inter_700Bold", letterSpacing: 1 },
  invoicePreviewBadge: { paddingHorizontal: 10, marginRight: 8, paddingVertical: 4, borderRadius: 8 },
  invoicePreviewText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  modalInput: {
    borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, height: 48,
    fontSize: 15, fontFamily: "Inter_400Regular",
  },
  modalInputMulti: { height: 72, paddingTop: 12, textAlignVertical: "top" },
  modalBtns: { flexDirection: "row", gap: 10 },
  modalCancelBtn: {
    flex: 1, height: 48, borderRadius: 12, borderWidth: 1,
    alignItems: "center", justifyContent: "center",
  },
  modalCancelText: { fontSize: 15, fontFamily: "Inter_500Medium" },
  modalSaveBtn: {
    flex: 2, height: 48, borderRadius: 12,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
  },
  modalSaveText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#fff" },
  // Read-only list
  invoiceCard: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 6 },
  invoiceCardTop: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  invoiceCardNum: { fontSize: 15, fontFamily: "Inter_700Bold" },
  invoiceCardVin: { fontSize: 13, fontFamily: "Inter_500Medium", marginTop: 2 },
  invoiceCardBrand: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 1 },
  invoiceCardNote: { fontSize: 13, fontFamily: "Inter_400Regular", fontStyle: "italic" },
  invoiceCardBy: { fontSize: 11, fontFamily: "Inter_400Regular" },
  adminDeleteBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    alignSelf: "flex-start", marginTop: 4,
  },
  adminDeleteText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  emptyContainer: { paddingTop: 60, alignItems: "center", gap: 12 },
  emptyText: { fontSize: 14, fontFamily: "Inter_500Medium" },
});
