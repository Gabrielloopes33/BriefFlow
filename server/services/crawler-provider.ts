/**
 * Camada de abstração de provider de crawling (ADR-002).
 * Permite trocar entre crawler próprio e APIs externas sem mudar o post-worker.
 */

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

export interface CrawlResult {
  contents: CrawledContent[];
  total_urls: number;
  successful: number;
  failed: number;
}

export interface CrawlerProvider {
  readonly name: string;
  crawlBatch(options: {
    tenant_id: string;
    client_id: string;
    sources: CrawlSource[];
  }): Promise<CrawlResult>;
}

import { InternalCrawlerProvider } from "./internal-crawler-provider";
import { SocialApiProvider } from "./social-api-provider";

/** Seleciona provider baseado no tipo de fonte e configuração */
export function selectProvider(sourceType: string): CrawlerProvider {
  const socialTypes = ['instagram', 'linkedin', 'twitter', 'x', 'tiktok', 'facebook'];
  const normalized = sourceType.toLowerCase();

  if (socialTypes.includes(normalized)) {
    return new SocialApiProvider();
  }

  return new InternalCrawlerProvider();
}
