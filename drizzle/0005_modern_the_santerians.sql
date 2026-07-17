CREATE TYPE "public"."meal_type" AS ENUM('breakfast', 'lunch', 'dinner', 'snack');--> statement-breakpoint
CREATE TYPE "public"."social_content_status" AS ENUM('pending', 'approved', 'hidden');--> statement-breakpoint
CREATE TYPE "public"."tour_status" AS ENUM('draft', 'published', 'hidden');--> statement-breakpoint
CREATE TYPE "public"."transport_method" AS ENUM('walking', 'bicycle', 'motobike', 'car', 'bus', 'train', 'airplane', 'boat', 'other');--> statement-breakpoint
CREATE TABLE "community_posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"tour_id" uuid,
	"title" text,
	"content" text NOT NULL,
	"status" "social_content_status" DEFAULT 'approved' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "community_posts_content_check" CHECK (length(btrim("community_posts"."content")) > 0)
);
--> statement-breakpoint
CREATE TABLE "post_comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"post_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"parent_id" uuid,
	"content" text NOT NULL,
	"status" "social_content_status" DEFAULT 'approved' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "post_comments_content_check" CHECK (length(btrim("post_comments"."content")) > 0)
);
--> statement-breakpoint
CREATE TABLE "post_destinations" (
	"post_id" uuid NOT NULL,
	"destination_id" uuid NOT NULL,
	CONSTRAINT "post_destinations_post_id_destination_id_pk" PRIMARY KEY("post_id","destination_id")
);
--> statement-breakpoint
CREATE TABLE "post_images" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"post_id" uuid NOT NULL,
	"url" text NOT NULL,
	"public_id" text NOT NULL,
	"width" integer,
	"height" integer,
	"alt_text" text,
	"caption" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "post_images_sort_order_check" CHECK ("post_images"."sort_order" >= 0),
	CONSTRAINT "post_images_width_check" CHECK ("post_images"."width" is null or "post_images"."width" > 0),
	CONSTRAINT "post_images_height_check" CHECK ("post_images"."height" is null or "post_images"."height" > 0)
);
--> statement-breakpoint
CREATE TABLE "post_likes" (
	"post_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "post_likes_post_id_user_id_pk" PRIMARY KEY("post_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "tour_comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tour_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"parent_id" uuid,
	"content" text NOT NULL,
	"status" "social_content_status" DEFAULT 'approved' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "tour_comments_content_check" CHECK (length(btrim("tour_comments"."content")) > 0)
);
--> statement-breakpoint
CREATE TABLE "tour_days" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tour_id" uuid NOT NULL,
	"day_number" integer NOT NULL,
	"title" text NOT NULL,
	"title_en" text,
	"description" text,
	"description_en" text,
	CONSTRAINT "tour_days_day_number_check" CHECK ("tour_days"."day_number" > 0)
);
--> statement-breakpoint
CREATE TABLE "tour_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tour_day_id" uuid NOT NULL,
	"destination_id" uuid,
	"title" text NOT NULL,
	"title_en" text,
	"description" text,
	"description_en" text,
	"start_time" time,
	"end_time" time,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"transport_method" "transport_method",
	"transport_note" text,
	"transport_note_en" text,
	"estimated_travel_minutes" integer,
	CONSTRAINT "tour_items_sort_order_check" CHECK ("tour_items"."sort_order" >= 0),
	CONSTRAINT "tour_items_time_range_check" CHECK ("tour_items"."start_time" is null or "tour_items"."end_time" is null or "tour_items"."start_time" < "tour_items"."end_time"),
	CONSTRAINT "tour_items_travel_minutes_check" CHECK ("tour_items"."estimated_travel_minutes" is null or "tour_items"."estimated_travel_minutes" >= 0)
);
--> statement-breakpoint
CREATE TABLE "tour_likes" (
	"tour_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tour_likes_tour_id_user_id_pk" PRIMARY KEY("tour_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "tour_meal_cuisines" (
	"tour_meal_id" uuid NOT NULL,
	"cuisine_id" uuid NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"note" text,
	CONSTRAINT "tour_meal_cuisines_tour_meal_id_cuisine_id_pk" PRIMARY KEY("tour_meal_id","cuisine_id"),
	CONSTRAINT "tour_meal_cuisines_sort_order_check" CHECK ("tour_meal_cuisines"."sort_order" >= 0)
);
--> statement-breakpoint
CREATE TABLE "tour_meals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tour_day_id" uuid NOT NULL,
	"meal_type" "meal_type" NOT NULL,
	"start_time" time,
	"venue_name" text,
	"venue_name_en" text,
	"note" text,
	"note_en" text,
	"is_included" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "tour_meals_sort_order_check" CHECK ("tour_meals"."sort_order" >= 0)
);
--> statement-breakpoint
CREATE TABLE "tour" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"name_en" text,
	"slug" text NOT NULL,
	"description" text,
	"description_en" text,
	"cover_image_url" text,
	"cover_image_public_id" text,
	"duration_days" integer NOT NULL,
	"duration_nights" integer DEFAULT 0 NOT NULL,
	"estimated_price" numeric(12, 0),
	"start_location_id" uuid NOT NULL,
	"meeting_point" text,
	"status" "tour_status" DEFAULT 'draft' NOT NULL,
	"published_at" timestamp with time zone,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tour_slug_unique" UNIQUE("slug"),
	CONSTRAINT "tours_duration_days_check" CHECK ("tour"."duration_days" > 0),
	CONSTRAINT "tours_duration_nights_check" CHECK ("tour"."duration_nights" >= 0),
	CONSTRAINT "tours_duration_nights_days_check" CHECK ("tour"."duration_nights" <= "tour"."duration_days"),
	CONSTRAINT "tours_estimated_price_check" CHECK ("tour"."estimated_price" is null or "tour"."estimated_price" >= 0)
);
--> statement-breakpoint
ALTER TABLE "destination_categories" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "community_posts" ADD CONSTRAINT "community_posts_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_posts" ADD CONSTRAINT "community_posts_tour_id_tour_id_fk" FOREIGN KEY ("tour_id") REFERENCES "public"."tour"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_comments" ADD CONSTRAINT "post_comments_post_id_community_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."community_posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_comments" ADD CONSTRAINT "post_comments_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_comments" ADD CONSTRAINT "post_comments_parent_id_post_comments_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."post_comments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_destinations" ADD CONSTRAINT "post_destinations_post_id_community_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."community_posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_destinations" ADD CONSTRAINT "post_destinations_destination_id_destinations_id_fk" FOREIGN KEY ("destination_id") REFERENCES "public"."destinations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_images" ADD CONSTRAINT "post_images_post_id_community_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."community_posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_likes" ADD CONSTRAINT "post_likes_post_id_community_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."community_posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_likes" ADD CONSTRAINT "post_likes_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tour_comments" ADD CONSTRAINT "tour_comments_tour_id_tour_id_fk" FOREIGN KEY ("tour_id") REFERENCES "public"."tour"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tour_comments" ADD CONSTRAINT "tour_comments_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tour_comments" ADD CONSTRAINT "tour_comments_parent_id_tour_comments_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."tour_comments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tour_days" ADD CONSTRAINT "tour_days_tour_id_tour_id_fk" FOREIGN KEY ("tour_id") REFERENCES "public"."tour"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tour_items" ADD CONSTRAINT "tour_items_tour_day_id_tour_days_id_fk" FOREIGN KEY ("tour_day_id") REFERENCES "public"."tour_days"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tour_items" ADD CONSTRAINT "tour_items_destination_id_destinations_id_fk" FOREIGN KEY ("destination_id") REFERENCES "public"."destinations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tour_likes" ADD CONSTRAINT "tour_likes_tour_id_tour_id_fk" FOREIGN KEY ("tour_id") REFERENCES "public"."tour"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tour_likes" ADD CONSTRAINT "tour_likes_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tour_meal_cuisines" ADD CONSTRAINT "tour_meal_cuisines_tour_meal_id_tour_meals_id_fk" FOREIGN KEY ("tour_meal_id") REFERENCES "public"."tour_meals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tour_meal_cuisines" ADD CONSTRAINT "tour_meal_cuisines_cuisine_id_cuisines_id_fk" FOREIGN KEY ("cuisine_id") REFERENCES "public"."cuisines"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tour_meals" ADD CONSTRAINT "tour_meals_tour_day_id_tour_days_id_fk" FOREIGN KEY ("tour_day_id") REFERENCES "public"."tour_days"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tour" ADD CONSTRAINT "tour_start_location_id_locations_id_fk" FOREIGN KEY ("start_location_id") REFERENCES "public"."locations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tour" ADD CONSTRAINT "tour_created_by_profiles_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "community_posts_status_created_at_idx" ON "community_posts" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "community_posts_user_id_idx" ON "community_posts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "community_posts_tour_id_idx" ON "community_posts" USING btree ("tour_id");--> statement-breakpoint
CREATE INDEX "post_comments_post_created_at_idx" ON "post_comments" USING btree ("post_id","created_at");--> statement-breakpoint
CREATE INDEX "post_comments_parent_id_idx" ON "post_comments" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "post_comments_user_id_idx" ON "post_comments" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "post_comments_status_idx" ON "post_comments" USING btree ("status");--> statement-breakpoint
CREATE INDEX "post_destinations_destination_id_idx" ON "post_destinations" USING btree ("destination_id");--> statement-breakpoint
CREATE UNIQUE INDEX "post_images_post_sort_order_uidx" ON "post_images" USING btree ("post_id","sort_order");--> statement-breakpoint
CREATE INDEX "post_images_post_id_idx" ON "post_images" USING btree ("post_id");--> statement-breakpoint
CREATE INDEX "post_likes_user_id_idx" ON "post_likes" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "tour_comments_tour_created_at_idx" ON "tour_comments" USING btree ("tour_id","created_at");--> statement-breakpoint
CREATE INDEX "tour_comments_parent_id_idx" ON "tour_comments" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "tour_comments_user_id_idx" ON "tour_comments" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "tour_comments_status_idx" ON "tour_comments" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "tour_days_tour_day_number_uidx" ON "tour_days" USING btree ("tour_id","day_number");--> statement-breakpoint
CREATE INDEX "tour_days_tour_id_idx" ON "tour_days" USING btree ("tour_id");--> statement-breakpoint
CREATE UNIQUE INDEX "tour_items_day_sort_order_uidx" ON "tour_items" USING btree ("tour_day_id","sort_order");--> statement-breakpoint
CREATE INDEX "tour_items_tour_day_id_idx" ON "tour_items" USING btree ("tour_day_id");--> statement-breakpoint
CREATE INDEX "tour_items_destination_id_idx" ON "tour_items" USING btree ("destination_id");--> statement-breakpoint
CREATE INDEX "tour_likes_user_id_idx" ON "tour_likes" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "tour_meal_cuisines_meal_sort_order_uidx" ON "tour_meal_cuisines" USING btree ("tour_meal_id","sort_order");--> statement-breakpoint
CREATE INDEX "tour_meal_cuisines_cuisine_id_idx" ON "tour_meal_cuisines" USING btree ("cuisine_id");--> statement-breakpoint
CREATE UNIQUE INDEX "tour_meals_day_sort_order_uidx" ON "tour_meals" USING btree ("tour_day_id","sort_order");--> statement-breakpoint
CREATE INDEX "tour_meals_tour_day_id_idx" ON "tour_meals" USING btree ("tour_day_id");--> statement-breakpoint
CREATE INDEX "tours_status_idx" ON "tour" USING btree ("status");--> statement-breakpoint
CREATE INDEX "tours_start_location_idx" ON "tour" USING btree ("start_location_id");--> statement-breakpoint
CREATE INDEX "tours_created_by_idx" ON "tour" USING btree ("created_by");--> statement-breakpoint
CREATE UNIQUE INDEX "destination_images_public_id_unique" ON "destination_images" USING btree ("public_id");--> statement-breakpoint
CREATE INDEX "destination_images_destination_id_idx" ON "destination_images" USING btree ("destination_id");--> statement-breakpoint
CREATE INDEX "destinations_to_categories_destination_id_idx" ON "destinations_to_categories" USING btree ("destination_id");--> statement-breakpoint
CREATE INDEX "destinations_to_categories_category_id_idx" ON "destinations_to_categories" USING btree ("category_id");