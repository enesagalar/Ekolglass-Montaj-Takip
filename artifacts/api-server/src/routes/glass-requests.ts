import { Router } from "express";
import { query, queryOne } from "../lib/db.js";
import { requireAuth, requireRole, type JwtPayload } from "../lib/middleware.js";

const router = Router();

router.use(requireAuth);

router.get("/glass-requests", async (req, res) => {
  try {
    const user = (req as any).user as JwtPayload;

    if (user.role === "customer") {
      const rows = await query(
        `SELECT * FROM glass_requests WHERE requested_by = $1
         ORDER BY requested_date ASC, created_at DESC`,
        [user.id]
      );
      res.json(rows);
      return;
    }

    const rows = await query(
      `SELECT * FROM glass_requests ORDER BY requested_date ASC, created_at DESC`
    );
    res.json(rows);
  } catch {
    res.status(500).json({ error: "Sunucu hatası." });
  }
});

router.post("/glass-requests", requireRole("customer", "admin"), async (req, res) => {
  try {
    const user = (req as any).user as JwtPayload;
    const { items, requestedDate, notes } = req.body as {
      items: { glassId: string; glassName: string; quantity: number }[];
      requestedDate: string;
      notes?: string;
    };

    if (!items?.length || !requestedDate) {
      res.status(400).json({ error: "items ve requestedDate zorunludur." });
      return;
    }

    const now = new Date().toISOString();
    const [row] = await query(
      `INSERT INTO glass_requests
        (requested_by, requested_by_name, items, requested_date, notes, status, created_at, updated_at)
       VALUES ($1, $2, $3::jsonb, $4, $5, 'pending', $6, $6)
       RETURNING *`,
      [user.id, user.name, JSON.stringify(items), requestedDate, notes ?? "", now]
    );

    res.status(201).json(row);
  } catch {
    res.status(500).json({ error: "Sunucu hatası." });
  }
});

router.patch("/glass-requests/:id", requireRole("admin"), async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminNote } = req.body as { status?: string; adminNote?: string };

    const setClauses: string[] = ["updated_at = NOW()"];
    const params: any[] = [];
    let idx = 1;

    if (status !== undefined) { setClauses.push(`status = $${idx++}`); params.push(status); }
    if (adminNote !== undefined) { setClauses.push(`admin_note = $${idx++}`); params.push(adminNote); }

    params.push(id);
    const [row] = await query(
      `UPDATE glass_requests SET ${setClauses.join(", ")}
       WHERE id = $${idx} RETURNING *`,
      params
    );

    if (!row) {
      res.status(404).json({ error: "Talep bulunamadı." });
      return;
    }
    res.json(row);
  } catch {
    res.status(500).json({ error: "Sunucu hatası." });
  }
});

router.delete("/glass-requests/:id", requireRole("admin"), async (req, res) => {
  try {
    const { id } = req.params;
    await query(`DELETE FROM glass_requests WHERE id = $1`, [id]);
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Sunucu hatası." });
  }
});

export default router;
