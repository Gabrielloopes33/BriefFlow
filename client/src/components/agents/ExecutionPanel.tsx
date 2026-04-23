import { useAgentBoardStore } from "@/stores/agent-board-store";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Activity, CheckCircle, XCircle, Info } from "lucide-react";

export function ExecutionPanel() {
  const logs = useAgentBoardStore((s) => s.executionLogs);
  const isExecuting = useAgentBoardStore((s) => s.isExecuting);
  const clearLogs = useAgentBoardStore((s) => s.clearLogs);

  return (
    <div className="flex flex-col h-full border-t bg-background">
      <div className="flex items-center justify-between px-4 py-2 border-b">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium">Execução em Tempo Real</span>
          {isExecuting && (
            <Badge variant="outline" className="text-xs animate-pulse">
              Executando...
            </Badge>
          )}
        </div>
        {logs.length > 0 && (
          <button
            onClick={clearLogs}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Limpar
          </button>
        )}
      </div>

      <ScrollArea className="flex-1 px-4 py-2">
        {logs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            Nenhuma execução em andamento.
            <br />
            Inicie uma execução do fluxo para ver os logs.
          </div>
        ) : (
          <div className="space-y-2">
            {logs.map((log, i) => (
              <div
                key={i}
                className={`flex items-start gap-2 text-sm p-2 rounded-lg ${
                  log.type === "error"
                    ? "bg-red-500/5 text-red-600"
                    : log.type === "success"
                    ? "bg-green-500/5 text-green-600"
                    : "bg-muted/50"
                }`}
              >
                {log.type === "error" ? (
                  <XCircle className="w-4 h-4 mt-0.5 shrink-0" />
                ) : log.type === "success" ? (
                  <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" />
                ) : (
                  <Info className="w-4 h-4 mt-0.5 shrink-0" />
                )}
                <div className="min-w-0">
                  <span className="text-xs text-muted-foreground font-mono">
                    {log.timestamp}
                  </span>
                  <span className="text-xs text-muted-foreground mx-1">|</span>
                  <span className="text-xs font-medium">{log.nodeId}</span>
                  <p className="mt-0.5">{log.message}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
