# ADR-006 - Konva.js para Editor Visual

Status: Proposed
Data: 2026-04-22
Owner: @architect

## Contexto

A v2 do BriefFlow expande o produto para geração de conteúdo visual (carrosséis e criativos), não apenas texto. O editor visual precisa suportar: templates pré-definidos, preenchimento automático pelo conteúdo gerado pelos agentes, ajuste de texto/cores/posicionamento, e export PNG pronto para publicação. A escolha da engine gráfica impacta diretamente a qualidade da UX, a manutenibilidade do código e a viabilidade de export server-side no futuro.

## Decisao

1. **Engine:** Usar `konva` + `react-konva` como engine do editor de carrosséis e criativos.
   - `konva`: biblioteca canvas 2D madura (>10k stars, mantida ativamente).
   - `react-konva`: bindings oficiais para React 18.
2. **Export:** Usar `stage.toDataURL('image/png')` para exportação client-side.
   - Upload das imagens para Supabase Storage.
   - URLs salvas em `creatives.export_urls`.
3. **Templates:** Estrutura JSON armazenada em `creative_templates.structure`.
   - Camadas definidas com posições, estilos e placeholders (`{{headline}}`, `{{body}}`).
   - Preenchimento automático pelo `visual-formatter` node.
4. **Escopo v2:** Templates pré-definidos com preenchimento automático. Editor permite ajuste de texto, cores e posicionamento. Export PNG por slide.
5. **Escopo v3 (futuro):** Renderização server-side via Puppeteer para qualidade de impressão; integração com Bannerbear para geração em volume.

## Justificativa

1. Biblioteca madura com suporte nativo a grupos, transformações e drag-and-drop no canvas.
2. Export via `toDataURL()` sem dependências externas (diferente de soluções baseadas em DOM-to-image).
3. Extensível: pode integrar com renderização server-side (Puppeteer) no futuro.
4. `react-konva` tem bindings prontos para React 18, alinhado com a stack do projeto.
5. Alternativas avaliadas:
   - **Fabric.js:** Menor atividade de manutenção, bindings React menos maduros.
   - **HTML/CSS + html2canvas:** Problemas de qualidade e consistência de renderização.
   - **SVG nativo:** Limitado para manipulação interativa complexa (drag, resize, rotate).

## Trade-offs

1. Curva de aprendizado da API do Konva para desenvolvedores novos.
2. Canvas não é acessível por padrão — requer atenção a a11y (textos alternativos, aria-labels).
3. Performance em canvas pode degradar com muitos elementos complexos (mitigado por templates pré-definidos).

## Consequencias

1. Novas dependências: `konva` e `react-konva` (instalação na Sprint 7).
2. Novas tabelas no banco: `creative_templates` e `creatives` (schema definido no SDD v2).
3. Novo bucket no Supabase Storage para exports de criativos.
4. Novo nó de agente: `visual-formatter.ts` (Sprint 7) — transforma texto em estrutura de slides JSONB.
5. Componentes frontend a criar: `SlideCanvas.tsx`, `CreativeEditor.tsx`, `TemplateSelector.tsx`.

## Riscos e mitigacoes

1. **Risco:** Editor Konva: UX complexa para usuário final.
   - **Mitigação:** Templates pré-preenchidos reduzem necessidade de edição; onboarding no editor.
2. **Risco:** Memory leak ao trocar de slides (Stage do Konva não destruído).
   - **Mitigação:** Implementar `stage.destroy()` no cleanup do React useEffect.
3. **Risco:** Qualidade de export PNG inferior em dispositivos de alta densidade de pixels.
   - **Mitigação:** Configurar `pixelRatio` do Stage adequadamente (`window.devicePixelRatio`).

## Checklist de seguranca

- [ ] Dados de clientes (logo, imagens) validados antes de carregar no canvas
- [ ] URLs de imagem externas sanitizadas (CSP, validação de domínio)
- [ ] Export PNG não expõe metadados sensíveis
