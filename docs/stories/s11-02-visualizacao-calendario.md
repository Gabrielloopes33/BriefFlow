# S11-02 — Visualização em Calendário por Cliente

**Epic:** Epic 11 — Client Workspace Pro  
**Status:** InProgress  
**Pontos:** 8  
**Sprint:** 11  
**Depende de:** S11-01 (campo `scheduled_for` editável nos cards)

---

## Contexto

Agências precisam ver o calendário editorial de cada cliente — quais posts estão agendados para qual dia, com visualização mensal e semanal. O campo `scheduled_for` já existe na tabela `posts`. Esta story entrega a UI do calendário e a integração com drag-to-schedule.

---

## Acceptance Criteria

- [x] **AC1:** Rota `/clients/:clientId/calendar` com visualização mensal (grid 7 colunas × N semanas)
- [x] **AC2:** Cada dia do calendário exibe os cards dos posts com `scheduled_for` naquela data; cor do card segue `color_label` do post
- [x] **AC3:** Visualização semanal (toggle Mês / Semana) com horário expandido (8h–22h, slots de 1h)
- [x] **AC4:** Drag-and-drop de card entre dias realoca `scheduled_for` com update otimista + persistência
- [x] **AC5:** Click em dia vazio abre modal de criação com `scheduled_for` pré-preenchido
- [x] **AC6:** Click em card existente abre modal de detalhe (mesmo modal da Biblioteca)
- [x] **AC7:** Indicador de "hoje" destacado visualmente
- [x] **AC8:** Calendário exibe por padrão status ativos e oferece toggle opcional para incluir `published` e `rejected`
- [x] **AC9:** Filtro por `format_type` funcional no calendário
- [x] **AC10:** Responsivo — em mobile, exibe lista de eventos por dia (não grid)

---

## IN Scope

- Página de calendário por cliente (/clients/:clientId/calendar)
- Visualizações mensal e semanal
- Drag-and-drop entre dias
- Modal de criação rápida e detalhe
- Filtro por format_type
- Responsivo mobile

## OUT Scope

- Kanban horizontal (S11-03)
- Base de conhecimento (S11-04)
- Moodboard (S11-05)
- Notificações de lembrete

---

## File List

| Ação | Arquivo |
|------|---------|
| MODIFICAR | `client/src/components/ClientWorkspace/CalendarTab.tsx` |
| MODIFICAR | `client/src/hooks/use-client-workspace.ts` |
| MODIFICAR | `client/src/App.tsx` |
| MODIFICAR | `client/src/components/ClientWorkspace/index.tsx` |
| MODIFICAR | `server/routes.ts` |

---

## Tasks

- [x] Consolidar página/componente de calendário no Client Workspace
- [x] Implementar visualização mensal (grid 7 colunas)
- [x] Implementar visualização semanal (8h-22h)
- [x] Implementar drag-and-drop entre dias com atualização otimista
- [x] Implementar modal de criação em dia vazio com `scheduled_for` pré-preenchido
- [x] Integrar modal de detalhe em cards existentes
- [x] Implementar filtro por format_type
- [x] Implementar toggle de status arquivados (published/rejected)
- [x] Adicionar rota `/clients/:clientId/calendar` no App.tsx
- [x] Testar responsividade mobile

---

## Risks

- Performance com muitos posts (>30/mês) — mitigação: virtualização se necessário
- Drag-and-drop complexo em diferentes views — testar extensivamente

---

## Definition of Done

- [x] AC1–AC10 atendidos
- [x] Drag-and-drop funcional com feedback visual durante arrasto
- [x] Update otimista com rollback em caso de erro de rede
- [ ] Sem issues CRITICAL no CodeRabbit
- [ ] Teste: 30+ posts distribuídos em um mês renderizam sem degradação visual

---

## Change Log

| Data | Autor | Mudança |
|------|-------|---------|
| 2026-05-27 | @architect | Criado a partir do Epic 11 SDD |
| 2026-05-27 | @dev | Implementação consolidada no CalendarTab + backend calendar filters + rota dedicada /clients/:clientId/calendar |
