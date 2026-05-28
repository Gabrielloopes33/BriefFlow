import { pool } from "../pg-pool";

export type DocumentType = "pdf" | "md" | "txt" | "docx" | "csv" | "json";

const MAX_TEXT_LENGTH = 1024 * 1024; // 1MB

async function extractPdfText(buffer: Buffer): Promise<string> {
  try {
    const pdfParse = await import("pdf-parse-fork");
    const result = await pdfParse.default(buffer);
    return result.text || "";
  } catch (err: any) {
    throw new Error(`PDF extraction failed: ${err.message}`);
  }
}

async function extractDocxText(buffer: Buffer): Promise<string> {
  try {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ buffer });
    return result.value || "";
  } catch (err: any) {
    throw new Error(`DOCX extraction failed: ${err.message}`);
  }
}

function extractRawText(buffer: Buffer): string {
  return buffer.toString("utf-8");
}

function truncateText(text: string, maxLength: number): { text: string; truncated: boolean } {
  if (text.length <= maxLength) {
    return { text, truncated: false };
  }
  return { text: text.slice(0, maxLength) + "\n\n[Texto truncado — excedeu 1MB]", truncated: true };
}

export async function extractDocumentText(
  buffer: Buffer,
  fileType: DocumentType
): Promise<{ text: string; truncated: boolean }> {
  let rawText = "";

  switch (fileType) {
    case "pdf":
      rawText = await extractPdfText(buffer);
      break;
    case "docx":
      rawText = await extractDocxText(buffer);
      break;
    case "md":
    case "txt":
    case "csv":
    case "json":
      rawText = extractRawText(buffer);
      break;
    default:
      throw new Error(`Unsupported file type: ${fileType}`);
  }

  return truncateText(rawText, MAX_TEXT_LENGTH);
}

export async function updateDocumentExtraction(
  documentId: string,
  text: string,
  truncated: boolean,
  status: "indexed" | "failed",
  errorMessage?: string
): Promise<void> {
  await pool.query(
    `UPDATE client_documents
     SET extracted_text = $1,
         extraction_status = $2,
         extraction_error = $3,
         updated_at = now()
     WHERE id = $4`,
    [text, status, errorMessage || null, documentId]
  );
}

export async function getDocumentById(documentId: string): Promise<any | null> {
  const { rows } = await pool.query(
    `SELECT * FROM client_documents WHERE id = $1`,
    [documentId]
  );
  return rows[0] || null;
}
