# S8-05 — Creative Editor: Melhorias UX e Correções de Bugs v2

Status: Ready for Review
Owner: @dev
Sprint: 08
Prioridade: Alta
Pontos: 5

---

## Contexto

O editor de criativos passou por um redesign significativo (SDD-creative-editor-redesign-v1). Após a primeira rodada de uso real foram identificados 4 problemas distintos: dois são bugs de estado/dados, um é falha de fluxo de navegação e um é problema de experiência do usuário no wizard de geração.

Referência: `docs/sdd/SDD-creative-editor-improvements-v2.md`

---

## Story

**As a** usuário do BriefFlow,
**I want** que o editor de criativos preserve minhas edições manuais, carregue corretamente o Instagram handle, e que o wizard ofereça seletores visuais intuitivos,
**so that** eu possa criar e editar criativos com confiança e precisão, sem perder trabalho ou ficar confuso com opções abstratas.

---

## Acceptance Criteria

- [ ] P2: O Instagram handle digitado no wizard aparece pré-preenchido no Badge de Perfil do editor
- [ ] P3: Posições manuais de texto (drag) são preservadas ao alterar overlay, badge, tipografia — apenas resetam quando o enum de posição muda explicitamente
- [ ] P4: Posts da biblioteca com creative_id vinculado abrem direto no editor; sem creative_id vão para o wizard pré-preenchido
- [ ] P1.a: Wizard exibe seletores visuais (cards clicáveis) para imageMode e layoutMode em vez de `<select>` nativos
- [ ] P1.b: Wizard exibe preview real das combinações de fontes com renderização via Google Fonts
- [ ] P1.c: Wizard oferece toggle "Densidade textual" (Conciso/Detalhado) que afeta o limite de palavras do subtitle no carouselWriterNode

---

## 🤖 CodeRabbit Integration

**Primary Type**: Frontend
**Secondary Type(s)**: API/Node
**Complexity**: Medium

**Primary Agents**:
- @dev

**Supporting Agents**:
- @qa

**Quality Gate Tasks**:
- [ ] Pre-Commit (@dev): Run before marking story complete
- [ ] Pre-PR (@github-devops): Run before creating pull request

**Expected Self-Healing**:
- Primary Agent: @dev (light mode)
- Max Iterations: 2
- Timeout: 15 minutes
- Severity Filter: CRITICAL

---

## Tasks / Subtasks

- [ ] **P2 — Fix instagramHandle → profileConfig** (AC: #1)
  - [ ] Modificar inicialização de `profileConfig` em CreativeEditor.tsx para fazer merge com `creative.instagramHandle`
- [ ] **P3 — Fix posição preservada no drag** (AC: #2)
  - [ ] Detectar `positionChanged` em `applySlideSettingsToSlide`
  - [ ] Só re-aplicar coordenadas X/Y quando o enum de posição mudou explicitamente
- [ ] **P4 — Rota inteligente no PostCard** (AC: #3)
  - [ ] Substituir `handleOpenCreative` para usar `post.creative_id` como roteador
  - [ ] Atualizar label do botão conforme estado (Editar/Criar Creative)
- [ ] **P1.a — Seletor visual imageMode/layoutMode** (AC: #4)
  - [ ] Criar componente de cards clicáveis para imageMode (background/grid/both)
  - [ ] Criar componente de cards clicáveis para layoutMode (minimalist/profile)
  - [ ] Integrar no CarouselWizardPage
- [ ] **P1.b — Preview de fontes com render real** (AC: #5)
  - [ ] Carregar Google Fonts via `<link>` inline
  - [ ] Criar grid de cards com renderização real de cada combinação
  - [ ] Integrar no CarouselWizardPage
- [ ] **P1.c — Campo textDepth no wizard** (AC: #6)
  - [ ] Adicionar toggle "Densidade textual" no CarouselWizardPage
  - [ ] Passar `textDepth` no payload de geração
  - [ ] Ajustar `carouselWriterNode` para usar limite de 80 palavras quando `detailed`

---

## Dev Notes

### Arquivos afetados
- `client/src/components/creative-editor/CreativeEditor.tsx` — P2 (linha ~316), P3 (função `applySlideSettingsToSlide` ~linha 204)
- `client/src/components/library/PostCard.tsx` — P4 (função `handleOpenCreative`)
- `client/src/pages/CarouselWizardPage.tsx` — P1.a, P1.b, P1.c (novo arquivo, será criado do zero)
- `server/agents/nodes/carousel-writer.ts` — P1.c (suporte a `textDepth`)

### Detalhes técnicos

**P2 — Fix instagramHandle:**
```typescript
// Linha ~316 de CreativeEditor.tsx
const [profileConfig, setProfileConfig] = useState<NonNullable<Creative['profileConfig']>>({
  ...DEFAULT_PROFILE_CONFIG,
  ...(creative.profileConfig ?? {}),
  handle: creative.profileConfig?.handle || creative.instagramHandle || '',
});
```

**P3 — Fix posição manual:**
```typescript
const positionChanged = changes.textLayout?.position !== undefined
  && changes.textLayout.position !== (slide.textLayout?.position ?? 'mid');
// Só aplicar { x: titleX, y: placement.y } quando positionChanged === true
```

**P4 — Rota inteligente:**
```typescript
async function handleOpenCreative() {
  if (post.creative_id) {
    window.location.href = `/creatives/${post.creative_id}/edit`;
    return;
  }
  window.location.href = `/creatives/new?client_id=${post.client_id}&post_id=${post.id}`;
}
```

**P1 — Wizard:**
- O arquivo `CarouselWizardPage.tsx` é novo (não existe no branch atual, será criado)
- Combinações de fontes: `["Space Grotesk + Inter", "Syne + Outfit", "Oswald + Inter"]`
- imageMode: `background | grid | both`
- layoutMode: `minimalist | profile`
- textDepth: `concise | detailed` (opcional no DTO)

### Schema
Nenhuma migração necessária. `GenerateCarouselDto` recebe campo opcional `textDepth?: 'concise' | 'detailed'`.

---

## Testing

- Testar manualmente: wizard → gerar → abrir editor → verificar handle preenchido
- Testar manualmente: arrastar texto → mudar overlay → verificar posição preservada
- Testar manualmente: biblioteca → post com/sem creative_id → verificar rota correta
- `npm run lint` — deve passar
- `npm run typecheck` — deve passar

---

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2026-04-28 | 1.0 | Story criada a partir do SDD | @pm |

---

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List

- `client/src/components/creative-editor/CreativeEditor.tsx` — Modificado (P2: merge instagramHandle → profileConfig; P3: positionChanged guard em applySlideSettingsToSlide)
- `client/src/components/library/PostCard.tsx` — Modificado (P4: roteamento inteligente baseado em creative_id; label dinâmico Editar/Criar Creative)
- `client/src/pages/CarouselWizardPage.tsx` — Reescrito (P1.a: seletores visuais imageMode/layoutMode; P1.b: preview real de fontes com Google Fonts; P1.c: toggle densidade textual)
- `client/src/lib/creative-editor-types.ts` — Modificado (GenerateCarouselDto + campo opcional textDepth)
- `server/agents/nodes/carousel-writer.ts` — Modificado (limite de palavras do subtitle ajustável via textDepth)
- `server/services/creative-ai.ts` — Modificado (GenerateSlidesWithAgentsOptions + textDepth; passa textDepth no payload)
- `server/routes.ts` — Modificado (extrai textDepth do body; passa para generateSlidesWithAgents)
