import { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';
import { pool } from '../pg-pool';

declare global {
  namespace Express {
    interface Request {
      user?: any;
      userId?: string;
    }
  }
}

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

let supabaseClient: any;
let devIdentityReady = false;

const DEFAULT_DEV_USER_ID = '00000000-0000-0000-0000-000000000001';
const DEFAULT_DEV_TENANT_ID = '00000000-0000-0000-0000-000000000010';
const DEFAULT_DEV_TENANT_SLUG = 'dev-tenant-local';
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function resolveDevId(value: string | undefined, fallback: string): string {
  if (value && UUID_REGEX.test(value)) return value;
  return fallback;
}

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('SUPABASE_URL or SUPABASE_ANON_KEY not configured');
} else {
  supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
}

async function ensureDevIdentity(userId: string, tenantId: string) {
  if (devIdentityReady) return;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(
      `INSERT INTO auth.users (id) VALUES ($1) ON CONFLICT (id) DO NOTHING`,
      [userId]
    );

    await client.query(
      `INSERT INTO tenants (id, owner_user_id, name, slug, isolation_mode)
       VALUES ($1, $2, 'Development Tenant', $3, 'shared')
       ON CONFLICT (id) DO NOTHING`,
      [tenantId, userId, DEFAULT_DEV_TENANT_SLUG]
    );

    await client.query(
      `INSERT INTO tenant_members (tenant_id, user_id, role, is_active)
       VALUES ($1, $2, 'owner', true)
       ON CONFLICT (tenant_id, user_id) DO NOTHING`,
      [tenantId, userId]
    );

    await client.query('COMMIT');
    devIdentityReady = true;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    const isDev = process.env.NODE_ENV !== 'production';
    const devBypass = process.env.DEV_BYPASS_AUTH === 'true';
    const devUserId = resolveDevId(process.env.DEV_USER_ID, DEFAULT_DEV_USER_ID);
    const devTenantId = resolveDevId(process.env.DEV_TENANT_ID, DEFAULT_DEV_TENANT_ID);

    if (isDev && devBypass) {
      try {
        await ensureDevIdentity(devUserId, devTenantId);
      } catch (seedErr) {
        console.error('Failed to prepare development identity:', seedErr);
      }
    }

    const authHeader = req.headers.authorization;
    if (!authHeader) {
      if (isDev && devBypass) {
        req.user = { id: devUserId, email: 'dev@local' };
        req.userId = devUserId;
        return next();
      }
      return res.status(401).json({ message: 'Missing authorization header' });
    }

    const token = authHeader.replace('Bearer ', '');

    if (!supabaseClient) {
      if (isDev && devBypass) {
        req.user = { id: devUserId, email: 'dev@local' };
        req.userId = devUserId;
        return next();
      }
      return res.status(500).json({ message: 'Supabase client not configured' });
    }

    const { data: { user }, error } = await supabaseClient.auth.getUser(token);

    if (error || !user) {
      if (isDev && devBypass) {
        req.user = { id: devUserId, email: 'dev@local' };
        req.userId = devUserId;
        return next();
      }
      return res.status(401).json({ message: 'Invalid or expired token' });
    }

    req.user = user;
    req.userId = user.id;
    next();
  } catch (err) {
    console.error('Auth middleware error:', err);
    return res.status(401).json({ message: 'Authentication failed' });
  }
}
