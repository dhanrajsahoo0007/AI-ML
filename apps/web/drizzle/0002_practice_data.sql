CREATE TABLE "practice_rating" (
	"user_id" uuid NOT NULL,
	"question_id" text NOT NULL,
	"rating" smallint NOT NULL,
	"times" integer DEFAULT 1 NOT NULL,
	"practised_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "practice_rating_pkey" PRIMARY KEY("user_id","question_id"),
	CONSTRAINT "practice_rating_question_id_check" CHECK (question_id ~ '^[a-z0-9][a-z0-9-]{0,199}$'),
	CONSTRAINT "practice_rating_rating_check" CHECK (rating between 1 and 5),
	CONSTRAINT "practice_rating_times_check" CHECK (times between 1 and 100000)
);
--> statement-breakpoint
CREATE TABLE "practice_story" (
	"user_id" uuid NOT NULL,
	"id" text NOT NULL,
	"title" text DEFAULT '' NOT NULL,
	"situation" text DEFAULT '' NOT NULL,
	"action" text DEFAULT '' NOT NULL,
	"result" text DEFAULT '' NOT NULL,
	"learning" text DEFAULT '' NOT NULL,
	"covers" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "practice_story_pkey" PRIMARY KEY("user_id","id"),
	CONSTRAINT "practice_story_id_check" CHECK (id ~ '^[a-z0-9][a-z0-9-]{5,39}$'),
	CONSTRAINT "practice_story_length_check" CHECK (char_length(title) <= 120 and char_length(situation) <= 1500 and char_length(action) <= 4000 and char_length(result) <= 1500 and char_length(learning) <= 1500)
);
--> statement-breakpoint
ALTER TABLE "practice_rating" ADD CONSTRAINT "practice_rating_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "practice_story" ADD CONSTRAINT "practice_story_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;