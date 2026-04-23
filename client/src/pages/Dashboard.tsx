import { useDashboard, useDashboardWebSocketIntegration } from "@/hooks/use-dashboard";
import { MetricsBadges } from "@/components/dashboard/MetricsBadges";
import { ClientQuickCard } from "@/components/dashboard/ClientQuickCard";
import { RecentJobsList } from "@/components/dashboard/RecentJobsList";
import { AppShell } from "@/components/layout/AppShell";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Users, Activity } from "lucide-react";
import { Link } from "wouter";

export function Dashboard() {
  const { data, isLoading, error } = useDashboard();

  // Integra WebSocket para atualizações em tempo real
  useDashboardWebSocketIntegration();

  return (
    <AppShell>
      <div className="flex flex-col h-full gap-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-display font-semibold">Central de Comando</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Acompanhe seus clientes e atividades em tempo real
            </p>
          </div>
          <Link
            href="/clients"
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Novo Cliente
          </Link>
        </div>

        {/* Metrics */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Skeleton className="h-20 rounded-xl" />
            <Skeleton className="h-20 rounded-xl" />
            <Skeleton className="h-20 rounded-xl" />
          </div>
        ) : error ? (
          <div className="text-red-500 text-sm">Erro ao carregar métricas</div>
        ) : data ? (
          <MetricsBadges
            postsThisMonth={data.metrics.posts_this_month}
            activeClients={data.metrics.active_clients}
            jobsInProgress={data.metrics.jobs_in_progress}
          />
        ) : null}

        {/* Main Content */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-0 overflow-hidden">
          {/* Clients Column */}
          <div className="flex flex-col gap-4 min-h-0">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              <h2 className="font-display font-semibold">Seus Clientes</h2>
            </div>
            <div className="flex-1 overflow-y-auto pr-1 space-y-2">
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 rounded-xl" />
                ))
              ) : error ? (
                <div className="text-red-500 text-sm">Erro ao carregar clientes</div>
              ) : data && data.clients.length > 0 ? (
                data.clients.map((client) => (
                  <ClientQuickCard
                    key={client.id}
                    id={client.id}
                    name={client.name}
                    niche={client.niche}
                    lastPostAt={client.last_post_at}
                    postCount={client.post_count}
                  />
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  Nenhum cliente cadastrado.
                  <br />
                  <Link href="/clients" className="text-primary hover:underline">
                    Cadastre seu primeiro cliente
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Recent Activity Column */}
          <div className="flex flex-col gap-4 min-h-0">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              <h2 className="font-display font-semibold">Atividade Recente</h2>
            </div>
            <div className="flex-1 overflow-y-auto pr-1">
              {isLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-14 rounded-lg" />
                  ))}
                </div>
              ) : error ? (
                <div className="text-red-500 text-sm">Erro ao carregar atividades</div>
              ) : data ? (
                <RecentJobsList jobs={data.recent_jobs} />
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
