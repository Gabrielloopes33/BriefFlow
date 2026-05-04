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
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={() => onChangeStatus("in_production")} disabled={disabled}>
          Iniciar produção
        </Button>
        <Button size="sm" variant="outline" onClick={() => onChangeStatus("in_approval")} disabled={disabled}>
          Enviar para aprovação
        </Button>
      </div>
    );
  }

  if (status === "in_production") {
    return (
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={() => onChangeStatus("in_approval")} disabled={disabled}>
          Enviar para aprovação
        </Button>
        <Button size="sm" variant="outline" onClick={() => onChangeStatus("needs_adjustment")} disabled={disabled}>
          Marcar ajuste
        </Button>
      </div>
    );
  }

  if (status === "needs_adjustment") {
    return (
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={() => onChangeStatus("in_production")} disabled={disabled}>
          Retomar produção
        </Button>
        <Button size="sm" variant="outline" onClick={() => onChangeStatus("draft")} disabled={disabled}>
          Voltar rascunho
        </Button>
      </div>
    );
  }

  if (status === "ready_review") {
    return (
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={() => onChangeStatus("approved")} disabled={disabled}>
          Aprovar
        </Button>
        <Button size="sm" variant="outline" onClick={() => onChangeStatus("needs_adjustment")} disabled={disabled}>
          Solicitar ajuste
        </Button>
        <Button size="sm" variant="outline" onClick={() => onChangeStatus("draft")} disabled={disabled}>
          Devolver para rascunho
        </Button>
      </div>
    );
  }

  if (status === "in_approval") {
    return (
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={() => onChangeStatus("approved")} disabled={disabled}>
          Aprovar
        </Button>
        <Button size="sm" variant="outline" onClick={() => onChangeStatus("needs_adjustment")} disabled={disabled}>
          Solicitar ajuste
        </Button>
      </div>
    );
  }

  if (status === "approved") {
    return (
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={() => onChangeStatus("scheduled")} disabled={disabled}>
          Agendar
        </Button>
        <Button size="sm" variant="outline" onClick={() => onChangeStatus("published")} disabled={disabled}>
          Publicar direto
        </Button>
      </div>
    );
  }

  if (status === "scheduled") {
    return (
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={() => onChangeStatus("published")} disabled={disabled}>
          Marcar como publicado
        </Button>
        <Button size="sm" variant="outline" onClick={() => onChangeStatus("in_approval")} disabled={disabled}>
          Reabrir aprovação
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
