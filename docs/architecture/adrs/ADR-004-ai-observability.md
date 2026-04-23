# ADR-004 - Observabilidade de IA com Langfuse + LangGraph

Status: Accepted
Data: 2026-04-17
Owner: @architect

## Contexto
Fluxos de IA sem tracing dificultam diagnostico de custo, qualidade e falhas em producao. A orquestracao de multiplos agentes exige controle de estado, transicoes condicionais e rastreabilidade ponta a ponta.

## Decisao
1. **Orquestracao:** Adotar LangGraph (JS) para modelagem de grafos de agentes multi-step.
   - Agentes como nos especializados (pesquisador, redator, revisor).
   - Transicoes condicionais entre estados.
   - Estado compartilhado persistente por execucao.
2. **Observabilidade:** Adotar Langfuse como camada padrao de tracing:
   - Traces por request com trace_id compartilhado.
   - Spans por etapa (coleta, contexto, geracao, pos-processamento).
   - Metricas de custo, latencia e taxa de sucesso por tenant.
   - Base para avaliacao de qualidade de output.

## Justificativa
1. LangGraph permite orquestracao multi-agente nativa em TypeScript, integrada ao ecossistema existente.
2. Langfuse funciona com qualquer SDK (OpenAI, LangChain, LangGraph, vanilla) sem lock-in de framework.
3. Suporta depuracao e melhoria continua dos fluxos.
4. Permite governanca de custo por cliente.
5. Facilita comparacao de prompts/modelos.

## Trade-offs
1. Custo de instrumentacao inicial.
2. Dependencia operacional de telemetria para leitura de saude do fluxo.
3. LangGraph adiciona complexidade de modelagem de grafos vs pipeline linear.

## Consequencias
1. Todas as operacoes de IA devem carregar trace_id.
2. Dashboards de custo e latencia tornam-se criterios de release.
3. Regressao de qualidade passa a ser mensuravel.
4. O post-worker passa a invocar o grafo LangGraph em vez de chamar OpenAI diretamente.

## Riscos e mitigacoes
1. Risco: spans incompletos.
   - Mitigacao: checklist de instrumentacao por endpoint/job.
2. Risco: custo sem controle por tenant.
   - Mitigacao: alertas de budget e limites por plano.
3. Risco: complexidade do grafo dificultar debug.
   - Mitigacao: visualizacao do grafo em dev, logging estruturado por no.

## Checklist de seguranca
- [x] Dados sensiveis nao devem entrar em logs brutos
- [x] Controle de acesso aos dashboards
- [x] Tag de tenant em metricas e traces
