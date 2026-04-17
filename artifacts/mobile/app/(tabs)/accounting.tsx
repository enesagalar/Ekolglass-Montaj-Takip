import { Feather } from "@expo/vector-icons";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
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
  const [invoiceNum, setInvoiceNum] = useState("");
  const [invoiceNotes, setInvoiceNotes] = useState("");
  const [saving, setSaving] = useState(false);

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
    setModalAssembly(assembly);
    setEditingInvoice(existing ?? null);
    setInvoiceNum(existing?.invoice_number ?? "");
    setInvoiceNotes(existing?.notes ?? "");
  };

  const closeModal = () => {
    setModalAssembly(null);
    setEditingInvoice(null);
    setInvoiceNum("");
    setInvoiceNotes("");
  };

  const handleSave = async () => {
    if (!modalAssembly) return;
    if (!invoiceNum.trim()) {
      Alert.alert("Uyarı", "Fatura numarası boş olamaz.");
      return;
    }
    setSaving(true);
    try {
      if (editingInvoice) {
        const updated = await apiPatch<Invoice>(`/invoices/${editingInvoice.id}`, {
          invoiceNumber: invoiceNum.trim(),
          notes: invoiceNotes,
        });
        setInvoices((prev) => prev.map((i) => i.id === updated.id ? updated : i));
      } else {
        const created = await apiPost<Invoice>("/invoices", {
          assemblyId: modalAssembly.id,
          invoiceNumber: invoiceNum.trim(),
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
    const sortedAssemblies = [...assemblies].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );

    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: topPad + 12, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.foreground }]}>Faturalar</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            {assemblies.length} montaj · {invoices.length} fatura girilmiş
          </Text>
        </View>

        {loadingInvoices ? (
          <View style={styles.centerLoad}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : (
          <FlatList
            data={sortedAssemblies}
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
          <View style={styles.modalOverlay}>
            <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>
                {editingInvoice ? "Faturayı Düzenle" : "Fatura Ekle"}
              </Text>
              {modalAssembly && (
                <Text style={[styles.modalSubtitle, { color: colors.mutedForeground }]}>
                  {modalAssembly.vin} · {getBrandName(modalAssembly.vehicleModel)}
                </Text>
              )}
              <View style={styles.modalField}>
                <Text style={[styles.modalLabel, { color: colors.mutedForeground }]}>FATURA NUMARASI</Text>
                <TextInput
                  value={invoiceNum}
                  onChangeText={setInvoiceNum}
                  placeholder="Örn: FAT-2026-001"
                  placeholderTextColor={colors.mutedForeground}
                  autoFocus
                  style={[styles.modalInput, { color: colors.foreground, backgroundColor: colors.muted, borderColor: colors.border }]}
                />
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
                  disabled={saving}
                  style={[styles.modalSaveBtn, { backgroundColor: colors.primary }]}
                >
                  <Feather name="save" size={15} color="#fff" />
                  <Text style={styles.modalSaveText}>{saving ? "Kaydediliyor..." : "Kaydet"}</Text>
                </Pressable>
              </View>
            </View>
          </View>
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
              {role === "admin" && (
                <Pressable onPress={() => handleDelete(inv)} style={styles.adminDeleteBtn}>
                  <Feather name="trash-2" size={14} color={colors.destructive} />
                  <Text style={[styles.adminDeleteText, { color: colors.destructive }]}>Sil</Text>
                </Pressable>
              )}
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 14, borderBottomWidth: 1, gap: 4 },
  title: { fontSize: 24, fontFamily: "Inter_700Bold" },
  subtitle: { fontSize: 13, fontFamily: "Inter_400Regular" },
  centerLoad: { flex: 1, alignItems: "center", justifyContent: "center" },
  assemblyCard: {
    borderRadius: 14, borderWidth: 1, padding: 14, gap: 10,
  },
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
    padding: 24, gap: 16,
  },
  modalTitle: { fontSize: 20, fontFamily: "Inter_700Bold" },
  modalSubtitle: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: -8 },
  modalField: { gap: 6 },
  modalLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 0.6 },
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
