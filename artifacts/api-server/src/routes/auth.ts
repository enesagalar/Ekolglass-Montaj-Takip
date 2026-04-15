import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { queryOne } from "../lib/db.js";
import { requireAuth, type JwtPayload } from "../lib/middleware.js";

const router = Router();

const JWT_SECRET = process.env["JWT_SECRET"]!;
const ACCESS_EXPIRES = "7d";
const REFRESH_EXPIRES = "30d";

function signAccess(payload: Omit<JwtPayload, "type">): string {
  return jwt.sign({ ...payload, type: "access" }, JWT_SECRET, {
    expiresIn: ACCESS_EXPIRES,
  });
}

function signRefresh(payload: Omit<JwtPayload, "type">): string {
  return jwt.sign({ ...payload, type: "refresh" }, JWT_SECRET, {
    expiresIn: REFRESH_EXPIRES,
  });
}

router.post("/auth/login", async (req, res) => {
  try {
    const { username, password } = req.body as {
      username: string;
      password: string;
    };
    if (!username || !password) {
      res.status(400).json({ error: "username ve password zorunludur." });
      return;
    }

    const user = await queryOne<{
      id: string;
      username: string;
      name: string;
      role: string;
      active: boolean;
      password_hash: string;
    }>(
      `SELECT id, username, name, role, active, password_hash
       FROM app_users WHERE username = $1 LIMIT 1`,
      [username.toLowerCase().trim()]
    );

    if (!user) {
      res.status(401).json({ error: "Kullanıcı adı veya şifre hatalı." });
      return;
    }
    if (!user.active) {
      res.status(401).json({ error: "Hesap devre dışı bırakılmış." });
      return;
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      res.status(401).json({ error: "Kullanıcı adı veya şifre hatalı." });
      return;
    }

    const base: Omit<JwtPayload, "type"> = {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
    };

    res.json({
      token: signAccess(base),
      refresh_token: signRefresh(base),
      user: { id: user.id, username: user.username, name: user.name, role: user.role },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Sunucu hatası." });
  }
});

router.post("/auth/refresh", async (req, res) => {
  try {
    const { refresh_token } = req.body as { refresh_token: string };
    if (!refresh_token) {
      res.status(400).json({ error: "refresh_token zorunludur." });
      return;
    }
    let payload: JwtPayload;
    try {
      payload = jwt.verify(refresh_token, JWT_SECRET) as JwtPayload;
    } catch {
      res.status(401).json({ error: "Geçersiz refresh token." });
      return;
    }
    if (payload.type !== "refresh") {
      res.status(401).json({ error: "Geçersiz token tipi." });
      return;
    }

    // Verify user still exists and is active
    const user = await queryOne<{ id: string; active: boolean }>(
      `SELECT id, active FROM app_users WHERE id = $1 LIMIT 1`,
      [payload.id]
    );
    if (!user || !user.active) {
      res.status(401).json({ error: "Kullanıcı bulunamadı veya devre dışı." });
      return;
    }

    const base: Omit<JwtPayload, "type"> = {
      id: payload.id,
      username: payload.username,
      name: payload.name,
      role: payload.role,
    };

    res.json({
      token: signAccess(base),
      refresh_token: signRefresh(base),
    });
  } catch (err) {
    res.status(500).json({ error: "Sunucu hatası." });
  }
});

router.post("/auth/logout", requireAuth, (_req, res) => {
  // Stateless JWT — client clears the token
  res.json({ ok: true });
});

router.get("/auth/me", requireAuth, async (req, res) => {
  const user = (req as any).user as JwtPayload;
  const row = await queryOne(
    `SELECT id, username, name, role, active, created_at FROM app_users WHERE id = $1`,
    [user.id]
  );
  res.json(row ?? { id: user.id });
});

export default router;
