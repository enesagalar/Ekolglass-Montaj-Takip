import { Router } from "express";
import bcrypt from "bcryptjs";
import { query, queryOne } from "../lib/db.js";
import { requireAuth, requireRole } from "../lib/middleware.js";

const router = Router();

router.use(requireAuth);

router.get("/users", requireRole("admin"), async (_req, res) => {
  try {
    const rows = await query(
      `SELECT id, username, name, role, active, created_at
       FROM app_users ORDER BY created_at ASC`
    );
    res.json(rows);
  } catch {
    res.status(500).json({ error: "Sunucu hatası." });
  }
});

router.post("/users", requireRole("admin"), async (req, res) => {
  try {
    const { username, password, name, role } = req.body as {
      username: string;
      password: string;
      name: string;
      role: string;
    };
    if (!username || !password || !name || !role) {
      res.status(400).json({ error: "Tüm alanlar zorunludur." });
      return;
    }
    const uname = username.toLowerCase().trim();
    const existing = await queryOne(
      `SELECT id FROM app_users WHERE username = $1`,
      [uname]
    );
    if (existing) {
      res.status(409).json({ error: "Bu kullanıcı adı zaten kullanılıyor." });
      return;
    }
    const hash = await bcrypt.hash(password, 12);
    const now = new Date().toISOString();
    const [row] = await query(
      `INSERT INTO app_users (username, password_hash, name, role, active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, true, $5, $5)
       RETURNING id, username, name, role, active, created_at`,
      [uname, hash, name, role, now]
    );
    res.status(201).json(row);
  } catch {
    res.status(500).json({ error: "Sunucu hatası." });
  }
});

router.patch("/users/:id", requireRole("admin"), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, role, active, password } = req.body as {
      name?: string;
      role?: string;
      active?: boolean;
      password?: string;
    };

    const setClauses: string[] = ["updated_at = NOW()"];
    const params: any[] = [];
    let idx = 1;

    if (name !== undefined) { setClauses.push(`name = $${idx++}`); params.push(name); }
    if (role !== undefined) { setClauses.push(`role = $${idx++}`); params.push(role); }
    if (active !== undefined) { setClauses.push(`active = $${idx++}`); params.push(active); }
    if (password) {
      const hash = await bcrypt.hash(password, 12);
      setClauses.push(`password_hash = $${idx++}`);
      params.push(hash);
    }

    params.push(id);
    const [row] = await query(
      `UPDATE app_users SET ${setClauses.join(", ")}
       WHERE id = $${idx}
       RETURNING id, username, name, role, active`,
      params
    );
    if (!row) {
      res.status(404).json({ error: "Kullanıcı bulunamadı." });
      return;
    }
    res.json(row);
  } catch {
    res.status(500).json({ error: "Sunucu hatası." });
  }
});

router.delete("/users/:id", requireRole("admin"), async (req, res) => {
  try {
    const { id } = req.params;
    await query(`DELETE FROM app_users WHERE id = $1`, [id]);
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Sunucu hatası." });
  }
});

export default router;
