# S8-01 — Redesign Chat → Studio (Fluxo Conversacional Guiado)

Status: Ready  
Owner: @dev + @ux-design-expert  
Sprint: 08  
Prioridade: Crítica  
Pontos: 13  
Depende de: S5-01 (WebSocket), Sprint 5 DONE

## Contexto

A rota `/chat` atual expõe scraping técnico ao usuário: ele vê campos de URL, tipos de crawl, e terminologia de desenvolvimento. Isso cria uma barreira para quem não tem perfil técnico — o público-alvo da plataforma.

O Studio é o redesign completo dessa experiência: uma interface conversacional guiada onde o usuário fala o que quer criar e o sistema cuida do resto. O scraping das fontes acontece em background. A URL some da interface.

## Escopo

**IN:**
- Renomear rota `/chat` para `/studio` (com redirect 301 de `/chat`)
- Redesign completo da UI: campo conversacional como elemento principal
- Seletor de cliente no topo (persistido no estado global)
- Contexto do cliente carregado automaticamente ao selecionar
- Progress bar de geração em tempo real via WebSocket
- Card de resultado: post gerado + botão "Abrir no editor visual" (se criativo disponível)
- Histórico de sessão: últimas 5 gerações no cliente selecionado

**OUT:**
- Chat persistente entre sessões (histórico completo está na Biblioteca — S8-03)
- Scraping manual de URLs (usuário não precisa, fontes são gerenciadas em Clientes)
- Configurações avançadas de geração (temperature, model) expostas na UI

## Critérios de Aceite

- [ ] Nenhum termo técnico visível ao usuário: sem "scraping", "URL", "crawl", "provider", "node", "token"
- [ ] Campo principal: input conversacional com placeholder "O que você quer criar hoje?"
- [ ] Sugestões de ação rápida: "Post educativo", "Case de sucesso", "Carrossel de dicas", "Citação impactante"
- [ ] Ao iniciar geração, progress bar aparece com etapas em linguagem humana:
  - "Pesquisando suas referências..."
  - "Analisando o que funcionou no seu perfil..."
  - "Redigindo o conteúdo..."
  - "Revisando a qualidade..."
- [ ] Card de resultado mostra: título, preview do conteúdo, pontuação do revisor, e botão "Editar no Studio Visual"
- [ ] Rota `/chat` redireciona para `/studio` com 301
- [ ] Mobile: experiência completa funciona em 375px

## Detalhamento da Mudança de Nome na Sidebar

A sidebar (`AppShell.tsx`) deve atualizar o item de navegação:
- **Antes:** "Chat" com ícone de bolha
- **Depois:** "Studio" com ícone de varinha mágica (✨)

## Tarefas

- [ ] Criar `client/src/pages/StudioPage.tsx` (substitui `ChatPage.tsx`)
- [ ] Criar `client/src/components/studio/ConversationalInput.tsx` — campo principal com sugestões
- [ ] Criar `client/src/components/studio/ClientSelector.tsx` — dropdown de seleção de cliente
- [ ] Criar `client/src/components/studio/GenerationProgress.tsx` — progress bar WebSocket
- [ ] Criar `client/src/components/studio/GenerationResult.tsx` — card de resultado
- [ ] Criar `client/src/components/studio/QuickActionChips.tsx` — sugestões de ação
- [ ] Atualizar `client/src/App.tsx` — nova rota `/studio`, redirect de `/chat`
- [ ] Atualizar `client/src/components/layout/AppShell.tsx` — item de nav "Studio"
- [ ] Atualizar `client/src/components/layout/Sidebar.tsx` — item de nav "Studio"
- [ ] Atualizar `client/src/components/layout/BottomNav.tsx` — item "Studio" no mobile
- [ ] Deprecar `client/src/pages/ChatPage.tsx` (manter para redirect, não deletar ainda)
- [ ] Integrar `use-job-websocket.ts` (S5-01) no `GenerationProgress.tsx`

## Mapeamento de Etapas (WebSocket → Linguagem Humana)

```typescript
// client/src/lib/stage-labels.ts
export const stageLabels: Record<string, string> = {
  validating_input:    'Preparando sua solicitação...',
  fetching_sources:    'Buscando suas fontes de referência...',
  crawling_content:    'Pesquisando referências relevantes...',
  extracting_insights: 'Analisando o que funcionou no seu perfil...',
  drafting_post:       'Redigindo o conteúdo...',
  finalizing:          'Revisando a qualidade e finalizando...',
  // Novos nós Sprint 6:
  'agent:metrics-analyst': 'Analisando sua performance histórica...',
  'agent:references':      'Selecionando referências relevantes...',
  'agent:writer':          'Escrevendo o conteúdo...',
  'agent:reviewer':        'Revisando qualidade...',
};
```

## Arquivos a Criar/Modificar

- CRIAR: `client/src/pages/StudioPage.tsx`
- CRIAR: `client/src/components/studio/` (5 componentes)
- CRIAR: `client/src/lib/stage-labels.ts`
- MODIFICAR: `client/src/App.tsx`
- MODIFICAR: `client/src/components/layout/AppShell.tsx`
- MODIFICAR: `client/src/components/layout/Sidebar.tsx`
- MODIFICAR: `client/src/components/layout/BottomNav.tsx`

## Definition of Done

- [ ] Critérios de aceite atendidos
- [ ] Sem issues CRITICAL no CodeRabbit
- [ ] Teste de usabilidade: usuário sem contexto técnico consegue gerar conteúdo em < 3 minutos
- [ ] Mobile responsivo em 375px
- [ ] Evidências: vídeo do fluxo completo Studio no mobile
