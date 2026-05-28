# S11-03 — Kanban Horizontal (Layout Tipo Trello)

**Epic:** Epic 11 — Client Workspace Pro  
**Status:** Draft  
**Pontos:** 3  
**Sprint:** 11  
**Depende de:** S11-01 (cards enriquecidos)

---

## Contexto

O kanban atual usa layout vertical (colunas empilhadas no mobile, spread horizontal no desktop mas sem scroll horizontal explícito). A referência visual solicitada — tipo Trello — usa scroll horizontal com colunas de largura fixa, permitindo ver muitos status simultaneamente. O DnD já está instalado (`@dnd-kit`).

---

## Acceptance Criteria

- [ ] **AC1:** Kanban usa layout de scroll horizontal (overflow-x: auto) com colunas de largura fixa (280px)
- [ ] **AC2:** Colunas visíveis: Rascunho | Em Produção | Ajuste | Em Aprovação | Aprovado | Publicado
- [ ] **AC3:** Colunas com badge de contagem de cards (ex: "Rascunho · 5")
- [ ] **AC4:** Drag-and-drop horizontal entre colunas mantém funcionamento existente (apenas layout muda)
- [ ] **AC5:** Cada coluna tem botão "+ Novo post" inline no topo
- [ ] **AC6:** Cards mostram todos os campos do S11-01 (tags, formato, data, cor)
- [ ] **AC7:** Em mobile (< 768px): uma coluna por vez com swipe lateral (slider de colunas)
- [ ] **AC8:** Estado de coluna colapsada: click no header colapsa/expande (útil para colunas com muitos cards)

---

## IN Scope

- Refatoração do layout do kanban para scroll horizontal
- Extração de KanbanColumn e KanbanCard
- Badge de contagem por coluna
- Botão "+ Novo post" por coluna
- Layout mobile com swipe
- Colapsar/expandir coluna

## OUT Scope

- Cards enriquecidos (S11-01)
- Calendário (S11-02)
- Base de conhecimento (S11-04)
- Moodboard (S11-05)

---

## File List

| Ação | Arquivo |
|------|---------|
| MODIFICAR | `client/src/components/client-workspace/ClientKanban.tsx` |
| CRIAR | `client/src/components/client-workspace/KanbanColumn.tsx` |
| CRIAR | `client/src/components/client-workspace/KanbanCard.tsx` |

---

## Tasks

- [ ] Refatorar ClientKanban para layout horizontal com scroll
- [ ] Extrair componente KanbanColumn
- [ ] Extrair componente KanbanCard (usa PostCard do S11-01)
- [ ] Adicionar badge de contagem por coluna
- [ ] Adicionar botão "+ Novo post" por coluna
- [ ] Implementar layout mobile (swipe entre colunas)
- [ ] Implementar colapsar/expandir coluna
- [ ] Garantir que DnD funciona no novo layout

---

## Risks

- DnD pode quebrar com mudança de layout — testar todas as transições
- Scroll horizontal pode conflitar com DnD — usar drag handle ou threshold

---

## Definition of Done

- [ ] AC1–AC8 atendidos
- [ ] Scroll horizontal funciona em todos os browsers modernos (Chrome, Firefox, Safari)
- [ ] DnD não quebrou (testar todas as transições de coluna)
- [ ] Sem issues CRITICAL no CodeRabbit

---

## Change Log

| Data | Autor | Mudança |
|------|-------|---------|
| 2026-05-27 | @architect | Criado a partir do Epic 11 SDD |
