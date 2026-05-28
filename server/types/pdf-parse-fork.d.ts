declare module "pdf-parse-fork" {
  interface PDFParseResult {
    text: string;
    numpages: number;
    info: Record<string, unknown>;
    metadata: Record<string, unknown>;
    version: string;
  }
  function pdfParse(data: Buffer): Promise<PDFParseResult>;
  export default pdfParse;
}
