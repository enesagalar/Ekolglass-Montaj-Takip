import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { apiGet, apiPost, apiPatch, apiDelete, setTokens, clearTokens, getApiBase } from "../lib/api";

function toProxyUri(uri: string): string {
  if (!uri) return uri;
  if (uri.startsWith("file://") || uri.startsWith("content://")) return uri;
  if (uri.includes(".r2.dev/")) {
    const key = uri.split(".r2.dev/")[1];
    if (key) {
      const base = getApiBase();
      return `${base}/photos/proxy?key=${encodeURIComponent(key)}`;
    }
  }
  return uri;
}

export type UserRole = "field" | "admin" | "customer" | "accounting" | null;

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
  authId?: string;
  username: string;
  password?: string;
  name: string;
  role: "field" | "admin" | "customer" | "accounting";
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
  { id: "c4", name: "Bant", unit: "metre", stock: 0, category: "tool" },
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
  photoUri?: string;
  addedByRole?: "field" | "admin" | "customer";
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

export interface GlassRequestItem {
  glassId: string;
  glassName: string;
  quantity: number;
}

export interface GlassRequest {
  id: string;
  requestedBy: string;
  requestedByName: string;
  items: GlassRequestItem[];
  requestedDate: string;
  status: "pending" | "approved" | "rejected";
  adminNote?: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

function dbRowToGlassRequest(row: any): GlassRequest {
  return {
    id: row.id,
    requestedBy: row.requested_by ?? "",
    requestedByName: row.requested_by_name ?? "",
    items: row.items ?? [],
    requestedDate: row.requested_date ?? "",
    status: row.status ?? "pending",
    adminNote: row.admin_note ?? undefined,
    notes: row.notes ?? "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// Convert snake_case DB row to camelCase AssemblyRecord
function dbRowToAssembly(row: any): AssemblyRecord {
  return {
    id: row.id,
    vehicleModel: row.vehicle_model ?? "fiat-ducato",
    vin: row.vin ?? "",
    vinLast5: row.vin_last5 ?? row.vin?.slice(-5) ?? "",
    approvalDocPhotoUri: row.approval_doc_photo_uri ? toProxyUri(row.approval_doc_photo_uri) : undefined,
    vinPhotoUri: row.vin_photo_uri ? toProxyUri(row.vin_photo_uri) : undefined,
    glassProductIds: row.glass_product_ids ?? [],
    assignedTo: row.assigned_to ?? "",
    assignedToUserId: row.assigned_to_user_id,
    status: row.status ?? "pending",
    statusTimestamps: row.status_timestamps ?? {},
    waterTestResult: row.water_test_result,
    waterTestCustomerApproval: row.water_test_customer_approval,
    photos: (row.photos ?? []).map((p: any): PhotoRecord => ({
      id: p.id,
      uri: toProxyUri(p.uri),
      type: p.type,
      timestamp: p.created_at,
      note: p.note,
      angle: p.angle,
    })),
    defects: (row.defects ?? []).map((d: any): DefectRecord => ({
      id: d.id,
      description: d.description,
      severity: d.severity,
      resolved: d.resolved,
      timestamp: d.created_at,
      photoUri: d.photo_uri ? toProxyUri(d.photo_uri) : undefined,
      addedByRole: d.added_by_role ?? "field",
    })),
    notes: row.notes ?? "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    completedAt: row.completed_at,
    installationCompletedAt: row.installation_completed_at,
    activityLog: (row.activity_log ?? []).map((l: any): ActivityLogEntry => ({
      id: l.id,
      action: l.action,
      userId: l.user_id ?? "",
      userName: l.user_name ?? "",
      timestamp: l.created_at,
    })),
  };
}

function dbRowToStock(row: any): GlassProduct {
  return {
    id: row.id,
    name: row.name,
    code: row.code,
    suffix: row.suffix,
    stock: row.stock ?? 0,
  };
}

interface AppContextType {
  currentUser: AppUser | null;
  role: UserRole;
  users: AppUser[];
  isLoading: boolean;
  apiError: string | null;
  login: (username: string, password: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
  addUser: (user: Omit<AppUser, "id" | "createdAt">) => Promise<void>;
  updateUser: (id: string, updates: Partial<AppUser>) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  assemblies: AssemblyRecord[];
  glassStock: GlassProduct[];
  consumables: Consumable[];
  addAssembly: (data: Omit<AssemblyRecord, "id" | "createdAt" | "updatedAt">) => Promise<AssemblyRecord>;
  updateAssembly: (id: string, updates: Partial<AssemblyRecord>, logAction?: string) => Promise<void>;
  deleteAssembly: (id: string) => Promise<void>;
  getAssembly: (id: string) => AssemblyRecord | undefined;
  addPhoto: (assemblyId: string, photo: Omit<PhotoRecord, "id" | "timestamp">) => Promise<void>;
  addPhotos: (assemblyId: string, photos: Omit<PhotoRecord, "id" | "timestamp">[]) => Promise<void>;
  addDefect: (assemblyId: string, defect: Omit<DefectRecord, "id" | "timestamp">) => Promise<void>;
  updateDefect: (assemblyId: string, defectId: string, updates: Partial<DefectRecord>) => Promise<void>;
  updateStock: (productId: string, delta: number) => Promise<void>;
  updateConsumable: (consumableId: string, delta: number) => Promise<void>;
  getGlassProduct: (id: string) => GlassProduct | undefined;
  refreshAssemblies: () => Promise<void>;
  glassRequests: GlassRequest[];
  addGlassRequest: (data: { items: GlassRequestItem[]; requestedDate: string; notes?: string }) => Promise<GlassRequest>;
  updateGlassRequest: (id: string, updates: { status?: string; adminNote?: string }) => Promise<void>;
  deleteGlassRequest: (id: string) => Promise<void>;
  refreshGlassRequests: () => Promise<void>;
}

const AppContext = createContext<AppContextType | null>(null);

const SESSION_KEY = "@cam_montaj_session_v2";

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [assemblies, setAssemblies] = useState<AssemblyRecord[]>([]);
  const [glassStock, setGlassStock] = useState<GlassProduct[]>(GLASS_POSITIONS);
  const [consumables, setConsumables] = useState<Consumable[]>(DEFAULT_CONSUMABLES);
  const [glassRequests, setGlassRequests] = useState<GlassRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadAssemblies = useCallback(async () => {
    try {
      const data = await apiGet<any[]>("/assemblies");
      setAssemblies(data.map(dbRowToAssembly));
    } catch (err) {
      // silently fail on background refresh
    }
  }, []);

  const loadStock = useCallback(async () => {
    try {
      const [stockData, consumablesData] = await Promise.all([
        apiGet<any[]>("/stock"),
        apiGet<any[]>("/consumables"),
      ]);
      setGlassStock(stockData.map(dbRowToStock));
      setConsumables(consumablesData.map((c: any): Consumable => ({
        id: c.id,
        name: c.name,
        unit: c.unit,
        stock: c.stock ?? 0,
        category: c.category,
      })));
    } catch {
      // keep defaults
    }
  }, []);

  const loadUsers = useCallback(async () => {
    try {
      const data = await apiGet<any[]>("/users");
      setUsers(data.map((u: any): AppUser => ({
        id: u.id,
        authId: u.auth_id,
        username: u.username,
        name: u.name,
        role: u.role,
        active: u.active,
        createdAt: u.created_at,
      })));
    } catch {
      // non-admin: ignore
    }
  }, []);

  const loadGlassRequests = useCallback(async () => {
    try {
      const data = await apiGet<any[]>("/glass-requests");
      setGlassRequests(data.map(dbRowToGlassRequest));
    } catch {
      // ignore, table might not exist yet
    }
  }, []);

  // Restore session from storage
  useEffect(() => {
    const restore = async () => {
      try {
        const saved = await AsyncStorage.getItem(SESSION_KEY);
        if (saved) {
          const parsed = JSON.parse(saved) as AppUser;
          setCurrentUser(parsed);
          await Promise.all([loadAssemblies(), loadStock(), loadUsers(), loadGlassRequests()]);
        }
      } catch {
        // fresh start
      } finally {
        setIsLoading(false);
      }
    };
    restore();
  }, []);

  // Poll assemblies every 30s when logged in
  useEffect(() => {
    if (!currentUser) {
      if (pollingRef.current) clearInterval(pollingRef.current);
      return;
    }
    pollingRef.current = setInterval(loadAssemblies, 30000);
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [currentUser, loadAssemblies]);

  const login = useCallback(async (username: string, password: string) => {
    try {
      setApiError(null);
      const data = await apiPost<{ token: string; refresh_token: string; user: any }>(
        "/auth/login",
        { username, password }
      );
      await setTokens(data.token, data.refresh_token);
      const user: AppUser = {
        id: data.user.id,
        username: data.user.username,
        name: data.user.name,
        role: data.user.role,
        active: true,
        createdAt: new Date().toISOString(),
      };
      setCurrentUser(user);
      await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(user));
      await Promise.all([loadAssemblies(), loadStock(), loadUsers(), loadGlassRequests()]);
      return { success: true };
    } catch (err: any) {
      const msg = err.message ?? "Giriş başarısız.";
      setApiError(msg);
      return { success: false, message: msg };
    }
  }, [loadAssemblies, loadStock, loadUsers, loadGlassRequests]);

  const logout = useCallback(async () => {
    try {
      await apiPost("/auth/logout");
    } catch {
      // ignore
    }
    await clearTokens();
    await AsyncStorage.removeItem(SESSION_KEY);
    setCurrentUser(null);
    setAssemblies([]);
    setGlassRequests([]);
  }, []);

  const addUser = useCallback(async (user: Omit<AppUser, "id" | "createdAt">) => {
    const data = await apiPost<any>("/users", {
      username: user.username,
      password: (user as any).password ?? "1234",
      name: user.name,
      role: user.role,
    });
    const newUser: AppUser = {
      id: data.id,
      username: data.username,
      name: data.name,
      role: data.role,
      active: data.active,
      createdAt: data.created_at,
    };
    setUsers((prev) => [...prev, newUser]);
  }, []);

  const updateUser = useCallback(async (id: string, updates: Partial<AppUser>) => {
    await apiPatch(`/users/${id}`, updates);
    setUsers((prev) => prev.map((u) => u.id === id ? { ...u, ...updates } : u));
  }, []);

  const deleteUser = useCallback(async (id: string) => {
    await apiDelete(`/users/${id}`);
    setUsers((prev) => prev.filter((u) => u.id !== id));
  }, []);

  const addAssembly = useCallback(async (data: Omit<AssemblyRecord, "id" | "createdAt" | "updatedAt">): Promise<AssemblyRecord> => {
    const row = await apiPost<any>("/assemblies", data);
    const record = dbRowToAssembly(row);
    setAssemblies((prev) => [record, ...prev]);
    return record;
  }, []);

  const updateAssembly = useCallback(async (id: string, updates: Partial<AssemblyRecord>, logAction?: string) => {
    const row = await apiPatch<any>(`/assemblies/${id}`, { ...updates, logAction });
    const updated = dbRowToAssembly(row);
    setAssemblies((prev) => prev.map((a) => {
      if (a.id !== id) return a;
      // Merge to keep local photos/defects optimistically
      return {
        ...a,
        ...updated,
        photos: updated.photos.length > 0 ? updated.photos : a.photos,
        defects: updated.defects.length > 0 ? updated.defects : a.defects,
      };
    }));
  }, []);

  const deleteAssembly = useCallback(async (id: string) => {
    await apiDelete(`/assemblies/${id}`);
    setAssemblies((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const getAssembly = useCallback((id: string) => assemblies.find((a) => a.id === id), [assemblies]);

  const addPhoto = useCallback(async (assemblyId: string, photo: Omit<PhotoRecord, "id" | "timestamp">) => {
    const data = await apiPost<any>(`/assemblies/${assemblyId}/photos`, photo);
    const newPhoto: PhotoRecord = {
      id: data.id,
      uri: data.uri,
      type: data.type,
      timestamp: data.created_at,
      note: data.note,
      angle: data.angle,
    };
    setAssemblies((prev) => prev.map((a) =>
      a.id === assemblyId ? { ...a, photos: [...a.photos, newPhoto], updatedAt: new Date().toISOString() } : a
    ));
  }, []);

  const addPhotos = useCallback(async (assemblyId: string, photos: Omit<PhotoRecord, "id" | "timestamp">[]) => {
    const data = await apiPost<any[]>(`/assemblies/${assemblyId}/photos/bulk`, { photos });
    const newPhotos: PhotoRecord[] = data.map((p) => ({
      id: p.id,
      uri: p.uri,
      type: p.type,
      timestamp: p.created_at,
      note: p.note,
      angle: p.angle,
    }));
    setAssemblies((prev) => prev.map((a) =>
      a.id === assemblyId ? { ...a, photos: [...a.photos, ...newPhotos], updatedAt: new Date().toISOString() } : a
    ));
  }, []);

  const addDefect = useCallback(async (assemblyId: string, defect: Omit<DefectRecord, "id" | "timestamp">) => {
    const data = await apiPost<any>(`/assemblies/${assemblyId}/defects`, defect);
    const newDefect: DefectRecord = {
      id: data.id,
      description: data.description,
      severity: data.severity,
      resolved: data.resolved,
      timestamp: data.created_at,
      photoUri: data.photo_uri ? toProxyUri(data.photo_uri) : undefined,
    };
    setAssemblies((prev) => prev.map((a) =>
      a.id === assemblyId ? { ...a, defects: [...a.defects, newDefect], updatedAt: new Date().toISOString() } : a
    ));
  }, []);

  const updateDefect = useCallback(async (assemblyId: string, defectId: string, updates: Partial<DefectRecord>) => {
    await apiPatch(`/assemblies/${assemblyId}/defects/${defectId}`, updates);
    setAssemblies((prev) => prev.map((a) =>
      a.id === assemblyId
        ? { ...a, defects: a.defects.map((d) => d.id === defectId ? { ...d, ...updates } : d) }
        : a
    ));
  }, []);

  const updateStock = useCallback(async (productId: string, delta: number) => {
    await apiPatch(`/stock/${productId}`, { delta });
    setGlassStock((prev) => prev.map((g) =>
      g.id === productId ? { ...g, stock: Math.max(0, g.stock + delta) } : g
    ));
  }, []);

  const updateConsumable = useCallback(async (consumableId: string, delta: number) => {
    await apiPatch(`/consumables/${consumableId}`, { delta });
    setConsumables((prev) => prev.map((c) =>
      c.id === consumableId ? { ...c, stock: Math.max(0, c.stock + delta) } : c
    ));
  }, []);

  const refreshAssemblies = useCallback(async () => {
    await loadAssemblies();
  }, [loadAssemblies]);

  const addGlassRequest = useCallback(async (data: { items: GlassRequestItem[]; requestedDate: string; notes?: string }): Promise<GlassRequest> => {
    const row = await apiPost<any>("/glass-requests", data);
    const req = dbRowToGlassRequest(row);
    setGlassRequests((prev) => [req, ...prev]);
    return req;
  }, []);

  const updateGlassRequest = useCallback(async (id: string, updates: { status?: string; adminNote?: string }) => {
    const row = await apiPatch<any>(`/glass-requests/${id}`, updates);
    const req = dbRowToGlassRequest(row);
    setGlassRequests((prev) => prev.map((r) => r.id === id ? req : r));
  }, []);

  const deleteGlassRequest = useCallback(async (id: string) => {
    await apiDelete(`/glass-requests/${id}`);
    setGlassRequests((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const refreshGlassRequests = useCallback(async () => {
    await loadGlassRequests();
  }, [loadGlassRequests]);

  const role: UserRole = currentUser?.role ?? null;

  return (
    <AppContext.Provider value={{
      currentUser, role, users, isLoading, apiError,
      login, logout, addUser, updateUser, deleteUser,
      assemblies, glassStock, consumables,
      addAssembly, updateAssembly, deleteAssembly, getAssembly,
      addPhoto, addPhotos, addDefect, updateDefect,
      updateStock, updateConsumable, getGlassProduct: (id) => glassStock.find((g) => g.id === id),
      refreshAssemblies,
      glassRequests, addGlassRequest, updateGlassRequest, deleteGlassRequest, refreshGlassRequests,
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
