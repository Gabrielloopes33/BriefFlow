# S9-01 — Meta OAuth Completo + Refresh Automático de Token

Status: Ready  
Owner: @dev  
Sprint: 09  
Prioridade: Crítica  
Pontos: 8  
Depende de: Sprint 6 DONE (S6-01 analytics cache existente)

## Contexto

O OAuth do Meta já existe parcialmente no sistema (`analytics_tokens` table, rotas `/api/auth/meta` e `/api/auth/meta/callback`). Porém, o fluxo não trata refresh automático de token (tokens Meta expiram em 60 dias) e não valida corretamente o escopo de permissões necessário.

Esta story fecha o ciclo OAuth: connect → token salvo → refresh automático → invalidação correta.

## Escopo

**IN:**
- Revisão e correção do fluxo OAuth existente
- Geração de token de longa duração (60 dias) via exchange de token de curta duração
- Refresh automático antes da expiração (cron ou lazy refresh no request)
- Indicador visual de status de conexão Meta por cliente na UI
- Desconexão do Meta (revogar acesso + deletar token)
- Suporte a múltiplas páginas Meta por tenant (usuário seleciona qual página sincronizar)

**OUT:**
- Instagram Business API (usa o mesmo token, mas é endpoint diferente — S9-02)
- Meta Ads Manager (requer permissões adicionais — Sprint futuro)
- WhatsApp Business API

## Critérios de Aceite

- [ ] Fluxo OAuth completo: connect → callback → token salvo em `analytics_tokens`
- [ ] Token de longa duração (60 dias) gerado via `GET /oauth/access_token?grant_type=fb_exchange_token`
- [ ] `expires_at` calculado corretamente (hoje + 60 dias)
- [ ] Refresh automático: se token tem menos de 7 dias para expirar, é renovado automaticamente antes de qualquer chamada ao Meta API
- [ ] Endpoint `DELETE /api/analytics/meta/disconnect` desconecta e remove token
- [ ] UI: card "Conectar Meta" na tela de Analytics e em Clientes com status visual (conectado/desconectado/expirando)
- [ ] Ao conectar, usuário seleciona qual página/perfil Meta quer sincronizar

## Refresh Strategy (referência)

```typescript
// server/services/meta-token-manager.ts
async function getValidToken(tenantId: string): Promise<string | null> {
  const token = await db.query.analyticsTokens.findFirst({
    where: (t) => eq(t.tenantId, tenantId) && eq(t.platform, 'meta') && eq(t.isActive, true)
  });

  if (!token) return null;

  const daysUntilExpiry = differenceInDays(token.expiresAt, new Date());
  
  if (daysUntilExpiry < 7) {
    // Renova automaticamente (lazy refresh)
    const newToken = await refreshMetaToken(token.accessToken);
    await db.update(analyticsTokens)
      .set({ accessToken: newToken.access_token, expiresAt: addDays(new Date(), 60) })
      .where(eq(analyticsTokens.id, token.id));
    return newToken.access_token;
  }

  return token.accessToken;
}
```

## Arquivos a Criar/Modificar

- CRIAR: `server/services/meta-token-manager.ts`
- MODIFICAR: `server/routes.ts` — rotas Meta OAuth existentes + endpoint de disconnect
- CRIAR: `client/src/components/analytics/MetaConnectionCard.tsx`
- MODIFICAR: `client/src/pages/AnalyticsPage.tsx` — status de conexão
- MODIFICAR: `client/src/pages/ClientDetails.tsx` — indicador de conexão Meta por cliente

## Definition of Done

- [ ] Critérios de aceite atendidos
- [ ] Sem issues CRITICAL no CodeRabbit
- [ ] Teste: fluxo completo com conta de teste Meta (sandbox)
- [ ] Teste: token próximo de expirar é renovado automaticamente sem interação do usuário
- [ ] Evidências: `analytics_tokens` com `expires_at` correto após connect
