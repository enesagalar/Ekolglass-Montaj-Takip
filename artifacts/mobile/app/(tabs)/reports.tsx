import { Feather } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
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
import * as XLSX from "xlsx";

import {
  AssemblyRecord,
  AssemblyStatus,
  VEHICLE_BRANDS,
  useApp,
} from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import { apiGet } from "@/lib/api";

const TR_MONTHS = [
  "Ocak","Şubat","Mart","Nisan","Mayıs","Haziran",
  "Temmuz","Ağustos","Eylül","Ekim","Kasım","Aralık",
];

function fmtDate(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return `${d.getDate()} ${TR_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

function fmtDateTime(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return `${d.getDate()} ${TR_MONTHS[d.getMonth()]} ${d.getFullYear()} ${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
}

const STATUS_TR: Record<string, string> = {
  pending: "Beklemede",
  cutting: "Kesimde",
  cutting_done: "Kesim Tamam",
  installation: "Montajda",
  installation_done: "Montaj Tamam",
  water_test: "Su Testi",
  water_test_failed: "Su Testi Başarısız",
  completed: "Tamamlandı",
  approved: "Onaylandı",
  rejected: "Reddedildi",
};

const STATUS_OPTIONS: { label: string; value: string }[] = [
  { label: "Tüm Durumlar", value: "" },
  { label: "Beklemede", value: "pending" },
  { label: "Kesimde", value: "cutting" },
  { label: "Kesim Tamam", value: "cutting_done" },
  { label: "Montajda", value: "installation" },
  { label: "Montaj Tamam", value: "installation_done" },
  { label: "Su Testi", value: "water_test" },
  { label: "Test Başarısız", value: "water_test_failed" },
  { label: "Tamamlandı", value: "completed" },
];

function getBrandName(vehicleModel: string): string {
  return VEHICLE_BRANDS.find((b) => b.id === vehicleModel)?.name ?? vehicleModel;
}

function parseDateInput(str: string): Date | null {
  const parts = str.split(".");
  if (parts.length !== 3) return null;
  const d = parseInt(parts[0]), m = parseInt(parts[1]), y = parseInt(parts[2]);
  if (isNaN(d) || isNaN(m) || isNaN(y)) return null;
  return new Date(y, m - 1, d);
}

async function saveAndShareXlsx(wb: XLSX.WorkBook, fileName: string) {
  const b64 = XLSX.write(wb, { type: "base64", bookType: "xlsx" });
  const file = new FileSystem.File(FileSystem.Paths.cache, fileName);
  if (file.exists) file.delete();
  file.write(b64, { encoding: "base64" });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(file.uri, {
      mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      dialogTitle: fileName,
      UTI: "com.microsoft.excel.xlsx",
    });
  } else {
    Alert.alert("Uyarı", "Bu cihazda dosya paylaşımı desteklenmiyor.");
  }
}

async function saveAndSharePdf(html: string, fileName: string) {
  if (Platform.OS === "web") {
    Alert.alert("Bilgi", "PDF dışa aktarma web sürümünde desteklenmez. Lütfen mobil uygulamayı kullanın.");
    return;
  }
  const { uri } = await Print.printToFileAsync({ html, base64: false });
  const source = new FileSystem.File(uri);
  const dest = new FileSystem.File(FileSystem.Paths.cache, fileName);
  if (dest.exists) dest.delete();
  source.copy(dest);
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(dest.uri, { mimeType: "application/pdf", UTI: "com.adobe.pdf" });
  } else {
    Alert.alert("Uyarı", "Bu cihazda dosya paylaşımı desteklenmiyor.");
  }
}

function styleHeader(ws: XLSX.WorkSheet, row: number, cols: number) {
  for (let c = 0; c < cols; c++) {
    const addr = XLSX.utils.encode_cell({ r: row, c });
    if (!ws[addr]) continue;
    ws[addr].s = {
      font: { bold: true, color: { rgb: "FFFFFF" } },
      fill: { fgColor: { rgb: "1E3A5F" } },
      alignment: { horizontal: "center" },
    };
  }
}

function wrapHtml(title: string, body: string, filters: string): string {
  return `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${title}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; color: #111; font-size: 11px; padding: 24px; }
  h1 { font-size: 18px; color: #1e3a5f; margin-bottom: 4px; }
  .meta { color: #555; font-size: 10px; margin-bottom: 4px; }
  .filters { color: #1e3a5f; font-size: 10px; margin-bottom: 16px; background: #f0f4ff; padding: 6px 10px; border-radius: 4px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
  th { background: #1e3a5f; color: #fff; padding: 7px 8px; text-align: left; font-size: 10px; }
  td { padding: 6px 8px; border-bottom: 1px solid #e5e7eb; vertical-align: top; }
  tr:nth-child(even) td { background: #f8fafc; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 9px; font-weight: bold; }
  .green { background: #d1fae5; color: #065f46; }
  .yellow { background: #fef3c7; color: #92400e; }
  .red { background: #fee2e2; color: #991b1b; }
  .gray { background: #f1f5f9; color: #475569; }
  .blue { background: #dbeafe; color: #1e40af; }
  footer { text-align: right; color: #aaa; font-size: 9px; margin-top: 8px; }
</style>
</head>
<body>
<h1>${title}</h1>
<p class="meta">Oluşturma tarihi: ${fmtDateTime(new Date().toISOString())} · Ekolglass</p>
${filters ? `<p class="filters">Filtreler: ${filters}</p>` : ""}
${body}
<footer>Cam Montaj Takip Sistemi · Ekolglass</footer>
</body>
</html>`;
}

function statusBadgeHtml(status: string): string {
  const label = STATUS_TR[status] ?? status;
  let cls = "gray";
  if (status === "completed") cls = "green";
  else if (status === "water_test_failed") cls = "red";
  else if (status.includes("installation")) cls = "blue";
  else if (status.includes("cutting")) cls = "yellow";
  return `<span class="badge ${cls}">${label}</span>`;
}

function buildAssemblyExcel(assemblies: AssemblyRecord[]): XLSX.WorkBook {
  const header = [
    "Şase No","Araç Modeli","Durum","Saha Personeli",
    "Cam Adedi","Açıklama","Oluşturma Tarihi","Tamamlanma Tarihi",
  ];
  const rows = assemblies.map((a) => [
    a.vin || `···${a.vinLast5}`,
    getBrandName(a.vehicleModel),
    STATUS_TR[a.status] ?? a.status,
    a.assignedTo,
    a.glassProductIds.length,
    a.notes || "",
    fmtDateTime(a.createdAt),
    a.completedAt ? fmtDateTime(a.completedAt) : "",
  ]);
  const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
  ws["!cols"] = [20,16,18,14,10,20,20,20].map((w) => ({ wch: w }));
  styleHeader(ws, 0, header.length);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Montaj Raporu");
  return wb;
}

function buildAssemblyHtml(assemblies: AssemblyRecord[], filterDesc: string): string {
  const rows = assemblies.map((a) => `<tr>
    <td>${a.vin || `···${a.vinLast5}`}</td>
    <td>${getBrandName(a.vehicleModel)}</td>
    <td>${statusBadgeHtml(a.status)}</td>
    <td>${a.assignedTo}</td>
    <td>${a.glassProductIds.length}</td>
    <td>${a.notes || "-"}</td>
    <td>${fmtDateTime(a.createdAt)}</td>
    <td>${a.completedAt ? fmtDateTime(a.completedAt) : "-"}</td>
  </tr>`).join("");
  const body = `<table>
    <thead><tr>
      <th>Şase No</th><th>Araç Modeli</th><th>Durum</th>
      <th>Saha Personeli</th><th>Cam Adedi</th><th>Açıklama</th>
      <th>Oluşturma</th><th>Tamamlanma</th>
    </tr></thead>
    <tbody>${rows || '<tr><td colspan="8" style="text-align:center;color:#aaa">Kayıt yok</td></tr>'}</tbody>
  </table>`;
  return wrapHtml(`Montaj Raporu (${assemblies.length} kayıt)`, body, filterDesc);
}

function buildRequestExcel(requests: any[]): XLSX.WorkBook {
  const header = ["Talep Eden","Oluşturma Tarihi","Teslimat Tarihi","Ürünler","Durum","Admin Notu","Not"];
  const rows = requests.map((r) => [
    r.requestedByName,
    fmtDateTime(r.createdAt),
    fmtDate(r.requestedDate),
    r.items.map((i: any) => `${i.glassName} x${i.quantity}`).join(", "),
    STATUS_TR[r.status] ?? r.status,
    r.adminNote || "",
    r.notes || "",
  ]);
  const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
  ws["!cols"] = [16,22,18,40,14,20,20].map((w) => ({ wch: w }));
  styleHeader(ws, 0, header.length);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Cam Talepleri");
  return wb;
}

function buildRequestHtml(requests: any[], filterDesc: string): string {
  const rows = requests.map((r) => `<tr>
    <td>${r.requestedByName}</td>
    <td>${fmtDateTime(r.createdAt)}</td>
    <td>${fmtDate(r.requestedDate)}</td>
    <td>${r.items.map((i: any) => `${i.glassName} x${i.quantity}`).join("<br/>")}</td>
    <td>${statusBadgeHtml(r.status)}</td>
    <td>${r.adminNote || "-"}</td>
    <td>${r.notes || "-"}</td>
  </tr>`).join("");
  const body = `<table>
    <thead><tr>
      <th>Talep Eden</th><th>Oluşturma</th><th>Teslimat Tarihi</th>
      <th>Ürünler</th><th>Durum</th><th>Admin Notu</th><th>Not</th>
    </tr></thead>
    <tbody>${rows || '<tr><td colspan="7" style="text-align:center;color:#aaa">Kayıt yok</td></tr>'}</tbody>
  </table>`;
  return wrapHtml(`Cam Talep Raporu (${requests.length} kayıt)`, body, filterDesc);
}

function buildInvoiceExcel(invoices: any[], assemblies: AssemblyRecord[]): XLSX.WorkBook {
  const header = ["Fatura No","Şase No","Araç Modeli","Notlar","Oluşturan","Tarih"];
  const rows = invoices.map((inv) => {
    const asm = assemblies.find((a) => a.id === inv.assembly_id);
    return [
      inv.invoice_number,
      asm ? (asm.vin || `···${asm.vinLast5}`) : (inv.vin || "-"),
      asm ? getBrandName(asm.vehicleModel) : (inv.vehicle_model || "-"),
      inv.notes || "",
      inv.created_by_name || "",
      fmtDateTime(inv.created_at),
    ];
  });
  const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
  ws["!cols"] = [20,20,16,30,16,22].map((w) => ({ wch: w }));
  styleHeader(ws, 0, header.length);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Faturalar");
  return wb;
}

function buildInvoiceHtml(invoices: any[], assemblies: AssemblyRecord[], filterDesc: string): string {
  const rows = invoices.map((inv) => {
    const asm = assemblies.find((a) => a.id === inv.assembly_id);
    return `<tr>
      <td>${inv.invoice_number}</td>
      <td>${asm ? (asm.vin || `···${asm.vinLast5}`) : (inv.vin || "-")}</td>
      <td>${asm ? getBrandName(asm.vehicleModel) : (inv.vehicle_model || "-")}</td>
      <td>${inv.notes || "-"}</td>
      <td>${inv.created_by_name || "-"}</td>
      <td>${fmtDateTime(inv.created_at)}</td>
    </tr>`;
  }).join("");
  const body = `<table>
    <thead><tr>
      <th>Fatura No</th><th>Şase No</th><th>Araç Modeli</th>
      <th>Notlar</th><th>Oluşturan</th><th>Tarih</th>
    </tr></thead>
    <tbody>${rows || '<tr><td colspan="6" style="text-align:center;color:#aaa">Kayıt yok</td></tr>'}</tbody>
  </table>`;
  return wrapHtml(`Fatura Raporu (${invoices.length} kayıt)`, body, filterDesc);
}

// ─── Filter Panel ─────────────────────────────────────────────────────────────

function FilterPanel({
  dateFrom, setDateFrom,
  dateTo, setDateTo,
  statusFilter, setStatusFilter,
  brandFilter, setBrandFilter,
  showStatus,
  showBrand,
  colors,
}: {
  dateFrom: string; setDateFrom: (v: string) => void;
  dateTo: string; setDateTo: (v: string) => void;
  statusFilter: string; setStatusFilter: (v: string) => void;
  brandFilter: string; setBrandFilter: (v: string) => void;
  showStatus: boolean;
  showBrand: boolean;
  colors: any;
}) {
  const [expanded, setExpanded] = useState(false);
  const hasFilter = dateFrom || dateTo || statusFilter || brandFilter;

  return (
    <View style={[fpStyles.container, { backgroundColor: colors.card, borderColor: hasFilter ? colors.primary + "50" : colors.border }]}>
      <Pressable style={fpStyles.header} onPress={() => setExpanded(!expanded)}>
        <Feather name="filter" size={15} color={hasFilter ? colors.primary : colors.mutedForeground} />
        <Text style={[fpStyles.headerText, { color: hasFilter ? colors.primary : colors.foreground }]}>
          {hasFilter ? "Filtre uygulandı" : "Filtrele"}
        </Text>
        {hasFilter && (
          <Pressable
            onPress={() => { setDateFrom(""); setDateTo(""); setStatusFilter(""); setBrandFilter(""); }}
            style={[fpStyles.clearBtn, { backgroundColor: colors.destructive + "15" }]}
          >
            <Text style={[fpStyles.clearBtnText, { color: colors.destructive }]}>Temizle</Text>
          </Pressable>
        )}
        <Feather name={expanded ? "chevron-up" : "chevron-down"} size={15} color={colors.mutedForeground} />
      </Pressable>

      {expanded && (
        <View style={fpStyles.body}>
          <View style={fpStyles.row}>
            <View style={fpStyles.half}>
              <Text style={[fpStyles.label, { color: colors.mutedForeground }]}>Başlangıç (GG.AA.YYYY)</Text>
              <TextInput
                value={dateFrom}
                onChangeText={setDateFrom}
                placeholder="01.01.2026"
                placeholderTextColor={colors.mutedForeground}
                keyboardType="numeric"
                style={[fpStyles.input, { color: colors.foreground, backgroundColor: colors.muted, borderColor: colors.border }]}
              />
            </View>
            <View style={fpStyles.half}>
              <Text style={[fpStyles.label, { color: colors.mutedForeground }]}>Bitiş (GG.AA.YYYY)</Text>
              <TextInput
                value={dateTo}
                onChangeText={setDateTo}
                placeholder="31.12.2026"
                placeholderTextColor={colors.mutedForeground}
                keyboardType="numeric"
                style={[fpStyles.input, { color: colors.foreground, backgroundColor: colors.muted, borderColor: colors.border }]}
              />
            </View>
          </View>

          {showStatus && (
            <>
              <Text style={[fpStyles.label, { color: colors.mutedForeground, marginTop: 10 }]}>Durum</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={fpStyles.chips}>
                {STATUS_OPTIONS.map((opt) => {
                  const active = statusFilter === opt.value;
                  return (
                    <Pressable
                      key={opt.value}
                      onPress={() => setStatusFilter(active ? "" : opt.value)}
                      style={[fpStyles.chip, {
                        backgroundColor: active ? colors.primary : colors.muted,
                        borderColor: active ? colors.primary : colors.border,
                      }]}
                    >
                      <Text style={[fpStyles.chipText, { color: active ? "#fff" : colors.mutedForeground }]}>{opt.label}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </>
          )}

          {showBrand && (
            <>
              <Text style={[fpStyles.label, { color: colors.mutedForeground, marginTop: 10 }]}>Araç Markası</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={fpStyles.chips}>
                <Pressable
                  onPress={() => setBrandFilter("")}
                  style={[fpStyles.chip, {
                    backgroundColor: !brandFilter ? colors.primary : colors.muted,
                    borderColor: !brandFilter ? colors.primary : colors.border,
                  }]}
                >
                  <Text style={[fpStyles.chipText, { color: !brandFilter ? "#fff" : colors.mutedForeground }]}>Tümü</Text>
                </Pressable>
                {VEHICLE_BRANDS.map((b) => {
                  const active = brandFilter === b.id;
                  return (
                    <Pressable
                      key={b.id}
                      onPress={() => setBrandFilter(active ? "" : b.id)}
                      style={[fpStyles.chip, {
                        backgroundColor: active ? colors.primary : colors.muted,
                        borderColor: active ? colors.primary : colors.border,
                      }]}
                    >
                      <Text style={[fpStyles.chipText, { color: active ? "#fff" : colors.mutedForeground }]}>{b.name}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </>
          )}
        </View>
      )}
    </View>
  );
}

const fpStyles = StyleSheet.create({
  container: { borderRadius: 14, borderWidth: 1, overflow: "hidden" },
  header: { flexDirection: "row", alignItems: "center", gap: 8, padding: 14 },
  headerText: { flex: 1, fontSize: 14, fontFamily: "Inter_500Medium" },
  clearBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  clearBtnText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  body: { paddingHorizontal: 14, paddingBottom: 14, gap: 4 },
  row: { flexDirection: "row", gap: 10 },
  half: { flex: 1, gap: 4 },
  label: { fontSize: 11, fontFamily: "Inter_500Medium" },
  input: { borderRadius: 8, borderWidth: 1, paddingHorizontal: 10, height: 38, fontSize: 13, fontFamily: "Inter_400Regular" },
  chips: { flexDirection: "row", gap: 6, paddingVertical: 4 },
  chip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 16, borderWidth: 1 },
  chipText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
});

// ─── Report Card ──────────────────────────────────────────────────────────────

function ReportCard({
  icon, title, subtitle, count, onExcel, onPdf, loading, accentColor,
}: {
  icon: string; title: string; subtitle: string; count: number;
  onExcel: () => void; onPdf: () => void; loading: boolean; accentColor: string;
}) {
  const colors = useColors();
  return (
    <View style={[rcStyles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={rcStyles.header}>
        <View style={[rcStyles.iconWrap, { backgroundColor: accentColor + "1a" }]}>
          <Feather name={icon as any} size={22} color={accentColor} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[rcStyles.title, { color: colors.foreground }]}>{title}</Text>
          <Text style={[rcStyles.subtitle, { color: colors.mutedForeground }]}>{subtitle}</Text>
        </View>
        <View style={[rcStyles.countBadge, { backgroundColor: accentColor + "18", borderColor: accentColor + "30" }]}>
          <Text style={[rcStyles.countText, { color: accentColor }]}>{count}</Text>
        </View>
      </View>

      {count === 0 && (
        <Text style={[rcStyles.emptyNote, { color: colors.mutedForeground }]}>
          Filtrelerinizle eşleşen kayıt yok
        </Text>
      )}

      <View style={rcStyles.btns}>
        <Pressable
          onPress={onExcel}
          disabled={loading}
          style={({ pressed }) => [rcStyles.btn, rcStyles.excelBtn, { opacity: loading ? 0.6 : pressed ? 0.8 : 1 }]}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Feather name="grid" size={15} color="#fff" />
              <Text style={rcStyles.btnText}>Excel İndir</Text>
            </>
          )}
        </Pressable>
        <Pressable
          onPress={onPdf}
          disabled={loading}
          style={({ pressed }) => [rcStyles.btn, rcStyles.pdfBtn, { opacity: loading ? 0.6 : pressed ? 0.8 : 1 }]}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Feather name="file-text" size={15} color="#fff" />
              <Text style={rcStyles.btnText}>PDF İndir</Text>
            </>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const rcStyles = StyleSheet.create({
  card: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 14 },
  header: { flexDirection: "row", alignItems: "center", gap: 12 },
  iconWrap: { width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 15, fontFamily: "Inter_700Bold" },
  subtitle: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  countBadge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
  countText: { fontSize: 15, fontFamily: "Inter_700Bold" },
  emptyNote: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", paddingVertical: 4 },
  btns: { flexDirection: "row", gap: 10 },
  btn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", height: 44, borderRadius: 12, gap: 8 },
  excelBtn: { backgroundColor: "#217346" },
  pdfBtn: { backgroundColor: "#c0392b" },
  btnText: { color: "#fff", fontSize: 14, fontFamily: "Inter_600SemiBold" },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function ReportsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { assemblies, glassRequests, role } = useApp();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 + 84 : insets.bottom + 84;

  const showInvoice = role === "admin" || role === "accounting";

  // Shared filters
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Assembly filters
  const [asmStatus, setAsmStatus] = useState("");
  const [asmBrand, setAsmBrand] = useState("");

  // Request filters
  const [reqStatus, setReqStatus] = useState("");

  // Loading
  const [loadingAsm, setLoadingAsm] = useState(false);
  const [loadingReq, setLoadingReq] = useState(false);
  const [loadingInv, setLoadingInv] = useState(false);
  const [invoices, setInvoices] = useState<any[]>([]);

  useEffect(() => {
    if (!showInvoice) return;
    apiGet<any[]>("/invoices").then(setInvoices).catch(() => {});
  }, []);

  // ── Filtered data ──
  const filteredAssemblies = useMemo(() => {
    let list = assemblies;
    const fromDate = dateFrom ? parseDateInput(dateFrom) : null;
    const toDate = dateTo ? parseDateInput(dateTo) : null;
    if (toDate) toDate.setHours(23, 59, 59, 999);
    if (fromDate) list = list.filter((a) => new Date(a.createdAt) >= fromDate);
    if (toDate) list = list.filter((a) => new Date(a.createdAt) <= toDate);
    if (asmStatus) list = list.filter((a) => a.status === asmStatus);
    if (asmBrand) list = list.filter((a) => a.vehicleModel === asmBrand);
    return list;
  }, [assemblies, dateFrom, dateTo, asmStatus, asmBrand]);

  const filteredRequests = useMemo(() => {
    let list = glassRequests;
    const fromDate = dateFrom ? parseDateInput(dateFrom) : null;
    const toDate = dateTo ? parseDateInput(dateTo) : null;
    if (toDate) toDate.setHours(23, 59, 59, 999);
    if (fromDate) list = list.filter((r) => new Date(r.createdAt) >= fromDate);
    if (toDate) list = list.filter((r) => new Date(r.createdAt) <= toDate);
    if (reqStatus) list = list.filter((r) => r.status === reqStatus);
    return list;
  }, [glassRequests, dateFrom, dateTo, reqStatus]);

  const filteredInvoices = useMemo(() => {
    let list = invoices;
    const fromDate = dateFrom ? parseDateInput(dateFrom) : null;
    const toDate = dateTo ? parseDateInput(dateTo) : null;
    if (toDate) toDate.setHours(23, 59, 59, 999);
    if (fromDate) list = list.filter((i) => new Date(i.created_at) >= fromDate);
    if (toDate) list = list.filter((i) => new Date(i.created_at) <= toDate);
    return list;
  }, [invoices, dateFrom, dateTo]);

  function buildFilterDesc(extras: string[] = []): string {
    const parts: string[] = [];
    if (dateFrom) parts.push(`Başlangıç: ${dateFrom}`);
    if (dateTo) parts.push(`Bitiş: ${dateTo}`);
    parts.push(...extras);
    return parts.join(" · ");
  }

  // ── Assembly export ──
  const exportAsmExcel = useCallback(async () => {
    setLoadingAsm(true);
    try {
      const wb = buildAssemblyExcel(filteredAssemblies);
      await saveAndShareXlsx(wb, `montaj-raporu-${new Date().toISOString().slice(0,10)}.xlsx`);
    } catch (e: any) {
      Alert.alert("Hata", e.message ?? "Excel oluşturulamadı.");
    } finally { setLoadingAsm(false); }
  }, [filteredAssemblies]);

  const exportAsmPdf = useCallback(async () => {
    setLoadingAsm(true);
    try {
      const extras = [];
      if (asmStatus) extras.push(`Durum: ${STATUS_TR[asmStatus]}`);
      if (asmBrand) extras.push(`Marka: ${getBrandName(asmBrand)}`);
      const html = buildAssemblyHtml(filteredAssemblies, buildFilterDesc(extras));
      await saveAndSharePdf(html, `montaj-raporu-${new Date().toISOString().slice(0,10)}.pdf`);
    } catch (e: any) {
      Alert.alert("Hata", e.message ?? "PDF oluşturulamadı.");
    } finally { setLoadingAsm(false); }
  }, [filteredAssemblies, dateFrom, dateTo, asmStatus, asmBrand]);

  // ── Request export ──
  const exportReqExcel = useCallback(async () => {
    setLoadingReq(true);
    try {
      const wb = buildRequestExcel(filteredRequests);
      await saveAndShareXlsx(wb, `cam-talep-raporu-${new Date().toISOString().slice(0,10)}.xlsx`);
    } catch (e: any) {
      Alert.alert("Hata", e.message ?? "Excel oluşturulamadı.");
    } finally { setLoadingReq(false); }
  }, [filteredRequests]);

  const exportReqPdf = useCallback(async () => {
    setLoadingReq(true);
    try {
      const extras = reqStatus ? [`Durum: ${STATUS_TR[reqStatus]}`] : [];
      const html = buildRequestHtml(filteredRequests, buildFilterDesc(extras));
      await saveAndSharePdf(html, `cam-talep-raporu-${new Date().toISOString().slice(0,10)}.pdf`);
    } catch (e: any) {
      Alert.alert("Hata", e.message ?? "PDF oluşturulamadı.");
    } finally { setLoadingReq(false); }
  }, [filteredRequests, dateFrom, dateTo, reqStatus]);

  // ── Invoice export ──
  const exportInvExcel = useCallback(async () => {
    setLoadingInv(true);
    try {
      const fresh = await apiGet<any[]>("/invoices");
      setInvoices(fresh);
      const wb = buildInvoiceExcel(filteredInvoices.length ? filteredInvoices : fresh, assemblies);
      await saveAndShareXlsx(wb, `fatura-raporu-${new Date().toISOString().slice(0,10)}.xlsx`);
    } catch (e: any) {
      Alert.alert("Hata", e.message ?? "Excel oluşturulamadı.");
    } finally { setLoadingInv(false); }
  }, [filteredInvoices, assemblies]);

  const exportInvPdf = useCallback(async () => {
    setLoadingInv(true);
    try {
      const fresh = await apiGet<any[]>("/invoices");
      setInvoices(fresh);
      const toExport = filteredInvoices.length ? filteredInvoices : fresh;
      const html = buildInvoiceHtml(toExport, assemblies, buildFilterDesc());
      await saveAndSharePdf(html, `fatura-raporu-${new Date().toISOString().slice(0,10)}.pdf`);
    } catch (e: any) {
      Alert.alert("Hata", e.message ?? "PDF oluşturulamadı.");
    } finally { setLoadingInv(false); }
  }, [filteredInvoices, assemblies, dateFrom, dateTo]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.header, { paddingTop: topPad + 16, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <Text style={[styles.pageTitle, { color: colors.foreground }]}>Raporlar</Text>
        <Text style={[styles.pageSubtitle, { color: colors.mutedForeground }]}>Excel & PDF dışa aktarma</Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.container, { paddingBottom: bottomPad }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Global date filter */}
        <View style={[styles.globalFilterCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.globalFilterHeader}>
            <Feather name="calendar" size={15} color={colors.primary} />
            <Text style={[styles.globalFilterTitle, { color: colors.foreground }]}>Tarih Aralığı</Text>
            {(dateFrom || dateTo) && (
              <Pressable onPress={() => { setDateFrom(""); setDateTo(""); }} style={[styles.clearBtn, { backgroundColor: colors.destructive + "15" }]}>
                <Text style={[styles.clearBtnText, { color: colors.destructive }]}>Temizle</Text>
              </Pressable>
            )}
          </View>
          <View style={styles.dateRow}>
            <View style={styles.dateField}>
              <Text style={[styles.dateLabel, { color: colors.mutedForeground }]}>Başlangıç</Text>
              <TextInput
                value={dateFrom}
                onChangeText={setDateFrom}
                placeholder="01.01.2026"
                placeholderTextColor={colors.mutedForeground}
                keyboardType="numeric"
                style={[styles.dateInput, { color: colors.foreground, backgroundColor: colors.muted, borderColor: dateFrom ? colors.primary : colors.border }]}
              />
            </View>
            <Feather name="arrow-right" size={14} color={colors.mutedForeground} style={{ marginTop: 22 }} />
            <View style={styles.dateField}>
              <Text style={[styles.dateLabel, { color: colors.mutedForeground }]}>Bitiş</Text>
              <TextInput
                value={dateTo}
                onChangeText={setDateTo}
                placeholder="31.12.2026"
                placeholderTextColor={colors.mutedForeground}
                keyboardType="numeric"
                style={[styles.dateInput, { color: colors.foreground, backgroundColor: colors.muted, borderColor: dateTo ? colors.primary : colors.border }]}
              />
            </View>
          </View>
        </View>

        {/* Montaj */}
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>MONTAJ</Text>
        <View style={[styles.filterSection, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.filterSectionTitle, { color: colors.mutedForeground }]}>Durum Filtresi</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            {STATUS_OPTIONS.map((opt) => {
              const active = asmStatus === opt.value;
              return (
                <Pressable key={opt.value} onPress={() => setAsmStatus(active && opt.value ? "" : opt.value)}
                  style={[styles.chip, { backgroundColor: active ? colors.primary : colors.muted, borderColor: active ? colors.primary : colors.border }]}>
                  <Text style={[styles.chipText, { color: active ? "#fff" : colors.mutedForeground }]}>{opt.label}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
          <Text style={[styles.filterSectionTitle, { color: colors.mutedForeground, marginTop: 8 }]}>Araç Markası</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            {[{ id: "", name: "Tüm Markalar" }, ...VEHICLE_BRANDS].map((b) => {
              const active = asmBrand === b.id;
              return (
                <Pressable key={b.id} onPress={() => setAsmBrand(active && b.id ? "" : b.id)}
                  style={[styles.chip, { backgroundColor: active ? colors.primary : colors.muted, borderColor: active ? colors.primary : colors.border }]}>
                  <Text style={[styles.chipText, { color: active ? "#fff" : colors.mutedForeground }]}>{b.name}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
        <ReportCard
          icon="tool" title="Montaj Raporu" subtitle="Araç montaj kayıtları"
          count={filteredAssemblies.length}
          onExcel={exportAsmExcel} onPdf={exportAsmPdf}
          loading={loadingAsm} accentColor="#0a84ff"
        />

        {/* Cam talepleri */}
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground, marginTop: 4 }]}>CAM TALEPLERİ</Text>
        <View style={[styles.filterSection, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.filterSectionTitle, { color: colors.mutedForeground }]}>Durum Filtresi</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            {[{ label: "Tümü", value: "" }, { label: "Beklemede", value: "pending" }, { label: "Onaylandı", value: "approved" }, { label: "Reddedildi", value: "rejected" }].map((opt) => {
              const active = reqStatus === opt.value;
              return (
                <Pressable key={opt.value} onPress={() => setReqStatus(active && opt.value ? "" : opt.value)}
                  style={[styles.chip, { backgroundColor: active ? "#f59e0b" : colors.muted, borderColor: active ? "#f59e0b" : colors.border }]}>
                  <Text style={[styles.chipText, { color: active ? "#fff" : colors.mutedForeground }]}>{opt.label}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
        <ReportCard
          icon="package" title="Cam Talep Raporu" subtitle="ISRI cam talebi geçmişi"
          count={filteredRequests.length}
          onExcel={exportReqExcel} onPdf={exportReqPdf}
          loading={loadingReq} accentColor="#f59e0b"
        />

        {/* Fatura */}
        {showInvoice && (
          <>
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground, marginTop: 4 }]}>MUHASEBE</Text>
            <ReportCard
              icon="file-text" title="Fatura Raporu" subtitle="Tüm fatura kayıtları"
              count={filteredInvoices.length}
              onExcel={exportInvExcel} onPdf={exportInvPdf}
              loading={loadingInv} accentColor="#10b981"
            />
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1 },
  pageTitle: { fontSize: 24, fontFamily: "Inter_700Bold" },
  pageSubtitle: { fontSize: 13, fontFamily: "Inter_500Medium", marginTop: 2 },
  container: { paddingHorizontal: 16, paddingTop: 16, gap: 12 },
  globalFilterCard: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 10 },
  globalFilterHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  globalFilterTitle: { flex: 1, fontSize: 14, fontFamily: "Inter_600SemiBold" },
  clearBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  clearBtnText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  dateRow: { flexDirection: "row", alignItems: "flex-end", gap: 8 },
  dateField: { flex: 1, gap: 4 },
  dateLabel: { fontSize: 11, fontFamily: "Inter_500Medium" },
  dateInput: { borderRadius: 8, borderWidth: 1, paddingHorizontal: 10, height: 38, fontSize: 13, fontFamily: "Inter_400Regular" },
  sectionLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 0.8, paddingHorizontal: 2 },
  filterSection: { borderRadius: 12, borderWidth: 1, padding: 12, gap: 6 },
  filterSectionTitle: { fontSize: 11, fontFamily: "Inter_500Medium" },
  chips: { flexDirection: "row", gap: 6 },
  chip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14, borderWidth: 1 },
  chipText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
});
