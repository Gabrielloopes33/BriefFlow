# S9-02 — Meta Sync Worker — Insights Orgânicos + Cache 24h

Status: Ready  
Owner: @dev + @data-engineer  
Sprint: 09  
Prioridade: Crítica  
Pontos: 13  
Depende de: S9-01 (OAuth completo), S6-01 (analytics_cache schema)

## Contexto

Com o OAuth funcionando (S9-01), esta story implementa a sincronização real dos dados de performance do Meta. O worker em S6-01 foi criado com suporte a dados stub — agora conecta de fato à Meta Graph API.

O foco é Page Insights (alcance, engajamento, top posts) via endpoint `/{page-id}/insights`. Dados de Ads ficam para sprint futura.

## Escopo

**IN:**
- Sync real de Page Insights do Meta (30 dias retroativos)
- Métricas: alcance, impressões, engajamento por post, seguidores
- Identificação dos top 10 posts por engajamento no período
- Síntese via Moonshot: insights acionáveis para o agente de métricas
- Sync automático: antes de executar job, verificar se cache expirou (TTL 24h)
- Sync manual: endpoint com throttle (1x por hora por cliente)
- Tratamento de rate limit: exponential backoff com max 3 retries

**OUT:**
- Meta Ads insights (requer permissão `ads_read` — futura sprint)
- Instagram Stories analytics
- Exportação de dados brutos pelo usuário

## Critérios de Aceite

- [ ] `meta-sync-worker.ts` (criado em S6-01) atualizado para usar Meta Graph API real
- [ ] Dados salvos em `client_analytics_cache` com `platform: 'meta'`, `period: '30d'`
- [ ] `raw_data` contém métricas brutas do Meta
- [ ] `insights` JSONB contém síntese em linguagem natural gerada pelo Moonshot
- [ ] Rate limit tratado: 429 do Meta → exponential backoff → até 3 retries
- [ ] Se Meta API indisponível, worker falha graciosamente sem afetar jobs de geração
- [ ] Sync automático acionado pelo `post-worker.ts` se dados com mais de 24h
- [ ] Logs estruturados para cada sync (sucesso, falha, rate limit, dados stub)

## Métricas Coletadas (Meta Graph API)

```typescript
// Endpoint: GET /{page-id}/insights
const metrics = [
  'page_impressions',           // Impressões totais
  'page_reach',                 // Alcance único
  'page_engaged_users',         // Usuários que engajaram
  'page_post_engagements',      // Engajamentos totais em posts
  'page_fans',                  // Seguidores atuais
];

// Endpoint: GET /{page-id}/posts?fields=message,created_time,insights
// Para cada post: reactions, comments, shares, reach
```

## Estrutura do insights JSONB (saída do Moonshot)

```json
{
  "period": "30d",
  "topFormats": ["carrossel", "vídeo curto"],
  "topTopics": ["produtividade", "liderança"],
  "avgEngagementRate": 0.042,
  "bestPostingHours": ["19h", "20h", "12h"],
  "followerGrowthRate": 0.023,
  "recentWins": [
    {
      "format": "carrossel",
      "topic": "5 erros de gestão",
      "engagementRate": 0.089,
      "reach": 4200
    }
  ],
  "insightSummary": "Carrosséis sobre gestão publicados às 19h têm 2x mais engajamento. Evite posts únicos sobre vendas.",
  "generatedAt": "2026-04-22T14:30:00Z"
}
```

## Arquivos a Criar/Modificar

- MODIFICAR: `server/services/meta-sync-worker.ts` — implementar chamadas reais ao Meta API
- CRIAR: `server/services/meta-api-client.ts` — wrapper do Meta Graph API com rate limit handling
- MODIFICAR: `server/services/post-worker.ts` — checar cache antes de iniciar job, acionar sync se necessário

## Definition of Done

- [ ] Critérios de aceite atendidos
- [ ] Sem issues CRITICAL no CodeRabbit
- [ ] Teste com conta sandbox Meta: dados reais chegam e são persistidos
- [ ] Teste de rate limit: worker trata 429 com retry correto
- [ ] Agente de métricas (S6-02) retorna `dataSource: 'meta_cache'` com dados reais
- [ ] Evidências: `insights` JSONB com `insightSummary` em português no banco
