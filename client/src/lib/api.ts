import { getSessionToken, getTenantId } from "@/lib/auth-session";

interface ApiOptions extends RequestInit {
  skipAuth?: boolean;
}

interface ApiError {
  message: string;
  status: number;
}

async function parseJsonSafe<T = unknown>(response: Response): Promise<T> {
  if (response.status === 204) {
    return null as T;
  }

  const text = await response.text();
  if (!text) {
    return null as T;
  }

  return JSON.parse(text) as T;
}

/**
 * Helper para fazer requisições autenticadas à API
 * Automaticamente adiciona o token de sessão da aplicação no header Authorization
 */
export async function apiFetch(url: string, options: ApiOptions = {}): Promise<Response> {
  const { skipAuth = false, ...fetchOptions } = options;
  
  // Prepara headers
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((fetchOptions.headers as Record<string, string>) || {}),
  };

  // Attach tenant context for multi-tenant backend routes.
  const tenantFromEnv = (import.meta as any)?.env?.VITE_TENANT_ID as string | undefined;
  const tenantFromStorage = typeof window !== "undefined" ? getTenantId() || undefined : undefined;
  const tenantId = tenantFromEnv || tenantFromStorage || "00000000-0000-0000-0000-000000000010";
  if (!headers["x-tenant-id"] && tenantId) {
    headers["x-tenant-id"] = tenantId;
  }

  // Adiciona token de autenticação (exceto se skipAuth = true)
  if (!skipAuth) {
    const token = typeof window !== "undefined" ? getSessionToken() : null;
    
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }

  // Faz a requisição
  const response = await fetch(url, {
    ...fetchOptions,
    headers,
  });

  // Tratamento de erros
  if (!response.ok) {
    const error: ApiError = {
      message: "Erro na requisição",
      status: response.status,
    };

    try {
      const errorData = await response.json();
      error.message = errorData.message || errorData.error || `Erro ${response.status}`;
    } catch {
      error.message = `Erro ${response.status}: ${response.statusText}`;
    }

    // Erros específicos
    if (response.status === 401) {
      error.message = "Sessão expirada. Por favor, faça login novamente.";
      // Opcional: redirecionar para login
      // window.location.href = "/auth";
    } else if (response.status === 403) {
      error.message = "Acesso negado. Você não tem permissão para realizar esta ação.";
    }

    throw error;
  }

  return response;
}

/**
 * Wrapper para requisições GET
 */
export async function apiGet<T = unknown>(url: string, options: ApiOptions = {}): Promise<T> {
  const response = await apiFetch(url, { ...options, method: "GET" });
  return parseJsonSafe<T>(response);
}

/**
 * Wrapper para requisições POST
 */
export async function apiPost<T = unknown>(url: string, data: unknown, options: ApiOptions = {}): Promise<T> {
  const response = await apiFetch(url, {
    ...options,
    method: "POST",
    body: JSON.stringify(data),
  });
  return parseJsonSafe<T>(response);
}

/**
 * Wrapper para requisições PUT
 */
export async function apiPut<T = unknown>(url: string, data: unknown, options: ApiOptions = {}): Promise<T> {
  const response = await apiFetch(url, {
    ...options,
    method: "PUT",
    body: JSON.stringify(data),
  });
  return parseJsonSafe<T>(response);
}

/**
 * Wrapper para requisições PATCH
 */
export async function apiPatch<T = unknown>(url: string, data: unknown, options: ApiOptions = {}): Promise<T> {
  const response = await apiFetch(url, {
    ...options,
    method: "PATCH",
    body: JSON.stringify(data),
  });
  return parseJsonSafe<T>(response);
}

/**
 * Wrapper para requisições DELETE
 */
export async function apiDelete<T = unknown>(url: string, options: ApiOptions = {}): Promise<T> {
  const response = await apiFetch(url, { ...options, method: "DELETE" });
  return parseJsonSafe<T>(response);
}

/**
 * Hook personalizado para usar nas mutations do TanStack Query
 * Exemplo de uso:
 * ```typescript
 * const mutation = useMutation({
 *   mutationFn: (data) => apiPost('/api/clients', data),
 * });
 * ```
 */
export function createApiMutation<TData, TVariables>(
  method: "POST" | "PUT" | "DELETE",
  url: string | ((variables: TVariables) => string)
) {
  return async (variables: TVariables): Promise<TData> => {
    const endpoint = typeof url === "function" ? url(variables) : url;
    
    switch (method) {
      case "POST":
        return apiPost<TData>(endpoint, variables);
      case "PUT":
        return apiPut<TData>(endpoint, variables);
      case "DELETE":
        return apiDelete<TData>(endpoint);
      default:
        throw new Error(`Método não suportado: ${method}`);
    }
  };
}
