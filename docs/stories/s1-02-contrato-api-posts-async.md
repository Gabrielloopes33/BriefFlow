# S1-02 - Contrato da API de Posts Assincronos

Status: Done
Owner: @dev
Sprint: 01
Prioridade: Alta

## Contexto
A criacao de posts precisa ser assincrona para escalar com crawling + IA sem bloquear requisicoes do usuario.

## Escopo
Definir contrato v1 dos endpoints:
- POST /api/clients/:clientId/posts
- GET /api/jobs/:jobId
- GET /api/clients/:clientId/posts
- GET /api/posts/:postId
- PUT /api/posts/:postId

## Criterios de aceite
- [x] Payloads de request/response definidos
- [x] Estados de job definidos (queued, processing, retrying, completed, failed, canceled)
- [x] Codigos de erro padronizados
- [x] Regras de idempotencia e ownership por tenant descritas
- [x] Exemplo de fluxo fim a fim documentado

## Tarefas
- [x] Definir schema do endpoint de criacao
- [x] Definir schema de retorno de status de job
- [x] Definir contratos de listagem e detalhe de post
- [x] Definir politica de erro e validacao
- [x] Revisar com @qa e @architect
- [x] Publicar especificacao v1

## Evidencias
- Contrato OpenAPI: docs/api/posts-async-openapi-v1.yaml
- Exemplo request: definido em components.schemas.CreatePostRequest
- Exemplo response: definido em components.schemas.CreatePostAcceptedResponse e JobStatusResponse
- Matriz de erros: definida em x-error-codes

## Definition of Done
- [x] Criterios de aceite atendidos
- [x] Contrato versionado e revisado
- [x] Evidencias preenchidas
