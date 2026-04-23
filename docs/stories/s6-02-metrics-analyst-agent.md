# S6-02 — Nó Metrics Analyst (Agente de Métricas)

Status: Ready  
Owner: @dev  
Sprint: 06  
Prioridade: Crítica  
Pontos: 5  
Depende de: S6-01 (analytics cache), S5-02 (Moonshot), S5-03 (node registry)

## Contexto

O agente de métricas é o diferencial central do BriefFlow: ele analisa o que funcionou no perfil do cliente e alimenta o Writer com insights reais de performance. Sem esse agente, o conteúdo gerado não tem base em dados — é genérico como qualquer outra ferramenta de IA.

Este nó lê os dados de `client_analytics_cache` e usa o Moonshot para sintetizar insights acionáveis para o Writer.

## Escopo

**IN:**
- Nó `metrics-analyst` no registry de nós
- Leitura de `client_analytics_cache` para o cliente ativo
- Síntese de insights via Moonshot (formatos que engajam, tópicos que convertem, melhores horários)
- Retorno de `analyticsInsights` no `AgentState`
- Comportamento graceful quando cache está vazia (não bloqueia o job)

**OUT:**
- Conexão direta com Meta API (usa apenas a cache)
- Análise de concorrentes
- Benchmarks de mercado

## Critérios de Aceite

- [ ] Nó registrado como `'metrics-analyst'` no node registry
- [ ] Lê dados de `client_analytics_cache` para o `clientId` do estado atual
- [ ] Usa Moonshot para gerar `analyticsInsights` estruturado
- [ ] Se cache vazia ou expirada: retorna `analyticsInsights` com `dataSource: 'empty'` e continua
- [ ] Se cache disponível: retorna `analyticsInsights` com `dataSource: 'meta_cache'`
- [ ] Langfuse registra span `metrics-analyst` com tokens consumidos e fonte dos dados
- [ ] Writer recebe `analyticsInsights` no estado e o incorpora no prompt

## Tarefas

- [ ] Criar `server/agents/nodes/metrics-analyst.ts`
  - [ ] Query em `client_analytics_cache` para o cliente
  - [ ] Prompt de síntese para Moonshot (instrução em português)
  - [ ] Parse do output JSON estruturado (`analyticsInsights`)
  - [ ] Tratamento de cache vazia (fallback graceful)
- [ ] Atualizar `server/agents/state.ts` — adicionar `analyticsInsights` ao `AgentState`
- [ ] Registrar nó em `server/agents/nodes/index.ts`
- [ ] Atualizar `server/agents/nodes/writer.ts` — incluir `analyticsInsights` no prompt quando disponível
- [ ] Atualizar `server/agents/langfuse-tracer.ts` — span para metrics-analyst

## Prompt de Síntese (referência)

```typescript
const prompt = `
Você é um analista de redes sociais. Analise os dados de performance abaixo do cliente "${clientName}" 
e extraia insights acionáveis para guiar a criação de conteúdo.

Dados de performance (últimos 30 dias):
${JSON.stringify(rawData, null, 2)}

Retorne um JSON com exatamente este formato:
{
  "topFormats": ["formato1", "formato2"],
  "topTopics": ["tópico1", "tópico2"],  
  "avgEngagementRate": 0.045,
  "bestPostingHours": ["19h", "20h"],
  "recentWins": [
    { "format": "carrossel", "topic": "produtividade", "engagementRate": 0.08 }
  ],
  "insightSummary": "Resumo em 2 frases do que funciona para este cliente"
}
`;
```

## Arquivos a Criar/Modificar

- CRIAR: `server/agents/nodes/metrics-analyst.ts`
- MODIFICAR: `server/agents/state.ts` — campo `analyticsInsights`
- MODIFICAR: `server/agents/nodes/index.ts` — registrar nó
- MODIFICAR: `server/agents/nodes/writer.ts` — usar insights no prompt
- MODIFICAR: `server/agents/langfuse-tracer.ts` — span do nó

## Definition of Done

- [ ] Critérios de aceite atendidos
- [ ] Sem issues CRITICAL no CodeRabbit
- [ ] Teste: job com cache populada gera conteúdo com insights nos logs
- [ ] Teste: job sem cache completa sem erro (dataSource: 'empty')
- [ ] Evidências: span `metrics-analyst` no Langfuse com tokens e fonte
