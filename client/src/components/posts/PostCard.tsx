import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LibraryPostItem, useUpdatePost } from "@/hooks/use-posts-library";
import { Eye, ExternalLink, Wand2, Image, Video, Type, FileText, Layers, Calendar } from "lucide-react";
import { PostStatusBadge } from "@/components/library/PostStatusBadge";
import { getColorBorderClass } from "@/components/posts/ColorLabelPicker";
import { cn } from "@/lib/utils";
import { TagInput } from "@/components/posts/TagInput";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { usePostTags } from "@/hooks/use-post-tags";

interface Props {
  post: LibraryPostItem;
  onOpenDetail: (post: LibraryPostItem) => void;
}

const FORMAT_ICONS: Record<string, React.ReactNode> = {
  carousel: <Layers className="w-3.5 h-3.5" />,
  reels: <Video className="w-3.5 h-3.5" />,
  static: <Image className="w-3.5 h-3.5" />,
  story: <FileText className="w-3.5 h-3.5" />,
  text: <Type className="w-3.5 h-3.5" />,
};

const FORMAT_LABELS: Record<string, string> = {
  carousel: "Carrossel",
  reels: "Reels",
  static: "Estático",
  story: "Story",
  text: "Texto",
};

export function PostCard({ post, onOpenDetail }: Props) {
  const { toast } = useToast();
  const { data: tenantTags = [] } = usePostTags();
  const updatePostMutation = useUpdatePost();
  const [isQuickEditing, setIsQuickEditing] = useState(false);
  const [quickTags, setQuickTags] = useState<string[]>(post.tags || []);
  const [quickScheduledFor, setQuickScheduledFor] = useState(
    post.scheduled_for ? new Date(post.scheduled_for).toISOString().slice(0, 16) : ""
  );

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

  const formatType = post.format_type || "carousel";
  const colorBorder = getColorBorderClass(post.color_label);

  async function handleQuickSave() {
    try {
      await updatePostMutation.mutateAsync({
        postId: post.id,
        payload: {
          tags: quickTags,
          scheduled_for: quickScheduledFor || null,
        },
      });

      setIsQuickEditing(false);
      toast({
        title: "Card atualizado",
        description: "Tags e agendamento salvos com sucesso.",
      });
    } catch (error: any) {
      toast({
        title: "Falha ao salvar",
        description: error?.message || "Não foi possível salvar as alterações rápidas.",
        variant: "destructive",
      });
    }
  }

  function handleCancelQuickEdit() {
    setQuickTags(post.tags || []);
    setQuickScheduledFor(post.scheduled_for ? new Date(post.scheduled_for).toISOString().slice(0, 16) : "");
    setIsQuickEditing(false);
  }

  return (
    <Card className={cn("border-border/60 bg-card/70 border-l-4", colorBorder)}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">{post.client_name}</p>
            <h3 className="font-semibold leading-tight truncate">{post.title || "Sem título"}</h3>
          </div>
          <PostStatusBadge status={post.status} />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="gap-1 text-xs font-normal">
            {FORMAT_ICONS[formatType] || FORMAT_ICONS.carousel}
            {FORMAT_LABELS[formatType] || "Carrossel"}
          </Badge>
          {post.tags && post.tags.length > 0 && (
            <div className="flex gap-1 flex-wrap">
              {post.tags.slice(0, 3).map((tag) => (
                <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0">
                  {tag}
                </Badge>
              ))}
              {post.tags.length > 3 && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                  +{post.tags.length - 3}
                </Badge>
              )}
            </div>
          )}
        </div>

        <p className="text-sm text-muted-foreground line-clamp-2 whitespace-pre-wrap min-h-[2.5rem]">
          {post.content || "Sem conteúdo"}
        </p>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{created}</span>
          <span>{post.stage_tag ? `Tag: ${post.stage_tag}` : "Sem tag"}</span>
        </div>

        {post.scheduled_for ? (
          <div className="flex items-center gap-1 text-xs text-cyan-300">
            <Calendar className="w-3 h-3" />
            Agendado para: {new Date(post.scheduled_for).toLocaleString("pt-BR", {
              day: "2-digit",
              month: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>
        ) : (
          <div className="text-xs text-muted-foreground italic">Sem data</div>
        )}

        {isQuickEditing ? (
          <div className="space-y-2 rounded-md border border-border/60 bg-muted/30 p-2.5">
            <div className="space-y-1">
              <Label className="text-[11px] text-muted-foreground">Tags</Label>
              <TagInput
                tags={quickTags}
                onChange={setQuickTags}
                suggestions={tenantTags}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] text-muted-foreground">Data de agendamento</Label>
              <Input
                type="datetime-local"
                value={quickScheduledFor}
                onChange={(e) => setQuickScheduledFor(e.target.value)}
                className="h-8"
              />
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                className="flex-1"
                disabled={updatePostMutation.isPending}
                onClick={handleQuickSave}
              >
                {updatePostMutation.isPending ? "Salvando..." : "Salvar"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                disabled={updatePostMutation.isPending}
                onClick={handleCancelQuickEdit}
              >
                Cancelar
              </Button>
            </div>
          </div>
        ) : null}

        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="flex-1" onClick={() => onOpenDetail(post)}>
            <Eye className="w-4 h-4 mr-2" />
            Visualizar
          </Button>
          {!isQuickEditing && (
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => setIsQuickEditing(true)}
            >
              Editar rápido
            </Button>
          )}
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
