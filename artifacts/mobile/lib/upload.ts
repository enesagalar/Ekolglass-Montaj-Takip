import { apiFetch } from "./api";

/**
 * Bir cihaz URI'sini (file:// veya content://) Cloudflare R2'ye yükler.
 * Başarı durumunda kalıcı R2 URL'sini döndürür.
 * R2 yapılandırılmamışsa orijinal URI'yi olduğu gibi döndürür (dev ortam).
 */
export async function uploadPhoto(
  localUri: string,
  folder: "assemblies" | "approvals" | "vin" = "assemblies"
): Promise<string> {
  try {
    const filename = localUri.split("/").pop() ?? "photo.jpg";
    const match = /\.(\w+)$/.exec(filename);
    const ext = match ? match[1].toLowerCase() : "jpg";
    const mimeType = ext === "png" ? "image/png" : "image/jpeg";

    const formData = new FormData();
    formData.append("photo", {
      uri: localUri,
      name: filename,
      type: mimeType,
    } as any);

    const res = await apiFetch(`/upload?folder=${folder}`, {
      method: "POST",
      headers: {},
      body: formData,
    });

    if (!res.ok) {
      // R2 yapılandırılmamışsa (dev ortam) orijinal URI'yi kullan
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

/**
 * Birden fazla fotoğrafı paralel olarak R2'ye yükler.
 */
export async function uploadPhotos(
  items: { uri: string; folder?: "assemblies" | "approvals" | "vin" }[]
): Promise<string[]> {
  return Promise.all(items.map((item) => uploadPhoto(item.uri, item.folder)));
}
