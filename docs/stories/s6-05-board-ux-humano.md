# S6-05 — UX do Board de Fluxo em Linguagem Humana

Status: Ready  
Owner: @dev + @ux-design-expert  
Sprint: 06  
Prioridade: Alta  
Pontos: 3  
Depende de: S6-04 (pipeline paralelo funcionando)

## Contexto

O board de Fluxo existe como canvas visual, mas usa terminologia técnica: "researcher", "writer", "reviewer", "custom". O usuário não-técnico não entende o que cada agente faz, e não há feedback visual durante a execução (qual agente está ativo, qual completou).

Esta story torna o board compreensível e vivo: nomes amigáveis, descrições, ícones, e status em tempo real via WebSocket.

## Escopo

**IN:**
- Mapeamento de tipos de nó para nomes amigáveis e ícones
- Descrição curta de cada agente visível no card do nó
- Status visual em tempo real: em espera / executando / concluído / erro
- Pulse animation durante execução
- Tooltip com resumo do output após conclusão do nó

**OUT:**
- Editor de propriedades do nó no board (escopo futuro)
- Logs detalhados inline no board (Langfuse tem isso)
- Drag-and-drop de criação de novos nós (mantido como estava)

## Mapeamento de Nomes

| Tipo técnico | Nome amigável | Ícone | Descrição |
|---|---|---|---|
| `researcher` | Pesquisador | 🔍 | Busca e analisa suas fontes de referência |
| `metrics-analyst` | Analista de Performance | 📊 | Lê o que funcionou no perfil do cliente |
| `references` | Curador de Referências | 📚 | Seleciona referências relevantes para o tema |
| `writer` | Redator Estratégico | ✍️ | Cria o conteúdo com base nos insights |
| `reviewer` | Revisor de Qualidade | ✅ | Avalia e pontua o conteúdo gerado |
| `visual-formatter` | Formatador Visual | 🎨 | Estrutura o conteúdo para carrossel |
| `custom` | Agente Customizado | ⚙️ | Agente de tipo personalizado |

## Critérios de Aceite

- [ ] Cada nó no board exibe nome amigável + ícone + descrição curta
- [ ] Status visual: cinza (aguardando), azul pulsante (executando), verde (concluído), vermelho (erro)
- [ ] Ao executar um job, os nós mudam de estado em tempo real via WebSocket
- [ ] Tooltip no nó concluído mostra resumo do output (ex: "Encontrou 4 referências relevantes")
- [ ] Nó em execução tem animação de loading (pulse ou spinner)
- [ ] Mobile: nós do board legíveis em tela pequena

## Tarefas

- [ ] Criar `client/src/lib/node-display-config.ts` — mapeamento tipo → { label, icon, description }
- [ ] Atualizar componente de nó no `AgentGraphCanvas.tsx` para usar config amigável
- [ ] Adicionar estados de status ao store do board (`agent-board-store.ts`)
- [ ] Conectar WebSocket events ao store: `agent:start` → status executando, `agent:complete` → status concluído
- [ ] Criar variantes visuais de nó por status (Tailwind classes condicionais)
- [ ] Implementar tooltip com output summary do evento `agent:complete`
- [ ] Testar em mobile (responsividade do canvas)

## Arquivos a Criar/Modificar

- CRIAR: `client/src/lib/node-display-config.ts`
- MODIFICAR: `client/src/components/agents/AgentGraphCanvas.tsx`
- MODIFICAR: `client/src/stores/agent-board-store.ts` — campos de status por nó
- MODIFICAR: `client/src/pages/AgentBoardPage.tsx` — integrar WebSocket do job

## Definition of Done

- [ ] Critérios de aceite atendidos
- [ ] Sem issues CRITICAL no CodeRabbit
- [ ] Nenhum usuário não-técnico deve ver o tipo técnico do nó na UI
- [ ] Evidências: vídeo/GIF do board executando com animações em tempo real
