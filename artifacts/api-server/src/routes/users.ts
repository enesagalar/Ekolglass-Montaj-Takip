import { Router } from "express";
import { supabase } from "../lib/supabase.js";
import { requireAuth, requireRole } from "../lib/middleware.js";

const router = Router();

router.use(requireAuth);

router.get("/users", requireRole("admin"), async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from("app_users")
      .select("id, auth_id, username, name, role, active, created_at")
      .order("created_at", { ascending: true });
    if (error) { res.status(500).json({ error: error.message }); return; }
    res.json(data ?? []);
  } catch {
    res.status(500).json({ error: "Sunucu hatası." });
  }
});

router.post("/users", requireRole("admin"), async (req, res) => {
  try {
    const { username, password, name, role } = req.body as {
      username: string; password: string; name: string; role: string;
    };
    if (!username || !password || !name || !role) {
      res.status(400).json({ error: "Tüm alanlar zorunludur." });
      return;
    }
    const email = `${username.toLowerCase().trim()}@cam-montaj.internal`;
    const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { name, role },
      email_confirm: true,
    });
    if (authErr || !authData.user) {
      res.status(500).json({ error: authErr?.message ?? "Kullanıcı oluşturulamadı." });
      return;
    }
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from("app_users")
      .insert({
        auth_id: authData.user.id,
        username: username.toLowerCase().trim(),
        email,
        name,
        role,
        active: true,
        created_at: now,
        updated_at: now,
      })
      .select("id, auth_id, username, name, role, active, created_at")
      .single();
    if (error) {
      await supabase.auth.admin.deleteUser(authData.user.id);
      res.status(500).json({ error: error.message });
      return;
    }
    res.status(201).json(data);
  } catch {
    res.status(500).json({ error: "Sunucu hatası." });
  }
});

router.patch("/users/:id", requireRole("admin"), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, role, active, password } = req.body as {
      name?: string; role?: string; active?: boolean; password?: string;
    };
    const updates: Record<string, any> = { updated_at: new Date().toISOString() };
    if (name !== undefined) updates.name = name;
    if (role !== undefined) updates.role = role;
    if (active !== undefined) updates.active = active;

    const { data, error } = await supabase
      .from("app_users")
      .update(updates)
      .eq("id", id)
      .select("id, auth_id, username, name, role, active")
      .single();
    if (error || !data) { res.status(404).json({ error: "Kullanıcı bulunamadı." }); return; }

    const metaUpdates: Record<string, any> = {};
    if (name) metaUpdates.name = name;
    if (role) metaUpdates.role = role;
    if (Object.keys(metaUpdates).length) {
      await supabase.auth.admin.updateUserById(data.auth_id, { user_metadata: metaUpdates });
    }
    if (password) {
      await supabase.auth.admin.updateUserById(data.auth_id, { password });
    }
    res.json(data);
  } catch {
    res.status(500).json({ error: "Sunucu hatası." });
  }
});

router.delete("/users/:id", requireRole("admin"), async (req, res) => {
  try {
    const { id } = req.params;
    const { data } = await supabase.from("app_users").select("auth_id").eq("id", id).single();
    if (data?.auth_id) {
      await supabase.auth.admin.deleteUser(data.auth_id);
    }
    await supabase.from("app_users").delete().eq("id", id);
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Sunucu hatası." });
  }
});

export default router;
