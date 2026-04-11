import { Router } from "express";
import { supabase } from "../lib/supabase.js";
import { requireAuth, requireRole } from "../lib/middleware.js";

const router = Router();

router.use(requireAuth);

router.get("/glass-requests", async (req, res) => {
  try {
    const user = (req as any).user;
    const role = user.user_metadata?.role;

    let query = supabase
      .from("glass_requests")
      .select("*")
      .order("requested_date", { ascending: true })
      .order("created_at", { ascending: false });

    if (role === "customer") {
      const { data: appUser } = await supabase
        .from("app_users")
        .select("id")
        .eq("auth_id", user.id)
        .single();
      if (appUser) {
        query = query.eq("requested_by", appUser.id);
      }
    }

    const { data, error } = await query;
    if (error) { res.status(500).json({ error: error.message }); return; }
    res.json(data ?? []);
  } catch {
    res.status(500).json({ error: "Sunucu hatası." });
  }
});

router.post("/glass-requests", requireRole("customer", "admin"), async (req, res) => {
  try {
    const user = (req as any).user;
    const { items, requestedDate, notes } = req.body as {
      items: { glassId: string; glassName: string; quantity: number }[];
      requestedDate: string;
      notes?: string;
    };

    if (!items?.length || !requestedDate) {
      res.status(400).json({ error: "items ve requestedDate zorunludur." });
      return;
    }

    const { data: appUser } = await supabase
      .from("app_users")
      .select("id, name")
      .eq("auth_id", user.id)
      .single();

    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from("glass_requests")
      .insert({
        requested_by: appUser?.id ?? null,
        requested_by_name: appUser?.name ?? user.user_metadata?.name ?? "",
        items,
        requested_date: requestedDate,
        notes: notes ?? "",
        status: "pending",
        created_at: now,
        updated_at: now,
      })
      .select()
      .single();

    if (error) { res.status(500).json({ error: error.message }); return; }
    res.status(201).json(data);
  } catch {
    res.status(500).json({ error: "Sunucu hatası." });
  }
});

router.patch("/glass-requests/:id", requireRole("admin"), async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminNote } = req.body as { status?: string; adminNote?: string };

    const updates: Record<string, any> = { updated_at: new Date().toISOString() };
    if (status !== undefined) updates.status = status;
    if (adminNote !== undefined) updates.admin_note = adminNote;

    const { data, error } = await supabase
      .from("glass_requests")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error || !data) { res.status(404).json({ error: "Talep bulunamadı." }); return; }
    res.json(data);
  } catch {
    res.status(500).json({ error: "Sunucu hatası." });
  }
});

router.delete("/glass-requests/:id", requireRole("admin"), async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase.from("glass_requests").delete().eq("id", id);
    if (error) { res.status(500).json({ error: error.message }); return; }
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Sunucu hatası." });
  }
});

export default router;
