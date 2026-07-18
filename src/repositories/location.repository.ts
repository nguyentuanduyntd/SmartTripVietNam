import "server-only";
import {asc,count, eq} from "drizzle-orm";
import { db } from "../db";
import { destinations } from "@/src/db/schema/destinations";
import { locations } from "@/src/db/schema/locations";

export async function findAllLocations(){
    return db.select().from(locations).orderBy(asc(locations.name));
}

export async function findLocationById(id: string){
    const [location] = await db.select().from(locations).where(eq(locations.id, id)).limit(1);

    return location ?? null;
}

export async function findLocationBySlug(slug: string){
    const [location] = await db.select().from(locations).where(eq(locations.slug, slug)).limit(1);

    return location ?? null;
}

export async function createLocation(data: {
    name: string;
    nameEn?: string | null;
    slug: string;
    description?: string | null;
    descriptionEn?: string | null;
}) {
    const [location] = await db.insert(locations).values(data).returning();

    return location;
}

export async function updateLocation(
    id: string,
    data: Partial<{
        name: string,
        nameEn: string | null;
        slug: string,
        description: string | null;
        descriptionEn: string | null;
    }>,
) {
    const [location] = await db.update(locations).set({...data, updatedAt: new Date()}).where(eq(locations.id, id)).returning();

    return location ?? null;
}

export async function deleteLocation(id: string){
    const [location] = await db.delete(locations).where(eq(locations.id, id)).returning({id: locations.id});

    return location ?? null;
}

export async function countDestinationByLocation(locationId: string){
    const [row] = await db.select({value: count()}).from(destinations).where(eq(destinations.locationId, locationId));
    
    return row?.value ?? 0;
}