import { useMemo, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, ChevronLeft, ChevronRight, Image, Video, Type, FileText, Layers, Plus } from "lucide-react";
import { useBatchUpdateWorkspacePosts, useClientCalendar } from "@/hooks/use-client-workspace";
import { LibraryPostItem } from "@/hooks/use-posts-library";
import { PostDetailModal } from "@/components/library/PostDetailModal";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

interface CalendarTabProps {
  clientId: string;
}

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const WEEKDAYS_FULL = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

const FORMAT_ICONS: Record<string, React.ReactNode> = {
  carousel: <Layers className="w-3 h-3" />,
  reels: <Video className="w-3 h-3" />,
  static: <Image className="w-3 h-3" />,
  story: <FileText className="w-3 h-3" />,
  text: <Type className="w-3 h-3" />,
};

const FORMAT_LABELS: Record<string, string> = {
  carousel: "Carrossel",
  reels: "Reels",
  static: "Estático",
  story: "Story",
  text: "Texto",
};

function getColorClass(colorLabel: string | null | undefined): string {
  switch (colorLabel) {
    case "red": return "bg-red-500/20 border-red-500/50 text-red-300";
    case "yellow": return "bg-yellow-500/20 border-yellow-500/50 text-yellow-300";
    case "green": return "bg-green-500/20 border-green-500/50 text-green-300";
    case "blue": return "bg-blue-500/20 border-blue-500/50 text-blue-300";
    case "purple": return "bg-purple-500/20 border-purple-500/50 text-purple-300";
    case "pink": return "bg-pink-500/20 border-pink-500/50 text-pink-300";
    default: return "bg-card border-border/60";
  }
}

function startOfMonth(date: Date): Date {
  const d = new Date(date);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfMonth(date: Date): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + 1, 0);
  d.setHours(23, 59, 59, 999);
  return d;
}

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function CalendarTab({ clientId }: CalendarTabProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<"week" | "month">("month");
  const [formatFilter, setFormatFilter] = useState<string>("all");
  const [includeArchived, setIncludeArchived] = useState(false);
  const [draggingPostId, setDraggingPostId] = useState<string | null>(null);
  const [selectedPost, setSelectedPost] = useState<LibraryPostItem | null>(null);
  const [createScheduledFor, setCreateScheduledFor] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const fromDate = view === "month" ? startOfMonth(currentDate) : startOfWeek(currentDate);
  const toDate = view === "month" ? endOfMonth(currentDate) : addDays(startOfWeek(currentDate), 6);

  const { data, isLoading } = useClientCalendar(
    clientId,
    view,
    fromDate.toISOString(),
    toDate.toISOString(),
    includeArchived,
    formatFilter
  );
  const batchUpdate = useBatchUpdateWorkspacePosts(clientId);

  const today = new Date();

  const filteredItems = useMemo(() => data?.items || [], [data]);
  const openCreateDialog = useCallback((day: Date) => {
    const local = new Date(day);
    local.setHours(12, 0, 0, 0);
    const pad = (n: number) => String(n).padStart(2, "0");
    const localDatetime = `${local.getFullYear()}-${pad(local.getMonth() + 1)}-${pad(local.getDate())}T${pad(local.getHours())}:${pad(local.getMinutes())}`;
    setCreateScheduledFor(localDatetime);
    setIsCreateDialogOpen(true);
  }, []);

  const goToCreate = useCallback(() => {
    if (!createScheduledFor) return;
    const scheduledIso = new Date(createScheduledFor).toISOString();
    window.location.href = `/creatives/new?client_id=${clientId}&scheduled_for=${encodeURIComponent(scheduledIso)}`;
  }, [clientId, createScheduledFor]);


  const buckets = useMemo(() => {
    const map: Record<string, typeof filteredItems> = {};
    for (const item of filteredItems) {
      const dateSource = item.scheduled_for || item.created_at;
      const key = formatDateKey(new Date(dateSource));
      if (!map[key]) map[key] = [];
      map[key].push(item);
    }
    return map;
  }, [filteredItems]);

  const goPrevious = () => {
    if (view === "month") {
      setCurrentDate((d) => { const nd = new Date(d); nd.setMonth(nd.getMonth() - 1); return nd; });
    } else {
      setCurrentDate((d) => addDays(d, -7));
    }
  };

  const goNext = () => {
    if (view === "month") {
      setCurrentDate((d) => { const nd = new Date(d); nd.setMonth(nd.getMonth() + 1); return nd; });
    } else {
      setCurrentDate((d) => addDays(d, 7));
    }
  };

  const goToday = () => setCurrentDate(new Date());

  const handleDropOnDay = useCallback((dayKey: string) => {
    if (!draggingPostId) return;
    const targetDate = new Date(dayKey + "T12:00:00");
    batchUpdate.mutate({
      post_ids: [draggingPostId],
      scheduled_for: targetDate.toISOString(),
    });
    setDraggingPostId(null);
  }, [draggingPostId, batchUpdate]);

  const monthLabel = currentDate.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  // Build month grid
  const monthGrid = useMemo(() => {
    const start = startOfMonth(currentDate);
    const startDayOfWeek = start.getDay();
    const gridStart = addDays(start, -startDayOfWeek);
    const days: Date[] = [];
    for (let i = 0; i < 42; i++) {
      days.push(addDays(gridStart, i));
    }
    const weeks: Date[][] = [];
    for (let i = 0; i < days.length; i += 7) {
      weeks.push(days.slice(i, i + 7));
    }
    return weeks;
  }, [currentDate]);

  // Build week grid
  const weekDays = useMemo(() => {
    const start = startOfWeek(currentDate);
    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      days.push(addDays(start, i));
    }
    return days;
  }, [currentDate]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-display font-bold">Calendário de Conteúdos</h2>
          <p className="text-sm text-muted-foreground">Planejamento por cliente</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={goPrevious}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={goToday}>
            Hoje
          </Button>
          <Button variant="outline" size="sm" onClick={goNext}>
            <ChevronRight className="w-4 h-4" />
          </Button>
          <span className="text-sm font-medium capitalize min-w-[140px] text-center">
            {monthLabel}
          </span>
          <div className="flex gap-1">
            <Button variant={view === "week" ? "default" : "outline"} size="sm" onClick={() => setView("week")}>
              Semana
            </Button>
            <Button variant={view === "month" ? "default" : "outline"} size="sm" onClick={() => setView("month")}>
              Mês
            </Button>
          </div>
          <Select value={formatFilter} onValueChange={setFormatFilter}>
            <SelectTrigger className="w-[140px] h-8 text-xs">
              <SelectValue placeholder="Formato" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos formatos</SelectItem>
              <SelectItem value="carousel">Carrossel</SelectItem>
              <SelectItem value="reels">Reels</SelectItem>
              <SelectItem value="static">Estático</SelectItem>
              <SelectItem value="story">Story</SelectItem>
              <SelectItem value="text">Texto</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant={includeArchived ? "default" : "outline"}
            size="sm"
            onClick={() => setIncludeArchived((prev) => !prev)}
          >
            Publicados/Rejeitados
          </Button>
        </div>
      </div>

      {/* Mobile: list view */}
      <div className="block md:hidden">
        <MobileListView
          days={view === "month" ? monthGrid.flat() : weekDays}
          buckets={buckets}
          today={today}
          onDrop={handleDropOnDay}
          onDragStart={setDraggingPostId}
          onDragEnd={() => setDraggingPostId(null)}
          onSchedule={(postId, date) => {
            batchUpdate.mutate({ post_ids: [postId], scheduled_for: date.toISOString() });
          }}
          onPostClick={(item) => setSelectedPost(item as LibraryPostItem)}
          onDayClick={openCreateDialog}
          isPending={batchUpdate.isPending}
        />
      </div>

      {/* Desktop: grid view */}
      <div className="hidden md:block">
        {view === "month" ? (
          <MonthGridView
            weeks={monthGrid}
            currentMonth={currentDate.getMonth()}
            buckets={buckets}
            today={today}
            onDrop={handleDropOnDay}
            onDragStart={setDraggingPostId}
            onDragEnd={() => setDraggingPostId(null)}
            onPostClick={(item) => setSelectedPost(item as LibraryPostItem)}
            onDayClick={openCreateDialog}
          />
        ) : (
          <WeekGridView
            days={weekDays}
            buckets={buckets}
            today={today}
            onDrop={handleDropOnDay}
            onDragStart={setDraggingPostId}
            onDragEnd={() => setDraggingPostId(null)}
            onPostClick={(item) => setSelectedPost(item as LibraryPostItem)}
            onDayClick={openCreateDialog}
          />
        )}
      </div>

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar Conteúdo</DialogTitle>
            <DialogDescription>
              Preencha a data e hora para iniciar a criação do conteúdo.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">Agendar para</label>
            <Input
              type="datetime-local"
              value={createScheduledFor}
              onChange={(e) => setCreateScheduledFor(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={goToCreate}>Abrir Criador</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PostDetailModal
        post={selectedPost}
        open={!!selectedPost}
        onOpenChange={(open) => {
          if (!open) setSelectedPost(null);
        }}
      />
    </div>
  );
}

/* ================= Mobile List View ================= */

function MobileListView({
  days,
  buckets,
  today,
  onDrop,
  onDragStart,
  onDragEnd,
  onSchedule,
  onPostClick,
  onDayClick,
  isPending,
}: {
  days: Date[];
  buckets: Record<string, any[]>;
  today: Date;
  onDrop: (key: string) => void;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
  onSchedule: (postId: string, date: Date) => void;
  onPostClick?: (item: any) => void;
  onDayClick?: (day: Date) => void;
  isPending: boolean;
}) {
  return (
    <div className="space-y-3">
      {days.map((day) => {
        const key = formatDateKey(day);
        const dayItems = buckets[key] || [];
        const isToday = isSameDay(day, today);
        const isCurrentMonth = day.getMonth() === today.getMonth();

        return (
          <div
            key={key}
            className={cn(
              "rounded-lg border p-3",
              isToday ? "border-primary bg-primary/5" : "border-border bg-card"
            )}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => onDrop(key)}
            onClick={() => {
              if (dayItems.length === 0) onDayClick?.(day);
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className={cn("text-sm font-medium", !isCurrentMonth && "text-muted-foreground")}>
                {WEEKDAYS_FULL[day.getDay()]}, {day.getDate()}/{day.getMonth() + 1}
              </span>
              {isToday && <Badge variant="default" className="text-[10px]">Hoje</Badge>}
              {dayItems.length > 0 && (
                <Badge variant="secondary" className="text-[10px]">{dayItems.length}</Badge>
              )}
            </div>
            {dayItems.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">Nenhum post</p>
            ) : (
              <div className="space-y-2">
                {dayItems.map((item) => (
                  <div
                    key={item.id}
                    className={cn(
                      "rounded-md border p-2 text-xs cursor-grab active:cursor-grabbing",
                      getColorClass(item.color_label)
                    )}
                    draggable
                    onDragStart={() => onDragStart(item.id)}
                    onDragEnd={onDragEnd}
                    onClick={(e) => {
                      e.stopPropagation();
                      onPostClick?.(item);
                    }}
                  >
                    <p className="font-medium line-clamp-1">{item.title || "Sem título"}</p>
                    <div className="flex items-center gap-1 mt-1 text-muted-foreground">
                      {FORMAT_ICONS[item.format_type || "carousel"]}
                      <span>{FORMAT_LABELS[item.format_type || "carousel"]}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ================= Month Grid View ================= */

function MonthGridView({
  weeks,
  currentMonth,
  buckets,
  today,
  onDrop,
  onDragStart,
  onDragEnd,
  onPostClick,
  onDayClick,
}: {
  weeks: Date[][];
  currentMonth: number;
  buckets: Record<string, any[]>;
  today: Date;
  onDrop: (key: string) => void;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
  onPostClick?: (item: any) => void;
  onDayClick?: (day: Date) => void;
}) {
  return (
    <div className="border rounded-lg bg-card">
      {/* Weekday headers */}
      <div className="grid grid-cols-7 border-b">
        {WEEKDAYS.map((day) => (
          <div key={day} className="px-2 py-2 text-xs font-medium text-center text-muted-foreground">
            {day}
          </div>
        ))}
      </div>

      {/* Days grid */}
      <div className="divide-y">
        {weeks.map((week, weekIdx) => (
          <div key={weekIdx} className="grid grid-cols-7 divide-x min-h-[120px]">
            {week.map((day) => {
              const key = formatDateKey(day);
              const dayItems = buckets[key] || [];
              const isToday = isSameDay(day, today);
              const isCurrentMonth = day.getMonth() === currentMonth;

              return (
                <div
                  key={key}
                  className={cn(
                    "p-1.5 min-h-[120px] transition-colors cursor-pointer",
                    isToday && "bg-primary/5",
                    !isCurrentMonth && "bg-muted/30",
                    "hover:bg-accent/50"
                  )}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => onDrop(key)}
                  onClick={() => {
                    if (dayItems.length === 0) onDayClick?.(day);
                  }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={cn(
                        "text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full",
                        isToday ? "bg-primary text-primary-foreground" : "text-muted-foreground",
                        !isCurrentMonth && "opacity-50"
                      )}
                    >
                      {day.getDate()}
                    </span>
                    {dayItems.length > 0 && (
                      <Badge variant="secondary" className="text-[9px] px-1 h-4">
                        {dayItems.length}
                      </Badge>
                    )}
                  </div>
                  <div className="space-y-1">
                    {dayItems.slice(0, 3).map((item) => (
                      <div
                        key={item.id}
                        className={cn(
                          "rounded px-1.5 py-0.5 text-[10px] leading-tight cursor-grab active:cursor-grabbing border truncate",
                          getColorClass(item.color_label)
                        )}
                        draggable
                        onDragStart={() => onDragStart(item.id)}
                        onDragEnd={onDragEnd}
                        onClick={(e) => {
                          e.stopPropagation();
                          onPostClick?.(item);
                        }}
                        title={item.title || "Sem título"}
                      >
                        <div className="flex items-center gap-0.5">
                          {FORMAT_ICONS[item.format_type || "carousel"]}
                          <span className="truncate">{item.title || "Sem título"}</span>
                        </div>
                      </div>
                    ))}
                    {dayItems.length > 3 && (
                      <p className="text-[9px] text-muted-foreground text-center">
                        +{dayItems.length - 3} mais
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ================= Week Grid View ================= */

function WeekGridView({
  days,
  buckets,
  today,
  onDrop,
  onDragStart,
  onDragEnd,
  onPostClick,
  onDayClick,
}: {
  days: Date[];
  buckets: Record<string, any[]>;
  today: Date;
  onDrop: (key: string) => void;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
  onPostClick?: (item: any) => void;
  onDayClick?: (day: Date) => void;
}) {
  const hours = Array.from({ length: 15 }, (_, i) => i + 8); // 8h - 22h

  return (
    <div className="border rounded-lg bg-card overflow-hidden">
      {/* Day headers */}
      <div className="grid grid-cols-8 border-b">
        <div className="px-2 py-2 text-xs font-medium text-center text-muted-foreground border-r">
          Hora
        </div>
        {days.map((day) => {
          const isToday = isSameDay(day, today);
          return (
            <div
              key={formatDateKey(day)}
              className={cn(
                "px-1 py-2 text-xs font-medium text-center",
                isToday && "bg-primary/5"
              )}
            >
              <div className={cn(isToday && "text-primary font-bold")}>
                {WEEKDAYS[day.getDay()]}
              </div>
              <div className={cn("text-muted-foreground", isToday && "text-primary")}>
                {day.getDate()}/{day.getMonth() + 1}
              </div>
            </div>
          );
        })}
      </div>

      {/* Time slots */}
      <div className="divide-y">
        {hours.map((hour) => (
          <div key={hour} className="grid grid-cols-8 divide-x min-h-[60px]">
            <div className="px-1 py-1 text-[10px] text-muted-foreground text-center border-r flex items-start justify-center">
              {String(hour).padStart(2, "0")}:00
            </div>
            {days.map((day) => {
              const key = formatDateKey(day);
              const dayItems = buckets[key] || [];
              // Filter items by hour if scheduled_for has time info
              const hourItems = dayItems.filter((item) => {
                if (!item.scheduled_for) return false;
                const d = new Date(item.scheduled_for);
                return d.getHours() === hour;
              });

              return (
                <div
                  key={key + hour}
                  className={cn(
                    "p-1 relative cursor-pointer",
                    isSameDay(day, today) && "bg-primary/5"
                  )}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => onDrop(key)}
                  onClick={() => {
                    if (hourItems.length === 0) onDayClick?.(day);
                  }}
                >
                  <div className="space-y-1">
                    {hourItems.map((item) => (
                      <div
                        key={item.id}
                        className={cn(
                          "rounded px-1 py-0.5 text-[10px] leading-tight cursor-grab active:cursor-grabbing border truncate",
                          getColorClass(item.color_label)
                        )}
                        draggable
                        onDragStart={() => onDragStart(item.id)}
                        onDragEnd={onDragEnd}
                        onClick={(e) => {
                          e.stopPropagation();
                          onPostClick?.(item);
                        }}
                        title={item.title || "Sem título"}
                      >
                        <div className="flex items-center gap-0.5">
                          {FORMAT_ICONS[item.format_type || "carousel"]}
                          <span className="truncate">{item.title || "Sem título"}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
