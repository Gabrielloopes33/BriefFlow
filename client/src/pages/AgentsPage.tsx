import { useState } from "react";
import { Link } from "wouter";
import { AppShell } from "@/components/layout/AppShell";
import { useAgents, useDeleteAgent } from "@/hooks/use-agents";
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
import { Plus, Bot, Pencil, Trash2, GitBranch, Activity } from "lucide-react";
import { AgentForm } from "@/components/agents/AgentForm";

const ROLE_COLORS: Record<string, string> = {
  researcher: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  writer: "bg-green-500/10 text-green-500 border-green-500/20",
  reviewer: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  custom: "bg-purple-500/10 text-purple-500 border-purple-500/20",
};

const ROLE_LABELS: Record<string, string> = {
  researcher: "Pesquisador",
  writer: "Redator",
  reviewer: "Revisor",
  custom: "Custom",
};

export function AgentsPage() {
  const { data: agents, isLoading } = useAgents();
  const deleteAgent = useDeleteAgent();
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  return (
    <AppShell>
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Agentes de IA</h1>
          <p className="text-muted-foreground">
            Gerencie os agentes que compõem seus fluxos de geração de conteúdo
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/agent-graphs">
            <Button variant="outline">
              <GitBranch className="w-4 h-4 mr-2" />
              Fluxos
            </Button>
          </Link>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Novo Agente
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Criar Novo Agente</DialogTitle>
              </DialogHeader>
              <AgentForm onSuccess={() => setIsCreateOpen(false)} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-primary" />
              <span className="text-2xl font-bold">{agents?.length || 0}</span>
            </div>
            <p className="text-sm text-muted-foreground">Total de Agentes</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-green-500" />
              <span className="text-2xl font-bold">
                {agents?.filter((a) => a.is_active).length || 0}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">Ativos</p>
          </CardContent>
        </Card>
      </div>

      {/* Agents List */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      ) : agents?.length === 0 ? (
        <Card className="p-12 text-center">
          <Bot className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">Nenhum agente criado</h3>
          <p className="text-muted-foreground mb-4">
            Crie seu primeiro agente para começar a orquestrar a geração de conteúdo
          </p>
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Criar Agente
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {agents?.map((agent) => (
            <Card key={agent.id} className="group hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Bot className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{agent.name}</CardTitle>
                      <Badge
                        variant="outline"
                        className={ROLE_COLORS[agent.role] || ROLE_COLORS.custom}
                      >
                        {ROLE_LABELS[agent.role] || agent.role}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Link href={`/agents/${agent.id}`}>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Pencil className="w-4 h-4" />
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => {
                        if (confirm("Tem certeza que deseja excluir este agente?")) {
                          deleteAgent.mutate(agent.id);
                        }
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                  {agent.description || "Sem descrição"}
                </p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="font-mono bg-muted px-2 py-1 rounded">{agent.model}</span>
                  <span>Temp: {agent.temperature}</span>
                  <span
                    className={`w-2 h-2 rounded-full ${
                      agent.is_active ? "bg-green-500" : "bg-gray-400"
                    }`}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
    </AppShell>
  );
}
