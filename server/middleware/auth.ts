import { Request, Response, NextFunction } from 'express';
import { createHash } from 'crypto';
import { pool } from '../pg-pool';

declare global {
  namespace Express {
    interface Request {
      user?: any;
      userId?: string;
      tenantId?: string;
      authSessionId?: string;
    }
  }
}

const DEFAULT_DEV_USER_ID = '00000000-0000-0000-0000-000000000001';
const DEFAULT_DEV_TENANT_ID = '00000000-0000-0000-0000-000000000001';
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PUBLIC_AUTH_PATHS = new Set([
  '/auth/login',
  '/auth/signup',
]);

function isPublicAuthPath(path: string): boolean {
  if (path.startsWith('/public/')) {
    return true;
  }
  return PUBLIC_AUTH_PATHS.has(path);
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function resolveDevId(value: string | undefined, fallback: string): string {
  if (value && UUID_REGEX.test(value)) return value;
  return fallback;
}

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    if (isPublicAuthPath(req.path)) {
      return next();
    }

    const isDev = process.env.NODE_ENV !== 'production';
    const devBypass = process.env.DEV_BYPASS_AUTH === 'true';
    const devUserId = resolveDevId(process.env.DEV_USER_ID, DEFAULT_DEV_USER_ID);
    const devTenantId = resolveDevId(process.env.DEV_TENANT_ID, DEFAULT_DEV_TENANT_ID);

    const authHeader = req.headers.authorization;
    if (!authHeader) {
      if (isDev && devBypass) {
        req.user = { id: devUserId, email: 'dev@local' };
        req.userId = devUserId;
        req.tenantId = devTenantId;
        return next();
      }
      return res.status(401).json({ message: 'Missing authorization header' });
    }

    const token = authHeader.replace('Bearer ', '');

    // Validate app session token (opaque token with 4h TTL)
    try {
      const tokenHash = hashToken(token);
      const tenantFromHeader = req.headers['x-tenant-id'];
      const preferredTenantId = typeof tenantFromHeader === 'string' ? tenantFromHeader : null;

      const { rows } = await pool.query(
        `SELECT s.id,
                s.user_id,
                s.tenant_id,
                au.email,
                au.full_name
         FROM app_sessions s
         JOIN app_users au ON au.id = s.user_id
         WHERE s.token_hash = $1
           AND s.revoked_at IS NULL
           AND s.expires_at > NOW()
         LIMIT 1`,
        [tokenHash]
      );

      const appSession = rows[0];
      if (appSession) {
        let resolvedTenantId = String(appSession.tenant_id);

        if (preferredTenantId) {
          const tenantCheck = await pool.query(
            `SELECT tenant_id
             FROM tenant_members
             WHERE tenant_id = $1
               AND app_user_id = $2
               AND is_active = true
             LIMIT 1`,
            [preferredTenantId, appSession.user_id]
          );
          if (tenantCheck.rows[0]) {
            resolvedTenantId = preferredTenantId;
            await pool.query(
              `UPDATE app_sessions
               SET tenant_id = $1, last_used_at = NOW()
               WHERE id = $2`,
              [resolvedTenantId, appSession.id]
            );
          } else {
            await pool.query(`UPDATE app_sessions SET last_used_at = NOW() WHERE id = $1`, [appSession.id]);
          }
        } else {
          await pool.query(`UPDATE app_sessions SET last_used_at = NOW() WHERE id = $1`, [appSession.id]);
        }

        req.user = {
          id: appSession.user_id,
          email: appSession.email,
          full_name: appSession.full_name || null,
        };
        req.userId = String(appSession.user_id);
        req.tenantId = resolvedTenantId;
        req.authSessionId = String(appSession.id);
        return next();
      }
    } catch (sessionError) {
      console.warn('Session token validation failed:', sessionError);
    }

    if (isDev && devBypass) {
      req.user = { id: devUserId, email: 'dev@local' };
      req.userId = devUserId;
      req.tenantId = devTenantId;
      return next();
    }

    return res.status(401).json({ message: 'Invalid or expired token' });
  } catch (err) {
    console.error('Auth middleware error:', err);
    return res.status(401).json({ message: 'Authentication failed' });
  }
}
