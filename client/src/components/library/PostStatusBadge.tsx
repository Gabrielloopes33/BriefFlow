import { Badge } from "@/components/ui/badge";
import { LibraryPostStatus } from "@/hooks/use-posts-library";

const STATUS_LABEL: Record<LibraryPostStatus, string> = {
  draft: "Rascunho",
  ready_review: "Em revisão",
  approved: "Aprovado",
  rejected: "Rejeitado",
  published: "Publicado",
};

const STATUS_BADGE_CLASS: Record<LibraryPostStatus, string> = {
  draft: "bg-secondary text-secondary-foreground",
  ready_review: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  approved: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  rejected: "bg-rose-500/20 text-rose-300 border-rose-500/30",
  published: "bg-blue-500/20 text-blue-300 border-blue-500/30",
};

interface Props {
  status: LibraryPostStatus;
}

export function PostStatusBadge({ status }: Props) {
  return (
    <Badge className={STATUS_BADGE_CLASS[status] || STATUS_BADGE_CLASS.draft}>
      {STATUS_LABEL[status] || status}
    </Badge>
  );
}
