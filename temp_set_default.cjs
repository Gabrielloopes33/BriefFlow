const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
async function main() {
  await pool.query("UPDATE agent_graphs SET is_default = true WHERE id = 'c308e404-1185-4311-9e94-9c3d79ea8655'");
  const { rows } = await pool.query('SELECT id, name, is_default FROM agent_graphs');
  console.log('Updated:', JSON.stringify(rows, null, 2));
  await pool.end();
}
main().catch(e => { console.error(e); process.exit(1); });
