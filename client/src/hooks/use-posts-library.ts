import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost, apiPut } from "@/lib/api";

export type LibraryPostStatus =
  | "draft"
  | "in_production"
  | "needs_adjustment"
  | "ready_review"
  | "in_approval"
  | "approved"
  | "scheduled"
  | "published"
  | "rejected";
export type LibraryPeriod = "all" | "today" | "week" | "month";

export type PostFormatType = "carousel" | "reels" | "static" | "story" | "text";
export type ColorLabel = "red" | "yellow" | "green" | "blue" | "purple" | "pink" | null;

export interface LibraryPostItem {
  id: string;
  client_id: string;
  client_name: string;
  title: string | null;
  content: string | null;
  status: LibraryPostStatus;
  generated_by: string | null;
  scheduled_for?: string | null;
  stage_tag?: string | null;
  kanban_order?: number | null;
  tags?: string[];
  format_type?: PostFormatType;
  notes?: string | null;
  color_label?: ColorLabel;
  created_at: string;
  updated_at: string;
  status_updated_at?: string | null;
  status_updated_by?: string | null;
  creative_id: string | null;
}

export interface PostStatusHistoryItem {
  id: string;
  post_id: string;
  from_status: LibraryPostStatus | null;
  to_status: LibraryPostStatus;
  changed_by: string | null;
  changed_at: string;
}

export interface LibraryPostDetail extends LibraryPostItem {
  channels: string[];
  history: PostStatusHistoryItem[];
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
  tag?: string;
  formatType?: string;
}

interface UpdatePostStatusPayload {
  status: LibraryPostStatus;
}

interface EnsurePostCreativeResponse {
  creativeId: string;
  created: boolean;
}

function buildPostsQuery(filters: LibraryFilters, page: number, limit: number): string {
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("limit", String(limit));

  if (filters.clientId && filters.clientId !== "all") params.set("clientId", filters.clientId);
  if (filters.status && filters.status !== "all") params.set("status", filters.status);
  if (filters.period && filters.period !== "all") params.set("period", filters.period);
  if (filters.search.trim().length > 0) params.set("search", filters.search.trim());
  if (filters.tag && filters.tag !== "all") params.set("tag", filters.tag);
  if (filters.formatType && filters.formatType !== "all") params.set("formatType", filters.formatType);

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

export function usePostDetail(postId: string | null) {
  return useQuery({
    queryKey: ["post-detail", postId],
    queryFn: () => apiGet<LibraryPostDetail>(`/api/posts/${postId}`),
    enabled: !!postId,
  });
}

export function useUpdatePostStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ postId, status }: { postId: string; status: LibraryPostStatus }) => {
      return apiPut<LibraryPostDetail>(`/api/posts/${postId}/status`, { status } as UpdatePostStatusPayload);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["posts-library"] });
      queryClient.setQueryData(["post-detail", data.id], data);
    },
  });
}

interface UpdatePostPayload {
  title?: string | null;
  content?: string | null;
  scheduled_for?: string | null;
  stage_tag?: string | null;
  kanban_order?: number | null;
  tags?: string[];
  format_type?: PostFormatType;
  notes?: string | null;
  color_label?: ColorLabel;
}

export function useUpdatePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ postId, payload }: { postId: string; payload: UpdatePostPayload }) => {
      return apiPut<LibraryPostDetail>(`/api/posts/${postId}`, payload);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["posts-library"] });
      queryClient.setQueryData(["post-detail", data.id], data);
    },
  });
}

export function usePostTags(tenantId: string) {
  return useQuery({
    queryKey: ["post-tags", tenantId],
    queryFn: () => apiGet<string[]>(`/api/posts/tags?tenantId=${tenantId}`),
    enabled: !!tenantId,
  });
}

export function useEnsurePostCreative() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (postId: string) => apiPost<EnsurePostCreativeResponse>(`/api/posts/${postId}/creative`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts-library"] });
    },
  });
}
