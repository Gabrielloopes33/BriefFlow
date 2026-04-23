# Software Design Document — BriefFlow v2
# Geração de Conteúdo com Agentes Especializados + Editor Visual

**Versão:** 2.0  
**Data:** 2026-04-22  
**Status:** Aprovado para execução  
**Owner:** @pm (Morgan)  
**Arquitetura:** @architect (Aria)  
**Próxima Sprint:** 5

---

## 1. Executive Summary

O BriefFlow é uma plataforma SaaS multi-tenant para geração de conteúdo para criadores e agências. A versão 1.x entregou (Sprints 1-4) a infraestrutura base: tenancy, jobs assíncronos, scraping com provider abstraction, pipeline de agentes (researcher → writer → reviewer) e observabilidade com Langfuse.

A v2 expande o produto em três frentes principais:

1. **Agentes Especializados** — substituição do pipeline linear por um time orquestrado de 3 agentes paralelos alimentados por dados reais do cliente
2. **Editor Visual Konva** — módulo completo de criação de carrosséis e criativos com preenchimento automático pelo conteúdo gerado
3. **Studio (Chat redesenhado)** — experiência conversacional guiada, sem expor complexidade técnica ao usuário

Decisões técnicas novas desta versão:
- **Moonshot API (Kimi)** como provider LLM principal (custo-benefício superior ao GPT-4o-mini)
- **Konva.js** como engine do editor visual (canvas 2D, exportável, extensível)
- **WebSocket** para feedback em tempo real durante execução dos agentes
- **Cache de analytics** para desacoplar integração Meta API da execução dos agentes

---

## 2. Contexto e Motivação

### 2.1 Estado após Sprint 4

O sistema atual opera com:
- Pipeline: `Job → Researcher → Writer → Reviewer → Post`
- Todos os nós executam sequencialmente via LangGraph-inspired executor
- Nós do tipo `custom` retornam `{}` (placeholder não implementado)
- Feedback de progresso via polling HTTP a cada 5s
- Provider de LLM: OpenAI GPT-4o-mini exclusivo
- Integração Meta API: tokens OAuth salvos, mas sem sincronização de dados

### 2.2 Problemas Identificados

| Problema | Impacto | Sprint de Correção |
|---|---|---|
| Nós `custom` não executam nada | Board visual sem utilidade real | Sprint 5 |
| Polling 5s ineficiente | UX ruim, custo de requisições | Sprint 5 |
| OpenAI exclusivo | Custo elevado em escala | Sprint 5 |
| AgentState sem dados de analytics | Agentes não conhecem performance do cliente | Sprint 5/6 |
| Sem editor visual | Output de texto apenas; conteúdo incompleto | Sprint 7 |
| Chat expõe scraping ao usuário | Baixa adoção por não-técnicos | Sprint 8 |
| Dashboard sem utilidade clara | Ponto de entrada sem contexto | Sprint 8 |

### 2.3 Oportunidade de Produto

O diferencial do BriefFlow não é "IA para conteúdo" — é **conteúdo com contexto real do cliente, alimentado por dados de performance**. Nenhum concorrente combina:
1. Perfil aprofundado do cliente (nicho, tom, audiência)
2. Métricas reais de performance (o que funcionou)
3. Referências curadas automaticamente
4. Geração visual (carrossel pronto para publicar)

---

## 3. Arquitetura Alvo

### 3.1 Visão Geral

```
[Cliente] → [Studio (Chat)] → seleciona cliente → inicia geração
                                     ↓
                            [Job Queue (assíncrono)]
                                     ↓
                    ┌────────────────┴────────────────┐
                    ↓                                 ↓
          [Metrics Analyst Node]         [References Node]
          (lê analytics_cache)           (crawl + tendências)
                    └────────────────┬────────────────┘
                                     ↓
                              [Writer Node]
                           (Moonshot Kimi API)
                                     ↓
                             [Reviewer Node]
                           (score + feedback)
                                     ↓
                             [Post salvo no DB]
                                     ↓
                    [Visual Formatter] → [Editor Konva]
                                     ↓
                          [Export PNG → Storage]
```

### 3.2 Camadas da Aplicação

```
Frontend (React + Vite)
├── Studio (chat conversacional)
├── Dashboard (central de comando)
├── Clientes (wizard de onboarding)
├── Agentes + Fluxo (board visual)
├── Editor Visual (Konva)
└── Analytics (dashboard + cache)

Backend (Express + TypeScript)
├── API REST (50+ endpoints existentes)
├── WebSocket Server (novo — feedback tempo real)
├── Job Worker (post-worker.ts — com execução paralela)
├── Agent Nodes (researcher, writer, reviewer + 3 novos)
├── Meta Sync Worker (novo — cache de analytics)
└── LLM Provider (Moonshot + OpenAI fallback)

Infraestrutura
├── Supabase PostgreSQL (multi-tenant RLS)
├── Supabase Storage (exports de criativos)
├── Langfuse (observabilidade LLM)
└── Moonshot API + OpenAI API (fallback)
```

---

## 4. Decisões Técnicas

### ADR-005: Moonshot (Kimi) como Provider LLM Principal

**Decisão:** Substituir OpenAI GPT-4o-mini pelo Moonshot Kimi API como provider padrão para todos os agentes.

**Justificativa:**
- Custo ~60-70% inferior ao GPT-4o-mini para tokens equivalentes
- Performance comparável em tarefas de geração de conteúdo em português
- API compatível com OpenAI SDK (troca de endpoint + modelo, zero refatoração de lógica)
- OpenAI mantido como fallback para casos de indisponibilidade

**Implementação:**
```typescript
// Configuração via env
MOONSHOT_API_KEY=sk-...
MOONSHOT_BASE_URL=https://api.moonshot.cn/v1
MOONSHOT_MODEL=moonshot-v1-8k  // ou moonshot-v1-32k para contextos longos

// No provider — compatível com OpenAI SDK
const client = new OpenAI({
  apiKey: process.env.MOONSHOT_API_KEY,
  baseURL: process.env.MOONSHOT_BASE_URL,
});
```

**Fallback:** Se `MOONSHOT_API_KEY` não definida, usa `OPENAI_API_KEY` (comportamento atual).

---

### ADR-006: Konva.js para Editor Visual

**Decisão:** Usar Konva.js (+ react-konva) como engine do editor de carrosséis e criativos.

**Justificativa:**
- Biblioteca madura (>10k stars, mantida ativamente)
- Suporte nativo a grupos, transformações, drag-and-drop no canvas
- Export via `stage.toDataURL()` sem dependências externas
- Extensível: pode integrar com renderização server-side (Puppeteer) no futuro
- `react-konva` tem bindings prontos para React 18

**Escopo v2 (Konva):** Templates pré-definidos com preenchimento automático. Editor permite ajuste de texto, cores e posicionamento. Export PNG por slide.

**Escopo v3 (futuro):** Renderização server-side via Puppeteer para qualidade de impressão; integração com Bannerbear para geração em volume.

---

### ADR-007: WebSocket para Feedback em Tempo Real

**Decisão:** Implementar WebSocket server-side usando a biblioteca `ws` (já no package.json) para emitir eventos de progresso de jobs.

**Protocolo de eventos:**
```typescript
type JobEvent =
  | { type: 'job:stage'; jobId: string; stage: string; progress: number }
  | { type: 'agent:start'; jobId: string; nodeId: string; agentName: string }
  | { type: 'agent:complete'; jobId: string; nodeId: string; summary: string }
  | { type: 'agent:error'; jobId: string; nodeId: string; error: string }
  | { type: 'job:complete'; jobId: string; postId: string }
  | { type: 'job:failed'; jobId: string; error: string };
```

**Estratégia de conexão:** O frontend tenta WebSocket primeiro; em caso de falha, faz fallback para polling HTTP de 5s (comportamento atual). Nenhuma feature é bloqueada se WebSocket não estiver disponível.

---

### ADR-008: Cache de Analytics Desacoplado dos Agentes

**Decisão:** Criar um worker separado (`meta-sync-worker.ts`) que sincroniza dados do Meta API em background, armazenando em `client_analytics_cache`. Os agentes leem apenas da cache, nunca chamam o Meta API diretamente.

**Justificativa:** Protege o pipeline de geração de falhas externas (rate limits, tokens expirados, latência variável da API do Meta). A execução de um job não pode falhar por indisponibilidade de API de terceiro.

**TTL:** 24h por padrão. Refresh acionado manualmente ou automaticamente se dados tiverem mais de 24h quando um job iniciar.

---

## 5. Schema de Banco — Novos Artefatos

### 5.1 client_analytics_cache (Sprint 5)
```sql
CREATE TABLE client_analytics_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  period TEXT NOT NULL,
  raw_data JSONB NOT NULL,
  insights JSONB,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  UNIQUE(client_id, platform, period)
);
```

### 5.2 creative_templates (Sprint 7)
```sql
CREATE TABLE creative_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('carousel', 'single', 'story', 'ad')),
  platform TEXT NOT NULL CHECK (platform IN ('instagram', 'linkedin', 'facebook', 'universal')),
  slides_count INTEGER NOT NULL DEFAULT 1,
  structure JSONB NOT NULL,
  thumbnail_url TEXT,
  is_global BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 5.3 creatives (Sprint 7)
```sql
CREATE TABLE creatives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  post_id UUID REFERENCES posts(id),
  template_id UUID REFERENCES creative_templates(id),
  type TEXT NOT NULL,
  platform TEXT NOT NULL,
  slides JSONB NOT NULL,
  export_urls JSONB,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'ready', 'published')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 5.4 Extensões ao AgentState (Sprint 5)
```typescript
// Adicionar ao server/agents/state.ts
analyticsInsights?: {
  topFormats: string[];
  topTopics: string[];
  avgEngagementRate: number;
  bestPostingHours: string[];
  recentWins: Array<{ format: string; topic: string; engagementRate: number }>;
  dataSource: 'meta_cache' | 'manual' | 'empty';
  lastUpdated: string;
};

references?: Array<{
  title: string;
  url: string;
  summary: string;
  angle: string;
  relevanceScore: number;
}>;
```

---

## 6. Arquitetura dos Novos Agentes

### 6.1 Estrutura de Nós (Sprint 6)

```
server/agents/nodes/
├── researcher.ts         # existente — mantido
├── writer.ts             # existente — atualizado para Moonshot
├── reviewer.ts           # existente — atualizado para Moonshot
├── metrics-analyst.ts    # NOVO Sprint 6 — lê analytics_cache
├── references.ts         # NOVO Sprint 6 — busca referências curadas
└── visual-formatter.ts   # NOVO Sprint 7 — estrutura conteúdo em slides
```

### 6.2 Grafo de Execução Paralela

```
START
  ├──→ [metrics-analyst]  ──┐
  └──→ [references]        ──┴──→ [writer] ──→ [reviewer] ──→ END
```

Os nós `metrics-analyst` e `references` não têm dependência entre si — devem rodar em paralelo via `Promise.all`. O `writer` recebe o estado mergeado de ambos.

### 6.3 Métricas Analyst Node

```typescript
// Responsabilidade: ler client_analytics_cache e sintetizar insights
// Input: clientId, tenantId, platform ('meta' | 'instagram')
// Output: analyticsInsights no AgentState
// LLM: Moonshot Kimi (síntese dos insights em linguagem natural)
// Fallback: se cache vazia, retorna dataSource: 'empty' e continua sem bloquear
```

### 6.4 References Node

```typescript
// Responsabilidade: crawl das sources cadastradas do cliente + busca de tendências
// Input: clientId, tenantId, sources[], niche, targetAudience
// Output: references[] no AgentState
// Reutiliza: crawler-provider.ts existente
// LLM: Moonshot Kimi (ranqueia e resume referências)
```

---

## 7. Arquitetura do Editor Visual (Sprint 7)

### 7.1 Stack

- **Engine:** `konva` + `react-konva`
- **Export:** `stage.toDataURL('image/png')` → upload Supabase Storage
- **Templates:** JSON estruturado no DB (`creative_templates.structure`)
- **Preenchimento automático:** visual-formatter node gera `slides` JSONB → editor recebe e posiciona

### 7.2 Estrutura de um Slide Template

```json
{
  "width": 1080,
  "height": 1080,
  "background": { "type": "color", "value": "#ffffff" },
  "layers": [
    {
      "id": "headline",
      "type": "text",
      "x": 80, "y": 120,
      "width": 920, "height": 200,
      "fontSize": 48, "fontWeight": "bold",
      "color": "#1a1a1a",
      "placeholder": "{{headline}}",
      "editable": true
    },
    {
      "id": "body",
      "type": "text",
      "x": 80, "y": 380,
      "width": 920, "height": 400,
      "fontSize": 28,
      "color": "#333333",
      "placeholder": "{{body}}",
      "editable": true
    },
    {
      "id": "logo",
      "type": "image",
      "x": 880, "y": 40,
      "width": 120, "height": 60,
      "source": "client.logo_url",
      "editable": false
    }
  ]
}
```

### 7.3 Fluxo de Dados

```
[Writer Node output] → [visual-formatter node]
  ↓
Retorna: slides[] = [{ headline, body, cta, slideIndex }]
  ↓
[Frontend] carrega template + slides
  ↓
[react-konva] renderiza editor com conteúdo preenchido
  ↓
[Usuário] ajusta se necessário
  ↓
[Export] stage.toDataURL() por slide → upload Supabase Storage
  ↓
[DB] salva creatives.export_urls
```

---

## 8. Plano de Sprints

| Sprint | Tema | Duração | Owner Principal | Dependências |
|---|---|---|---|---|
| **5** | Foundation Layer | 2 semanas | @dev + @architect | — |
| **6** | Agentes Especializados | 2 semanas | @dev + @data-engineer | Sprint 5 |
| **7** | Editor Visual Konva | 3 semanas | @dev + @ux-design-expert | Sprint 6 |
| **8** | Studio + Onboarding | 2 semanas | @dev + @ux-design-expert | Sprint 5 |
| **9** | Analytics + Meta API | 3 semanas | @dev + @data-engineer | Sprint 6 |

**Total estimado:** ~12 semanas (3 meses)

### Sprint 5 — Foundation Layer
- S5-01: WebSocket real-time para progresso de jobs
- S5-02: Moonshot API como provider LLM principal
- S5-03: Correção de nós custom no FluxoBuilder
- S5-04: Dashboard como Central de Comando

### Sprint 6 — Agentes Especializados
- S6-01: Schema client_analytics_cache + meta-sync-worker
- S6-02: Nó metrics-analyst
- S6-03: Nó references
- S6-04: Execução paralela no executor
- S6-05: UX do board em linguagem humana

### Sprint 7 — Editor Visual Konva
- S7-01: Schema creative_templates + creatives + Storage bucket
- S7-02: Componente editor Konva (canvas + camadas)
- S7-03: Sistema de templates globais (pack inicial)
- S7-04: Nó visual-formatter
- S7-05: Export PNG + salvamento no Storage

### Sprint 8 — Studio + Onboarding
- S8-01: Redesign Chat → Studio (fluxo conversacional)
- S8-02: Wizard de onboarding de clientes (4 etapas)
- S8-03: Biblioteca de conteúdo (histórico + filtros)
- S8-04: Fluxo de aprovação (draft → review → aprovado)

### Sprint 9 — Analytics + Meta API
- S9-01: Meta API OAuth completo + refresh de token
- S9-02: Sincronização de insights orgânicos Meta + cache
- S9-03: Dashboard de analytics com dados reais

---

## 9. Riscos e Mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| Moonshot API indisponível em produção | Baixa | Alto | Fallback automático para OpenAI configurado no provider |
| Meta API: permissões por tipo de conta variam | Alta | Médio | Começar apenas com Page Insights (escopo mínimo); Ads Manager em sprint posterior |
| Editor Konva: UX complexa para usuário final | Média | Alto | Templates pré-preenchidos reduzem necessidade de edição; onboarding no editor |
| Execução paralela no executor causa race condition no AgentState | Média | Médio | Merge explícito após Promise.all; testes de integração cobrindo estado compartilhado |
| Custo de LLM cresce com 5+ chamadas por job | Média | Médio | Cache de resultados para inputs idênticos; Kimi reduz custo base |

---

## 10. Definition of Done por Sprint

Cada sprint é considerada DONE quando:
- [ ] Todas as stories com status `Done`
- [ ] QA Gate PASS para todas as stories da sprint
- [ ] Nenhum item CRITICAL aberto no CodeRabbit
- [ ] Langfuse mostrando traces sem erros para novos fluxos
- [ ] Documentação de API atualizada (se novos endpoints)
- [ ] Migração de banco aplicada em staging sem rollback
- [ ] `planejamento-execucao-briefflow.md` atualizado com entrega

---

## 11. Mapa de Agentes por Sprint

| Agente | Sprint 5 | Sprint 6 | Sprint 7 | Sprint 8 | Sprint 9 |
|---|---|---|---|---|---|
| @architect | ADRs + review | Review nós | Review editor | Review Studio | Review Meta |
| @data-engineer | Schema analytics_cache | Migração S6 | Schema creatives | — | Schema Meta |
| @dev | WebSocket, Moonshot, Fluxo fix, Dashboard | Nós, Parallelismo, UX board | Konva, templates, export | Studio, wizard, biblioteca | OAuth, sync, dashboard |
| @qa | QA gates S5 | QA gates S6 | QA gates S7 | QA gates S8 | QA gates S9 |
| @ux-design-expert | — | Board UX | Editor UX | Studio + Wizard UX | — |
| @devops | Deploy S5 | Deploy S6 | Deploy S7 | Deploy S8 | Deploy S9 |

---

*Documento gerado por @pm (Morgan) + @architect (Aria) — BriefFlow v2 Planning*  
*Data: 2026-04-22 — Versão: 2.0*
