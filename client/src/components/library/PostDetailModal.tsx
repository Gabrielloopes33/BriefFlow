import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  LibraryPostItem,
  LibraryPostStatus,
  usePostDetail,
  useUpdatePostStatus,
  useUpdatePost,
  ColorLabel,
  PostFormatType,
} from "@/hooks/use-posts-library";
import { PostStatusBadge } from "@/components/library/PostStatusBadge";
import { PostStatusActions } from "@/components/library/PostStatusActions";
import { ColorLabelPicker } from "@/components/posts/ColorLabelPicker";
import { TagInput } from "@/components/posts/TagInput";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { usePostTags } from "@/hooks/use-post-tags";
import { useEnsurePostCreative } from "@/hooks/use-posts-library";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Image, Video, Type, FileText, Layers } from "lucide-react";

interface Props {
  post: LibraryPostItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const FORMAT_ICONS: Record<string, React.ReactNode> = {
  carousel: <Layers className="w-4 h-4" />,
  reels: <Video className="w-4 h-4" />,
  static: <Image className="w-4 h-4" />,
  story: <FileText className="w-4 h-4" />,
  text: <Type className="w-4 h-4" />,
};

const FORMAT_LABELS: Record<string, string> = {
  carousel: "Carrossel",
  reels: "Reels",
  static: "Estático",
  story: "Story",
  text: "Texto",
};

export function PostDetailModal({ post, open, onOpenChange }: Props) {
  const { toast } = useToast();
  const { data: detail } = usePostDetail(post?.id ?? null);
  const statusMutation = useUpdatePostStatus();
  const updatePostMutation = useUpdatePost();
  const ensureCreativeMutation = useEnsurePostCreative();
  const { data: tenantTags = [] } = usePostTags();

  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<{
    title: string;
    scheduled_for: string;
    tags: string[];
    format_type: PostFormatType;
    notes: string;
    color_label: string;
  }>({
    title: "",
    scheduled_for: "",
    tags: [],
    format_type: "carousel",
    notes: "",
    color_label: "",
  });

  const currentPost = detail ?? post;
  const creativeId = currentPost?.creative_id ?? null;

  useEffect(() => {
    if (currentPost) {
      setEditForm({
        title: currentPost.title || "",
        scheduled_for: currentPost.scheduled_for
          ? new Date(currentPost.scheduled_for).toISOString().slice(0, 16)
          : "",
        tags: currentPost.tags || [],
        format_type: (currentPost.format_type as PostFormatType) || "carousel",
        notes: currentPost.notes || "",
        color_label: currentPost.color_label || "",
      });
    }
  }, [currentPost?.id]);

  if (!post) {
    return <Dialog open={open} onOpenChange={onOpenChange} />;
  }

  // Use post (guaranteed non-null here) for id references
  const safePost = currentPost ?? post;

  async function handleChangeStatus(nextStatus: LibraryPostStatus) {
    try {
      await statusMutation.mutateAsync({ postId: safePost.id, status: nextStatus });
      toast({ title: "Status atualizado", description: "Fluxo de aprovação atualizado com sucesso." });
    } catch (error: any) {
      toast({
        title: "Falha ao atualizar status",
        description: error?.message || "Não foi possível atualizar o status do post.",
        variant: "destructive",
      });
    }
  }

  async function handleSaveEdit() {
    try {
      const payload: {
        title?: string | null;
        scheduled_for?: string | null;
        tags?: string[];
        format_type?: PostFormatType;
        notes?: string | null;
        color_label?: ColorLabel;
      } = {
        title: editForm.title || null,
        scheduled_for: editForm.scheduled_for || null,
        tags: editForm.tags,
        format_type: editForm.format_type,
        notes: editForm.notes || null,
        color_label: (editForm.color_label || null) as ColorLabel,
      };

      await updatePostMutation.mutateAsync({
        postId: safePost.id,
        payload,
      });
      setIsEditing(false);
      toast({ title: "Post atualizado", description: "As alterações foram salvas com sucesso." });
    } catch (error: any) {
      toast({
        title: "Falha ao salvar",
        description: error?.message || "Não foi possível salvar as alterações.",
        variant: "destructive",
      });
    }
  }

  const formatType = safePost.format_type || "carousel";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="pr-10">{safePost.title || "Sem título"}</DialogTitle>
          <DialogDescription className="flex items-center gap-2 flex-wrap">
            <span>{safePost.client_name}</span>
            <span>•</span>
            <span>{new Date(safePost.created_at).toLocaleString("pt-BR")}</span>
            <PostStatusBadge status={safePost.status} />
            <Badge variant="outline" className="gap-1">
              {FORMAT_ICONS[formatType]}
              {FORMAT_LABELS[formatType]}
            </Badge>
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-md border border-border/50 p-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-muted-foreground">Ações disponíveis</p>
            <div className="flex gap-2">
              {creativeId ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.location.href = `/creatives/${creativeId}/edit`}
                >
                  Ver criativo
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    try {
                      const result = await ensureCreativeMutation.mutateAsync(safePost.id);
                      window.location.href = `/creatives/${result.creativeId}/edit`;
                    } catch (error: any) {
                      toast({
                        title: "Falha ao abrir criativo",
                        description: error?.message || "Não foi possível criar o criativo deste post.",
                        variant: "destructive",
                      });
                    }
                  }}
                  disabled={ensureCreativeMutation.isPending}
                >
                  {ensureCreativeMutation.isPending ? "Preparando..." : "Abrir criativo"}
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditing(!isEditing)}
              >
                {isEditing ? "Cancelar" : "Editar"}
              </Button>
            </div>
          </div>

          {!isEditing ? (
            <PostStatusActions
              status={safePost.status}
              onChangeStatus={handleChangeStatus}
              disabled={statusMutation.isPending}
            />
          ) : (
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Título</Label>
                <Input
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  placeholder="Título do post"
                />
              </div>
              <div>
                <Label className="text-xs">Agendamento</Label>
                <Input
                  type="datetime-local"
                  value={editForm.scheduled_for}
                  onChange={(e) => setEditForm({ ...editForm, scheduled_for: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-xs">Formato</Label>
                <select
                  value={editForm.format_type}
                  onChange={(e) => setEditForm({ ...editForm, format_type: e.target.value as PostFormatType })}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="carousel">Carrossel</option>
                  <option value="reels">Reels</option>
                  <option value="static">Estático</option>
                  <option value="story">Story</option>
                  <option value="text">Texto</option>
                </select>
              </div>
              <div>
                <Label className="text-xs">Tags</Label>
                <TagInput
                  tags={editForm.tags}
                  onChange={(tags) => setEditForm({ ...editForm, tags })}
                  suggestions={tenantTags}
                />
              </div>
              <div>
                <Label className="text-xs">Label de cor</Label>
                <ColorLabelPicker
                  value={editForm.color_label}
                  onChange={(color_label) => setEditForm({ ...editForm, color_label })}
                />
              </div>
              <div>
                <Label className="text-xs">Notas</Label>
                <Textarea
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  placeholder="Notas internas..."
                  rows={3}
                />
              </div>
              <Button
                onClick={handleSaveEdit}
                disabled={updatePostMutation.isPending}
                className="w-full"
              >
                {updatePostMutation.isPending ? "Salvando..." : "Salvar alterações"}
              </Button>
            </div>
          )}

          {!isEditing && (
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-muted-foreground">
              <span>Tag de etapa: {safePost.stage_tag || "--"}</span>
              <span>
                Agendamento: {safePost.scheduled_for ? new Date(safePost.scheduled_for).toLocaleString("pt-BR") : "--"}
              </span>
              <span>Formato: {FORMAT_LABELS[formatType]}</span>
              <span>Label: {safePost.color_label || "--"}</span>
              {safePost.tags && safePost.tags.length > 0 && (
                <span className="sm:col-span-2 flex items-center gap-1">
                  Tags:
                  {safePost.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-[10px]">{tag}</Badge>
                  ))}
                </span>
              )}
            </div>
          )}
        </div>

        <div className="max-h-[40vh] overflow-auto rounded-md border border-border/50 bg-secondary/20 p-4">
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{safePost.content || "Sem conteúdo"}</p>
        </div>

        {safePost.notes && !isEditing && (
          <div className="rounded-md border border-border/50 p-3">
            <p className="text-xs text-muted-foreground mb-1">Notas internas</p>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{safePost.notes}</p>
          </div>
        )}

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
