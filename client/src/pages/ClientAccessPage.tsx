import { useMemo, useState } from "react";
import { useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import {
  usePublicClientAccess,
  usePublicClientMessage,
  usePublicClientStatus,
} from "@/hooks/use-public-client-access";
import { useToast } from "@/hooks/use-toast";

const APPROVAL_STATUSES = [
  { label: "Aprovar", value: "approved" },
  { label: "Solicitar ajuste", value: "needs_adjustment" },
] as const;

export function ClientAccessPage() {
  const { token } = useParams<{ token: string }>();
  const { toast } = useToast();
  const [message, setMessage] = useState("");

  const accessQuery = usePublicClientAccess(token || null);
  const messageMutation = usePublicClientMessage(token || null);
  const statusMutation = usePublicClientStatus(token || null);

  const canComment = Boolean(accessQuery.data?.permissions?.can_comment ?? true);
  const canUpdateStatus = Boolean(accessQuery.data?.permissions?.can_update_status ?? true);

  const expiresText = useMemo(() => {
    if (!accessQuery.data?.expires_at) return "--";
    return new Date(accessQuery.data.expires_at).toLocaleString("pt-BR");
  }, [accessQuery.data?.expires_at]);

  const handleSendMessage = async () => {
    if (!message.trim()) return;
    try {
      await messageMutation.mutateAsync({ message: message.trim() });
      setMessage("");
      await accessQuery.refetch();
      toast({ title: "Mensagem enviada", description: "Feedback enviado para a equipe." });
    } catch (error: any) {
      toast({
        title: "Falha ao enviar",
        description: error?.message || "Não foi possível enviar a mensagem.",
        variant: "destructive",
      });
    }
  };

  const handleUpdateStatus = async (status: string) => {
    try {
      await statusMutation.mutateAsync({ status });
      await accessQuery.refetch();
      toast({ title: "Status atualizado", description: "A equipe foi notificada em tempo real." });
    } catch (error: any) {
      toast({
        title: "Falha ao atualizar status",
        description: error?.message || "Não foi possível atualizar o status.",
        variant: "destructive",
      });
    }
  };

  if (accessQuery.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-7 h-7 animate-spin text-primary" />
      </div>
    );
  }

  if (accessQuery.isError || !accessQuery.data) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <Card className="max-w-lg w-full">
          <CardHeader>
            <CardTitle>Link inválido ou expirado</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            O link de acesso não está mais disponível. Solicite um novo link para a equipe.
          </CardContent>
        </Card>
      </div>
    );
  }

  const { client, post, thread, messages } = accessQuery.data;

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>{client?.name || "Portal do Cliente"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p className="text-muted-foreground">Acesso válido até: {expiresText}</p>
            {post ? (
              <div className="rounded-md border border-border/60 p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium">{post.title || "Conteúdo sem título"}</p>
                  <Badge>{post.status}</Badge>
                </div>
                <p className="text-muted-foreground whitespace-pre-wrap">{post.content || "Sem conteúdo"}</p>
              </div>
            ) : null}
            {thread?.task_title ? <p className="text-muted-foreground">Contexto: {thread.task_title}</p> : null}
          </CardContent>
        </Card>

        {canUpdateStatus && post ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Aprovação do conteúdo</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {APPROVAL_STATUSES.map((item) => (
                <Button
                  key={item.value}
                  variant={item.value === "approved" ? "default" : "outline"}
                  disabled={statusMutation.isPending}
                  onClick={() => handleUpdateStatus(item.value)}
                >
                  {item.label}
                </Button>
              ))}
            </CardContent>
          </Card>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Conversa com a equipe</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-md border border-border/60 p-3 h-[320px] overflow-auto space-y-2">
              {messages?.length ? (
                messages.map((msg) => (
                  <div key={msg.id} className="rounded-md bg-secondary/40 p-2">
                    <p className="text-xs text-muted-foreground">
                      {msg.author_role === "client" ? "Você" : "Equipe"} • {new Date(msg.created_at).toLocaleString("pt-BR")}
                    </p>
                    <p className="text-sm mt-1 whitespace-pre-wrap">{msg.message}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">Sem mensagens ainda.</p>
              )}
            </div>

            {canComment ? (
              <div className="space-y-2">
                <Textarea
                  rows={3}
                  placeholder="Escreva seu feedback para a equipe..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={messageMutation.isPending || !message.trim()}
                >
                  Enviar feedback
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Comentários desabilitados para este link.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
