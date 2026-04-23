# Sprint 08 — Studio + Onboarding de Clientes

**Período:** Semanas 8-9  
**Objetivo:** Transformar o Chat técnico em Studio conversacional e criar o wizard de onboarding de clientes. Foco em experiência do usuário — produto deve ser utilizável por quem não entende de tecnologia.  
**Status:** Pending

## Responsáveis

| Agente | Papel na Sprint |
|---|---|
| @dev | Studio redesign, wizard, biblioteca, aprovação |
| @ux-design-expert | UX do Studio, wizard de 4 etapas, fluxo de aprovação |
| @architect | Review de mudanças estruturais no chat |
| @qa | Testes de usabilidade + QA Gate |
| @devops | Deploy em staging |

## Dependência

> **Requer Sprint 5 DONE** — WebSocket (S5-01) para feedback em tempo real no Studio

## Backlog

| ID | Story | Owner | Prioridade | Pontos | Dependências |
|---|---|---|---|---|---|
| S8-01 | Redesign Chat → Studio (fluxo conversacional guiado) | @dev + @ux | Crítica | 13 | Sprint 5 |
| S8-02 | Wizard de onboarding de clientes (4 etapas) | @dev + @ux | Crítica | 8 | — |
| S8-03 | Biblioteca de conteúdo (histórico + filtros por cliente) | @dev | Alta | 5 | — |
| S8-04 | Fluxo de aprovação de posts (draft → review → aprovado) | @dev | Alta | 5 | — |

**Total de pontos:** 31

## Detalhamento do Studio (S8-01)

O Studio substitui o Chat atual. Diferenças fundamentais:
- Usuário seleciona cliente → contexto carrega automaticamente
- Campo principal é conversacional ("O que você quer criar hoje?")
- Sem exposição de URLs, scraping ou termos técnicos
- Scraping de fontes acontece em background automaticamente
- Progress bar de geração via WebSocket (não polling)
- Output: post de texto + sugestão de template de carrossel

## Detalhamento do Wizard (S8-02)

4 etapas guiadas:
1. **Identidade** — Nome do cliente, segmento, site
2. **Voz e Tom** — Tom de voz (dropdown: formal/casual/inspirador/educativo) + pilares de conteúdo (tags)
3. **Referências** — "Adicione links de perfis, blogs ou conteúdos que admira" (simplificado)
4. **Exemplos** — "Cole links de posts seus que funcionaram bem" (alimenta o agente de métricas)

## Critério GO/NO-GO da Sprint

- [ ] Studio não exibe nenhum termo técnico (scraping, URL, provider, node) para o usuário
- [ ] Usuário cria cliente completo em menos de 5 minutos via wizard
- [ ] Progress bar do Studio atualiza em tempo real via WebSocket
- [ ] Biblioteca de conteúdo mostra histórico paginado filtrado por cliente e status
- [ ] Post pode ser movido entre draft → em revisão → aprovado
- [ ] Zero issues CRITICAL no QA Gate

## Definition of Done da Sprint

- [ ] Todas as 4 stories com status Done
- [ ] QA Gate PASS com teste de usabilidade documentado
- [ ] Deploy em staging
- [ ] planejamento-execucao-briefflow.md atualizado

## Referências

- SDD v2: [docs/sdd/SDD-briefflow-v2.md](../sdd/SDD-briefflow-v2.md)
- Análise de produto PM: ver análise de rota Chat e Clientes
- ChatPage existente: client/src/pages/ChatPage.tsx
- ClientDetails existente: client/src/pages/ClientDetails.tsx
