import { Pool, PoolClient } from 'pg';

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: false,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

// Ensure network/socket errors on checked-out clients never crash the process.
pool.on('connect', (client) => {
  client.on('error', (err) => {
    console.error('[pg-client] connection error', err);
  });
});

pool.on('error', (err) => {
  console.error('[pg-pool] unexpected error on idle client', err);
});

/**
 * Get a client from the pool with app.current_user_id set for the session.
 * This activates auth.uid() → RLS policies that check tenant membership.
 *
 * Usage:
 *   const client = await getClientForUser(userId);
 *   try { ... } finally { client.release(); }
 */
export async function getClientForUser(userId: string | undefined): Promise<PoolClient> {
  const client = await pool.connect();
  const uid = userId ?? '00000000-0000-0000-0000-000000000000';
  await client.query(`SELECT set_config('app.current_user_id', $1, false)`, [uid]);
  return client;
}

/** Thin helper to run a single query using a pool client with user context. */
export async function queryAsUser<T = any>(
  userId: string | undefined,
  sql: string,
  params: any[] = []
): Promise<T[]> {
  const client = await getClientForUser(userId);
  try {
    const result = await client.query(sql, params);
    return result.rows as T[];
  } finally {
    client.release();
  }
}
