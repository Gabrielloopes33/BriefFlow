const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
async function main() {
  const { rows } = await pool.query("SELECT id, name, nodes, edges FROM agent_graphs WHERE id = 'c308e404-1185-4311-9e94-9c3d79ea8655'");
  console.log(JSON.stringify(rows[0], null, 2));
  await pool.end();
}
main().catch(e => { console.error(e); process.exit(1); });
