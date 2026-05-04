import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { apiGet, apiPost } from "@/lib/api";
import {
  clearAuthSession,
  getCachedUser,
  getSessionToken,
  saveAuthSession,
  setCachedUser,
} from "@/lib/auth-session";

type MeResponse = {
  user: {
    id: string;
    email: string;
    full_name?: string | null;
    avatar_url?: string | null;
  } | null;
  memberships: Array<{
    tenant_id: string;
    role: string;
    is_active: boolean;
    tenant_name: string;
    tenant_slug: string;
  }>;
  currentTenantId: string | null;
};

export function useAuth() {
  const [user, setUser] = useState<any>(() => getCachedUser());
  const [sessionToken, setSessionToken] = useState<string | null>(() => getSessionToken());
  const [loading, setLoading] = useState(true);
  const [, setLocation] = useLocation();

  useEffect(() => {
    const checkAuth = async () => {
      const token = getSessionToken();
      if (!token) {
        setUser(null);
        setSessionToken(null);
        setLoading(false);
        return;
      }

      try {
        const data = await apiGet<MeResponse>("/api/auth/me");
        setUser(data.user);
        setSessionToken(token);
        setCachedUser(data.user);

        // Keep cache aligned with current 4h TTL expiration window.
        const expiresAt = new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString();
        saveAuthSession({
          token,
          expiresAt,
          tenantId: data.currentTenantId || localStorage.getItem("bf_tenant_id") || "",
          user: data.user || {},
        });

        if (!data.currentTenantId && data.memberships[0]?.tenant_id) {
          localStorage.setItem("bf_tenant_id", data.memberships[0].tenant_id);
        }

        setLoading(false);
      } catch (err: any) {
        console.error("Auth check error:", err);
        clearAuthSession();
        setUser(null);
        setSessionToken(null);
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const refetch = () => {
    setLoading(true);

    apiGet<MeResponse>("/api/auth/me")
      .then((data) => {
        setUser(data.user);
        setSessionToken(getSessionToken());
        setCachedUser(data.user);
      })
      .catch(() => {
        clearAuthSession();
        setUser(null);
        setSessionToken(null);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const logout = async () => {
    try {
      await apiPost('/api/auth/logout', {});
    } catch {
      // Ignore logout errors and clear local session anyway.
    } finally {
      clearAuthSession();
      setUser(null);
      setSessionToken(null);
      setLoading(false);
      setLocation('/auth');
    }
  };

  return {
    user,
    session: sessionToken ? { access_token: sessionToken } : null,
    isLoading: loading,
    isAuthenticated: !!user,
    logout,
    refetch,
  };
}
