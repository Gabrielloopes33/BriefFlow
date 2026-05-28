# S11-05 — Área de Moodboard no Perfil do Cliente

**Epic:** Epic 11 — Client Workspace Pro  
**Status:** Draft  
**Pontos:** 5  
**Sprint:** 12  
**Depende de:** Migration 026

---

## Contexto

Agências de social media constroem identidade visual dos clientes a partir de referências: fotos de estilo de vida, paletas de cores, exemplos de posts de concorrentes ou referências aspiracionais. O Moodboard é essa coleção visual — fica no perfil do cliente e serve de referência para a equipe na hora de criar conteúdo.

---

## Acceptance Criteria

- [ ] **AC1:** Aba "Moodboard" no perfil do cliente com grid masonry de imagens (4 colunas desktop, 2 mobile)
- [ ] **AC2:** Dropzone para upload de imagens (JPG, PNG, WEBP, GIF); até 10MB por imagem; upload múltiplo (até 20 de uma vez)
- [ ] **AC3:** Upload vai para bucket `moodboard` com path `{tenant_id}/{client_id}/{uuid}.{ext}`; URL pública salva em `client_moodboard_images.public_url`
- [ ] **AC4:** Cada imagem tem campo `label` editável inline (click para editar)
- [ ] **AC5:** Drag-and-drop para reordenar imagens no grid (atualiza `display_order`)
- [ ] **AC6:** Click na imagem abre lightbox full-screen com setas de navegação
- [ ] **AC7:** Botão de deleção (ícone de lixeira) no hover de cada imagem
- [ ] **AC8:** Máximo de 100 imagens por cliente (limite suave com aviso)
- [ ] **AC9:** Imagens exibem skeleton loader enquanto carregam (lazy loading)

---

## IN Scope

- Aba Moodboard no perfil do cliente
- Upload múltiplo de imagens via dropzone
- Grid masonry responsivo
- Reordenação por drag-and-drop
- Lightbox com navegação
- Edição inline de label
- Deleção de imagens

## OUT Scope

- Cards enriquecidos (S11-01)
- Calendário (S11-02)
- Kanban horizontal (S11-03)
- Base de conhecimento (S11-04)
- Extração de paleta de cores (futuro)

---

## File List

| Ação | Arquivo |
|------|---------|
| CRIAR | `supabase/migrations/026_client_moodboard.sql` |
| CRIAR | `server/routes/client-moodboard.ts` |
| CRIAR | `client/src/components/moodboard/MoodboardGrid.tsx` |
| CRIAR | `client/src/components/moodboard/MoodboardImage.tsx` |
| CRIAR | `client/src/components/moodboard/MoodboardDropzone.tsx` |
| CRIAR | `client/src/components/moodboard/MoodboardLightbox.tsx` |
| CRIAR | `client/src/hooks/use-client-moodboard.ts` |
| MODIFICAR | `server/routes.ts` |
| MODIFICAR | `client/src/pages/ClientDetailPage.tsx` |

---

## Endpoints

```
POST   /api/clients/:clientId/moodboard          — upload de imagem(ns)
GET    /api/clients/:clientId/moodboard          — listar imagens (ordenado por display_order)
PATCH  /api/clients/:clientId/moodboard/:id      — atualizar label ou display_order
DELETE /api/clients/:clientId/moodboard/:id      — deletar imagem + Storage
```

---

## Tasks

- [ ] Criar migration 026 (client_moodboard_images)
- [ ] Criar routes/client-moodboard.ts com endpoints
- [ ] Criar componente MoodboardGrid (masonry)
- [ ] Criar componente MoodboardImage
- [ ] Criar componente MoodboardDropzone
- [ ] Criar componente MoodboardLightbox
- [ ] Criar hook use-client-moodboard
- [ ] Adicionar aba no ClientDetailPage
- [ ] Configurar bucket moodboard no Supabase
- [ ] Testar upload múltiplo e reordenação

---

## Risks

- Upload múltiplo pode causar race conditions — mitigação: fila de uploads ou Promise.all com controle
- Performance com muitas imagens — mitigação: lazy loading + paginação se necessário
- Bucket público pode ter custo — monitorar

---

## Definition of Done

- [ ] AC1–AC9 atendidos
- [ ] Upload múltiplo de 20 imagens funciona sem race conditions
- [ ] Sem issues CRITICAL no CodeRabbit
- [ ] RLS garante isolamento por tenant
- [ ] Lightbox funciona com teclado (setas + Escape)

---

## Change Log

| Data | Autor | Mudança |
|------|-------|---------|
| 2026-05-27 | @architect | Criado a partir do Epic 11 SDD |
