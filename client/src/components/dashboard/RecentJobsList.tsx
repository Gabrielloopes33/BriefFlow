import { CheckCircle2, XCircle, Loader2, ExternalLink, X } from "lucide-react";
import { Link } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { DashboardJob } from "@/hooks/use-dashboard";
import { useCancelJob } from "@/hooks/use-dashboard";

interface RecentJobsListProps {
  jobs: DashboardJob[];
}

function JobStatusIcon({ status }: { status: string }) {
  switch (status) {
    case "completed":
      return <CheckCircle2 className="w-4 h-4 text-green-500" />;
    case "failed":
      return <XCircle className="w-4 h-4 text-red-500" />;
    case "processing":
      return <Loader2 className="w-4 h-4 text-amber-500 animate-spin" />;
    default:
      return <div className="w-4 h-4 rounded-full bg-muted-foreground/30" />;
  }
}

function JobStatusText({ status, stage }: { status: string; stage: string }) {
  const stageLabels: Record<string, string> = {
    validating_input: "Validando entrada",
    fetching_sources: "Buscando fontes",
    crawling_content: "Extraindo conteúdo",
    extracting_insights: "Analisando dados",
    drafting_post: "Escrevendo post",
    finalizing: "Finalizando",
    executing_graph: "Executando agentes",
  };

  switch (status) {
    case "completed":
      return <span className="text-green-500 text-xs">Concluído</span>;
    case "failed":
      return <span className="text-red-500 text-xs">Falhou</span>;
    case "processing":
      return <span className="text-amber-500 text-xs">{stageLabels[stage] || stage}</span>;
    default:
      return <span className="text-muted-foreground text-xs">{status}</span>;
  }
}

export function RecentJobsList({ jobs }: RecentJobsListProps) {
  const cancelJob = useCancelJob();

  if (jobs.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        Nenhuma atividade recente
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {jobs.map((job) => (
        <div
          key={job.id}
          className="flex items-center gap-3 p-3 rounded-lg border border-border bg-background/50 hover:border-primary/20 transition-colors"
        >
          <JobStatusIcon status={job.status} />

          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">
              {job.status === "processing" ? "Gerando" : "Post para"} {job.client_name}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <JobStatusText status={job.status} stage={job.stage} />
              <span className="text-muted-foreground text-xs">
                {formatDistanceToNow(new Date(job.created_at), { addSuffix: true, locale: ptBR })}
              </span>
            </div>
          </div>

          {job.status === "processing" && (
            <button
              onClick={() => cancelJob.mutate(job.id)}
              disabled={cancelJob.isPending}
              title="Cancelar geração"
              className="shrink-0 p-1.5 rounded-md hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors disabled:opacity-50"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          {job.result_post_id && (
            <Link
              href={`/posts/${job.result_post_id}`}
              className="shrink-0 p-1.5 rounded-md hover:bg-secondary/50 text-muted-foreground hover:text-primary transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
            </Link>
          )}
        </div>
      ))}
    </div>
  );
}
