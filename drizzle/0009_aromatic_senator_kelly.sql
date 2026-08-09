CREATE TABLE "tour_costs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tour_id" uuid NOT NULL,
	"tour_day_id" uuid,
	"tour_item_id" uuid,
	"tour_meal_id" uuid,
	"title" text NOT NULL,
	"category" "itinerary_cost_category" NOT NULL,
	"calculation_unit" "itinerary_cost_calculation_unit" NOT NULL,
	"traveler_scope" "itinerary_traveler_scope" NOT NULL,
	"unit_price" numeric(12, 0) NOT NULL,
	"quantity" numeric(10, 2) NOT NULL,
	"night_count" integer DEFAULT 0 NOT NULL,
	"note" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tour_costs_title_check" CHECK (length(btrim("tour_costs"."title")) > 0),
	CONSTRAINT "tour_costs_unit_price_check" CHECK ("tour_costs"."unit_price" >= 0),
	CONSTRAINT "tour_costs_quantity_check" CHECK ("tour_costs"."quantity" > 0),
	CONSTRAINT "tour_costs_night_count_check" CHECK (
                "tour_costs"."night_count" is null
                or "tour_costs"."night_count" > 0
            ),
	CONSTRAINT "tour_costs_sort_order_check" CHECK ("tour_costs"."sort_order" >= 0),
	CONSTRAINT "tour_costs_single_target_check" CHECK (
                num_nonnulls(
                    "tour_costs"."tour_day_id",
                    "tour_costs"."tour_item_id",
                    "tour_costs"."tour_meal_id"
                ) <= 1
            )
);
--> statement-breakpoint
ALTER TABLE "tour_costs" ADD CONSTRAINT "tour_costs_tour_id_tour_id_fk" FOREIGN KEY ("tour_id") REFERENCES "public"."tour"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tour_costs" ADD CONSTRAINT "tour_costs_tour_day_id_tour_days_id_fk" FOREIGN KEY ("tour_day_id") REFERENCES "public"."tour_days"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tour_costs" ADD CONSTRAINT "tour_costs_tour_item_id_tour_items_id_fk" FOREIGN KEY ("tour_item_id") REFERENCES "public"."tour_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tour_costs" ADD CONSTRAINT "tour_costs_tour_meal_id_tour_meals_id_fk" FOREIGN KEY ("tour_meal_id") REFERENCES "public"."tour_meals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "tour_costs_tour_id_idx" ON "tour_costs" USING btree ("tour_id");--> statement-breakpoint
CREATE INDEX "tour_costs_day_id_idx" ON "tour_costs" USING btree ("tour_day_id");--> statement-breakpoint
CREATE INDEX "tour_costs_item_id_idx" ON "tour_costs" USING btree ("tour_item_id");--> statement-breakpoint
CREATE INDEX "tour_costs_meal_id_idx" ON "tour_costs" USING btree ("tour_meal_id");--> statement-breakpoint
CREATE INDEX "tour_costs_category_idx" ON "tour_costs" USING btree ("category");