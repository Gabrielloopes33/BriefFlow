import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getSessionToken } from "@/lib/auth-session";
import { useJobWebSocket } from "@/hooks/use-job-websocket";

export function useWorkspaceRealtime(clientId: string | null) {
  const queryClient = useQueryClient();
  const ws = useJobWebSocket();

  useEffect(() => {
    const token = getSessionToken();
    if (!token) return;
    ws.connect(token);

    return () => {
      ws.disconnect();
    };
  }, []);

  useEffect(() => {
    const event = ws.lastEvent;
    if (!event || !clientId) return;

    if (event.type === "workspace:post-updated" && event.clientId === clientId) {
      queryClient.invalidateQueries({ queryKey: ["client-kanban", clientId] });
      queryClient.invalidateQueries({ queryKey: ["client-calendar", clientId] });
      queryClient.invalidateQueries({ queryKey: ["client-posts-list", clientId] });
      queryClient.invalidateQueries({ queryKey: ["posts-library"] });
    }

    if (event.type === "workspace:message-created" && event.clientId === clientId) {
      queryClient.invalidateQueries({ queryKey: ["collaboration-threads", clientId] });
      queryClient.invalidateQueries({ queryKey: ["thread-messages"] });
    }
  }, [ws.lastEvent, clientId, queryClient]);

  return ws;
}
