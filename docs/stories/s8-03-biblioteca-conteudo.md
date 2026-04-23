# S8-03 — Biblioteca de Conteúdo (Histórico + Filtros)

Status: Ready  
Owner: @dev  
Sprint: 08  
Prioridade: Alta  
Pontos: 5

## Contexto

O sistema gera posts mas não tem um lugar para o usuário ver e gerenciar todo o histórico de conteúdo gerado por cliente. A tabela `posts` existe no banco, e há uma rota `/api/clients/:clientId/posts/list`, mas o frontend não tem uma tela dedicada para isso.

A Biblioteca de Conteúdo é esse repositório: todo o conteúdo gerado, filtrado por cliente, status e data, com ações de visualização e aprovação.

## Escopo

**IN:**
- Página `/library` com todos os posts gerados (filtráveis por cliente, status, data)
- Card de post com: título, preview, status (rascunho/aprovado/publicado), data, cliente, nota do revisor
- Ações: visualizar completo, editar status, abrir no editor visual (se criativo disponível)
- Paginação ou scroll infinito (25 posts por página)
- Busca por texto dentro dos posts
- Filtro rápido: "Apenas aprovados", "Esta semana", por cliente

**OUT:**
- Editor de texto inline na biblioteca (usuário vai ao Studio para regerar)
- Exportação em bulk (escopo futuro)
- Agendamento de publicação (escopo futuro)

## Critérios de Aceite

- [ ] Página `/library` acessível via sidebar com ícone de biblioteca
- [ ] Filtro por cliente: dropdown com todos os clientes do tenant
- [ ] Filtro por status: Todos | Rascunho | Em revisão | Aprovado | Publicado
- [ ] Filtro por período: Hoje | Esta semana | Este mês | Tudo
- [ ] Busca de texto retorna resultados em < 500ms (query com índice LIKE ou pg_trgm)
- [ ] Card de post mostra: cliente, título, 2 linhas de preview, status badge, data, nota do revisor (0-10)
- [ ] Clique no card expande modal com conteúdo completo
- [ ] Botão "Abrir no editor visual" visível apenas se `post.creative_id` existir
- [ ] Paginação com 25 posts por carga; botão "Carregar mais" no final

## Endpoint Necessário

```
GET /api/posts?tenantId=&clientId=&status=&period=&search=&page=&limit=
```

Deve retornar posts com joins em `clients` (para nome do cliente) e `creatives` (para saber se tem criativo).

## Arquivos a Criar/Modificar

- CRIAR: `client/src/pages/LibraryPage.tsx`
- CRIAR: `client/src/components/library/PostCard.tsx`
- CRIAR: `client/src/components/library/PostFilters.tsx`
- CRIAR: `client/src/components/library/PostDetailModal.tsx`
- CRIAR: `client/src/hooks/use-posts-library.ts`
- MODIFICAR: `server/routes.ts` — endpoint `GET /api/posts` com filtros
- MODIFICAR: `client/src/App.tsx` — rota `/library`
- MODIFICAR: `client/src/components/layout/Sidebar.tsx` — item "Biblioteca"
- MODIFICAR: `client/src/components/layout/BottomNav.tsx` — item "Biblioteca" mobile

## Definition of Done

- [ ] Critérios de aceite atendidos
- [ ] Sem issues CRITICAL no CodeRabbit
- [ ] Teste: biblioteca com 50+ posts carrega e filtra corretamente
- [ ] Mobile responsivo (cards em coluna única)
- [ ] Evidências: screenshot com filtros aplicados e modal aberto
