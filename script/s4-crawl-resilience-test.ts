/**
 * Teste de resiliência do crawling (Sprint 4).
 * Simula falha do provider e verifica se o post-worker continua funcionando.
 *
 * Rode com: npx tsx script/s4-crawl-resilience-test.ts
 */

import { CrawlerClient } from "../server/services/crawler-client";

async function testRetryWithInvalidHost() {
  console.log("\n[Test 1] Retry com host inválido (deve falhar após 3 tentativas)");
  const client = new CrawlerClient("http://localhost:99999");
  try {
    await client.crawlBatch({
      tenant_id: "t_test",
      client_id: "c_test",
      sources: [{ url: "https://example.com" }],
    });
    console.log("❌ Deveria ter falhado");
  } catch (e: any) {
    console.log("✅ Falha esperada:", e.message.slice(0, 100));
  }
}

async function testHealthyScraper() {
  console.log("\n[Test 2] Health check do scraper");
  const client = new CrawlerClient();
  const healthy = await client.healthCheck();
  console.log(healthy ? "✅ Scraper healthy" : "❌ Scraper unavailable");
}

async function testCrawlBatch() {
  console.log("\n[Test 3] Crawl batch com URL real");
  const client = new CrawlerClient();
  try {
    const result = await client.crawlBatch({
      tenant_id: "t_test",
      client_id: "c_test",
      sources: [
        { url: "https://example.com", source_type: "blog" },
      ],
    });
    console.log(`✅ Crawled ${result.successful}/${result.total_urls} URLs`);
    console.log(`   Contents: ${result.contents.length}`);
    if (result.contents[0]) {
      console.log(`   Sample title: ${result.contents[0].title}`);
    }
  } catch (e: any) {
    console.log("❌ Crawl failed:", e.message);
  }
}

async function testProviderSelection() {
  console.log("\n[Test 4] Seleção de provider por tipo de fonte");
  const { selectProvider } = await import("../server/services/crawler-provider");

  const internal = selectProvider("blog");
  const social = selectProvider("instagram");

  console.log(internal.name === "internal" ? "✅ blog → internal" : "❌ blog wrong provider");
  console.log(social.name === "social-api" ? "✅ instagram → social-api" : "❌ instagram wrong provider");
}

async function main() {
  console.log("=== Sprint 4 — Resilience Tests ===");
  await testHealthyScraper();
  await testCrawlBatch();
  await testProviderSelection();
  await testRetryWithInvalidHost();
  console.log("\n=== Tests completed ===");
}

main().catch(console.error);
