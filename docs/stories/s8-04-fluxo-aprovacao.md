# S8-04 — Fluxo de Aprovação de Posts (draft → review → aprovado)

Status: Ready  
Owner: @dev  
Sprint: 08  
Prioridade: Alta  
Pontos: 5

## Contexto

Os posts gerados ficam em `status: 'draft'` e não existe um fluxo formal para movê-los para aprovação e publicação. Para agências com equipe, isso é um gap crítico: o social media manager gera, o cliente aprova, e só então publica.

Esta story implementa o fluxo básico de status com ações claras.

## Escopo

**IN:**
- Status flow: `draft` → `ready_review` → `approved` → `published`
- Ações em cada post: "Enviar para revisão", "Aprovar", "Rejeitar", "Marcar como publicado"
- Histórico de mudanças de status (quem mudou, quando)
- Badge de status colorido em todo lugar que exibe posts
- Filtro na Biblioteca por status

**OUT:**
- Notificações por email de aprovação (escopo futuro)
- Link de aprovação externo para clientes sem login (escopo futuro)
- Aprovação com assinatura digital

## Critérios de Aceite

- [ ] Campos adicionados ao schema: `status_updated_at`, `status_updated_by` em `posts`
- [ ] Endpoint `PUT /api/posts/:id/status` aceita novo status com validação de transição
- [ ] Transições válidas: draft→ready_review, ready_review→approved, ready_review→draft (rejeitar), approved→published
- [ ] UI: botões de ação contextual por status atual do post (sem mostrar ações inválidas)
- [ ] Badge de status com cor por estado: cinza (draft), amarelo (em revisão), verde (aprovado), azul (publicado)
- [ ] Log de mudança de status exibido no modal de detalhe do post
- [ ] Filtro por status funcional na Biblioteca (S8-03)

## Mapeamento de Ações por Status

| Status atual | Ações disponíveis |
|---|---|
| `draft` | "Enviar para revisão" |
| `ready_review` | "Aprovar" + "Devolver para rascunho" |
| `approved` | "Marcar como publicado" + "Devolver para revisão" |
| `published` | Nenhuma ação de mudança (estado final) |

## Migration Necessária

```sql
-- Adicionar campos de auditoria à tabela posts
ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS status_updated_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS status_updated_by UUID REFERENCES auth.users(id);

-- Adicionar status 'ready_review' ao check constraint existente
-- (verificar constraint atual antes de alterar)
```

## Arquivos a Criar/Modificar

- CRIAR: `supabase/migrations/010_posts_status_audit.sql`
- CRIAR: `client/src/components/library/PostStatusBadge.tsx`
- CRIAR: `client/src/components/library/PostStatusActions.tsx`
- MODIFICAR: `server/routes.ts` — endpoint `PUT /api/posts/:id/status`
- MODIFICAR: `client/src/components/library/PostDetailModal.tsx` (S8-03) — ações de status + histórico
- MODIFICAR: `client/src/components/library/PostCard.tsx` — badge de status

## Definition of Done

- [ ] Critérios de aceite atendidos
- [ ] Sem issues CRITICAL no CodeRabbit
- [ ] Transições inválidas retornam erro 400 com mensagem clara
- [ ] Auditoria de status persistida no banco
- [ ] Evidências: post movido por todas as etapas do fluxo com log correto
