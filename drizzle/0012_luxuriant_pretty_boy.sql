CREATE TYPE "public"."community_report_reason" AS ENUM('spam', 'harassment', 'hate_speech', 'inappropriate_content', 'misinformation', 'other');--> statement-breakpoint
CREATE TYPE "public"."community_report_status" AS ENUM('pending', 'resolved', 'dismissed');--> statement-breakpoint
CREATE TABLE "community_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reporter_id" uuid NOT NULL,
	"post_id" uuid,
	"comment_id" uuid,
	"reason" "community_report_reason" NOT NULL,
	"details" text,
	"status" "community_report_status" DEFAULT 'pending' NOT NULL,
	"reviewed_by" uuid,
	"review_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reviewed_at" timestamp with time zone,
	CONSTRAINT "community_reports_target_check" CHECK (
                (
                    "community_reports"."post_id" is not null
                    and "community_reports"."comment_id" is null
                )
                or
                (
                    "community_reports"."post_id" is null
                    and "community_reports"."comment_id" is not null
                )
            ),
	CONSTRAINT "community_reports_other_reason_details_check" CHECK (
                "community_reports"."reason" <> 'other'
                or (
                    "community_reports"."details" is not null
                    and length(btrim("community_reports"."details")) > 0
                )
            )
);
--> statement-breakpoint
ALTER TABLE "community_reports" ADD CONSTRAINT "community_reports_reporter_id_profiles_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_reports" ADD CONSTRAINT "community_reports_post_id_community_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."community_posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_reports" ADD CONSTRAINT "community_reports_comment_id_post_comments_id_fk" FOREIGN KEY ("comment_id") REFERENCES "public"."post_comments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_reports" ADD CONSTRAINT "community_reports_reviewed_by_profiles_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "community_reports_reporter_post_uidx" ON "community_reports" USING btree ("reporter_id","post_id");--> statement-breakpoint
CREATE UNIQUE INDEX "community_reports_reporter_comment_uidx" ON "community_reports" USING btree ("reporter_id","comment_id");--> statement-breakpoint
CREATE INDEX "community_reports_status_created_at_idx" ON "community_reports" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "community_reports_reporter_id_idx" ON "community_reports" USING btree ("reporter_id");--> statement-breakpoint
CREATE INDEX "community_reports_post_id_idx" ON "community_reports" USING btree ("post_id");--> statement-breakpoint
CREATE INDEX "community_reports_comment_id_idx" ON "community_reports" USING btree ("comment_id");--> statement-breakpoint
CREATE INDEX "community_reports_reviewed_by_idx" ON "community_reports" USING btree ("reviewed_by");