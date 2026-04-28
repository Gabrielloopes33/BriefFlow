import { useState, useEffect, useCallback } from "react";
import { useRoute } from "wouter";
import { AppShell } from "@/components/layout/AppShell";
import { useAgentGraph, useUpdateAgentGraph } from "@/hooks/use-agent-graphs";
import { useAgents } from "@/hooks/use-agents";
import { useAgentBoardStore } from "@/stores/agent-board-store";
import { AgentGraphCanvas } from "@/components/agents/AgentGraphCanvas";
import { ExecutionPanel } from "@/components/agents/ExecutionPanel";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  Save,
  Play,
  Plus,
  Trash2,
  GitBranch,
  Bot,
  Search,
  PenLine,
  Eye,
} from "lucide-react";
import { Link } from "wouter";

const ROLE_COLORS: Record<string, string> = {
  researcher: "bg-blue-500",
  writer: "bg-green-500",
  reviewer: "bg-yellow-500",
  custom: "bg-purple-500",
};

const ROLE_ICONS: Record<string, React.ReactNode> = {
  researcher: <Search className="w-4 h-4" />,
  writer: <PenLine className="w-4 h-4" />,
  reviewer: <Eye className="w-4 h-4" />,
  custom: <Bot className="w-4 h-4" />,
};

export function AgentBoardPage() {
  const [match, params] = useRoute("/agent-graphs/:id/board");
  const graphId = params?.id || "";

  const { data: graph, isLoading } = useAgentGraph(graphId);
  const { data: agents } = useAgents();
  const updateGraph = useUpdateAgentGraph();

  const storeNodes = useAgentBoardStore((s) => s.nodes);
  const storeEdges = useAgentBoardStore((s) => s.edges);
  const addNode = useAgentBoardStore((s) => s.addNode);
  const removeNode = useAgentBoardStore((s) => s.removeNode);
  const addEdge = useAgentBoardStore((s) => s.addEdge);
  const removeEdge = useAgentBoardStore((s) => s.removeEdge);
  const selectedNodeId = useAgentBoardStore((s) => s.selectedNodeId);
  const selectedEdgeId = useAgentBoardStore((s) => s.selectedEdgeId);
  const setNodes = useAgentBoardStore((s) => s.setNodes);
  const setEdges = useAgentBoardStore((s) => s.setEdges);
  const reset = useAgentBoardStore((s) => s.reset);
  const addLog = useAgentBoardStore((s) => s.addLog);
  const setIsExecuting = useAgentBoardStore((s) => s.setIsExecuting);

  const [isAddNodeOpen, setIsAddNodeOpen] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState("");
  const [edgeCondition, setEdgeCondition] = useState("");
  const [isDefault, setIsDefault] = useState(false);

  // Load graph into store
  useEffect(() => {
    if (graph) {
      setIsDefault(graph.is_default || false);
      if (graph.nodes && graph.edges) {
        const boardNodes = graph.nodes.map((n: any) => ({
          id: n.id,
          agentId: n.agentId,
          type: n.type,
          label: agents?.find((a) => a.id === n.agentId)?.name || n.type,
          position: n.position || { x: Math.random() * 400, y: Math.random() * 300 },
          config: n.config,
          status: "idle" as const,
        }));

        const boardEdges = graph.edges.map((e: any) => ({
          id: e.id,
          source: e.from,
          target: e.to,
          label: e.condition,
        }));

        setNodes(boardNodes);
        setEdges(boardEdges);
      }
    }

    return () => reset();
  }, [graph, agents, setNodes, setEdges, reset]);

  const handleSave = useCallback(() => {
    if (!graphId) return;

    const nodes = storeNodes.map((n) => ({
      id: n.id,
      agentId: n.agentId,
      type: n.type,
      position: n.position,
      config: n.config,
    }));

    const edges = storeEdges.map((e) => ({
      id: e.id,
      from: e.source,
      to: e.target,
      condition: e.label,
    }));

    updateGraph.mutate({
      id: graphId,
      data: { nodes, edges, is_default: isDefault },
    });

    addLog({
      nodeId: "system",
      message: "Fluxo salvo com sucesso",
      type: "success",
    });
  }, [graphId, storeNodes, storeEdges, updateGraph, addLog]);

  const handleAddNode = useCallback(() => {
    if (!selectedAgentId || !agents) return;
    const agent = agents.find((a) => a.id === selectedAgentId);
    if (!agent) return;

    const newNode = {
      id: `node-${Date.now()}`,
      agentId: agent.id,
      type: agent.role as any,
      label: agent.name,
      position: { x: 200 + Math.random() * 200, y: 100 + Math.random() * 200 },
      status: "idle" as const,
    };

    addNode(newNode);
    setIsAddNodeOpen(false);
    setSelectedAgentId("");
  }, [selectedAgentId, agents, addNode]);

  const handleAddEdge = useCallback(() => {
    if (!selectedNodeId) return;
    // Simples: conecta o nó selecionado ao próximo nó clicado
    addLog({
      nodeId: "system",
      message: "Clique em outro nó para conectar",
      type: "info",
    });
  }, [selectedNodeId, addLog]);

  const handleSimulateExecution = useCallback(() => {
    setIsExecuting(true);
    addLog({ nodeId: "system", message: "Iniciando simulação de execução...", type: "info" });

    // Simula execução sequencial
    const nodeIds = storeNodes.map((n) => n.id);
    let currentIndex = 0;

    const interval = setInterval(() => {
      if (currentIndex >= nodeIds.length) {
        clearInterval(interval);
        setIsExecuting(false);
        addLog({ nodeId: "system", message: "Execução concluída!", type: "success" });
        return;
      }

      const nodeId = nodeIds[currentIndex];
      addLog({
        nodeId,
        message: `Executando nó ${nodeId}...`,
        type: "info",
      });

      setTimeout(() => {
        addLog({
          nodeId,
          message: `Nó ${nodeId} completado com sucesso`,
          type: "success",
        });
      }, 1000);

      currentIndex++;
    }, 1500);
  }, [storeNodes, addLog, setIsExecuting]);

  const selectedNode = storeNodes.find((n) => n.id === selectedNodeId);
  const selectedEdge = storeEdges.find((e) => e.id === selectedEdgeId);

  if (isLoading) {
    return (
    <AppShell>
      <div className="h-screen flex flex-col">
        <Skeleton className="h-14" />
        <Skeleton className="flex-1" />
      </div>
    </AppShell>
    );
  }

  return (
    <AppShell>
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="h-14 border-b flex items-center justify-between px-4 bg-background">
        <div className="flex items-center gap-3">
          <Link href="/agents">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <GitBranch className="w-5 h-5 text-primary" />
              <h1 className="font-semibold">{graph?.name || "Board"}</h1>
              {graph?.is_default && (
                <Badge variant="outline" className="text-xs">
                  Padrão
                </Badge>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Dialog open={isAddNodeOpen} onOpenChange={setIsAddNodeOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Plus className="w-4 h-4 mr-1" />
                Adicionar Nó
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Adicionar Nó ao Fluxo</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Selecione um Agente</Label>
                  <Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Escolha um agente..." />
                    </SelectTrigger>
                    <SelectContent>
                      {agents?.map((agent) => (
                        <SelectItem key={agent.id} value={agent.id}>
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${ROLE_COLORS[agent.role] || ROLE_COLORS.custom}`} />
                            {agent.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleAddNode} disabled={!selectedAgentId}>
                  Adicionar
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Button
            variant="outline"
            size="sm"
            onClick={handleAddEdge}
            disabled={!selectedNodeId}
          >
            <GitBranch className="w-4 h-4 mr-1" />
            Conectar
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleSimulateExecution}
          >
            <Play className="w-4 h-4 mr-1" />
            Simular
          </Button>

          <Button
            variant={isDefault ? "default" : "outline"}
            size="sm"
            onClick={() => setIsDefault(!isDefault)}
            title={isDefault ? "Este é o fluxo padrão" : "Definir como fluxo padrão"}
          >
            {isDefault ? "Padrão ✓" : "Definir Padrão"}
          </Button>

          <Button size="sm" onClick={handleSave} disabled={updateGraph.isPending}>
            <Save className="w-4 h-4 mr-1" />
            Salvar
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Canvas */}
        <div className="flex-1 relative">
          <AgentGraphCanvas />
        </div>

        {/* Sidebar */}
        <div className="w-80 border-l bg-background flex flex-col">
          <div className="p-4 border-b">
            <h3 className="font-medium">Propriedades</h3>
          </div>

          <div className="flex-1 p-4 overflow-y-auto">
            {selectedNode ? (
              <div className="space-y-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Nó</Label>
                  <p className="font-medium">{selectedNode.label}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Tipo</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`w-3 h-3 rounded-full ${ROLE_COLORS[selectedNode.type] || ROLE_COLORS.custom}`} />
                    <span className="capitalize">{selectedNode.type}</span>
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Posição</Label>
                  <p className="font-mono text-sm">
                    x: {Math.round(selectedNode.position.x)}, y:{" "}
                    {Math.round(selectedNode.position.y)}
                  </p>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  className="w-full"
                  onClick={() => removeNode(selectedNode.id)}
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Remover Nó
                </Button>
              </div>
            ) : selectedEdge ? (
              <div className="space-y-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Conexão</Label>
                  <p className="font-mono text-sm">
                    {selectedEdge.source} → {selectedEdge.target}
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Condição</Label>
                  <Input
                    value={edgeCondition}
                    onChange={(e) => setEdgeCondition(e.target.value)}
                    placeholder="Ex: review.approved === true"
                  />
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  className="w-full"
                  onClick={() => removeEdge(selectedEdge.id)}
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Remover Conexão
                </Button>
              </div>
            ) : (
              <div className="text-center text-muted-foreground text-sm py-8">
                Selecione um nó ou edge no canvas para ver suas propriedades
              </div>
            )}
          </div>

          {/* Execution Panel */}
          <div className="h-64 border-t">
            <ExecutionPanel />
          </div>
        </div>
      </div>
    </div>
    </AppShell>
  );
}
