import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiDelete, apiGet, apiPost, apiPut } from "@/lib/api";
import { clearAuthSession, setTenantId } from "@/lib/auth-session";
import { useLocation } from "wouter";

type Membership = {
  tenant_id: string;
  role: "owner" | "admin" | "member" | "viewer";
  is_active: boolean;
  tenant_name: string;
  tenant_slug: string;
};

type MeResponse = {
  user: {
    id: string;
    email: string;
    full_name: string | null;
  } | null;
  memberships: Membership[];
  currentTenantId: string | null;
};

type Member = {
  user_id: string;
  email: string | null;
  full_name: string | null;
  role: "owner" | "admin" | "member" | "viewer";
  is_active: boolean;
  created_at: string;
};

const MEMBER_ROLES = ["owner", "admin", "member", "viewer"] as const;

export function SettingsPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const [fullName, setFullName] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [memberEmail, setMemberEmail] = useState("");
  const [memberName, setMemberName] = useState("");
  const [memberPassword, setMemberPassword] = useState("");
  const [memberRole, setMemberRole] = useState<(typeof MEMBER_ROLES)[number]>("member");

  const meQuery = useQuery({
    queryKey: ["auth", "me"],
    queryFn: () => apiGet<MeResponse>("/api/auth/me"),
  });

  const currentTenantId = meQuery.data?.currentTenantId || meQuery.data?.memberships[0]?.tenant_id || "";

  const membersQuery = useQuery({
    queryKey: ["auth", "members", currentTenantId],
    enabled: !!currentTenantId,
    queryFn: async () => {
      const query = new URLSearchParams({ tenantId: currentTenantId });
      const response = await apiGet<{ members: Member[] }>(`/api/auth/members?${query.toString()}`);
      return response.members;
    },
  });

  const canManageMembers = useMemo(() => {
    const active = meQuery.data?.memberships.find((m) => m.tenant_id === currentTenantId && m.is_active);
    return active?.role === "owner" || active?.role === "admin";
  }, [meQuery.data?.memberships, currentTenantId]);

  const updateProfileMutation = useMutation({
    mutationFn: () => apiPut("/api/auth/me", { fullName }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
      toast({ title: "Perfil atualizado", description: "Seu perfil foi atualizado com sucesso." });
    },
    onError: (error: any) => {
      toast({ title: "Erro", description: error.message || "Falha ao atualizar perfil", variant: "destructive" });
    },
  });

  const updatePasswordMutation = useMutation({
    mutationFn: () => apiPut("/api/auth/password", { currentPassword, newPassword }),
    onSuccess: () => {
      setCurrentPassword("");
      setNewPassword("");
      toast({ title: "Senha atualizada", description: "Sua senha foi alterada com sucesso." });
    },
    onError: (error: any) => {
      toast({ title: "Erro", description: error.message || "Falha ao atualizar senha", variant: "destructive" });
    },
  });

  const switchTenantMutation = useMutation({
    mutationFn: (tenantId: string) => apiPost<{ tenantId: string }>("/api/auth/tenant/switch", { tenantId }),
    onSuccess: (data) => {
      setTenantId(data.tenantId);
      queryClient.invalidateQueries();
      toast({ title: "Tenant alterado", description: "Contexto de dados atualizado para o tenant selecionado." });
    },
    onError: (error: any) => {
      toast({ title: "Erro", description: error.message || "Falha ao alterar tenant", variant: "destructive" });
    },
  });

  const createMemberMutation = useMutation({
    mutationFn: () =>
      apiPost("/api/auth/members", {
        email: memberEmail,
        fullName: memberName,
        password: memberPassword || undefined,
        role: memberRole,
        tenantId: currentTenantId,
      }),
    onSuccess: () => {
      setMemberEmail("");
      setMemberName("");
      setMemberPassword("");
      setMemberRole("member");
      queryClient.invalidateQueries({ queryKey: ["auth", "members", currentTenantId] });
      toast({ title: "Membro adicionado", description: "Usuário incluído no tenant com sucesso." });
    },
    onError: (error: any) => {
      toast({ title: "Erro", description: error.message || "Falha ao adicionar membro", variant: "destructive" });
    },
  });

  const updateMemberMutation = useMutation({
    mutationFn: ({ userId, role, isActive }: { userId: string; role: Member["role"]; isActive: boolean }) =>
      apiPut(`/api/auth/members/${userId}`, { role, isActive, tenantId: currentTenantId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auth", "members", currentTenantId] });
      toast({ title: "Membro atualizado", description: "Permissões atualizadas com sucesso." });
    },
    onError: (error: any) => {
      toast({ title: "Erro", description: error.message || "Falha ao atualizar membro", variant: "destructive" });
    },
  });

  const deleteMemberMutation = useMutation({
    mutationFn: (userId: string) => apiDelete(`/api/auth/members/${userId}?tenantId=${currentTenantId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auth", "members", currentTenantId] });
      toast({ title: "Membro removido", description: "Membro removido do tenant." });
    },
    onError: (error: any) => {
      toast({ title: "Erro", description: error.message || "Falha ao remover membro", variant: "destructive" });
    },
  });

  const deleteAccountMutation = useMutation({
    mutationFn: () => apiDelete("/api/auth/me"),
    onSuccess: () => {
      clearAuthSession();
      setLocation("/auth");
      toast({ title: "Conta desativada", description: "Sua conta foi desativada." });
    },
    onError: (error: any) => {
      toast({ title: "Erro", description: error.message || "Falha ao desativar conta", variant: "destructive" });
    },
  });

  if (meQuery.isLoading) {
    return (
      <AppShell>
        <div className="p-6">Carregando configurações...</div>
      </AppShell>
    );
  }

  const user = meQuery.data?.user;
  const memberships = meQuery.data?.memberships || [];
  const members = membersQuery.data || [];

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto p-4 md:p-0 space-y-6">
        <div>
          <h1 className="text-xl font-display font-semibold">Configurações da Conta</h1>
          <p className="text-sm text-muted-foreground mt-1">Gerencie seu perfil, senha e usuários do tenant.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Tenant Ativo</CardTitle>
            <CardDescription>Selecione o tenant atual para escopo dos dados.</CardDescription>
          </CardHeader>
          <CardContent>
            <Select value={currentTenantId} onValueChange={(value) => switchTenantMutation.mutate(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um tenant" />
              </SelectTrigger>
              <SelectContent>
                {memberships.map((m) => (
                  <SelectItem key={m.tenant_id} value={m.tenant_id}>
                    {m.tenant_name} ({m.role})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Perfil</CardTitle>
            <CardDescription>Atualize seus dados principais.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={user?.email || ""} disabled />
            </div>
            <div className="space-y-2">
              <Label>Nome completo</Label>
              <Input
                value={fullName || user?.full_name || ""}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Seu nome"
              />
            </div>
            <Button onClick={() => updateProfileMutation.mutate()} disabled={updateProfileMutation.isPending}>
              Salvar perfil
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Segurança</CardTitle>
            <CardDescription>Troque sua senha de acesso.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Senha atual</Label>
              <Input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Nova senha</Label>
              <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
            </div>
            <Button onClick={() => updatePasswordMutation.mutate()} disabled={updatePasswordMutation.isPending}>
              Alterar senha
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Membros do Tenant</CardTitle>
            <CardDescription>CRUD completo de usuários do tenant atual.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!canManageMembers && (
              <p className="text-sm text-muted-foreground">Você não tem permissão para gerenciar membros neste tenant.</p>
            )}

            {canManageMembers && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <Input placeholder="Email" value={memberEmail} onChange={(e) => setMemberEmail(e.target.value)} />
                <Input placeholder="Nome completo" value={memberName} onChange={(e) => setMemberName(e.target.value)} />
                <Input placeholder="Senha inicial (opcional)" type="password" value={memberPassword} onChange={(e) => setMemberPassword(e.target.value)} />
                <Select value={memberRole} onValueChange={(value) => setMemberRole(value as Member["role"])}>
                  <SelectTrigger>
                    <SelectValue placeholder="Role" />
                  </SelectTrigger>
                  <SelectContent>
                    {MEMBER_ROLES.map((role) => (
                      <SelectItem key={role} value={role}>
                        {role}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="md:col-span-4">
                  <Button onClick={() => createMemberMutation.mutate()} disabled={createMemberMutation.isPending}>
                    Adicionar membro
                  </Button>
                </div>
              </div>
            )}

            <Separator />

            <div className="space-y-3">
              {members.map((member) => (
                <div key={member.user_id} className="border border-border rounded-lg p-3 flex flex-col md:flex-row md:items-center gap-3 md:justify-between">
                  <div>
                    <p className="font-medium">{member.full_name || member.email || member.user_id}</p>
                    <p className="text-xs text-muted-foreground">{member.email || "Sem email"}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select
                      value={member.role}
                      onValueChange={(value) =>
                        updateMemberMutation.mutate({ userId: member.user_id, role: value as Member["role"], isActive: member.is_active })
                      }
                      disabled={!canManageMembers}
                    >
                      <SelectTrigger className="w-[130px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {MEMBER_ROLES.map((role) => (
                          <SelectItem key={role} value={role}>
                            {role}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Button
                      variant={member.is_active ? "secondary" : "default"}
                      onClick={() =>
                        updateMemberMutation.mutate({ userId: member.user_id, role: member.role, isActive: !member.is_active })
                      }
                      disabled={!canManageMembers}
                    >
                      {member.is_active ? "Desativar" : "Ativar"}
                    </Button>

                    <Button
                      variant="destructive"
                      onClick={() => deleteMemberMutation.mutate(member.user_id)}
                      disabled={!canManageMembers}
                    >
                      Remover
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle>Zona de risco</CardTitle>
            <CardDescription>Desative sua conta atual.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="destructive" onClick={() => deleteAccountMutation.mutate()} disabled={deleteAccountMutation.isPending}>
              Desativar conta
            </Button>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
