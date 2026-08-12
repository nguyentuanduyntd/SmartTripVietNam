import "server-only";

import { asc } from "drizzle-orm";

import { db } from "@/src/db";
import { locations } from "@/src/db/schema/locations";

export async function findCommunityLocationList() {
    return db
        .select({
            id: locations.id,
            name: locations.name,
            slug: locations.slug,
        })
        .from(locations)
        .orderBy(asc(locations.name));
}

export type CommunityLocationListItem =
    Awaited<ReturnType<typeof findCommunityLocationList>>[number];