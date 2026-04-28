import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface StudioPost {
  id: string;
  title?: string;
  content?: string;
}

interface GenerationResultProps {
  post: StudioPost | null;
  creativeId?: string;
  creativeEntryHref?: string;
}

export function GenerationResult({ post, creativeId, creativeEntryHref }: GenerationResultProps) {
  if (!post) return null;

  return (
    <Card className="border-border/60 bg-card/70">
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-lg">{post.title || "Conteúdo gerado"}</CardTitle>
          <Badge variant="secondary">Pronto</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-6">
          {post.content || "Sem preview disponível."}
        </p>
        <div className="flex flex-wrap gap-2">
          {creativeId ? (
            <a href={`/creatives/${creativeId}/edit`}>
              <Button>Abrir no Studio Visual</Button>
            </a>
          ) : creativeEntryHref ? (
            <a href={creativeEntryHref}>
              <Button>Levar para Creative</Button>
            </a>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
