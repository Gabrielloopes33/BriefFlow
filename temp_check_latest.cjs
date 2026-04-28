const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
async function main() {
  const { rows } = await pool.query("SELECT id, title, content, status, generated_by, created_at FROM posts ORDER BY created_at DESC LIMIT 3");
  console.log(JSON.stringify(rows, null, 2));
  await pool.end();
}
main().catch(e => { console.error(e); process.exit(1); });
