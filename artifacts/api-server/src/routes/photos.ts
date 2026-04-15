import { Router } from "express";
import fs from "fs";
import path from "path";
import { getFromR2, isR2Configured } from "../lib/r2.js";

const router = Router();

const CACHE_DIR = "/tmp/photo-cache";
if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });

function cacheKeyToPath(key: string): string {
  const safe = key.replace(/[^a-zA-Z0-9._-]/g, "_");
  return path.join(CACHE_DIR, safe);
}

router.get("/photos/proxy", async (req, res) => {
  if (!isR2Configured()) {
    res.status(503).json({ error: "Depolama yapılandırılmamış." });
    return;
  }

  const key = req.query.key as string;

  if (!key || key.includes("..") || key.startsWith("/")) {
    res.status(400).json({ error: "Geçersiz anahtar." });
    return;
  }

  const cachePath = cacheKeyToPath(key);

  res.setHeader("Cache-Control", "public, max-age=604800");
  res.setHeader("Access-Control-Allow-Origin", "*");

  if (fs.existsSync(cachePath)) {
    res.setHeader("Content-Type", "image/jpeg");
    fs.createReadStream(cachePath).pipe(res);
    return;
  }

  try {
    const { body, contentType } = await getFromR2(key);
    res.setHeader("Content-Type", contentType);

    const chunks: Buffer[] = [];
    body.on("data", (chunk: Buffer) => chunks.push(chunk));
    body.on("end", () => {
      const buffer = Buffer.concat(chunks);
      fs.writeFile(cachePath, buffer, () => {});
      res.end(buffer);
    });
    body.on("error", () => {
      res.status(500).json({ error: "Fotoğraf alınamadı." });
    });
  } catch (err: any) {
    if (err.name === "NoSuchKey") {
      res.status(404).json({ error: "Fotoğraf bulunamadı." });
    } else {
      res.status(500).json({ error: "Fotoğraf alınamadı." });
    }
  }
});

export default router;
