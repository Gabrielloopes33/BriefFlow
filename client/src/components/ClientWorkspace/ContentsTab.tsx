import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useClientPostsList } from "@/hooks/use-client-workspace";
import { Calendar, FileText, Loader2, Search, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { PostStatusBadge } from "@/components/library/PostStatusBadge";

interface ContentsTabProps {
  clientId: string;
}

export function ContentsTab({ clientId }: ContentsTabProps) {
  const [search, setSearch] = useState("");
  const { data: posts, isLoading, isError, error } = useClientPostsList(clientId);

  const filteredPosts = posts?.filter((p) =>
    (p.title || "").toLowerCase().includes(search.toLowerCase()) ||
    (p.content || "").toLowerCase().includes(search.toLowerCase()) ||
    (p.stage_tag || "").toLowerCase().includes(search.toLowerCase())
  ) || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isError) {
    return (
      <Card className="p-8 text-center border-destructive/30">
        <h3 className="text-lg font-medium mb-2">Falha ao carregar conteúdos</h3>
        <p className="text-sm text-muted-foreground">
          {(error as any)?.message || "Não foi possível buscar os conteúdos deste cliente agora."}
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar conteúdos..."
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button variant="outline" size="icon">
          <Filter className="w-4 h-4" />
        </Button>
      </div>

      {filteredPosts && filteredPosts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredPosts.map((post) => (
            <Card key={post.id} className="card-hover border-border/50">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg line-clamp-2 mb-2">
                      {post.title || "Conteúdo sem título"}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <PostStatusBadge status={post.status} />
                      <Badge variant="outline" className="bg-secondary/30">
                        {post.stage_tag || "sem tag"}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-3 mb-3">
                  {post.content || "Sem conteúdo disponível."}
                </p>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {post.scheduled_for
                      ? new Date(post.scheduled_for).toLocaleDateString('pt-BR')
                      : new Date(post.created_at).toLocaleDateString('pt-BR')}
                  </div>
                  <div className="flex items-center gap-1">
                    <FileText className="w-3 h-3" />
                    {(post.content || "").length} caracteres
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-12 text-center">
          <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">
            {search ? 'Nenhum resultado encontrado' : 'Nenhum conteúdo deste cliente ainda'}
          </h3>
          <p className="text-muted-foreground mb-4">
            {search
              ? 'Tente uma busca diferente ou ajuste os filtros.'
              : 'Os conteúdos gerados para este cliente aparecerão aqui automaticamente.'
            }
          </p>
          {!search && (
            <div className="flex gap-2 justify-center">
              <Button variant="outline" onClick={() => window.location.href = `?tab=calendar`}>
                Ver Calendário
              </Button>
              <Button onClick={() => window.location.href = `?tab=kanban`}>
                Ver Kanban
              </Button>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
