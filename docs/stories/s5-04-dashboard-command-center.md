# S5-04 — Dashboard como Central de Comando

Status: Ready  
Owner: @dev  
Sprint: 05  
Prioridade: Alta  
Pontos: 3

## Contexto

O Dashboard atual existe mas não tem utilidade clara — é o ponto de entrada da aplicação mas não orienta o usuário sobre o que fazer a seguir. O produto deve ter um "ponto de partida" que mostre o estado atual do trabalho e permita ação imediata.

A análise de produto identificou que o Dashboard deve ser a "Central de Comando do Dia": o que está pendente, o que foi gerado, e acesso rápido à geração por cliente.

## Escopo

**IN:**
- Cards de clientes com indicador de "último conteúdo gerado há X dias"
- Lista de jobs recentes com status (processando, concluído, falhou)
- Quick action: botão "Gerar conteúdo" por cliente na lista
- Indicador de agentes disponíveis (Fluxo ativo por tenant)
- Contadores: total de posts gerados no mês, clientes ativos

**OUT:**
- Gráficos de analytics (Sprint 9)
- Notificações push
- Calendário de publicação (roadmap futuro)

## Critérios de Aceite

- [ ] Dashboard exibe lista de clientes com data do último conteúdo gerado
- [ ] Lista de até 10 jobs mais recentes com status e link para o post gerado
- [ ] Botão "Gerar conteúdo" em cada card de cliente inicia geração diretamente (vai para Studio com cliente pré-selecionado)
- [ ] Contadores: posts gerados no mês + clientes ativos
- [ ] Jobs com status `processing` mostram indicador animado de progresso
- [ ] Página carrega em menos de 2s (dados via TanStack Query com cache)

## Tarefas

- [ ] Criar endpoint `GET /api/dashboard/summary` — retorna: clientes com last_post_at, jobs recentes (últimos 10), contadores do mês
- [ ] Criar hook `use-dashboard.ts` — query do summary com refetch a cada 30s
- [ ] Redesenhar `client/src/pages/Dashboard.tsx` com layout de cards
- [ ] Componente `ClientQuickCard` — nome do cliente, último conteúdo, botão gerar
- [ ] Componente `RecentJobsList` — lista de jobs com status colorido + link para post
- [ ] Componente `MetricsBadges` — contadores do mês
- [ ] Integrar com WebSocket (S5-01): atualizar jobs recentes automaticamente quando job completa

## Layout Proposto

```
┌─────────────────────────────────────────────┐
│ Bom dia, Gabriel 👋  Hoje: 22/04/2026       │
├─────────────┬─────────────┬─────────────────┤
│ 12 posts    │ 4 clientes  │ 2 em progresso  │
│ este mês    │ ativos      │ agora           │
├─────────────┴─────────────┴─────────────────┤
│ SEUS CLIENTES                    [+ Novo]   │
│ ┌──────────────────────────────────────────┐│
│ │ 🏢 Cliente A   último: 2 dias atrás  [▶] ││
│ │ 🏢 Cliente B   último: hoje          [▶] ││
│ │ 🏢 Cliente C   sem conteúdo ainda    [▶] ││
│ └──────────────────────────────────────────┘│
├─────────────────────────────────────────────┤
│ ATIVIDADE RECENTE                           │
│ ✅ Post para Cliente A — há 2h              │
│ ⏳ Gerando post para Cliente B...           │
│ ❌ Falhou — Cliente C — ontem               │
└─────────────────────────────────────────────┘
```

## Arquivos a Criar/Modificar

- CRIAR: `server/routes/dashboard.ts` — endpoint `/api/dashboard/summary`
- CRIAR: `client/src/hooks/use-dashboard.ts`
- CRIAR: `client/src/components/dashboard/ClientQuickCard.tsx`
- CRIAR: `client/src/components/dashboard/RecentJobsList.tsx`
- CRIAR: `client/src/components/dashboard/MetricsBadges.tsx`
- MODIFICAR: `client/src/pages/Dashboard.tsx` — novo layout
- MODIFICAR: `server/routes.ts` — registrar nova rota de dashboard

## Definition of Done

- [ ] Critérios de aceite atendidos
- [ ] Sem issues CRITICAL no CodeRabbit
- [ ] Página responsiva (mobile + desktop)
- [ ] Evidências: screenshot do dashboard com dados reais de pelo menos 1 cliente
