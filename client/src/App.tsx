import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { LandingPage } from "@/pages/LandingPage";
import { Dashboard } from "@/pages/Dashboard";
import { ChatPage } from "@/pages/ChatPage";
import { ClientsPage } from "@/pages/ClientsPage";
import { LibraryPage } from "@/pages/LibraryPage";
import { AnalyticsPage } from "@/pages/AnalyticsPage";
import { AgentsPage } from "@/pages/AgentsPage";
import { AgentDetailPage } from "@/pages/AgentDetailPage";
import { AgentGraphsPage } from "@/pages/AgentGraphsPage";
import { AgentBoardPage } from "@/pages/AgentBoardPage";
import { CreativeEditorPage } from "@/pages/CreativeEditorPage";
import { CarouselWizardPage } from "@/pages/CarouselWizardPage";
import { CaptionGeneratorPage } from "@/pages/CaptionGeneratorPage";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={LandingPage} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/studio" component={CarouselWizardPage} />
      <Route path="/chat" component={ChatPage} />
      <Route path="/clients" component={ClientsPage} />
      <Route path="/library" component={LibraryPage} />
      <Route path="/analytics" component={AnalyticsPage} />
      <Route path="/agents" component={AgentsPage} />
      <Route path="/agents/:id" component={AgentDetailPage} />
      <Route path="/agent-graphs" component={AgentGraphsPage} />
      <Route path="/agent-graphs/:id/board" component={AgentBoardPage} />
      <Route path="/creatives/new" component={CarouselWizardPage} />
      <Route path="/creatives/:id/edit" component={CreativeEditorPage} />
      <Route path="/creatives/:id/caption" component={CaptionGeneratorPage} />
      <Route path="/templates" component={CarouselWizardPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router />
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
