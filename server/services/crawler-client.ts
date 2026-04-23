/**
 * Cliente HTTP para o scraper Python (porta 8000).
 * Usado pelo post-worker.ts no estágio crawling_content.
 */

const SCRAPER_API_URL = process.env.SCRAPER_API_URL || "http://localhost:8000";

export interface CrawlSource {
  url: string;
  source_type?: string;
  source_id?: string;
}

export interface CrawledContent {
  title: string;
  url: string;
  content_text?: string;
  summary?: string;
  author?: string;
  published_at?: string;
  tags: string[];
  source_type: string;
  word_count?: number;
}

export interface CrawlBatchResult {
  tenant_id: string;
  client_id: string;
  contents: CrawledContent[];
  total_urls: number;
  successful: number;
  failed: number;
}

export class CrawlerClient {
  private baseUrl: string;

  constructor(baseUrl: string = SCRAPER_API_URL) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
  }

  /**
   * Faz crawling em lote de fontes para um cliente/tenant.
   * Com retry exponencial (max 3 tentativas).
   */
  async crawlBatch(options: {
    tenant_id: string;
    client_id: string;
    sources: CrawlSource[];
    use_playwright?: boolean;
  }): Promise<CrawlBatchResult> {
    const url = `${this.baseUrl}/crawl-batch`;
    const body = JSON.stringify({
      tenant_id: options.tenant_id,
      client_id: options.client_id,
      sources: options.sources,
      use_playwright: options.use_playwright ?? false,
    });

    const maxRetries = 3;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
        });

        if (!response.ok) {
          const text = await response.text().catch(() => "");
          throw new Error(`Crawler API error ${response.status}: ${text}`);
        }

        return (await response.json()) as CrawlBatchResult;
      } catch (err: any) {
        if (attempt === maxRetries) throw err;
        const delay = Math.min(1000 * 2 ** attempt, 8000);
        console.log(`[crawler-client] Retry ${attempt}/${maxRetries} after ${delay}ms`);
        await new Promise((r) => setTimeout(r, delay));
      }
    }

    throw new Error("Unreachable");
  }

  /**
   * Faz scraping de uma única URL.
   */
  async scrapeUrl(url: string): Promise<CrawledContent | null> {
    const endpoint = `${this.baseUrl}/scrape-url`;

    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as CrawledContent;
  }

  /**
   * Health check do scraper.
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`, { method: "GET" });
      return response.ok;
    } catch {
      return false;
    }
  }
}
