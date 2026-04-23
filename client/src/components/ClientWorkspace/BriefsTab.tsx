import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useBriefs, useGenerateBrief } from "@/hooks/use-briefs";
import { useToast } from "@/hooks/use-toast";
import { Sparkles, FileText, Calendar, Plus, Loader2, Bot } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const briefSchema = z.object({
  topic: z.string().min(1, "Tópico é obrigatório"),
});

type BriefFormData = z.infer<typeof briefSchema>;

interface BriefsTabProps {
  clientId: string;
}

export function BriefsTab({ clientId }: BriefsTabProps) {
  const [search, setSearch] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { data: briefs, isLoading } = useBriefs(clientId);
  const generateBrief = useGenerateBrief();
  const { toast } = useToast();

  const form = useForm<BriefFormData>({
    resolver: zodResolver(briefSchema),
  });

  const onSubmit = (data: BriefFormData) => {
    generateBrief.mutate({
      clientId,
      topic: data.topic,
    }, {
      onSuccess: () => {
        form.reset();
        setIsDialogOpen(false);
      }
    });
  };

  const filteredBriefs = briefs?.filter(b =>
    b.title.toLowerCase().includes(search.toLowerCase()) ||
    b.angle?.toLowerCase().includes(search.toLowerCase())
  ) || [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
      case 'approved':
        return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'rejected':
        return 'bg-red-500/10 text-red-500 border-red-500/20';
      default:
        return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'draft':
        return 'Rascunho';
      case 'approved':
        return 'Aprovado';
      case 'rejected':
        return 'Rejeitado';
      default:
        return 'Rascunho';
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
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 relative">
          <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar pautas..."
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Bot className="w-4 h-4 mr-2" />
              Gerar com IA
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Gerar Nova Pauta com IA</DialogTitle>
            </DialogHeader>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="topic" className="text-sm font-medium">
                  Tópico da Pauta
                </label>
                <Input
                  id="topic"
                  {...form.register("topic")}
                  placeholder="Exemplo: Tendências de marketing digital"
                />
                {form.formState.errors.topic && (
                  <p className="text-sm text-red-500">{form.formState.errors.topic.message}</p>
                )}
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={generateBrief.isPending}
              >
                {generateBrief.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Gerando...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Gerar Pauta
                  </>
                )}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {filteredBriefs && filteredBriefs.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredBriefs.map((brief) => (
            <Card key={brief.id} className="card-hover border-border/50">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg line-clamp-2 mb-2">
                      {brief.title}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={getStatusColor(brief.status)}>
                        {getStatusLabel(brief.status)}
                      </Badge>
                      {(brief.generatedBy === 'claude' || brief.generatedBy?.startsWith('openai') || brief.generatedBy?.startsWith('gpt')) && (
                        <Badge variant="outline" className="bg-purple-500/10 text-purple-500 border-purple-500/20">
                          <Bot className="w-3 h-3 mr-1" />
                          IA
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Sparkles className="w-5 h-5 text-primary shrink-0" />
                </div>
              </CardHeader>
              <CardContent>
                {brief.angle && (
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                    <strong>Ângulo:</strong> {brief.angle}
                  </p>
                )}
                {brief.keyPoints && Array.isArray(brief.keyPoints) && brief.keyPoints.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs font-medium mb-2">Pontos-chave:</p>
                    <ul className="space-y-1">
                      {brief.keyPoints.slice(0, 3).map((point: any, index: number) => (
                        <li key={index} className="text-xs text-muted-foreground flex items-start gap-2">
                          <span className="text-primary">•</span>
                          <span className="line-clamp-1">{point}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border/50">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(brief.createdAt!).toLocaleDateString('pt-BR')}
                  </div>
                  <span className="text-primary font-medium">Ver detalhes →</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-12 text-center">
          <Sparkles className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">
            {search ? 'Nenhum resultado encontrado' : 'Nenhuma pauta ainda'}
          </h3>
          <p className="text-muted-foreground mb-4">
            {search
              ? 'Tente uma busca diferente ou gere uma nova pauta com IA.'
              : 'Gere sua primeira pauta usando inteligência artificial.'
            }
          </p>
          {!search && (
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Gerar Primeira Pauta
            </Button>
          )}
        </Card>
      )}
    </div>
  );
}
