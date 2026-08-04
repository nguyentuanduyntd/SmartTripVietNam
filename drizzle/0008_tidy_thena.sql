CREATE TABLE "itinerary_stays" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"itinerary_id" uuid NOT NULL,
	"name" text NOT NULL,
	"address" text,
	"check_in_date" date NOT NULL,
	"check_out_date" date NOT NULL,
	"room_count" integer DEFAULT 1 NOT NULL,
	"price_per_room_night" numeric(12, 0) DEFAULT '0' NOT NULL,
	"note" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "itinerary_stays_name_check" CHECK (length(btrim("itinerary_stays"."name")) > 0),
	CONSTRAINT "itinerary_stays_date_range_check" CHECK ("itinerary_stays"."check_in_date" < "itinerary_stays"."check_out_date"),
	CONSTRAINT "itinerary_stays_room_count_check" CHECK ("itinerary_stays"."room_count" > 0),
	CONSTRAINT "itinerary_stays_price_check" CHECK ("itinerary_stays"."price_per_room_night" >= 0),
	CONSTRAINT "itinerary_stays_sort_order_check" CHECK ("itinerary_stays"."sort_order" >= 0)
);
--> statement-breakpoint
ALTER TABLE "itinerary_stays" ADD CONSTRAINT "itinerary_stays_itinerary_id_user_itineraries_id_fk" FOREIGN KEY ("itinerary_id") REFERENCES "public"."user_itineraries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "itinerary_stays_itinerary_sort_order_uidx" ON "itinerary_stays" USING btree ("itinerary_id","sort_order");--> statement-breakpoint
CREATE INDEX "itinerary_stays_itinerary_id_idx" ON "itinerary_stays" USING btree ("itinerary_id");--> statement-breakpoint
CREATE INDEX "itinerary_stays_check_in_date_idx" ON "itinerary_stays" USING btree ("check_in_date");--> statement-breakpoint
CREATE INDEX "itinerary_stays_check_out_date_idx" ON "itinerary_stays" USING btree ("check_out_date");