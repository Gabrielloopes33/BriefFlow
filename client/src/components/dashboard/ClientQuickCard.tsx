import { Building2, Play, Clock } from "lucide-react";
import { Link } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ClientQuickCardProps {
  id: string;
  name: string;
  niche: string | null;
  lastPostAt: string | null;
  postCount: number;
}

export function ClientQuickCard({ id, name, niche, lastPostAt, postCount }: ClientQuickCardProps) {
  const hasContent = postCount > 0;

  return (
    <div className="bg-card border border-border rounded-xl p-4 flex items-center justify-between gap-4 hover:border-primary/30 transition-colors group">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-10 h-10 rounded-lg bg-secondary/50 flex items-center justify-center shrink-0">
          <Building2 className="w-5 h-5 text-muted-foreground" />
        </div>
        <div className="min-w-0">
          <div className="font-medium text-sm truncate">{name}</div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {niche && <span>{niche}</span>}
            {hasContent ? (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {lastPostAt
                  ? `último: ${formatDistanceToNow(new Date(lastPostAt), { addSuffix: true, locale: ptBR })}`
                  : `${postCount} posts`}
              </span>
            ) : (
              <span className="text-amber-500">sem conteúdo ainda</span>
            )}
          </div>
        </div>
      </div>

      <Link
        href={`/chat?client=${id}`}
        className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary hover:text-white transition-colors"
      >
        <Play className="w-3 h-3" />
        Gerar
      </Link>
    </div>
  );
}
