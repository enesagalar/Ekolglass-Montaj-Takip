import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

export type UserRole = "field" | "admin" | "customer" | null;

export type AssemblyStatus =
  | "pending"
  | "cutting"
  | "cutting_done"
  | "installation"
  | "installation_done"
  | "water_test"
  | "water_test_failed"
  | "completed";

export interface AppUser {
  id: string;
  username: string;
  password: string;
  name: string;
  role: "field" | "admin" | "customer";
  active: boolean;
  createdAt: string;
}

export interface GlassProduct {
  id: string;
  name: string;
  code: string;
  suffix: string;
  stock: number;
}

export interface Consumable {
  id: string;
  name: string;
  unit: string;
  stock: number;
  category: "chemical" | "tool" | "other";
}

export interface VehicleBrand {
  id: string;
  name: string;
  prefix: string;
  icon: string;
}

export const VEHICLE_BRANDS: VehicleBrand[] = [
  { id: "fiat-ducato", name: "Fiat Ducato", prefix: "DCT", icon: "truck" },
  { id: "opel-movano", name: "Opel Movano", prefix: "MNV", icon: "truck" },
  { id: "peugeot-boxer", name: "Peugeot Boxer", prefix: "BXR", icon: "truck" },
  { id: "citroen-jumpy", name: "Citroen Jumpy", prefix: "JMP", icon: "truck" },
];

export const GLASS_POSITIONS: GlassProduct[] = [
  { id: "g1", name: "SAĞ 1. YAN CAM", code: "DCT-IS R1", suffix: "R1", stock: 0 },
  { id: "g2", name: "SAĞ 2. YAN CAM", code: "DCT-IS R2", suffix: "R2", stock: 0 },
  { id: "g3", name: "SAĞ 3. YAN CAM", code: "DCT-IS R3", suffix: "R3", stock: 0 },
  { id: "g4", name: "SOL 1. YAN CAM", code: "DCT-IS L1", suffix: "L1", stock: 0 },
  { id: "g5", name: "SOL 2. YAN CAM", code: "DCT-IS L2", suffix: "L2", stock: 0 },
  { id: "g6", name: "SOL 3. YAN CAM", code: "DCT-IS L3", suffix: "L3", stock: 0 },
  { id: "g7", name: "SAĞ ARKA KAPAK", code: "DCT-IS B1", suffix: "B1", stock: 0 },
  { id: "g8", name: "SOL ARKA KAPAK", code: "DCT-IS B2", suffix: "B2", stock: 0 },
];

export const GLASS_PRODUCTS = GLASS_POSITIONS;

export function getBrandGlassCode(vehicleModel: string, suffix: string): string {
  const brand = VEHICLE_BRANDS.find((b) => b.id === vehicleModel) ?? VEHICLE_BRANDS[0];
  return `${brand.prefix}-IS ${suffix}`;
}

export function getBrandName(vehicleModel: string): string {
  return VEHICLE_BRANDS.find((b) => b.id === vehicleModel)?.name ?? "Fiat Ducato";
}

export const DEFAULT_CONSUMABLES: Consumable[] = [
  { id: "c1", name: "Silikon", unit: "adet", stock: 0, category: "chemical" },
  { id: "c2", name: "Primer", unit: "adet", stock: 0, category: "chemical" },
  { id: "c3", name: "Köpük", unit: "adet", stock: 0, category: "chemical" },
  { id: "c4", name: "Bant", unit: "metre", stock: 0, category: "tool" },
  { id: "c5", name: "Temizlik Bezi", unit: "adet", stock: 0, category: "tool" },
  { id: "c6", name: "Koruyucu Örtü", unit: "adet", stock: 0, category: "other" },
];

export const DEFAULT_USERS: AppUser[] = [
  { id: "u-admin", username: "admin", password: "admin123", name: "Sistem Yöneticisi", role: "admin", active: true, createdAt: new Date().toISOString() },
  { id: "u-mehmet", username: "mehmet", password: "1234", name: "Mehmet Demir", role: "field", active: true, createdAt: new Date().toISOString() },
  { id: "u-ali", username: "ali", password: "1234", name: "Ali Çelik", role: "field", active: true, createdAt: new Date().toISOString() },
  { id: "u-hasan", username: "hasan", password: "1234", name: "Hasan Yıldız", role: "field", active: true, createdAt: new Date().toISOString() },
  { id: "u-murat", username: "murat", password: "1234", name: "Murat Özkan", role: "field", active: true, createdAt: new Date().toISOString() },
  { id: "u-isri", username: "isri", password: "isri2024", name: "ISRI", role: "customer", active: true, createdAt: new Date().toISOString() },
];

export const CUSTOMER_NAME = "ISRI";

export type PhotoType =
  | "approval_doc"
  | "vin"
  | "cutting_before"
  | "cutting_after"
  | "installation_before"
  | "installation_after"
  | "water_test"
  | "defect"
  | "other";

export interface PhotoRecord {
  id: string;
  uri: string;
  type: PhotoType;
  timestamp: string;
  note?: string;
  angle?: string;
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
  vehicleModel: string;
  vin: string;
  vinLast5: string;
  approvalDocPhotoUri?: string;
  vinPhotoUri?: string;
  glassProductIds: string[];
  assignedTo: string;
  assignedToUserId?: string;
  status: AssemblyStatus;
  statusTimestamps: Partial<Record<AssemblyStatus, string>>;
  waterTestResult?: "passed" | "failed";
  waterTestCustomerApproval?: "pending" | "approved" | "rejected";
  photos: PhotoRecord[];
  defects: DefectRecord[];
  notes: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  installationCompletedAt?: string;
  activityLog?: ActivityLogEntry[];
}

export interface ActivityLogEntry {
  id: string;
  action: string;
  userId: string;
  userName: string;
  timestamp: string;
}

interface AppContextType {
  currentUser: AppUser | null;
  role: UserRole;
  users: AppUser[];
  login: (username: string, password: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  addUser: (user: Omit<AppUser, "id" | "createdAt">) => void;
  updateUser: (id: string, updates: Partial<AppUser>) => void;
  deleteUser: (id: string) => void;
  assemblies: AssemblyRecord[];
  glassStock: GlassProduct[];
  consumables: Consumable[];
  addAssembly: (data: Omit<AssemblyRecord, "id" | "createdAt" | "updatedAt">) => AssemblyRecord;
  updateAssembly: (id: string, updates: Partial<AssemblyRecord>, logAction?: string) => void;
  deleteAssembly: (id: string) => void;
  getAssembly: (id: string) => AssemblyRecord | undefined;
  addPhoto: (assemblyId: string, photo: Omit<PhotoRecord, "id" | "timestamp">) => void;
  addDefect: (assemblyId: string, defect: Omit<DefectRecord, "id" | "timestamp">) => void;
  updateDefect: (assemblyId: string, defectId: string, updates: Partial<DefectRecord>) => void;
  updateStock: (productId: string, delta: number) => void;
  updateConsumable: (consumableId: string, delta: number) => void;
  getGlassProduct: (id: string) => GlassProduct | undefined;
}

const AppContext = createContext<AppContextType | null>(null);

const STORAGE_KEY = "@cam_montaj_assemblies_v6";
const STOCK_KEY = "@cam_montaj_stock_v6";
const CONSUMABLES_KEY = "@cam_montaj_consumables_v2";
const USERS_KEY = "@cam_montaj_users_v1";
const SESSION_KEY = "@cam_montaj_session_v1";

const DEMO_ASSEMBLIES: AssemblyRecord[] = [
  {
    id: "asm-001",
    vehicleModel: "fiat-ducato",
    vin: "VF3YHWMFB13459001", vinLast5: "59001",
    glassProductIds: ["g1", "g2"],
    assignedTo: "Mehmet Demir", assignedToUserId: "u-mehmet",
    status: "installation",
    statusTimestamps: {
      pending: new Date(Date.now() - 4 * 3600000).toISOString(),
      cutting: new Date(Date.now() - 3.5 * 3600000).toISOString(),
      cutting_done: new Date(Date.now() - 2.5 * 3600000).toISOString(),
      installation: new Date(Date.now() - 2 * 3600000).toISOString(),
    },
    photos: [], defects: [],
    notes: "Sağ taraf yan camlar değişimi.",
    createdAt: new Date(Date.now() - 4 * 3600000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 3600000).toISOString(),
  },
  {
    id: "asm-002",
    vehicleModel: "opel-movano",
    vin: "VF3YHWMFB13459002", vinLast5: "59002",
    glassProductIds: ["g4"],
    assignedTo: "Ali Çelik", assignedToUserId: "u-ali",
    status: "water_test",
    statusTimestamps: {
      pending: new Date(Date.now() - 9 * 3600000).toISOString(),
      cutting: new Date(Date.now() - 8 * 3600000).toISOString(),
      cutting_done: new Date(Date.now() - 7 * 3600000).toISOString(),
      installation: new Date(Date.now() - 6 * 3600000).toISOString(),
      installation_done: new Date(Date.now() - 5 * 3600000).toISOString(),
      water_test: new Date(Date.now() - 4.5 * 3600000).toISOString(),
    },
    installationCompletedAt: new Date(Date.now() - 5 * 3600000).toISOString(),
    waterTestCustomerApproval: "pending",
    photos: [],
    defects: [{ id: "def-001", description: "Sol köşede küçük çizik", severity: "low", resolved: true, timestamp: new Date(Date.now() - 3600000).toISOString() }],
    notes: "Sol 1. yan cam.",
    createdAt: new Date(Date.now() - 9 * 3600000).toISOString(),
    updatedAt: new Date(Date.now() - 4.5 * 3600000).toISOString(),
  },
  {
    id: "asm-003",
    vehicleModel: "peugeot-boxer",
    vin: "VF3YHWMFB13459003", vinLast5: "59003",
    glassProductIds: ["g7", "g8"],
    assignedTo: "Hasan Yıldız", assignedToUserId: "u-hasan",
    status: "completed",
    statusTimestamps: {
      pending: new Date(Date.now() - 26 * 3600000).toISOString(),
      cutting: new Date(Date.now() - 25 * 3600000).toISOString(),
      cutting_done: new Date(Date.now() - 24 * 3600000).toISOString(),
      installation: new Date(Date.now() - 23 * 3600000).toISOString(),
      installation_done: new Date(Date.now() - 20 * 3600000).toISOString(),
      water_test: new Date(Date.now() - 12 * 3600000).toISOString(),
      completed: new Date(Date.now() - 6 * 3600000).toISOString(),
    },
    photos: [], defects: [],
    notes: "", waterTestResult: "passed",
    createdAt: new Date(Date.now() - 26 * 3600000).toISOString(),
    updatedAt: new Date(Date.now() - 6 * 3600000).toISOString(),
    completedAt: new Date(Date.now() - 6 * 3600000).toISOString(),
  },
  {
    id: "asm-004",
    vehicleModel: "fiat-ducato",
    vin: "VF3YHWMFB13459004", vinLast5: "59004",
    glassProductIds: ["g2"],
    assignedTo: "Ali Çelik", assignedToUserId: "u-ali",
    status: "cutting_done",
    statusTimestamps: {
      pending: new Date(Date.now() - 3 * 3600000).toISOString(),
      cutting: new Date(Date.now() - 2.5 * 3600000).toISOString(),
      cutting_done: new Date(Date.now() - 45 * 60000).toISOString(),
    },
    photos: [], defects: [],
    notes: "Sağ 2. yan cam.",
    createdAt: new Date(Date.now() - 3 * 3600000).toISOString(),
    updatedAt: new Date(Date.now() - 45 * 60000).toISOString(),
  },
  {
    id: "asm-005",
    vehicleModel: "citroen-jumpy",
    vin: "VF3YHWMFB13459005", vinLast5: "59005",
    glassProductIds: ["g3", "g6"],
    assignedTo: "Murat Özkan", assignedToUserId: "u-murat",
    status: "water_test_failed",
    statusTimestamps: {
      pending: new Date(Date.now() - 10 * 3600000).toISOString(),
      cutting: new Date(Date.now() - 9 * 3600000).toISOString(),
      cutting_done: new Date(Date.now() - 8 * 3600000).toISOString(),
      installation: new Date(Date.now() - 7 * 3600000).toISOString(),
      installation_done: new Date(Date.now() - 5 * 3600000).toISOString(),
      water_test: new Date(Date.now() - 3 * 3600000).toISOString(),
      water_test_failed: new Date(Date.now() - 2 * 3600000).toISOString(),
    },
    photos: [],
    defects: [{ id: "def-002", description: "Sızdırmazlık yetersiz", severity: "high", resolved: false, timestamp: new Date(Date.now() - 2 * 3600000).toISOString() }],
    notes: "Su testinden kaldı.",
    createdAt: new Date(Date.now() - 10 * 3600000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 3600000).toISOString(),
  },
  {
    id: "asm-006",
    vehicleModel: "opel-movano",
    vin: "VF3YHWMFB13459006", vinLast5: "59006",
    glassProductIds: ["g5"],
    assignedTo: "Hasan Yıldız", assignedToUserId: "u-hasan",
    status: "pending",
    statusTimestamps: {
      pending: new Date(Date.now() - 20 * 60000).toISOString(),
    },
    photos: [], defects: [],
    notes: "",
    createdAt: new Date(Date.now() - 20 * 60000).toISOString(),
    updatedAt: new Date(Date.now() - 20 * 60000).toISOString(),
  },
];

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [assemblies, setAssemblies] = useState<AssemblyRecord[]>([]);
  const [glassStock, setGlassStock] = useState<GlassProduct[]>(GLASS_POSITIONS);
  const [consumables, setConsumables] = useState<Consumable[]>(DEFAULT_CONSUMABLES);

  useEffect(() => {
    const load = async () => {
      try {
        const [savedSession, savedUsers, savedAssemblies, savedStock, savedConsumables] =
          await Promise.all([
            AsyncStorage.getItem(SESSION_KEY),
            AsyncStorage.getItem(USERS_KEY),
            AsyncStorage.getItem(STORAGE_KEY),
            AsyncStorage.getItem(STOCK_KEY),
            AsyncStorage.getItem(CONSUMABLES_KEY),
          ]);

        let userList: AppUser[];
        if (savedUsers) {
          userList = JSON.parse(savedUsers);
        } else {
          userList = DEFAULT_USERS;
          await AsyncStorage.setItem(USERS_KEY, JSON.stringify(DEFAULT_USERS));
        }
        setUsers(userList);

        if (savedSession) {
          const found = userList.find((u) => u.id === savedSession && u.active);
          if (found) setCurrentUser(found);
        }

        if (savedAssemblies) {
          const parsed: AssemblyRecord[] = JSON.parse(savedAssemblies);
          setAssemblies(parsed.map((a) => ({
            ...a,
            vehicleModel: a.vehicleModel ?? "fiat-ducato",
            vinLast5: a.vinLast5 ?? a.vin?.slice(-5) ?? "",
            statusTimestamps: a.statusTimestamps ?? {},
          })));
        } else {
          setAssemblies(DEMO_ASSEMBLIES);
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(DEMO_ASSEMBLIES));
        }

        if (savedStock) {
          const parsed: GlassProduct[] = JSON.parse(savedStock);
          setGlassStock(parsed.map((g) => {
            const pos = GLASS_POSITIONS.find((p) => p.id === g.id);
            return { ...g, suffix: pos?.suffix ?? g.code.split(" ").pop() ?? "R1" };
          }));
        } else {
          const init = GLASS_POSITIONS.map((g) => ({ ...g, stock: 8 }));
          setGlassStock(init);
          await AsyncStorage.setItem(STOCK_KEY, JSON.stringify(init));
        }

        if (savedConsumables) setConsumables(JSON.parse(savedConsumables));
        else {
          const init = DEFAULT_CONSUMABLES.map((c) => ({ ...c, stock: 20 }));
          setConsumables(init);
          await AsyncStorage.setItem(CONSUMABLES_KEY, JSON.stringify(init));
        }
      } catch {
        setAssemblies(DEMO_ASSEMBLIES);
        setUsers(DEFAULT_USERS);
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

  const saveUsers = useCallback(async (updated: AppUser[]) => {
    setUsers(updated);
    await AsyncStorage.setItem(USERS_KEY, JSON.stringify(updated));
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const trimmed = username.trim().toLowerCase();
    const found = users.find(
      (u) => u.username.toLowerCase() === trimmed && u.password === password && u.active
    );
    if (!found) return { success: false, message: "Kullanıcı adı veya şifre hatalı." };
    setCurrentUser(found);
    await AsyncStorage.setItem(SESSION_KEY, found.id);
    return { success: true };
  }, [users]);

  const logout = useCallback(async () => {
    setCurrentUser(null);
    await AsyncStorage.removeItem(SESSION_KEY);
  }, []);

  const addUser = useCallback((user: Omit<AppUser, "id" | "createdAt">) => {
    const newUser: AppUser = { ...user, id: `u-${Date.now()}`, createdAt: new Date().toISOString() };
    saveUsers([...users, newUser]);
  }, [users, saveUsers]);

  const updateUser = useCallback((id: string, updates: Partial<AppUser>) => {
    const updated = users.map((u) => u.id === id ? { ...u, ...updates } : u);
    saveUsers(updated);
    if (currentUser?.id === id) {
      const refreshed = updated.find((u) => u.id === id);
      if (refreshed) setCurrentUser(refreshed);
    }
  }, [users, currentUser, saveUsers]);

  const deleteUser = useCallback((id: string) => {
    saveUsers(users.filter((u) => u.id !== id));
  }, [users, saveUsers]);

  const addAssembly = useCallback(
    (data: Omit<AssemblyRecord, "id" | "createdAt" | "updatedAt">) => {
      const now = new Date().toISOString();
      const logEntry: ActivityLogEntry = {
        id: `log-${Date.now()}`, action: "Kayıt oluşturuldu",
        userId: currentUser?.id ?? "", userName: currentUser?.name ?? "Bilinmiyor", timestamp: now,
      };
      const newRecord: AssemblyRecord = {
        ...data,
        id: `asm-${Date.now()}`, createdAt: now, updatedAt: now,
        statusTimestamps: { pending: now, ...data.statusTimestamps },
        activityLog: [logEntry],
      };
      saveAssemblies([newRecord, ...assemblies]);
      const updatedStock = glassStock.map((g) =>
        data.glassProductIds.includes(g.id) ? { ...g, stock: Math.max(0, g.stock - 1) } : g
      );
      saveStock(updatedStock);
      return newRecord;
    },
    [assemblies, glassStock, currentUser, saveAssemblies, saveStock]
  );

  const updateAssembly = useCallback(
    (id: string, updates: Partial<AssemblyRecord>, logAction?: string) => {
      const now = new Date().toISOString();
      const updated = assemblies.map((a) => {
        if (a.id !== id) return a;
        const log = logAction
          ? [...(a.activityLog ?? []), { id: `log-${Date.now()}`, action: logAction, userId: currentUser?.id ?? "", userName: currentUser?.name ?? "Bilinmiyor", timestamp: now }]
          : a.activityLog;
        const statusTimestamps = { ...a.statusTimestamps };
        if (updates.status && updates.status !== a.status) {
          statusTimestamps[updates.status] = now;
        }
        return { ...a, ...updates, updatedAt: now, activityLog: log, statusTimestamps };
      });
      saveAssemblies(updated);
    },
    [assemblies, currentUser, saveAssemblies]
  );

  const deleteAssembly = useCallback(
    (id: string) => saveAssemblies(assemblies.filter((a) => a.id !== id)),
    [assemblies, saveAssemblies]
  );

  const getAssembly = useCallback((id: string) => assemblies.find((a) => a.id === id), [assemblies]);

  const addPhoto = useCallback(
    (assemblyId: string, photo: Omit<PhotoRecord, "id" | "timestamp">) => {
      const newPhoto: PhotoRecord = { ...photo, id: `photo-${Date.now()}`, timestamp: new Date().toISOString() };
      saveAssemblies(assemblies.map((a) =>
        a.id === assemblyId ? { ...a, photos: [...a.photos, newPhoto], updatedAt: new Date().toISOString() } : a
      ));
    },
    [assemblies, saveAssemblies]
  );

  const addDefect = useCallback(
    (assemblyId: string, defect: Omit<DefectRecord, "id" | "timestamp">) => {
      const newDefect: DefectRecord = { ...defect, id: `def-${Date.now()}`, timestamp: new Date().toISOString() };
      saveAssemblies(assemblies.map((a) =>
        a.id === assemblyId ? { ...a, defects: [...a.defects, newDefect], updatedAt: new Date().toISOString() } : a
      ));
    },
    [assemblies, saveAssemblies]
  );

  const updateDefect = useCallback(
    (assemblyId: string, defectId: string, updates: Partial<DefectRecord>) => {
      saveAssemblies(assemblies.map((a) =>
        a.id === assemblyId
          ? { ...a, defects: a.defects.map((d) => d.id === defectId ? { ...d, ...updates } : d), updatedAt: new Date().toISOString() }
          : a
      ));
    },
    [assemblies, saveAssemblies]
  );

  const updateStock = useCallback((productId: string, delta: number) => {
    saveStock(glassStock.map((g) => g.id === productId ? { ...g, stock: Math.max(0, g.stock + delta) } : g));
  }, [glassStock, saveStock]);

  const updateConsumable = useCallback((consumableId: string, delta: number) => {
    saveConsumables(consumables.map((c) => c.id === consumableId ? { ...c, stock: Math.max(0, c.stock + delta) } : c));
  }, [consumables, saveConsumables]);

  const getGlassProduct = useCallback((id: string) => glassStock.find((g) => g.id === id), [glassStock]);

  const role: UserRole = currentUser?.role ?? null;

  return (
    <AppContext.Provider value={{
      currentUser, role, users, login, logout, addUser, updateUser, deleteUser,
      assemblies, glassStock, consumables,
      addAssembly, updateAssembly, deleteAssembly, getAssembly,
      addPhoto, addDefect, updateDefect, updateStock, updateConsumable, getGlassProduct,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
}
