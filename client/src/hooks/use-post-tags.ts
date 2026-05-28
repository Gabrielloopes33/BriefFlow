import { usePostTags as usePostTagsFromLibrary } from "@/hooks/use-posts-library";
import { getTenantId } from "@/lib/auth-session";

export function usePostTags() {
  const tenantId = getTenantId() || "";
  return usePostTagsFromLibrary(tenantId);
}
