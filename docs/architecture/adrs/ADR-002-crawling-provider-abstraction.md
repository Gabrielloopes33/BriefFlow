# ADR-002 - Provider Abstraction para Crawling

Status: Accepted
Data: 2026-04-17
Owner: @architect

## Contexto
O produto precisa iniciar rapido com crawling externo (Apify), mantendo caminho limpo para migracao para API propria de busca/crawl.

## Decisao
Adotar camada de abstracao de provider de crawling:
1. Interface unica de provider no backend.
2. Implementacao inicial: ApifyProvider.
3. Implementacao futura: InternalCrawlerProvider.
4. Selecao de provider por configuracao/feature flag.

## Justificativa
1. Reduz lock-in direto na rota de API.
2. Permite migracao gradual sem quebrar contratos publicos.
3. Facilita teste A/B de custo, qualidade e latencia por provider.

## Trade-offs
1. Camada extra de abstracao aumenta complexidade inicial.
2. Requer normalizacao consistente entre provedores.

## Consequencias
1. Contratos internos de CrawlRequest e CrawlResult passam a ser padrao.
2. Rotas publicas nao dependem de campos especificos do Apify.
3. Estrategia de fallback entre providers fica viavel.

## Riscos e mitigacoes
1. Risco: diferenca de payload/qualidade entre providers.
   - Mitigacao: normalizacao e quality score unificado.
2. Risco: indisponibilidade externa do provider.
   - Mitigacao: retries, timeout, circuito e DLQ.

## Checklist de seguranca
- [x] Credenciais em segredo de ambiente
- [x] Timeout e limites de payload definidos
- [x] Politica de origem de fonte documentada
