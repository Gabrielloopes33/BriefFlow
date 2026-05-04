import type { Express, Request, Response } from "express";
import { randomBytes, createHash } from "crypto";
import { pool, getClientForUser } from "../pg-pool";

type TenantRole = "owner" | "admin" | "member" | "viewer";

const SESSION_TTL_MS = 4 * 60 * 60 * 1000;
const ALLOWED_MEMBER_ROLES: TenantRole[] = ["owner", "admin", "member", "viewer"];

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function createSessionToken(): string {
  return `bf_${randomBytes(40).toString("hex")}`;
}

function buildTenantSlug(seed: string): string {
  const base = seed
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  const suffix = randomBytes(3).toString("hex");
  return `${base || "tenant"}-${suffix}`;
}

async function createAppSession(args: {
  userId: string;
  tenantId: string;
  ipAddress?: string;
  userAgent?: string;
}): Promise<{ token: string; expiresAt: string }> {
  const token = createSessionToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();

  await pool.query(
    `INSERT INTO app_sessions (user_id, tenant_id, token_hash, expires_at, ip_address, user_agent)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [args.userId, args.tenantId, tokenHash, expiresAt, args.ipAddress || null, args.userAgent || null],
  );

  return { token, expiresAt };
}

async function getUserPrimaryTenant(userId: string): Promise<{ tenantId: string; role: TenantRole } | null> {
  const { rows } = await pool.query(
    `SELECT tenant_id, role
     FROM tenant_members
     WHERE app_user_id = $1 AND is_active = true
     ORDER BY CASE role
       WHEN 'owner' THEN 0
       WHEN 'admin' THEN 1
       WHEN 'member' THEN 2
       ELSE 3
     END, created_at ASC
     LIMIT 1`,
    [userId],
  );

  if (!rows[0]) return null;
  return { tenantId: rows[0].tenant_id, role: rows[0].role as TenantRole };
}

async function resolveTenantFromRequest(req: Request): Promise<string | null> {
  const candidate = req.body?.tenantId ?? req.headers["x-tenant-id"];
  if (typeof candidate !== "string" || candidate.trim().length === 0) {
    return req.tenantId || null;
  }

  const { rows } = await pool.query(
    `SELECT tenant_id
     FROM tenant_members
     WHERE tenant_id = $1 AND app_user_id = $2 AND is_active = true
     LIMIT 1`,
    [candidate, req.userId],
  );

  if (!rows[0]) return null;
  return rows[0].tenant_id;
}

async function requireTenantRole(req: Request, tenantId: string, roles: TenantRole[]): Promise<boolean> {
  const { rows } = await pool.query(
    `SELECT role
     FROM tenant_members
     WHERE tenant_id = $1 AND app_user_id = $2 AND is_active = true
     LIMIT 1`,
    [tenantId, req.userId],
  );

  if (!rows[0]) return false;
  return roles.includes(rows[0].role as TenantRole);
}

export function registerAuthRoutes(app: Express): void {
  app.post("/api/auth/signup", async (req: Request, res: Response) => {
    const { email, password, fullName } = req.body || {};

    if (typeof email !== "string" || typeof password !== "string") {
      return res.status(400).json({ message: "email e password são obrigatórios" });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "password deve ter no mínimo 6 caracteres" });
    }

    const normalizedEmail = normalizeEmail(email);

    try {
      const dbClient = await pool.connect();
      try {
        await dbClient.query("BEGIN");

        // Verificar se email já existe
        const exists = await dbClient.query(
          `SELECT id FROM app_users WHERE email = $1 LIMIT 1`,
          [normalizedEmail],
        );

        if (exists.rows[0]) {
          return res.status(409).json({ message: "Email já registrado" });
        }

        // Criar usuário com hash de senha
        const userResult = await dbClient.query(
          `INSERT INTO app_users (email, password_hash, full_name, is_active)
           VALUES ($1, crypt($2, gen_salt('bf')), $3, true)
           RETURNING id`,
          [normalizedEmail, password, typeof fullName === "string" ? fullName : null],
        );

        const userId = String(userResult.rows[0].id);
        const tenantName = `${(typeof fullName === "string" && fullName.trim()) || normalizedEmail.split("@")[0]} Workspace`;
        const tenantSlug = buildTenantSlug(normalizedEmail.split("@")[0] || "tenant");

        // Criar tenant
        const tenantResult = await dbClient.query(
          `INSERT INTO tenants (app_owner_id, owner_app_user_id, name, slug, isolation_mode)
           VALUES ($1, $1, $2, $3, 'shared')
           RETURNING id`,
          [userId, tenantName, tenantSlug],
        );

        const tenantId = String(tenantResult.rows[0].id);

        // Adicionar usuário ao tenant (user_id = app_user_id por compatibilidade)
        await dbClient.query(
          `INSERT INTO tenant_members (tenant_id, user_id, app_user_id, role, is_active)
           VALUES ($1, $2, $2, 'owner', true)
           ON CONFLICT (tenant_id, app_user_id)
           DO UPDATE SET role = 'owner', is_active = true`,
          [tenantId, userId],
        );

        await dbClient.query("COMMIT");

        const session = await createAppSession({
          userId,
          tenantId,
          ipAddress: req.ip,
          userAgent: req.headers["user-agent"],
        });

        return res.status(201).json({
          user: {
            id: userId,
            email: normalizedEmail,
            fullName: typeof fullName === "string" ? fullName : null,
          },
          tenantId,
          session,
        });
      } catch (error) {
        await dbClient.query("ROLLBACK");
        throw error;
      } finally {
        dbClient.release();
      }
    } catch (error: any) {
      console.error("[auth/signup] error:", error);
      return res.status(500).json({ message: error.message || "Falha ao criar conta" });
    }
  });

  app.post("/api/auth/login", async (req: Request, res: Response) => {
    const { email, password } = req.body || {};

    if (typeof email !== "string" || typeof password !== "string") {
      return res.status(400).json({ message: "email e password são obrigatórios" });
    }

    try {
      const normalizedEmail = normalizeEmail(email);

      // Buscar usuário por email
      const userResult = await pool.query(
        `SELECT id, email, full_name, password_hash, is_active
         FROM app_users
         WHERE email = $1 LIMIT 1`,
        [normalizedEmail],
      );

      const user = userResult.rows[0];
      if (!user) {
        return res.status(401).json({ message: "Credenciais inválidas" });
      }

      if (!user.is_active) {
        return res.status(401).json({ message: "Conta desativada" });
      }

      // Verificar senha usando a função PostgreSQL
      const passwordCheckResult = await pool.query(
        `SELECT crypt($1, $2) = $2 AS is_valid`,
        [password, user.password_hash],
      );

      if (!passwordCheckResult.rows[0]?.is_valid) {
        return res.status(401).json({ message: "Credenciais inválidas" });
      }

      // Obter tenant primário
      const tenantMembership = await getUserPrimaryTenant(user.id);
      if (!tenantMembership) {
        return res.status(403).json({ message: "Usuário sem tenant ativo" });
      }

      const session = await createAppSession({
        userId: user.id,
        tenantId: tenantMembership.tenantId,
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
      });

      return res.json({
        user: {
          id: user.id,
          email: user.email,
          fullName: user.full_name || null,
        },
        tenantId: tenantMembership.tenantId,
        session,
      });
    } catch (error: any) {
      console.error("[auth/login] error:", error);
      return res.status(500).json({ message: error.message || "Falha ao autenticar" });
    }
  });

  app.post("/api/auth/logout", async (req: Request, res: Response) => {
    if (!req.authSessionId) {
      return res.status(204).send();
    }

    try {
      await pool.query(
        `UPDATE app_sessions
         SET revoked_at = NOW()
         WHERE id = $1`,
        [req.authSessionId],
      );
      return res.status(204).send();
    } catch (error: any) {
      console.error("[auth/logout] error:", error);
      return res.status(500).json({ message: error.message || "Falha ao encerrar sessão" });
    }
  });

  app.post("/api/auth/tenant/switch", async (req: Request, res: Response) => {
    if (!req.userId || !req.authSessionId) {
      return res.status(401).json({ message: "Sessão inválida" });
    }

    const { tenantId } = req.body || {};
    if (typeof tenantId !== "string") {
      return res.status(400).json({ message: "tenantId é obrigatório" });
    }

    try {
      const { rows } = await pool.query(
        `SELECT tenant_id
         FROM tenant_members
         WHERE tenant_id = $1 AND user_id = $2 AND is_active = true
         LIMIT 1`,
        [tenantId, req.userId],
      );

      if (!rows[0]) {
        return res.status(403).json({ message: "Sem acesso ao tenant informado" });
      }

      await pool.query(
        `UPDATE app_sessions
         SET tenant_id = $1, last_used_at = NOW()
         WHERE id = $2`,
        [tenantId, req.authSessionId],
      );

      return res.json({ tenantId });
    } catch (error: any) {
      console.error("[auth/tenant/switch] error:", error);
      return res.status(500).json({ message: error.message || "Falha ao trocar tenant" });
    }
  });

  app.get("/api/auth/me", async (req: Request, res: Response) => {
    if (!req.userId) {
      return res.status(401).json({ message: "Sessão inválida" });
    }

    try {
      const tenantId = await resolveTenantFromRequest(req);
      const pgClient = await getClientForUser(req.userId);

      try {
        const profileResult = await pgClient.query(
          `SELECT id, email, full_name, avatar_url, created_at, updated_at
           FROM app_users
           WHERE id = $1`,
          [req.userId],
        );

        const membershipsResult = await pgClient.query(
          `SELECT tm.tenant_id,
                  tm.role,
                  tm.is_active,
                  t.name AS tenant_name,
                  t.slug AS tenant_slug
           FROM tenant_members tm
           JOIN tenants t ON t.id = tm.tenant_id
           WHERE tm.app_user_id = $1
           ORDER BY tm.created_at ASC`,
          [req.userId],
        );

        return res.json({
          user: profileResult.rows[0] || null,
          memberships: membershipsResult.rows,
          currentTenantId: tenantId,
        });
      } finally {
        pgClient.release();
      }
    } catch (error: any) {
      console.error("[auth/me] error:", error);
      return res.status(500).json({ message: error.message || "Falha ao buscar usuário" });
    }
  });

  app.put("/api/auth/me", async (req: Request, res: Response) => {
    if (!req.userId) {
      return res.status(401).json({ message: "Sessão inválida" });
    }

    const { fullName, avatarUrl } = req.body || {};

    try {
      const pgClient = await getClientForUser(req.userId);
      try {
        const result = await pgClient.query(
          `UPDATE app_users
           SET full_name = COALESCE($1, full_name),
               avatar_url = COALESCE($2, avatar_url),
               updated_at = NOW()
           WHERE id = $3
           RETURNING id, email, full_name, avatar_url, created_at, updated_at`,
          [typeof fullName === "string" ? fullName : null, typeof avatarUrl === "string" ? avatarUrl : null, req.userId],
        );

        return res.json(result.rows[0] || null);
      } finally {
        pgClient.release();
      }
    } catch (error: any) {
      console.error("[auth/update-me] error:", error);
      return res.status(500).json({ message: error.message || "Falha ao atualizar perfil" });
    }
  });

  app.put("/api/auth/password", async (req: Request, res: Response) => {
    if (!req.userId) {
      return res.status(401).json({ message: "Sessão inválida" });
    }

    const { currentPassword, newPassword } = req.body || {};

    if (typeof currentPassword !== "string" || typeof newPassword !== "string") {
      return res.status(400).json({ message: "currentPassword e newPassword são obrigatórios" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: "newPassword deve ter no mínimo 6 caracteres" });
    }

    try {
      // Obter hash de senha atual
      const userResult = await pool.query(
        `SELECT password_hash FROM app_users WHERE id = $1 LIMIT 1`,
        [req.userId],
      );

      const user = userResult.rows[0];
      if (!user) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }

      // Verificar senha atual
      const passwordCheckResult = await pool.query(
        `SELECT crypt($1, $2) = $2 AS is_valid`,
        [currentPassword, user.password_hash],
      );

      if (!passwordCheckResult.rows[0]?.is_valid) {
        return res.status(401).json({ message: "Senha atual inválida" });
      }

      // Atualizar para nova senha
      await pool.query(
        `UPDATE app_users SET password_hash = crypt($1, gen_salt('bf')) WHERE id = $2`,
        [newPassword, req.userId],
      );

      return res.status(204).send();
    } catch (error: any) {
      console.error("[auth/password] error:", error);
      return res.status(500).json({ message: error.message || "Falha ao trocar senha" });
    }
  });

  app.delete("/api/auth/me", async (req: Request, res: Response) => {
    if (!req.userId) {
      return res.status(401).json({ message: "Sessão inválida" });
    }

    try {
      const dbClient = await pool.connect();
      try {
        await dbClient.query("BEGIN");

        // Soft delete do usuário
        await dbClient.query(
          `UPDATE app_users
           SET deleted_at = NOW(),
               updated_at = NOW(),
               is_active = false
           WHERE id = $1`,
          [req.userId],
        );

        // Revogar todas as sessões
        await dbClient.query(
          `UPDATE app_sessions
           SET revoked_at = NOW()
           WHERE user_id = $1 AND revoked_at IS NULL`,
          [req.userId],
        );

        // Desativar tenant memberships
        await dbClient.query(
          `UPDATE tenant_members
           SET is_active = false
           WHERE user_id = $1`,
          [req.userId],
        );

        await dbClient.query("COMMIT");
      } catch (error) {
        await dbClient.query("ROLLBACK");
        throw error;
      } finally {
        dbClient.release();
      }

      return res.status(204).send();
    } catch (error: any) {
      console.error("[auth/delete-me] error:", error);
      return res.status(500).json({ message: error.message || "Falha ao desativar conta" });
    }
  });

  app.get("/api/auth/members", async (req: Request, res: Response) => {
    if (!req.userId) {
      return res.status(401).json({ message: "Sessão inválida" });
    }

    try {
      const tenantId = await resolveTenantFromRequest(req);
      if (!tenantId) {
        return res.status(400).json({ message: "tenantId é obrigatório" });
      }

      const canReadMembers = await requireTenantRole(req, tenantId, ["owner", "admin"]);
      if (!canReadMembers) {
        return res.status(403).json({ message: "Sem permissão para listar membros" });
      }

      const { rows } = await pool.query(
        `SELECT tm.app_user_id AS user_id,
                tm.role,
                tm.is_active,
                tm.created_at,
                p.email,
                p.full_name
         FROM tenant_members tm
         LEFT JOIN app_users p ON p.id = tm.app_user_id
         WHERE tm.tenant_id = $1
         ORDER BY tm.created_at ASC`,
        [tenantId],
      );

      return res.json({ members: rows, tenantId });
    } catch (error: any) {
      console.error("[auth/members:list] error:", error);
      return res.status(500).json({ message: error.message || "Falha ao listar membros" });
    }
  });

  app.post("/api/auth/members", async (req: Request, res: Response) => {
    if (!req.userId) {
      return res.status(401).json({ message: "Sessão inválida" });
    }

    const { email, password, fullName, role } = req.body || {};

    if (typeof email !== "string") {
      return res.status(400).json({ message: "email é obrigatório" });
    }

    if (password !== undefined && (typeof password !== "string" || password.length < 6)) {
      return res.status(400).json({ message: "password deve ter no mínimo 6 caracteres" });
    }

    const requestedRole = (typeof role === "string" ? role : "member") as TenantRole;
    if (!ALLOWED_MEMBER_ROLES.includes(requestedRole)) {
      return res.status(400).json({ message: "role inválido" });
    }

    try {
      const tenantId = await resolveTenantFromRequest(req);
      if (!tenantId) {
        return res.status(400).json({ message: "tenantId é obrigatório" });
      }

      const canManage = await requireTenantRole(req, tenantId, ["owner", "admin"]);
      if (!canManage) {
        return res.status(403).json({ message: "Sem permissão para adicionar membros" });
      }

      const normalizedEmail = normalizeEmail(email);
      let userId: string | null = null;

      const dbClient = await pool.connect();
      try {
        await dbClient.query("BEGIN");

        const existing = await dbClient.query(
          `SELECT id FROM app_users WHERE email = $1 LIMIT 1`,
          [normalizedEmail],
        );

        if (existing.rows[0]) {
          userId = String(existing.rows[0].id);
        } else {
          // Criar novo usuário com password aleatória se não informada
          const userPassword = typeof password === "string" ? password : randomBytes(16).toString("hex");
          const userResult = await dbClient.query(
            `INSERT INTO app_users (email, password_hash, full_name, is_active)
             VALUES ($1, crypt($2, gen_salt('bf')), $3, true)
             RETURNING id`,
            [normalizedEmail, userPassword, typeof fullName === "string" ? fullName : null],
          );
          userId = String(userResult.rows[0].id);
        }

        // Adicionar ao tenant
        const membership = await dbClient.query(
          `INSERT INTO tenant_members (tenant_id, user_id, app_user_id, role, is_active)
           VALUES ($1, $2, $2, $3, true)
           ON CONFLICT (tenant_id, app_user_id)
           DO UPDATE SET role = EXCLUDED.role, is_active = true
           RETURNING tenant_id, app_user_id AS user_id, role, is_active`,
          [tenantId, userId, requestedRole],
        );

        await dbClient.query("COMMIT");
        return res.status(201).json(membership.rows[0]);
      } catch (error) {
        await dbClient.query("ROLLBACK");
        throw error;
      } finally {
        dbClient.release();
      }
    } catch (error: any) {
      console.error("[auth/members:create] error:", error);
      return res.status(500).json({ message: error.message || "Falha ao criar membro" });
    }
  });

  app.put("/api/auth/members/:userId", async (req: Request, res: Response) => {
    if (!req.userId) {
      return res.status(401).json({ message: "Sessão inválida" });
    }

    const { role, isActive } = req.body || {};

    if (role !== undefined && (typeof role !== "string" || !ALLOWED_MEMBER_ROLES.includes(role as TenantRole))) {
      return res.status(400).json({ message: "role inválido" });
    }

    if (isActive !== undefined && typeof isActive !== "boolean") {
      return res.status(400).json({ message: "isActive inválido" });
    }

    try {
      const tenantId = await resolveTenantFromRequest(req);
      if (!tenantId) {
        return res.status(400).json({ message: "tenantId é obrigatório" });
      }

      const canManage = await requireTenantRole(req, tenantId, ["owner", "admin"]);
      if (!canManage) {
        return res.status(403).json({ message: "Sem permissão para editar membros" });
      }

      const targetUserId = req.params.userId;
      const sets: string[] = [];
      const params: any[] = [];

      if (role !== undefined) {
        params.push(role);
        sets.push(`role = $${params.length}`);
      }

      if (isActive !== undefined) {
        params.push(isActive);
        sets.push(`is_active = $${params.length}`);
      }

      if (sets.length === 0) {
        return res.status(400).json({ message: "Nenhum campo para atualizar" });
      }

      params.push(tenantId);
      params.push(targetUserId);

      const result = await pool.query(
        `UPDATE tenant_members
         SET ${sets.join(", ")}
         WHERE tenant_id = $${params.length - 1}
           AND user_id = $${params.length}
         RETURNING tenant_id, user_id, role, is_active`,
        params,
      );

      if (!result.rows[0]) {
        return res.status(404).json({ message: "Membro não encontrado" });
      }

      return res.json(result.rows[0]);
    } catch (error: any) {
      console.error("[auth/members:update] error:", error);
      return res.status(500).json({ message: error.message || "Falha ao atualizar membro" });
    }
  });

  app.delete("/api/auth/members/:userId", async (req: Request, res: Response) => {
    if (!req.userId) {
      return res.status(401).json({ message: "Sessão inválida" });
    }

    try {
      const tenantId = await resolveTenantFromRequest(req);
      if (!tenantId) {
        return res.status(400).json({ message: "tenantId é obrigatório" });
      }

      const canManage = await requireTenantRole(req, tenantId, ["owner", "admin"]);
      if (!canManage) {
        return res.status(403).json({ message: "Sem permissão para remover membros" });
      }

      const targetUserId = req.params.userId;
      const ownerCount = await pool.query(
        `SELECT COUNT(*)::int AS total
         FROM tenant_members
         WHERE tenant_id = $1 AND role = 'owner' AND is_active = true`,
        [tenantId],
      );

      const targetMember = await pool.query(
        `SELECT role FROM tenant_members WHERE tenant_id = $1 AND user_id = $2 LIMIT 1`,
        [tenantId, targetUserId],
      );

      const isLastOwner =
        targetMember.rows[0]?.role === "owner" && Number(ownerCount.rows[0]?.total || 0) <= 1;

      if (isLastOwner) {
        return res.status(400).json({ message: "Não é possível remover o único owner do tenant" });
      }

      const result = await pool.query(
        `DELETE FROM tenant_members
         WHERE tenant_id = $1 AND user_id = $2
         RETURNING tenant_id, user_id`,
        [tenantId, targetUserId],
      );

      if (!result.rows[0]) {
        return res.status(404).json({ message: "Membro não encontrado" });
      }

      return res.status(204).send();
    } catch (error: any) {
      console.error("[auth/members:delete] error:", error);
      return res.status(500).json({ message: error.message || "Falha ao remover membro" });
    }
  });
}
