#!/usr/bin/env node

/**
 * Debug script para verificar Supabase Auth connection
 */

const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

console.log("🔍 Verificando configuração Supabase...\n");
console.log(`📍 URL: ${supabaseUrl || "❌ NÃO DEFINIDA"}`);
console.log(`🔑 Anon Key: ${supabaseAnonKey ? "✅ Definida" : "❌ NÃO DEFINIDA"}`);
console.log(`🔐 Service Key: ${supabaseServiceKey ? "✅ Definida" : "❌ NÃO DEFINIDA"}`);
console.log("");

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Erro: SUPABASE_URL ou SUPABASE_SERVICE_KEY não estão definidas\n");
  process.exit(1);
}

// Testar cliente admin
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function testAuth() {
  console.log("🧪 Testando criação de usuário...\n");

  const testEmail = `test-${Date.now()}@example.com`;
  const testPassword = "TestPassword123!";

  console.log(`📧 Email de teste: ${testEmail}`);
  console.log(`🔐 Senha: ${testPassword}\n`);

  try {
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      user_metadata: {
        full_name: "Test User",
      },
      autoconfirm: true,
    });

    if (error) {
      console.error("❌ Erro ao criar usuário:", error.message);
      process.exit(1);
    }

    if (data?.user) {
      console.log("✅ Usuário criado com sucesso!");
      console.log(`   ID: ${data.user.id}`);
      console.log(`   Email: ${data.user.email}`);
      console.log(`   Confirmado: ${data.user.email_confirmed_at ? "✅ Sim" : "❌ Não"}\n`);

      // Tentar fazer login
      console.log("🧪 Testando login...\n");

      const supabasePublic = createClient(supabaseUrl, supabaseAnonKey);
      const loginResult = await supabasePublic.auth.signInWithPassword({
        email: testEmail,
        password: testPassword,
      });

      if (loginResult.error) {
        console.error("❌ Erro ao fazer login:", loginResult.error.message);
        process.exit(1);
      }

      if (loginResult.data?.session) {
        console.log("✅ Login bem-sucedido!");
        console.log(`   Token: ${loginResult.data.session.access_token.substring(0, 20)}...`);
        const expiresAt = loginResult.data.session.expires_at;
        if (expiresAt) {
          console.log(`   Expira em: ${new Date(expiresAt * 1000).toISOString()}\n`);
        }
        console.log("🎉 Supabase Auth está funcionando corretamente!\n");
      }
    }
  } catch (error: any) {
    console.error("❌ Erro ao testar:", error.message);
    process.exit(1);
  }
}

testAuth();
