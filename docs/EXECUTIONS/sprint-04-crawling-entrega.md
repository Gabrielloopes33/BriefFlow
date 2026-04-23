# Sprint 4 — Entrega: Crawling com Crawler Próprio + Abstração de Provider

**Data de entrega:** 2026-04-22
**Owner:** @dev
**Evidência:** Este documento + código nos paths listados abaixo + `pnpm check` verde + teste de resiliência passando

---

## 1. Resumo Executivo

A Sprint 4 evoluiu o sistema de crawling do BriefFlow de um modelo dependente de serviços externos (Apify/Firecrawl) para uma arquitetura híbrida:

- **Crawler próprio** baseado em Playwright para sites dinâmicos (blogs, notícias, RSS)
- **Camada de abstração de provider** (ADR-002) que permite trocar entre crawler interno e APIs externas sem alterar o post-worker
- **Deduplicação por hash SHA-256** por cliente no SQLite do scraper e no PostgreSQL principal
- **Resiliência** com retry exponencial (3 tentativas) e graceful degradation

---

## 2. Decisão Arquitetural

**Opção escolhida:** Evoluir o scraper Python existente (Opção B)

| Critério | Apify (Opção A) | Crawler Próprio (Opção B) | Decisão |
|---|---|---|---|
| Custo mensal | ~$49-149/mês | Servidor próprio (custo fixo) | B |
| Controle de dados | Dados passam por terceiro | Dados ficam no servidor | B |
| Latência | Rede externa | Localhost (porta 8000) | B |
| Manutenção | Depende de changelog de terceiro | Código próprio | B |
| Redes sociais | Bom | Ruim (requer API separada) | A mista — interno para web, API barata para social |

**Arquitetura final:** Crawler interno (Playwright) para web + API barata (Scrapingdog/RapidAPI) para social media.

---

## 3. Componentes Entregues

### 3.1 Scraper Python Evoluído (`scraper/`)

| Arquivo | Descrição |
|---|---|
| `scraper/src/scrapers/playwright_scraper.py` | PlaywrightScraper com stealth básico (viewport, user-agent, webdriver patch, plugins fake, locale pt-BR) + BeautifulSoup + markdownify |
| `scraper/src/api/server.py` | FastAPI com endpoint `/crawl-batch` para crawling em lote por tenant/cliente |
| `scraper/src/models/scraper.py` | Modelos Pydantic: `CrawlBatchRequest`, `CrawlBatchResponse`, `CrawlBatchContent` |
| `scraper/src/models/database.py` | SQLite com `content_hash` (SHA-256 normalizado), deduplicação por `(client_id, content_hash)`, índice `idx_contents_hash` |
| `scraper/src/scrapers/scraper_manager.py` | ScraperManager com `scrape_batch()` que orquestra WebScraper → PlaywrightScraper fallback |

**Funcionalidades do PlaywrightScraper:**
- Stealth: `--disable-blink-features=AutomationControlled`, viewport 1920x1080, user-agent Chrome 120, locale pt-BR
- Injeção de scripts anti-detection: `navigator.webdriver = undefined`, `navigator.plugins = [1,2,3,4,5]`, `window.chrome = { runtime: {} }`
- Extração de conteúdo: remove scripts, styles, nav, footer, aside, ads, cookie-banners
- Conversão para markdown limpo via `markdownify`
- Fallback para texto puro se markdown < 100 chars
- Metadados: título (h1 > .entry-title > title), autor, data de publicação, tags, summary
- Word count e reading time

**Endpoint `/crawl-batch`:**
```http
POST http://localhost:8000/crawl-batch
Content-Type: application/json

{
  "tenant_id": "tenant_123",
  "client_id": "client_456",
  "sources": [
    { "url": "https://example.com/blog/post-1", "source_type": "blog", "source_id": "src_1" }
  ],
  "use_playwright": false
}
```

### 3.2 Cliente HTTP Node.js (`server/services/crawler-client.ts`)

- Classe `CrawlerClient` com base URL configurável via `SCRAPER_API_URL` (default: `http://localhost:8000`)
- `crawlBatch()`: POST para `/crawl-batch` com retry exponencial (3 tentativas, delays: 2s → 4s → 8s, max 8s)
- `scrapeUrl()`: POST para `/scrape-url` (single URL)
- `healthCheck()`: GET para `/health`

### 3.3 Camada de Abstração de Provider (`server/services/crawler-provider.ts`)

- Interface `CrawlerProvider` com `name` e `crawlBatch()`
- `selectProvider(sourceType)`: roteamento automático por tipo de fonte
  - `blog` / `news` / `rss` / `youtube` → `InternalCrawlerProvider` (crawler próprio)
  - `instagram` / `linkedin` / `twitter` / `x` / `tiktok` / `facebook` → `SocialApiProvider` (API externa)
- Feature flag: se `SOCIAL_API_PROVIDER` não estiver configurado, retorna warning e não quebra o pipeline

### 3.4 Provider Interno (`server/services/internal-crawler-provider.ts`)

- Implementação de `CrawlerProvider` que delega para `CrawlerClient`
- `use_playwright: false` por padrão (WebScraper tenta requests primeiro, fallback para Playwright)

### 3.5 Provider Social (`server/services/social-api-provider.ts`)

- Implementação de `CrawlerProvider` para redes sociais
- Suporta: `scrapingdog`, `scrape.do`, `rapidapi`, `custom`
- Normalização de resposta: extrai `title`, `content_text`, `author`, `published_at`, `tags` de formatos variados
- Sem configuração → retorna array vazio com log de warning (não quebra o job)

### 3.6 Integração no Post-Worker (`server/services/post-worker.ts`)

- Estágio `crawling_content` agora executa crawling real em vez de `sleep(300)`
- Fluxo:
  1. Busca sources do cliente no PostgreSQL (`sources` table)
  2. Agrupa sources por `type` (blog, instagram, etc.)
  3. Para cada grupo, chama `selectProvider(type)`
  4. Chama `provider.crawlBatch()` com tenant_id + client_id
  5. Log de resultado: `Provider 'internal': 3/3 OK`
  6. Erro de crawling não falha o job — continua sem contexto (graceful degradation)
- Estágio `extracting_insights` compila snippets das fontes crawleadas (top 5, 1200 chars cada)
- Prompt da OpenAI inclui `sourceContext` com conteúdo real das fontes

### 3.7 Endpoints do Backend Node.js (`server/routes.ts`)

| Endpoint | Método | Descrição |
|---|---|---|
| `/api/crawl/health` | GET | Health check do scraper Python |
| `/api/crawl/test` | POST | Testar crawling de uma URL específica |
| `/api/clients/:clientId/crawl` | POST | Disparar crawling manual para um cliente |
| `/api/clients/:clientId/contents` | GET | Listar conteúdos crawleados de um cliente |

### 3.8 Deduplicação

**Duas camadas:**

1. **SQLite (scraper):** `Database._compute_content_hash()` normaliza texto (lowercase, espaços) e computa SHA-256. `save_content()` verifica `(client_id, content_hash)` antes de inserir.
2. **PostgreSQL (app):** `ON CONFLICT (tenant_id, content_hash) DO NOTHING` na tabela `crawled_contents`.

---

## 4. Testes de Resiliência

Arquivo: `script/s4-crawl-resilience-test.ts`

| Teste | Resultado |
|---|---|
| Health check do scraper na porta 8000 | ✅ PASS |
| Crawl batch com URL real (httpbin.org/html) | ✅ PASS |
| Seleção correta de provider por tipo (`blog` → internal, `instagram` → social) | ✅ PASS |
| Retry com host inválido (falha graceful após 3 tentativas) | ✅ PASS |
| TypeScript compilation (`pnpm check`) | ✅ PASS (0 erros) |

---

## 5. Variáveis de Ambiente

```env
# Scraper Python
SCRAPER_API_URL=http://localhost:8000

# Social API (opcional — apenas se usar Instagram/LinkedIn/Twitter)
SOCIAL_API_PROVIDER=scrapingdog      # scrapingdog | scrapedo | rapidapi | custom
SOCIAL_API_KEY=sua_api_key_aqui
SOCIAL_API_ENDPOINT=                 # apenas para rapidapi/custom
```

---

## 6. Como Executar

### Desenvolvimento

```bash
# Terminal 1 — Scraper Python
cd scraper
. venv/bin/activate  # Windows: .\venv\Scripts\activate
python -m uvicorn src.api.server:app --host 0.0.0.0 --port 8000 --reload

# Terminal 2 — Backend Node.js
pnpm dev

# Terminal 3 — Teste de resiliência
npx tsx script/s4-crawl-resilience-test.ts
```

### Produção

O scraper Python deve rodar como serviço persistente:
- **PM2:** `pm2 start "python -m uvicorn src.api.server:app --host 0.0.0.0 --port 8000" --name briefflow-scraper`
- **Docker:** Container separado na mesma network
- **systemd:** Serviço Linux com auto-restart

---

## 7. Próximos Passos (Backlog Pós-Sprint 4)

| Item | Prioridade | Descrição |
|---|---|---|
| Social API — integrar Scrapingdog | Média | Configurar conta e testar endpoints para Instagram/LinkedIn |
| Dashboard de saúde do crawling | Média | Frontend mostrando status do scraper, taxa de sucesso, últimos conteúdos |
| Agendamento de crawling por tenant | Baixa | Cron job para re-crawl periódico de sources ativas |
| Quality score de fontes | Baixa | Heurística para avaliar qualidade do conteúdo crawleado |
| Rate limiting por tenant | Baixa | Limitar requests de crawling por tenant para evitar abuso |

---

## 8. Artefatos da Sprint

- **Entrega:** `docs/EXECUTIONS/sprint-04-crawling-entrega.md` (este documento)
- **Guia Social API:** `docs/EXECUTIONS/sprint-04-social-api-guide.md`
- **Código:**
  - `scraper/src/scrapers/playwright_scraper.py`
  - `scraper/src/api/server.py` (endpoint `/crawl-batch`)
  - `scraper/src/models/scraper.py` (modelos batch)
  - `scraper/src/models/database.py` (content_hash + dedup)
  - `server/services/crawler-client.ts`
  - `server/services/crawler-provider.ts`
  - `server/services/internal-crawler-provider.ts`
  - `server/services/social-api-provider.ts`
  - `server/services/post-worker.ts` (integração crawling)
  - `server/routes.ts` (endpoints proxy)
- **Testes:** `script/s4-crawl-resilience-test.ts`

---

*Documento gerado automaticamente após conclusão da Sprint 4.*
