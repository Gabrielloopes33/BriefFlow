const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
async function main() {
  const { rows } = await pool.query("SELECT id, title, content, status, generated_by FROM posts WHERE id = '9c290112-3bcd-458a-ab15-cdc047743c91'");
  console.log(JSON.stringify(rows, null, 2));
  await pool.end();
}
main().catch(e => { console.error(e); process.exit(1); });
