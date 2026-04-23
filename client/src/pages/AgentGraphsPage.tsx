import { useState } from "react";
import { Link } from "wouter";
import { AppShell } from "@/components/layout/AppShell";
import {
  useAgentGraphs,
  useDeleteAgentGraph,
  useCreateAgentGraph,
  type AgentGraph,
} from "@/hooks/use-agent-graphs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Plus,
  GitBranch,
  Pencil,
  Trash2,
  Workflow,
  ArrowLeft,
  LayoutGrid,
  Star,
} from "lucide-react";

export function AgentGraphsPage() {
  const { data: graphs, isLoading } = useAgentGraphs();
  const deleteGraph = useDeleteAgentGraph();
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  return (
    <AppShell>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Fluxos de Agentes
            </h1>
            <p className="text-muted-foreground">
              Orquestre fluxos de trabalho conectando agentes de IA
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/agents">
              <Button variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Agentes
              </Button>
            </Link>
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Novo Fluxo
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Criar Novo Fluxo</DialogTitle>
                </DialogHeader>
                <AgentGraphForm onSuccess={() => setIsCreateOpen(false)} />
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Workflow className="w-5 h-5 text-primary" />
                <span className="text-2xl font-bold">{graphs?.length || 0}</span>
              </div>
              <p className="text-sm text-muted-foreground">Total de Fluxos</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Star className="w-5 h-5 text-yellow-500" />
                <span className="text-2xl font-bold">
                  {graphs?.filter((g) => g.is_default).length || 0}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">Padrões</p>
            </CardContent>
          </Card>
        </div>

        {/* Graphs List */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-40" />
            ))}
          </div>
        ) : graphs?.length === 0 ? (
          <Card className="p-12 text-center">
            <GitBranch className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">Nenhum fluxo criado</h3>
            <p className="text-muted-foreground mb-4">
              Crie seu primeiro fluxo para começar a orquestrar agentes
            </p>
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Criar Fluxo
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {graphs?.map((graph) => (
              <GraphCard
                key={graph.id}
                graph={graph}
                onDelete={() => {
                  if (
                    confirm("Tem certeza que deseja excluir este fluxo?")
                  ) {
                    deleteGraph.mutate(graph.id);
                  }
                }}
              />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}

function GraphCard({
  graph,
  onDelete,
}: {
  graph: AgentGraph;
  onDelete: () => void;
}) {
  return (
    <Card className="group hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <LayoutGrid className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                {graph.name}
                {graph.is_default && (
                  <Badge
                    variant="outline"
                    className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
                  >
                    <Star className="w-3 h-3 mr-1" />
                    Padrão
                  </Badge>
                )}
              </CardTitle>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{graph.nodes.length} nós</span>
                <span>•</span>
                <span>{graph.edges.length} conexões</span>
              </div>
            </div>
          </div>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Link href={`/agent-graphs/${graph.id}/board`}>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Pencil className="w-4 h-4" />
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive"
              onClick={onDelete}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
          {graph.description || "Sem descrição"}
        </p>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span
              className={`w-2 h-2 rounded-full ${
                graph.is_active ? "bg-green-500" : "bg-gray-400"
              }`}
            />
            <span>{graph.is_active ? "Ativo" : "Inativo"}</span>
          </div>
          <Link href={`/agent-graphs/${graph.id}/board`}>
            <Button variant="outline" size="sm">
              <LayoutGrid className="w-4 h-4 mr-2" />
              Abrir Board
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

function AgentGraphForm({ onSuccess }: { onSuccess: () => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const createGraph = useCreateAgentGraph();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createGraph.mutate(
      {
        name,
        description,
        nodes: [],
        edges: [],
      },
      {
        onSuccess: () => {
          onSuccess();
          setName("");
          setDescription("");
        },
      }
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-sm font-medium">Nome</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full mt-1 px-3 py-2 border rounded-md bg-background"
          placeholder="Ex: Fluxo de Pesquisa e Escrita"
          required
        />
      </div>
      <div>
        <label className="text-sm font-medium">Descrição</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full mt-1 px-3 py-2 border rounded-md bg-background"
          placeholder="Descreva o propósito deste fluxo..."
          rows={3}
        />
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onSuccess}>
          Cancelar
        </Button>
        <Button type="submit" disabled={createGraph.isPending}>
          {createGraph.isPending ? "Criando..." : "Criar Fluxo"}
        </Button>
      </div>
    </form>
  );
}
