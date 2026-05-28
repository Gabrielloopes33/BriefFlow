import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { SwipeableCard } from "@/components/SwipeableCard";
import { useSources, useCreateSource, useDeleteSource } from "@/hooks/use-sources";
import { useClientMoodboard, useUploadMoodboardImages } from "@/hooks/use-client-moodboard";
import { useUploadDocument } from "@/hooks/use-client-documents";
import { useToast } from "@/hooks/use-toast";
import { Plus, Globe, ExternalLink, Rss, Newspaper, Loader2, Upload, File, ImagePlus, X } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { DocumentList } from "@/components/knowledge/DocumentList";
import { MoodboardGrid } from "@/components/moodboard/MoodboardGrid";
import { cn } from "@/lib/utils";

const sourceSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  url: z.string().url("URL inválida"),
  type: z.enum(["rss", "blog", "news"]),
});

type SourceFormData = z.infer<typeof sourceSchema>;

const DOCUMENT_EXTS = [".pdf", ".md", ".txt", ".docx", ".csv", ".json"];
const IMAGE_EXTS = [".jpg", ".jpeg", ".png", ".webp", ".gif"];

function isDocumentFile(file: File): boolean {
  const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
  return DOCUMENT_EXTS.includes(ext);
}

function isImageFile(file: File): boolean {
  const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
  return IMAGE_EXTS.includes(ext);
}

interface SourcesTabProps {
  clientId: string;
}

export function SourcesTab({ clientId }: SourcesTabProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const { data: sources, isLoading } = useSources(clientId);
  const createSource = useCreateSource();
  const deleteSource = useDeleteSource();
  const { data: moodboardImages } = useClientMoodboard(clientId);
  const uploadDocument = useUploadDocument(clientId);
  const uploadMoodboardImages = useUploadMoodboardImages(clientId);
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

  const selectedSummary = useMemo(() => {
    const documents = selectedFiles.filter(isDocumentFile).length;
    const images = selectedFiles.filter(isImageFile).length;
    return { documents, images };
  }, [selectedFiles]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).filter((file) => isDocumentFile(file) || isImageFile(file));
    if (files.length > 0) {
      setSelectedFiles((prev) => [...prev, ...files].slice(0, 20));
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files).filter((file) => isDocumentFile(file) || isImageFile(file));
    if (files.length > 0) {
      setSelectedFiles((prev) => [...prev, ...files].slice(0, 20));
    }
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;

    const documentFiles = selectedFiles.filter(isDocumentFile);
    const imageFiles = selectedFiles.filter(isImageFile);

    try {
      for (const file of documentFiles) {
        await uploadDocument.mutateAsync(file);
      }
      if (imageFiles.length > 0) {
        await uploadMoodboardImages.mutateAsync(imageFiles);
      }

      setSelectedFiles([]);
      toast({
        title: "Arquivos enviados",
        description: "Os arquivos foram adicionados às fontes do cliente.",
      });
    } catch (error: any) {
      toast({
        title: "Falha no upload",
        description: error?.message || "Não foi possível enviar os arquivos.",
        variant: "destructive",
      });
    }
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
            Gerencie links e arquivos de referência para este cliente
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

      <Card className="border-border/50 bg-card/80">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Upload único de fontes</CardTitle>
          <CardDescription>
            Envie PDFs, MD, DOCX e outros arquivos de texto, ou imagens de referência, no mesmo ponto de entrada.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            className={cn(
              "border-2 border-dashed rounded-xl p-6 text-center transition-colors cursor-pointer",
              dragOver ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/50"
            )}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => document.getElementById("sources-upload")?.click()}
          >
            <Upload className="w-7 h-7 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm font-medium">Arraste arquivos ou clique para selecionar</p>
            <p className="text-xs text-muted-foreground mt-1">
              PDFs, MD, TXT, DOCX, CSV, JSON, JPG, PNG, WEBP, GIF
            </p>
            <input
              id="sources-upload"
              type="file"
              className="hidden"
              accept=".pdf,.md,.txt,.docx,.csv,.json,.jpg,.jpeg,.png,.webp,.gif"
              multiple
              onChange={handleFileSelect}
            />
          </div>

          {selectedFiles.length > 0 ? (
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{selectedFiles.length} arquivo(s) selecionado(s)</span>
                <span>{selectedSummary.documents} texto(s) e {selectedSummary.images} imagem(ns)</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {selectedFiles.map((file, index) => {
                  const isImage = isImageFile(file);
                  return (
                    <div key={`${file.name}-${index}`} className="flex items-center gap-2 rounded-full border bg-secondary/40 px-3 py-1 text-xs">
                      <span className="inline-flex items-center gap-1">
                        {isImage ? <ImagePlus className="w-3 h-3" /> : <File className="w-3 h-3" />}
                        {file.name}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedFiles((prev) => prev.filter((_, idx) => idx !== index));
                        }}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
              <div className="flex gap-2">
                <Button onClick={handleUpload} disabled={uploadDocument.isPending || uploadMoodboardImages.isPending} className="flex-1">
                  {(uploadDocument.isPending || uploadMoodboardImages.isPending) ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4 mr-2" />
                  )}
                  {(uploadDocument.isPending || uploadMoodboardImages.isPending) ? "Enviando..." : "Enviar para fontes"}
                </Button>
                <Button variant="outline" onClick={() => setSelectedFiles([])} disabled={uploadDocument.isPending || uploadMoodboardImages.isPending}>
                  Limpar
                </Button>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

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

      <div className="space-y-3 pt-2 border-t border-border/50">
        <div>
          <h3 className="text-lg font-medium">Arquivos de referência</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Envie PDF, MD, DOCX, TXT, CSV ou JSON para complementar as fontes deste cliente.
          </p>
        </div>
        <DocumentList clientId={clientId} showUpload={false} />
      </div>

      <div className="space-y-3 pt-2 border-t border-border/50">
        <div>
          <h3 className="text-lg font-medium">Referências visuais</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Logos, criativos e imagens de inspiração alimentam a direção visual do agente.
          </p>
        </div>
        <MoodboardGrid clientId={clientId} showUpload={false} />
      </div>
    </div>
  );
}
