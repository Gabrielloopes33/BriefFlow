# Epic 11 — SDD: Client Workspace Pro

**Status:** Draft  
**Autor:** @architect  
**Data:** 2026-05-27  
**Sprint alvo:** 11–12  
**Prioridade:** Alta  

---

## 1. Visão Geral

Este documento descreve o design técnico do **Epic 11 — Client Workspace Pro**, que eleva a experiência de gerenciamento de conteúdo para o nível de ferramentas como ClickUp, Plane e Trello, com funcionalidades específicas para agências de social media.

### 1.1 Funcionalidades do Epic

| ID | Feature | Complexidade | Sprint |
|----|---------|-------------|--------|
| S11-01 | Cards de conteúdo ricos (tags, data, tipo, campos extras) | Média | 11 |
| S11-02 | Visualização em Calendário por cliente | Média | 11 |
| S11-03 | Kanban horizontal (layout tipo Trello) | Baixa | 11 |
| S11-04 | Base de Conhecimento por cliente (PDF, .md, uploads) | Alta | 12 |
| S11-05 | Área de Moodboard no perfil do cliente | Média | 12 |

### 1.2 Motivação

O sistema atual possui a estrutura base (tabela `posts` com `scheduled_for`, `stage_tag`, `kanban_order`; tabela `clients` com campos do wizard), mas a experiência de gerenciamento ainda é limitada. Os usuários precisam:

- Organizar conteúdos visualmente como cards (com data, tags, tipo de formato)
- Ver o calendário editorial de cada cliente
- Usar kanban horizontal (modelo mental Trello — mais intuitivo para conteúdo)
- Enviar PDFs, briefings e referências que se tornam base de dados do cliente
- Manter um moodboard visual por cliente para guiar a identidade visual

---

## 2. Arquitetura e Decisões Técnicas

### 2.1 Stack existente relevante

```
Frontend:  React + Vite + TanStack Query + Tailwind
Backend:   Express + TypeScript
Database:  Supabase (PostgreSQL + RLS + Storage)
Realtime:  WebSocket (job events)
```

### 2.2 Decisões de design

| Decisão | Escolha | Alternativa descartada | Motivo |
|---------|---------|----------------------|--------|
| Tags storage | `TEXT[]` em `posts` com índice GIN | Tabela separada `post_tags` | Simplicidade; volume não justifica JOIN extra |
| Upload de arquivos | Supabase Storage + metadados em tabela `client_documents` | Base64 no banco | Supabase Storage é o padrão do projeto para binários |
| Parsing de PDF | `pdf-parse` no server (Node.js) | Worker externo | Evita infraestrutura extra; PDFs < 10MB |
| Parsing de Markdown | `marked` no server | Nenhum (armazenar raw) | Extração de texto limpo para embedding futuro |
| Moodboard storage | Supabase Storage bucket `moodboard` + tabela `client_moodboard_images` | Coluna JSONB em `clients` | URLs de imagens + metadados separados = mais flexível |
| Calendário | Componente próprio (CSS Grid) | `react-big-calendar` | Mais controle visual; biblioteca pesa 150KB |
| Kanban horizontal | Refactor do DnD existente | Novo componente | DnD kit já instalado; apenas mudar direção do layout |
| Extração de texto (Knowledge Base) | Texto extraído salvo em `extracted_text` | Somente URL | Permite busca full-text e base para IA futura |

---

## 3. Mudanças de Schema (Banco de Dados)

### Migration 024 — Post tags e melhorias de card

```sql
-- Migration: Post tags + card metadata
-- Epic 11 S11-01

ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS format_type TEXT DEFAULT 'carousel'
    CHECK (format_type IN ('carousel', 'reels', 'static', 'story', 'text')),
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS color_label TEXT;

-- Índice GIN para busca eficiente por tags
CREATE INDEX IF NOT EXISTS idx_posts_tags ON posts USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_posts_format_type ON posts(format_type);
CREATE INDEX IF NOT EXISTS idx_posts_tenant_client_scheduled
  ON posts(tenant_id, client_id, scheduled_for)
  WHERE scheduled_for IS NOT NULL;
```

### Migration 025 — Base de Conhecimento por cliente

```sql
-- Migration: Client knowledge base documents
-- Epic 11 S11-04

CREATE TABLE IF NOT EXISTS client_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  uploaded_by UUID REFERENCES app_users(id) ON DELETE SET NULL,

  -- Metadados do arquivo
  filename TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('pdf', 'md', 'txt', 'docx', 'csv', 'json', 'other')),
  file_size_bytes INTEGER NOT NULL,
  storage_path TEXT NOT NULL,         -- path no Supabase Storage
  storage_bucket TEXT NOT NULL DEFAULT 'client-knowledge',

  -- Conteúdo extraído para busca e IA
  extracted_text TEXT,
  extraction_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (extraction_status IN ('pending', 'processing', 'done', 'failed')),

  -- Metadados de uso
  label TEXT,                         -- nome amigável dado pelo usuário
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_client_documents_tenant_client
  ON client_documents(tenant_id, client_id);
CREATE INDEX IF NOT EXISTS idx_client_documents_extraction_status
  ON client_documents(extraction_status) WHERE extraction_status != 'done';

-- Full-text search index no texto extraído
CREATE INDEX IF NOT EXISTS idx_client_documents_extracted_text
  ON client_documents USING GIN(to_tsvector('portuguese', COALESCE(extracted_text, '')));

ALTER TABLE client_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can manage client documents" ON client_documents
  FOR ALL USING (current_user_is_tenant_member(tenant_id))
  WITH CHECK (current_user_is_tenant_member(tenant_id));

COMMENT ON TABLE client_documents IS 'Arquivos enviados por cliente — PDF, MD, TXT, etc. — com texto extraído para base de conhecimento';
```

### Migration 026 — Moodboard do cliente

```sql
-- Migration: Client moodboard images
-- Epic 11 S11-05

CREATE TABLE IF NOT EXISTS client_moodboard_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  uploaded_by UUID REFERENCES app_users(id) ON DELETE SET NULL,

  -- Storage
  storage_path TEXT NOT NULL,
  storage_bucket TEXT NOT NULL DEFAULT 'moodboard',
  public_url TEXT NOT NULL,

  -- Metadados visuais
  label TEXT,
  color_palette TEXT[],               -- cores extraídas (futuro: via sharp)
  display_order INTEGER NOT NULL DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_moodboard_images_client
  ON client_moodboard_images(tenant_id, client_id, display_order);

ALTER TABLE client_moodboard_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can manage moodboard images" ON client_moodboard_images
  FOR ALL USING (current_user_is_tenant_member(tenant_id))
  WITH CHECK (current_user_is_tenant_member(tenant_id));

COMMENT ON TABLE client_moodboard_images IS 'Imagens de referência visual por cliente para guiar identidade estética';
```

---

## 4. Stories

---

### S11-01 — Cards de Conteúdo Ricos (Tags, Data, Tipo, Notas)

**Status:** Draft  
**Pontos:** 5  
**Depende de:** S10-02 (ou pode ser paralela — não há dependência direta)

#### Contexto

Os posts exibidos no kanban e biblioteca hoje são cards básicos (título + status). Precisamos enriquecê-los com: tags livres, tipo de formato visual, data de publicação, notas internas e label de cor — transformando-os em cards de trabalho completos como ClickUp/Plane.

#### Acceptance Criteria

- **AC1:** Campo `tags` (array de strings) editável inline no card e no modal de detalhe; autocomplete com tags já usadas pelo tenant
- **AC2:** Campo `format_type` exibe ícone correspondente no card: 📸 Estático, 🎠 Carrossel, 🎬 Reels, 📖 Story, 📝 Texto
- **AC3:** Campo `scheduled_for` (data + hora) editável via date-picker no card; ausência exibe "Sem data"
- **AC4:** Campo `notes` (texto livre) visível no modal de detalhe; não no card compacto
- **AC5:** Label de cor (7 opções: sem cor, vermelho, amarelo, verde, azul, roxo, rosa) exibe borda lateral colorida no card
- **AC6:** `PUT /api/posts/:id` aceita `{ tags, format_type, notes, color_label, scheduled_for }` e persiste
- **AC7:** Filtro por tag funcional na Biblioteca e no Kanban (filtra cards em tempo real sem reload)
- **AC8:** Migration 024 aplicada; nenhuma regressão nos posts existentes

#### Arquivos a Criar/Modificar

```
CRIAR:   supabase/migrations/024_post_tags_card_metadata.sql
CRIAR:   client/src/components/posts/PostCard.tsx          (substitui PostCard existente)
CRIAR:   client/src/components/posts/TagInput.tsx          (input de tags com autocomplete)
CRIAR:   client/src/components/posts/ColorLabelPicker.tsx
CRIAR:   client/src/hooks/use-post-tags.ts                 (fetch das tags usadas pelo tenant)
MODIFICAR: server/routes.ts                                (PUT /api/posts/:id — novos campos)
MODIFICAR: shared/types/post.ts                            (interface Post — novos campos)
```

#### Definition of Done

- [ ] AC1–AC8 atendidos
- [ ] Migration aplica sem erros em banco de desenvolvimento
- [ ] Sem issues CRITICAL no CodeRabbit
- [ ] Cards existentes não quebram (campos novos nullable/default)

---

### S11-02 — Visualização em Calendário por Cliente

**Status:** Draft  
**Pontos:** 8  
**Depende de:** S11-01 (campo `scheduled_for` editável nos cards)

#### Contexto

Agências precisam ver o calendário editorial de cada cliente — quais posts estão agendados para qual dia, com visualização mensal e semanal. O campo `scheduled_for` já existe na tabela `posts`. Esta story entrega a UI do calendário e a integração com drag-to-schedule.

#### Acceptance Criteria

- **AC1:** Rota `/clients/:clientId/calendar` com visualização mensal (grid 7 colunas × N semanas)
- **AC2:** Cada dia do calendário exibe os cards dos posts com `scheduled_for` naquela data; cor do card segue `color_label` do post
- **AC3:** Visualização semanal (toggle Mês / Semana) com horário expandido (8h–22h, slots de 1h)
- **AC4:** Drag-and-drop de card entre dias realoca `scheduled_for` com update otimista + persistência via `PUT /api/posts/:id`
- **AC5:** Click em dia vazio abre modal de criação de post com `scheduled_for` pré-preenchido
- **AC6:** Click em card existente abre modal de detalhe (mesmo modal da Biblioteca)
- **AC7:** Indicador de "hoje" destacado visualmente
- **AC8:** Calendário exibe posts dos status: `draft`, `in_production`, `ready_review`, `in_approval`, `approved`, `scheduled` (não exibe `published` e `rejected` por padrão — toggle opcional)
- **AC9:** Filtro por `format_type` funcional no calendário (ex: ver apenas Carrosséis do mês)
- **AC10:** Responsivo — em mobile, exibe lista de eventos por dia (não grid)

#### Componentes de UI

```
CalendarPage
├── CalendarHeader (navegação de mês/semana, toggles, filtros)
├── MonthView (CSS Grid 7 cols)
│   ├── CalendarDay
│   │   └── PostMiniCard[] (título truncado + ícone de formato + cor)
├── WeekView (CSS Grid 7 cols com linhas de hora)
│   └── PostTimeBlock (posicionado por hora do scheduled_for)
└── PostDetailModal (reutilizado da Biblioteca)
```

#### Arquivos a Criar/Modificar

```
CRIAR:   client/src/pages/ClientCalendarPage.tsx
CRIAR:   client/src/components/calendar/CalendarHeader.tsx
CRIAR:   client/src/components/calendar/MonthView.tsx
CRIAR:   client/src/components/calendar/WeekView.tsx
CRIAR:   client/src/components/calendar/CalendarDay.tsx
CRIAR:   client/src/components/calendar/PostMiniCard.tsx
CRIAR:   client/src/hooks/use-client-calendar.ts
MODIFICAR: client/src/App.tsx              (rota /clients/:clientId/calendar)
MODIFICAR: client/src/components/layout/Sidebar.tsx  (link Calendário no menu do cliente)
```

#### Definition of Done

- [ ] AC1–AC10 atendidos
- [ ] Drag-and-drop funcional com feedback visual durante arrasto
- [ ] Update otimista com rollback em caso de erro de rede
- [ ] Sem issues CRITICAL no CodeRabbit
- [ ] Teste: 30+ posts distribuídos em um mês renderizam sem degradação visual

---

### S11-03 — Kanban Horizontal (Layout Tipo Trello)

**Status:** Draft  
**Pontos:** 3  
**Depende de:** S11-01 (cards enriquecidos)

#### Contexto

O kanban atual usa layout vertical (colunas empilhadas no mobile, spread horizontal no desktop mas sem scroll horizontal explícito). A referência visual solicitada — tipo Trello — usa scroll horizontal com colunas de largura fixa, permitindo ver muitos status simultaneamente. O DnD já está instalado (`@dnd-kit`).

#### Acceptance Criteria

- **AC1:** Kanban usa layout de scroll horizontal (overflow-x: auto) com colunas de largura fixa (280px)
- **AC2:** Colunas visíveis: Rascunho | Em Produção | Ajuste | Em Aprovação | Aprovado | Publicado
- **AC3:** Colunas com badge de contagem de cards (ex: "Rascunho · 5")
- **AC4:** Drag-and-drop horizontal entre colunas mantém funcionamento existente (apenas layout muda)
- **AC5:** Cada coluna tem botão "+ Novo post" inline no topo
- **AC6:** Cards mostram todos os campos do S11-01 (tags, formato, data, cor)
- **AC7:** Em mobile (< 768px): uma coluna por vez com swipe lateral (slider de colunas)
- **AC8:** Estado de coluna colapsada: click no header colapsa/expande (útil para colunas com muitos cards)

#### Arquivos a Criar/Modificar

```
MODIFICAR: client/src/components/client-workspace/ClientKanban.tsx  (layout → horizontal)
CRIAR:     client/src/components/client-workspace/KanbanColumn.tsx   (extraído do Kanban)
CRIAR:     client/src/components/client-workspace/KanbanCard.tsx     (usa PostCard do S11-01)
```

#### Definition of Done

- [ ] AC1–AC8 atendidos
- [ ] Scroll horizontal funciona em todos os browsers modernos (Chrome, Firefox, Safari)
- [ ] DnD não quebrou (testar todas as transições de coluna)
- [ ] Sem issues CRITICAL no CodeRabbit

---

### S11-04 — Base de Conhecimento por Cliente (Upload de Arquivos)

**Status:** Draft  
**Pontos:** 13  
**Depende de:** Migration 025

#### Contexto

Atualmente o usuário alimenta o sistema com URLs de fontes (blogs, YouTube). Mas muito do briefing e identidade de um cliente vem em formatos como PDF (guia de marca, briefing, relatórios), Markdown (docs internos), CSV (planilha de pautas) e arquivos de texto. Esses arquivos precisam entrar no banco do cliente e ter o texto extraído para enriquecer a geração de conteúdo via IA.

#### Acceptance Criteria

**Upload:**
- **AC1:** Aba "Base de Conhecimento" no perfil do cliente (ao lado de Visão Geral, Estratégia, etc.)
- **AC2:** Dropzone para upload de arquivos; tipos aceitos: PDF, MD, TXT, DOCX, CSV, JSON; limite de 25MB por arquivo
- **AC3:** Upload vai para Supabase Storage bucket `client-knowledge` com path `{tenant_id}/{client_id}/{uuid}.{ext}`
- **AC4:** Após upload, servidor inicia extração de texto em background (não bloqueia UI)
- **AC5:** Status de extração exibido no card do documento: "Processando..." → "Indexado" → "Falhou"

**Extração de Texto:**
- **AC6:** PDF: extração via `pdf-parse` — texto limpo salvo em `extracted_text`
- **AC7:** Markdown: conteúdo raw salvo (sem parse HTML) em `extracted_text`
- **AC8:** TXT/CSV/JSON: conteúdo raw (até 1MB) salvo em `extracted_text`
- **AC9:** DOCX: extração via `mammoth` — texto limpo salvo em `extracted_text`
- **AC10:** Arquivos > 1MB de texto extraído: truncado em 1MB com aviso no status

**Gerenciamento:**
- **AC11:** Listagem de documentos com: nome, tipo (ícone), tamanho, data de upload, status, label editável
- **AC12:** Download do arquivo original via URL assinada (expiração 1h)
- **AC13:** Deleção do documento remove do Storage e da tabela (soft delete não necessário)
- **AC14:** Busca por texto extraído (`tsvector`) retorna documentos relevantes em < 500ms

**Integração com IA (básica):**
- **AC15:** Endpoint `GET /api/clients/:clientId/knowledge-context` retorna os 3 documentos mais relevantes dado um query (busca por similaridade usando `ts_rank`); usado internamente pelos agentes de geração

#### Arquivos a Criar/Modificar

```
CRIAR:   supabase/migrations/025_client_documents.sql
CRIAR:   server/services/document-extractor.ts      (pdf-parse + mammoth + text handlers)
CRIAR:   server/routes/client-documents.ts          (CRUD + upload endpoints)
CRIAR:   client/src/pages/client/KnowledgeBasePage.tsx
CRIAR:   client/src/components/knowledge/DocumentDropzone.tsx
CRIAR:   client/src/components/knowledge/DocumentCard.tsx
CRIAR:   client/src/components/knowledge/DocumentList.tsx
CRIAR:   client/src/hooks/use-client-documents.ts
MODIFICAR: server/routes.ts                          (montar router de client-documents)
MODIFICAR: package.json                              (+ pdf-parse, mammoth)
MODIFICAR: client/src/pages/ClientDetailPage.tsx     (nova aba "Base de Conhecimento")
```

#### Endpoints

```
POST   /api/clients/:clientId/documents          — upload (multipart/form-data)
GET    /api/clients/:clientId/documents          — listar documentos
GET    /api/clients/:clientId/documents/:id/url  — URL assinada para download
DELETE /api/clients/:clientId/documents/:id      — deletar
GET    /api/clients/:clientId/knowledge-context?q={query}  — busca semântica básica
```

#### Definition of Done

- [ ] AC1–AC15 atendidos
- [ ] Upload de PDF de 10MB processa sem timeout (< 30s)
- [ ] Sem issues CRITICAL no CodeRabbit
- [ ] RLS garante que tenants não acessam documentos de outros tenants
- [ ] Extração falha gracefully (status `failed` + mensagem de erro)
- [ ] Bucket configurado com políticas de acesso corretas no Supabase

---

### S11-05 — Área de Moodboard no Perfil do Cliente

**Status:** Draft  
**Pontos:** 5  
**Depende de:** Migration 026

#### Contexto

Agências de social media constroem identidade visual dos clientes a partir de referências: fotos de estilo de vida, paletas de cores, exemplos de posts de concorrentes ou referências aspiracionais. O Moodboard é essa coleção visual — fica no perfil do cliente e serve de referência para a equipe na hora de criar conteúdo.

#### Acceptance Criteria

- **AC1:** Aba "Moodboard" no perfil do cliente com grid masonry de imagens (4 colunas desktop, 2 mobile)
- **AC2:** Dropzone para upload de imagens (JPG, PNG, WEBP, GIF); até 10MB por imagem; upload múltiplo (até 20 de uma vez)
- **AC3:** Upload vai para bucket `moodboard` com path `{tenant_id}/{client_id}/{uuid}.{ext}`; URL pública salva em `client_moodboard_images.public_url`
- **AC4:** Cada imagem tem campo `label` editável inline (click para editar)
- **AC5:** Drag-and-drop para reordenar imagens no grid (atualiza `display_order`)
- **AC6:** Click na imagem abre lightbox full-screen com setas de navegação
- **AC7:** Botão de deleção (ícone de lixeira) no hover de cada imagem
- **AC8:** Máximo de 100 imagens por cliente (limite suave com aviso)
- **AC9:** Imagens exibem skeleton loader enquanto carregam (lazy loading)

#### Arquivos a Criar/Modificar

```
CRIAR:   supabase/migrations/026_client_moodboard.sql
CRIAR:   server/routes/client-moodboard.ts
CRIAR:   client/src/components/moodboard/MoodboardGrid.tsx
CRIAR:   client/src/components/moodboard/MoodboardImage.tsx
CRIAR:   client/src/components/moodboard/MoodboardDropzone.tsx
CRIAR:   client/src/components/moodboard/MoodboardLightbox.tsx
CRIAR:   client/src/hooks/use-client-moodboard.ts
MODIFICAR: server/routes.ts                           (montar router de moodboard)
MODIFICAR: client/src/pages/ClientDetailPage.tsx      (nova aba "Moodboard")
```

#### Endpoints

```
POST   /api/clients/:clientId/moodboard          — upload de imagem(ns)
GET    /api/clients/:clientId/moodboard          — listar imagens (ordenado por display_order)
PATCH  /api/clients/:clientId/moodboard/:id      — atualizar label ou display_order
DELETE /api/clients/:clientId/moodboard/:id      — deletar imagem + Storage
```

#### Definition of Done

- [ ] AC1–AC9 atendidos
- [ ] Upload múltiplo de 20 imagens funciona sem race conditions
- [ ] Sem issues CRITICAL no CodeRabbit
- [ ] RLS garante isolamento por tenant
- [ ] Lightbox funciona com teclado (setas + Escape)

---

## 5. Diagrama de Dependências

```
S11-01 (Cards ricos)
    └─→ S11-02 (Calendário)   — usa scheduled_for editável
    └─→ S11-03 (Kanban H.)    — usa cards enriquecidos

Migration 025
    └─→ S11-04 (Knowledge Base)

Migration 026
    └─→ S11-05 (Moodboard)

S11-04 e S11-05 são independentes entre si e podem ser paralelos.
```

**Ordem recomendada de implementação:**
1. S11-01 → S11-03 (kanban horizontal é rápido, aproveita cards do S11-01)
2. S11-02 (calendário, depende de S11-01)
3. S11-04 + S11-05 em paralelo (sprint 12)

---

## 6. Considerações de Segurança

| Item | Mitigação |
|------|-----------|
| Upload de arquivos maliciosos | Validar MIME type no servidor + extensão + magic bytes; rejeitar executáveis |
| Tamanho de arquivo | Limite 25MB server-side (antes de salvar no Storage) |
| XSS via conteúdo extraído | Texto extraído é armazenado como texto puro; nunca renderizado como HTML sem sanitização |
| Acesso cross-tenant | RLS em todas as novas tabelas; path de storage inclui `tenant_id` |
| URL assinada de documentos | Expiração de 1h; gerada on-demand, nunca exposta publicamente |
| Imagens de moodboard | Bucket público (URLs diretas OK para imagens visuais); documentos em bucket privado |

---

## 7. Estimativas

| Story | Pontos | Dev estimado |
|-------|--------|-------------|
| S11-01 | 5 | 2 dias |
| S11-02 | 8 | 3–4 dias |
| S11-03 | 3 | 1 dia |
| S11-04 | 13 | 5–6 dias |
| S11-05 | 5 | 2 dias |
| **Total** | **34** | **~2 sprints** |

---

## 8. Referências Visuais

As imagens de referência fornecidas mostram:

1. **Grid tipo ClickUp/Plane:** cards com título, formato (Carrossel/Reels), data, status badge colorido — implementado em S11-01
2. **Calendário mensal:** posts distribuídos por dia com cor de status — implementado em S11-02
3. **Moodboard grid:** galeria masonry com upload e labels — implementado em S11-05

O sistema de status de cores observado nas referências:
- Cinza/neutro → Rascunho
- Amarelo → Em Aprovação / Ajuste
- Verde → Aprovado
- Status badge inline no card

---

*Synkra AIOX — Epic 11 SDD v1.0*
