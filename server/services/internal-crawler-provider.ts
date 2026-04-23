/**
 * Provider de crawling interno — chama o scraper Python via HTTP.
 * Usado para blogs, notícias, RSS e sites dinâmicos.
 */

import type { CrawlerProvider, CrawlResult, CrawlSource } from "./crawler-provider";
import { CrawlerClient } from "./crawler-client";

export class InternalCrawlerProvider implements CrawlerProvider {
  readonly name = "internal";
  private client: CrawlerClient;

  constructor() {
    this.client = new CrawlerClient();
  }

  async crawlBatch(options: {
    tenant_id: string;
    client_id: string;
    sources: CrawlSource[];
  }): Promise<CrawlResult> {
    return this.client.crawlBatch({
      tenant_id: options.tenant_id,
      client_id: options.client_id,
      sources: options.sources,
      use_playwright: false,
    });
  }
}
