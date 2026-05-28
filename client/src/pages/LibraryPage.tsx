import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useClients } from "@/hooks/use-clients";
import { PostFilters } from "@/components/library/PostFilters";
import { PostCard } from "@/components/posts/PostCard";
import { PostDetailModal } from "@/components/library/PostDetailModal";
import { LibraryPostItem, usePostsLibrary, usePostTags } from "@/hooks/use-posts-library";
import { getTenantId } from "@/lib/auth-session";

export function LibraryPage() {
  const { data: clients = [] } = useClients();
  const tenantId = getTenantId() || "";
  const { data: tenantTags = [] } = usePostTags(tenantId);

  const [filters, setFilters] = useState({
    clientId: "all",
    status: "all",
    period: "all" as "all" | "today" | "week" | "month",
    search: "",
    tag: "all",
    formatType: "all",
  });
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedPost, setSelectedPost] = useState<LibraryPostItem | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(filters.search), 250);
    return () => window.clearTimeout(timer);
  }, [filters.search]);

  const queryFilters = useMemo(
    () => ({ ...filters, search: debouncedSearch }),
    [filters, debouncedSearch]
  );

  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = usePostsLibrary(queryFilters, 25);

  const posts = data?.pages.flatMap((page) => page.items) ?? [];
  const total = data?.pages[0]?.total ?? 0;

  return (
    <AppShell>
      <div className="h-full overflow-auto p-4 md:p-6">
        <div className="mx-auto w-full max-w-6xl space-y-6">
          <Card className="border-border/60 bg-card/70">
            <CardHeader>
              <CardTitle>Biblioteca de Conteúdo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <PostFilters
                clients={clients.map((client: any) => ({ id: client.id, name: client.name }))}
                value={filters}
                onChange={setFilters}
                availableTags={tenantTags}
              />
              <p className="text-xs text-muted-foreground">{total} resultados</p>
            </CardContent>
          </Card>

          {isLoading ? (
            <div className="text-center py-10 text-muted-foreground">Carregando biblioteca...</div>
          ) : posts.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">Nenhum post encontrado para os filtros aplicados.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {posts
                .filter((post) => {
                  if (filters.tag && filters.tag !== "all") {
                    return post.tags?.includes(filters.tag);
                  }
                  return true;
                })
                .filter((post) => {
                  if (filters.formatType && filters.formatType !== "all") {
                    return post.format_type === filters.formatType;
                  }
                  return true;
                })
                .map((post) => (
                  <PostCard key={post.id} post={post} onOpenDetail={setSelectedPost} />
                ))}
            </div>
          )}

          {hasNextPage ? (
            <div className="flex justify-center pb-4">
              <Button
                variant="outline"
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
              >
                {isFetchingNextPage ? "Carregando..." : "Carregar mais"}
              </Button>
            </div>
          ) : null}
        </div>
      </div>

      <PostDetailModal
        post={selectedPost}
        open={!!selectedPost}
        onOpenChange={(open) => {
          if (!open) setSelectedPost(null);
        }}
      />
    </AppShell>
  );
}
