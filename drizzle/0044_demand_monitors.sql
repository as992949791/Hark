CREATE TABLE "demand_monitor_runs" (
	"run_id" text PRIMARY KEY NOT NULL,
	"monitor_id" text NOT NULL,
	"processed_at" timestamp with time zone,
	"new_signal_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"delivery_state" text DEFAULT 'none' NOT NULL,
	"delivery_lease_until" timestamp with time zone,
	"delivered_at" timestamp with time zone,
	"delivery_error" text,
	CONSTRAINT "demand_monitor_delivery_state" CHECK ("demand_monitor_runs"."delivery_state" in ('none', 'pending', 'sending', 'sent', 'expired'))
);
--> statement-breakpoint
CREATE TABLE "demand_monitor_seen" (
	"id" text PRIMARY KEY NOT NULL,
	"monitor_id" text NOT NULL,
	"fingerprint" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "demand_monitors" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"key" text NOT NULL,
	"mode" text NOT NULL,
	"input" text NOT NULL,
	"project_id" text,
	"email_channel_id" text,
	"enabled" boolean DEFAULT false NOT NULL,
	"reason" text,
	"per_run_budget_micros" integer NOT NULL,
	"total_budget_micros" integer NOT NULL,
	"next_run_at" timestamp with time zone DEFAULT now() NOT NULL,
	"baseline_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "demand_monitor_budget" CHECK ("demand_monitors"."per_run_budget_micros" > 0 and "demand_monitors"."total_budget_micros" >= "demand_monitors"."per_run_budget_micros"),
	CONSTRAINT "demand_monitor_mode" CHECK ("demand_monitors"."mode" in ('product', 'topic') and ("demand_monitors"."mode" = 'product' or "demand_monitors"."project_id" is null))
);
--> statement-breakpoint
ALTER TABLE "demand_monitor_runs" ADD CONSTRAINT "demand_monitor_runs_run_id_demand_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."demand_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "demand_monitor_runs" ADD CONSTRAINT "demand_monitor_runs_monitor_id_demand_monitors_id_fk" FOREIGN KEY ("monitor_id") REFERENCES "public"."demand_monitors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "demand_monitor_seen" ADD CONSTRAINT "demand_monitor_seen_monitor_id_demand_monitors_id_fk" FOREIGN KEY ("monitor_id") REFERENCES "public"."demand_monitors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "demand_monitors" ADD CONSTRAINT "demand_monitors_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "demand_monitors" ADD CONSTRAINT "demand_monitors_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "demand_monitors" ADD CONSTRAINT "demand_monitors_email_channel_id_alerts_id_fk" FOREIGN KEY ("email_channel_id") REFERENCES "public"."alerts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "demand_monitor_runs_monitor_idx" ON "demand_monitor_runs" USING btree ("monitor_id");--> statement-breakpoint
CREATE UNIQUE INDEX "demand_monitor_seen_unique_idx" ON "demand_monitor_seen" USING btree ("monitor_id","fingerprint");--> statement-breakpoint
CREATE UNIQUE INDEX "demand_monitors_owner_key_idx" ON "demand_monitors" USING btree ("user_id","key");