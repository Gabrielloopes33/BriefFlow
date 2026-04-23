/**
 * Node Registry — Sistema de registro de nós por tipo
 * Permite registrar, descobrir e validar handlers de nós do grafo
 */

import type { AgentState } from './state';

export type NodeHandler = (
  state: AgentState,
  config?: Record<string, any>
) => Promise<Partial<AgentState>>;

export interface NodeRegistration {
  type: string;
  handler: NodeHandler;
  description?: string;
}

const registry = new Map<string, NodeRegistration>();

/**
 * Registra um nó no sistema
 */
export function registerNode(type: string, handler: NodeHandler, description?: string): void {
  if (registry.has(type)) {
    console.warn(`[node-registry] Node type '${type}' is already registered. Overwriting.`);
  }
  registry.set(type, { type, handler, description });
}

/**
 * Retorna o handler de um nó registrado
 * Lança erro descritivo se o nó não estiver registrado
 */
export function getNodeHandler(type: string): NodeHandler {
  const registration = registry.get(type);
  if (!registration) {
    const available = getRegisteredNodeTypes();
    throw new Error(
      `Node type '${type}' is not registered. ` +
      `Available types: ${available.join(', ')}`
    );
  }
  return registration.handler;
}

/**
 * Verifica se um tipo de nó está registrado
 */
export function hasNodeHandler(type: string): boolean {
  return registry.has(type);
}

/**
 * Retorna a lista de tipos de nós registrados
 */
export function getRegisteredNodeTypes(): string[] {
  return Array.from(registry.keys());
}

/**
 * Retorna todas as registrações
 */
export function getAllRegistrations(): NodeRegistration[] {
  return Array.from(registry.values());
}

/**
 * Valida se todos os nós de um grafo têm handlers registrados
 * Retorna array de erros (vazio se tudo OK)
 */
export function validateGraphNodes(nodeTypes: string[]): string[] {
  const errors: string[] = [];
  const available = getRegisteredNodeTypes();

  for (const type of nodeTypes) {
    if (!registry.has(type)) {
      errors.push(
        `Node type '${type}' is not registered. Available types: ${available.join(', ')}`
      );
    }
  }

  return errors;
}

/**
 * Limpa o registry (útil para testes)
 */
export function clearRegistry(): void {
  registry.clear();
}
