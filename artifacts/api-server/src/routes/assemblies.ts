import { Router } from "express";
import { query, queryOne } from "../lib/db.js";
import { requireAuth, requireRole, type JwtPayload } from "../lib/middleware.js";

const router = Router();

router.use(requireAuth);

router.get("/assemblies", async (req, res) => {
  try {
    const user = (req as any).user as JwtPayload;

    let sql = `
      SELECT
        a.*,
        COALESCE(
          json_agg(DISTINCT jsonb_build_object(
            'id', p.id, 'uri', p.uri, 'type', p.type,
            'angle', p.angle, 'note', p.note, 'created_at', p.created_at
          )) FILTER (WHERE p.id IS NOT NULL), '[]'
        ) AS photos,
        COALESCE(
          json_agg(DISTINCT jsonb_build_object(
            'id', d.id, 'description', d.description, 'severity', d.severity,
            'resolved', d.resolved, 'created_at', d.created_at
          )) FILTER (WHERE d.id IS NOT NULL), '[]'
        ) AS defects,
        COALESCE(
          json_agg(DISTINCT jsonb_build_object(
            'id', l.id, 'action', l.action, 'user_id', l.user_id,
            'user_name', l.user_name, 'created_at', l.created_at
          )) FILTER (WHERE l.id IS NOT NULL), '[]'
        ) AS activity_log
      FROM assemblies a
      LEFT JOIN photos p ON p.assembly_id = a.id
      LEFT JOIN defects d ON d.assembly_id = a.id
      LEFT JOIN activity_log l ON l.assembly_id = a.id
    `;

    const params: any[] = [];

    if (user.role === "field") {
      sql += ` WHERE a.assigned_to_user_id = $1`;
      params.push(user.id);
    }

    sql += ` GROUP BY a.id ORDER BY a.updated_at DESC`;

    const rows = await query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error("GET /assemblies error:", err);
    res.status(500).json({ error: "Sunucu hatası." });
  }
});

router.get("/assemblies/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const [row] = await query(
      `SELECT
        a.*,
        COALESCE(
          json_agg(DISTINCT jsonb_build_object(
            'id', p.id, 'uri', p.uri, 'type', p.type,
            'angle', p.angle, 'note', p.note, 'created_at', p.created_at
          )) FILTER (WHERE p.id IS NOT NULL), '[]'
        ) AS photos,
        COALESCE(
          json_agg(DISTINCT jsonb_build_object(
            'id', d.id, 'description', d.description, 'severity', d.severity,
            'resolved', d.resolved, 'created_at', d.created_at
          )) FILTER (WHERE d.id IS NOT NULL), '[]'
        ) AS defects,
        COALESCE(
          json_agg(DISTINCT jsonb_build_object(
            'id', l.id, 'action', l.action, 'user_id', l.user_id,
            'user_name', l.user_name, 'created_at', l.created_at
          )) FILTER (WHERE l.id IS NOT NULL), '[]'
        ) AS activity_log
      FROM assemblies a
      LEFT JOIN photos p ON p.assembly_id = a.id
      LEFT JOIN defects d ON d.assembly_id = a.id
      LEFT JOIN activity_log l ON l.assembly_id = a.id
      WHERE a.id = $1
      GROUP BY a.id`,
      [id]
    );
    if (!row) {
      res.status(404).json({ error: "Kayıt bulunamadı." });
      return;
    }
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: "Sunucu hatası." });
  }
});

router.post("/assemblies", requireRole("field", "admin"), async (req, res) => {
  try {
    const user = (req as any).user as JwtPayload;
    const body = req.body;
    const now = new Date().toISOString();

    const assignedToUserId: string | null =
      body.assignedToUserId ?? (user.role === "field" ? user.id : null);

    const [row] = await query(
      `INSERT INTO assemblies (
        vehicle_model, vin, vin_last5, glass_product_ids,
        assigned_to, assigned_to_user_id,
        approval_doc_photo_uri, vin_photo_uri,
        status, status_timestamps, water_test_result,
        water_test_customer_approval, notes, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8,
        'pending', $9::jsonb, NULL, NULL, $10, $11, $11
      ) RETURNING *`,
      [
        body.vehicleModel ?? body.vehicle_model,
        body.vin,
        body.vinLast5 ?? body.vin_last5 ?? body.vin?.slice(-5),
        JSON.stringify(body.glassProductIds ?? body.glass_product_ids ?? []),
        body.assignedTo ?? body.assigned_to ?? user.name,
        assignedToUserId,
        body.approvalDocPhotoUri ?? body.approval_doc_photo_uri ?? null,
        body.vinPhotoUri ?? body.vin_photo_uri ?? null,
        JSON.stringify({ pending: now }),
        body.notes ?? "",
        now,
      ]
    );

    await query(
      `INSERT INTO activity_log (assembly_id, action, user_id, user_name, created_at)
       VALUES ($1, 'Kayıt oluşturuldu', $2, $3, $4)`,
      [row.id, user.id, user.name, now]
    );

    if (body.glassProductIds?.length) {
      for (const gid of body.glassProductIds) {
        await query(
          `UPDATE glass_stock SET stock = GREATEST(0, stock - 1), updated_at = $1 WHERE id = $2`,
          [now, gid]
        );
      }
    }

    res.status(201).json(row);
  } catch (err) {
    console.error("POST /assemblies error:", err);
    res.status(500).json({ error: "Sunucu hatası." });
  }
});

router.patch("/assemblies/:id", requireRole("field", "admin"), async (req, res) => {
  try {
    const { id } = req.params;
    const user = (req as any).user as JwtPayload;
    const body = req.body;
    const now = new Date().toISOString();

    const existing = await queryOne<{ status: string; status_timestamps: any }>(
      `SELECT status, status_timestamps FROM assemblies WHERE id = $1`,
      [id]
    );
    if (!existing) {
      res.status(404).json({ error: "Kayıt bulunamadı." });
      return;
    }

    const fieldMap: Record<string, string> = {
      vehicleModel: "vehicle_model",
      vin: "vin",
      vinLast5: "vin_last5",
      glassProductIds: "glass_product_ids",
      assignedTo: "assigned_to",
      assignedToUserId: "assigned_to_user_id",
      status: "status",
      waterTestResult: "water_test_result",
      waterTestCustomerApproval: "water_test_customer_approval",
      installationCompletedAt: "installation_completed_at",
      completedAt: "completed_at",
      notes: "notes",
      approvalDocPhotoUri: "approval_doc_photo_uri",
      vinPhotoUri: "vin_photo_uri",
    };

    const setClauses: string[] = ["updated_at = $1"];
    const params: any[] = [now];
    let idx = 2;

    for (const [jsKey, dbKey] of Object.entries(fieldMap)) {
      if (jsKey in body) {
        const val = body[jsKey];
        if (dbKey === "glass_product_ids") {
          setClauses.push(`${dbKey} = $${idx++}::jsonb`);
          params.push(JSON.stringify(val));
        } else {
          setClauses.push(`${dbKey} = $${idx++}`);
          params.push(val);
        }
      }
    }

    const statusChangingTo =
      body.status && body.status !== existing.status ? body.status : null;

    if (statusChangingTo) {
      const ts = { ...(existing.status_timestamps ?? {}), [statusChangingTo]: now };
      setClauses.push(`status_timestamps = $${idx++}::jsonb`);
      params.push(JSON.stringify(ts));
    }

    params.push(id);
    await query(
      `UPDATE assemblies SET ${setClauses.join(", ")} WHERE id = $${idx}`,
      params
    );

    // Auto-deduct consumables when installation starts
    if (statusChangingTo === "installation") {
      const deductions = [
        { id: "c1", amount: 3 },
        { id: "c2", amount: 0.05 },
        { id: "c4", amount: 0.25 },
      ];
      for (const d of deductions) {
        await query(
          `UPDATE consumables SET stock = GREATEST(0, stock - $1), updated_at = $2 WHERE id = $3`,
          [d.amount, now, d.id]
        );
      }
      await query(
        `INSERT INTO activity_log (assembly_id, action, user_id, user_name, created_at)
         VALUES ($1, 'Otomatik sarf düşümü: 3 Silikon, 0.05 lt Primer, 0.25 Bant', $2, $3, $4)`,
        [id, user.id, user.name, now]
      );
    }

    if (body.logAction) {
      await query(
        `INSERT INTO activity_log (assembly_id, action, user_id, user_name, created_at)
         VALUES ($1, $2, $3, $4, $5)`,
        [id, body.logAction, user.id, user.name, now]
      );
    }

    const [updated] = await query(
      `SELECT
        a.*,
        COALESCE(
          json_agg(DISTINCT jsonb_build_object(
            'id', p.id, 'uri', p.uri, 'type', p.type,
            'angle', p.angle, 'note', p.note, 'created_at', p.created_at
          )) FILTER (WHERE p.id IS NOT NULL), '[]'
        ) AS photos,
        COALESCE(
          json_agg(DISTINCT jsonb_build_object(
            'id', d.id, 'description', d.description, 'severity', d.severity,
            'resolved', d.resolved, 'created_at', d.created_at
          )) FILTER (WHERE d.id IS NOT NULL), '[]'
        ) AS defects,
        COALESCE(
          json_agg(DISTINCT jsonb_build_object(
            'id', l.id, 'action', l.action, 'user_id', l.user_id,
            'user_name', l.user_name, 'created_at', l.created_at
          )) FILTER (WHERE l.id IS NOT NULL), '[]'
        ) AS activity_log
      FROM assemblies a
      LEFT JOIN photos p ON p.assembly_id = a.id
      LEFT JOIN defects d ON d.assembly_id = a.id
      LEFT JOIN activity_log l ON l.assembly_id = a.id
      WHERE a.id = $1
      GROUP BY a.id`,
      [id]
    );

    res.json(updated);
  } catch (err) {
    console.error("PATCH /assemblies error:", err);
    res.status(500).json({ error: "Sunucu hatası." });
  }
});

router.delete("/assemblies/:id", requireRole("admin"), async (req, res) => {
  try {
    const { id } = req.params;
    await query(`DELETE FROM photos WHERE assembly_id = $1`, [id]);
    await query(`DELETE FROM defects WHERE assembly_id = $1`, [id]);
    await query(`DELETE FROM activity_log WHERE assembly_id = $1`, [id]);
    await query(`DELETE FROM assemblies WHERE id = $1`, [id]);
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Sunucu hatası." });
  }
});

router.post("/assemblies/:id/photos", requireRole("field", "admin"), async (req, res) => {
  try {
    const { id } = req.params;
    const { uri, type, angle, note } = req.body;
    const now = new Date().toISOString();
    const [row] = await query(
      `INSERT INTO photos (assembly_id, uri, type, angle, note, created_at)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [id, uri, type, angle ?? null, note ?? null, now]
    );
    res.status(201).json(row);
  } catch {
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
    const rows = await Promise.all(
      photos.map((p) =>
        query(
          `INSERT INTO photos (assembly_id, uri, type, angle, note, created_at)
           VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
          [id, p.uri, p.type, p.angle ?? null, p.note ?? null, now]
        ).then((r) => r[0])
      )
    );
    res.status(201).json(rows);
  } catch {
    res.status(500).json({ error: "Sunucu hatası." });
  }
});

router.post("/assemblies/:id/defects", requireRole("field", "admin"), async (req, res) => {
  try {
    const { id } = req.params;
    const { description, severity } = req.body;
    const [row] = await query(
      `INSERT INTO defects (assembly_id, description, severity, resolved, created_at)
       VALUES ($1, $2, $3, false, NOW()) RETURNING *`,
      [id, description, severity]
    );
    res.status(201).json(row);
  } catch {
    res.status(500).json({ error: "Sunucu hatası." });
  }
});

router.patch("/assemblies/:id/defects/:defectId", requireRole("field", "admin"), async (req, res) => {
  try {
    const { defectId } = req.params;
    const { resolved } = req.body;
    const [row] = await query(
      `UPDATE defects SET resolved = $1, updated_at = NOW()
       WHERE id = $2 RETURNING *`,
      [resolved, defectId]
    );
    res.json(row);
  } catch {
    res.status(500).json({ error: "Sunucu hatası." });
  }
});

export default router;
