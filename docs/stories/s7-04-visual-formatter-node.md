# S7-04 — Nó Visual Formatter (Estrutura Conteúdo em Slides JSONB)

Status: Ready  
Owner: @dev  
Sprint: 07  
Prioridade: Crítica  
Pontos: 5  
Depende de: S6-04 (pipeline paralelo), S7-01 (schema creatives)

## Contexto

Após o Writer gerar o conteúdo textual e o Reviewer aprová-lo, o nó visual-formatter transforma esse conteúdo em uma estrutura de slides JSONB pronta para ser consumida pelo editor Konva. Ele identifica o tipo de conteúdo (lista, caso, educativo, etc.) e sugere o template mais adequado.

## Escopo

**IN:**
- Nó `visual-formatter` no registry de nós
- Análise do conteúdo gerado pelo Writer para identificar tipo e estrutura
- Geração de `slides[]` JSONB com conteúdo distribuído por slide
- Sugestão do template mais adequado dentre os 6 disponíveis
- Criação automática do registro `creatives` no banco vinculado ao post
- Retorno de `creative_id` no AgentState para o frontend redirecionar ao editor

**OUT:**
- Renderização visual (isso é responsabilidade do frontend/Konva)
- Escolha final do template (usuário pode trocar no editor)

## Critérios de Aceite

- [ ] Nó registrado como `'visual-formatter'` no node registry
- [ ] Analisa o `draft` do AgentState e gera `slides[]` com conteúdo distribuído
- [ ] Sugere 1 dos 6 templates baseado no tipo de conteúdo detectado
- [ ] Cria registro em `creatives` com `status: 'draft'` e `slides` preenchidos
- [ ] Salva `creative_id` no estado da execução (via job.result ou AgentState)
- [ ] Langfuse registra span `visual-formatter` com tipo detectado e template sugerido
- [ ] Se falhar, job ainda completa com o post de texto (formatter é opcional, não bloqueante)

## Lógica de Seleção de Template

```typescript
function suggestTemplate(content: string, goal: string): string {
  const lowerContent = content.toLowerCase();
  const lowerGoal = goal.toLowerCase();

  if (lowerContent.includes('dica') || lowerContent.includes('passo')) return 'carousel-lista';
  if (lowerContent.includes('antes') && lowerContent.includes('depois')) return 'antes-e-depois';
  if (lowerContent.includes('resultado') || lowerContent.includes('case')) return 'carousel-case';
  if (lowerGoal.includes('citação') || lowerGoal.includes('quote')) return 'quote';
  if (lowerGoal.includes('único') || lowerGoal.includes('impacto')) return 'post-unico';
  return 'carousel-educativo'; // default
}
```

## Prompt de Estruturação de Slides (referência)

```typescript
const prompt = `
Você recebeu um post para transformar em slides de carrossel para Instagram.

Post:
Título: ${draft.title}
Conteúdo: ${draft.content}

Tipo de carrossel identificado: ${suggestedType}

Divida este conteúdo em slides. Máximo 6 slides.
Cada slide deve ter: título curto (max 10 palavras) + texto (max 50 palavras).
O último slide deve ser um CTA (call-to-action).

Retorne um JSON array:
[
  { "slideIndex": 1, "type": "cover", "headline": "...", "body": "..." },
  { "slideIndex": 2, "type": "content", "headline": "...", "body": "..." },
  { "slideIndex": 6, "type": "cta", "headline": "...", "body": "..." }
]
`;
```

## Tarefas

- [ ] Criar `server/agents/nodes/visual-formatter.ts`
  - [ ] Função `suggestTemplate(content, goal)` — lógica de seleção
  - [ ] Prompt de estruturação de slides para Moonshot
  - [ ] Parse do JSON de slides
  - [ ] Query para buscar `template_id` do template sugerido
  - [ ] Insert em `creatives` com slides preenchidos
  - [ ] Retornar `creative_id` no partial state
- [ ] Registrar nó em `server/agents/nodes/index.ts`
- [ ] Atualizar `server/agents/state.ts` — adicionar `creative_id?: string`
- [ ] Atualizar `server/agents/langfuse-tracer.ts` — span do nó
- [ ] Atualizar `server/services/post-worker.ts` — após job concluído, retornar `creative_id` junto com `post_id`
- [ ] Atualizar frontend: após job completo, oferecer botão "Editar no editor visual" com link para o criativo

## Arquivos a Criar/Modificar

- CRIAR: `server/agents/nodes/visual-formatter.ts`
- MODIFICAR: `server/agents/nodes/index.ts`
- MODIFICAR: `server/agents/state.ts` — campo `creative_id`
- MODIFICAR: `server/agents/langfuse-tracer.ts`
- MODIFICAR: `server/services/post-worker.ts` — retornar creative_id
- MODIFICAR: componente de resultado do job no frontend (a identificar)

## Definition of Done

- [ ] Critérios de aceite atendidos
- [ ] Sem issues CRITICAL no CodeRabbit
- [ ] Teste: job completo cria registro em `creatives` com slides JSONB válidos
- [ ] Teste: job ainda completa mesmo se visual-formatter falhar (sem crash)
- [ ] Evidências: registro em `creatives` consultável no banco após geração
