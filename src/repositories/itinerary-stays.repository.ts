import "server-only";

import { and, asc, desc, eq, sql } from "drizzle-orm";

import { db } from "@/src/db";
import { userItineraries } from "@/src/db/schema/itineraries";
import { itineraryStays } from "@/src/db/schema/itinerary_stays";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AddHotelStayData = {
  userId: string;
  itineraryId: string;
  name: string;
  address?: string | null;
  checkInDate: string;
  checkOutDate: string;
  roomCount: number;
  pricePerRoomNight: number;
  note?: string | null;
};

export type AddHotelStayResult =
  | {
      status: "ok";
      itinerary: { id: string; title: string };
      stay: typeof itineraryStays.$inferSelect;
    }
  | { status: "itinerary_not_found" }
  | { status: "itinerary_not_editable" }
  | { status: "invalid_dates" };

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/** Trả về các itinerary (draft/planned) mà user có thể thêm nơi lưu trú. */
export async function findUserItineraryStayTargets(userId: string) {
  const rows = await db
    .select({
      id: userItineraries.id,
      title: userItineraries.title,
      startDate: userItineraries.startDate,
      status: userItineraries.status,
      roomCount: userItineraries.roomCount,
      adultCount: userItineraries.adultCount,
      childCount: userItineraries.childCount,
      updatedAt: userItineraries.updatedAt,
    })
    .from(userItineraries)
    .where(eq(userItineraries.userId, userId))
    .orderBy(desc(userItineraries.updatedAt));

  return rows.filter(
    (itinerary) => itinerary.status === "draft" || itinerary.status === "planned",
  );
}

/** Thêm một hotel stay vào itinerary trong transaction. */
export async function addHotelStayToItinerary(input: AddHotelStayData): Promise<AddHotelStayResult> {
  return db.transaction(async (tx) => {
    // 1. Verify ownership + editability
    const [itinerary] = await tx
      .select({ id: userItineraries.id, title: userItineraries.title, status: userItineraries.status })
      .from(userItineraries)
      .where(and(eq(userItineraries.id, input.itineraryId), eq(userItineraries.userId, input.userId)))
      .limit(1);

    if (!itinerary) {
      return { status: "itinerary_not_found" };
    }

    if (itinerary.status !== "draft" && itinerary.status !== "planned") {
      return { status: "itinerary_not_editable" };
    }

    // 2. Validate dates
    if (input.checkInDate >= input.checkOutDate) {
      return { status: "invalid_dates" };
    }

    // 3. Determine next sortOrder (no uniqueIndex conflict)
    const [lastStay] = await tx
      .select({ sortOrder: itineraryStays.sortOrder })
      .from(itineraryStays)
      .where(eq(itineraryStays.itineraryId, itinerary.id))
      .orderBy(desc(itineraryStays.sortOrder))
      .limit(1);

    // If a conflict occurs due to existing sortOrder, use max+1 from DB
    let nextSortOrder = (lastStay?.sortOrder ?? -1) + 1;

    // Upsert-safe: use the current max + 1 to avoid the unique constraint
    const [maxRow] = await tx
      .select({ max: sql<number>`coalesce(max(${itineraryStays.sortOrder}), -1)` })
      .from(itineraryStays)
      .where(eq(itineraryStays.itineraryId, itinerary.id));

    nextSortOrder = (maxRow?.max ?? -1) + 1;

    // 4. Insert stay
    const [stay] = await tx
      .insert(itineraryStays)
      .values({
        itineraryId: itinerary.id,
        name: input.name.trim(),
        address: input.address ?? null,
        checkInDate: input.checkInDate,
        checkOutDate: input.checkOutDate,
        roomCount: Math.max(1, input.roomCount),
        pricePerRoomNight: String(Math.round(Math.max(0, input.pricePerRoomNight))),
        note: input.note ?? null,
        sortOrder: nextSortOrder,
      })
      .returning();

    if (!stay) {
      throw new Error("Không thể thêm lưu trú vào lịch trình");
    }

    // 5. Touch updatedAt
    await tx
      .update(userItineraries)
      .set({ updatedAt: new Date() })
      .where(eq(userItineraries.id, itinerary.id));

    return {
      status: "ok",
      itinerary: { id: itinerary.id, title: itinerary.title },
      stay,
    };
  });
}
