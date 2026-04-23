# S6-03 — Nó References (Agente de Referências)

Status: Ready  
Owner: @dev  
Sprint: 06  
Prioridade: Crítica  
Pontos: 5  
Depende de: S5-02 (Moonshot), S5-03 (node registry)

## Contexto

O agente de referências busca conteúdo relevante das fontes cadastradas do cliente e ranqueia as referências mais pertinentes para o tópico em questão. Isso garante que o Writer tenha material de inspiração real — não apenas o perfil do cliente — evitando conteúdo genérico.

Este nó reutiliza a infraestrutura de crawling existente (`crawler-provider.ts`) mas adiciona uma camada de síntese inteligente com Moonshot.

## Escopo

**IN:**
- Nó `references` no registry de nós
- Crawl das fontes ativas do cliente (tipo: blog, youtube, instagram, linkedin)
- Ranqueamento de referências por relevância para o tópico/goal do job
- Retorno de `references[]` no `AgentState`
- Limite de 5 referências mais relevantes (não sobrecarregar o contexto do Writer)

**OUT:**
- Busca de tendências externas (necessitaria search API — escopo futuro)
- Crawl de concorrentes automaticamente (requer configuração separada)
- Caching das referências (seria útil, mas não nesta sprint)

## Critérios de Aceite

- [ ] Nó registrado como `'references'` no node registry
- [ ] Busca das `sources` ativas do cliente via `crawler-provider.ts` existente
- [ ] Moonshot ranqueia e resume as referências mais relevantes para o `goal` do job
- [ ] Retorna `references[]` com no máximo 5 itens, cada um com: título, URL, resumo, ângulo sugerido, score de relevância
- [ ] Se nenhuma fonte cadastrada: retorna `references: []` sem bloquear o job
- [ ] Langfuse registra span `references` com URLs crawleadas e tokens usados
- [ ] Writer recebe `references[]` e os cita no processo de geração

## Tarefas

- [ ] Criar `server/agents/nodes/references.ts`
  - [ ] Busca `sources` ativas do `clientId` no banco
  - [ ] Chama `crawler-provider.ts` para crawl em batch
  - [ ] Prompt de ranqueamento e síntese para Moonshot
  - [ ] Parse e retorno de `references[]`
  - [ ] Tratamento de zero fontes (graceful)
- [ ] Atualizar `server/agents/state.ts` — adicionar `references[]` ao `AgentState`
- [ ] Registrar nó em `server/agents/nodes/index.ts`
- [ ] Atualizar `server/agents/nodes/writer.ts` — incluir `references` no prompt
- [ ] Atualizar `server/agents/langfuse-tracer.ts` — span para references

## Prompt de Ranqueamento (referência)

```typescript
const prompt = `
Você recebeu conteúdos extraídos de fontes de referência do cliente "${clientName}".
O objetivo do conteúdo a ser criado é: "${goal}"
Nicho: "${niche}" | Audiência: "${targetAudience}"

Selecione e resuma as 5 referências mais relevantes para este objetivo.
Para cada uma, extraia um ângulo de conteúdo específico que pode ser usado.

Retorne um JSON array:
[
  {
    "title": "Título do conteúdo",
    "url": "https://...",
    "summary": "Resumo em 1 frase do conteúdo",
    "angle": "Ângulo específico que pode ser usado para criar conteúdo original",
    "relevanceScore": 0.92
  }
]

Ordene por relevanceScore decrescente. Máximo 5 itens.
`;
```

## Arquivos a Criar/Modificar

- CRIAR: `server/agents/nodes/references.ts`
- MODIFICAR: `server/agents/state.ts` — campo `references`
- MODIFICAR: `server/agents/nodes/index.ts` — registrar nó
- MODIFICAR: `server/agents/nodes/writer.ts` — usar referências no prompt
- MODIFICAR: `server/agents/langfuse-tracer.ts` — span do nó

## Definition of Done

- [ ] Critérios de aceite atendidos
- [ ] Sem issues CRITICAL no CodeRabbit
- [ ] Teste: job com fontes cadastradas retorna references com ângulos
- [ ] Teste: job sem fontes cadastradas completa sem erro
- [ ] Evidências: span `references` no Langfuse com URLs e score de cada referência
