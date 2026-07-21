ALTER TABLE "cuisines" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "cuisines" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
CREATE INDEX "cuisines_to_destinations_cuisine_id_idx" ON "cuisines_to_destinations" USING btree ("cuisine_id");--> statement-breakpoint
CREATE INDEX "cuisines_to_destinations_destination_id_idx" ON "cuisines_to_destinations" USING btree ("destination_id");