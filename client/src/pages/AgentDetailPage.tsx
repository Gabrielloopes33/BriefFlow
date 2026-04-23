import { useState } from "react";
import { useRoute } from "wouter";
import { AppShell } from "@/components/layout/AppShell";
import { useAgent, useUpdateAgent } from "@/hooks/use-agents";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Bot, Save } from "lucide-react";
import { Link } from "wouter";
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

export function AgentDetailPage() {
  const [match, params] = useRoute("/agents/:id");
  const agentId = params?.id || "";
  const { data: agent, isLoading } = useAgent(agentId);
  const updateAgent = useUpdateAgent();
  const [activeTab, setActiveTab] = useState("general");

  if (isLoading) {
    return (
      <AppShell>
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96" />
      </div>
      </AppShell>
    );
  }

  if (!agent) {
    return (
      <AppShell>
      <div className="p-6">
        <Card className="p-12 text-center">
          <Bot className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">Agente não encontrado</h3>
          <Link href="/agents">
            <Button variant="outline" className="mt-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar para Agentes
            </Button>
          </Link>
        </Card>
      </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/agents">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight">{agent.name}</h1>
              <Badge
                variant="outline"
                className={ROLE_COLORS[agent.role] || ROLE_COLORS.custom}
              >
                {ROLE_LABELS[agent.role] || agent.role}
              </Badge>
              <Badge variant={agent.is_active ? "default" : "secondary"}>
                {agent.is_active ? "Ativo" : "Inativo"}
              </Badge>
            </div>
            <p className="text-muted-foreground">{agent.description || "Sem descrição"}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="general">Geral</TabsTrigger>
          <TabsTrigger value="prompt">Prompt</TabsTrigger>
          <TabsTrigger value="config">Configurações</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Informações do Agente</CardTitle>
            </CardHeader>
            <CardContent>
              <AgentForm
                agent={agent}
                onSuccess={() => setActiveTab("general")}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="prompt" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Prompt do Sistema</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-muted rounded-lg p-4 font-mono text-sm whitespace-pre-wrap">
                {agent.system_prompt}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="config" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Configurações Técnicas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Modelo</Label>
                  <p className="font-mono text-sm bg-muted px-2 py-1 rounded inline-block">
                    {agent.model}
                  </p>
                </div>
                <div>
                  <Label>Temperatura</Label>
                  <p className="font-mono text-sm bg-muted px-2 py-1 rounded inline-block">
                    {agent.temperature}
                  </p>
                </div>
                <div>
                  <Label>Max Tokens</Label>
                  <p className="font-mono text-sm bg-muted px-2 py-1 rounded inline-block">
                    {agent.max_tokens}
                  </p>
                </div>
                <div>
                  <Label>Criado em</Label>
                  <p className="text-sm">
                    {new Date(agent.created_at).toLocaleDateString("pt-BR")}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
    </AppShell>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted-foreground mb-1">{children}</p>;
}
