# Plano de Migração: Konva → HTML/CSS para Carrosséis

**Status:** Planejamento  
**Data:** 2026-05-27  
**Escopo:** Sistema de geração de carrosséis para Instagram/LinkedIn

---

## Diagnóstico do Problema Atual

O sistema usa **Konva (Canvas 2D)** para renderizar slides 1080×1080px. Três problemas fundamentais:

### 1. Konva tem teto visual baixo
- Tipografia limitada: sem kerning automático, sem ligaduras, sem `line-height` preciso
- Efeitos restritos: sem `box-shadow` real, sem `backdrop-filter`, sem `clip-path`, sem `blend-modes`
- Gradientes básicos: sem gradientes cônico, radial complexo, ou multi-stop dinâmicos
- Sem suporte a formas orgânicas, padrões procedurais ou efeitos modernos (glassmorphism, glow, etc.)

### 2. LLMs geram Konva mal
O `visual-formatter` hoje apenas **seleciona entre 8 templates fixos** — o agente não cria layouts originais. Isso produz carrosséis genéricos.

Se evoluíssemos para o agente gerar Konva JSON diretamente:
- Claude não raciocina bem sobre coordenadas absolutas (x, y em pixels)
- Taxa de erro alta: sobreposições, elementos fora da tela, má distribuição de espaço
- Sem conceito de "padding", "flex", "gap" — tudo é posição manual

### 3. Templates são estáticos
8 templates codificados no `slide-templates.ts` → qualquer "novo visual" exige dev, não o agente.

---

## Por que HTML/CSS resolve

Claude (e qualquer LLM moderno) é **excelente em HTML/CSS**:
- Viu bilhões de exemplos no training data
- Flexbox/Grid são semânticos: "coloque 3 cards lado a lado" → `display: flex; gap: 24px`
- CSS é tolerante: erro de sintaxe → browser usa fallback, não quebra
- Iteração natural: "aumenta o padding" → muda um número

Design possível com HTML/CSS vs Konva:

| Recurso | Konva | HTML/CSS |
|---------|-------|----------|
| Tipografia profissional | ❌ | ✅ kerning, ligaduras, line-height |
| Gradientes complexos | Parcial | ✅ linear, radial, cônico |
| Sombras reais | ❌ | ✅ `box-shadow`, `text-shadow`, `drop-shadow()` |
| Glassmorphism | ❌ | ✅ `backdrop-filter: blur()` |
| Clip-path | ❌ | ✅ formas orgânicas, diagonais |
| Blend modes | ❌ | ✅ `mix-blend-mode: overlay` etc |
| Bar charts com CSS | ❌ | ✅ divs com height % |
| Grid layouts | Manual | ✅ `display: grid` auto-placement |
| Criatividade do agente | Seleciona template | Cria layout original |

---

## Arquitetura Proposta

```
INPUT (prompt do usuário)
       ↓
[carousel-writer]       → copy: [{ title, subtitle }]
       ↓
[html-slide-generator]  → HTML/CSS: string para cada slide
       ↓
[image-prompt-engineer] → prompts de imagem (mantido)
       ↓
BACKEND: HTML string → PNG
[html-to-image service] → buffer PNG 1080×1080 (ou 2160×2160 @2x)
       ↓
Frontend: <img> ou download direto
```

### Diferença-chave: agente cria HTML, não seleciona template

O novo nó `html-slide-generator` recebe o copy e gera HTML/CSS único para cada slide. Sem templates fixos — o agente é o designer.

---

## Stack Técnico Recomendado

### Opção A: Satori (recomendado para início)
- **Biblioteca:** `@vercel/satori` + `sharp`
- **Como funciona:** JSX/React → SVG → Sharp converte para PNG
- **Vantagem:** Puro JavaScript, sem Chromium, roda em serverless
- **Performance:** ~400-500ms por slide
- **Suporte CSS:** ~75% do CSS moderno (sem `backdrop-filter`, sem `clip-path` complexo)
- **Ideal para:** MVP, deploy rápido, Vercel/Railway

```typescript
import satori from 'satori'
import sharp from 'sharp'

const svg = await satori(
  <div style={{ width: 1080, height: 1080, background: '...' }}>
    ...
  </div>,
  {
    width: 1080,
    height: 1080,
    fonts: [{ name: 'Space Grotesk', data: fontBuffer, weight: 400 }]
  }
)

const png = await sharp(Buffer.from(svg)).png().toBuffer()
```

### Opção B: Playwright (máxima qualidade)
- **Biblioteca:** `playwright-core` (só Chromium)
- **Como funciona:** Abre página HTML headless → screenshot
- **Vantagem:** 100% fidelidade CSS, qualquer efeito moderno funciona
- **Performance:** 1-2s por slide (com browser pool: ~500ms)
- **Suporte CSS:** 100% — tudo que o Chrome suporta
- **Ideal para:** produção com templates premium, plano "design avançado"

```typescript
import { chromium } from 'playwright-core'

const browser = await chromium.launch()
const page = await browser.newPage()
await page.setViewportSize({ width: 1080, height: 1080 })
await page.setContent(htmlSlide)
const png = await page.screenshot({ type: 'png' })
```

### Recomendação de Roadmap

```
Fase 1 (MVP): Satori
  - Sem Chromium, deploy simples
  - Suporta 90% dos designs que o Claude vai gerar

Fase 2 (Premium): Playwright
  - Para planos pagos com "templates premium"
  - Glassmorphism, clip-path complexo, blend modes
  - Pode usar Browserless.io (hosted) para evitar infra
```

---

## O Novo Agente: `html-slide-generator`

### Prompt base

```
Você é um designer de conteúdo para redes sociais especializado em slides Instagram 1080×1080px.

Gere HTML/CSS inline para UM slide com base no conteúdo abaixo.

Regras:
- Dimensões fixas: width: 1080px; height: 1080px
- Use inline styles APENAS (sem <style> tags, sem classes)
- Fontes disponíveis: 'Space Grotesk', 'Inter', 'Merriweather'
- NÃO use JavaScript, animações, ou elementos interativos
- Use Flexbox ou Grid para layout (NUNCA position absolute para texto principal)
- Contraste mínimo WCAG AA (4.5:1 para texto normal)
- Retorne APENAS o HTML — sem markdown, sem explicação

Paleta de cores sugerida: {{accentColor}}
Estilo visual: {{layoutMode}}
Slide index: {{index}} / {{total}}

Conteúdo:
Título: {{title}}
Subtítulo: {{subtitle}}
```

### Sistema de CSS Variables para edição pelo usuário

O HTML gerado pode usar variáveis que o frontend expõe num painel visual:

```html
<div style="
  --primary: #667eea;
  --accent: #fbbf24;
  --text: #ffffff;
  --title-size: 64px;
  
  width: 1080px; height: 1080px;
  background: linear-gradient(135deg, var(--primary), #1a1a2e);
  display: flex; flex-direction: column; justify-content: center;
  padding: 80px; font-family: 'Space Grotesk';
">
  <h1 style="font-size: var(--title-size); color: var(--text); ...">
    Título
  </h1>
</div>
```

O usuário edita as CSS variables via sliders — sem precisar entender HTML.

---

## Componentes a Criar / Modificar

### Backend (novo)

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `server/agents/nodes/html-slide-generator.ts` | Criar | Novo nó: gera HTML/CSS por slide |
| `server/services/html-to-image.ts` | Criar | Serviço de conversão HTML → PNG (Satori ou Playwright) |
| `server/utils/html-sanitizer.ts` | Criar | Sanitize HTML gerado pelo LLM (remove scripts, XSS) |

### Backend (modificar)

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `server/agents/nodes/visual-formatter.ts` | Substituir | Substitui lógica de template por chamada ao html-slide-generator |
| `server/slide-templates.ts` | Deprecar | Templates Konva ficam como fallback temporário |
| `server/agents/graph-builder.ts` | Modificar | Atualiza grafo de agentes com novo nó |

### Frontend (novo)

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `client/components/html-slide-preview/HtmlSlidePreview.tsx` | Criar | Renderiza HTML gerado como preview (sandboxed iframe) |
| `client/components/html-slide-preview/CssVariableEditor.tsx` | Criar | Painel de edição via CSS variables (cores, fontes, tamanhos) |

### Frontend (modificar)

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `client/components/creative-editor/CreativeEditor.tsx` | Modificar | Suporta modo "HTML preview" além de Konva |
| `client/hooks/use-creative-export.ts` | Modificar | Exportação via API (HTML → PNG no servidor) em vez de `toDataURL()` |

---

## Modos de Exportação

### Atual (Konva client-side)
```
browser → stage.toDataURL({ pixelRatio: 2 }) → PNG
```

### Proposto (server-side)
```
browser → POST /api/export-slide { html: string } → PNG buffer
backend → Satori/Playwright → PNG 2160×2160px (deviceScaleFactor: 2)
browser → download ou upload para storage
```

Vantagem: qualidade consistente independente do dispositivo do usuário.

---

## Estratégia de Migração (Sem Quebrar o Atual)

### Fase 1 — Feature flag "html mode" (semana 1-2)
1. Criar `html-slide-generator` como nó novo no grafo
2. Criar `html-to-image.ts` com Satori
3. Criar `HtmlSlidePreview` no frontend com `<iframe sandbox>`
4. Feature flag: `ENABLE_HTML_SLIDES=true` — usuário vê preview HTML ao lado do Konva atual
5. Exportação: mantém Konva por enquanto, adiciona botão "Exportar (HTML)" em beta

### Fase 2 — HTML como padrão (semana 3-4)
1. Migrar visual-formatter para usar html-slide-generator
2. Substituir CreativeEditor Konva por HtmlSlidePreview como view principal
3. Adicionar CssVariableEditor para edição de tema
4. Exportação 100% via servidor (Satori)

### Fase 3 — Qualidade premium (mês 2+)
1. Avaliar Playwright para planos pagos
2. Biblioteca de "prompts de design" por nicho (coach, e-commerce, SaaS...)
3. Editor visual drag-and-drop sobre HTML (opcional, complexo)

---

## Riscos e Mitigações

| Risco | Probabilidade | Mitigação |
|-------|--------------|-----------|
| Claude gera HTML inválido | Média | Sanitize + fallback para template base |
| Satori não suporta CSS usado pelo Claude | Média | Testar conjunto de prompts, whitelist de propriedades |
| Performance lenta em geração batch | Baixa | Worker pool para Satori, cache de fontes |
| XSS no HTML gerado | Alta sem mitigação | Sanitize obrigatório (DOMPurify server-side) |
| Regressão no editor Konva | Baixa | Feature flag — Konva continua até Fase 2 |

---

## Próximos Passos (Quando Executar)

1. Criar story `html-carousel-generator` com PO/SM
2. Prototipar `html-slide-generator.ts` com 10 prompts de teste
3. Comparar saída visual com sistema atual
4. Decidir Satori vs Playwright baseado nos resultados
5. Planejar sprint de desenvolvimento

---

## Referências

- [Satori GitHub (Vercel)](https://github.com/vercel/satori)
- [Playwright Screenshots](https://playwright.dev/docs/screenshots)
- [DOMPurify (XSS sanitizer)](https://github.com/cure53/DOMPurify)
- [Sharp (image processing Node.js)](https://sharp.pixelplumbing.com/)
