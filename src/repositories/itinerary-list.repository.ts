import "server-only";

import { desc, eq } from "drizzle-orm";

import { db } from "@/src/db";
import { userItineraries } from "@/src/db/schema/itineraries";

export async function findUserItineraryList(userId: string) {
  return db
    .select({
      id: userItineraries.id,

      title: userItineraries.title,

      description: userItineraries.description,

      coverImageUrl: userItineraries.coverImageUrl,

      startDate: userItineraries.startDate,

      adultCount: userItineraries.adultCount,

      childCount: userItineraries.childCount,

      roomCount: userItineraries.roomCount,

      startLocationName: userItineraries.startLocationName,

      meetingPoint: userItineraries.meetingPoint,

      status: userItineraries.status,

      createdAt: userItineraries.createdAt,

      updatedAt: userItineraries.updatedAt,
    })
    .from(userItineraries)
    .where(eq(userItineraries.userId, userId))
    .orderBy(desc(userItineraries.updatedAt), desc(userItineraries.createdAt));
}

export type UserItineraryListItem = Awaited<ReturnType<typeof findUserItineraryList>>[number];
