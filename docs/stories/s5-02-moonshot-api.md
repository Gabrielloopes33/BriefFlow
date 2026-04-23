# S5-02 — Moonshot API como Provider LLM Principal

Status: Ready  
Owner: @dev  
Sprint: 05  
Prioridade: Crítica  
Pontos: 3

## Contexto

O sistema usa OpenAI GPT-4o-mini exclusivamente. O Moonshot (Kimi) oferece custo ~60-70% inferior com performance comparável para geração de conteúdo em português. A API do Moonshot é compatível com o SDK da OpenAI (mesma interface), tornando a migração de baixo risco.

O Anthropic SDK está importado no `package.json` mas sem uso — será mantido como opção futura mas não ativado nesta sprint.

## Escopo

**IN:**
- Provider abstraction que suporta Moonshot como default e OpenAI como fallback
- Atualização de todos os nós de agentes para usar o provider (não chamar OpenAI diretamente)
- Variáveis de ambiente para configuração do provider
- Logging do modelo usado em cada geração (para rastreabilidade no Langfuse)

**OUT:**
- UI para o usuário escolher o modelo
- Integração com Anthropic Claude (deixado para futuro)
- Fine-tuning de modelos

## Critérios de Aceite

- [ ] `MOONSHOT_API_KEY` + `MOONSHOT_BASE_URL` + `MOONSHOT_MODEL` configuráveis via `.env`
- [ ] Se `MOONSHOT_API_KEY` não definida, sistema usa `OPENAI_API_KEY` automaticamente (zero breaking change)
- [ ] Todos os nós de agentes (researcher, writer, reviewer) usando o provider, não o SDK diretamente
- [ ] Langfuse registra o nome do modelo real usado em cada span (ex: `moonshot-v1-8k`)
- [ ] `.env.example` atualizado com as novas variáveis documentadas
- [ ] Teste de geração completa com Moonshot API retornando conteúdo válido

## Tarefas

- [ ] Criar `server/services/llm-provider.ts` — factory que retorna cliente OpenAI-compatible baseado em env
- [ ] Atualizar `server/agents/nodes/researcher.ts` para usar `llm-provider`
- [ ] Atualizar `server/agents/nodes/writer.ts` para usar `llm-provider`
- [ ] Atualizar `server/agents/nodes/reviewer.ts` para usar `llm-provider`
- [ ] Atualizar `server/agents/langfuse-tracer.ts` para incluir `model_name` nos spans
- [ ] Atualizar `.env.example` com variáveis Moonshot documentadas
- [ ] Remover import do Anthropic SDK não utilizado (limpeza)
- [ ] Teste de integração: geração completa com ambos os providers

## Implementação do Provider (referência)

```typescript
// server/services/llm-provider.ts
import OpenAI from 'openai';

export function createLLMClient(): OpenAI {
  if (process.env.MOONSHOT_API_KEY) {
    return new OpenAI({
      apiKey: process.env.MOONSHOT_API_KEY,
      baseURL: process.env.MOONSHOT_BASE_URL ?? 'https://api.moonshot.cn/v1',
    });
  }
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

export function getDefaultModel(): string {
  if (process.env.MOONSHOT_API_KEY) {
    return process.env.MOONSHOT_MODEL ?? 'moonshot-v1-8k';
  }
  return process.env.OPENAI_MODEL ?? 'gpt-4o-mini';
}
```

## Variáveis de Ambiente (adicionar ao .env.example)

```
# LLM Provider — Moonshot (Kimi) [recomendado] ou OpenAI [fallback]
MOONSHOT_API_KEY=sk-...            # Se definido, usa Moonshot como provider
MOONSHOT_BASE_URL=https://api.moonshot.cn/v1
MOONSHOT_MODEL=moonshot-v1-8k     # moonshot-v1-8k ou moonshot-v1-32k

# OpenAI [mantido como fallback]
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
```

## Arquivos a Criar/Modificar

- CRIAR: `server/services/llm-provider.ts`
- MODIFICAR: `server/agents/nodes/researcher.ts`
- MODIFICAR: `server/agents/nodes/writer.ts`
- MODIFICAR: `server/agents/nodes/reviewer.ts`
- MODIFICAR: `server/agents/langfuse-tracer.ts`
- MODIFICAR: `.env.example`

## Definition of Done

- [ ] Critérios de aceite atendidos
- [ ] Sem issues CRITICAL no CodeRabbit
- [ ] Zero breaking change: sistema funciona com apenas `OPENAI_API_KEY` definida
- [ ] Evidências: trace no Langfuse mostrando `model: moonshot-v1-8k`
