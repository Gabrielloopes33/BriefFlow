-- Migration: Agents, Graphs and Executions (Sprint 5)
-- Framework: LangGraph (JS) + Langfuse observability

-- ============================================================
-- agents: definição de cada agente (prompt, modelo, temperatura, etc.)
-- ============================================================
CREATE TABLE IF NOT EXISTS agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  role TEXT NOT NULL CHECK (role IN ('researcher', 'writer', 'reviewer', 'custom')),
  system_prompt TEXT NOT NULL,
  model TEXT NOT NULL DEFAULT 'gpt-4o-mini',
  temperature NUMERIC(3,2) NOT NULL DEFAULT 0.7 CHECK (temperature >= 0 AND temperature <= 2),
  max_tokens INTEGER DEFAULT 2048,
  tools JSONB DEFAULT '[]'::jsonb,
  config JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agents_tenant ON agents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_agents_role ON agents(role);

-- ============================================================
-- agent_graphs: definição do grafo (ordem, conexões, condições)
-- ============================================================
CREATE TABLE IF NOT EXISTS agent_graphs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  nodes JSONB NOT NULL DEFAULT '[]'::jsonb,
  edges JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_graphs_tenant ON agent_graphs(tenant_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_agent_graphs_default ON agent_graphs(tenant_id, is_default) WHERE is_default = true;

-- ============================================================
-- agent_executions: rastreamento de execuções do grafo
-- ============================================================
CREATE TABLE IF NOT EXISTS agent_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  graph_id UUID NOT NULL REFERENCES agent_graphs(id) ON DELETE CASCADE,
  job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed', 'canceled')),
  current_node_id TEXT,
  node_results JSONB DEFAULT '{}'::jsonb,
  trace_id TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_agent_executions_tenant ON agent_executions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_agent_executions_graph ON agent_executions(graph_id);
CREATE INDEX IF NOT EXISTS idx_agent_executions_job ON agent_executions(job_id);
CREATE INDEX IF NOT EXISTS idx_agent_executions_status ON agent_executions(status);

-- ============================================================
-- RLS policies
-- ============================================================
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_graphs ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_executions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_agents_select" ON agents FOR SELECT USING (current_user_is_tenant_member(tenant_id));
CREATE POLICY "tenant_agents_insert" ON agents FOR INSERT WITH CHECK (current_user_is_tenant_member(tenant_id));
CREATE POLICY "tenant_agents_update" ON agents FOR UPDATE USING (current_user_is_tenant_member(tenant_id)) WITH CHECK (current_user_is_tenant_member(tenant_id));
CREATE POLICY "tenant_agents_delete" ON agents FOR DELETE USING (current_user_is_tenant_member(tenant_id));

CREATE POLICY "tenant_graphs_select" ON agent_graphs FOR SELECT USING (current_user_is_tenant_member(tenant_id));
CREATE POLICY "tenant_graphs_insert" ON agent_graphs FOR INSERT WITH CHECK (current_user_is_tenant_member(tenant_id));
CREATE POLICY "tenant_graphs_update" ON agent_graphs FOR UPDATE USING (current_user_is_tenant_member(tenant_id)) WITH CHECK (current_user_is_tenant_member(tenant_id));
CREATE POLICY "tenant_graphs_delete" ON agent_graphs FOR DELETE USING (current_user_is_tenant_member(tenant_id));

CREATE POLICY "tenant_executions_select" ON agent_executions FOR SELECT USING (current_user_is_tenant_member(tenant_id));
CREATE POLICY "tenant_executions_insert" ON agent_executions FOR INSERT WITH CHECK (current_user_is_tenant_member(tenant_id));
CREATE POLICY "tenant_executions_update" ON agent_executions FOR UPDATE USING (current_user_is_tenant_member(tenant_id)) WITH CHECK (current_user_is_tenant_member(tenant_id));

-- ============================================================
-- Comments
-- ============================================================
COMMENT ON TABLE agents IS 'Agentes de IA configuráveis para o grafo LangGraph';
COMMENT ON TABLE agent_graphs IS 'Grafos de orquestração de agentes (nodes + edges)';
COMMENT ON TABLE agent_executions IS 'Execuções de grafos com rastreamento de progresso por nó';
