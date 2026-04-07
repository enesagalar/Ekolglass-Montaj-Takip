import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
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
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AssemblyStatus, useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

const GLASS_TYPES = [
  "Ön Cam",
  "Arka Cam",
  "Ön Sol Yan Cam",
  "Ön Sağ Yan Cam",
  "Arka Sol Yan Cam",
  "Arka Sağ Yan Cam",
  "Panoramik Tavan",
  "Üçgen Cam",
];

export default function NewAssemblyScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { addAssembly, staffMembers, role } = useApp();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const [vin, setVin] = useState("");
  const [vehicleModel, setVehicleModel] = useState("");
  const [vehicleColor, setVehicleColor] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [glassType, setGlassType] = useState(GLASS_TYPES[0]);
  const [glassPartNumber, setGlassPartNumber] = useState("");
  const [assignedTo, setAssignedTo] = useState(staffMembers[0]);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!vin.trim()) {
      Alert.alert("Hata", "Şase numarası zorunludur.");
      return;
    }
    if (vin.trim().length < 10) {
      Alert.alert("Hata", "Geçerli bir şase numarası giriniz (en az 10 karakter).");
      return;
    }
    if (!vehicleModel.trim()) {
      Alert.alert("Hata", "Araç modeli zorunludur.");
      return;
    }
    if (!customerName.trim()) {
      Alert.alert("Hata", "Müşteri adı zorunludur.");
      return;
    }

    setLoading(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const rec = addAssembly({
      vin: vin.trim().toUpperCase(),
      vehicleModel: vehicleModel.trim(),
      vehicleColor: vehicleColor.trim(),
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      glassType,
      glassPartNumber: glassPartNumber.trim(),
      assignedTo,
      notes: notes.trim(),
      status: "pending" as AssemblyStatus,
      photos: [],
      defects: [],
    });

    setLoading(false);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.replace(`/assembly/${rec.id}` as any);
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          {
            paddingTop: topPad + 8,
            backgroundColor: colors.background,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <Pressable onPress={() => router.back()}>
          <Feather name="x" size={24} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>
          Yeni Montaj Kaydı
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAwareScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[
          styles.form,
          { paddingBottom: bottomPad + 32 },
        ]}
        bottomOffset={80}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <SectionLabel label="ARAÇ BİLGİLERİ" colors={colors} />

        <FormField
          label="Şase Numarası (VIN) *"
          colors={colors}
          value={vin}
          onChangeText={(t) => setVin(t.toUpperCase())}
          placeholder="örn. WBA3A5C50DF597152"
          autoCapitalize="characters"
          maxLength={17}
        />

        <FormField
          label="Araç Modeli *"
          colors={colors}
          value={vehicleModel}
          onChangeText={setVehicleModel}
          placeholder="örn. BMW 3 Serisi"
        />

        <FormField
          label="Renk"
          colors={colors}
          value={vehicleColor}
          onChangeText={setVehicleColor}
          placeholder="örn. Siyah"
        />

        <SectionLabel label="MÜŞTERİ BİLGİLERİ" colors={colors} />

        <FormField
          label="Müşteri Adı *"
          colors={colors}
          value={customerName}
          onChangeText={setCustomerName}
          placeholder="Ad Soyad"
        />

        <FormField
          label="Telefon"
          colors={colors}
          value={customerPhone}
          onChangeText={setCustomerPhone}
          placeholder="+90 5xx xxx xx xx"
          keyboardType="phone-pad"
        />

        <SectionLabel label="CAM BİLGİLERİ" colors={colors} />

        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>
            Cam Tipi
          </Text>
          <View style={styles.glassGrid}>
            {GLASS_TYPES.map((type) => (
              <Pressable
                key={type}
                onPress={() => setGlassType(type)}
                style={[
                  styles.glassChip,
                  {
                    backgroundColor:
                      glassType === type ? colors.primary : colors.muted,
                    borderColor:
                      glassType === type ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.glassChipText,
                    { color: glassType === type ? "#fff" : colors.foreground },
                  ]}
                >
                  {type}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <FormField
          label="Parça Numarası"
          colors={colors}
          value={glassPartNumber}
          onChangeText={setGlassPartNumber}
          placeholder="örn. BMW-3F-2021-OEM"
          autoCapitalize="characters"
        />

        <SectionLabel label="ATAMA" colors={colors} />

        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>
            Atanan Personel
          </Text>
          <View style={styles.staffPicker}>
            {staffMembers.map((s) => (
              <Pressable
                key={s}
                onPress={() => setAssignedTo(s)}
                style={[
                  styles.staffChip,
                  {
                    backgroundColor:
                      assignedTo === s ? colors.primary + "15" : colors.muted,
                    borderColor:
                      assignedTo === s ? colors.primary : colors.border,
                  },
                ]}
              >
                <Feather
                  name="user"
                  size={13}
                  color={assignedTo === s ? colors.primary : colors.mutedForeground}
                />
                <Text
                  style={[
                    styles.staffChipText,
                    {
                      color:
                        assignedTo === s ? colors.primary : colors.foreground,
                    },
                  ]}
                >
                  {s}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>
            Notlar
          </Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="Ek bilgi, özel talimatlar..."
            placeholderTextColor={colors.mutedForeground}
            multiline
            numberOfLines={4}
            style={[
              styles.textarea,
              {
                backgroundColor: colors.muted,
                borderColor: colors.border,
                color: colors.foreground,
              },
            ]}
          />
        </View>

        <Pressable
          onPress={handleSubmit}
          disabled={loading}
          style={({ pressed }) => [
            styles.submitBtn,
            {
              backgroundColor: loading ? colors.mutedForeground : colors.primary,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
        >
          <Feather name="check" size={20} color="#fff" />
          <Text style={styles.submitText}>
            {loading ? "Kaydediliyor..." : "Kaydı Oluştur"}
          </Text>
        </Pressable>
      </KeyboardAwareScrollView>
    </View>
  );
}

function SectionLabel({ label, colors }: { label: string; colors: any }) {
  return (
    <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
      {label}
    </Text>
  );
}

function FormField({
  label,
  colors,
  value,
  onChangeText,
  placeholder,
  autoCapitalize,
  keyboardType,
  maxLength,
}: {
  label: string;
  colors: any;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  keyboardType?: "default" | "phone-pad" | "email-address" | "numeric";
  maxLength?: number;
}) {
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: colors.mutedForeground }]}>
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.mutedForeground}
        autoCapitalize={autoCapitalize}
        keyboardType={keyboardType}
        maxLength={maxLength}
        style={[
          styles.input,
          {
            backgroundColor: colors.muted,
            borderColor: colors.border,
            color: colors.foreground,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
  },
  form: {
    padding: 20,
    gap: 12,
  },
  sectionLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1,
    marginTop: 8,
    marginBottom: -4,
  },
  field: {
    gap: 8,
  },
  label: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  input: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  textarea: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    minHeight: 100,
    textAlignVertical: "top",
  },
  glassGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  glassChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  glassChipText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  staffPicker: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  staffChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
  },
  staffChipText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 54,
    borderRadius: 14,
    gap: 10,
    marginTop: 12,
  },
  submitText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },
});
