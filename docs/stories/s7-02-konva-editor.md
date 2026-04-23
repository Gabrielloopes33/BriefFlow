# S7-02 — Componente Editor Konva (Canvas + Camadas Editáveis)

Status: Ready  
Owner: @dev + @ux-design-expert  
Sprint: 07  
Prioridade: Crítica  
Pontos: 13  
Depende de: S7-01 (schema + storage)

## Contexto

O editor Konva é o coração do módulo de criação visual. Permite ao usuário visualizar e ajustar os slides gerados automaticamente pelo agente (S7-04), com possibilidade de editar texto, cores e layout antes do export.

O Konva.js foi escolhido por: maturidade (>10k stars), suporte nativo a transformações e grupos, export via `toDataURL()` sem dependências externas, e bindings React (react-konva) para React 18.

## Escopo

**IN:**
- Instalação de `konva` + `react-konva`
- Componente `CreativeEditor` com Stage, Layer, e camadas por tipo (texto, imagem, fundo)
- Painel lateral de slides (thumbnails, navegação entre slides)
- Edição de texto inline ao clicar em camada de texto
- Seleção + resize de elementos via Transformer do Konva
- Controles básicos: cor do texto, tamanho da fonte
- Navegação: slide anterior / próximo / indicador de progresso

**OUT:**
- Adição de novos elementos ao canvas (drag-and-drop de assets)
- Filtros e efeitos de imagem
- Animações para Reels
- Colaboração em tempo real no editor

## Critérios de Aceite

- [ ] Editor renderiza um slide completo a partir do JSON de `slides` do criativo
- [ ] Clique em texto abre edição inline com textarea sobreposta
- [ ] Seleção de elemento mostra Transformer (handles de resize/rotate)
- [ ] Painel lateral mostra thumbnails de todos os slides do carrossel
- [ ] Navegação entre slides funciona sem perda de edições não salvas
- [ ] Editor carrega em menos de 3s para carrossel de 5 slides
- [ ] Responsivo: funciona em desktop (1280px+); em mobile, modo de visualização apenas (edição em desktop)

## Estrutura de Componentes

```
client/src/components/creative-editor/
├── CreativeEditor.tsx         # Container principal
├── SlideCanvas.tsx            # Stage Konva de um slide
├── layers/
│   ├── TextLayer.tsx          # Camada de texto editável
│   ├── ImageLayer.tsx         # Camada de imagem
│   └── BackgroundLayer.tsx    # Fundo (cor sólida ou gradiente)
├── SlideThumbnailPanel.tsx    # Painel lateral com thumbnails
├── SlideControls.tsx          # Prev/Next + indicador
└── TextEditPanel.tsx          # Painel de propriedades do texto selecionado
```

## Tarefas

- [ ] Instalar: `npm install konva react-konva`
- [ ] Criar estrutura de componentes em `client/src/components/creative-editor/`
- [ ] Implementar `SlideCanvas.tsx` — renderização de um slide via Konva Stage + Layers
  - [ ] Suporte a camada de fundo (cor, gradiente)
  - [ ] Suporte a camada de texto com edição inline
  - [ ] Suporte a camada de imagem (URL)
  - [ ] Transformer para seleção e resize
- [ ] Implementar `SlideThumbnailPanel.tsx` — miniaturas clicáveis
- [ ] Implementar `SlideControls.tsx` — navegação + contador
- [ ] Implementar `TextEditPanel.tsx` — controles de cor/fonte para texto selecionado
- [ ] Criar `CreativeEditor.tsx` — composição de todos os subcomponentes
- [ ] Criar página `client/src/pages/CreativeEditorPage.tsx`
- [ ] Registrar rota `/creatives/:id/edit` em `client/src/App.tsx`
- [ ] Criar endpoint `GET /api/creatives/:id` e `PUT /api/creatives/:id` em `server/routes.ts`
- [ ] Criar hook `use-creatives.ts` para CRUD de criativos

## Formato de Slides para o Editor (referência)

```typescript
interface Slide {
  id: string;
  index: number;
  background: { type: 'color' | 'gradient'; value: string };
  layers: Layer[];
}

interface TextLayer {
  id: string;
  type: 'text';
  x: number; y: number; width: number; height: number;
  text: string;
  fontSize: number; fontWeight: 'normal' | 'bold';
  color: string;
  align: 'left' | 'center' | 'right';
  editable: boolean;
}

interface ImageLayer {
  id: string;
  type: 'image';
  x: number; y: number; width: number; height: number;
  src: string;
  editable: boolean;
}
```

## Arquivos a Criar/Modificar

- INSTALAR: `konva`, `react-konva`
- CRIAR: `client/src/components/creative-editor/` (6 componentes)
- CRIAR: `client/src/pages/CreativeEditorPage.tsx`
- CRIAR: `client/src/hooks/use-creatives.ts`
- MODIFICAR: `client/src/App.tsx` — nova rota `/creatives/:id/edit`
- MODIFICAR: `server/routes.ts` — endpoints CRUD de creatives

## Definition of Done

- [ ] Critérios de aceite atendidos
- [ ] Sem issues CRITICAL no CodeRabbit
- [ ] Teste manual: edição de texto em 5 slides sem crash
- [ ] Sem memory leak no Konva Stage ao trocar de slide (destroy correto)
- [ ] Evidências: screenshot/vídeo do editor com carrossel editável
