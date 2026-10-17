CREATE TABLE "demand_attempts" (
	"id" text PRIMARY KEY NOT NULL,
	"run_id" text NOT NULL,
	"key" text NOT NULL,
	"kind" text NOT NULL,
	"source" text NOT NULL,
	"operation" text NOT NULL,
	"upper_bound_micros" integer NOT NULL,
	"actual_micros" integer,
	"request_id" text,
	"status" text DEFAULT 'reserved' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "demand_attempt_cost" CHECK ("demand_attempts"."upper_bound_micros" > 0 and ("demand_attempts"."actual_micros" is null or "demand_attempts"."actual_micros" >= 0)),
	CONSTRAINT "demand_attempt_state" CHECK ("demand_attempts"."status" in ('reserved', 'uncertain', 'settled') and ("demand_attempts"."status" = 'settled') = ("demand_attempts"."actual_micros" is not null)),
	CONSTRAINT "demand_attempt_kind" CHECK ("demand_attempts"."kind" in ('data', 'model') and "demand_attempts"."source" in ('reddit', 'x', 'web'))
);
--> statement-breakpoint
CREATE TABLE "demand_documents" (
	"id" text PRIMARY KEY NOT NULL,
	"run_id" text NOT NULL,
	"purpose" text NOT NULL,
	"source" text NOT NULL,
	"query" text,
	"url" text NOT NULL,
	"canonical_url" text NOT NULL,
	"snippet" text,
	"body" text,
	"content_hash" text,
	"author" text,
	"published_at" timestamp with time zone,
	"outcome" text NOT NULL,
	"retrieved_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "demand_document_source" CHECK ("demand_documents"."source" in ('reddit', 'x', 'web') and "demand_documents"."purpose" in ('profile', 'demand')),
	CONSTRAINT "demand_document_body" CHECK (("demand_documents"."outcome" = 'retrieved' and "demand_documents"."body" is not null and "demand_documents"."content_hash" is not null) or ("demand_documents"."outcome" in ('snippet_only', 'failed') and "demand_documents"."body" is null))
);
--> statement-breakpoint
CREATE TABLE "demand_runs" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"key" text NOT NULL,
	"mode" text NOT NULL,
	"input" text,
	"project_id" text,
	"profile_snapshot" jsonb,
	"status" text DEFAULT 'queued' NOT NULL,
	"error" text,
	"progress" text,
	"budget_micros" integer NOT NULL,
	"reserved_micros" integer DEFAULT 0 NOT NULL,
	"spent_micros" bigint DEFAULT 0 NOT NULL,
	"max_attempts" integer DEFAULT 30 NOT NULL,
	"lease_token" text,
	"lease_expires_at" timestamp with time zone,
	"themes" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone,
	"expires_at" timestamp with time zone NOT NULL,
	CONSTRAINT "demand_run_budget" CHECK ("demand_runs"."budget_micros" >= 0 and "demand_runs"."reserved_micros" >= 0 and "demand_runs"."spent_micros" >= 0 and "demand_runs"."max_attempts" between 1 and 100),
	CONSTRAINT "demand_run_mode" CHECK ("demand_runs"."mode" in ('product', 'topic') and ("demand_runs"."mode" = 'product' or ("demand_runs"."project_id" is null and "demand_runs"."profile_snapshot" is null))),
	CONSTRAINT "demand_run_status" CHECK ("demand_runs"."status" in ('queued', 'running', 'partial', 'complete', 'blocked', 'failed', 'expired'))
);
--> statement-breakpoint
CREATE TABLE "demand_signals" (
	"id" text PRIMARY KEY NOT NULL,
	"run_id" text NOT NULL,
	"document_id" text NOT NULL,
	"quote_start" integer NOT NULL,
	"quote_end" integer NOT NULL,
	"quote" text NOT NULL,
	"explanation" text NOT NULL,
	"request_type" text NOT NULL,
	"author" text,
	"product_fit" text,
	CONSTRAINT "demand_signal_span" CHECK ("demand_signals"."quote_start" >= 0 and "demand_signals"."quote_end" > "demand_signals"."quote_start")
);
--> statement-breakpoint
ALTER TABLE "usage_ledger" ALTER COLUMN "project_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "demand_run_id" text;--> statement-breakpoint
ALTER TABLE "llm_usage" ADD COLUMN "demand_run_id" text;--> statement-breakpoint
ALTER TABLE "llm_usage" ADD COLUMN "demand_attempt_id" text;--> statement-breakpoint
ALTER TABLE "usage_ledger" ADD COLUMN "demand_run_id" text;--> statement-breakpoint
ALTER TABLE "usage_ledger" ADD COLUMN "demand_attempt_id" text;--> statement-breakpoint
CREATE UNIQUE INDEX "demand_attempts_id_run_idx" ON "demand_attempts" USING btree ("id","run_id");--> statement-breakpoint
CREATE UNIQUE INDEX "demand_documents_id_run_idx" ON "demand_documents" USING btree ("id","run_id");--> statement-breakpoint
ALTER TABLE "demand_attempts" ADD CONSTRAINT "demand_attempts_run_id_demand_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."demand_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "demand_documents" ADD CONSTRAINT "demand_documents_run_id_demand_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."demand_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "demand_runs" ADD CONSTRAINT "demand_runs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "demand_runs" ADD CONSTRAINT "demand_runs_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "demand_signals" ADD CONSTRAINT "demand_signals_run_id_demand_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."demand_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "demand_signals" ADD CONSTRAINT "demand_signals_document_id_run_id_demand_documents_id_run_id_fk" FOREIGN KEY ("document_id","run_id") REFERENCES "public"."demand_documents"("id","run_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "demand_attempts_run_key_idx" ON "demand_attempts" USING btree ("run_id","key");--> statement-breakpoint
CREATE INDEX "demand_attempts_pending_idx" ON "demand_attempts" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "demand_documents_run_url_idx" ON "demand_documents" USING btree ("run_id","purpose","canonical_url");--> statement-breakpoint
CREATE UNIQUE INDEX "demand_runs_owner_key_idx" ON "demand_runs" USING btree ("user_id","key");--> statement-breakpoint
CREATE INDEX "demand_runs_owner_created_idx" ON "demand_runs" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "demand_signals_run_idx" ON "demand_signals" USING btree ("run_id");--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_demand_run_id_demand_runs_id_fk" FOREIGN KEY ("demand_run_id") REFERENCES "public"."demand_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "llm_usage" ADD CONSTRAINT "llm_usage_demand_attempt_id_demand_run_id_demand_attempts_id_run_id_fk" FOREIGN KEY ("demand_attempt_id","demand_run_id") REFERENCES "public"."demand_attempts"("id","run_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usage_ledger" ADD CONSTRAINT "usage_ledger_demand_attempt_id_demand_run_id_demand_attempts_id_run_id_fk" FOREIGN KEY ("demand_attempt_id","demand_run_id") REFERENCES "public"."demand_attempts"("id","run_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "jobs_demand_run_idx" ON "jobs" USING btree ("demand_run_id");--> statement-breakpoint
CREATE UNIQUE INDEX "llm_usage_demand_attempt_idx" ON "llm_usage" USING btree ("demand_attempt_id");--> statement-breakpoint
CREATE UNIQUE INDEX "usage_ledger_demand_attempt_idx" ON "usage_ledger" USING btree ("demand_attempt_id");--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_demand_scope" CHECK (("jobs"."kind" = 'demand_research' and "jobs"."demand_run_id" is not null and "jobs"."project_id" is null) or ("jobs"."kind" <> 'demand_research' and "jobs"."demand_run_id" is null));--> statement-breakpoint
ALTER TABLE "llm_usage" ADD CONSTRAINT "llm_usage_demand_pair" CHECK (("llm_usage"."demand_run_id" is null) = ("llm_usage"."demand_attempt_id" is null));--> statement-breakpoint
ALTER TABLE "usage_ledger" ADD CONSTRAINT "usage_ledger_owner" CHECK ("usage_ledger"."project_id" is not null or "usage_ledger"."demand_run_id" is not null);--> statement-breakpoint
ALTER TABLE "usage_ledger" ADD CONSTRAINT "usage_ledger_demand_pair" CHECK (("usage_ledger"."demand_run_id" is null) = ("usage_ledger"."demand_attempt_id" is null));