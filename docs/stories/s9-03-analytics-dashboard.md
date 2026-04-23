# S9-03 — Dashboard de Analytics com Dados Reais

Status: Ready  
Owner: @dev  
Sprint: 09  
Prioridade: Alta  
Pontos: 8  
Depende de: S9-02 (sync de dados reais)

## Contexto

A tela de Analytics existe mas não exibe dados úteis sem a integração com Meta. Com S9-01 e S9-02 funcionando, esta story atualiza o dashboard de analytics para exibir os dados reais de performance do cliente selecionado.

## Escopo

**IN:**
- Dashboard de analytics filtrado por cliente
- Métricas exibidas: alcance, engajamento, crescimento de seguidores (últimos 30 dias)
- Top 3 posts por engajamento (com link para o post original)
- Gráfico de alcance por dia (Recharts — já instalado)
- Resumo de insights do Moonshot (texto em linguagem humana)
- Botão de sync manual com throttle visual
- Estado "sem dados": mensagem encorajando conexão do Meta

**OUT:**
- Comparação com período anterior
- Benchmarks de mercado
- Meta Ads dashboard
- Export de relatório PDF

## Critérios de Aceite

- [ ] Seletor de cliente no topo do dashboard (igual ao Studio)
- [ ] Ao selecionar cliente, dados são carregados de `client_analytics_cache`
- [ ] Se cache vazia: banner "Conecte sua conta Meta para ver dados de performance" com botão de conexão
- [ ] Se cache com dados: exibir cards de métricas (alcance, engajamento, seguidores)
- [ ] Gráfico de linha (Recharts) mostrando alcance diário nos últimos 30 dias
- [ ] Seção "O que está funcionando": resumo do `insights.insightSummary` em destaque
- [ ] Top 3 posts: preview de texto + métricas de engajamento + link para Meta
- [ ] Botão "Atualizar dados": aciona sync manual, desabilitado por 1h após uso
- [ ] Loading skeleton enquanto dados carregam (não tela em branco)

## Componentes de UI

```
client/src/components/analytics/
├── AnalyticsClientSelector.tsx   # Dropdown de seleção de cliente
├── MetricsCards.tsx              # Cards de alcance, engajamento, seguidores
├── ReachChart.tsx                # Gráfico Recharts de alcance diário
├── InsightsSummaryCard.tsx       # Resumo textual dos insights
├── TopPostsGrid.tsx              # Grid com top 3 posts
├── SyncButton.tsx                # Botão de sync com throttle visual
└── EmptyAnalyticsState.tsx       # Estado sem dados conectados
```

## Endpoint Necessário

```
GET /api/analytics/client/:clientId/insights
```

Retorna dados de `client_analytics_cache` para o cliente + status de conexão Meta.

## Arquivos a Criar/Modificar

- CRIAR: `client/src/components/analytics/` (7 componentes)
- CRIAR: `client/src/hooks/use-client-analytics.ts`
- MODIFICAR: `client/src/pages/AnalyticsPage.tsx` — usar dados reais
- MODIFICAR: `server/routes.ts` — endpoint `/api/analytics/client/:clientId/insights`

## Definition of Done

- [ ] Critérios de aceite atendidos
- [ ] Sem issues CRITICAL no CodeRabbit
- [ ] Teste: página com dados de cache exibe gráfico e métricas corretamente
- [ ] Teste: página sem dados mostra estado vazio com CTA de conexão
- [ ] Mobile responsivo: cards em coluna, gráfico scrollável
- [ ] Evidências: screenshot do dashboard com dados reais de conta sandbox Meta
