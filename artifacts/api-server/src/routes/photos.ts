import { Router } from "express";
import { getFromR2, isR2Configured } from "../lib/r2.js";

const router = Router();

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

  try {
    const { body, contentType } = await getFromR2(key);
    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.setHeader("Access-Control-Allow-Origin", "*");
    body.pipe(res);
  } catch (err: any) {
    if (err.name === "NoSuchKey") {
      res.status(404).json({ error: "Fotoğraf bulunamadı." });
    } else {
      res.status(500).json({ error: "Fotoğraf alınamadı." });
    }
  }
});

export default router;
