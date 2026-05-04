import { useState } from "react";
import { useLocation } from "wouter";
import { AppShell } from "@/components/layout/AppShell";
import { useClients } from "@/hooks/use-clients";
import { useKnowledgeItems, useDeleteKnowledgeItem } from "@/hooks/use-knowledge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ClientWizard } from "@/components/client-wizard/ClientWizard";
import { calculateClientCompleteness, completenessColor } from "@/lib/client-completeness";
import { 
    Users, 
    BookOpen, 
    Trash2, 
    ExternalLink, 
    X,
    Database,
    Globe,
    Search,
    Bot,
    Map,
    Layers,
    Plus,
} from "lucide-react";

interface Client {
    id: string;
    name: string;
    description?: string;
    niche?: string;
    target_audience?: string;
    created_at: string;
}

interface KnowledgeItem {
    id: string;
    client_id: string;
    title: string;
    content: string;
    type: "scrape" | "search" | "agent" | "map" | "crawl";
    source_url?: string;
    created_at: string;
}

const typeIcons = {
    scrape: Globe,
    search: Search,
    agent: Bot,
    map: Map,
    crawl: Layers,
};

const typeLabels = {
    scrape: "Scrape",
    search: "Search",
    agent: "Agent",
    map: "Map",
    crawl: "Crawl",
};

export function ClientsPage() {
    const [, setLocation] = useLocation();
    const { data: clients, isLoading: clientsLoading } = useClients();
    const [selectedClient, setSelectedClient] = useState<Client | null>(null);
    const { data: knowledgeItems, isLoading: knowledgeLoading } = useKnowledgeItems(selectedClient?.id || "");
    const deleteKnowledgeItem = useDeleteKnowledgeItem();
    const [wizardOpen, setWizardOpen] = useState(false);

    const handleDelete = async (itemId: string) => {
        if (confirm("Tem certeza que deseja excluir este item?")) {
            await deleteKnowledgeItem.mutateAsync(itemId);
        }
    };

    return (
        <>
        <AppShell>
            <div className="flex h-full gap-6">
                {/* Client List */}
                <div className="flex-1">
                    <div className="mb-6 flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-display font-bold text-gradient mb-2">Clientes</h1>
                            <p className="text-muted-foreground text-sm">Gerencie seus clientes e suas bases de conhecimento</p>
                        </div>
                        <Button className="bg-primary hover:bg-primary/90" onClick={() => setWizardOpen(true)}>
                            <Plus className="w-4 h-4 mr-2" />
                            Adicionar Cliente
                        </Button>
                    </div>

                    {clientsLoading ? (
                        <div className="text-center py-12 text-muted-foreground">
                            Carregando clientes...
                        </div>
                    ) : clients?.length === 0 ? (
                        <div className="text-center py-12">
                            <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                            <p className="text-muted-foreground mb-4">Nenhum cliente cadastrado</p>
                            <Button className="bg-primary hover:bg-primary/90" onClick={() => setWizardOpen(true)}>
                                <Plus className="w-4 h-4 mr-2" />
                                Adicionar Cliente
                            </Button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {clients?.map((client: Client) => (
                                <Card 
                                    key={client.id} 
                                    className="feature-card cursor-pointer group"
                                    onClick={() => setLocation(`/clients/${client.id}`)}
                                >
                                    <CardHeader className="pb-3">
                                        <CardTitle className="text-lg font-display">{client.name}</CardTitle>
                                        {client.niche && (
                                            <Badge variant="secondary" className="w-fit">
                                                {client.niche}
                                            </Badge>
                                        )}
                                    </CardHeader>
                                    <CardContent>
                                        {client.description && (
                                            <CardDescription className="mb-4 line-clamp-2">
                                                {client.description}
                                            </CardDescription>
                                        )}
                                        {/* Completeness indicator */}
                                        {(() => {
                                            const pct = calculateClientCompleteness(client as any);
                                            return (
                                                <div className="mb-3">
                                                    <div className="flex items-center justify-between mb-1">
                                                        <span className="text-xs text-muted-foreground">Perfil completo</span>
                                                        <span className={`text-xs font-semibold ${completenessColor(pct)}`}>{pct}%</span>
                                                    </div>
                                                    <div className="h-1 bg-secondary rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-primary transition-all"
                                                            style={{ width: `${pct}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            );
                                        })()}
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                <Database size={14} />
                                                <span>Base de conhecimento</span>
                                            </div>
                                            <div className="flex gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="text-primary hover:text-primary hover:bg-primary/10"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedClient(client);
                                                    }}
                                                >
                                                    Ver Base
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setLocation(`/clients/${client.id}`);
                                                    }}
                                                >
                                                    Workspace
                                                </Button>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>

                {/* Knowledge Base Drawer */}
                {selectedClient && (
                    <div className="w-[400px] border-l border-border/50 bg-card flex flex-col">
                        <div className="p-4 border-b border-border/50 flex items-center justify-between">
                            <div>
                                <h2 className="font-display font-bold text-lg">Base de Conhecimento</h2>
                                <p className="text-sm text-muted-foreground">{selectedClient.name}</p>
                            </div>
                            <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => setSelectedClient(null)}
                            >
                                <X size={18} />
                            </Button>
                        </div>

                        <ScrollArea className="flex-1 p-4">
                            {knowledgeLoading ? (
                                <div className="text-center py-8 text-muted-foreground">
                                    Carregando...
                                </div>
                            ) : knowledgeItems?.length === 0 ? (
                                <div className="text-center py-12">
                                    <BookOpen className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
                                    <p className="text-sm text-muted-foreground">Nenhum item salvo</p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Use as ferramentas no /chat para adicionar itens
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {knowledgeItems?.map((item: KnowledgeItem) => {
                                        const Icon = typeIcons[item.type];
                                        return (
                                            <Card key={item.id} className="bg-secondary/30 border-border/50">
                                                <CardContent className="p-3">
                                                    <div className="flex items-start gap-3">
                                                        <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                                                            <Icon size={14} className="text-primary" />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <span className="text-xs font-medium text-muted-foreground">
                                                                    {typeLabels[item.type]}
                                                                </span>
                                                                <span className="text-xs text-muted-foreground">
                                                                    {new Date(item.created_at).toLocaleDateString('pt-BR')}
                                                                </span>
                                                            </div>
                                                            <h3 className="font-medium text-sm mb-1 truncate">
                                                                {item.title}
                                                            </h3>
                                                            <p className="text-xs text-muted-foreground line-clamp-2">
                                                                {item.content.slice(0, 150)}
                                                                {item.content.length > 150 ? "..." : ""}
                                                            </p>
                                                            {item.source_url && (
                                                                <a 
                                                                    href={item.source_url}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-2"
                                                                >
                                                                    <ExternalLink size={10} />
                                                                    Ver fonte
                                                                </a>
                                                            )}
                                                        </div>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="shrink-0 h-8 w-8 text-muted-foreground hover:text-destructive"
                                                            onClick={() => handleDelete(item.id)}
                                                            disabled={deleteKnowledgeItem.isPending}
                                                        >
                                                            <Trash2 size={14} />
                                                        </Button>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        );
                                    })}
                                </div>
                            )}
                        </ScrollArea>
                    </div>
                )}
            </div>
        </AppShell>

        <ClientWizard open={wizardOpen} onOpenChange={setWizardOpen} />
    </>
    );
}
