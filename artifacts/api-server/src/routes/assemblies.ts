import { Router } from "express";
import { supabase } from "../lib/supabase.js";
import { requireAuth, requireRole } from "../lib/middleware.js";

const router = Router();

router.use(requireAuth);

router.get("/assemblies", async (req, res) => {
  try {
    const user = (req as any).user;
    const role = user.user_metadata?.role;
    const userId = user.id;

    let query = supabase
      .from("assemblies")
      .select(`
        *,
        photos (*),
        defects (*),
        activity_log (*)
      `)
      .order("updated_at", { ascending: false });

    if (role === "field") {
      query = query.eq("assigned_to_user_id", userId);
    }

    const { data, error } = await query;
    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }
    res.json(data ?? []);
  } catch (err) {
    res.status(500).json({ error: "Sunucu hatası." });
  }
});

router.get("/assemblies/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from("assemblies")
      .select(`*, photos (*), defects (*), activity_log (*)`)
      .eq("id", id)
      .single();
    if (error || !data) {
      res.status(404).json({ error: "Kayıt bulunamadı." });
      return;
    }
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Sunucu hatası." });
  }
});

router.post("/assemblies", requireRole("field", "admin"), async (req, res) => {
  try {
    const user = (req as any).user;
    const body = req.body;
    const now = new Date().toISOString();

    const record = {
      vehicle_model: body.vehicleModel,
      vin: body.vin,
      vin_last5: body.vinLast5 ?? body.vin?.slice(-5),
      glass_product_ids: body.glassProductIds ?? [],
      assigned_to: body.assignedTo,
      assigned_to_user_id: body.assignedToUserId,
      status: "pending",
      status_timestamps: { pending: now },
      water_test_result: null,
      water_test_customer_approval: null,
      notes: body.notes ?? "",
      created_at: now,
      updated_at: now,
    };

    const { data, error } = await supabase.from("assemblies").insert(record).select().single();
    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }

    await supabase.from("activity_log").insert({
      assembly_id: data.id,
      action: "Kayıt oluşturuldu",
      user_id: user.id,
      user_name: user.user_metadata?.name ?? user.email,
      created_at: now,
    });

    if (body.glassProductIds?.length) {
      for (const gid of body.glassProductIds) {
        await supabase.rpc("decrement_stock", { product_id: gid, amount: 1 });
      }
    }

    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ error: "Sunucu hatası." });
  }
});

router.patch("/assemblies/:id", requireRole("field", "admin"), async (req, res) => {
  try {
    const { id } = req.params;
    const user = (req as any).user;
    const body = req.body;
    const now = new Date().toISOString();

    const { data: existing, error: fetchErr } = await supabase
      .from("assemblies")
      .select("status, status_timestamps")
      .eq("id", id)
      .single();

    if (fetchErr || !existing) {
      res.status(404).json({ error: "Kayıt bulunamadı." });
      return;
    }

    const updates: Record<string, any> = { updated_at: now };

    const fieldMap: Record<string, string> = {
      vehicleModel: "vehicle_model",
      vin: "vin",
      vinLast5: "vin_last5",
      glassProductIds: "glass_product_ids",
      assignedTo: "assigned_to",
      assignedToUserId: "assigned_to_user_id",
      status: "status",
      statusTimestamps: "status_timestamps",
      waterTestResult: "water_test_result",
      waterTestCustomerApproval: "water_test_customer_approval",
      installationCompletedAt: "installation_completed_at",
      completedAt: "completed_at",
      notes: "notes",
    };

    for (const [jsKey, dbKey] of Object.entries(fieldMap)) {
      if (jsKey in body) updates[dbKey] = body[jsKey];
    }

    const statusChangingTo = body.status && body.status !== existing.status ? body.status : null;

    if (statusChangingTo) {
      const ts = { ...(existing.status_timestamps ?? {}), [statusChangingTo]: now };
      updates["status_timestamps"] = ts;
    }

    const { error: updateErr } = await supabase
      .from("assemblies")
      .update(updates)
      .eq("id", id);

    if (updateErr) {
      res.status(500).json({ error: updateErr.message });
      return;
    }

    // Auto-deduct consumables when montaj STARTS (installation)
    // Silikon: 3 adet/araç | Primer: 1.5L/30 araç = 0.05/araç | Bant: 1 adet/4 araç = 0.25/araç
    if (statusChangingTo === "installation") {
      const DEDUCTIONS = [
        { id: "c1", amount: 3,    label: "3 adet Silikon" },
        { id: "c2", amount: 0.05, label: "0.05 lt Primer" },
        { id: "c4", amount: 0.25, label: "0.25 adet Bant" },
      ];

      for (const d of DEDUCTIONS) {
        const { data: row } = await supabase
          .from("consumables")
          .select("stock")
          .eq("id", d.id)
          .single();
        if (row) {
          const newStock = Math.max(0, Number(row.stock) - d.amount);
          await supabase
            .from("consumables")
            .update({ stock: newStock, updated_at: now })
            .eq("id", d.id);
        }
      }

      await supabase.from("activity_log").insert({
        assembly_id: id,
        action: "Otomatik sarf düşümü: 3 Silikon, 0.05 lt Primer, 0.25 Bant",
        user_id: user.id,
        user_name: user.user_metadata?.name ?? user.email,
        created_at: now,
      });
    }

    if (body.logAction) {
      await supabase.from("activity_log").insert({
        assembly_id: id,
        action: body.logAction,
        user_id: user.id,
        user_name: user.user_metadata?.name ?? user.email,
        created_at: now,
      });
    }

    const { data, error: fetchErr2 } = await supabase
      .from("assemblies")
      .select(`*, photos (*), defects (*), activity_log (*)`)
      .eq("id", id)
      .single();

    if (fetchErr2 || !data) {
      res.status(500).json({ error: "Güncelleme sonrası kayıt alınamadı." });
      return;
    }

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Sunucu hatası." });
  }
});

router.delete("/assemblies/:id", requireRole("admin"), async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase.from("assemblies").delete().eq("id", id);
    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Sunucu hatası." });
  }
});

router.post("/assemblies/:id/photos", requireRole("field", "admin"), async (req, res) => {
  try {
    const { id } = req.params;
    const { uri, type, angle, note } = req.body as {
      uri: string; type: string; angle?: string; note?: string;
    };
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from("photos")
      .insert({ assembly_id: id, uri, type, angle, note, created_at: now })
      .select()
      .single();
    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }
    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ error: "Sunucu hatası." });
  }
});

router.post("/assemblies/:id/photos/bulk", requireRole("field", "admin"), async (req, res) => {
  try {
    const { id } = req.params;
    const { photos } = req.body as {
      photos: { uri: string; type: string; angle?: string; note?: string }[];
    };
    const now = new Date().toISOString();
    const rows = photos.map((p) => ({ ...p, assembly_id: id, created_at: now }));
    const { data, error } = await supabase.from("photos").insert(rows).select();
    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }
    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ error: "Sunucu hatası." });
  }
});

router.post("/assemblies/:id/defects", requireRole("field", "admin"), async (req, res) => {
  try {
    const { id } = req.params;
    const { description, severity } = req.body as { description: string; severity: string };
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from("defects")
      .insert({ assembly_id: id, description, severity, resolved: false, created_at: now })
      .select()
      .single();
    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }
    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ error: "Sunucu hatası." });
  }
});

router.patch("/assemblies/:id/defects/:defectId", requireRole("field", "admin"), async (req, res) => {
  try {
    const { defectId } = req.params;
    const { resolved } = req.body as { resolved: boolean };
    const { data, error } = await supabase
      .from("defects")
      .update({ resolved, updated_at: new Date().toISOString() })
      .eq("id", defectId)
      .select()
      .single();
    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Sunucu hatası." });
  }
});

export default router;
