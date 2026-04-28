# SDD — Creative Editor: Melhorias UX e Correções de Bugs v2

| Campo          | Valor                                      |
| -------------- | ------------------------------------------ |
| Tech Lead      | Gabriel                                    |
| Status         | Draft                                      |
| Criado em      | 2026-04-28                                 |
| Última revisão | 2026-04-28                                 |
| Branch         | wip/modelo-util-atual                      |

---

## Contexto

O editor de criativos passou por um redesign significativo (SDD-creative-editor-redesign-v1). Após a primeira rodada de uso real foram identificados 4 problemas distintos: dois são bugs de estado/dados, um é falha de fluxo de navegação e um é problema de experiência do usuário no wizard de geração.

---

## Problemas e Soluções

---

## P1 — Wizard sem exemplos visuais de modos e fontes

### Diagnóstico

`CarouselWizardPage.tsx` exibe `imageMode`, `layoutMode` e combinações de fontes como `<select>` nativos sem qualquer contexto visual. O usuário não consegue antecipar o resultado de cada escolha, o que gera criativos genéricos por falta de intenção na configuração.

Adicionalmente, o `carouselWriterNode` limita o subtitle a **45 palavras** — o que produz textos curtos para conteúdo educacional. Não há opção de densidade textual exposta ao usuário.

### Estado atual

```
imageMode   → <select> com 3 opções de texto puro
layoutMode  → <select> com 2 opções de texto puro
fontIdx     → <select> com nomes de fontes sem preview
```

### Solução

#### 1.1 — Seletor visual de `imageMode`

Substituir o `<select>` por 3 cards clicáveis com ícone SVG ilustrando cada modo:

| Valor        | Label          | Descrição                              | Ícone                             |
| ------------ | -------------- | -------------------------------------- | --------------------------------- |
| `background` | Apenas fundo   | Imagem preenche o slide atrás do texto | Camadas sobrepostas               |
| `grid`       | Apenas grade   | Imagem em caixa inset ao lado do texto | Dois painéis lado a lado          |
| `both`       | Fundo + Grade  | Imagem de fundo + inset em destaque    | Caixa + overlay                   |

#### 1.2 — Seletor visual de `layoutMode`

2 cards com miniatura representando o layout:

| Valor        | Label        | Descrição                              |
| ------------ | ------------ | -------------------------------------- |
| `minimalist` | Minimalista  | Texto centralizado sobre a imagem      |
| `profile`    | Com Perfil   | Foto de perfil no canto + texto à direita |

#### 1.3 — Preview de combinações de fontes

Substituir o `<select>` por um grid de cards onde cada opção renderiza texto de amostra com a fonte real carregada via Google Fonts inline `<link>`.

```
[ Space Grotesk + Inter ]   [ Syne + Outfit ]   [ Oswald + Inter ]
  Título do Slide             Título do Slide     TÍTULO DO SLIDE
  Subtítulo de exemplo        Subtítulo exemplo   Subtítulo de exemplo
```

Cada card: borda destacada ao selecionar, renderização real via `font-family`.

#### 1.4 — Campo "profundidade do texto"

Adicionar toggle no wizard:

```
Densidade textual:  ○ Conciso (padrão)   ● Detalhado
```

Quando `detalhado`, passar `textDepth: 'detailed'` no payload. O `carouselWriterNode` ajusta o limite de subtitle de 45 para 80 palavras via configuração no prompt.

### Arquivos afetados

- `client/src/pages/CarouselWizardPage.tsx` — refatorar UI dos seletores
- `server/agents/nodes/carousel-writer.ts` — suporte a `textDepth` no payload

### Contrato de API

Nenhuma mudança de schema. `GenerateCarouselDto` recebe campo opcional `textDepth?: 'concise' | 'detailed'` (sem migração).

---

## P2 — Instagram handle não popula Badge de Perfil

### Diagnóstico

O campo `instagramHandle` é salvo corretamente na coluna `instagram_handle` do banco. Porém, o `CreativeEditor` inicializa `profileConfig` ignorando esse campo:

```typescript
// CreativeEditor.tsx linha ~316
const [profileConfig, setProfileConfig] = useState<...>(
  creative.profileConfig ?? DEFAULT_PROFILE_CONFIG  // handle: ''
);
```

`DEFAULT_PROFILE_CONFIG.handle = ''` e `creative.profileConfig` é `null` na maioria dos criativos gerados pelo wizard (o wizard não preenche `profileConfig`, apenas `instagram_handle`). Resultado: o Badge de Perfil aparece com handle vazio mesmo quando o usuário digitou `@sua_marca` no wizard.

### Fluxo com bug

```
CarouselWizardPage
  → POST /api/creatives/generate { instagramHandle: "@marca" }
    → INSERT creatives SET instagram_handle = "@marca", profile_config = NULL
      → GET /api/creatives/:id → { instagramHandle: "@marca", profileConfig: null }
        → CreativeEditor setState({ handle: '' })  ← BUG
```

### Solução

Em `CreativeEditor.tsx`, ao inicializar o `useState` de `profileConfig`, fazer merge explícito com `creative.instagramHandle`:

```typescript
const [profileConfig, setProfileConfig] = useState<NonNullable<Creative['profileConfig']>>({
  ...DEFAULT_PROFILE_CONFIG,
  ...(creative.profileConfig ?? {}),
  handle: creative.profileConfig?.handle || creative.instagramHandle || '',
});
```

Essa mudança garante que o handle digitado no wizard apareça pré-preenchido no Badge de Perfil sem quebrar casos onde `profileConfig.handle` já está definido explicitamente.

### Arquivos afetados

- `client/src/components/creative-editor/CreativeEditor.tsx` — linha ~316 (useState profileConfig)

### Impacto

Nenhuma migração de banco. Nenhuma mudança de API. Alteração de 3 linhas.

---

## P3 — Posição manual de texto sobrescrita ao alterar configurações

### Diagnóstico

Quando o usuário arrasta manualmente uma camada de texto (ex: move o título para baixo), a nova posição `(x, y)` é persistida apenas no estado local via `onDragEnd → onChange → handleSlideChange`.

Quando qualquer configuração de slide muda (badge, overlay, tipografia), `handleSlideSettingsChange` chama `applySlideSettingsToSlide`, que sempre re-aplica `y: placement.y` calculado a partir do enum `textLayout.position`:

```typescript
// CreativeEditor.tsx linhas ~204-241
if (hasPrimaryTextLayers) {
  const placement = getPositionPlacement(nextTextLayout.position, canvasHeight);
  updatedLayers[titleIndex] = {
    ...titleLayer,
    x: titleX,
    y: placement.y,  // ← sobrescreve posição manual SEMPRE
    ...
  };
}
```

Resultado: qualquer interação com o painel direito (ativar badge, mudar overlay, etc.) redefine o texto para a posição original do enum.

### Causa raiz

`applySlideSettingsToSlide` não distingue "mudança de posição do texto" de "mudança em outro controle". Ela sempre recalcula `placement.y` independente do que mudou.

### Solução

Detectar se o campo `position` foi explicitamente alterado nesta chamada. Só re-aplicar coordenadas X/Y quando a posição do textLayout mudou:

```typescript
function applySlideSettingsToSlide(slide, layoutMode, changes, canvasHeight) {
  // ...
  const positionChanged = changes.textLayout?.position !== undefined
    && changes.textLayout.position !== (slide.textLayout?.position ?? 'mid');

  if (hasPrimaryTextLayers) {
    const placement = getPositionPlacement(nextTextLayout.position, canvasHeight);

    const titleLayer = updatedLayers[titleIndex];
    if (titleLayer?.type === 'text') {
      updatedLayers[titleIndex] = {
        ...titleLayer,
        // só reposiciona se o usuário mudou o preset de posição
        ...(positionChanged ? { x: titleX, y: placement.y } : {}),
        width: textWidth,
        align: nextTextLayout.alignment,
        text: nextTextLayout.title,
        fontSize: Math.max(12, Math.round(nextTypography.titleFontSize * scaleFactor)),
        fontFamily: nextTypography.titleFontFamily,
        color: nextTheme === 'light' ? '#111827' : '#ffffff',
      };
    }

    const subtitleLayer = updatedLayers[subtitleIndex];
    if (subtitleLayer?.type === 'text') {
      updatedLayers[subtitleIndex] = {
        ...subtitleLayer,
        ...(positionChanged ? { x: titleX, y: placement.y + subtitleOffsetY } : {}),
        width: textWidth,
        align: nextTextLayout.alignment,
        text: nextTextLayout.subtitle,
        fontSize: Math.max(12, Math.round(nextTypography.subtitleFontSize * scaleFactor)),
        color: nextTheme === 'light' ? '#1f2937' : '#f3f4f6',
      };
    }
  }
  // ...
}
```

### Comportamento após a correção

| Ação do usuário                   | Resultado esperado                                |
| --------------------------------- | ------------------------------------------------- |
| Arrasta texto → troca overlay     | Posição manual preservada ✓                       |
| Arrasta texto → ativa badge       | Posição manual preservada ✓                       |
| Arrasta texto → muda posição enum | Posição resetada para o preset selecionado ✓      |
| Muda tamanho de fonte              | Fonte atualizada, posição preservada ✓            |

### Arquivos afetados

- `client/src/components/creative-editor/CreativeEditor.tsx` — função `applySlideSettingsToSlide` (~linha 204)

---

## P4 — Biblioteca: criativo sem imagens e conteúdo embaralhado

### Diagnóstico

Ao clicar em "Abrir no Creative" em `PostCard`, o fluxo atual:

```
PostCard.handleOpenCreative()
  → POST /api/posts/:postId/creative (ensure-creative)
    → Tenta parsear content do post com regex "Slide N: ..."
    → Falha (posts do Studio têm texto corrido, não formato Slide N)
    → Fallback: 1 slide com title=post.title, subtitle=primeiros 220 chars
    → INSERT creatives com imageUrl=undefined
      → /creatives/:id/edit exibe slide único sem imagem e texto truncado
```

Dois problemas distintos:

**4a — Conteúdo embaralhado**: O regex `/(?:^|\n)Slide\s*(\d+)\s*:\s*([^\n]+)\n?([^\n]*)/gim` não captura o formato do Studio (texto corrido com hashtags). O fallback cria 1 slide com 220 chars de conteúdo raw como subtitle.

**4b — Sem imagens**: `ensure-creative` cria slides com `imageUrl: undefined`. O editor abre sem imagens geradas por IA.

### Solução

#### 4.1 — Rota inteligente em PostCard

Substituir a lógica de `handleOpenCreative` por roteamento baseado no campo `creative_id` já presente em `LibraryPostItem`:

```typescript
async function handleOpenCreative() {
  // Se post já tem creative vinculado → abre direto
  if (post.creative_id) {
    window.location.href = `/creatives/${post.creative_id}/edit`;
    return;
  }
  // Se não → vai para wizard pré-preenchido com o post
  window.location.href = `/creatives/new?client_id=${post.client_id}&post_id=${post.id}`;
}
```

O `CarouselWizardPage` já suporta `?post_id=<id>` via `queryPostId` e popula o prompt automaticamente com `selectedPost.title + selectedPost.content`.

#### 4.2 — Deprecar ensure-creative para o fluxo de biblioteca

O endpoint `POST /api/posts/:postId/creative` continua existindo mas não é mais chamado por `PostCard`. Pode ser mantido para integrações futuras ou removido.

#### 4.3 — Estado do botão no PostCard

| Estado de `post.creative_id` | Label do botão   | Ação                            |
| ---------------------------- | ---------------- | ------------------------------- |
| Preenchido                   | Editar Creative  | Navega para `/creatives/:id/edit` |
| Nulo                         | Criar Creative   | Navega para wizard com post_id  |

### Arquivos afetados

- `client/src/components/library/PostCard.tsx` — substituir `handleOpenCreative`

### Consideração de migração

Posts gerados antes desta mudança que já têm um `creative_id` vinculado via `ensure-creative` (estrutura simples) continuam abrindo normalmente. Não há regressão para criativos existentes.

---

## Plano de Implementação

| # | Task                                        | Arquivo(s)                                   | Esforço |
| - | ------------------------------------------- | -------------------------------------------- | ------- |
| 1 | P2 — Fix instagramHandle → profileConfig    | `CreativeEditor.tsx`                         | 15 min  |
| 2 | P3 — Fix posição preservada no drag         | `CreativeEditor.tsx`                         | 30 min  |
| 3 | P4 — Rota inteligente no PostCard           | `PostCard.tsx`                               | 20 min  |
| 4 | P1.a — Seletor visual imageMode/layoutMode  | `CarouselWizardPage.tsx`                     | 2h      |
| 5 | P1.b — Preview de fontes com render real    | `CarouselWizardPage.tsx`                     | 1h      |
| 6 | P1.c — Campo textDepth no wizard            | `CarouselWizardPage.tsx`, `carousel-writer.ts` | 45 min |

**Ordem recomendada**: bugs primeiro (P2, P3, P4) antes das melhorias de UX (P1) — são independentes e de menor risco.

---

## Riscos

| Risco                                                     | Probabilidade | Mitigação                                              |
| --------------------------------------------------------- | ------------- | ------------------------------------------------------ |
| P3: posição `mid` como default no `positionChanged` falha | Baixa         | Usar `slide.textLayout?.position ?? 'mid'` explicitamente |
| P1: fontes do wizard não carregam antes do render          | Média         | `<link rel="preconnect">` + `font-display: swap`      |
| P4: posts sem `creative_id` no campo da LibraryPostItem   | Baixa         | API já retorna `creative_id` no SELECT de posts       |

---

## Fora de Escopo (v2)

- Geração automática de imagens ao criar creative via biblioteca (v3)
- Salvar configurações do wizard como preset reutilizável
- Preview em tempo real do slide no wizard antes de gerar
- Sincronização automática de `instagramHandle` → `profileConfig.handle` no banco (apenas fix no frontend)
