const { Client } = require('pg');
require('dotenv').config();

async function fix() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  
  try {
    // Backfill app_user_id from user_id where app_user_id is null
    const r = await client.query(`
      UPDATE tenant_members tm
      SET app_user_id = tm.user_id
      FROM app_users au
      WHERE tm.app_user_id IS NULL
        AND tm.user_id = au.id
    `);
    console.log('Backfilled app_user_id:', r.rowCount, 'rows');

    // Delete rows that still have null app_user_id (no matching app_users)
    const del = await client.query('DELETE FROM tenant_members WHERE app_user_id IS NULL');
    console.log('Deleted orphan rows:', del.rowCount);
    
    // Now make app_user_id NOT NULL
    await client.query('ALTER TABLE tenant_members ALTER COLUMN app_user_id SET NOT NULL');
    console.log('Made app_user_id NOT NULL');
    
    // Add new PK
    await client.query('ALTER TABLE tenant_members DROP CONSTRAINT IF EXISTS tenant_members_tenant_app_user_unique');
    await client.query('ALTER TABLE tenant_members ADD PRIMARY KEY (tenant_id, app_user_id)');
    console.log('Added new PK (tenant_id, app_user_id)');
    
  } catch (e) {
    console.log('Error:', e.message);
  }
  
  await client.end();
}
fix().catch(console.error);
