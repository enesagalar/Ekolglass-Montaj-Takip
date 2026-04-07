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
  | "pending"
  | "in_progress"
  | "qc_check"
  | "completed"
  | "delivered";

export interface PhotoRecord {
  id: string;
  uri: string;
  type: "before" | "after" | "defect" | "other";
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
  vehicleModel: string;
  vehicleColor: string;
  customerName: string;
  customerPhone: string;
  status: AssemblyStatus;
  assignedTo: string;
  photos: PhotoRecord[];
  defects: DefectRecord[];
  notes: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  deliveredAt?: string;
  glassType: string;
  glassPartNumber: string;
}

interface AppContextType {
  role: UserRole;
  setRole: (role: UserRole) => void;
  assemblies: AssemblyRecord[];
  addAssembly: (assembly: Omit<AssemblyRecord, "id" | "createdAt" | "updatedAt">) => AssemblyRecord;
  updateAssembly: (id: string, updates: Partial<AssemblyRecord>) => void;
  deleteAssembly: (id: string) => void;
  getAssembly: (id: string) => AssemblyRecord | undefined;
  addPhoto: (assemblyId: string, photo: Omit<PhotoRecord, "id" | "timestamp">) => void;
  addDefect: (assemblyId: string, defect: Omit<DefectRecord, "id" | "timestamp">) => void;
  updateDefect: (assemblyId: string, defectId: string, updates: Partial<DefectRecord>) => void;
  staffMembers: string[];
}

const AppContext = createContext<AppContextType | null>(null);

const STORAGE_KEY = "@cam_montaj_assemblies";
const ROLE_KEY = "@cam_montaj_role";

const DEMO_ASSEMBLIES: AssemblyRecord[] = [
  {
    id: "asm-001",
    vin: "WBA3A5C50DF597152",
    vehicleModel: "BMW 3 Serisi",
    vehicleColor: "Siyah",
    customerName: "Ahmet Yılmaz",
    customerPhone: "+90 555 123 4567",
    status: "in_progress",
    assignedTo: "Mehmet Demir",
    photos: [],
    defects: [],
    notes: "Ön cam değişimi. Müşteri öğleden sonra araç teslim istiyor.",
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    glassType: "Ön Cam",
    glassPartNumber: "BMW-3F-2021-OEM",
  },
  {
    id: "asm-002",
    vin: "JTDBL40E679075523",
    vehicleModel: "Toyota Corolla",
    vehicleColor: "Beyaz",
    customerName: "Fatma Kaya",
    customerPhone: "+90 532 987 6543",
    status: "qc_check",
    assignedTo: "Ali Çelik",
    photos: [],
    defects: [
      {
        id: "def-001",
        description: "Sol köşede küçük çizik",
        severity: "low",
        resolved: true,
        timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
      },
    ],
    notes: "Arka sağ cam. Standart montaj.",
    createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    glassType: "Arka Sağ Yan Cam",
    glassPartNumber: "TOY-COR-2019-RR",
  },
  {
    id: "asm-003",
    vin: "1HGBH41JXMN109186",
    vehicleModel: "Honda Civic",
    vehicleColor: "Gri",
    customerName: "Kemal Arslan",
    customerPhone: "+90 542 765 4321",
    status: "completed",
    assignedTo: "Mehmet Demir",
    photos: [],
    defects: [],
    notes: "",
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    completedAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    glassType: "Ön Cam",
    glassPartNumber: "HON-CIV-2022-OEM",
  },
  {
    id: "asm-004",
    vin: "2HGFA165X6H534631",
    vehicleModel: "Mercedes C Serisi",
    vehicleColor: "Lacivert",
    customerName: "Zeynep Şahin",
    customerPhone: "+90 505 321 9876",
    status: "pending",
    assignedTo: "Ali Çelik",
    photos: [],
    defects: [],
    notes: "Panoramik tavan camı. Dikkatli montaj gerekiyor.",
    createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    glassType: "Panoramik Tavan",
    glassPartNumber: "MRC-C-2023-PANO",
  },
];

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [role, setRoleState] = useState<UserRole>(null);
  const [assemblies, setAssemblies] = useState<AssemblyRecord[]>([]);

  const staffMembers = ["Mehmet Demir", "Ali Çelik", "Hasan Yıldız", "Murat Özkan"];

  useEffect(() => {
    const load = async () => {
      try {
        const [savedRole, savedAssemblies] = await Promise.all([
          AsyncStorage.getItem(ROLE_KEY),
          AsyncStorage.getItem(STORAGE_KEY),
        ]);
        if (savedRole) {
          setRoleState(savedRole as UserRole);
        }
        if (savedAssemblies) {
          setAssemblies(JSON.parse(savedAssemblies));
        } else {
          setAssemblies(DEMO_ASSEMBLIES);
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(DEMO_ASSEMBLIES));
        }
      } catch (e) {
        setAssemblies(DEMO_ASSEMBLIES);
      }
    };
    load();
  }, []);

  const saveAssemblies = useCallback(async (updated: AssemblyRecord[]) => {
    setAssemblies(updated);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }, []);

  const setRole = useCallback(async (r: UserRole) => {
    setRoleState(r);
    if (r) await AsyncStorage.setItem(ROLE_KEY, r);
    else await AsyncStorage.removeItem(ROLE_KEY);
  }, []);

  const addAssembly = useCallback(
    (data: Omit<AssemblyRecord, "id" | "createdAt" | "updatedAt">) => {
      const now = new Date().toISOString();
      const newRecord: AssemblyRecord = {
        ...data,
        id: `asm-${Date.now()}`,
        createdAt: now,
        updatedAt: now,
      };
      const updated = [newRecord, ...assemblies];
      saveAssemblies(updated);
      return newRecord;
    },
    [assemblies, saveAssemblies]
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
    (id: string) => {
      const updated = assemblies.filter((a) => a.id !== id);
      saveAssemblies(updated);
    },
    [assemblies, saveAssemblies]
  );

  const getAssembly = useCallback(
    (id: string) => assemblies.find((a) => a.id === id),
    [assemblies]
  );

  const addPhoto = useCallback(
    (assemblyId: string, photo: Omit<PhotoRecord, "id" | "timestamp">) => {
      const newPhoto: PhotoRecord = {
        ...photo,
        id: `photo-${Date.now()}`,
        timestamp: new Date().toISOString(),
      };
      const updated = assemblies.map((a) =>
        a.id === assemblyId
          ? { ...a, photos: [...a.photos, newPhoto], updatedAt: new Date().toISOString() }
          : a
      );
      saveAssemblies(updated);
    },
    [assemblies, saveAssemblies]
  );

  const addDefect = useCallback(
    (assemblyId: string, defect: Omit<DefectRecord, "id" | "timestamp">) => {
      const newDefect: DefectRecord = {
        ...defect,
        id: `def-${Date.now()}`,
        timestamp: new Date().toISOString(),
      };
      const updated = assemblies.map((a) =>
        a.id === assemblyId
          ? { ...a, defects: [...a.defects, newDefect], updatedAt: new Date().toISOString() }
          : a
      );
      saveAssemblies(updated);
    },
    [assemblies, saveAssemblies]
  );

  const updateDefect = useCallback(
    (assemblyId: string, defectId: string, updates: Partial<DefectRecord>) => {
      const updated = assemblies.map((a) =>
        a.id === assemblyId
          ? {
              ...a,
              defects: a.defects.map((d) =>
                d.id === defectId ? { ...d, ...updates } : d
              ),
              updatedAt: new Date().toISOString(),
            }
          : a
      );
      saveAssemblies(updated);
    },
    [assemblies, saveAssemblies]
  );

  return (
    <AppContext.Provider
      value={{
        role,
        setRole,
        assemblies,
        addAssembly,
        updateAssembly,
        deleteAssembly,
        getAssembly,
        addPhoto,
        addDefect,
        updateDefect,
        staffMembers,
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
