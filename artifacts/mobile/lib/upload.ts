import * as ImageManipulator from "expo-image-manipulator";
import { apiFetch } from "./api";

const MAX_DIMENSION = 1280;

async function compressPhoto(uri: string): Promise<string> {
  try {
    const result = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: MAX_DIMENSION } }],
      { compress: 0.75, format: ImageManipulator.SaveFormat.JPEG }
    );
    return result.uri;
  } catch {
    return uri;
  }
}

export async function uploadPhoto(
  localUri: string,
  folder: "assemblies" | "approvals" | "vin" = "assemblies"
): Promise<string> {
  try {
    const compressed = await compressPhoto(localUri);
    const filename = compressed.split("/").pop() ?? "photo.jpg";

    const formData = new FormData();
    formData.append("photo", {
      uri: compressed,
      name: filename,
      type: "image/jpeg",
    } as any);

    const res = await apiFetch(`/upload?folder=${folder}`, {
      method: "POST",
      headers: {},
      body: formData,
    });

    if (!res.ok) {
      if (res.status === 503) return localUri;
      const err = await res.json().catch(() => ({}));
      throw new Error((err as any).error ?? "Yükleme başarısız.");
    }

    const data = await res.json();
    return data.url as string;
  } catch (err: any) {
    if (err.message?.includes("yapılandırılmamış")) return localUri;
    throw err;
  }
}

export async function uploadPhotos(
  items: { uri: string; folder?: "assemblies" | "approvals" | "vin" }[]
): Promise<string[]> {
  return Promise.all(items.map((item) => uploadPhoto(item.uri, item.folder)));
}
