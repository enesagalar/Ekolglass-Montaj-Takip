import { Router } from "express";
import { query } from "../lib/db.js";
import { requireAuth, requireRole, type JwtPayload } from "../lib/middleware.js";

const router = Router();

router.use(requireAuth);

// GET /invoices — accounting, admin, customer görebilir; field göremez
router.get("/invoices", requireRole("accounting", "admin", "customer"), async (req, res) => {
  try {
    const rows = await query(
      `SELECT
        i.*,
        a.vin,
        a.vin_last5,
        a.vehicle_model,
        a.status,
        a.assigned_to
       FROM invoices i
       JOIN assemblies a ON a.id = i.assembly_id
       ORDER BY i.created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    console.error("GET /invoices error:", err);
    res.status(500).json({ error: "Sunucu hatası." });
  }
});

// POST /invoices — sadece accounting
router.post("/invoices", requireRole("accounting"), async (req, res) => {
  try {
    const user = (req as any).user as JwtPayload;
    const { assemblyId, invoiceNumber, notes } = req.body;

    if (!assemblyId || !invoiceNumber?.trim()) {
      res.status(400).json({ error: "assembly_id ve invoice_number zorunludur." });
      return;
    }

    const [row] = await query(
      `INSERT INTO invoices (assembly_id, invoice_number, notes, created_by_name, created_at, updated_at)
       VALUES ($1, $2, $3, $4, NOW(), NOW())
       RETURNING *`,
      [assemblyId, invoiceNumber.trim(), notes ?? "", user.name]
    );

    const [withAssembly] = await query(
      `SELECT i.*, a.vin, a.vin_last5, a.vehicle_model, a.status, a.assigned_to
       FROM invoices i JOIN assemblies a ON a.id = i.assembly_id
       WHERE i.id = $1`,
      [row.id]
    );

    res.status(201).json(withAssembly);
  } catch (err) {
    console.error("POST /invoices error:", err);
    res.status(500).json({ error: "Sunucu hatası." });
  }
});

// PATCH /invoices/:id — sadece accounting
router.patch("/invoices/:id", requireRole("accounting"), async (req, res) => {
  try {
    const { id } = req.params;
    const { invoiceNumber, notes } = req.body;

    const sets: string[] = ["updated_at = NOW()"];
    const params: any[] = [];
    let idx = 1;

    if (invoiceNumber !== undefined) {
      sets.push(`invoice_number = $${idx++}`);
      params.push(invoiceNumber.trim());
    }
    if (notes !== undefined) {
      sets.push(`notes = $${idx++}`);
      params.push(notes);
    }

    params.push(id);
    await query(`UPDATE invoices SET ${sets.join(", ")} WHERE id = $${idx}`, params);

    const [withAssembly] = await query(
      `SELECT i.*, a.vin, a.vin_last5, a.vehicle_model, a.status, a.assigned_to
       FROM invoices i JOIN assemblies a ON a.id = i.assembly_id
       WHERE i.id = $1`,
      [id]
    );

    if (!withAssembly) {
      res.status(404).json({ error: "Fatura bulunamadı." });
      return;
    }
    res.json(withAssembly);
  } catch (err) {
    console.error("PATCH /invoices/:id error:", err);
    res.status(500).json({ error: "Sunucu hatası." });
  }
});

// DELETE /invoices/:id — accounting veya admin
router.delete("/invoices/:id", requireRole("accounting", "admin"), async (req, res) => {
  try {
    const { id } = req.params;
    await query(`DELETE FROM invoices WHERE id = $1`, [id]);
    res.json({ ok: true });
  } catch (err) {
    console.error("DELETE /invoices/:id error:", err);
    res.status(500).json({ error: "Sunucu hatası." });
  }
});

export default router;
