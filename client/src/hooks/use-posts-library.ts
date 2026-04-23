import { useInfiniteQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api";

export type LibraryPostStatus = "draft" | "ready_review" | "approved" | "rejected" | "published";
export type LibraryPeriod = "all" | "today" | "week" | "month";

export interface LibraryPostItem {
  id: string;
  client_id: string;
  client_name: string;
  title: string | null;
  content: string | null;
  status: LibraryPostStatus;
  generated_by: string | null;
  created_at: string;
  updated_at: string;
  creative_id: string | null;
}

interface PostsLibraryResponse {
  items: LibraryPostItem[];
  page: number;
  limit: number;
  total: number;
  has_more: boolean;
}

export interface LibraryFilters {
  clientId: string;
  status: string;
  period: LibraryPeriod;
  search: string;
}

function buildPostsQuery(filters: LibraryFilters, page: number, limit: number): string {
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("limit", String(limit));

  if (filters.clientId && filters.clientId !== "all") params.set("clientId", filters.clientId);
  if (filters.status && filters.status !== "all") params.set("status", filters.status);
  if (filters.period && filters.period !== "all") params.set("period", filters.period);
  if (filters.search.trim().length > 0) params.set("search", filters.search.trim());

  return `/api/posts?${params.toString()}`;
}

export function usePostsLibrary(filters: LibraryFilters, limit = 25) {
  return useInfiniteQuery({
    queryKey: ["posts-library", filters, limit],
    initialPageParam: 1,
    queryFn: async ({ pageParam }) => {
      const page = Number(pageParam) || 1;
      const url = buildPostsQuery(filters, page, limit);
      return apiGet<PostsLibraryResponse>(url);
    },
    getNextPageParam: (lastPage) => {
      return lastPage.has_more ? lastPage.page + 1 : undefined;
    },
  });
}
