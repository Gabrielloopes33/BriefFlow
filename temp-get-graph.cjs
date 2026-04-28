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
    // Get column names
    const cols = await client.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'agent_graphs'"
    );
    console.log('Columns:', cols.rows.map(r => r.column_name));

    const result = await client.query(
      "SELECT * FROM agent_graphs WHERE tenant_id = '00000000-0000-0000-0000-000000000010'"
    );
    console.log('\nGraphs count:', result.rows.length);
    result.rows.forEach(r => {
      console.log('\n=== GRAPH ===');
      Object.keys(r).forEach(k => {
        if (k === 'definition' || k === 'nodes' || k === 'edges' || k === 'config') {
          console.log(k + ':', JSON.stringify(r[k], null, 2));
        } else {
          console.log(k + ':', r[k]);
        }
      });
    });
  } finally {
    client.release();
    await pool.end();
  }
}
main().catch(e => { console.error(e); process.exit(1); });
