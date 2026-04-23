import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ClientSelectorProps {
  clients: Array<{ id: string; name: string }>;
  value: string;
  onChange: (clientId: string) => void;
}

export function ClientSelector({ clients, value, onChange }: ClientSelectorProps) {
  return (
    <div className="space-y-2">
      <p className="text-xs uppercase tracking-widest text-muted-foreground">Cliente</p>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-10 bg-secondary/40 border-border/50">
          <SelectValue placeholder="Selecione um cliente" />
        </SelectTrigger>
        <SelectContent>
          {clients.map((client) => (
            <SelectItem key={client.id} value={client.id}>
              {client.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
