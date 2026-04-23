/**
 * Provider de crawling para redes sociais via API externa barata.
 * Suporta: Scrapingdog, Scrape.do, RapidAPI, ou qualquer endpoint configurável.
 *
 * Para configurar, veja: docs/EXECUTIONS/sprint-04-social-api-guide.md
 *
 * Variáveis de ambiente:
 *   SOCIAL_API_PROVIDER   — nome do provider (scrapingdog | scrapedo | rapidapi | custom)
 *   SOCIAL_API_KEY        — API key
 *   SOCIAL_API_ENDPOINT   — endpoint custom (opcional, obrigatório para rapidapi/custom)
 *
 * Como adicionar um novo provider:
 *   1. Adicione o case em _buildUrl()
 *   2. Adicione o adapter em _normalizeResponse() se o formato for diferente
 *   3. Atualize docs/EXECUTIONS/sprint-04-social-api-guide.md
 */

import type { CrawlerProvider, CrawlResult, CrawlSource, CrawledContent } from "./crawler-provider";

const PROVIDER = process.env.SOCIAL_API_PROVIDER || "";
const API_KEY = process.env.SOCIAL_API_KEY || "";
const CUSTOM_ENDPOINT = process.env.SOCIAL_API_ENDPOINT || "";

export class SocialApiProvider implements CrawlerProvider {
  readonly name = "social-api";

  async crawlBatch(options: {
    tenant_id: string;
    client_id: string;
    sources: CrawlSource[];
  }): Promise<CrawlResult> {
    if (!PROVIDER || !API_KEY) {
      console.warn(
        `[social-api] Provider não configurado. Configure SOCIAL_API_PROVIDER e SOCIAL_API_KEY.`
      );
      console.warn(
        `[social-api] Veja o guia em: docs/EXECUTIONS/sprint-04-social-api-guide.md`
      );
      return { contents: [], total_urls: options.sources.length, successful: 0, failed: options.sources.length };
    }

    const contents: CrawledContent[] = [];
    let successful = 0;

    for (const source of options.sources) {
      try {
        const content = await this._fetchSocial(source);
        if (content) {
          contents.push(content);
          successful++;
        }
      } catch (err: any) {
        console.error(`[social-api] Erro ao buscar ${source.url}:`, err.message);
      }
    }

    return {
      contents,
      total_urls: options.sources.length,
      successful,
      failed: options.sources.length - successful,
    };
  }

  private async _fetchSocial(source: CrawlSource): Promise<CrawledContent | null> {
    const url = this._buildUrl(source);
    if (!url) return null;

    const headers: Record<string, string> = { "Content-Type": "application/json" };

    // RapidAPI requer headers específicos
    if (PROVIDER.toLowerCase() === "rapidapi") {
      headers["X-RapidAPI-Key"] = API_KEY;
      if (CUSTOM_ENDPOINT) {
        // Extrair host do endpoint custom
        try {
          const host = new URL(CUSTOM_ENDPOINT).host;
          headers["X-RapidAPI-Host"] = host;
        } catch {
          // ignore
        }
      }
    }

    const response = await fetch(url, {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(`HTTP ${response.status}: ${text}`);
    }

    const data = await response.json();
    return this._normalizeResponse(data, source);
  }

  private _buildUrl(source: CrawlSource): string | null {
    const targetUrl = source.url;
    const provider = PROVIDER.toLowerCase();

    switch (provider) {
      case "scrapingdog": {
        // Scrapingdog tem endpoints específicos por rede social
        const type = (source.source_type || "scrape").toLowerCase();
        const socialEndpoints = ["instagram", "linkedin", "twitter"];
        if (socialEndpoints.includes(type)) {
          // Extrair username da URL se possível
          const username = this._extractUsername(targetUrl);
          if (username) {
            return `https://api.scrapingdog.com/${type}?api_key=${API_KEY}&username=${encodeURIComponent(username)}`;
          }
        }
        // Fallback: scraping genérico
        return `https://api.scrapingdog.com/scrape?api_key=${API_KEY}&url=${encodeURIComponent(targetUrl)}&dynamic=false`;
      }

      case "scrapedo":
      case "scrape.do": {
        return `https://api.scrape.do/?token=${API_KEY}&url=${encodeURIComponent(targetUrl)}`;
      }

      case "rapidapi": {
        if (!CUSTOM_ENDPOINT) {
          console.warn(`[social-api] CUSTOM_ENDPOINT é obrigatório para provider rapidapi`);
          return null;
        }
        return `${CUSTOM_ENDPOINT}?url=${encodeURIComponent(targetUrl)}`;
      }

      case "custom": {
        if (!CUSTOM_ENDPOINT) {
          console.warn(`[social-api] CUSTOM_ENDPOINT é obrigatório para provider custom`);
          return null;
        }
        return `${CUSTOM_ENDPOINT}?url=${encodeURIComponent(targetUrl)}&key=${API_KEY}`;
      }

      default: {
        console.warn(`[social-api] Provider desconhecido: ${PROVIDER}. Providers suportados: scrapingdog, scrapedo, rapidapi, custom`);
        return null;
      }
    }
  }

  private _normalizeResponse(data: any, source: CrawlSource): CrawledContent | null {
    const provider = PROVIDER.toLowerCase();

    // Scrapingdog Instagram/LinkedIn/Twitter tem formato aninhado
    if (provider === "scrapingdog") {
      // Alguns endpoints retornam { data: { ... } }
      const payload = data.data || data;
      return {
        title: payload.full_name || payload.title || payload.name || `Perfil ${source.source_type}`,
        url: source.url,
        content_text: payload.biography || payload.headline || payload.description || JSON.stringify(payload),
        summary: payload.biography || payload.headline || undefined,
        author: payload.username || payload.publicIdentifier || undefined,
        published_at: undefined, // perfis sociais não têm data de publicação
        tags: Array.isArray(payload.skills) ? payload.skills : [],
        source_type: source.source_type || "social",
        word_count: undefined,
      };
    }

    // RapidAPI — cada API tem formato diferente, aqui usamos heurística genérica
    if (provider === "rapidapi") {
      const payload = data.data || data.result || data;
      return {
        title: payload.full_name || payload.title || payload.name || "Post social",
        url: source.url,
        content_text: payload.biography || payload.caption || payload.text || payload.description || JSON.stringify(payload),
        summary: payload.biography || payload.description || undefined,
        author: payload.username || payload.author || undefined,
        published_at: payload.published_at || payload.date || undefined,
        tags: Array.isArray(payload.tags) ? payload.tags : [],
        source_type: source.source_type || "social",
        word_count: undefined,
      };
    }

    // Scrape.do e custom — resposta direta do site
    // Tentamos extrair o melhor possível
    return {
      title: data.title || data.name || "Post social",
      url: source.url,
      content_text: data.content || data.text || data.caption || data.biography || JSON.stringify(data),
      summary: data.summary || data.description || data.biography || undefined,
      author: data.author || data.username || undefined,
      published_at: data.published_at || data.date || undefined,
      tags: Array.isArray(data.tags) ? data.tags : [],
      source_type: source.source_type || "social",
      word_count: data.word_count || undefined,
    };
  }

  /**
   * Extrai username de uma URL de rede social.
   * Ex: https://instagram.com/neymarjr -> neymarjr
   */
  private _extractUsername(url: string): string | null {
    try {
      const path = new URL(url).pathname;
      const match = path.match(/^\/(?:in\/)?([^\/\?]+)/);
      return match ? match[1] : null;
    } catch {
      return null;
    }
  }
}
