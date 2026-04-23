# Sprint 07 — Editor Visual Konva

**Período:** Semanas 5-7  
**Objetivo:** Entregar o módulo completo de criação visual: templates de carrossel, editor Konva com preenchimento automático pelo conteúdo gerado pelos agentes, e export PNG para Supabase Storage.  
**Status:** Pending

## Responsáveis

| Agente | Papel na Sprint |
|---|---|
| @dev | Editor Konva, visual-formatter node, export |
| @data-engineer | Schema creatives + Storage bucket |
| @ux-design-expert | Design dos templates globais e UX do editor |
| @architect | Review de arquitetura do editor e storage |
| @qa | QA Gate + testes de usabilidade do editor |
| @devops | Configuração do Supabase Storage bucket + deploy |

## Dependência

> **Requer Sprint 6 DONE** — especialmente S6-04 (pipeline paralelo) para o visual-formatter receber output estruturado do writer

## Backlog

| ID | Story | Owner | Prioridade | Pontos | Dependências |
|---|---|---|---|---|---|
| S7-01 | Schema creative_templates + creatives + Storage bucket | @data-engineer | Crítica | 5 | Sprint 6 |
| S7-02 | Componente editor Konva (canvas + camadas editáveis) | @dev | Crítica | 13 | S7-01 |
| S7-03 | Pack de templates globais (6 templates iniciais) | @dev + @ux | Alta | 8 | S7-01 |
| S7-04 | Nó visual-formatter (estrutura conteúdo em slides JSONB) | @dev | Crítica | 5 | Sprint 6 |
| S7-05 | Export PNG por slide + upload Supabase Storage | @dev | Alta | 5 | S7-02 |

**Total de pontos:** 36

## Templates Iniciais (S7-03)

Pack de 6 templates para Instagram/LinkedIn:
1. **Carrossel Educativo** (5 slides) — headline + bullets + CTA
2. **Carrossel de Case** (4 slides) — problema + solução + resultado + CTA
3. **Post Único Impacto** (1 slide) — frase de impacto + subtítulo
4. **Carrossel de Lista** (6 slides) — capa + 5 dicas numeradas
5. **Antes e Depois** (3 slides) — situação + transformação + resultado
6. **Citação / Quote** (1 slide) — citação grande + atribuição

## Critério GO/NO-GO da Sprint

- [ ] Editor Konva renderizando template com conteúdo preenchido automaticamente
- [ ] Usuário consegue editar texto de qualquer camada do slide
- [ ] Export de carrossel com 5 slides gera 5 PNGs e salva no Supabase Storage
- [ ] visual-formatter node retornando slides JSONB estruturado corretamente
- [ ] 6 templates globais visíveis e selecionáveis na UI
- [ ] Zero issues CRITICAL no QA Gate

## Definition of Done da Sprint

- [ ] Todas as 5 stories com status Done
- [ ] QA Gate PASS
- [ ] Teste end-to-end: job gerado → carrossel exportado → URLs no DB
- [ ] Deploy em staging com Storage bucket configurado
- [ ] planejamento-execucao-briefflow.md atualizado

## Referências

- SDD v2: [docs/sdd/SDD-briefflow-v2.md](../sdd/SDD-briefflow-v2.md)
- ADR-006 (Konva): [docs/sdd/SDD-briefflow-v2.md](../sdd/SDD-briefflow-v2.md#adr-006-konvajs-para-editor-visual)
- Estrutura de template: ver seção 7.2 do SDD
