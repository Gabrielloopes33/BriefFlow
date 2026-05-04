import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, MessageSquare, Plus } from "lucide-react";
import {
  useCollaborationThreads,
  useCreatePublicClientLink,
  useCreateCollaborationThread,
  useSendThreadMessage,
  useThreadMessages,
} from "@/hooks/use-client-workspace";
import { useToast } from "@/hooks/use-toast";

interface CollaborationTabProps {
  clientId: string;
}

export function CollaborationTab({ clientId }: CollaborationTabProps) {
  const { toast } = useToast();
  const { data: threads, isLoading } = useCollaborationThreads(clientId);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [newThreadTitle, setNewThreadTitle] = useState("");
  const [message, setMessage] = useState("");

  const createThread = useCreateCollaborationThread(clientId);
  const createPublicLink = useCreatePublicClientLink(clientId);
  const { data: messages, isLoading: messagesLoading } = useThreadMessages(activeThreadId);
  const sendMessage = useSendThreadMessage(clientId, activeThreadId);

  useEffect(() => {
    if (!activeThreadId && threads && threads.length > 0) {
      setActiveThreadId(threads[0].id);
    }
  }, [threads, activeThreadId]);

  const handleCreateThread = async () => {
    if (!newThreadTitle.trim()) return;
    const created = await createThread.mutateAsync({
      context_type: "task",
      task_title: newThreadTitle.trim(),
      stage_tag: "backlog",
    });
    setNewThreadTitle("");
    setActiveThreadId(created.id);
  };

  const handleSendMessage = async () => {
    if (!activeThreadId || !message.trim()) return;
    await sendMessage.mutateAsync({ message: message.trim(), author_role: "team" });
    setMessage("");
  };

  const handleCreatePublicLink = async () => {
    if (!activeThreadId) return;
    try {
      const result = await createPublicLink.mutateAsync({
        thread_id: activeThreadId,
        expires_in_hours: 72,
      });

      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(result.url);
      }

      toast({
        title: "Link do cliente gerado",
        description: "Link copiado para a área de transferência.",
      });
    } catch (error: any) {
      toast({
        title: "Falha ao gerar link",
        description: error?.message || "Não foi possível gerar o link do cliente.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[320px_1fr] gap-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            Conversas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input
              value={newThreadTitle}
              onChange={(e) => setNewThreadTitle(e.target.value)}
              placeholder="Nova tarefa/conversa"
            />
            <Button size="icon" onClick={handleCreateThread} disabled={createThread.isPending}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          <div className="space-y-2">
            {(threads || []).map((thread) => (
              <button
                key={thread.id}
                onClick={() => setActiveThreadId(thread.id)}
                className={`w-full text-left rounded-md border p-3 transition-colors ${
                  activeThreadId === thread.id
                    ? "border-primary bg-primary/5"
                    : "border-border/60 hover:border-border"
                }`}
              >
                <p className="text-sm font-medium line-clamp-1">{thread.task_title || "Discussão de conteúdo"}</p>
                <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                  {thread.last_message || "Sem mensagens ainda"}
                </p>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-base">Chat interno por tarefa/conteúdo</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCreatePublicLink}
              disabled={!activeThreadId || createPublicLink.isPending}
            >
              Gerar link cliente
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {messagesLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : (
            <div className="h-[360px] overflow-auto space-y-2 rounded-md border border-border/60 p-3">
              {(!messages || messages.length === 0) ? (
                <p className="text-sm text-muted-foreground">Sem mensagens nesta conversa.</p>
              ) : (
                messages.map((item) => (
                  <div key={item.id} className="rounded-md bg-secondary/40 p-2">
                    <p className="text-xs text-muted-foreground">{item.author_role} • {new Date(item.created_at).toLocaleString("pt-BR")}</p>
                    <p className="text-sm mt-1 whitespace-pre-wrap">{item.message}</p>
                  </div>
                ))
              )}
            </div>
          )}

          <div className="space-y-2">
            <Textarea
              placeholder="Escreva uma atualização para equipe/cliente..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
            />
            <Button
              onClick={handleSendMessage}
              disabled={!activeThreadId || sendMessage.isPending || !message.trim()}
            >
              Enviar mensagem
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
