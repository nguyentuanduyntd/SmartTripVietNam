CREATE TABLE "restaurants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"location_id" uuid NOT NULL,
	"name" text NOT NULL,
	"name_en" text,
	"slug" text NOT NULL,
	"description" text,
	"address" text NOT NULL,
	"latitude" double precision NOT NULL,
	"longitude" double precision NOT NULL,
	"price_min" numeric(12, 0),
	"price_max" numeric(12, 0),
	"rating" numeric(3, 1),
	"review_count" integer DEFAULT 0 NOT NULL,
	"opening_hours" jsonb,
	"tags" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"is_open_late" boolean DEFAULT false NOT NULL,
	"is_family_friendly" boolean DEFAULT true NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"image_url" text,
	"source" text DEFAULT 'demo' NOT NULL,
	"external_place_id" text,
	"google_maps_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "restaurants_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "restaurants_to_cuisines" (
	"restaurant_id" uuid NOT NULL,
	"cuisine_id" uuid NOT NULL,
	"is_signature" boolean DEFAULT false NOT NULL,
	CONSTRAINT "restaurants_to_cuisines_restaurant_id_cuisine_id_pk" PRIMARY KEY("restaurant_id","cuisine_id")
);
--> statement-breakpoint
ALTER TABLE "restaurants" ADD CONSTRAINT "restaurants_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "restaurants_to_cuisines" ADD CONSTRAINT "restaurants_to_cuisines_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "restaurants_to_cuisines" ADD CONSTRAINT "restaurants_to_cuisines_cuisine_id_cuisines_id_fk" FOREIGN KEY ("cuisine_id") REFERENCES "public"."cuisines"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "restaurants_location_id_idx" ON "restaurants" USING btree ("location_id");--> statement-breakpoint
CREATE INDEX "restaurants_location_active_idx" ON "restaurants" USING btree ("location_id","is_active");--> statement-breakpoint
CREATE INDEX "restaurants_price_min_idx" ON "restaurants" USING btree ("price_min");--> statement-breakpoint
CREATE UNIQUE INDEX "restaurants_external_place_id_unique" ON "restaurants" USING btree ("external_place_id");--> statement-breakpoint
CREATE INDEX "restaurants_to_cuisines_restaurant_id_idx" ON "restaurants_to_cuisines" USING btree ("restaurant_id");--> statement-breakpoint
CREATE INDEX "restaurants_to_cuisines_cuisine_id_idx" ON "restaurants_to_cuisines" USING btree ("cuisine_id");