import { Router, type Request, type Response } from "express";
import { pool } from "../pg-pool";
import { extractDocumentText, updateDocumentExtraction } from "../services/document-extractor";
import fs from "fs/promises";
import path from "path";

const router = Router();

const ALLOWED_TYPES = ["pdf", "md", "txt", "docx", "csv", "json"];
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB
const LOCAL_DOCS_ROOT = path.resolve(process.cwd(), "uploads", "client-knowledge");

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

function mapExtensionToType(ext: string): string | null {
  const map: Record<string, string> = {
    pdf: "pdf", md: "md", txt: "txt", docx: "docx", csv: "csv", json: "json",
  };
  return map[ext] || null;
}

function isLocalStoragePath(storagePath: string): boolean {
  return storagePath.startsWith("local:");
}

function toLocalRelativePath(storagePath: string): string {
  return storagePath.replace(/^local:/, "").replace(/\\/g, "/");
}

function toAbsoluteLocalPath(storagePath: string): string {
  const rel = toLocalRelativePath(storagePath);
  return path.resolve(LOCAL_DOCS_ROOT, rel);
}

async function saveLocalDocument(storagePath: string, data: Buffer): Promise<void> {
  const absPath = toAbsoluteLocalPath(storagePath);
  await fs.mkdir(path.dirname(absPath), { recursive: true });
  await fs.writeFile(absPath, data);
}

// POST /api/clients/:clientId/documents — upload
router.post("/:clientId/documents", async (req: Request, res: Response) => {
  try {
    const tenantId = requireTenantId(req, res);
    if (!tenantId) return;

    const clientId = req.params.clientId;

    // Validate multipart via express-fileupload or buffer
    if (!req.files || !req.files.file) {
      return res.status(400).json({ message: "No file uploaded." });
    }

    const file = req.files.file as any;
    const fileSize = file.size || file.data?.length || 0;
    if (fileSize > MAX_FILE_SIZE) {
      return res.status(413).json({ message: "File exceeds 25MB limit." });
    }

    const ext = getExtension(file.name);
    const fileType = mapExtensionToType(ext);
    if (!fileType || !ALLOWED_TYPES.includes(fileType)) {
      return res.status(400).json({ message: `File type .${ext} not supported.` });
    }

    const { randomUUID } = await import("crypto");
    const uuid = randomUUID();
    const relativeStoragePath = `${tenantId}/${clientId}/${uuid}.${ext}`;
    let storagePath = `local:${relativeStoragePath}`;

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (supabaseUrl && supabaseServiceKey) {
      const { createClient } = await import("@supabase/supabase-js");
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      const { error: uploadError } = await supabase.storage
        .from("client-knowledge")
        .upload(relativeStoragePath, file.data, {
          contentType: file.mimetype || "application/octet-stream",
          upsert: false,
        });

      if (!uploadError) {
        storagePath = relativeStoragePath;
      } else {
        console.warn("[upload-doc] Storage unavailable, using local fallback:", uploadError.message);
        await saveLocalDocument(storagePath, file.data);
      }
    } else {
      await saveLocalDocument(storagePath, file.data);
    }

    // Insert record
    const { rows } = await pool.query(
      `INSERT INTO client_documents (tenant_id, client_id, file_name, file_type, file_size, storage_path)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [tenantId, clientId, file.name, fileType, fileSize, storagePath]
    );

    const doc = rows[0];

    // Start background extraction
    extractAndIndex(doc.id, file.data, fileType).catch((err) => {
      console.error(`[extract] Background extraction failed for ${doc.id}:`, err.message);
    });

    res.status(201).json(doc);
  } catch (err: any) {
    console.error("[upload-doc] Error:", err.message);
    res.status(500).json({ message: err.message || "Upload failed." });
  }
});

// GET /api/clients/:clientId/documents — list
router.get("/:clientId/documents", async (req: Request, res: Response) => {
  try {
    const tenantId = requireTenantId(req, res);
    if (!tenantId) return;
    const clientId = req.params.clientId;

    const { rows } = await pool.query(
      `SELECT id, file_name, file_type, file_size, extraction_status, extraction_error, label, created_at, updated_at
       FROM client_documents
       WHERE tenant_id = $1 AND client_id = $2
       ORDER BY created_at DESC`,
      [tenantId, clientId]
    );

    res.json(rows);
  } catch (err: any) {
    console.error("[list-docs] Error:", err.message);
    res.status(500).json({ message: err.message });
  }
});

// GET /api/clients/:clientId/documents/:id/url — signed URL
router.get("/:clientId/documents/:id/url", async (req: Request, res: Response) => {
  try {
    const tenantId = requireTenantId(req, res);
    if (!tenantId) return;
    const { clientId, id } = req.params;

    const { rows } = await pool.query(
      `SELECT storage_path FROM client_documents WHERE id = $1 AND tenant_id = $2 AND client_id = $3`,
      [id, tenantId, clientId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ message: "Document not found." });
    }

    const storagePath = rows[0].storage_path as string;
    if (isLocalStoragePath(storagePath)) {
      return res.json({ signedUrl: `/api/clients/${clientId}/documents/${id}/file` });
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseServiceKey) {
      return res.status(500).json({ message: "Storage is not configured." });
    }

    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data, error } = await supabase.storage
      .from("client-knowledge")
      .createSignedUrl(storagePath, 3600); // 1 hour

    if (error) {
      return res.status(500).json({ message: error.message });
    }

    res.json({ signedUrl: data.signedUrl });
  } catch (err: any) {
    console.error("[doc-url] Error:", err.message);
    res.status(500).json({ message: err.message });
  }
});

// GET /api/clients/:clientId/documents/:id/file — local file fallback
router.get("/:clientId/documents/:id/file", async (req: Request, res: Response) => {
  try {
    const tenantId = requireTenantId(req, res);
    if (!tenantId) return;

    const { clientId, id } = req.params;
    const { rows } = await pool.query(
      `SELECT storage_path, file_name, file_type
       FROM client_documents
       WHERE id = $1 AND tenant_id = $2 AND client_id = $3`,
      [id, tenantId, clientId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "Document not found." });
    }

    const storagePath = String(rows[0].storage_path || "");
    if (!isLocalStoragePath(storagePath)) {
      return res.status(400).json({ message: "Document is not stored locally." });
    }

    const absPath = toAbsoluteLocalPath(storagePath);
    await fs.access(absPath);
    return res.sendFile(absPath);
  } catch (err: any) {
    console.error("[doc-local-file] Error:", err.message);
    res.status(404).json({ message: "File not found." });
  }
});

// DELETE /api/clients/:clientId/documents/:id
router.delete("/:clientId/documents/:id", async (req: Request, res: Response) => {
  try {
    const tenantId = requireTenantId(req, res);
    if (!tenantId) return;
    const { clientId, id } = req.params;

    const { rows } = await pool.query(
      `SELECT storage_path FROM client_documents WHERE id = $1 AND tenant_id = $2 AND client_id = $3`,
      [id, tenantId, clientId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ message: "Document not found." });
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
          .from("client-knowledge")
          .remove([storagePath]);

        if (storageError) {
          console.error("[delete-doc] Storage error:", storageError.message);
        }
      }
    }

    // Delete from DB
    await pool.query(
      `DELETE FROM client_documents WHERE id = $1 AND tenant_id = $2`,
      [id, tenantId]
    );

    res.json({ success: true });
  } catch (err: any) {
    console.error("[delete-doc] Error:", err.message);
    res.status(500).json({ message: err.message });
  }
});

// PATCH /api/clients/:clientId/documents/:id — update label
router.patch("/:clientId/documents/:id", async (req: Request, res: Response) => {
  try {
    const tenantId = requireTenantId(req, res);
    if (!tenantId) return;
    const { id } = req.params;
    const { label } = req.body;

    const { rows } = await pool.query(
      `UPDATE client_documents SET label = $1, updated_at = now()
       WHERE id = $2 AND tenant_id = $3
       RETURNING id, file_name, file_type, file_size, extraction_status, label, created_at, updated_at`,
      [label || null, id, tenantId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "Document not found." });
    }

    res.json(rows[0]);
  } catch (err: any) {
    console.error("[patch-doc] Error:", err.message);
    res.status(500).json({ message: err.message });
  }
});

// GET /api/clients/:clientId/knowledge-context?q=query
router.get("/:clientId/knowledge-context", async (req: Request, res: Response) => {
  try {
    const tenantId = requireTenantId(req, res);
    if (!tenantId) return;
    const clientId = req.params.clientId;
    const query = String(req.query.q || "").trim();

    if (!query) {
      return res.status(400).json({ message: "Missing query parameter 'q'." });
    }

    const { rows } = await pool.query(
      `SELECT id, file_name, file_type, label,
              ts_rank(search_vector, plainto_tsquery('portuguese', $3)) AS rank
       FROM client_documents
       WHERE tenant_id = $1 AND client_id = $2
         AND search_vector @@ plainto_tsquery('portuguese', $3)
         AND extraction_status = 'indexed'
       ORDER BY rank DESC
       LIMIT 3`,
      [tenantId, clientId, query]
    );

    res.json(rows);
  } catch (err: any) {
    console.error("[knowledge-context] Error:", err.message);
    res.status(500).json({ message: err.message });
  }
});

async function extractAndIndex(documentId: string, buffer: Buffer, fileType: string) {
  try {
    await pool.query(
      `UPDATE client_documents SET extraction_status = 'processing' WHERE id = $1`,
      [documentId]
    );

    const { text, truncated } = await extractDocumentText(buffer, fileType as any);
    await updateDocumentExtraction(documentId, text, truncated, "indexed");
  } catch (err: any) {
    await updateDocumentExtraction(documentId, "", false, "failed", err.message);
  }
}

export default router;
