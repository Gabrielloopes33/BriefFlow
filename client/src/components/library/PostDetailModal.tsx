import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { LibraryPostItem, usePostDetail, useUpdatePostStatus } from "@/hooks/use-posts-library";
import { PostStatusBadge } from "@/components/library/PostStatusBadge";
import { PostStatusActions } from "@/components/library/PostStatusActions";
import { useToast } from "@/hooks/use-toast";

interface Props {
  post: LibraryPostItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PostDetailModal({ post, open, onOpenChange }: Props) {
  const { toast } = useToast();
  const { data: detail } = usePostDetail(post?.id ?? null);
  const statusMutation = useUpdatePostStatus();

  if (!post) {
    return <Dialog open={open} onOpenChange={onOpenChange} />;
  }

  const currentPost = detail ?? post;

  async function handleChangeStatus(nextStatus: any) {
    try {
      await statusMutation.mutateAsync({ postId: currentPost.id, status: nextStatus });
      toast({ title: "Status atualizado", description: "Fluxo de aprovação atualizado com sucesso." });
    } catch (error: any) {
      toast({
        title: "Falha ao atualizar status",
        description: error?.message || "Não foi possível atualizar o status do post.",
        variant: "destructive",
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle className="pr-10">{currentPost.title || "Sem título"}</DialogTitle>
          <DialogDescription className="flex items-center gap-2">
            <span>{currentPost.client_name}</span>
            <span>•</span>
            <span>{new Date(currentPost.created_at).toLocaleString("pt-BR")}</span>
            <PostStatusBadge status={currentPost.status} />
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-md border border-border/50 p-3">
          <p className="text-xs text-muted-foreground mb-2">Ações disponíveis</p>
          <PostStatusActions
            status={currentPost.status}
            onChangeStatus={handleChangeStatus}
            disabled={statusMutation.isPending}
          />
        </div>

        <div className="max-h-[60vh] overflow-auto rounded-md border border-border/50 bg-secondary/20 p-4">
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{currentPost.content || "Sem conteúdo"}</p>
        </div>

        <div className="rounded-md border border-border/50 p-3 space-y-2">
          <p className="text-xs text-muted-foreground">Histórico de status</p>
          {detail?.history?.length ? (
            <div className="space-y-2 max-h-36 overflow-auto">
              {detail.history.map((item) => (
                <div key={item.id} className="text-xs text-muted-foreground">
                  <span className="text-foreground">{item.from_status || "(inicial)"}</span>
                  <span> → </span>
                  <span className="text-foreground">{item.to_status}</span>
                  <span> • {new Date(item.changed_at).toLocaleString("pt-BR")}</span>
                  <span> • por {item.changed_by || "sistema"}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Sem registros de mudança.</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
