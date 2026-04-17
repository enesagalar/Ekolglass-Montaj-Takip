import { Feather } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as XLSX from "xlsx";

import {
  AssemblyRecord,
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

function getBrandName(vehicleModel: string): string {
  return VEHICLE_BRANDS.find((b) => b.id === vehicleModel)?.name ?? vehicleModel;
}

// ─── Excel helpers ────────────────────────────────────────────────────────────

async function saveAndShareXlsx(wb: XLSX.WorkBook, fileName: string) {
  const b64 = XLSX.write(wb, { type: "base64", bookType: "xlsx" });
  const path = `${FileSystem.cacheDirectory}${fileName}`;
  await FileSystem.writeAsStringAsync(path, b64, {
    encoding: FileSystem.EncodingType.Base64,
  });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(path, {
      mimeType:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      dialogTitle: fileName,
      UTI: "com.microsoft.excel.xlsx",
    });
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

// ─── HTML / PDF helpers ───────────────────────────────────────────────────────

function wrapHtml(title: string, body: string): string {
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
  .meta { color: #555; font-size: 10px; margin-bottom: 16px; }
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

// ─── Report generators ────────────────────────────────────────────────────────

function buildAssemblyExcel(assemblies: AssemblyRecord[]): XLSX.WorkBook {
  const header = [
    "Şase No","Araç Modeli","Durum","Saha Personeli",
    "Cam Pozisyonları","Açıklama","Oluşturma Tarihi","Tamamlanma Tarihi",
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

function buildAssemblyHtml(assemblies: AssemblyRecord[]): string {
  const rows = assemblies
    .map(
      (a) => `<tr>
      <td>${a.vin || `···${a.vinLast5}`}</td>
      <td>${getBrandName(a.vehicleModel)}</td>
      <td>${statusBadgeHtml(a.status)}</td>
      <td>${a.assignedTo}</td>
      <td>${a.glassProductIds.length}</td>
      <td>${a.notes || "-"}</td>
      <td>${fmtDateTime(a.createdAt)}</td>
      <td>${a.completedAt ? fmtDateTime(a.completedAt) : "-"}</td>
    </tr>`
    )
    .join("");

  const body = `<table>
    <thead><tr>
      <th>Şase No</th><th>Araç Modeli</th><th>Durum</th>
      <th>Saha Personeli</th><th>Cam Adedi</th><th>Açıklama</th>
      <th>Oluşturma</th><th>Tamamlanma</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
  return wrapHtml("Montaj Raporu", body);
}

function buildRequestExcel(requests: any[]): XLSX.WorkBook {
  const header = [
    "Talep Eden","Oluşturma Tarihi","Teslimat Tarihi",
    "Ürünler","Durum","Admin Notu","Not",
  ];
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

function buildRequestHtml(requests: any[]): string {
  const rows = requests
    .map(
      (r) => `<tr>
      <td>${r.requestedByName}</td>
      <td>${fmtDateTime(r.createdAt)}</td>
      <td>${fmtDate(r.requestedDate)}</td>
      <td>${r.items.map((i: any) => `${i.glassName} x${i.quantity}`).join("<br/>")}</td>
      <td>${statusBadgeHtml(r.status)}</td>
      <td>${r.adminNote || "-"}</td>
      <td>${r.notes || "-"}</td>
    </tr>`
    )
    .join("");

  const body = `<table>
    <thead><tr>
      <th>Talep Eden</th><th>Oluşturma</th><th>Teslimat Tarihi</th>
      <th>Ürünler</th><th>Durum</th><th>Admin Notu</th><th>Not</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
  return wrapHtml("Cam Talep Raporu", body);
}

function buildInvoiceExcel(invoices: any[], assemblies: AssemblyRecord[]): XLSX.WorkBook {
  const header = [
    "Fatura No","Şase No","Araç Modeli","Notlar","Oluşturan","Tarih",
  ];
  const rows = invoices.map((inv) => {
    const asm = assemblies.find((a) => a.id === inv.assembly_id);
    return [
      inv.invoice_number,
      asm ? (asm.vin || `···${asm.vinLast5}`) : "-",
      asm ? getBrandName(asm.vehicleModel) : "-",
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

function buildInvoiceHtml(invoices: any[], assemblies: AssemblyRecord[]): string {
  const rows = invoices
    .map((inv) => {
      const asm = assemblies.find((a) => a.id === inv.assembly_id);
      return `<tr>
        <td>${inv.invoice_number}</td>
        <td>${asm ? (asm.vin || `···${asm.vinLast5}`) : "-"}</td>
        <td>${asm ? getBrandName(asm.vehicleModel) : "-"}</td>
        <td>${inv.notes || "-"}</td>
        <td>${inv.created_by_name || "-"}</td>
        <td>${fmtDateTime(inv.created_at)}</td>
      </tr>`;
    })
    .join("");

  const body = `<table>
    <thead><tr>
      <th>Fatura No</th><th>Şase No</th><th>Araç Modeli</th>
      <th>Notlar</th><th>Oluşturan</th><th>Tarih</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
  return wrapHtml("Fatura Raporu", body);
}

// ─── ReportCard Component ─────────────────────────────────────────────────────

function ReportCard({
  icon,
  title,
  subtitle,
  count,
  onExcel,
  onPdf,
  loading,
  accentColor,
}: {
  icon: string;
  title: string;
  subtitle: string;
  count: number;
  onExcel: () => void;
  onPdf: () => void;
  loading: boolean;
  accentColor: string;
}) {
  const colors = useColors();
  return (
    <View
      style={[
        styles.reportCard,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <View style={styles.reportCardHeader}>
        <View
          style={[
            styles.reportIconWrap,
            { backgroundColor: accentColor + "1a" },
          ]}
        >
          <Feather name={icon as any} size={22} color={accentColor} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.reportTitle, { color: colors.foreground }]}>
            {title}
          </Text>
          <Text
            style={[styles.reportSubtitle, { color: colors.mutedForeground }]}
          >
            {subtitle}
          </Text>
        </View>
        <View
          style={[
            styles.countBadge,
            { backgroundColor: accentColor + "18", borderColor: accentColor + "30" },
          ]}
        >
          <Text style={[styles.countText, { color: accentColor }]}>
            {count}
          </Text>
        </View>
      </View>

      <View style={styles.reportBtns}>
        <Pressable
          onPress={onExcel}
          disabled={loading || count === 0}
          style={({ pressed }) => [
            styles.exportBtn,
            styles.excelBtn,
            {
              opacity: loading || count === 0 ? 0.45 : pressed ? 0.8 : 1,
            },
          ]}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Feather name="grid" size={15} color="#fff" />
              <Text style={styles.exportBtnText}>Excel</Text>
            </>
          )}
        </Pressable>

        <Pressable
          onPress={onPdf}
          disabled={loading || count === 0}
          style={({ pressed }) => [
            styles.exportBtn,
            styles.pdfBtn,
            {
              opacity: loading || count === 0 ? 0.45 : pressed ? 0.8 : 1,
            },
          ]}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Feather name="file-text" size={15} color="#fff" />
              <Text style={styles.exportBtnText}>PDF</Text>
            </>
          )}
        </Pressable>
      </View>

      {count === 0 && (
        <Text
          style={[styles.emptyNote, { color: colors.mutedForeground }]}
        >
          Dışa aktarılacak kayıt yok
        </Text>
      )}
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function ReportsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { assemblies, glassRequests, role } = useApp();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 + 84 : insets.bottom + 84;

  const showInvoice = role === "admin" || role === "accounting";

  const [loadingAssembly, setLoadingAssembly] = useState(false);
  const [loadingRequest, setLoadingRequest] = useState(false);
  const [loadingInvoice, setLoadingInvoice] = useState(false);
  const [invoiceCount, setInvoiceCount] = useState<number>(1);

  React.useEffect(() => {
    if (!showInvoice) return;
    apiGet("/invoices")
      .then((data: any[]) => setInvoiceCount(data.length))
      .catch(() => setInvoiceCount(0));
  }, []);

  // ── Montaj raporu ──
  const exportAssemblyExcel = useCallback(async () => {
    setLoadingAssembly(true);
    try {
      const wb = buildAssemblyExcel(assemblies);
      const date = new Date().toISOString().slice(0, 10);
      await saveAndShareXlsx(wb, `montaj-raporu-${date}.xlsx`);
    } catch (e: any) {
      Alert.alert("Hata", e.message ?? "Excel oluşturulamadı.");
    } finally {
      setLoadingAssembly(false);
    }
  }, [assemblies]);

  const exportAssemblyPdf = useCallback(async () => {
    setLoadingAssembly(true);
    try {
      const html = buildAssemblyHtml(assemblies);
      const { uri } = await Print.printToFileAsync({ html, base64: false });
      const dest = `${FileSystem.cacheDirectory}montaj-raporu-${new Date().toISOString().slice(0,10)}.pdf`;
      await FileSystem.copyAsync({ from: uri, to: dest });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(dest, {
          mimeType: "application/pdf",
          UTI: "com.adobe.pdf",
        });
      } else {
        Alert.alert("Uyarı", "Bu cihazda dosya paylaşımı desteklenmiyor.");
      }
    } catch (e: any) {
      Alert.alert("Hata", e.message ?? "PDF oluşturulamadı.");
    } finally {
      setLoadingAssembly(false);
    }
  }, [assemblies]);

  // ── Cam talep raporu ──
  const exportRequestExcel = useCallback(async () => {
    setLoadingRequest(true);
    try {
      const wb = buildRequestExcel(glassRequests);
      await saveAndShareXlsx(wb, `cam-talep-raporu-${new Date().toISOString().slice(0,10)}.xlsx`);
    } catch (e: any) {
      Alert.alert("Hata", e.message ?? "Excel oluşturulamadı.");
    } finally {
      setLoadingRequest(false);
    }
  }, [glassRequests]);

  const exportRequestPdf = useCallback(async () => {
    setLoadingRequest(true);
    try {
      const html = buildRequestHtml(glassRequests);
      const { uri } = await Print.printToFileAsync({ html, base64: false });
      const dest = `${FileSystem.cacheDirectory}cam-talep-raporu-${new Date().toISOString().slice(0,10)}.pdf`;
      await FileSystem.copyAsync({ from: uri, to: dest });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(dest, { mimeType: "application/pdf", UTI: "com.adobe.pdf" });
      }
    } catch (e: any) {
      Alert.alert("Hata", e.message ?? "PDF oluşturulamadı.");
    } finally {
      setLoadingRequest(false);
    }
  }, [glassRequests]);

  // ── Fatura raporu ──
  const exportInvoiceExcel = useCallback(async () => {
    setLoadingInvoice(true);
    try {
      const invoices = await apiGet("/invoices");
      const wb = buildInvoiceExcel(invoices, assemblies);
      await saveAndShareXlsx(wb, `fatura-raporu-${new Date().toISOString().slice(0,10)}.xlsx`);
    } catch (e: any) {
      Alert.alert("Hata", e.message ?? "Excel oluşturulamadı.");
    } finally {
      setLoadingInvoice(false);
    }
  }, [assemblies]);

  const exportInvoicePdf = useCallback(async () => {
    setLoadingInvoice(true);
    try {
      const invoices = await apiGet("/invoices");
      const html = buildInvoiceHtml(invoices, assemblies);
      const { uri } = await Print.printToFileAsync({ html, base64: false });
      const dest = `${FileSystem.cacheDirectory}fatura-raporu-${new Date().toISOString().slice(0,10)}.pdf`;
      await FileSystem.copyAsync({ from: uri, to: dest });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(dest, { mimeType: "application/pdf", UTI: "com.adobe.pdf" });
      }
    } catch (e: any) {
      Alert.alert("Hata", e.message ?? "PDF oluşturulamadı.");
    } finally {
      setLoadingInvoice(false);
    }
  }, [assemblies]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: topPad + 16,
            backgroundColor: colors.background,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <Text style={[styles.pageTitle, { color: colors.foreground }]}>
          Raporlar
        </Text>
        <Text style={[styles.pageSubtitle, { color: colors.mutedForeground }]}>
          Excel & PDF dışa aktarma
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingBottom: bottomPad },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Info banner */}
        <View
          style={[
            styles.infoBanner,
            { backgroundColor: colors.primary + "10", borderColor: colors.primary + "25" },
          ]}
        >
          <Feather name="info" size={16} color={colors.primary} />
          <Text style={[styles.infoText, { color: colors.foreground }]}>
            Raporlar cihazınıza kaydedilebilir veya e-posta ile paylaşılabilir.
          </Text>
        </View>

        {/* Montaj raporu */}
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
          MONTAJ
        </Text>
        <ReportCard
          icon="tool"
          title="Montaj Raporu"
          subtitle="Tüm araç montaj kayıtları"
          count={assemblies.length}
          onExcel={exportAssemblyExcel}
          onPdf={exportAssemblyPdf}
          loading={loadingAssembly}
          accentColor="#0a84ff"
        />

        {/* Cam talep raporu */}
        <Text
          style={[styles.sectionLabel, { color: colors.mutedForeground, marginTop: 8 }]}
        >
          CAM TALEPLERİ
        </Text>
        <ReportCard
          icon="package"
          title="Cam Talep Raporu"
          subtitle="ISRI cam talebi geçmişi"
          count={glassRequests.length}
          onExcel={exportRequestExcel}
          onPdf={exportRequestPdf}
          loading={loadingRequest}
          accentColor="#f59e0b"
        />

        {/* Fatura raporu */}
        {showInvoice && (
          <>
            <Text
              style={[styles.sectionLabel, { color: colors.mutedForeground, marginTop: 8 }]}
            >
              MUHASEBE
            </Text>
            <ReportCard
              icon="file-text"
              title="Fatura Raporu"
              subtitle="Tüm fatura kayıtları"
              count={0}
              onExcel={exportInvoiceExcel}
              onPdf={exportInvoicePdf}
              loading={loadingInvoice}
              accentColor="#10b981"
            />
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  pageTitle: { fontSize: 24, fontFamily: "Inter_700Bold" },
  pageSubtitle: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    marginTop: 2,
  },
  container: {
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 12,
  },
  infoBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 19,
  },
  sectionLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.8,
    marginBottom: -4,
    paddingHorizontal: 2,
  },
  reportCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 14,
  },
  reportCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  reportIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  reportTitle: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
  },
  reportSubtitle: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  countBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  countText: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
  },
  reportBtns: {
    flexDirection: "row",
    gap: 10,
  },
  exportBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 44,
    borderRadius: 12,
    gap: 8,
  },
  excelBtn: { backgroundColor: "#1d6f42" },
  pdfBtn: { backgroundColor: "#c0392b" },
  exportBtnText: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  emptyNote: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
});
