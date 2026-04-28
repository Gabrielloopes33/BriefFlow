# SDD — Creative Editor: Redesign Visual & UX do Studio de Carrosséis

| Campo | Valor |
|-------|-------|
| Tech Lead | Gabriel (BriefFlow) |
| Product Manager | Morgan (AIOX PM Agent) |
| Agentes Consultados | @pm (Morgan), @ux-design-expert (Uma), @architect (Aria) |
| Epic Relacionado | Studio — Geração e Edição de Criativos |
| Status | Concluído |
| Criado | 2026-04-28 |
| Última Atualização | 2026-04-28 |
| Branch | `wip/modelo-util-atual` |

---

## Contexto

O BriefFlow Content-Generator possui um módulo Studio que permite a criação de carrosséis para redes sociais (Instagram, LinkedIn). O editor visual é baseado em **Konva.js** (HTML5 Canvas) e oferece um pipeline completo: seleção de template → preenchimento com conteúdo de IA → edição manual → exportação PNG.

O produto foi construído com foco em funcionalidade mínima viável. Agora que o pipeline está operacional, é necessário elevar a qualidade visual e a usabilidade da UX para que o resultado gerado atinja o padrão editorial esperado — equivalente aos carrosséis do perfil **@brandsdecoded__** e plataformas como **MyPostFlow**.

O módulo Creatives é o principal diferencial de valor do BriefFlow: transforma briefings gerados por IA em criativos prontos para publicação. Se o resultado visual for fraco, o produto perde credibilidade independente da qualidade do conteúdo gerado.

---

## Definição do Problema

### Problemas Identificados

#### P1 — Formato quadrado que limita a estética editorial
- **Impacto:** O canvas está fixado em `1080×1080px` (1:1). As referências editoriais usam formato portrait `1080×1350px` (4:5), o padrão do Instagram Carousel. O formato quadrado comprime o texto e reduz o espaço para a fotografia, produzindo resultado visualmente inferior.
- **Causa raiz:** `CANVAS_WIDTH = 1080; CANVAS_HEIGHT = 1080` hardcoded em `CreativeEditor.tsx` sem suporte a múltiplos aspect ratios.

#### P2 — Fontes selecionadas não são aplicadas no canvas
- **Impacto:** O usuário seleciona "Space Grotesk", "Syne" ou "Playfair Display", mas o canvas renderiza com fonte padrão do sistema (geralmente Arial/sans-serif). A tipografia é um dos maiores contribuintes para o estilo editorial.
- **Causa raiz:** Konva.js não carrega fontes web automaticamente. A fonte precisa ser registrada via `FontFace API` e aguardada com `.load()` antes da renderização. Atualmente não existe nenhum mecanismo de preload de fontes.

#### P3 — Botão CTA "Salve este post" aparece em todos os slides
- **Impacto:** O CTA é um elemento de conversão que deveria aparecer apenas no último slide (ou slide de encerramento). Aparecer em todos os slides polui o design e dilui a hierarquia visual.
- **Causa raiz dupla:**
  1. `TemplateSelectorPage.tsx:36` — placeholder `{{cta}}` é sempre resolvido para `"Salve este post para consultar depois."` (hardcoded, nunca vazio).
  2. Templates no banco de dados podem ter `ctaButton.visible: true` em todos os slides ao invés de apenas no último.

#### P4 — Seletor de fontes sem preview visual
- **Impacto:** O usuário seleciona fontes por nome sem ver como elas ficam. Isso leva a escolhas erradas e iterações desnecessárias no editor.
- **Causa raiz:** `TextEditPanel.tsx` renderiza fontes como `<option>` em um `<select>` HTML nativo, sem aplicar a própria fonte como `font-family` no elemento.

#### P5 — Seleção de template sem contexto visual suficiente
- **Impacto:** O usuário não sabe qual template vai gerar qual resultado. Não há filtragem por tipo (carrossel, post único, story), plataforma ou formato (1:1, 4:5, 9:16). A grade de templates é genérica.
- **Causa raiz:** `TemplateSelectorPage.tsx` exibe apenas thumbnail + nome + badge de tipo, sem filtros, sem preview expandido, sem indicação de aspect ratio ou contagem de slides de forma proeminente.

#### P6 — Seleção de número de slides não intuitiva
- **Impacto:** O usuário não controla quantos slides serão gerados antes de escolher o template. A informação de `slidesCount` existe no template, mas não há interface para o usuário definir um número desejado antes da geração.
- **Causa raiz:** O número de slides é determinado pelo template selecionado, não pelo usuário. Não existe um step de configuração entre a escolha de template e a criação do creative.

#### P7 — Estética geral abaixo do padrão de referência
- **Impacto:** Mesmo com o conteúdo correto, o resultado visual parece amador. Os gradientes são planos, as cores não têm contraste suficiente, a hierarquia tipográfica é fraca, e os overlays são genéricos.
- **Causa raiz:** Falta de um sistema de design consistente para os templates. Os defaults de tipografia (`fontSize: 56`, `fontFamily: 'Space'`) e overlay (`style: 'none'`) não produzem resultado editorial. Os templates no banco precisam ter valores pré-configurados que refletem o estilo visual desejado.

### Por que Resolver Agora?

- O produto está em fase de demonstração para primeiros clientes. A qualidade visual do output é o principal critério de avaliação.
- A infraestrutura de IA para geração de imagens (fal.ai) ainda não está ativa, portanto este é o momento ideal para refinar o editor antes de ativar os créditos de imagem.
- Os problemas P1 e P2 são bloqueadores para qualquer teste de qualidade: formato e tipografia errados invalidam a avaliação estética.

### Impacto de Não Resolver

- **Produto:** Clientes rejeitam o gerador de criativos por baixa qualidade visual, mesmo com conteúdo excelente.
- **Técnico:** Débito crescente — cada template adicionado reforça os problemas de CTA e formato.
- **Usuário:** Frustração com iterações longas no editor tentando corrigir problemas que deveriam ser resolvidos na geração.

---

## Escopo

### Incluído (V1 — Este SDD)

- **[E1]** ✅ Suporte a múltiplos aspect ratios: 1:1 (1080×1080), 4:5 (1080×1350), 9:16 (1080×1920)
- **[E2]** ✅ Sistema de preload de fontes web para o canvas Konva
- **[E3]** ✅ CTA inteligente: visível apenas no último slide por padrão, com controle por slide
- **[E4]** ✅ Seletor de fontes com preview visual (a fonte aplicada a si mesma)
- **[E5]** ✅ Filtros na página de templates: por tipo, plataforma e formato
- **[E6]** ✅ Step de configuração entre template e criação: número de slides e formato
- **[E7]** ✅ Redesign dos defaults de templates: estilo editorial dark com tipografia forte
- **[E8]** ✅ Ajuste de posicionamentos de texto para formato 4:5 (coordenadas relativas ao canvas)

### Fora do Escopo (V1)

- Geração de imagens via fal.ai (aguardando ativação de créditos)
- Editor de gradiente customizado com ângulo livre
- Undo/Redo no editor
- Multi-fonte por slide (diferentes fontes para título e subtítulo independentes)
- Animações ou transições entre slides
- Templates dinâmicos com lógica condicional
- Suporte a formato LinkedIn (1200×628)

### Considerações Futuras (V2+)

- Geração automática de imagem editorial via fal.ai integrada ao fluxo
- Biblioteca de paletas de cores por nicho/persona
- Preset de "estilos editoriais" (Dark Cinematic, Minimalista, Colorido) aplicáveis com um clique
- Exportação para formato Figma/Canva

---

## Solução Técnica

### Visão Geral da Arquitetura

O Creative Editor mantém sua arquitetura atual baseada em Konva.js, com as seguintes adições e modificações:

```
TemplateSelectorPage
  ├── [NOVO] FilterBar (tipo, plataforma, formato)
  ├── TemplateCard (thumbnail, aspect ratio badge, slides count)
  └── [NOVO] ConfigStep (modal: número de slides, aspect ratio)
              ↓
        CreativeEditorPage
              ↓
          CreativeEditor
            ├── [MODIFICADO] SlideCanvas (aspect ratio dinâmico)
            ├── SlideThumbnailPanel (thumbnails em aspect ratio correto)
            ├── TextEditPanel
            │   ├── [NOVO] FontPreviewSelector
            │   └── [MODIFICADO] CTA control (por slide vs global)
            └── [NOVO] FontLoader (preload de web fonts)
```

### E1 — Suporte a Múltiplos Aspect Ratios

**Decisão:** O canvas deve ser parametrizado com `canvasWidth` e `canvasHeight` derivados do `creative.format` ao invés de constantes hardcoded.

**Formatos suportados:**

| Format ID | Dimensões | Aspect Ratio | Uso |
|-----------|-----------|--------------|-----|
| `square` | 1080×1080 | 1:1 | Instagram post padrão |
| `portrait` | 1080×1350 | 4:5 | Instagram Carousel (padrão editorial) |
| `story` | 1080×1920 | 9:16 | Instagram Stories / Reels cover |

**Contrato de dados — Creative:**
```json
{
  "id": "...",
  "format": "portrait",
  "canvasWidth": 1080,
  "canvasHeight": 1350,
  "slides": [...]
}
```

**Impacto em componentes:**

- `CreativeEditor.tsx`: remover constantes `CANVAS_WIDTH/HEIGHT`, ler de `creative.format` via função `getCanvasDimensions(format)`
- `SlideCanvas.tsx`: receber `canvasWidth` e `canvasHeight` como props (já existe, apenas remover o hardcode no consumidor)
- `SlideThumbnailPanel.tsx`: calcular `THUMB_SCALE` baseado nas dimensões reais
- `CreativeTemplate.structure`: adicionar campo `format: 'square' | 'portrait' | 'story'`

**Posicionamentos de texto — coordenadas relativas:**

As posições em `getPositionPlacement()` são absolutas para 1080×1080. Para múltiplos formatos, devem ser convertidas para proporções relativas:

```
// Posição 'bot-left' em 1080×1080: { y: 520 } = 48% do canvas
// Posição 'bot-left' em 1080×1350: { y: 650 } = 48% do canvas (520/1080 * 1350)
```

A função `getPositionPlacement()` deve receber `canvasHeight` e calcular Y como `(relativeY * canvasHeight)`.

**Schema — migration necessária:**
- Adicionar coluna `format varchar(20) default 'square'` na tabela `creative_templates`
- Adicionar coluna `format varchar(20) default 'square'` na tabela `creatives`
- Adicionar `canvas_width int` e `canvas_height int` como campos calculados ou colunas

---

### E2 — Preload de Fontes Web para Konva

**Problema técnico:** Konva renderiza texto via `canvas 2D API`. O browser só usa fontes web no canvas se elas já foram carregadas (status `loaded` no `FontFaceSet`). Se a fonte não estiver carregada no momento da chamada `ctx.font = "60px 'Space Grotesk'"`, o canvas usa o fallback (Arial/sans-serif).

**Solução:** Componente `FontLoader` que registra e carrega todas as fontes definidas em `FONT_OPTIONS` antes da renderização do canvas.

**Fontes a carregar (via Google Fonts CDN ou arquivo local):**

| Nome Display | CSS Font Family | Peso(s) |
|---|---|---|
| Inter | Inter | 400, 700 |
| Space | Space Grotesk | 400, 700 |
| Syne | Syne | 400, 700 |
| Outfit | Outfit | 400, 700 |
| DM Sans | DM Sans | 400, 700 |
| Raleway | Raleway | 400, 700 |
| Oswald | Oswald | 400, 700 |
| Playfair | Playfair Display | 400, 700 |
| Caveat | Caveat | 400, 700 |

**Fluxo:**
1. `FontLoader` monta antes do `SlideCanvas`
2. Cria elemento `<link>` para Google Fonts com todas as famílias
3. Chama `document.fonts.load('700 1em "Space Grotesk"')` para cada fonte
4. Aguarda `document.fonts.ready`
5. Emite `onFontsLoaded` → `SlideCanvas` renderiza

**Estado no `CreativeEditor`:**
```
fontsReady: boolean (false → true após carregamento)
```

O `SlideCanvas` só renderiza quando `fontsReady === true`. Enquanto isso, exibe skeleton/loading.

**Impacto:** Elimina totalmente o problema de fontes incorretas. Custo: ~200-400ms de delay inicial por sessão, mas as fontes ficam em cache do browser.

---

### E3 — CTA Inteligente: Visível Apenas no Último Slide

**Regra de negócio:** O botão CTA é um elemento de conversão ("Salve este post", "Siga para mais", "Acesse o link"). Ele deve aparecer por padrão apenas no último slide do carrossel.

**Mudanças em `TemplateSelectorPage.tsx`:**

1. O placeholder `{{cta}}` deve ser resolvido para string vazia quando não é o último slide:
```
resolveTemplatePlaceholders(text, post, { isLastSlide: boolean })
```
2. O `ctaButton.visible` deve ser `true` apenas no último slide ao criar o creative a partir do template.

**Mudanças em `CreativeEditor.tsx`:**

- `applySlideSettingsToSlide()` deve ter opção `applyToAllSlides: boolean`
- Painel de CTA deve mostrar: "Aplicar a este slide" vs "Aplicar a todos os slides"
- Ao ativar CTA, default é `visible: false` para todos os slides exceto o último

**Mudanças em `TextEditPanel.tsx`:**

- Seção "Botão CTA" deve incluir indicador: "Slide atual" vs badge "Último slide recomendado"
- Checkbox adicional: "Exibir em todos os slides" (copia para todos quando marcado)

**Texto padrão do CTA:**

O texto hardcoded `'Salve este post para consultar depois.'` deve ser movido para configuração por template no banco de dados, com fallback para `'Saiba mais'`.

---

### E4 — Seletor de Fontes com Preview Visual

**Mudança em `TextEditPanel.tsx`:**

O `<select>` nativo deve ser substituído por um componente `FontPreviewSelector` que renderiza cada opção com a própria fonte aplicada como `font-family` CSS.

**Layout do seletor:**

```
┌─────────────────────────────────┐
│ Fonte do título                 │
│ ┌─────────────────────────────┐ │
│ │ ▼ Space Grotesk             │ │
│ └─────────────────────────────┘ │
│   ┌───────────────────────────┐ │
│   │ Inter          Sample Aa  │ │  ← font-family: Inter
│   │ Space Grotesk  Sample Aa  │ │  ← font-family: Space Grotesk (selected)
│   │ Syne           Sample Aa  │ │  ← font-family: Syne
│   │ Outfit         Sample Aa  │ │  ← font-family: Outfit
│   │ DM Sans        Sample Aa  │ │
│   │ Raleway        Sample Aa  │ │
│   │ Oswald         SAMPLE AA  │ │  ← uppercase display
│   │ Playfair       Sample Aa  │ │  ← serif display
│   │ Caveat         Sample Aa  │ │  ← handwritten
│   └───────────────────────────┘ │
└─────────────────────────────────┘
```

**Requisito:** As fontes só aparecem visualmente corretas após o `FontLoader` completar (E2). O seletor deve aguardar `fontsReady`.

---

### E5 — Filtros na Página de Templates

**Mudanças em `TemplateSelectorPage.tsx`:**

Adicionar `FilterBar` com:

| Filtro | Opções |
|--------|--------|
| Tipo | Todos / Carrossel / Post Único / Story |
| Formato | Todos / Quadrado (1:1) / Portrait (4:5) / Story (9:16) |
| Plataforma | Todos / Instagram / LinkedIn |

**Filtros aplicados client-side** (sem nova chamada à API) via `useMemo` sobre `templates`.

**Melhoria nos TemplateCards:**

- Badge de aspect ratio visível: `4:5`, `1:1`, `9:16`
- Badge de contagem de slides proeminente: `6 slides` (maior, mais visível)
- Thumbnail com aspect ratio correto (não sempre quadrado — usar `aspect-[4/5]` para portrait)
- Preview expandido ao hover: mostrar o primeiro slide em tamanho maior

---

### E6 — Step de Configuração antes da Criação

**Novo fluxo entre template selecionado e criação do creative:**

```
[Escolher Template] → [Modal de Configuração] → [Criar Creative]
```

**Modal de Configuração (ConfigStep):**

```
┌──────────────────────────────────────────┐
│  Configurar Carrossel                    │
│                                          │
│  Formato                                 │
│  ○ Quadrado (1:1) — 1080×1080            │
│  ● Portrait (4:5) — 1080×1350 ← default  │
│  ○ Story (9:16) — 1080×1920              │
│                                          │
│  Número de Slides                        │
│  ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐    │
│  │ 3│ │ 4│ │ 5│ │●6│ │ 7│ │ 8│ │10│    │  ← chips selecionáveis
│  └──┘ └──┘ └──┘ └──┘ └──┘ └──┘ └──┘    │
│  Template tem 6 slides por padrão       │
│                                          │
│  [Cancelar]              [Criar →]       │
└──────────────────────────────────────────┘
```

**Lógica de número de slides:**
- Se usuário escolher menos slides que o template: truncar slides
- Se usuário escolher mais slides: duplicar o último slide como template de conteúdo
- Slides adicionais são preenchidos com placeholders para geração de IA

---

### E7 — Redesign dos Defaults de Templates

**Problema:** Os valores padrão atuais não produzem resultado editorial. Os templates no banco de dados precisam ser atualizados com configurações que refletem o estilo de referência.

**Princípios do estilo editorial de referência:**

1. **Tipografia forte:** Títulos grandes (`fontSize: 72-96px`), negrito, com palavras em destaque coloridas
2. **Fotografia full-bleed:** Imagem ocupa todo o slide, texto sobreposto
3. **Overlay contrastante:** Gradiente escuro no bottom (estilo `diag-inf-dir`) com opacidade `0.7`
4. **CTA mínimo:** Apenas no último slide, estilo `outline` ou sem CTA em slides intermediários
5. **Hierarquia clara:** Título grande + subtítulo pequeno em fonte diferente

**Defaults recomendados para templates de carrossel editorial:**

```json
{
  "theme": "dark",
  "typography": {
    "globalScale": 100,
    "titleFontSize": 80,
    "titleFontFamily": "Syne",
    "subtitleFontSize": 24,
    "accentColor": "#FF4C1F",
    "accentWords": []
  },
  "overlay": {
    "style": "diag-inf-dir",
    "color": "#000000",
    "opacity": 65
  },
  "textLayout": {
    "position": "bot-left",
    "alignment": "left"
  },
  "ctaButton": {
    "visible": false,
    "text": "Salve este post",
    "style": "filled",
    "size": 16,
    "borderRadius": 4,
    "backgroundColor": "#ffffff",
    "textColor": "#000000"
  }
}
```

**Script de migração de templates:** Os templates existentes no banco devem ser atualizados via script SQL/migration para aplicar os novos defaults.

---

### E8 — Coordenadas de Texto Relativas ao Canvas

**Mudança em `CreativeEditor.tsx` — função `getPositionPlacement()`:**

As coordenadas Y passam a ser calculadas como proporção do `canvasHeight`:

| Posição | Y relativo | Y em 1080 | Y em 1350 |
|---------|-----------|-----------|-----------|
| top-* | 11% | 120 | 148 |
| mid-* | 28% | 300 | 378 |
| bot-* | 50% | 540 | 675 |

A posição `bot-left` em formato 4:5 deve ficar em `y = 675`, deixando ~675px para o título e subtítulo antes do fim do canvas (versus os 520px atuais em 1:1), o que melhora o espaço de respiro.

---

### Fluxo de Dados Atualizado

```
[Studio Page]
  → seleciona cliente e post
  ↓
[Template Selector Page]
  → filtra templates (tipo, formato, plataforma)
  → seleciona template
  ↓
[Config Step Modal]
  → define: formato (portrait/square/story)
  → define: número de slides
  → POST /api/creatives { format, slidesCount, template_id, ... }
  ↓
[Creative Editor Page]
  → carrega creative com format e slides
  ↓
[Font Loader]
  → aguarda fontsReady
  ↓
[Creative Editor]
  → SlideCanvas com canvasWidth/canvasHeight do creative.format
  → TextEditPanel com FontPreviewSelector
  → CTA visível apenas no último slide
```

### APIs e Endpoints

| Endpoint | Método | Mudança |
|----------|--------|---------|
| `POST /api/creatives` | POST | Aceita `format: string` e `slidesCount: number` |
| `GET /api/creative-templates` | GET | Retorna `format` por template |
| `GET /api/creatives/:id` | GET | Retorna `format`, `canvasWidth`, `canvasHeight` |

**Schema de criação atualizado:**

```json
// POST /api/creatives
{
  "client_id": "...",
  "post_id": "...",
  "template_id": "...",
  "type": "carousel",
  "platform": "instagram",
  "format": "portrait",
  "slides_count": 6
}
```

### Mudanças no Banco de Dados

**Tabela `creative_templates`:**
- Adicionar coluna `format varchar(20) NOT NULL DEFAULT 'square'`

**Tabela `creatives`:**
- Adicionar coluna `format varchar(20) NOT NULL DEFAULT 'square'`
- Adicionar coluna `canvas_width int NOT NULL DEFAULT 1080`
- Adicionar coluna `canvas_height int NOT NULL DEFAULT 1080`

**Migration:** Atualizar templates existentes com `format = 'portrait'` e `canvas_height = 1350` onde aplicável.

---

## Riscos

| Risco | Impacto | Probabilidade | Mitigação |
|-------|---------|---------------|-----------|
| Fontes não carregam via Google Fonts (CORS/timeout) | Alto — canvas renderiza sem tipografia correta | Médio | Fallback para fontes locais bundled; timeout de 3s com fallback |
| Mudança de coordenadas quebra templates existentes | Alto — layout dos slides existentes errado | Médio | Migration script testa e corrige coordenadas relativas; flag `legacy_coords` nos templates antigos |
| Usuários com creatives salvos no formato 1:1 | Médio — não afeta novos, apenas histórico | Baixo | Creatives existentes mantêm `format: 'square'`; sem migração forçada |
| Config Step adiciona fricção no fluxo de criação | Médio — conversão de template → creative diminui | Médio | Modal pré-seleciona defaults inteligentes; pode ser pulado com "Usar padrão" |
| Templates existentes no banco com CTA em todos os slides | Alto — resultado continua incorreto após código corrigido | Alto | Migration SQL atualiza `ctaButton.visible = false` em slides não-finais |
| Seleção de slides por chips pode confundir usuário | Baixo — UX clara | Baixo | Chips com valor numérico claro; badge "padrão do template" |

---

## Plano de Implementação

### Fase 1 — Correções Críticas de Renderização (Estimativa: 2-3 dias)

| Tarefa | Arquivo(s) | Descrição |
|--------|-----------|-----------|
| P2-Fix: FontLoader | `CreativeEditor.tsx` (novo componente `FontLoader`) | Preload de todas as fontes via FontFace API antes de renderizar SlideCanvas |
| P3-Fix: CTA por slide | `TemplateSelectorPage.tsx`, `CreativeEditor.tsx`, `TextEditPanel.tsx` | CTA visível apenas no último slide por padrão; controle por slide |
| P3-Fix: CTA na resolução de templates | `TemplateSelectorPage.tsx` | `resolveTemplatePlaceholders` recebe `isLastSlide` |

### Fase 2 — Suporte a Múltiplos Formatos (Estimativa: 3-4 dias)

| Tarefa | Arquivo(s) | Descrição |
|--------|-----------|-----------|
| E1: Constantes de canvas | `CreativeEditor.tsx` | Remover hardcode, ler de `creative.format` |
| E1: getPositionPlacement relativo | `CreativeEditor.tsx` | Coordenadas Y como proporção de `canvasHeight` |
| E1: Thumbnail aspect ratio | `SlideThumbnailPanel.tsx` | `THUMB_SCALE` baseado em dimensões reais |
| DB: Migration formato | `server/` (migration SQL) | Adicionar colunas `format`, `canvas_width`, `canvas_height` |
| API: POST /creatives | `server/routes.ts` | Aceitar `format` e `slides_count` |
| shared/schema.ts | `shared/schema.ts` | Atualizar tipos para incluir `format` |

### Fase 3 — UX de Seleção de Template (Estimativa: 2-3 dias)

| Tarefa | Arquivo(s) | Descrição |
|--------|-----------|-----------|
| E4: FontPreviewSelector | `TextEditPanel.tsx` (novo componente) | Dropdown com preview visual de cada fonte |
| E5: FilterBar | `TemplateSelectorPage.tsx` | Chips de filtro por tipo, formato, plataforma |
| E5: TemplateCard melhorado | `TemplateSelectorPage.tsx` | Aspect ratio correto no thumbnail, badges melhores |
| E6: ConfigStep Modal | Novo componente `TemplateConfigModal.tsx` | Modal de configuração entre template e criação |

### Fase 4 — Atualização de Templates no Banco (Estimativa: 1-2 dias)

| Tarefa | Responsável | Descrição |
|--------|------------|-----------|
| E7: Script de atualização de templates | Gabriel | SQL script para atualizar defaults dos templates existentes para estilo editorial |
| E7: Criar templates portrait editoriais | Gabriel | 2-3 templates novos com formato 4:5 e defaults de alta qualidade |
| E8: Migrar coordenadas existentes | Gabriel | Testar e corrigir layouts dos templates existentes no novo sistema de coordenadas |

**Estimativa Total:** 8-12 dias úteis
**Tempo Real:** 1 sessão (~4h)
**Status:** ✅ Todas as fases concluídas

---

## Estratégia de Testes

| Tipo | Escopo | Cenários Críticos |
|------|--------|-------------------|
| Visual (manual) | Renderização de fontes no canvas | Cada fonte selecionada deve aparecer corretamente no canvas exportado |
| Visual (manual) | Formatos de canvas | Exportar slide em 1:1, 4:5 e 9:16 e verificar proporções |
| Visual (manual) | CTA por slide | Criar carrossel de 6 slides e verificar CTA apenas no último |
| Visual (manual) | Templates editoriais | Criar creative com template novo e comparar com referências |
| Funcional | ConfigStep Modal | Seleção de formato e slides_count propagados corretamente ao creative |
| Funcional | FilterBar | Filtros reduzem lista corretamente sem chamada extra à API |
| Funcional | FontPreviewSelector | Seleção de fonte atualiza o slide imediatamente |
| Regressão | Creatives existentes | Creatives salvos em format=square continuam renderizando corretamente |

---

## Monitoramento e Observabilidade

| Métrica | Tipo | Threshold |
|---------|------|-----------|
| Tempo de carregamento de fontes | Latência | > 3s → fallback ativado |
| Erros de criação de creative | Taxa de erro | > 5% → alerta |
| Uso de formatos (square vs portrait vs story) | Business metric | — tracking via logs |
| Tempo de exportação PNG | Latência | > 10s → investigar |

**Logs adicionais:**
- `fonts.loaded: { families: string[], duration_ms: number }` — após FontLoader
- `creative.created: { format, slides_count, template_id }` — ao criar creative
- `fonts.fallback: { family: string, reason: string }` — quando fonte falha ao carregar

---

## Plano de Rollback

**Todos os problemas identificados são aditivos** (novas colunas, novos componentes). Não há breaking changes retroativos, portanto o rollback é seguro por natureza.

**Triggers de rollback:**

| Trigger | Ação |
|---------|------|
| Creatives existentes não renderizam | Verificar migration de `format`; campo deve ter `DEFAULT 'square'` |
| Fontes não carregam em produção | Remover `FontLoader`, o canvas funciona com fonte fallback como antes |
| Config Modal bloqueia criação | Adicionar feature flag `ENABLE_CONFIG_STEP=false` para pular modal |

**Database rollback:**
- As novas colunas têm `DEFAULT` e são `NULLABLE`, então remover o código e manter as colunas não quebra nada
- Para reverter: remover colunas `format`, `canvas_width`, `canvas_height` (DROP COLUMN)

---

## Questões em Aberto

| # | Questão | Contexto | Status |
|---|---------|----------|--------|
| 1 | Qual formato deve ser o padrão para novos templates? | Referências usam 4:5, mas Instagram ainda aceita 1:1 como padrão | Decisão de produto pendente — sugestão: portrait (4:5) |
| 2 | Google Fonts ou fontes locais bundled? | Google Fonts tem melhor coverage mas depende de CDN externo | Sugestão: Google Fonts com fallback local para as 3 mais usadas |
| 3 | CTA padrão deve ser "Salve este post" ou "Saiba mais"? | Texto atual é muito longo para botão CTA | Sugestão: "Salve este post" truncado para "Salvar" ou personalizado por template |
| 4 | Templates existentes devem ser migrados para portrait? | Usuários com creatives antigos não serão afetados, mas templates podem confundir | Sugestão: novos templates são portrait, antigos mantêm square |
| 5 | Número máximo de slides no Config Modal? | Instagram suporta até 20 slides | Sugestão: máximo de 10 para experiência de edição razoável |

---

## Métricas de Sucesso

| Métrica | Baseline Atual | Meta |
|---------|---------------|------|
| % de creatives exportados vs criados | Não medido | > 70% |
| Taxa de edição de fonte após criação | Não medido | < 30% (indica que o default está bom) |
| Uso do formato portrait | 0% (não existe) | > 60% dos novos creatives |
| Sessões com CTA em todos os slides | ~100% (bug atual) | < 5% |
| NPS do Studio (feedback qualitativo) | "resultado parece amador" | "resultado parece profissional" |

---

## Alternativas Consideradas

| Alternativa | Prós | Contras | Por que não escolhida |
|------------|------|---------|----------------------|
| Substituir Konva por react-konva + canvas 2D puro | Mais controle sobre fontes | Reescrita completa do editor | Custo muito alto para o resultado |
| Substituir Konva por fabric.js | Melhor suporte a texto e fontes | API diferente, migração grande | Risco alto de regressões |
| Usar CSS + HTML para o editor, exportar via `html2canvas` | Fontes web funcionam nativamente | Qualidade de exportação inferior, dependência de DOM | Qualidade do PNG inferior |
| Manter 1:1 e adicionar zonas de texto maior | Simples de implementar | Não resolve o problema estético | O formato portrait é fundamental para o estilo editorial |

**Decisão:** Manter Konva.js com ajustes cirúrgicos (FontLoader + coordenadas relativas). O custo é baixo e o risco de regressão é mínimo.

---

## Glossário

| Termo | Definição |
|-------|-----------|
| **Aspect Ratio** | Proporção largura/altura do canvas (1:1, 4:5, 9:16) |
| **Canvas Konva** | Elemento HTML5 Canvas renderizado pela biblioteca Konva.js |
| **CTA** | Call-to-Action — botão com texto de ação ("Salve este post", "Saiba mais") |
| **FontFace API** | API nativa do browser para carregar e verificar o status de fontes web |
| **Format** | Combinação de dimensões e aspect ratio de um creative (square, portrait, story) |
| **Overlay** | Camada semi-transparente sobre a imagem de fundo para aumentar contraste do texto |
| **Placeholder** | Variável no template substituída por conteúdo real (`{{headline}}`, `{{cta}}`) |
| **Profile Mode** | Modo de layout alternativo que inclui painel lateral com foto e dados do perfil |
| **Slide** | Página individual de um carrossel, com background, texto e elementos visuais |
| **Thumbnail** | Miniatura do slide exibida no painel lateral de navegação |

---

*SDD gerado por Morgan (AIOX PM Agent) com análise de código do Creative Editor*
*Referências visuais: @brandsdecoded__ (Instagram), MyPostFlow*
*Aprovação técnica pendente — status: Draft*
