const { Pool } = require('pg');
const pool = new Pool({
  host: '185.216.203.73',
  port: 55439,
  database: 'postgres',
  user: 'postgres',
  password: '5etT0nkBoC2QkQJlg9iQubbnvLY98k8vPcuYZVIguB7LRAYxilr8zzfrkOuKNqkH'
});

async function main() {
  const client = await pool.connect();
  try {
    const result = await client.query(
      "SELECT id, name, is_default FROM agent_graphs WHERE tenant_id = '00000000-0000-0000-0000-000000000010'"
    );
    console.log('Graphs count:', result.rows.length);
    result.rows.forEach(r => console.log(r));
  } finally {
    client.release();
    await pool.end();
  }
}
main().catch(e => { console.error(e); process.exit(1); });
