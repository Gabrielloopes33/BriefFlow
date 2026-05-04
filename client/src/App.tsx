import { Switch, Route, useLocation } from "wouter";
import { useEffect } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { ClientProvider } from "@/contexts/ClientContext";
import { Toaster } from "@/components/ui/toaster";
import AuthPage from "@/pages/Auth";
import { LandingPage } from "@/pages/LandingPage";
import { Dashboard } from "@/pages/Dashboard";
import { ChatPage } from "@/pages/ChatPage";
import { ClientsPage } from "@/pages/ClientsPage";
import { ClientWorkspacePage } from "@/pages/ClientWorkspacePage";
import { ClientAccessPage } from "@/pages/ClientAccessPage";
import { LibraryPage } from "@/pages/LibraryPage";
import { AnalyticsPage } from "@/pages/AnalyticsPage";
import { AgentsPage } from "@/pages/AgentsPage";
import { AgentDetailPage } from "@/pages/AgentDetailPage";
import { AgentGraphsPage } from "@/pages/AgentGraphsPage";
import { AgentBoardPage } from "@/pages/AgentBoardPage";
import { CreativeEditorPage } from "@/pages/CreativeEditorPage";
import { CarouselWizardPage } from "@/pages/CarouselWizardPage";
import { CaptionGeneratorPage } from "@/pages/CaptionGeneratorPage";
import { SettingsPage } from "@/pages/SettingsPage";
import { useAuth } from "@/hooks/use-auth";
import NotFound from "@/pages/not-found";

function ProtectedRoute({ component: Component }: { component: React.ComponentType<any> }) {
  const { isLoading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      setLocation('/auth');
    }
  }, [isLoading, isAuthenticated, setLocation]);

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">Carregando...</div>;
  }

  if (!isAuthenticated) {
    return null;
  }

  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={LandingPage} />
      <Route path="/auth" component={AuthPage} />
      <Route path="/client-access/:token" component={ClientAccessPage} />
      <Route path="/dashboard">{() => <ProtectedRoute component={Dashboard} />}</Route>
      <Route path="/studio">{() => <ProtectedRoute component={CarouselWizardPage} />}</Route>
      <Route path="/chat">{() => <ProtectedRoute component={ChatPage} />}</Route>
      <Route path="/clients">{() => <ProtectedRoute component={ClientsPage} />}</Route>
      <Route path="/clients/:clientId">{() => <ProtectedRoute component={ClientWorkspacePage} />}</Route>
      <Route path="/library">{() => <ProtectedRoute component={LibraryPage} />}</Route>
      <Route path="/analytics">{() => <ProtectedRoute component={AnalyticsPage} />}</Route>
      <Route path="/agents">{() => <ProtectedRoute component={AgentsPage} />}</Route>
      <Route path="/agents/:id">{() => <ProtectedRoute component={AgentDetailPage} />}</Route>
      <Route path="/agent-graphs">{() => <ProtectedRoute component={AgentGraphsPage} />}</Route>
      <Route path="/agent-graphs/:id/board">{() => <ProtectedRoute component={AgentBoardPage} />}</Route>
      <Route path="/creatives/new">{() => <ProtectedRoute component={CarouselWizardPage} />}</Route>
      <Route path="/creatives/:id/edit">{() => <ProtectedRoute component={CreativeEditorPage} />}</Route>
      <Route path="/creatives/:id/caption">{() => <ProtectedRoute component={CaptionGeneratorPage} />}</Route>
      <Route path="/templates">{() => <ProtectedRoute component={CarouselWizardPage} />}</Route>
      <Route path="/settings">{() => <ProtectedRoute component={SettingsPage} />}</Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ClientProvider>
        <Router />
        <Toaster />
      </ClientProvider>
    </QueryClientProvider>
  );
}

export default App;
