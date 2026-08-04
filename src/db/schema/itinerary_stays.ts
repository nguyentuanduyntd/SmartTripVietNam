import { sql } from "drizzle-orm";
import {
    check,
    date,
    index,
    integer,
    numeric,
    pgTable,
    text,
    timestamp,
    uniqueIndex,
    uuid,
} from "drizzle-orm/pg-core";

import { userItineraries } from "./itineraries";

/* -------------------------------------------------------------------------- */
/* Itinerary stays                                                            */
/* -------------------------------------------------------------------------- */

export const itineraryStays = pgTable(
    "itinerary_stays",
    {
        id: uuid("id")
            .primaryKey()
            .defaultRandom(),

        itineraryId: uuid("itinerary_id")
            .notNull()
            .references(() => userItineraries.id, {
                onDelete: "cascade",
            }),

        name: text("name").notNull(),

        address: text("address"),

        checkInDate: date("check_in_date").notNull(),

        checkOutDate: date("check_out_date").notNull(),

        roomCount: integer("room_count")
            .notNull()
            .default(1),

        pricePerRoomNight: numeric(
            "price_per_room_night",
            {
                precision: 12,
                scale: 0,
            },
        )
            .notNull()
            .default("0"),

        note: text("note"),

        sortOrder: integer("sort_order")
            .notNull()
            .default(0),

        createdAt: timestamp("created_at", {
            withTimezone: true,
        })
            .defaultNow()
            .notNull(),

        updatedAt: timestamp("updated_at", {
            withTimezone: true,
        })
            .defaultNow()
            .notNull(),
    },
    (table) => [
        uniqueIndex(
            "itinerary_stays_itinerary_sort_order_uidx",
        ).on(table.itineraryId, table.sortOrder),

        index(
            "itinerary_stays_itinerary_id_idx",
        ).on(table.itineraryId),

        index(
            "itinerary_stays_check_in_date_idx",
        ).on(table.checkInDate),

        index(
            "itinerary_stays_check_out_date_idx",
        ).on(table.checkOutDate),

        check(
            "itinerary_stays_name_check",
            sql`length(btrim(${table.name})) > 0`,
        ),

        check(
            "itinerary_stays_date_range_check",
            sql`${table.checkInDate} < ${table.checkOutDate}`,
        ),

        check(
            "itinerary_stays_room_count_check",
            sql`${table.roomCount} > 0`,
        ),

        check(
            "itinerary_stays_price_check",
            sql`${table.pricePerRoomNight} >= 0`,
        ),

        check(
            "itinerary_stays_sort_order_check",
            sql`${table.sortOrder} >= 0`,
        ),
    ],
);

export type ItineraryStay =
    typeof itineraryStays.$inferSelect;

export type NewItineraryStay =
    typeof itineraryStays.$inferInsert;