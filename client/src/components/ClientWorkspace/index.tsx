import { useState, useEffect } from 'react';
import { useParams, useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { useClientContext } from '@/contexts/ClientContext';
import { useClient } from '@/hooks/use-clients';
import { useWorkspaceRealtime } from '@/hooks/use-workspace-realtime';
import { OverviewTab } from './OverviewTab';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

type WorkspaceTab =
  | 'overview'
  | 'sources'
  | 'calendar'
  | 'kanban'
  | 'collaboration'
  | 'briefs'
  | 'settings';

const tabs: { id: WorkspaceTab; label: string; icon: any }[] = [
  { id: 'overview', label: 'Visão Geral', icon: Sparkles },
  { id: 'sources', label: 'Fontes', icon: () => null },
  { id: 'calendar', label: 'Calendário', icon: () => null },
  { id: 'kanban', label: 'Kanban', icon: () => null },
  { id: 'collaboration', label: 'Colaboração', icon: () => null },
  { id: 'briefs', label: 'Pautas', icon: () => null },
  { id: 'settings', label: 'Config', icon: () => null },
];

interface ClientWorkspaceProps {
  sourcesTab?: React.ComponentType<{ clientId: string }>;
  calendarTab?: React.ComponentType<{ clientId: string }>;
  kanbanTab?: React.ComponentType<{ clientId: string }>;
  collaborationTab?: React.ComponentType<{ clientId: string }>;
  briefsTab?: React.ComponentType<{ clientId: string }>;
  settingsTab?: React.ComponentType<{ clientId: string }>;
}

export function ClientWorkspace({
  sourcesTab: SourcesTabComponent,
  calendarTab: CalendarTabComponent,
  kanbanTab: KanbanTabComponent,
  collaborationTab: CollaborationTabComponent,
  briefsTab: BriefsTabComponent,
  settingsTab: SettingsTabComponent,
}: ClientWorkspaceProps) {
  const { clientId } = useParams();
  useWorkspaceRealtime(clientId || null);
  const [location] = useLocation();
  const { setActiveClient } = useClientContext();

  const [activeTab, setActiveTab] = useState<WorkspaceTab>('overview');

  // Sincroniza tab com URL params
  useEffect(() => {
    const searchParams = new URLSearchParams(location.split('?')[1] || '');
    const tabParam = searchParams.get('tab') as WorkspaceTab;
    if (tabParam && tabs.find(t => t.id === tabParam)) {
      setActiveTab(tabParam);
      return;
    }

    if (location.endsWith('/calendar')) {
      setActiveTab('calendar');
    }
  }, [location]);

  // Define cliente ativo ao carregar workspace
  useEffect(() => {
    if (clientId) {
      setActiveClient(clientId);
    }
  }, [clientId, setActiveClient]);

  const renderTab = () => {
    switch (activeTab) {
      case 'overview':
        return <OverviewTab clientId={clientId!} />;
      case 'sources':
        return SourcesTabComponent ? <SourcesTabComponent clientId={clientId!} /> : null;
      case 'calendar':
        return CalendarTabComponent ? <CalendarTabComponent clientId={clientId!} /> : null;
      case 'kanban':
        return KanbanTabComponent ? <KanbanTabComponent clientId={clientId!} /> : null;
      case 'collaboration':
        return CollaborationTabComponent ? <CollaborationTabComponent clientId={clientId!} /> : null;
      case 'briefs':
        return BriefsTabComponent ? <BriefsTabComponent clientId={clientId!} /> : null;
      case 'settings':
        return SettingsTabComponent ? <SettingsTabComponent clientId={clientId!} /> : null;
      default:
        return <OverviewTab clientId={clientId!} />;
    }
  };

  const { data: client, isLoading } = useClient(clientId!);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-center">
        <div>
          <h2 className="text-xl font-semibold mb-2">Cliente não encontrado</h2>
          <p className="text-muted-foreground mb-4">O cliente que você procura não existe.</p>
          <Button onClick={() => window.location.href = '/clients'}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar para Clientes
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={client.name}
        description={client.description || ''}
      >
        <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold">
          {client.name[0]}
        </div>
      </PageHeader>

      {/* Tab Navigation */}
      <div className="border-b border-border/50 overflow-x-auto">
        <div className="flex gap-1 min-w-max">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "relative px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap",
                  activeTab === tab.id
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <AnimatePresence>
                  {activeTab === tab.id && (
                    <motion.div
                      layoutId="workspaceTab"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                      initial={{ opacity: 0, scaleX: 0 }}
                      animate={{ opacity: 1, scaleX: 1 }}
                      exit={{ opacity: 0, scaleX: 0 }}
                      transition={{ duration: 0.2 }}
                    />
                  )}
                </AnimatePresence>
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="min-h-[50vh]"
        >
          {renderTab()}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
