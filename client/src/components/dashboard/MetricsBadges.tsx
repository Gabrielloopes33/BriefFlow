import { FileText, Users, Loader2 } from "lucide-react";

interface MetricsBadgesProps {
  postsThisMonth: number;
  activeClients: number;
  jobsInProgress: number;
}

export function MetricsBadges({ postsThisMonth, activeClients, jobsInProgress }: MetricsBadgesProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-4">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <FileText className="w-5 h-5 text-primary" />
        </div>
        <div>
          <div className="text-2xl font-mono font-semibold">{postsThisMonth}</div>
          <div className="text-xs text-muted-foreground">Posts este mês</div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-4">
        <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
          <Users className="w-5 h-5 text-blue-500" />
        </div>
        <div>
          <div className="text-2xl font-mono font-semibold">{activeClients}</div>
          <div className="text-xs text-muted-foreground">Clientes ativos</div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-4">
        <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
          <Loader2 className={`w-5 h-5 text-amber-500 ${jobsInProgress > 0 ? "animate-spin" : ""}`} />
        </div>
        <div>
          <div className="text-2xl font-mono font-semibold">{jobsInProgress}</div>
          <div className="text-xs text-muted-foreground">
            {jobsInProgress === 1 ? "Em progresso" : "Em progresso"}
          </div>
        </div>
      </div>
    </div>
  );
}
