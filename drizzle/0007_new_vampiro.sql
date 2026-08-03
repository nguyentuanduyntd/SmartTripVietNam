CREATE TYPE "public"."itinerary_cost_calculation_unit" AS ENUM('per_person', 'per_group', 'per_room', 'fixed');--> statement-breakpoint
CREATE TYPE "public"."itinerary_cost_category" AS ENUM('ticket', 'food', 'transport', 'accommodation', 'activity', 'shopping', 'other');--> statement-breakpoint
CREATE TYPE "public"."itinerary_source" AS ENUM('tour_template', 'manual', 'ai');--> statement-breakpoint
CREATE TYPE "public"."itinerary_status" AS ENUM('draft', 'planned', 'completed', 'archived');--> statement-breakpoint
CREATE TYPE "public"."itinerary_traveler_scope" AS ENUM('all', 'adult', 'child');--> statement-breakpoint
CREATE TABLE "itinerary_costs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"itinerary_id" uuid NOT NULL,
	"itinerary_day_id" uuid,
	"itinerary_item_id" uuid,
	"itinerary_meal_id" uuid,
	"title" text NOT NULL,
	"category" "itinerary_cost_category" NOT NULL,
	"calculation_unit" "itinerary_cost_calculation_unit" NOT NULL,
	"traveler_scope" "itinerary_traveler_scope" DEFAULT 'all' NOT NULL,
	"unit_price" numeric(12, 0) DEFAULT '0' NOT NULL,
	"quantity" numeric(10, 2) DEFAULT '1' NOT NULL,
	"night_count" integer,
	"note" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "itinerary_costs_title_check" CHECK (length(btrim("itinerary_costs"."title")) > 0),
	CONSTRAINT "itinerary_costs_unit_price_check" CHECK ("itinerary_costs"."unit_price" >= 0),
	CONSTRAINT "itinerary_costs_quantity_check" CHECK ("itinerary_costs"."quantity" > 0),
	CONSTRAINT "itinerary_costs_night_count_check" CHECK (
                "itinerary_costs"."night_count" is null
                or "itinerary_costs"."night_count" > 0
            ),
	CONSTRAINT "itinerary_costs_sort_order_check" CHECK ("itinerary_costs"."sort_order" >= 0),
	CONSTRAINT "itinerary_costs_single_target_check" CHECK (
                num_nonnulls(
                    "itinerary_costs"."itinerary_day_id",
                    "itinerary_costs"."itinerary_item_id",
                    "itinerary_costs"."itinerary_meal_id"
                ) <= 1
            )
);
--> statement-breakpoint
CREATE TABLE "itinerary_days" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"itinerary_id" uuid NOT NULL,
	"day_number" integer NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "itinerary_days_day_number_check" CHECK ("itinerary_days"."day_number" > 0),
	CONSTRAINT "itinerary_days_title_check" CHECK (length(btrim("itinerary_days"."title")) > 0)
);
--> statement-breakpoint
CREATE TABLE "itinerary_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"itinerary_day_id" uuid NOT NULL,
	"destination_id" uuid,
	"destination_name" text,
	"title" text NOT NULL,
	"description" text,
	"start_time" time,
	"end_time" time,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"transport_method" "transport_method",
	"transport_note" text,
	"estimated_travel_minutes" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "itinerary_items_sort_order_check" CHECK ("itinerary_items"."sort_order" >= 0),
	CONSTRAINT "itinerary_items_title_check" CHECK (length(btrim("itinerary_items"."title")) > 0),
	CONSTRAINT "itinerary_items_time_range_check" CHECK (
                "itinerary_items"."start_time" is null
                or "itinerary_items"."end_time" is null
                or "itinerary_items"."start_time" < "itinerary_items"."end_time"
            ),
	CONSTRAINT "itinerary_items_travel_minutes_check" CHECK (
                "itinerary_items"."estimated_travel_minutes" is null
                or "itinerary_items"."estimated_travel_minutes" >= 0
            )
);
--> statement-breakpoint
CREATE TABLE "itinerary_meal_cuisines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"itinerary_meal_id" uuid NOT NULL,
	"cuisine_id" uuid,
	"cuisine_name" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"note" text,
	CONSTRAINT "itinerary_meal_cuisines_sort_order_check" CHECK ("itinerary_meal_cuisines"."sort_order" >= 0),
	CONSTRAINT "itinerary_meal_cuisines_name_check" CHECK (length(btrim("itinerary_meal_cuisines"."cuisine_name")) > 0)
);
--> statement-breakpoint
CREATE TABLE "itinerary_meals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"itinerary_day_id" uuid NOT NULL,
	"meal_type" "meal_type" NOT NULL,
	"start_time" time,
	"venue_name" text,
	"note" text,
	"is_included" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "itinerary_meals_sort_order_check" CHECK ("itinerary_meals"."sort_order" >= 0)
);
--> statement-breakpoint
CREATE TABLE "user_itineraries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"source_tour_id" uuid,
	"source" "itinerary_source" DEFAULT 'manual' NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"cover_image_url" text,
	"cover_image_public_id" text,
	"start_date" date,
	"adult_count" integer DEFAULT 1 NOT NULL,
	"child_count" integer DEFAULT 0 NOT NULL,
	"room_count" integer DEFAULT 1 NOT NULL,
	"start_location_id" uuid,
	"start_location_name" text,
	"meeting_point" text,
	"status" "itinerary_status" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_itineraries_adult_count_check" CHECK ("user_itineraries"."adult_count" > 0),
	CONSTRAINT "user_itineraries_child_count_check" CHECK ("user_itineraries"."child_count" >= 0),
	CONSTRAINT "user_itineraries_room_count_check" CHECK ("user_itineraries"."room_count" > 0),
	CONSTRAINT "user_itineraries_title_check" CHECK (length(btrim("user_itineraries"."title")) > 0)
);
--> statement-breakpoint
ALTER TABLE "itinerary_costs" ADD CONSTRAINT "itinerary_costs_itinerary_id_user_itineraries_id_fk" FOREIGN KEY ("itinerary_id") REFERENCES "public"."user_itineraries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "itinerary_costs" ADD CONSTRAINT "itinerary_costs_itinerary_day_id_itinerary_days_id_fk" FOREIGN KEY ("itinerary_day_id") REFERENCES "public"."itinerary_days"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "itinerary_costs" ADD CONSTRAINT "itinerary_costs_itinerary_item_id_itinerary_items_id_fk" FOREIGN KEY ("itinerary_item_id") REFERENCES "public"."itinerary_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "itinerary_costs" ADD CONSTRAINT "itinerary_costs_itinerary_meal_id_itinerary_meals_id_fk" FOREIGN KEY ("itinerary_meal_id") REFERENCES "public"."itinerary_meals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "itinerary_days" ADD CONSTRAINT "itinerary_days_itinerary_id_user_itineraries_id_fk" FOREIGN KEY ("itinerary_id") REFERENCES "public"."user_itineraries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "itinerary_items" ADD CONSTRAINT "itinerary_items_itinerary_day_id_itinerary_days_id_fk" FOREIGN KEY ("itinerary_day_id") REFERENCES "public"."itinerary_days"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "itinerary_items" ADD CONSTRAINT "itinerary_items_destination_id_destinations_id_fk" FOREIGN KEY ("destination_id") REFERENCES "public"."destinations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "itinerary_meal_cuisines" ADD CONSTRAINT "itinerary_meal_cuisines_itinerary_meal_id_itinerary_meals_id_fk" FOREIGN KEY ("itinerary_meal_id") REFERENCES "public"."itinerary_meals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "itinerary_meal_cuisines" ADD CONSTRAINT "itinerary_meal_cuisines_cuisine_id_cuisines_id_fk" FOREIGN KEY ("cuisine_id") REFERENCES "public"."cuisines"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "itinerary_meals" ADD CONSTRAINT "itinerary_meals_itinerary_day_id_itinerary_days_id_fk" FOREIGN KEY ("itinerary_day_id") REFERENCES "public"."itinerary_days"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_itineraries" ADD CONSTRAINT "user_itineraries_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_itineraries" ADD CONSTRAINT "user_itineraries_source_tour_id_tour_id_fk" FOREIGN KEY ("source_tour_id") REFERENCES "public"."tour"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_itineraries" ADD CONSTRAINT "user_itineraries_start_location_id_locations_id_fk" FOREIGN KEY ("start_location_id") REFERENCES "public"."locations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "itinerary_costs_itinerary_id_idx" ON "itinerary_costs" USING btree ("itinerary_id");--> statement-breakpoint
CREATE INDEX "itinerary_costs_day_id_idx" ON "itinerary_costs" USING btree ("itinerary_day_id");--> statement-breakpoint
CREATE INDEX "itinerary_costs_item_id_idx" ON "itinerary_costs" USING btree ("itinerary_item_id");--> statement-breakpoint
CREATE INDEX "itinerary_costs_meal_id_idx" ON "itinerary_costs" USING btree ("itinerary_meal_id");--> statement-breakpoint
CREATE INDEX "itinerary_costs_category_idx" ON "itinerary_costs" USING btree ("category");--> statement-breakpoint
CREATE UNIQUE INDEX "itinerary_days_itinerary_day_number_uidx" ON "itinerary_days" USING btree ("itinerary_id","day_number");--> statement-breakpoint
CREATE INDEX "itinerary_days_itinerary_id_idx" ON "itinerary_days" USING btree ("itinerary_id");--> statement-breakpoint
CREATE UNIQUE INDEX "itinerary_items_day_sort_order_uidx" ON "itinerary_items" USING btree ("itinerary_day_id","sort_order");--> statement-breakpoint
CREATE INDEX "itinerary_items_day_id_idx" ON "itinerary_items" USING btree ("itinerary_day_id");--> statement-breakpoint
CREATE INDEX "itinerary_items_destination_id_idx" ON "itinerary_items" USING btree ("destination_id");--> statement-breakpoint
CREATE UNIQUE INDEX "itinerary_meal_cuisines_meal_sort_order_uidx" ON "itinerary_meal_cuisines" USING btree ("itinerary_meal_id","sort_order");--> statement-breakpoint
CREATE INDEX "itinerary_meal_cuisines_meal_id_idx" ON "itinerary_meal_cuisines" USING btree ("itinerary_meal_id");--> statement-breakpoint
CREATE INDEX "itinerary_meal_cuisines_cuisine_id_idx" ON "itinerary_meal_cuisines" USING btree ("cuisine_id");--> statement-breakpoint
CREATE UNIQUE INDEX "itinerary_meals_day_sort_order_uidx" ON "itinerary_meals" USING btree ("itinerary_day_id","sort_order");--> statement-breakpoint
CREATE INDEX "itinerary_meals_day_id_idx" ON "itinerary_meals" USING btree ("itinerary_day_id");--> statement-breakpoint
CREATE INDEX "user_itineraries_user_id_idx" ON "user_itineraries" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_itineraries_source_tour_id_idx" ON "user_itineraries" USING btree ("source_tour_id");--> statement-breakpoint
CREATE INDEX "user_itineraries_status_idx" ON "user_itineraries" USING btree ("status");--> statement-breakpoint
CREATE INDEX "user_itineraries_start_date_idx" ON "user_itineraries" USING btree ("start_date");--> statement-breakpoint
CREATE INDEX "user_itineraries_updated_at_idx" ON "user_itineraries" USING btree ("updated_at");