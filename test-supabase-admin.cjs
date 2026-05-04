const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

async function test() {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_KEY;

  console.log("🔍 Testando Supabase Admin Auth...\n");
  console.log(`URL: ${url ? "✅ Definida" : "❌ NÃO DEFINIDA"}`);
  console.log(`Service Key: ${serviceKey ? "✅ Definida (primeiros 20 chars: " + serviceKey.substring(0, 20) + "...)" : "❌ NÃO DEFINIDA"}\n`);

  if (!url || !serviceKey) {
    console.error("❌ Variáveis de ambiente não configuradas");
    process.exit(1);
  }

  const client = createClient(url, serviceKey);

  try {
    console.log("📧 Criando usuário de teste...");
    const testEmail = `test-${Date.now()}@test.com`;

    const { data, error } = await client.auth.admin.createUser({
      email: testEmail,
      password: "TestPassword123!",
      user_metadata: { full_name: "Test User" }
    });

    if (error) {
      console.error("❌ Erro:", error);
      console.error("\nDetalhes do erro:");
      console.error(JSON.stringify(error, null, 2));
      process.exit(1);
    }

    console.log("✅ Usuário criado com sucesso!");
    console.log(`ID: ${data.user.id}`);
    console.log(`Email: ${data.user.email}`);
    
  } catch (err) {
    console.error("❌ Erro:", err.message);
    console.error(err);
  }
}

test();
