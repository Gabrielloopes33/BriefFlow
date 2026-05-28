# S11-01 — Cards de Conteúdo Ricos (Tags, Data, Tipo, Notas)

**Epic:** Epic 11 — Client Workspace Pro  
**Status:** InProgress  
**Pontos:** 5  
**Sprint:** 11  
**Depende de:** — (pode ser paralela a S10-02)  

---

## Contexto

Os posts exibidos no kanban e biblioteca hoje são cards básicos (título + status). Precisamos enriquecê-los com: tags livres, tipo de formato visual, data de publicação, notas internas e label de cor — transformando-os em cards de trabalho completos como ClickUp/Plane.

---

## Acceptance Criteria

- [x] **AC1:** Campo `tags` (array de strings) editável inline no card e no modal de detalhe; autocomplete com tags já usadas pelo tenant
- [x] **AC2:** Campo `format_type` exibe ícone correspondente no card: Estático, Carrossel, Reels, Story, Texto
- [x] **AC3:** Campo `scheduled_for` (data + hora) editável via date-picker no card; ausência exibe "Sem data"
- [x] **AC4:** Campo `notes` (texto livre) visível no modal de detalhe; não no card compacto
- [x] **AC5:** Label de cor (7 opções: sem cor, vermelho, amarelo, verde, azul, roxo, rosa) exibe borda lateral colorida no card
- [x] **AC6:** `PUT /api/posts/:id` aceita `{ tags, format_type, notes, color_label, scheduled_for }` e persiste
- [x] **AC7:** Filtro por tag funcional na Biblioteca e no Kanban (filtra cards em tempo real sem reload)
- [x] **AC8:** Migration 024 aplicada; nenhuma regressão nos posts existentes

---

## IN Scope

- Campos novos na tabela `posts`: `tags`, `format_type`, `notes`, `color_label`
- UI de edição inline e modal de detalhe
- Filtro por tag na Biblioteca e Kanban
- Índices GIN para performance

## OUT Scope

- Calendário (S11-02)
- Kanban horizontal (S11-03)
- Base de conhecimento (S11-04)
- Moodboard (S11-05)

---

## File List

| Ação | Arquivo |
|------|---------|
| CRIAR | `supabase/migrations/024_post_tags_card_metadata.sql` |
| CRIAR | `client/src/components/posts/PostCard.tsx` |
| CRIAR | `client/src/components/posts/TagInput.tsx` |
| CRIAR | `client/src/components/posts/ColorLabelPicker.tsx` |
| CRIAR | `client/src/hooks/use-post-tags.ts` |
| MODIFICAR | `server/routes.ts` |
| MODIFICAR | `client/src/hooks/use-posts-library.ts` |

---

## Tasks

- [x] Criar migration 024 (tags, format_type, notes, color_label + índices)
- [x] Atualizar tipos TypeScript (client/src/hooks/use-posts-library.ts)
- [x] Implementar PUT /api/posts/:id com novos campos
- [x] Criar componente PostCard com campos enriquecidos
- [x] Criar TagInput com autocomplete
- [x] Criar ColorLabelPicker
- [x] Criar hook use-post-tags para tags do tenant
- [x] Implementar filtro por tag na Biblioteca
- [x] Implementar filtro por tag no Kanban
- [x] Testar regressão com posts existentes

---

## Risks

- Tags livres podem gerar inconsistência (solução: autocomplete + normalização)
- Campos novos podem quebrar queries existentes (solução: defaults e nullable)

---

## Definition of Done

- [x] AC1–AC8 atendidos
- [x] Migration aplica sem erros em banco de desenvolvimento
- [ ] Sem issues CRITICAL no CodeRabbit
- [ ] Cards existentes não quebram (campos novos nullable/default)

---

## Change Log

| Data | Autor | Mudança |
|------|-------|---------|
| 2026-05-27 | @architect | Criado a partir do Epic 11 SDD |
| 2026-05-27 | @dev | Filtro por tag implementado no Kanban + autocomplete de tags no modal de detalhe |
| 2026-05-27 | @dev | Edição inline no card (tags + agendamento) e hook dedicado use-post-tags |
| 2026-05-27 | @dev | AC1-AC7 validados em código; AC8 pendente por ausência de DATABASE_URL no ambiente local |
| 2026-05-27 | @dev | AC8 concluído: migration 024 aplicada via pg client; regressão validada (34 posts, null_format_type=0, invalid_format_type=0, null_tags=0) |
