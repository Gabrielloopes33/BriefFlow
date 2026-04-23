import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useClients } from "@/hooks/use-clients";
import { useSources, useCreateSource, useDeleteSource } from "@/hooks/use-sources";
import { useToast } from "@/hooks/use-toast";
import { Plus, Globe, Trash2, ExternalLink, Rss, Newspaper, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";

const sourceSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  url: z.string().url("URL inválida"),
  type: z.enum(["rss", "blog", "news"]),
});

type SourceFormData = z.infer<typeof sourceSchema>;

export default function Sources() {
  const [selectedClient, setSelectedClient] = useState<string>("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { data: clients } = useClients();
  const { data: sources } = useSources(selectedClient);
  const createSource = useCreateSource();
  const deleteSource = useDeleteSource();
  const { toast } = useToast();

  const form = useForm<SourceFormData>({
    resolver: zodResolver(sourceSchema),
  });

  const onSubmit = (data: SourceFormData) => {
    if (!selectedClient) {
      toast({ 
        title: "Erro", 
        description: "Por favor, selecione um cliente primeiro",
        variant: "destructive" 
      });
      return;
    }

    createSource.mutate({
      clientId: selectedClient,
      name: data.name,
      url: data.url,
      type: data.type,
    });

    form.reset();
    setIsDialogOpen(false);
  };

  const handleDeleteSource = (sourceId: string) => {
    if (!selectedClient) return;
    deleteSource.mutate(sourceId);
  };

  const getSourceIcon = (type: string) => {
    switch (type) {
      case "rss":
        return <Rss className="w-4 h-4" />;
      case "blog":
        return <Globe className="w-4 h-4" />;
      case "news":
        return <Newspaper className="w-4 h-4" />;
      default:
        return <Globe className="w-4 h-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "rss":
        return "bg-orange-500/10 text-orange-500 border-orange-500/20";
      case "blog":
        return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      case "news":
        return "bg-purple-500/10 text-purple-500 border-purple-500/20";
      default:
        return "bg-gray-500/10 text-gray-500 border-gray-500/20";
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Fontes" 
        description="Gerencie fontes de conteúdo para seus clientes."
      >
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Fonte
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adicionar Nova Fonte</DialogTitle>
            </DialogHeader>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="client">Cliente</Label>
                <Select value={selectedClient} onValueChange={setSelectedClient}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients?.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Nome da Fonte</Label>
                <Input
                  id="name"
                  {...form.register("name")}
                  placeholder="Exemplo: TechCrunch"
                  className="bg-card border-border/50"
                />
                {form.formState.errors.name && (
                  <p className="text-sm text-red-500">{form.formState.errors.name.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="url">URL</Label>
                <Input
                  id="url"
                  {...form.register("url")}
                  placeholder="https://example.com/feed.xml"
                  className="bg-card border-border/50"
                />
                {form.formState.errors.url && (
                  <p className="text-sm text-red-500">{form.formState.errors.url.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Tipo</Label>
                <Select 
                  value={form.watch("type")} 
                  onValueChange={(value) => form.setValue("type", value as any)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo da fonte" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rss">RSS Feed</SelectItem>
                    <SelectItem value="blog">Blog</SelectItem>
                    <SelectItem value="news">News Site</SelectItem>
                  </SelectContent>
                </Select>
                  {form.formState.errors.type && (
                    <p className="text-sm text-red-500">{form.formState.errors.type.message}</p>
                  )}
                </div>
              <Button type="submit" className="w-full" disabled={createSource.isPending}>
                {createSource.isPending ? "Adicionando..." : "Adicionar Fonte"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </PageHeader>

      {/* Client Selector */}
      <Card className="mb-6 bg-card border-border/50">
        <CardHeader>
          <CardTitle>Selecionar Cliente</CardTitle>
          <CardDescription>
            Escolha um cliente para visualizar e gerenciar suas fontes de conteúdo.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={selectedClient} onValueChange={setSelectedClient}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione um cliente para ver as fontes" />
            </SelectTrigger>
            <SelectContent>
              {clients?.map((client) => (
                <SelectItem key={client.id} value={client.id}>
                  {client.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Sources Grid */}
      {selectedClient && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-display font-bold">
              Fontes {sources && `(${sources.length})`}
            </h2>
          </div>

          {sources && sources.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {sources.map((source, index) => (
                <motion.div
                  key={source.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, ease: "easeOut", delay: index * 0.05 }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Card className="bg-card border-border/50 hover:border-border cursor-pointer h-full transition-colors">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          {getSourceIcon(source.type)}
                          <CardTitle className="text-lg">{source.name}</CardTitle>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteSource(source.id)}
                          disabled={deleteSource.isPending}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                      <Badge variant="outline" className={getTypeColor(source.type)}>
                      {source.type}
                    </Badge>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline flex items-center gap-1"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Visitar Fonte
                      </a>
                      {source.lastScrapedAt && (
                        <p className="text-xs text-muted-foreground">
                          Última coleta: {new Date(source.lastScrapedAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2 }}
              className="col-span-full py-12 text-center bg-card border-border/50 rounded-xl"
            >
              <Globe className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Nenhuma fonte ainda</h3>
              <p className="text-muted-foreground mb-4">
                Adicione sua primeira fonte de conteúdo para começar a coletar.
              </p>
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Sua Primeira Fonte
              </Button>
            </motion.div>
          )}
        </div>
      )}

      {!selectedClient && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
          className="py-12 text-center bg-card border-border/50 rounded-xl"
        >
          <Globe className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">Selecione um cliente</h3>
          <p className="text-muted-foreground">
            Escolha um cliente para visualizar e gerenciar suas fontes de conteúdo.
          </p>
        </motion.div>
      )}
    </div>
  );
}