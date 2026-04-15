import { Router } from "express";
import multer from "multer";
import { requireAuth } from "../lib/middleware.js";
import { uploadToR2, isR2Configured } from "../lib/r2.js";

const router = Router();
router.use(requireAuth);

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Yalnızca resim dosyaları kabul edilir."));
    }
  },
});

const API_BASE_URL = process.env.API_BASE_URL ?? "";

router.post("/upload", upload.single("photo"), async (req, res) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: "Dosya bulunamadı." });
      return;
    }

    if (!isR2Configured()) {
      res.status(503).json({ error: "Dosya depolama yapılandırılmamış." });
      return;
    }

    const folder = (req.query.folder as string) || "assemblies";
    const key = await uploadToR2(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype,
      folder
    );

    const url = API_BASE_URL
      ? `${API_BASE_URL}/api/photos/proxy?key=${encodeURIComponent(key)}`
      : `https://pub-c0a96c48bd6840ba8a7c1ce1e27b8ab9.r2.dev/${key}`;

    res.status(201).json({ url });
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? "Yükleme başarısız." });
  }
});

export default router;
