import { Router, type Request, type Response } from "express";
import { pool } from "../pg-pool";
import fs from "fs/promises";
import path from "path";

const router = Router();

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const ALLOWED_EXTS = [".jpg", ".jpeg", ".png", ".webp", ".gif"];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_IMAGES = 100;
const LOCAL_MOODBOARD_ROOT = path.resolve(process.cwd(), "uploads", "moodboard");

function resolveTenantId(req: any): string | null {
  const tenantId = req.headers?.["x-tenant-id"] || req.query?.tenant_id || req.body?.tenant_id;
  return typeof tenantId === "string" && tenantId.trim().length > 0 ? tenantId : null;
}

function requireTenantId(req: any, res: any): string | null {
  const tenantId = resolveTenantId(req) || req.tenantId || null;
  if (!tenantId) {
    res.status(400).json({ message: "Missing tenant_id." });
    return null;
  }
  return tenantId;
}

function getExtension(filename: string): string {
  const parts = filename.split(".");
  return parts.length > 1 ? parts.pop()!.toLowerCase() : "";
}

function isAllowedImage(file: any): boolean {
  if (ALLOWED_TYPES.includes(file.mimetype)) return true;
  const ext = getExtension(file.name);
  return ALLOWED_EXTS.includes(ext);
}

function isLocalStoragePath(storagePath: string): boolean {
  return storagePath.startsWith("local:");
}

function toLocalRelativePath(storagePath: string): string {
  return storagePath.replace(/^local:/, "").replace(/\\/g, "/");
}

function toAbsoluteLocalPath(storagePath: string): string {
  return path.resolve(LOCAL_MOODBOARD_ROOT, toLocalRelativePath(storagePath));
}

async function saveLocalMoodboardImage(storagePath: string, data: Buffer): Promise<void> {
  const absPath = toAbsoluteLocalPath(storagePath);
  await fs.mkdir(path.dirname(absPath), { recursive: true });
  await fs.writeFile(absPath, data);
}

// POST /api/clients/:clientId/moodboard — upload image(s)
router.post("/:clientId/moodboard", async (req: Request, res: Response) => {
  try {
    const tenantId = requireTenantId(req, res);
    if (!tenantId) return;
    const clientId = req.params.clientId;

    // Check limit
    const { rows: countRows } = await pool.query(
      `SELECT COUNT(*)::int AS count FROM client_moodboard_images WHERE tenant_id = $1 AND client_id = $2`,
      [tenantId, clientId]
    );
    const currentCount = countRows[0].count;

    const files = req.files?.files
      ? Array.isArray(req.files.files)
        ? req.files.files
        : [req.files.files]
      : req.files?.file
        ? Array.isArray(req.files.file)
          ? req.files.file
          : [req.files.file]
        : [];

    if (files.length === 0) {
      return res.status(400).json({ message: "No images uploaded." });
    }

    if (currentCount + files.length > MAX_IMAGES) {
      return res.status(400).json({ message: `Maximum ${MAX_IMAGES} images per client.` });
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
    const canUseSupabaseStorage = Boolean(supabaseUrl && supabaseServiceKey);
    const { createClient } = await import("@supabase/supabase-js");
    const supabase = canUseSupabaseStorage ? createClient(supabaseUrl!, supabaseServiceKey!) : null;
    const { randomUUID } = await import("crypto");

    const results: any[] = [];

    for (const file of files) {
      const fileSize = file.size || file.data?.length || 0;
      if (fileSize > MAX_FILE_SIZE) {
        continue; // Skip oversized files
      }
      if (!isAllowedImage(file)) {
        continue; // Skip invalid types
      }

      const ext = getExtension(file.name);
      const uuid = randomUUID();
      const relativeStoragePath = `${tenantId}/${clientId}/${uuid}.${ext}`;
      let storagePath = `local:${relativeStoragePath}`;
      let publicUrl = `/api/clients/moodboard-file/${tenantId}/${clientId}/${uuid}.${ext}`;

      if (supabase) {
        const { error: uploadError } = await supabase.storage
          .from("moodboard")
          .upload(relativeStoragePath, file.data, {
            contentType: file.mimetype || "image/jpeg",
            upsert: false,
          });

        if (!uploadError) {
          storagePath = relativeStoragePath;
          const publicResult = supabase.storage
            .from("moodboard")
            .getPublicUrl(relativeStoragePath);
          publicUrl = publicResult.data.publicUrl;
        } else {
          console.warn("[moodboard-upload] Storage unavailable, using local fallback:", uploadError.message);
          await saveLocalMoodboardImage(storagePath, file.data);
        }
      } else {
        await saveLocalMoodboardImage(storagePath, file.data);
      }

      const { rows } = await pool.query(
        `INSERT INTO client_moodboard_images (tenant_id, client_id, file_name, storage_path, public_url, display_order)
         VALUES ($1, $2, $3, $4, $5, (SELECT COALESCE(MAX(display_order), 0) + 1 FROM client_moodboard_images WHERE client_id = $2))
         RETURNING *`,
        [tenantId, clientId, file.name, storagePath, publicUrl]
      );

      results.push(rows[0]);
    }

    res.status(201).json(results);
  } catch (err: any) {
    console.error("[moodboard-upload] Error:", err.message);
    res.status(500).json({ message: err.message });
  }
});

// GET /api/clients/moodboard-file/:tenantId/:clientId/:fileName — local file fallback
router.get("/moodboard-file/:tenantId/:clientId/:fileName", async (req: Request, res: Response) => {
  try {
    const { tenantId, clientId, fileName } = req.params;
    const safeName = path.basename(fileName);
    if (safeName !== fileName) {
      return res.status(400).json({ message: "Invalid file path." });
    }

    const absPath = path.resolve(LOCAL_MOODBOARD_ROOT, tenantId, clientId, safeName);
    await fs.access(absPath);
    return res.sendFile(absPath);
  } catch (err: any) {
    return res.status(404).json({ message: "File not found." });
  }
});

// GET /api/clients/:clientId/moodboard — list images
router.get("/:clientId/moodboard", async (req: Request, res: Response) => {
  try {
    const tenantId = requireTenantId(req, res);
    if (!tenantId) return;
    const clientId = req.params.clientId;

    const { rows } = await pool.query(
      `SELECT id, file_name, public_url, label, display_order, created_at
       FROM client_moodboard_images
       WHERE tenant_id = $1 AND client_id = $2
       ORDER BY display_order ASC, created_at DESC`,
      [tenantId, clientId]
    );

    res.json(rows);
  } catch (err: any) {
    console.error("[moodboard-list] Error:", err.message);
    res.status(500).json({ message: err.message });
  }
});

// PATCH /api/clients/:clientId/moodboard/:id — update label or display_order
router.patch("/:clientId/moodboard/:id", async (req: Request, res: Response) => {
  try {
    const tenantId = requireTenantId(req, res);
    if (!tenantId) return;
    const { id } = req.params;
    const { label, display_order } = req.body;

    const updates: string[] = [];
    const values: any[] = [];
    let paramIdx = 1;

    if (label !== undefined) {
      updates.push(`label = $${paramIdx++}`);
      values.push(label || null);
    }
    if (display_order !== undefined) {
      updates.push(`display_order = $${paramIdx++}`);
      values.push(display_order);
    }

    if (updates.length === 0) {
      return res.status(400).json({ message: "No fields to update." });
    }

    values.push(id, tenantId);

    const { rows } = await pool.query(
      `UPDATE client_moodboard_images SET ${updates.join(", ")}, updated_at = now()
       WHERE id = $${paramIdx++} AND tenant_id = $${paramIdx++}
       RETURNING id, file_name, public_url, label, display_order, created_at`,
      values
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "Image not found." });
    }

    res.json(rows[0]);
  } catch (err: any) {
    console.error("[moodboard-patch] Error:", err.message);
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/clients/:clientId/moodboard/:id
router.delete("/:clientId/moodboard/:id", async (req: Request, res: Response) => {
  try {
    const tenantId = requireTenantId(req, res);
    if (!tenantId) return;
    const { id } = req.params;

    const { rows } = await pool.query(
      `SELECT storage_path FROM client_moodboard_images WHERE id = $1 AND tenant_id = $2`,
      [id, tenantId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ message: "Image not found." });
    }

    const storagePath = String(rows[0].storage_path || "");
    if (isLocalStoragePath(storagePath)) {
      const absPath = toAbsoluteLocalPath(storagePath);
      await fs.rm(absPath, { force: true });
    } else {
      const supabaseUrl = process.env.SUPABASE_URL;
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (supabaseUrl && supabaseServiceKey) {
        const { createClient } = await import("@supabase/supabase-js");
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        const { error: storageError } = await supabase.storage
          .from("moodboard")
          .remove([storagePath]);

        if (storageError) {
          console.error("[moodboard-delete] Storage error:", storageError.message);
        }
      }
    }

    await pool.query(
      `DELETE FROM client_moodboard_images WHERE id = $1 AND tenant_id = $2`,
      [id, tenantId]
    );

    res.json({ success: true });
  } catch (err: any) {
    console.error("[moodboard-delete] Error:", err.message);
    res.status(500).json({ message: err.message });
  }
});

export default router;
