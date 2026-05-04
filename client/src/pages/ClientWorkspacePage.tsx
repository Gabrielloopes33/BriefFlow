import { AppShell } from "@/components/layout/AppShell";
import { ClientWorkspace } from "@/components/ClientWorkspace";
import { SourcesTab } from "@/components/ClientWorkspace/SourcesTab";
import { ContentsTab } from "@/components/ClientWorkspace/ContentsTab";
import { BriefsTab } from "@/components/ClientWorkspace/BriefsTab";
import { SettingsTab } from "@/components/ClientWorkspace/SettingsTab";
import { CalendarTab } from "@/components/ClientWorkspace/CalendarTab";
import { KanbanTab } from "@/components/ClientWorkspace/KanbanTab";
import { CollaborationTab } from "@/components/ClientWorkspace/CollaborationTab";

export function ClientWorkspacePage() {
  return (
    <AppShell>
      <ClientWorkspace
        sourcesTab={SourcesTab}
        contentsTab={ContentsTab}
        calendarTab={CalendarTab}
        kanbanTab={KanbanTab}
        collaborationTab={CollaborationTab}
        briefsTab={BriefsTab}
        settingsTab={SettingsTab}
      />
    </AppShell>
  );
}
