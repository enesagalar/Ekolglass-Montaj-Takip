import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

export type UserRole = "field" | "admin" | "customer" | null;

export type AssemblyStatus =
  | "cutting"
  | "installation"
  | "installation_done"
  | "water_test"
  | "water_test_failed"
  | "completed";

export interface GlassProduct {
  id: string;
  name: string;
  code: string;
  stock: number;
}

export interface Consumable {
  id: string;
  name: string;
  unit: string;
  stock: number;
  category: "chemical" | "tool" | "other";
}

export const GLASS_PRODUCTS: GlassProduct[] = [
  { id: "g1", name: "SAĞ 1. YAN CAM", code: "DCT-IS R1", stock: 0 },
  { id: "g2", name: "SAĞ 2. YAN CAM", code: "DCT-IS R2", stock: 0 },
  { id: "g3", name: "SAĞ 3. YAN CAM", code: "DCT-IS R3", stock: 0 },
  { id: "g4", name: "SOL 1. YAN CAM", code: "DCT-IS L1", stock: 0 },
  { id: "g5", name: "SOL 2. YAN CAM", code: "DCT-IS L2", stock: 0 },
  { id: "g6", name: "SOL 3. YAN CAM", code: "DCT-IS L3", stock: 0 },
  { id: "g7", name: "SAĞ ARKA KAPAK", code: "DCT-IS B", stock: 0 },
  { id: "g8", name: "SOL ARKA KAPAK", code: "DCT-IS B", stock: 0 },
];

export const DEFAULT_CONSUMABLES: Consumable[] = [
  { id: "c1", name: "Silikon", unit: "adet", stock: 0, category: "chemical" },
  { id: "c2", name: "Primer", unit: "adet", stock: 0, category: "chemical" },
  { id: "c3", name: "Köpük", unit: "adet", stock: 0, category: "chemical" },
  { id: "c4", name: "Bant", unit: "metre", stock: 0, category: "tool" },
  { id: "c5", name: "Temizlik Bezi", unit: "adet", stock: 0, category: "tool" },
  { id: "c6", name: "Koruyucu Örtü", unit: "adet", stock: 0, category: "other" },
];

export const CUSTOMER_NAME = "ISRI";
export const VEHICLE_MODEL = "Fiat Ducato";

export interface PhotoRecord {
  id: string;
  uri: string;
  type: "vin" | "before" | "after" | "defect" | "other";
  timestamp: string;
  note?: string;
}

export interface DefectRecord {
  id: string;
  description: string;
  severity: "low" | "medium" | "high";
  resolved: boolean;
  timestamp: string;
}

export interface AssemblyRecord {
  id: string;
  vin: string;
  vinPhotoUri?: string;
  glassProductIds: string[];
  assignedTo: string;
  status: AssemblyStatus;
  waterTestResult?: "passed" | "failed";
  photos: PhotoRecord[];
  defects: DefectRecord[];
  notes: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

interface AppContextType {
  role: UserRole;
  setRole: (role: UserRole) => void;
  assemblies: AssemblyRecord[];
  glassStock: GlassProduct[];
  consumables: Consumable[];
  addAssembly: (data: Omit<AssemblyRecord, "id" | "createdAt" | "updatedAt">) => AssemblyRecord;
  updateAssembly: (id: string, updates: Partial<AssemblyRecord>) => void;
  deleteAssembly: (id: string) => void;
  getAssembly: (id: string) => AssemblyRecord | undefined;
  addPhoto: (assemblyId: string, photo: Omit<PhotoRecord, "id" | "timestamp">) => void;
  addDefect: (assemblyId: string, defect: Omit<DefectRecord, "id" | "timestamp">) => void;
  updateDefect: (assemblyId: string, defectId: string, updates: Partial<DefectRecord>) => void;
  updateStock: (productId: string, delta: number) => void;
  updateConsumable: (consumableId: string, delta: number) => void;
  staffMembers: string[];
  getGlassProduct: (id: string) => GlassProduct | undefined;
}

const AppContext = createContext<AppContextType | null>(null);

const STORAGE_KEY = "@cam_montaj_assemblies_v3";
const ROLE_KEY = "@cam_montaj_role";
const STOCK_KEY = "@cam_montaj_stock_v3";
const CONSUMABLES_KEY = "@cam_montaj_consumables_v1";

const DEMO_ASSEMBLIES: AssemblyRecord[] = [
  {
    id: "asm-001",
    vin: "VF3YHWMFB13459001",
    glassProductIds: ["g1", "g2"],
    assignedTo: "Mehmet Demir",
    status: "installation",
    photos: [],
    defects: [],
    notes: "Sağ taraf yan camlar değişimi.",
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
  },
  {
    id: "asm-002",
    vin: "VF3YHWMFB13459002",
    glassProductIds: ["g4"],
    assignedTo: "Ali Çelik",
    status: "water_test",
    photos: [],
    defects: [
      { id: "def-001", description: "Sol köşede küçük çizik", severity: "low", resolved: true, timestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString() },
    ],
    notes: "Sol 1. yan cam.",
    createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
  },
  {
    id: "asm-003",
    vin: "VF3YHWMFB13459003",
    glassProductIds: ["g7", "g8"],
    assignedTo: "Hasan Yıldız",
    status: "completed",
    photos: [],
    defects: [],
    notes: "",
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    completedAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    waterTestResult: "passed",
  },
  {
    id: "asm-004",
    vin: "VF3YHWMFB13459004",
    glassProductIds: ["g2"],
    assignedTo: "Ali Çelik",
    status: "cutting",
    photos: [],
    defects: [],
    notes: "Sağ 2. yan cam.",
    createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
  },
  {
    id: "asm-005",
    vin: "VF3YHWMFB13459005",
    glassProductIds: ["g3", "g6"],
    assignedTo: "Murat Özkan",
    status: "water_test_failed",
    photos: [],
    defects: [
      { id: "def-002", description: "Sızdırmazlık yetersiz", severity: "high", resolved: false, timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() },
    ],
    notes: "Su testinden kaldı.",
    createdAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
];

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [role, setRoleState] = useState<UserRole>(null);
  const [assemblies, setAssemblies] = useState<AssemblyRecord[]>([]);
  const [glassStock, setGlassStock] = useState<GlassProduct[]>(GLASS_PRODUCTS);
  const [consumables, setConsumables] = useState<Consumable[]>(DEFAULT_CONSUMABLES);

  const staffMembers = ["Mehmet Demir", "Ali Çelik", "Hasan Yıldız", "Murat Özkan"];

  useEffect(() => {
    const load = async () => {
      try {
        const [savedRole, savedAssemblies, savedStock, savedConsumables] = await Promise.all([
          AsyncStorage.getItem(ROLE_KEY),
          AsyncStorage.getItem(STORAGE_KEY),
          AsyncStorage.getItem(STOCK_KEY),
          AsyncStorage.getItem(CONSUMABLES_KEY),
        ]);
        if (savedRole) setRoleState(savedRole as UserRole);
        if (savedAssemblies) setAssemblies(JSON.parse(savedAssemblies));
        else {
          setAssemblies(DEMO_ASSEMBLIES);
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(DEMO_ASSEMBLIES));
        }
        if (savedStock) {
          setGlassStock(JSON.parse(savedStock));
        } else {
          const initial = GLASS_PRODUCTS.map((g) => ({ ...g, stock: 8 }));
          setGlassStock(initial);
          await AsyncStorage.setItem(STOCK_KEY, JSON.stringify(initial));
        }
        if (savedConsumables) {
          setConsumables(JSON.parse(savedConsumables));
        } else {
          const initial = DEFAULT_CONSUMABLES.map((c) => ({ ...c, stock: 20 }));
          setConsumables(initial);
          await AsyncStorage.setItem(CONSUMABLES_KEY, JSON.stringify(initial));
        }
      } catch {
        setAssemblies(DEMO_ASSEMBLIES);
      }
    };
    load();
  }, []);

  const saveAssemblies = useCallback(async (updated: AssemblyRecord[]) => {
    setAssemblies(updated);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }, []);

  const saveStock = useCallback(async (updated: GlassProduct[]) => {
    setGlassStock(updated);
    await AsyncStorage.setItem(STOCK_KEY, JSON.stringify(updated));
  }, []);

  const saveConsumables = useCallback(async (updated: Consumable[]) => {
    setConsumables(updated);
    await AsyncStorage.setItem(CONSUMABLES_KEY, JSON.stringify(updated));
  }, []);

  const setRole = useCallback(async (r: UserRole) => {
    setRoleState(r);
    if (r) await AsyncStorage.setItem(ROLE_KEY, r);
    else await AsyncStorage.removeItem(ROLE_KEY);
  }, []);

  const addAssembly = useCallback(
    (data: Omit<AssemblyRecord, "id" | "createdAt" | "updatedAt">) => {
      const now = new Date().toISOString();
      const newRecord: AssemblyRecord = { ...data, id: `asm-${Date.now()}`, createdAt: now, updatedAt: now };
      const updated = [newRecord, ...assemblies];
      saveAssemblies(updated);
      const updatedStock = glassStock.map((g) =>
        data.glassProductIds.includes(g.id) ? { ...g, stock: Math.max(0, g.stock - 1) } : g
      );
      saveStock(updatedStock);
      return newRecord;
    },
    [assemblies, glassStock, saveAssemblies, saveStock]
  );

  const updateAssembly = useCallback(
    (id: string, updates: Partial<AssemblyRecord>) => {
      const updated = assemblies.map((a) =>
        a.id === id ? { ...a, ...updates, updatedAt: new Date().toISOString() } : a
      );
      saveAssemblies(updated);
    },
    [assemblies, saveAssemblies]
  );

  const deleteAssembly = useCallback(
    (id: string) => saveAssemblies(assemblies.filter((a) => a.id !== id)),
    [assemblies, saveAssemblies]
  );

  const getAssembly = useCallback(
    (id: string) => assemblies.find((a) => a.id === id),
    [assemblies]
  );

  const addPhoto = useCallback(
    (assemblyId: string, photo: Omit<PhotoRecord, "id" | "timestamp">) => {
      const newPhoto: PhotoRecord = { ...photo, id: `photo-${Date.now()}`, timestamp: new Date().toISOString() };
      const updated = assemblies.map((a) =>
        a.id === assemblyId ? { ...a, photos: [...a.photos, newPhoto], updatedAt: new Date().toISOString() } : a
      );
      saveAssemblies(updated);
    },
    [assemblies, saveAssemblies]
  );

  const addDefect = useCallback(
    (assemblyId: string, defect: Omit<DefectRecord, "id" | "timestamp">) => {
      const newDefect: DefectRecord = { ...defect, id: `def-${Date.now()}`, timestamp: new Date().toISOString() };
      const updated = assemblies.map((a) =>
        a.id === assemblyId ? { ...a, defects: [...a.defects, newDefect], updatedAt: new Date().toISOString() } : a
      );
      saveAssemblies(updated);
    },
    [assemblies, saveAssemblies]
  );

  const updateDefect = useCallback(
    (assemblyId: string, defectId: string, updates: Partial<DefectRecord>) => {
      const updated = assemblies.map((a) =>
        a.id === assemblyId
          ? { ...a, defects: a.defects.map((d) => (d.id === defectId ? { ...d, ...updates } : d)), updatedAt: new Date().toISOString() }
          : a
      );
      saveAssemblies(updated);
    },
    [assemblies, saveAssemblies]
  );

  const updateStock = useCallback(
    (productId: string, delta: number) => {
      const updated = glassStock.map((g) =>
        g.id === productId ? { ...g, stock: Math.max(0, g.stock + delta) } : g
      );
      saveStock(updated);
    },
    [glassStock, saveStock]
  );

  const updateConsumable = useCallback(
    (consumableId: string, delta: number) => {
      const updated = consumables.map((c) =>
        c.id === consumableId ? { ...c, stock: Math.max(0, c.stock + delta) } : c
      );
      saveConsumables(updated);
    },
    [consumables, saveConsumables]
  );

  const getGlassProduct = useCallback(
    (id: string) => glassStock.find((g) => g.id === id),
    [glassStock]
  );

  return (
    <AppContext.Provider
      value={{
        role, setRole, assemblies, glassStock, consumables,
        addAssembly, updateAssembly, deleteAssembly, getAssembly,
        addPhoto, addDefect, updateDefect, updateStock, updateConsumable,
        staffMembers, getGlassProduct,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
}
