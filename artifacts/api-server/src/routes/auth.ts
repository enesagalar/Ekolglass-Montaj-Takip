import { Router } from "express";
import { createClient } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase.js";
import { requireAuth } from "../lib/middleware.js";

const router = Router();

const supabaseUrl = process.env["SUPABASE_URL"]!;
const supabaseAnonKey = process.env["SUPABASE_ANON_KEY"]!;

router.post("/auth/login", async (req, res) => {
  try {
    const { username, password } = req.body as { username: string; password: string };
    if (!username || !password) {
      res.status(400).json({ error: "username ve password zorunludur." });
      return;
    }

    const { data: userRow, error: lookupErr } = await supabase
      .from("app_users")
      .select("email, role, name, active")
      .eq("username", username.toLowerCase().trim())
      .single();

    if (lookupErr || !userRow) {
      res.status(401).json({ error: "Kullanıcı adı veya şifre hatalı." });
      return;
    }

    if (!userRow.active) {
      res.status(401).json({ error: "Hesap devre dışı bırakılmış." });
      return;
    }

    const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: authData, error: authErr } = await anonClient.auth.signInWithPassword({
      email: userRow.email,
      password,
    });

    if (authErr || !authData.session) {
      res.status(401).json({ error: "Kullanıcı adı veya şifre hatalı." });
      return;
    }

    await supabase.from("app_users").update({ updated_at: new Date().toISOString() }).eq("username", username.toLowerCase().trim());

    res.json({
      token: authData.session.access_token,
      refresh_token: authData.session.refresh_token,
      user: {
        id: authData.user.id,
        username,
        name: userRow.name,
        role: userRow.role,
        email: userRow.email,
      },
    });
  } catch (err) {
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
    const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data, error } = await anonClient.auth.refreshSession({ refresh_token });
    if (error || !data.session) {
      res.status(401).json({ error: "Oturum yenilenemedi." });
      return;
    }
    res.json({
      token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    });
  } catch (err) {
    res.status(500).json({ error: "Sunucu hatası." });
  }
});

router.post("/auth/logout", requireAuth, async (req, res) => {
  const token = (req as any).supabaseToken;
  const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  await anonClient.auth.signOut();
  res.json({ ok: true });
});

router.get("/auth/me", requireAuth, async (req, res) => {
  const user = (req as any).user;
  const { data: userRow } = await supabase
    .from("app_users")
    .select("id, username, name, role, active, created_at")
    .eq("auth_id", user.id)
    .single();
  res.json(userRow ?? { auth_id: user.id });
});

export default router;
