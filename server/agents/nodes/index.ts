/**
 * Barrel de Registro de Nós — Registra todos os nós disponíveis no sistema
 * Importar este arquivo garante que todos os nós estejam registrados no registry
 */

import { registerNode } from '../node-registry';
import { researcherNode } from './researcher';
import { writerNode } from './writer';
import { reviewerNode } from './reviewer';
import { metricsAnalystNode } from './metrics-analyst';
import { referencesNode } from './references';
import { visualFormatterNode } from './visual-formatter';

/**
 * Registra todos os nós built-in no registry
 * Deve ser chamada uma vez na inicialização do servidor
 */
export function registerAllNodes(): void {
  registerNode('researcher', researcherNode, 'Pesquisa fontes do cliente e sintetiza insights');
  registerNode('writer', writerNode, 'Gera o post com base na pesquisa e contexto');
  registerNode('reviewer', reviewerNode, 'Avalia qualidade do post e decide aprovação');
  registerNode('metrics-analyst', metricsAnalystNode, 'Analisa performance do cliente e gera insights');
  registerNode('references', referencesNode, 'Busca e ranqueia referências relevantes do cliente');
  registerNode('visual-formatter', visualFormatterNode, 'Estrutura conteúdo em slides para o editor visual');

  console.log('[node-registry] Registered nodes:', 'researcher, writer, reviewer, metrics-analyst, references, visual-formatter');
}

// Re-exporta os nós individuais para uso direto
export { researcherNode } from './researcher';
export { writerNode } from './writer';
export { reviewerNode } from './reviewer';
export { metricsAnalystNode } from './metrics-analyst';
export { referencesNode } from './references';
export { visualFormatterNode } from './visual-formatter';

// Auto-registra na importação (para compatibilidade com imports diretos)
registerAllNodes();
