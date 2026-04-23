# S7-03 — Pack de Templates Globais (6 templates iniciais)

Status: Ready  
Owner: @dev + @ux-design-expert  
Sprint: 07  
Prioridade: Alta  
Pontos: 8  
Depende de: S7-01 (schema), S7-02 (editor funcionando para validar templates)

## Contexto

Os templates são o ponto de entrada do editor visual. O usuário escolhe um template e o conteúdo gerado pelos agentes é automaticamente preenchido nas camadas correspondentes. Sem templates de qualidade, o editor não tem utilidade prática.

Esta story cria os 6 templates iniciais do produto, com estrutura JSON validada pelo editor Konva (S7-02) e thumbnails gerados para seleção visual.

## Escopo

**IN:**
- 6 templates globais (is_global = true) populados no banco
- Thumbnails de cada template (imagem estática PNG 400x400 para preview)
- Tela de seleção de template antes do editor
- Mapeamento de placeholders: quais campos do post preenchem quais camadas

**OUT:**
- Editor de templates pelo usuário final (escopo futuro)
- Templates de vídeo/Reels
- Templates pagos/premium

## Os 6 Templates

### 1. Carrossel Educativo (Instagram, 5 slides)
- Slide 1: Capa com headline impactante + subtítulo
- Slides 2-4: Conteúdo com título do ponto + texto explicativo
- Slide 5: CTA com call-to-action + handle do Instagram

### 2. Carrossel de Case (Instagram, 4 slides)
- Slide 1: Capa com o desafio/problema
- Slide 2: A solução aplicada
- Slide 3: Resultado com número/dado
- Slide 4: CTA + próximos passos

### 3. Post Único de Impacto (Instagram/LinkedIn, 1 slide)
- Frase central de impacto (grande, bold)
- Subtítulo explicativo
- Handle/logo no rodapé

### 4. Carrossel Lista (Instagram, 6 slides)
- Slide 1: Capa com "X dicas para [tema]"
- Slides 2-6: Número + título + descrição curta da dica

### 5. Antes e Depois (Instagram, 3 slides)
- Slide 1: A situação anterior (problema)
- Slide 2: A transformação / o processo
- Slide 3: O resultado + CTA

### 6. Quote / Citação (Instagram/LinkedIn, 1 slide)
- Citação em destaque (fonte grande, itálico)
- Atribuição (quem disse)
- Fundo colorido ou gradiente

## Critérios de Aceite

- [ ] 6 templates com `is_global = true` populados via seed/migration
- [ ] Cada template tem `structure` JSONB válida e renderizável pelo editor Konva
- [ ] Cada template tem `thumbnail_url` apontando para imagem estática
- [ ] Tela de seleção de template exibe cards com thumbnail + nome + tipo + quantidade de slides
- [ ] Ao selecionar template, editor abre com as camadas correspondentes
- [ ] Mapeamento de placeholders documentado: qual placeholder mapeia para qual campo do Post

## Mapeamento de Placeholders

```typescript
// client/src/lib/template-placeholder-map.ts
const placeholders = {
  '{{headline}}': (post: Post) => post.title,
  '{{body}}': (post: Post) => post.content,
  '{{cta}}': () => 'Salve para ler depois 💾',
  '{{slide_title_N}}': (slides: SlideContent[], n: number) => slides[n]?.title,
  '{{slide_body_N}}': (slides: SlideContent[], n: number) => slides[n]?.body,
  '{{client_handle}}': (client: Client) => `@${client.name.toLowerCase().replace(' ', '')}`,
};
```

## Tarefas

- [ ] Design dos 6 templates em estrutura JSON (`structure` JSONB)
- [ ] Criar `supabase/seed/creative_templates_full_seed.sql` com os 6 templates
- [ ] Gerar thumbnails estáticos (PNG 400x400) para cada template e hospedar no Storage
- [ ] Criar `client/src/pages/TemplateSelectorPage.tsx` — tela de seleção
- [ ] Criar `client/src/components/creative-editor/TemplateCard.tsx` — card de template
- [ ] Criar `client/src/lib/template-placeholder-map.ts` — mapeamento de placeholders
- [ ] Criar endpoint `GET /api/creative-templates` em `server/routes.ts`
- [ ] Criar hook `use-creative-templates.ts`
- [ ] Registrar rota `/creatives/new` em `client/src/App.tsx`

## Arquivos a Criar/Modificar

- CRIAR: `supabase/seed/creative_templates_full_seed.sql`
- CRIAR: `client/src/pages/TemplateSelectorPage.tsx`
- CRIAR: `client/src/components/creative-editor/TemplateCard.tsx`
- CRIAR: `client/src/lib/template-placeholder-map.ts`
- CRIAR: `client/src/hooks/use-creative-templates.ts`
- MODIFICAR: `server/routes.ts` — endpoint de templates
- MODIFICAR: `client/src/App.tsx` — rota `/creatives/new`

## Definition of Done

- [ ] Critérios de aceite atendidos
- [ ] Sem issues CRITICAL no CodeRabbit
- [ ] Teste: cada um dos 6 templates renderiza no editor sem erro
- [ ] Evidências: screenshot da tela de seleção com 6 templates
