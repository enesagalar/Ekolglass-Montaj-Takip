import { Router } from "express";
import { query, queryOne } from "../lib/db.js";
import { requireAuth, requireRole } from "../lib/middleware.js";

const router = Router();

router.use(requireAuth);

router.get("/stock", async (_req, res) => {
  try {
    const rows = await query(
      `SELECT * FROM glass_stock ORDER BY sort_order ASC`
    );
    res.json(rows);
  } catch {
    res.status(500).json({ error: "Sunucu hatası." });
  }
});

router.patch("/stock/:id", requireRole("admin"), async (req, res) => {
  try {
    const { id } = req.params;
    const { delta } = req.body as { delta: number };
    const current = await queryOne<{ stock: number }>(
      `SELECT stock FROM glass_stock WHERE id = $1`,
      [id]
    );
    if (!current) {
      res.status(404).json({ error: "Ürün bulunamadı." });
      return;
    }
    const newStock = Math.max(0, (current.stock ?? 0) + delta);
    const [row] = await query(
      `UPDATE glass_stock SET stock = $1, updated_at = NOW()
       WHERE id = $2 RETURNING *`,
      [newStock, id]
    );
    res.json(row);
  } catch {
    res.status(500).json({ error: "Sunucu hatası." });
  }
});

router.get("/consumables", async (_req, res) => {
  try {
    const rows = await query(
      `SELECT * FROM consumables ORDER BY name ASC`
    );
    res.json(rows);
  } catch {
    res.status(500).json({ error: "Sunucu hatası." });
  }
});

router.patch("/consumables/:id", requireRole("admin"), async (req, res) => {
  try {
    const { id } = req.params;
    const { delta } = req.body as { delta: number };
    const current = await queryOne<{ stock: number }>(
      `SELECT stock FROM consumables WHERE id = $1`,
      [id]
    );
    if (!current) {
      res.status(404).json({ error: "Ürün bulunamadı." });
      return;
    }
    const newStock = Math.max(0, Number(current.stock) + delta);
    const [row] = await query(
      `UPDATE consumables SET stock = $1, updated_at = NOW()
       WHERE id = $2 RETURNING *`,
      [newStock, id]
    );
    res.json(row);
  } catch {
    res.status(500).json({ error: "Sunucu hatası." });
  }
});

export default router;
