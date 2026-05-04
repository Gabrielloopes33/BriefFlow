import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, CalendarDays } from "lucide-react";
import { useBatchUpdateWorkspacePosts, useClientCalendar } from "@/hooks/use-client-workspace";

interface CalendarTabProps {
  clientId: string;
}

function formatDate(dateIso: string) {
  return new Date(dateIso).toLocaleDateString("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  });
}

export function CalendarTab({ clientId }: CalendarTabProps) {
  const [view, setView] = useState<"week" | "month">("month");
  const { data, isLoading } = useClientCalendar(clientId, view);
  const batchUpdate = useBatchUpdateWorkspacePosts(clientId);

  const orderedDays = useMemo(() => {
    if (!data?.buckets) return [] as string[];
    return Object.keys(data.buckets).sort((a, b) => (a < b ? -1 : 1));
  }, [data]);

  const handleScheduleTomorrow = (postId: string) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);

    batchUpdate.mutate({
      post_ids: [postId],
      status: "scheduled",
      scheduled_for: tomorrow.toISOString(),
      stage_tag: "scheduled",
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-display font-bold">Calendário de Conteúdos</h2>
          <p className="text-sm text-muted-foreground">Planejamento semanal/mensal por cliente</p>
        </div>
        <div className="flex gap-2">
          <Button variant={view === "week" ? "default" : "outline"} size="sm" onClick={() => setView("week")}>
            Semanal
          </Button>
          <Button variant={view === "month" ? "default" : "outline"} size="sm" onClick={() => setView("month")}>
            Mensal
          </Button>
        </div>
      </div>

      {orderedDays.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            Nenhum conteúdo no intervalo selecionado.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {orderedDays.map((day) => (
            <Card key={day}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <CalendarDays className="w-4 h-4" />
                  {formatDate(day)}
                  <Badge variant="secondary">{data?.buckets[day]?.length || 0}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {(data?.buckets[day] || []).map((item) => (
                  <div key={item.id} className="rounded-lg border border-border/60 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium">{item.title || "Conteúdo sem título"}</p>
                        <p className="text-xs text-muted-foreground">Status: {item.status}</p>
                      </div>
                      {item.status !== "scheduled" && item.status !== "published" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleScheduleTomorrow(item.id)}
                          disabled={batchUpdate.isPending}
                        >
                          Agendar amanhã
                        </Button>
                      ) : null}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
