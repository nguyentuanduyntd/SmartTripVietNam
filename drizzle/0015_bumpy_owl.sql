CREATE TYPE "public"."notification_type" AS ENUM('story_deleted');--> statement-breakpoint
CREATE TABLE "community_post_deletion_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"post_id" uuid NOT NULL,
	"post_title" text,
	"author_id" uuid,
	"author_name" text,
	"deleted_by" uuid,
	"reason" text NOT NULL,
	"deleted_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" "notification_type" NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"metadata" jsonb,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "community_post_deletion_logs" ADD CONSTRAINT "community_post_deletion_logs_author_id_profiles_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_post_deletion_logs" ADD CONSTRAINT "community_post_deletion_logs_deleted_by_profiles_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "community_post_deletion_logs_post_id_idx" ON "community_post_deletion_logs" USING btree ("post_id");--> statement-breakpoint
CREATE INDEX "community_post_deletion_logs_author_id_idx" ON "community_post_deletion_logs" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX "community_post_deletion_logs_deleted_at_idx" ON "community_post_deletion_logs" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX "notifications_user_created_at_idx" ON "notifications" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "notifications_user_read_at_idx" ON "notifications" USING btree ("user_id","read_at");