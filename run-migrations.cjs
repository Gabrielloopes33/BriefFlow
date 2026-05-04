#!/usr/bin/env node

/**
 * Script para aplicar todas as migrations (001-017) no PostgreSQL/Supabase
 * Uso: node run-migrations.cjs
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Carregar .env manualmente
const envPath = path.join(__dirname, '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const envLines = envContent.split('\n');
const env = process.env;

for (const line of envLines) {
  const match = line.match(/^([^=]+)=(.+)$/);
  if (match) {
    env[match[1]] = match[2];
  }
}

const DATABASE_URL = env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ Erro: DATABASE_URL não está definida no .env');
  process.exit(1);
}

console.log('🚀 Iniciando aplicação de migrations (001-017)...\n');
console.log(`📍 Banco de dados: ${DATABASE_URL.substring(0, 30)}...`);
console.log('');

const migrationsDir = path.join(__dirname, 'supabase', 'migrations');
const migrations = [
  '001_initial_schema.sql',
  '002_rls_policies.sql',
  '003_knowledge_items.sql',
  '004_analytics_tokens.sql',
  '005_tenant_control_plane.sql',
  '006_posts_and_jobs.sql',
  '007_agents_and_graphs.sql',
  '008_analytics_cache.sql',
  '009_creatives.sql',
  '010_client_wizard_fields.sql',
  '011_posts_search_index.sql',
  '012_posts_status_audit.sql',
  '013_creatives_v2.sql',
  '014_creative_format.sql',
  '015_template_editorial_defaults.sql',
  '016_layout_modes_extended.sql',
  '017_auth_sessions_and_profiles.sql'
];

let successCount = 0;
let failCount = 0;

for (const migration of migrations) {
  const migrationPath = path.join(migrationsDir, migration);
  
  if (!fs.existsSync(migrationPath)) {
    console.log(`⚠️  ${migration} - arquivo não encontrado`);
    failCount++;
    continue;
  }

  process.stdout.write(`▶️  ${migration.padEnd(40)} `);

  try {
    // Usar psql com DATABASE_URL
    const cmd = `psql "${DATABASE_URL}" -f "${migrationPath}"`;
    
    execSync(cmd, {
      stdio: 'pipe',
      timeout: 30000,
      maxBuffer: 10 * 1024 * 1024 // 10MB
    });

    console.log('✅ OK');
    successCount++;
  } catch (error) {
    console.log('❌ ERRO');
    failCount++;
    
    // Tentar extrair mensagem de erro
    const errorMsg = error.stderr ? error.stderr.toString() : error.message;
    const firstLine = errorMsg.split('\n')[0];
    if (firstLine) {
      console.log(`   └─ ${firstLine.substring(0, 80)}`);
    }
  }
}

console.log('');
console.log('═'.repeat(50));
console.log(`📊 Resumo: ${successCount} ✅ OK | ${failCount} ❌ Falhas`);
console.log('═'.repeat(50));

if (failCount === 0) {
  console.log('\n✨ Todas as migrations foram aplicadas com sucesso!\n');
  process.exit(0);
} else {
  console.log('\n⚠️  Algumas migrations falharam.\n');
  process.exit(1);
}
