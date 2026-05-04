import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LibraryPostItem } from "@/hooks/use-posts-library";
import { Eye, ExternalLink, Wand2 } from "lucide-react";
import { PostStatusBadge } from "@/components/library/PostStatusBadge";

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

  function handleOpenCreative() {
    if (post.creative_id) {
      window.location.href = `/creatives/${post.creative_id}/edit`;
      return;
    }
    window.location.href = `/creatives/new?client_id=${post.client_id}&post_id=${post.id}`;
  }

  return (
    <Card className="border-border/60 bg-card/70">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">{post.client_name}</p>
            <h3 className="font-semibold leading-tight truncate">{post.title || "Sem título"}</h3>
          </div>
          <PostStatusBadge status={post.status} />
        </div>

        <p className="text-sm text-muted-foreground line-clamp-2 whitespace-pre-wrap min-h-[2.5rem]">
          {post.content || "Sem conteúdo"}
        </p>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{created}</span>
          <span>{post.stage_tag ? `Tag: ${post.stage_tag}` : "Sem tag"}</span>
        </div>

        {post.scheduled_for ? (
          <div className="text-xs text-cyan-300">
            Agendado para: {new Date(post.scheduled_for).toLocaleString("pt-BR")}
          </div>
        ) : null}

        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="flex-1" onClick={() => onOpenDetail(post)}>
            <Eye className="w-4 h-4 mr-2" />
            Visualizar
          </Button>
          <Button size="sm" className="flex-1" onClick={handleOpenCreative}>
            {post.creative_id ? (
              <>
                <ExternalLink className="w-4 h-4 mr-2" />
                Editar Creative
              </>
            ) : (
              <>
                <Wand2 className="w-4 h-4 mr-2" />
                Criar Creative
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
