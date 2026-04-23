import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LibraryPostItem } from "@/hooks/use-posts-library";
import { ExternalLink, Eye } from "lucide-react";

const STATUS_LABEL: Record<string, string> = {
  draft: "Rascunho",
  ready_review: "Em revisão",
  approved: "Aprovado",
  rejected: "Rejeitado",
  published: "Publicado",
};

const STATUS_BADGE_CLASS: Record<string, string> = {
  draft: "bg-secondary text-secondary-foreground",
  ready_review: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  approved: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  rejected: "bg-rose-500/20 text-rose-300 border-rose-500/30",
  published: "bg-blue-500/20 text-blue-300 border-blue-500/30",
};

interface Props {
  post: LibraryPostItem;
  onOpenDetail: (post: LibraryPostItem) => void;
}

export function PostCard({ post, onOpenDetail }: Props) {
  const created = new Date(post.created_at).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  return (
    <Card className="border-border/60 bg-card/70">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">{post.client_name}</p>
            <h3 className="font-semibold leading-tight truncate">{post.title || "Sem título"}</h3>
          </div>
          <Badge className={STATUS_BADGE_CLASS[post.status] || STATUS_BADGE_CLASS.draft}>
            {STATUS_LABEL[post.status] || post.status}
          </Badge>
        </div>

        <p className="text-sm text-muted-foreground line-clamp-2 whitespace-pre-wrap min-h-[2.5rem]">
          {post.content || "Sem conteúdo"}
        </p>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{created}</span>
          <span>Nota do revisor: --/10</span>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="flex-1" onClick={() => onOpenDetail(post)}>
            <Eye className="w-4 h-4 mr-2" />
            Visualizar
          </Button>
          {post.creative_id ? (
            <Button asChild size="sm" className="flex-1">
              <a href={`/creatives/${post.creative_id}/edit`}>
                <ExternalLink className="w-4 h-4 mr-2" />
                Editor visual
              </a>
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
