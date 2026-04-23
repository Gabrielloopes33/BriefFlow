# S8-02 — Wizard de Onboarding de Clientes (4 Etapas)

Status: Ready  
Owner: @dev + @ux-design-expert  
Sprint: 08  
Prioridade: Crítica  
Pontos: 8

## Contexto

Criar um cliente no sistema atual é um formulário plano e técnico. O usuário não sabe o que cada campo significa, nem qual é a ordem de prioridade das informações. Isso resulta em clientes incompletos que geram conteúdo genérico.

O wizard de onboarding guia o usuário em 4 etapas claras, com exemplos práticos e linguagem acessível. Um cliente completo habilita todos os agentes a gerarem conteúdo personalizado.

## Escopo

**IN:**
- Wizard de 4 etapas com barra de progresso
- Etapa 1: Identidade do cliente
- Etapa 2: Voz e tom de comunicação
- Etapa 3: Fontes de referência (simplificadas)
- Etapa 4: Posts de referência (alimenta métricas)
- Validação inline em cada etapa (não bloquear avanço por campos opcionais)
- Salvar rascunho a cada etapa (não perder dados se o usuário fechar)
- Indicador de "completude" do perfil do cliente (0-100%)

**OUT:**
- Upload de logo do cliente (escopo futuro)
- Importação automática de perfil do Instagram (requer API — futuro)
- Onboarding de múltiplos clientes em bulk

## Critérios de Aceite

- [ ] Wizard com 4 etapas e barra de progresso visual
- [ ] Etapa 1 obrigatória (nome + nicho); demais são opcionais mas encorajadas
- [ ] Ao completar etapa 1, cliente já é criado no banco (salvo incrementalmente)
- [ ] Cada etapa tem exemplo prático em placeholder ou tooltip
- [ ] Indicador de completude visível no card do cliente na lista e no perfil
- [ ] Ao terminar o wizard, usuário é redirecionado ao Studio com o cliente selecionado
- [ ] Wizard é acessível ao editar um cliente existente (não apenas no cadastro)

## Detalhamento das 4 Etapas

### Etapa 1 — Identidade
Campos:
- Nome do cliente (obrigatório)
- Segmento/Nicho (select + opção "outro") — ex: "Consultoria de negócios", "Saúde e bem-estar"
- Site ou perfil principal (URL opcional)
- Descrição breve (textarea, max 200 chars)

### Etapa 2 — Voz e Tom
Campos:
- Tom de voz (radio buttons): Formal | Casual | Inspirador | Educativo | Bem-humorado
- Pilares de conteúdo (tags, máx 5): ex: "Produtividade", "Liderança", "Marketing Digital"
- Público-alvo (textarea breve): ex: "Empreendedores de 30-45 anos que querem escalar"
- Palavras que NÃO deve usar (tags, opcional): ex: "barato", "perfeito", "incrível"

### Etapa 3 — Fontes de Referência
Campos:
- Campo de URL com botão "Adicionar" (cria registro em `sources`)
- Tipo inferido automaticamente por URL (blog, youtube, instagram, linkedin)
- Lista das fontes adicionadas com botão de remoção
- Sugestão: "Cole links de blogs, perfis do Instagram, canais do YouTube..."

### Etapa 4 — Exemplos de Sucesso
Campos:
- URLs de posts que performaram bem (cria registros para alimentar analytics mock)
- Campo de engajamento: "Quantas curtidas/comentários em média?" (número)
- Seleção de formato preferido: Carrossel | Reels | Foto única | Texto

## Indicador de Completude

```typescript
function calculateClientCompleteness(client: Client): number {
  const weights = {
    name: 20,           // obrigatório
    niche: 10,
    description: 10,
    toneOfVoice: 10,
    contentPillars: 15,
    targetAudience: 10,
    sources: 15,        // pelo menos 1 fonte
    examplePosts: 10,
  };
  // soma dos pesos preenchidos / 100
}
```

## Arquivos a Criar/Modificar

- CRIAR: `client/src/components/client-wizard/ClientWizard.tsx` (container)
- CRIAR: `client/src/components/client-wizard/steps/Step1Identity.tsx`
- CRIAR: `client/src/components/client-wizard/steps/Step2Voice.tsx`
- CRIAR: `client/src/components/client-wizard/steps/Step3Sources.tsx`
- CRIAR: `client/src/components/client-wizard/steps/Step4Examples.tsx`
- CRIAR: `client/src/lib/client-completeness.ts`
- MODIFICAR: `client/src/pages/ClientsPage.tsx` — botão "Novo cliente" abre wizard
- MODIFICAR: `client/src/pages/ClientDetails.tsx` — indicador de completude + editar via wizard
- MODIFICAR: `server/routes.ts` — campo `tone_of_voice`, `content_pillars`, `forbidden_words` em clients (ou via knowledge_items)

## Definition of Done

- [ ] Critérios de aceite atendidos
- [ ] Sem issues CRITICAL no CodeRabbit
- [ ] Teste: cliente criado em 4 etapas com dados completos gera conteúdo mais específico
- [ ] Indicador de completude exibido no card do cliente
- [ ] Mobile responsivo
- [ ] Evidências: vídeo do wizard completo criando um cliente do zero
