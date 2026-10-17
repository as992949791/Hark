import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { bigint, check, foreignKey, index, integer, jsonb, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { projects, users } from "./tenant";
import type { DemandTheme, ProfileSnapshot } from "@/lib/demand/contracts";

const id = () => text("id").primaryKey().$defaultFn(() => randomUUID());

export const demandRuns = pgTable("demand_runs", {
  id: id(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  key: text("key").notNull(),
  mode: text("mode", { enum: ["product", "topic"] }).notNull(),
  input: text("input"),
  projectId: text("project_id").references(() => projects.id, { onDelete: "set null" }),
  profileSnapshot: jsonb("profile_snapshot").$type<ProfileSnapshot>(),
  status: text("status", { enum: ["queued", "running", "partial", "complete", "blocked", "failed", "expired"] }).notNull().default("queued"),
  error: text("error"),
  progress: text("progress"),
  budgetMicros: integer("budget_micros").notNull(),
  reservedMicros: integer("reserved_micros").notNull().default(0),
  spentMicros: bigint("spent_micros", { mode: "number" }).notNull().default(0),
  maxAttempts: integer("max_attempts").notNull().default(30),
  retryVersion: integer("retry_version").notNull().default(0),
  leaseToken: text("lease_token"),
  leaseExpiresAt: timestamp("lease_expires_at", { withTimezone: true }),
  themes: jsonb("themes").$type<DemandTheme[]>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
}, (t) => [
  uniqueIndex("demand_runs_owner_key_idx").on(t.userId, t.key),
  index("demand_runs_owner_created_idx").on(t.userId, t.createdAt),
  check("demand_run_budget", sql`${t.budgetMicros} >= 0 and ${t.reservedMicros} >= 0 and ${t.spentMicros} >= 0 and ${t.maxAttempts} between 1 and 100`),
  check("demand_run_mode", sql`${t.mode} in ('product', 'topic') and (${t.mode} = 'product' or (${t.projectId} is null and ${t.profileSnapshot} is null))`),
  check("demand_run_status", sql`${t.status} in ('queued', 'running', 'partial', 'complete', 'blocked', 'failed', 'expired')`),
]);

/** Retrieved text is immutable; a discovery hint may acquire full text before analysis. Expiry deletes it. */
export const demandDocuments = pgTable("demand_documents", {
  id: id(),
  runId: text("run_id").notNull().references(() => demandRuns.id, { onDelete: "cascade" }),
  purpose: text("purpose", { enum: ["profile", "demand"] }).notNull(),
  source: text("source", { enum: ["reddit", "x", "web"] }).notNull(),
  query: text("query"),
  url: text("url").notNull(),
  canonicalUrl: text("canonical_url").notNull(),
  snippet: text("snippet"),
  body: text("body"),
  contentHash: text("content_hash"),
  author: text("author"),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  outcome: text("outcome", { enum: ["retrieved", "snippet_only", "failed"] }).notNull(),
  retrievedAt: timestamp("retrieved_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex("demand_documents_id_run_idx").on(t.id, t.runId),
  uniqueIndex("demand_documents_run_url_idx").on(t.runId, t.purpose, t.canonicalUrl),
  check("demand_document_source", sql`${t.source} in ('reddit', 'x', 'web') and ${t.purpose} in ('profile', 'demand')`),
  check("demand_document_body", sql`(${t.outcome} = 'retrieved' and ${t.body} is not null and ${t.contentHash} is not null) or (${t.outcome} in ('snippet_only', 'failed') and ${t.body} is null)`),
]);

export const demandSignals = pgTable("demand_signals", {
  id: id(),
  runId: text("run_id").notNull().references(() => demandRuns.id, { onDelete: "cascade" }),
  documentId: text("document_id").notNull(),
  quoteStart: integer("quote_start").notNull(),
  quoteEnd: integer("quote_end").notNull(),
  quote: text("quote").notNull(),
  explanation: text("explanation").notNull(),
  requestType: text("request_type").notNull(),
  author: text("author"),
  productFit: text("product_fit", { enum: ["yes", "no", "unknown"] }),
}, (t) => [
  index("demand_signals_run_idx").on(t.runId),
  foreignKey({ columns: [t.documentId, t.runId], foreignColumns: [demandDocuments.id, demandDocuments.runId] }).onDelete("cascade"),
  check("demand_signal_span", sql`${t.quoteStart} >= 0 and ${t.quoteEnd} > ${t.quoteStart}`),
]);

export const demandAttempts = pgTable("demand_attempts", {
  id: id(),
  runId: text("run_id").notNull().references(() => demandRuns.id, { onDelete: "cascade" }),
  key: text("key").notNull(),
  kind: text("kind", { enum: ["data", "model"] }).notNull(),
  source: text("source", { enum: ["reddit", "x", "web"] }).notNull(),
  operation: text("operation").notNull(),
  upperBoundMicros: integer("upper_bound_micros").notNull(),
  actualMicros: integer("actual_micros"),
  requestId: text("request_id"),
  /** Normalized output and its charge commit together; expiry redacts this content. */
  result: jsonb("result").$type<{ ok: true; value: unknown } | { ok: false; error: string }>(),
  status: text("status", { enum: ["reserved", "settled", "uncertain"] }).notNull().default("reserved"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex("demand_attempts_run_key_idx").on(t.runId, t.key),
  uniqueIndex("demand_attempts_id_run_idx").on(t.id, t.runId),
  index("demand_attempts_pending_idx").on(t.status),
  check("demand_attempt_cost", sql`${t.upperBoundMicros} > 0 and (${t.actualMicros} is null or ${t.actualMicros} >= 0)`),
  check("demand_attempt_state", sql`${t.status} in ('reserved', 'uncertain', 'settled') and (${t.status} = 'settled') = (${t.actualMicros} is not null)`),
  check("demand_attempt_kind", sql`${t.kind} in ('data', 'model') and ${t.source} in ('reddit', 'x', 'web')`),
]);
