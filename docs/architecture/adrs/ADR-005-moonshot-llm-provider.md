# ADR-005 - Moonshot (Kimi) como Provider LLM Principal

Status: Proposed
Data: 2026-04-22
Owner: @architect

## Contexto

O sistema usa OpenAI GPT-4o-mini como provider LLM exclusivo. Com o crescimento do volume de requisições e a necessidade de reduzir custos operacionais, avaliamos alternativas compatíveis com o ecossistema existente. O Moonshot (Kimi) oferece custo ~60-70% inferior ao GPT-4o-mini para tokens equivalentes, com performance comparável em tarefas de geração de conteúdo em português. Sua API é compatível com o SDK da OpenAI, minimizando o risco de migração.

## Decisao

1. **Provider Principal:** Adotar Moonshot Kimi API como provider padrão para todos os agentes.
   - Configurável via variáveis de ambiente (`MOONSHOT_API_KEY`, `MOONSHOT_BASE_URL`, `MOONSHOT_MODEL`).
   - Cliente OpenAI-compatible instanciado com endpoint e credenciais do Moonshot.
2. **Fallback:** Manter OpenAI como fallback automático.
   - Se `MOONSHOT_API_KEY` não estiver definida, o sistema usa `OPENAI_API_KEY` (comportamento atual).
   - Zero breaking change para deploys existentes.
3. **Abstração:** Criar camada `server/services/llm-provider.ts` para centralizar a criação do cliente e seleção do modelo.
   - Nós de agentes não devem instanciar o SDK diretamente.
   - Langfuse deve registrar o nome do modelo real usado em cada span.

## Justificativa

1. Redução de custo ~60-70% em escala sem perda de qualidade perceptível.
2. API compatível com OpenAI SDK — troca de endpoint + modelo, sem refatoração de lógica.
3. Performance superior em geração de conteúdo em português (idioma principal do produto).
4. Fallback para OpenAI protege contra indisponibilidade do provider principal.

## Trade-offs

1. Dependência de provider chinês — requer avaliação contínua de disponibilidade e conformidade.
2. Menor ecossistema de tooling e comunidade comparado à OpenAI.
3. Documentação e suporte primariamente em chinês/inglês.

## Consequencias

1. Todas as chamadas de LLM passam por `server/services/llm-provider.ts`.
2. Nós de agentes (researcher, writer, reviewer, e futuros) usam a factory, não o SDK diretamente.
3. Langfuse traces passam a incluir `model_name` real (ex: `moonshot-v1-8k`).
4. Variáveis de ambiente `.env.example` devem documentar as novas configurações.
5. O Anthropic SDK (@anthropic-ai/sdk) permanece no package.json como opção futura, mas não é ativado nesta sprint.

## Riscos e mitigacoes

1. **Risco:** Moonshot API indisponível em produção.
   - **Mitigação:** Fallback automático para OpenAI configurado no provider. Teste de fallback em CI.
2. **Risco:** Qualidade de output inferior para certos tipos de prompt.
   - **Mitigação:** Benchmark contínuo via Langfuse (comparação de score/latência/custo entre providers).
3. **Risco:** Custo de LLM cresce com 5+ chamadas por job.
   - **Mitigação:** Cache de resultados para inputs idênticos; Kimi reduz custo base.

## Checklist de seguranca

- [ ] Credenciais em segredo de ambiente (nunca em código)
- [ ] Timeout configurado nas chamadas ao provider
- [ ] Rate limiting por tenant no consumo de tokens
- [ ] Dados sensíveis do cliente não enviados em logs de LLM
