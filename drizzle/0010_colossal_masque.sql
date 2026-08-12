CREATE TABLE "post_saves" (
	"post_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "post_saves_post_id_user_id_pk" PRIMARY KEY("post_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "community_posts" ADD COLUMN "source_itinerary_id" uuid;--> statement-breakpoint
ALTER TABLE "community_posts" ADD COLUMN "location_id" uuid;--> statement-breakpoint
ALTER TABLE "community_posts" ADD COLUMN "rating" integer;--> statement-breakpoint
ALTER TABLE "community_posts" ADD COLUMN "trip_start_date" date;--> statement-breakpoint
ALTER TABLE "community_posts" ADD COLUMN "trip_end_date" date;--> statement-breakpoint
ALTER TABLE "community_posts" ADD COLUMN "day_count" integer;--> statement-breakpoint
ALTER TABLE "community_posts" ADD COLUMN "estimated_cost" numeric(14, 0);--> statement-breakpoint
ALTER TABLE "community_posts" ADD COLUMN "itinerary_snapshot" jsonb;--> statement-breakpoint
ALTER TABLE "post_saves" ADD CONSTRAINT "post_saves_post_id_community_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."community_posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_saves" ADD CONSTRAINT "post_saves_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "post_saves_user_id_idx" ON "post_saves" USING btree ("user_id");--> statement-breakpoint
ALTER TABLE "community_posts" ADD CONSTRAINT "community_posts_source_itinerary_id_user_itineraries_id_fk" FOREIGN KEY ("source_itinerary_id") REFERENCES "public"."user_itineraries"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_posts" ADD CONSTRAINT "community_posts_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "community_posts_source_itinerary_id_idx" ON "community_posts" USING btree ("source_itinerary_id");--> statement-breakpoint
CREATE INDEX "community_posts_location_id_idx" ON "community_posts" USING btree ("location_id");--> statement-breakpoint
ALTER TABLE "community_posts" ADD CONSTRAINT "community_posts_rating_check" CHECK ("community_posts"."rating" is null or ("community_posts"."rating" >= 1 and "community_posts"."rating" <= 5));--> statement-breakpoint
ALTER TABLE "community_posts" ADD CONSTRAINT "community_posts_day_count_check" CHECK ("community_posts"."day_count" is null or "community_posts"."day_count" > 0);--> statement-breakpoint
ALTER TABLE "community_posts" ADD CONSTRAINT "community_posts_estimated_cost_check" CHECK ("community_posts"."estimated_cost" is null or "community_posts"."estimated_cost" >= 0);--> statement-breakpoint
ALTER TABLE "community_posts" ADD CONSTRAINT "community_posts_trip_date_range_check" CHECK (
                "community_posts"."trip_start_date" is null
                or "community_posts"."trip_end_date" is null
                or "community_posts"."trip_start_date" <= "community_posts"."trip_end_date"
            );