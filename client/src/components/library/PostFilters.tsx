import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

interface ClientOption {
  id: string;
  name: string;
}

export interface FiltersValue {
  clientId: string;
  status: string;
  period: "all" | "today" | "week" | "month";
  search: string;
  tag: string;
  formatType: string;
}

interface Props {
  clients: ClientOption[];
  value: FiltersValue;
  onChange: (next: FiltersValue) => void;
  availableTags?: string[];
}

export function PostFilters({ clients, value, onChange, availableTags = [] }: Props) {
  return (
    <div className="space-y-3">
      <div className="grid gap-3 md:grid-cols-4 lg:grid-cols-6">
        <Select
          value={value.clientId}
          onValueChange={(clientId) => onChange({ ...value, clientId })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Cliente" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os clientes</SelectItem>
            {clients.map((client) => (
              <SelectItem key={client.id} value={client.id}>
                {client.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={value.status}
          onValueChange={(status) => onChange({ ...value, status })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="draft">Rascunho</SelectItem>
            <SelectItem value="in_production">Em produção</SelectItem>
            <SelectItem value="needs_adjustment">Ajuste</SelectItem>
            <SelectItem value="ready_review">Em revisão</SelectItem>
            <SelectItem value="in_approval">Em aprovação</SelectItem>
            <SelectItem value="approved">Aprovado</SelectItem>
            <SelectItem value="scheduled">Agendado</SelectItem>
            <SelectItem value="published">Publicado</SelectItem>
            <SelectItem value="rejected">Rejeitado</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={value.period}
          onValueChange={(period: "all" | "today" | "week" | "month") => onChange({ ...value, period })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Período" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tudo</SelectItem>
            <SelectItem value="today">Hoje</SelectItem>
            <SelectItem value="week">Esta semana</SelectItem>
            <SelectItem value="month">Este mês</SelectItem>
          </SelectContent>
        </Select>

        {availableTags.length > 0 && (
          <Select
            value={value.tag}
            onValueChange={(tag) => onChange({ ...value, tag })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Tag" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as tags</SelectItem>
              {availableTags.map((tag) => (
                <SelectItem key={tag} value={tag}>
                  {tag}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Select
          value={value.formatType}
          onValueChange={(formatType) => onChange({ ...value, formatType })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Formato" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os formatos</SelectItem>
            <SelectItem value="carousel">Carrossel</SelectItem>
            <SelectItem value="reels">Reels</SelectItem>
            <SelectItem value="static">Estático</SelectItem>
            <SelectItem value="story">Story</SelectItem>
            <SelectItem value="text">Texto</SelectItem>
          </SelectContent>
        </Select>

        <Input
          placeholder="Buscar por título ou conteúdo..."
          value={value.search}
          onChange={(e) => onChange({ ...value, search: e.target.value })}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant={value.status === "approved" ? "default" : "outline"}
          size="sm"
          onClick={() => onChange({ ...value, status: value.status === "approved" ? "all" : "approved" })}
        >
          Apenas aprovados
        </Button>
        <Button
          type="button"
          variant={value.period === "week" ? "default" : "outline"}
          size="sm"
          onClick={() => onChange({ ...value, period: value.period === "week" ? "all" : "week" })}
        >
          Esta semana
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onChange({ clientId: "all", status: "all", period: "all", search: "", tag: "all", formatType: "all" })}
        >
          Limpar filtros
        </Button>
      </div>
    </div>
  );
}
