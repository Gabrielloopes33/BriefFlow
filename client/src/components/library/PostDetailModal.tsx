import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { LibraryPostItem } from "@/hooks/use-posts-library";

const STATUS_LABEL: Record<string, string> = {
  draft: "Rascunho",
  ready_review: "Em revisão",
  approved: "Aprovado",
  rejected: "Rejeitado",
  published: "Publicado",
};

interface Props {
  post: LibraryPostItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PostDetailModal({ post, open, onOpenChange }: Props) {
  if (!post) {
    return <Dialog open={open} onOpenChange={onOpenChange} />;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle className="pr-10">{post.title || "Sem título"}</DialogTitle>
          <DialogDescription className="flex items-center gap-2">
            <span>{post.client_name}</span>
            <span>•</span>
            <span>{new Date(post.created_at).toLocaleString("pt-BR")}</span>
            <Badge variant="secondary">{STATUS_LABEL[post.status] || post.status}</Badge>
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-auto rounded-md border border-border/50 bg-secondary/20 p-4">
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{post.content || "Sem conteúdo"}</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
