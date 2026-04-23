import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { SwipeableCard } from "@/components/SwipeableCard";
import { useSources, useCreateSource, useDeleteSource } from "@/hooks/use-sources";
import { useToast } from "@/hooks/use-toast";
import { Plus, Globe, ExternalLink, Rss, Newspaper, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const sourceSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  url: z.string().url("URL inválida"),
  type: z.enum(["rss", "blog", "news"]),
});

type SourceFormData = z.infer<typeof sourceSchema>;

interface SourcesTabProps {
  clientId: string;
}

export function SourcesTab({ clientId }: SourcesTabProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { data: sources, isLoading } = useSources(clientId);
  const createSource = useCreateSource();
  const deleteSource = useDeleteSource();
  const { toast } = useToast();

  const form = useForm<SourceFormData>({
    resolver: zodResolver(sourceSchema),
  });

  const onSubmit = (formData: SourceFormData) => {
    createSource.mutate({
      clientId,
      name: formData.name,
      url: formData.url,
      type: formData.type,
    }, {
      onSuccess: () => {
        form.reset();
        setIsDialogOpen(false);
      }
    });
  };

  const handleDeleteSource = (sourceId: string) => {
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-display font-bold">
            Fontes {sources && `(${sources.length})`}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Gerencie as fontes de conteúdo para este cliente
          </p>
        </div>
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
                <Label htmlFor="name">Nome da Fonte</Label>
                <Input
                  id="name"
                  {...form.register("name")}
                  placeholder="Exemplo: TechCrunch"
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
                      <SelectItem value="news">Site de Notícias</SelectItem>
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
      </div>

      {sources && sources.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sources.map((source) => (
            <SwipeableCard
              key={source.id}
              onDelete={() => handleDeleteSource(source.id)}
              className="border-border/50"
            >
              <Card className="card-hover border-0 shadow-none">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      {getSourceIcon(source.type)}
                      <CardTitle className="text-lg">{source.name}</CardTitle>
                    </div>
                    <Badge variant="outline" className={getTypeColor(source.type)}>
                      {source.type}
                    </Badge>
                  </div>
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
                        Última coleta: {new Date(source.lastScrapedAt).toLocaleDateString('pt-BR')}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </SwipeableCard>
          ))}
        </div>
      ) : (
        <Card className="p-12 text-center">
          <Globe className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">Nenhuma fonte ainda</h3>
          <p className="text-muted-foreground mb-4">
            Adicione sua primeira fonte de conteúdo para começar a coletar dados.
          </p>
          <Button onClick={() => setIsDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Adicionar Sua Primeira Fonte
          </Button>
        </Card>
      )}
    </div>
  );
}
