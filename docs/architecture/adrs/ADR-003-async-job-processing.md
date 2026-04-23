# ADR-003 - Processamento Assincrono de Jobs

Status: Accepted
Data: 2026-04-17
Owner: @architect

## Contexto
Criacao de posts, crawling e orquestracao de IA sao operacoes lentas e falhaveis para execucao sincrona em request HTTP.

## Decisao
Adotar pipeline assincrono com fila e workers:
1. Endpoint de criacao retorna 202 com job_id.
2. Worker processa etapas e atualiza status.
3. Retry com backoff exponencial para falhas transientes.
4. Idempotencia obrigatoria por idempotency_key.
5. DLQ para falhas permanentes.

## Justificativa
1. Melhora responsividade da API.
2. Aumenta resiliencia em picos e falhas externas.
3. Permite rastreamento detalhado por etapa.

## Trade-offs
1. Maior complexidade operacional (fila, worker, monitoracao).
2. Necessidade de UX de acompanhamento de status no frontend.

## Consequencias
1. Modelo de dados adiciona entidade de jobs e tentativas.
2. API precisa de endpoint de status e cancelamento.
3. Monitoramento de backlog e taxa de falha torna-se obrigatorio.

## Riscos e mitigacoes
1. Risco: duplicacao de jobs.
   - Mitigacao: chave de idempotencia unica por tenant + request.
2. Risco: backlog crescer sem controle.
   - Mitigacao: limites por tenant e alertas de fila.

## Checklist de seguranca
- [x] Idempotencia definida
- [x] Politica de retry e DLQ definida
- [x] Ownership por tenant em consulta de job
