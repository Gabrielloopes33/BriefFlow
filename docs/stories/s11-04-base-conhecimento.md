# S11-04 — Base de Conhecimento por Cliente (Upload de Arquivos)

**Epic:** Epic 11 — Client Workspace Pro  
**Status:** Draft  
**Pontos:** 13  
**Sprint:** 12  
**Depende de:** Migration 025

---

## Contexto

Atualmente o usuário alimenta o sistema com URLs de fontes (blogs, YouTube). Mas muito do briefing e identidade de um cliente vem em formatos como PDF (guia de marca, briefing, relatórios), Markdown (docs internos), CSV (planilha de pautas) e arquivos de texto. Esses arquivos precisam entrar no banco do cliente e ter o texto extraído para enriquecer a geração de conteúdo via IA.

---

## Acceptance Criteria

### Upload
- [ ] **AC1:** Aba "Base de Conhecimento" no perfil do cliente (ao lado de Visão Geral, Estratégia, etc.)
- [ ] **AC2:** Dropzone para upload de arquivos; tipos aceitos: PDF, MD, TXT, DOCX, CSV, JSON; limite de 25MB por arquivo
- [ ] **AC3:** Upload vai para Supabase Storage bucket `client-knowledge` com path `{tenant_id}/{client_id}/{uuid}.{ext}`
- [ ] **AC4:** Após upload, servidor inicia extração de texto em background (não bloqueia UI)
- [ ] **AC5:** Status de extração exibido no card do documento: "Processando..." → "Indexado" → "Falhou"

### Extração de Texto
- [ ] **AC6:** PDF: extração via `pdf-parse` — texto limpo salvo em `extracted_text`
- [ ] **AC7:** Markdown: conteúdo raw salvo (sem parse HTML) em `extracted_text`
- [ ] **AC8:** TXT/CSV/JSON: conteúdo raw (até 1MB) salvo em `extracted_text`
- [ ] **AC9:** DOCX: extração via `mammoth` — texto limpo salvo em `extracted_text`
- [ ] **AC10:** Arquivos > 1MB de texto extraído: truncado em 1MB com aviso no status

### Gerenciamento
- [ ] **AC11:** Listagem de documentos com: nome, tipo (ícone), tamanho, data de upload, status, label editável
- [ ] **AC12:** Download do arquivo original via URL assinada (expiração 1h)
- [ ] **AC13:** Deleção do documento remove do Storage e da tabela (soft delete não necessário)
- [ ] **AC14:** Busca por texto extraído (`tsvector`) retorna documentos relevantes em < 500ms

### Integração com IA (básica)
- [ ] **AC15:** Endpoint `GET /api/clients/:clientId/knowledge-context` retorna os 3 documentos mais relevantes dado um query (busca por similaridade usando `ts_rank`); usado internamente pelos agentes de geração

---

## IN Scope

- Upload de arquivos via dropzone
- Extração de texto para PDF, MD, TXT, DOCX, CSV, JSON
- Gerenciamento de documentos (listar, download, deletar)
- Busca full-text nos documentos
- Integração básica com agentes de IA

## OUT Scope

- Cards enriquecidos (S11-01)
- Calendário (S11-02)
- Kanban horizontal (S11-03)
- Moodboard (S11-05)
- Embedding vetorial avançado (futuro)

---

## File List

| Ação | Arquivo |
|------|---------|
| CRIAR | `supabase/migrations/025_client_documents.sql` |
| CRIAR | `server/services/document-extractor.ts` |
| CRIAR | `server/routes/client-documents.ts` |
| CRIAR | `client/src/pages/client/KnowledgeBasePage.tsx` |
| CRIAR | `client/src/components/knowledge/DocumentDropzone.tsx` |
| CRIAR | `client/src/components/knowledge/DocumentCard.tsx` |
| CRIAR | `client/src/components/knowledge/DocumentList.tsx` |
| CRIAR | `client/src/hooks/use-client-documents.ts` |
| MODIFICAR | `server/routes.ts` |
| MODIFICAR | `package.json` |
| MODIFICAR | `client/src/pages/ClientDetailPage.tsx` |

---

## Endpoints

```
POST   /api/clients/:clientId/documents          — upload (multipart/form-data)
GET    /api/clients/:clientId/documents          — listar documentos
GET    /api/clients/:clientId/documents/:id/url  — URL assinada para download
DELETE /api/clients/:clientId/documents/:id      — deletar
GET    /api/clients/:clientId/knowledge-context?q={query}  — busca semântica básica
```

---

## Tasks

- [ ] Criar migration 025 (client_documents)
- [ ] Adicionar dependências: pdf-parse, mammoth
- [ ] Criar service document-extractor.ts
- [ ] Criar routes/client-documents.ts com endpoints
- [ ] Criar componente DocumentDropzone
- [ ] Criar componente DocumentCard
- [ ] Criar componente DocumentList
- [ ] Criar página KnowledgeBasePage
- [ ] Criar hook use-client-documents
- [ ] Adicionar aba no ClientDetailPage
- [ ] Configurar bucket client-knowledge no Supabase
- [ ] Testar upload e extração de cada tipo de arquivo

---

## Risks

- Upload de arquivos maliciosos — mitigação: validar MIME type + extensão + magic bytes
- Timeout em PDFs grandes — mitigação: extração em background, truncar texto > 1MB
- Dependências novas (pdf-parse, mammoth) — verificar compatibilidade

---

## Definition of Done

- [ ] AC1–AC15 atendidos
- [ ] Upload de PDF de 10MB processa sem timeout (< 30s)
- [ ] Sem issues CRITICAL no CodeRabbit
- [ ] RLS garante que tenants não acessam documentos de outros tenants
- [ ] Extração falha gracefully (status `failed` + mensagem de erro)
- [ ] Bucket configurado com políticas de acesso corretas no Supabase

---

## Change Log

| Data | Autor | Mudança |
|------|-------|---------|
| 2026-05-27 | @architect | Criado a partir do Epic 11 SDD |
