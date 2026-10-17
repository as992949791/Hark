ALTER TABLE "demand_attempts" ADD COLUMN "result" jsonb;--> statement-breakpoint
ALTER TABLE "demand_runs" ADD COLUMN "retry_version" integer DEFAULT 0 NOT NULL;