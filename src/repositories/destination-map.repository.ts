import "server-only";

import { eq } from "drizzle-orm";

import { db } from "@/src/db";
import { destinations } from "@/src/db/schema/destinations";

export type DestinationMapPoint = {
    id: string;
    name: string;
    address: string | null;
    latitude: number | null;
    longitude: number | null;
};

/**
 * Lấy thông tin cần thiết để mở Google Maps
 * từ destinationId của activity trong planner.
 */
export async function findDestinationMapPointById(
    destinationId: string,
): Promise<DestinationMapPoint | null> {
    const [destination] = await db
        .select({
            id: destinations.id,
            name: destinations.name,
            address: destinations.address,
            latitude: destinations.latitude,
            longitude: destinations.longitude,
        })
        .from(destinations)
        .where(
            eq(
                destinations.id,
                destinationId,
            ),
        )
        .limit(1);

    return destination ?? null;
}