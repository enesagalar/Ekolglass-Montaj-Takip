import { Router } from "express";
import { supabase } from "../lib/supabase.js";
import { requireAuth, requireRole } from "../lib/middleware.js";

const router = Router();

router.use(requireAuth);

router.get("/stock", async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from("glass_stock")
      .select("*")
      .order("sort_order", { ascending: true });
    if (error) { res.status(500).json({ error: error.message }); return; }
    res.json(data ?? []);
  } catch {
    res.status(500).json({ error: "Sunucu hatası." });
  }
});

router.patch("/stock/:id", requireRole("admin"), async (req, res) => {
  try {
    const { id } = req.params;
    const { delta } = req.body as { delta: number };
    const { data: current } = await supabase.from("glass_stock").select("stock").eq("id", id).single();
    if (!current) { res.status(404).json({ error: "Ürün bulunamadı." }); return; }
    const newStock = Math.max(0, (current.stock ?? 0) + delta);
    const { data, error } = await supabase
      .from("glass_stock")
      .update({ stock: newStock, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();
    if (error) { res.status(500).json({ error: error.message }); return; }
    res.json(data);
  } catch {
    res.status(500).json({ error: "Sunucu hatası." });
  }
});

router.get("/consumables", async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from("consumables")
      .select("*")
      .order("name", { ascending: true });
    if (error) { res.status(500).json({ error: error.message }); return; }
    res.json(data ?? []);
  } catch {
    res.status(500).json({ error: "Sunucu hatası." });
  }
});

router.patch("/consumables/:id", requireRole("admin"), async (req, res) => {
  try {
    const { id } = req.params;
    const { delta } = req.body as { delta: number };
    const { data: current } = await supabase.from("consumables").select("stock").eq("id", id).single();
    if (!current) { res.status(404).json({ error: "Ürün bulunamadı." }); return; }
    const newStock = Math.max(0, (current.stock ?? 0) + delta);
    const { data, error } = await supabase
      .from("consumables")
      .update({ stock: newStock, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();
    if (error) { res.status(500).json({ error: error.message }); return; }
    res.json(data);
  } catch {
    res.status(500).json({ error: "Sunucu hatası." });
  }
});

export default router;
