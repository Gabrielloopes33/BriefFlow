/**
 * Provider de crawling para redes sociais via Apify.
 * Suporta: Instagram (hashtag posts), TikTok (trends, hashtag videos, profiles)
 *
 * Variáveis de ambiente:
 *   APIFY_API_TOKEN — token da API Apify (obrigatório)
 */

import { ApifyClient } from "apify-client";
import type { CrawlerProvider, CrawlResult, CrawlSource, CrawledContent } from "./crawler-provider";

const APIFY_TOKEN = process.env.APIFY_API_TOKEN || "";

export class ApifySocialProvider implements CrawlerProvider {
  readonly name = "apify-social";
  private client: ApifyClient;

  constructor() {
    this.client = new ApifyClient({ token: APIFY_TOKEN });
  }

  async crawlBatch(options: {
    tenant_id: string;
    client_id: string;
    sources: CrawlSource[];
  }): Promise<CrawlResult> {
    if (!APIFY_TOKEN) {
      console.warn("[apify-social] APIFY_API_TOKEN não configurado");
      return { contents: [], total_urls: options.sources.length, successful: 0, failed: options.sources.length };
    }

    const contents: CrawledContent[] = [];
    let successful = 0;

    for (const source of options.sources) {
      try {
        const type = (source.source_type || "instagram").toLowerCase();
        const content = await this._fetchByType(type, source.url);
        if (content && content.length > 0) {
          contents.push(...content);
          successful++;
        }
      } catch (err: any) {
        console.error(`[apify-social] Erro ao buscar ${source.url}:`, err.message);
      }
    }

    return {
      contents,
      total_urls: options.sources.length,
      successful,
      failed: options.sources.length - successful,
    };
  }

  /**
   * Busca trends do TikTok Creative Center
   */
  async fetchTikTokTrends(options: {
    trendType?: "hashtag" | "sound" | "creator";
    countryCode?: string;
    period?: number; // dias
    maxResults?: number;
  } = {}): Promise<CrawledContent[]> {
    if (!APIFY_TOKEN) throw new Error("APIFY_API_TOKEN não configurado");

    const {
      trendType = "hashtag",
      countryCode = "BR",
      period = 7,
      maxResults = 50,
    } = options;

    console.log(`[apify-social] Buscando TikTok trends: ${trendType}, ${countryCode}, ${period}d`);

    const run = await this.client.actor("automation-lab/tiktok-trends-scraper").call({
      trendType,
      countryCode,
      period,
      maxResults,
    });

    const { items } = await this.client.dataset(run.defaultDatasetId).listItems();

    return items.map((item: any) => {
      const name = item.name || item.hashtag || item.sound || item.creator || "TikTok Trend";
      return {
        title: name.startsWith("#") ? name : `#${name}`,
        url: item.url || `https://www.tiktok.com/tag/${name.replace(/^#/, "")}`,
        content_text: item.description || JSON.stringify(item),
        summary: item.description || item.bio || undefined,
        author: item.creator || item.author || undefined,
        published_at: undefined,
        tags: [trendType, countryCode, "tiktok", "trend"],
        source_type: "tiktok_trend",
        word_count: undefined,
      };
    });
  }

  /**
   * Busca posts recentes de uma hashtag no Instagram
   */
  async fetchInstagramHashtag(options: {
    hashtag: string;
    maxResults?: number;
  }): Promise<CrawledContent[]> {
    if (!APIFY_TOKEN) throw new Error("APIFY_API_TOKEN não configurado");

    const { hashtag, maxResults = 30 } = options;
    const cleanTag = hashtag.replace(/^#/, "");

    console.log(`[apify-social] Buscando Instagram hashtag: #${cleanTag}`);

    const run = await this.client.actor("apify/instagram-scraper").call({
      search: cleanTag,
      searchType: "hashtag",
      resultsLimit: maxResults,
    });

    const { items } = await this.client.dataset(run.defaultDatasetId).listItems();

    return items.map((item: any) => ({
      title: item.caption?.slice(0, 100) || `Post #${cleanTag}`,
      url: item.url || `https://www.instagram.com/p/${item.shortCode}/`,
      content_text: item.caption || "",
      summary: item.caption?.slice(0, 200) || undefined,
      author: item.ownerUsername || undefined,
      published_at: item.timestamp || undefined,
      tags: [cleanTag, "instagram", ...(item.hashtags || [])],
      source_type: "instagram_hashtag",
      word_count: item.caption?.split(/\s+/).length,
    }));
  }

  /**
   * Busca vídeos de uma hashtag no TikTok
   */
  async fetchTikTokHashtag(options: {
    hashtag: string;
    maxResults?: number;
  }): Promise<CrawledContent[]> {
    if (!APIFY_TOKEN) throw new Error("APIFY_API_TOKEN não configurado");

    const { hashtag, maxResults = 30 } = options;
    const cleanTag = hashtag.replace(/^#/, "");

    console.log(`[apify-social] Buscando TikTok hashtag: #${cleanTag}`);

    const run = await this.client.actor("clockworks/tiktok-scraper").call({
      hashtags: [cleanTag],
      resultsPerPage: maxResults,
    });

    const { items } = await this.client.dataset(run.defaultDatasetId).listItems();

    return items.map((item: any) => ({
      title: item.text?.slice(0, 100) || `Video #${cleanTag}`,
      url: item.webVideoUrl || item.url || `https://www.tiktok.com/tag/${cleanTag}`,
      content_text: item.text || "",
      summary: item.text?.slice(0, 200) || undefined,
      author: item.authorMeta?.name || item.author || undefined,
      published_at: item.createTimeISO || undefined,
      tags: [cleanTag, "tiktok", ...(item.hashtags || [])],
      source_type: "tiktok_hashtag",
      word_count: item.text?.split(/\s+/).length,
    }));
  }

  private async _fetchByType(type: string, url: string): Promise<CrawledContent[]> {
    if (type === "tiktok") {
      // Extrair hashtag da URL se possível
      const hashtag = this._extractHashtag(url);
      if (hashtag) {
        return this.fetchTikTokHashtag({ hashtag });
      }
      // Fallback: buscar trends
      return this.fetchTikTokTrends();
    }

    if (type === "instagram") {
      const hashtag = this._extractHashtag(url) || this._extractInstagramUsername(url);
      if (hashtag) {
        return this.fetchInstagramHashtag({ hashtag });
      }
    }

    return [];
  }

  private _extractHashtag(url: string): string | null {
    try {
      const match = url.match(/[#/]tag[s]?\/([^/?]+)/i) || url.match(/#(.+)/);
      return match ? match[1] : null;
    } catch {
      return null;
    }
  }

  private _extractInstagramUsername(url: string): string | null {
    try {
      const match = url.match(/instagram\.com\/([^/?]+)/);
      return match && match[1] !== "explore" ? match[1] : null;
    } catch {
      return null;
    }
  }
}
