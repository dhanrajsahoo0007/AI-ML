CREATE TYPE "public"."user_role" AS ENUM('user', 'admin');--> statement-breakpoint
CREATE TYPE "public"."billing_provider" AS ENUM('dodo');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('succeeded', 'failed', 'refunded', 'partially_refunded', 'disputed', 'dispute_won', 'dispute_lost');--> statement-breakpoint
CREATE TYPE "public"."plan" AS ENUM('pro_monthly', 'pro_yearly');--> statement-breakpoint
CREATE TYPE "public"."price_tier" AS ENUM('A', 'B', 'C');--> statement-breakpoint
CREATE TYPE "public"."subscription_status" AS ENUM('active', 'on_hold', 'cancelled', 'expired', 'failed');--> statement-breakpoint
CREATE TYPE "public"."tier" AS ENUM('free', 'pro');--> statement-breakpoint
CREATE TYPE "public"."newsletter_event_type" AS ENUM('delivered', 'opened', 'clicked', 'bounced', 'complained');--> statement-breakpoint
CREATE TYPE "public"."newsletter_status" AS ENUM('pending', 'active', 'unsubscribed', 'bounced', 'complained');--> statement-breakpoint
CREATE TYPE "public"."consent_kind" AS ENUM('age_confirmation', 'terms', 'privacy', 'eu_withdrawal_waiver', 'newsletter_opt_in');--> statement-breakpoint
CREATE TABLE "account" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" uuid NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"role" "user_role" DEFAULT 'user' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customer" (
	"user_id" uuid NOT NULL,
	"provider" "billing_provider" NOT NULL,
	"provider_customer_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "customer_pkey" PRIMARY KEY("user_id","provider")
);
--> statement-breakpoint
CREATE TABLE "entitlement" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"tier" "tier" DEFAULT 'free' NOT NULL,
	"valid_until" timestamp with time zone,
	"subscription_id" uuid,
	"version" integer DEFAULT 1 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fx_rate" (
	"date" date NOT NULL,
	"currency" char(3) NOT NULL,
	"usd_rate" numeric(20, 10) NOT NULL,
	CONSTRAINT "fx_rate_pkey" PRIMARY KEY("date","currency"),
	CONSTRAINT "fx_rate_currency_check" CHECK (currency ~ '^[A-Z]{3}$'),
	CONSTRAINT "fx_rate_positive_check" CHECK ("fx_rate"."usd_rate" > 0)
);
--> statement-breakpoint
CREATE TABLE "payment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" "billing_provider" NOT NULL,
	"provider_payment_id" text NOT NULL,
	"user_id" uuid,
	"subscription_id" uuid,
	"status" "payment_status" NOT NULL,
	"currency" char(3) NOT NULL,
	"amount_minor" bigint NOT NULL,
	"tax_minor" bigint DEFAULT 0 NOT NULL,
	"amount_usd_minor" bigint,
	"country" char(2),
	"method" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payment_currency_check" CHECK (currency ~ '^[A-Z]{3}$'),
	CONSTRAINT "payment_country_check" CHECK (country IS NULL OR country ~ '^[A-Z]{2}$')
);
--> statement-breakpoint
CREATE TABLE "subscription" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"provider" "billing_provider" NOT NULL,
	"provider_subscription_id" text NOT NULL,
	"plan" "plan" NOT NULL,
	"status" "subscription_status" NOT NULL,
	"current_period_end" timestamp with time zone,
	"cancel_at_period_end" boolean DEFAULT false NOT NULL,
	"currency" char(3) NOT NULL,
	"amount_minor" bigint NOT NULL,
	"country" char(2),
	"price_tier" "price_tier",
	"provider_price_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "subscription_currency_check" CHECK (currency ~ '^[A-Z]{3}$'),
	CONSTRAINT "subscription_country_check" CHECK (country IS NULL OR country ~ '^[A-Z]{2}$'),
	CONSTRAINT "subscription_amount_check" CHECK ("subscription"."amount_minor" >= 0)
);
--> statement-breakpoint
CREATE TABLE "webhook_event" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" text NOT NULL,
	"event_id" text NOT NULL,
	"type" text NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone,
	"payload" jsonb NOT NULL,
	"error" text
);
--> statement-breakpoint
CREATE TABLE "newsletter_event" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subscriber_id" uuid NOT NULL,
	"issue_slug" text NOT NULL,
	"type" "newsletter_event_type" NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "newsletter_subscriber" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"user_id" uuid,
	"status" "newsletter_status" DEFAULT 'pending' NOT NULL,
	"source" text,
	"country" char(2),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"confirmed_at" timestamp with time zone,
	"unsubscribed_at" timestamp with time zone,
	CONSTRAINT "newsletter_subscriber_email_lower_check" CHECK ("newsletter_subscriber"."email" = lower("newsletter_subscriber"."email"))
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor" text NOT NULL,
	"action" text NOT NULL,
	"target" text,
	"meta" jsonb,
	"at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bookmark" (
	"user_id" uuid NOT NULL,
	"content_key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bookmark_pkey" PRIMARY KEY("user_id","content_key"),
	CONSTRAINT "bookmark_content_key_check" CHECK (content_key ~ '^[a-z0-9][a-z0-9/_-]{0,199}$')
);
--> statement-breakpoint
CREATE TABLE "consent_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"subscriber_id" uuid,
	"kind" "consent_kind" NOT NULL,
	"text_version" text NOT NULL,
	"country" char(2),
	"at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "consent_log_subject_check" CHECK ("consent_log"."user_id" is not null or "consent_log"."subscriber_id" is not null)
);
--> statement-breakpoint
CREATE TABLE "progress" (
	"user_id" uuid NOT NULL,
	"content_key" text NOT NULL,
	"completed_at" timestamp with time zone,
	"last_read_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "progress_pkey" PRIMARY KEY("user_id","content_key"),
	CONSTRAINT "progress_content_key_check" CHECK (content_key ~ '^[a-z0-9][a-z0-9/_-]{0,199}$')
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer" ADD CONSTRAINT "customer_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entitlement" ADD CONSTRAINT "entitlement_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entitlement" ADD CONSTRAINT "entitlement_subscription_id_subscription_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscription"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment" ADD CONSTRAINT "payment_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment" ADD CONSTRAINT "payment_subscription_id_subscription_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscription"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription" ADD CONSTRAINT "subscription_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "newsletter_event" ADD CONSTRAINT "newsletter_event_subscriber_id_newsletter_subscriber_id_fk" FOREIGN KEY ("subscriber_id") REFERENCES "public"."newsletter_subscriber"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "newsletter_subscriber" ADD CONSTRAINT "newsletter_subscriber_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookmark" ADD CONSTRAINT "bookmark_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consent_log" ADD CONSTRAINT "consent_log_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consent_log" ADD CONSTRAINT "consent_log_subscriber_id_newsletter_subscriber_id_fk" FOREIGN KEY ("subscriber_id") REFERENCES "public"."newsletter_subscriber"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "progress" ADD CONSTRAINT "progress_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "account_provider_account_key" ON "account" USING btree ("provider_id","account_id");--> statement-breakpoint
CREATE INDEX "account_user_id_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "session_token_key" ON "session" USING btree ("token");--> statement-breakpoint
CREATE INDEX "session_user_id_idx" ON "session" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "user_email_key" ON "user" USING btree ("email");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");--> statement-breakpoint
CREATE UNIQUE INDEX "customer_provider_customer_key" ON "customer" USING btree ("provider","provider_customer_id");--> statement-breakpoint
CREATE INDEX "entitlement_subscription_id_idx" ON "entitlement" USING btree ("subscription_id");--> statement-breakpoint
CREATE UNIQUE INDEX "payment_provider_payment_key" ON "payment" USING btree ("provider","provider_payment_id");--> statement-breakpoint
CREATE INDEX "payment_user_id_idx" ON "payment" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "payment_subscription_id_idx" ON "payment" USING btree ("subscription_id");--> statement-breakpoint
CREATE INDEX "payment_created_at_idx" ON "payment" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "subscription_provider_subscription_key" ON "subscription" USING btree ("provider","provider_subscription_id");--> statement-breakpoint
CREATE INDEX "subscription_user_status_idx" ON "subscription" USING btree ("user_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "subscription_one_live_per_user" ON "subscription" USING btree ("user_id") WHERE "subscription"."status" in ('active', 'on_hold');--> statement-breakpoint
CREATE UNIQUE INDEX "webhook_event_provider_event_key" ON "webhook_event" USING btree ("provider","event_id");--> statement-breakpoint
CREATE INDEX "webhook_event_unprocessed_idx" ON "webhook_event" USING btree ("received_at") WHERE "webhook_event"."processed_at" is null;--> statement-breakpoint
CREATE INDEX "newsletter_event_subscriber_id_idx" ON "newsletter_event" USING btree ("subscriber_id");--> statement-breakpoint
CREATE INDEX "newsletter_event_issue_idx" ON "newsletter_event" USING btree ("issue_slug","type");--> statement-breakpoint
CREATE UNIQUE INDEX "newsletter_subscriber_email_key" ON "newsletter_subscriber" USING btree ("email");--> statement-breakpoint
CREATE INDEX "newsletter_subscriber_user_id_idx" ON "newsletter_subscriber" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "audit_log_target_idx" ON "audit_log" USING btree ("target");--> statement-breakpoint
CREATE INDEX "audit_log_at_idx" ON "audit_log" USING btree ("at");--> statement-breakpoint
CREATE INDEX "consent_log_user_kind_idx" ON "consent_log" USING btree ("user_id","kind");--> statement-breakpoint
CREATE INDEX "consent_log_subscriber_id_idx" ON "consent_log" USING btree ("subscriber_id");--> statement-breakpoint
CREATE VIEW "public"."current_entitlement" AS (select "user_id", case when "tier" = 'pro' and ("valid_until" is null or "valid_until" > now()) then 'pro'::tier else 'free'::tier end as "tier", "valid_until", "version" from "entitlement");