import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { pgTable, text as pgText, serial, integer as pgInteger, boolean as pgBoolean, timestamp as pgTimestamp, uuid as pgUuid, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";

// Database agnostic table exports
export const clients = sqliteTable("clients", {
  id: text("id").primaryKey().$default(() => crypto.randomUUID()),
  name: text("name").notNull(),
  description: text("description"),
  niche: text("niche"),
  targetAudience: text("target_audience"),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

export const sources = sqliteTable("sources", {
  id: text("id").primaryKey().$default(() => crypto.randomUUID()),
  clientId: text("client_id").notNull().references(() => clients.id, { onDelete: 'cascade' }),
  name: text("name").notNull(),
  url: text("url").notNull(),
  type: text("type").default('blog').notNull(), // blog, youtube, news
  isActive: integer("is_active", { mode: "boolean" }).default(true).notNull(),
  lastScrapedAt: integer("last_scraped_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

export const contents = sqliteTable("contents", {
  id: text("id").primaryKey().$default(() => crypto.randomUUID()),
  sourceId: text("source_id").notNull().references(() => sources.id, { onDelete: 'cascade' }),
  clientId: text("client_id").notNull().references(() => clients.id, { onDelete: 'cascade' }),
  title: text("title").notNull(),
  url: text("url").notNull(),
  contentText: text("content_text"),
  summary: text("summary"),
  topics: text("topics", { mode: "json" }), // JSON for SQLite
  publishedAt: integer("published_at", { mode: "timestamp" }),
  scrapedAt: integer("scraped_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
  isAnalyzed: integer("is_analyzed", { mode: "boolean" }).default(false).notNull(),
});

export const briefs = sqliteTable("briefs", {
  id: text("id").primaryKey().$default(() => crypto.randomUUID()),
  clientId: text("client_id").notNull().references(() => clients.id, { onDelete: 'cascade' }),
  contentIds: text("content_ids", { mode: "json" }), // JSON array for SQLite
  title: text("title").notNull(),
  angle: text("angle"),
  keyPoints: text("key_points", { mode: "json" }), // JSON array for SQLite
  contentType: text("content_type"),
  suggestedCopy: text("suggested_copy"),
  status: text("status").default('draft').notNull(), // draft, approved, rejected
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
  generatedBy: text("generated_by").default('openai'),
});

export const analysisConfigs = sqliteTable("analysis_configs", {
  id: text("id").primaryKey().$default(() => crypto.randomUUID()),
  clientId: text("client_id").notNull().references(() => clients.id, { onDelete: 'cascade' }),
  minContentLength: integer("min_content_length").default(500),
  topicsOfInterest: text("topics_of_interest", { mode: "json" }), // JSON array for SQLite
  excludePatterns: text("exclude_patterns", { mode: "json" }), // JSON array for SQLite
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

export const knowledgeItems = sqliteTable("knowledge_items", {
  id: text("id").primaryKey().$default(() => crypto.randomUUID()),
  userId: text("user_id").notNull(),
  clientId: text("client_id").notNull().references(() => clients.id, { onDelete: 'cascade' }),
  title: text("title").notNull(),
  content: text("content").notNull(),
  type: text("type").notNull(), // scrape, search, agent, map, crawl
  sourceUrl: text("source_url"),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

export const analyticsTokens = sqliteTable("analytics_tokens", {
  id: text("id").primaryKey().$default(() => crypto.randomUUID()),
  userId: text("user_id").notNull(),
  platform: text("platform").notNull(), // meta, google
  accountId: text("account_id").notNull(),
  accountName: text("account_name"),
  accountType: text("account_type").notNull(), // page, ad_account, mcc
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token"),
  expiresAt: integer("expires_at", { mode: "timestamp" }),
  isActive: integer("is_active", { mode: "boolean" }).default(true).notNull(),
  isSelected: integer("is_selected", { mode: "boolean" }).default(false).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

// === SCHEMAS ===

export const insertClientSchema = createInsertSchema(clients).omit({ id: true, createdAt: true });
export const insertSourceSchema = createInsertSchema(sources).omit({ id: true, createdAt: true, lastScrapedAt: true });
export const insertContentSchema = createInsertSchema(contents).omit({ id: true, scrapedAt: true });
export const insertBriefSchema = createInsertSchema(briefs).omit({ id: true, createdAt: true });
export const insertAnalysisConfigSchema = createInsertSchema(analysisConfigs).omit({ id: true, createdAt: true });
export const insertKnowledgeItemSchema = createInsertSchema(knowledgeItems).omit({ id: true, createdAt: true });
export const insertAnalyticsTokenSchema = createInsertSchema(analyticsTokens).omit({ id: true, createdAt: true, updatedAt: true });

// === TYPES ===

type InferSchemaType<TSchema> = TSchema extends { _type: infer TOutput } ? TOutput : never;

export type Client = typeof clients.$inferSelect;
export type InsertClient = InferSchemaType<typeof insertClientSchema>;

export type Source = typeof sources.$inferSelect;
export type InsertSource = InferSchemaType<typeof insertSourceSchema>;

export type Content = typeof contents.$inferSelect;
export type InsertContent = InferSchemaType<typeof insertContentSchema>;

export type Brief = typeof briefs.$inferSelect;
export type InsertBrief = InferSchemaType<typeof insertBriefSchema>;

export type AnalysisConfig = typeof analysisConfigs.$inferSelect;
export type InsertAnalysisConfig = InferSchemaType<typeof insertAnalysisConfigSchema>;

export type KnowledgeItem = typeof knowledgeItems.$inferSelect;
export type InsertKnowledgeItem = InferSchemaType<typeof insertKnowledgeItemSchema>;

export type AnalyticsToken = typeof analyticsTokens.$inferSelect;
export type InsertAnalyticsToken = InferSchemaType<typeof insertAnalyticsTokenSchema>;