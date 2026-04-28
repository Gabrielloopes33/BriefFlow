import { Button } from "@/components/ui/button";
import { LibraryPostStatus } from "@/hooks/use-posts-library";

interface Props {
  status: LibraryPostStatus;
  onChangeStatus: (next: LibraryPostStatus) => void;
  disabled?: boolean;
}

export function PostStatusActions({ status, onChangeStatus, disabled }: Props) {
  if (status === "published") {
    return null;
  }

  if (status === "draft") {
    return (
      <Button size="sm" onClick={() => onChangeStatus("ready_review")} disabled={disabled}>
        Enviar para revisão
      </Button>
    );
  }

  if (status === "ready_review") {
    return (
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={() => onChangeStatus("approved")} disabled={disabled}>
          Aprovar
        </Button>
        <Button size="sm" variant="outline" onClick={() => onChangeStatus("draft")} disabled={disabled}>
          Devolver para rascunho
        </Button>
      </div>
    );
  }

  if (status === "approved") {
    return (
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={() => onChangeStatus("published")} disabled={disabled}>
          Marcar como publicado
        </Button>
        <Button size="sm" variant="outline" onClick={() => onChangeStatus("ready_review")} disabled={disabled}>
          Devolver para revisão
        </Button>
      </div>
    );
  }

  if (status === "rejected") {
    return (
      <Button size="sm" onClick={() => onChangeStatus("draft")} disabled={disabled}>
        Voltar para rascunho
      </Button>
    );
  }

  return null;
}
