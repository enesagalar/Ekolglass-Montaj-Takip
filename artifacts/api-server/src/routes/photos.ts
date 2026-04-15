import { Router } from "express";
import fs from "fs";
import path from "path";
import { getFromR2, isR2Configured } from "../lib/r2.js";

const router = Router();

const CACHE_DIR = "/tmp/photo-cache";
const MAX_CACHE_BYTES = 500 * 1024 * 1024;
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });

function cacheKeyToPath(key: string): string {
  const safe = key.replace(/[^a-zA-Z0-9._-]/g, "_");
  return path.join(CACHE_DIR, safe);
}

function runCacheCleanup() {
  try {
    const files = fs.readdirSync(CACHE_DIR).map((f) => {
      const fp = path.join(CACHE_DIR, f);
      const stat = fs.statSync(fp);
      return { fp, size: stat.size, atime: stat.atimeMs };
    });

    const now = Date.now();
    for (const file of files) {
      if (now - file.atime > MAX_AGE_MS) {
        fs.unlinkSync(file.fp);
      }
    }

    const remaining = fs.readdirSync(CACHE_DIR).map((f) => {
      const fp = path.join(CACHE_DIR, f);
      const stat = fs.statSync(fp);
      return { fp, size: stat.size, atime: stat.atimeMs };
    });

    const totalSize = remaining.reduce((sum, f) => sum + f.size, 0);
    if (totalSize > MAX_CACHE_BYTES) {
      const sorted = remaining.sort((a, b) => a.atime - b.atime);
      let freed = 0;
      for (const file of sorted) {
        if (totalSize - freed <= MAX_CACHE_BYTES) break;
        fs.unlinkSync(file.fp);
        freed += file.size;
      }
    }
  } catch {}
}

setInterval(runCacheCleanup, 60 * 60 * 1000);
runCacheCleanup();

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
    fs.utimesSync(cachePath, new Date(), new Date());
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
