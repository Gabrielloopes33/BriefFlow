# Guia de Integração — Social API Provider

**Data:** 2026-04-22
**Owner:** @dev
**Contexto:** Sprint 4 — Crawling para redes sociais (Instagram, LinkedIn, Twitter/X, TikTok, Facebook)

---

## 1. O Problema

Nosso crawler próprio (Playwright) funciona muito bem para **sites abertos** (blogs, notícias, RSS), mas redes sociais têm:

- **Anti-bot agressivo** — Instagram e LinkedIn bloqueiam Playwright em poucas requests
- **Login obrigatório** — muito conteúdo só é visível logado
- **Rate limiting draconiano** — poucas requests por IP/minuto
- **Termos de serviço** — scraping direto pode violar ToS

**Solução:** Usar APIs especializadas de terceiros que já resolveram esses problemas (proxy rotativo, sessões reais, headers corretos).

---

## 2. Opções de Provider Recomendadas

### 2.1 Scrapingdog (⭐ Recomendado — Melhor custo-benefício)

**Site:** [https://www.scrapingdog.com](https://www.scrapingdog.com)
**Preço:** Gratuito (1.000 API calls/mês) → Starter $20/mês (100.000 calls) → Pro $50/mês
**Ideal para:** Instagram, LinkedIn, Twitter/X, Google

**Como se cadastrar:**
1. Acesse https://www.scrapingdog.com
2. Clique em "Get Started Free"
3. Crie conta com email ou Google
4. No dashboard, copie sua **API Key**
5. (Opcional) Adicione cartão para plano pago se precisar de mais volume

**Endpoints úteis:**
```
# LinkedIn Profile
GET https://api.scrapingdog.com/linkedin?api_key=KEY&type=profile&linkId=LINKEDIN_URL

# Instagram Profile
GET https://api.scrapingdog.com/instagram?api_key=KEY&username=USERNAME

# Twitter/X Profile
GET https://api.scrapingdog.com/twitter?api_key=KEY&username=USERNAME

# Scraping genérico (qualquer URL)
GET https://api.scrapingdog.com/scrape?api_key=KEY&url=URL&dynamic=false
```

**Vantagens:**
- ✅ Preço acessível ($20/mês para 100k calls)
- ✅ Documentação clara
- ✅ Suporte a JavaScript rendering (dynamic=true)
- ✅ Não precisa de proxy separado

**Desvantagens:**
- ❌ Dados limitados (perfil público apenas)
- ❌ Não acessa posts privados

---

### 2.2 RapidAPI — Marketplace de APIs

**Site:** [https://rapidapi.com](https://rapidapi.com)
**Preço:** Varia por API — geralmente freemium (100-500 calls/mês gratuitos) → $10-50/mês
**Ideal para:** Quer escolher a API específica para cada rede social

**Como se cadastrar:**
1. Acesse https://rapidapi.com e crie conta
2. Busque por:
   - "Instagram Scraper API" (ex: `social-api7` — 500 requests/mês free)
   - "LinkedIn Data API" (ex: `rocketapi` — 100 requests/mês free)
   - "Twitter/X Scraper API" (ex: `twitter154` — 500 requests/mês free)
3. Clique "Subscribe" no plano gratuito
4. No painel da API, copie:
   - **X-RapidAPI-Key** (sua chave geral do RapidAPI)
   - **X-RapidAPI-Host** (host específico da API)
   - URL base do endpoint

**Exemplo de requisição:**
```bash
curl -X GET "https://instagram-scraper-api2.p.rapidapi.com/v1/info?username=neymarjr" \
  -H "X-RapidAPI-Key: SUA_KEY_AQUI" \
  -H "X-RapidAPI-Host: instagram-scraper-api2.p.rapidapi.com"
```

**Vantagens:**
- ✅ Marketplace — escolhe a melhor API para cada rede
- ✅ Muitas opções freemium para testar
- ✅ APIs especializadas (ex: uma só para Instagram Reels)

**Desvantagens:**
- ❌ Cada API tem formato de resposta diferente
- ❌ Precisa gerenciar múltiplas assinaturas
- ❌ Menos estável — APIs podem ser descontinuadas

---

### 3.3 Scrape.do (Proxy Rotativo)

**Site:** [https://scrape.do](https://scrape.do)
**Preço:** Gratuito (1.000 requests/mês) → $19/mês (100.000 requests)
**Ideal para:** Scraping genérico com proxy premium, não específico para social

**Como se cadastrar:**
1. Acesse https://scrape.do
2. Crie conta gratuita
3. Copie o **Token** do dashboard

**Uso:**
```
GET https://api.scrape.do/?token=SEU_TOKEN&url=URL_ALVO
```

**Nota:** Scrape.do é um proxy rotativo, não uma API de social media. Funciona bem para sites que bloqueiam IP, mas não resolve login obrigatório do Instagram/LinkedIn.

---

### 2.4 Bright Data (Enterprise — mais caro, mais robusto)

**Site:** [https://brightdata.com](https://brightdata.com)
**Preço:** ~$500/mês (pague por uso — $8-15/GB de proxy)
**Ideal para:** Enterprise, grande volume, necessidade de dados completos

**Vantagens:**
- ✅ Proxy residencial real (IPs de usuários reais)
- ✅ Pode acessar conteúdo logado com sessões
- ✅ Infraestrutura mais estável

**Desvantagens:**
- ❌ Caro para MVP/startup
- ❌ Complexidade de configuração

---

### 2.5 Apify Actors (já conhecido do projeto)

**Site:** [https://apify.com/store](https://apify.com/store)
**Preço:** $49/mês (starter) + custo de compute por execução
**Ideal para:** Se já tem conta Apify e quer reutilizar

**Actors úteis:**
- `apify/instagram-scraper` — perfis, posts, comentários
- `apify/linkedin-profile-scraper` — perfis públicos
- `apify/twitter-scraper` — tweets, perfis

---

## 3. Matriz de Decisão

| Necessidade | Recomendação | Custo estimado |
|---|---|---|
| Só testar / MVP | Scrapingdog Free | R$ 0 |
| Produção leve (≤10 clientes) | Scrapingdog Starter ($20/mês) | ~R$ 100/mês |
| Produção média (≤50 clientes) | Scrapingdog Pro ($50/mês) | ~R$ 250/mês |
| Dados específicos (ex: Reels) | RapidAPI + API especializada | $10-30/mês por API |
| Enterprise / grande volume | Bright Data | $500+/mês |
| Já tem Apify | Apify Actors | $49+/mês |

---

## 4. Configuração no BriefFlow

### Passo 1: Escolher provider e criar conta

Recomendo começar com **Scrapingdog Free** (1.000 calls/mês) para testar.

### Passo 2: Adicionar variáveis ao `.env`

```bash
# === Social API Provider (opcional — apenas para Instagram/LinkedIn/Twitter) ===
# Provider: scrapingdog | scrapedo | rapidapi | custom
SOCIAL_API_PROVIDER=scrapingdog
SOCIAL_API_KEY=sd-live-xxxxxxxxxxxxxxxxxxxxxxxx
# Para rapidapi/custom, também configure:
# SOCIAL_API_ENDPOINT=https://instagram-scraper-api2.p.rapidapi.com
```

### Passo 3: Testar

```bash
# Health check geral
curl http://localhost:8000/health

# Testar crawling de uma URL de blog (crawler interno)
curl -X POST http://localhost:3000/api/crawl/test \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com/blog"}'

# Criar um post para um cliente com source Instagram
# (vai tentar SocialApiProvider — se não configurado, retorna warning e continua)
```

### Passo 4: Verificar logs

No terminal do Node.js, você deve ver:
```
[post-worker] Using provider 'social-api' for 2 instagram source(s)
[social-api] Provider não configurado. Configure SOCIAL_API_PROVIDER e SOCIAL_API_KEY.
[post-worker] Provider 'social-api': 0/2 OK
[post-worker] Using provider 'internal' for 3 blog source(s)
[post-worker] Provider 'internal': 3/3 OK
```

Isso é comportamento esperado — o pipeline não quebra, apenas não tem conteúdo social.

---

## 5. Roadmap de Integração Social

### Fase 1: Teste com Scrapingdog (esta semana)
1. [ ] Criar conta gratuita em scrapingdog.com
2. [ ] Copiar API key para `.env`
3. [ ] Testar endpoint manualmente:
   ```bash
   curl "https://api.scrapingdog.com/instagram?api_key=SUA_KEY&username=neymarjr"
   ```
4. [ ] Adicionar uma source do tipo `instagram` no banco para um cliente
5. [ ] Criar um post e verificar se o conteúdo social aparece no contexto

### Fase 2: Normalização de Respostas (próxima sprint)
Cada API retorna um formato diferente. Precisamos mapear campos:

| Campo | Scrapingdog Instagram | RapidAPI Instagram | Scrapingdog LinkedIn |
|---|---|---|---|
| Título | `full_name` | `full_name` | `firstName + lastName` |
| Texto | `biography` | `biography` | `headline` |
| Autor | `username` | `username` | `publicIdentifier` |
| Data | — | — | — |
| Tags | — | — | `skills` |

Isso será implementado no `social-api-provider.ts` com adapters por provider.

### Fase 3: Cache e Rate Limit (futuro)
- Cachear resultados de social API por 6-24h
- Rate limiting: máximo X requests/minuto por provider
- Fallback: se social API falhar, tentar outro provider

---

## 6. Troubleshooting

### "Provider não configurado"
```
[social-api] Provider não configurado. Configure SOCIAL_API_PROVIDER e SOCIAL_API_KEY.
```
**Solução:** Adicione `SOCIAL_API_PROVIDER` e `SOCIAL_API_KEY` no `.env` e reinicie o servidor.

### "HTTP 401/403" da API social
**Causa:** API key inválida ou plano expirou.
**Solução:** Verifique a key no dashboard do provider. Teste a key com curl direto.

### "HTTP 429 Too Many Requests"
**Causa:** Excedeu o limite do plano gratuito.
**Solução:** Aguarde o reset (geralmente 1 minuto) ou upgrade para plano pago.

### "Conteúdo social não aparece no prompt da OpenAI"
**Causa:** A API social retornou dados, mas o formato não foi reconhecido.
**Solução:** Verifique o formato da resposta no log e atualize o `_fetchSocial()` no `social-api-provider.ts`.

---

## 7. Links Rápidos

| Serviço | URL | Preço inicial |
|---|---|---|
| Scrapingdog | https://www.scrapingdog.com | Free (1k/mês) |
| RapidAPI | https://rapidapi.com | Free (varia por API) |
| Scrape.do | https://scrape.do | Free (1k/mês) |
| Bright Data | https://brightdata.com | Pay-as-you-go |
| Apify Store | https://apify.com/store | $49/mês |

---

*Guia criado como entrega complementar da Sprint 4. Atualize conforme integrar novos providers.*
