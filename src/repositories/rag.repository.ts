import {cosineDistance,desc,eq,gt,sql,and, inArray} from "drizzle-orm";
import { db } from "@/src/db";
import {cuisineEmbeddings,cuisines,cuisinesToDestinations,} from "@/src/db/schema/cuisines";
import {destinationCategories,} from "@/src/db/schema/destination_categories";
import {destinationEmbeddings,} from "@/src/db/schema/destination_embeddings";
import {destinations,destinationsToCategoies,} from "@/src/db/schema/destinations";
import {locations,} from "@/src/db/schema/locations";

export async function findDestinationEmbeddingSources(){
    return db.select({
        id: destinations.id,
        name: destinations.name,
        nameEn: destinations.nameEn,
        address: destinations.address,
        description: destinations.description,
        history: destinations.history,
        latitude: destinations.latitude,
        longitude: destinations.longitude,
        locationId: locations.id,
        locationName: locations.name,
    }).from(destinations).innerJoin(locations, eq(destinations.locationId, locations.id),).orderBy(destinations.name);
}

export async function findDestinationCategoryLinks(){
    return db.select({
        destinationId: destinationsToCategoies.destinationId,
        categoryName: destinationCategories.name,
    }).from(destinationsToCategoies).innerJoin(destinationCategories, eq(destinationsToCategoies.categoryId, destinationCategories.id));
}

export async function findCuisineEmbeddingSources(){
    return db.select({
        id: cuisines.id,
        name: cuisines.name,
        nameEn: cuisines.nameEn,
        description: cuisines.description,
        avgPrice: cuisines.avgPrice,
    }).from(cuisines).orderBy(cuisines.name);
}

export async function findCuisineDestinationLinks(){
    return db.select({
        cuisineId: cuisinesToDestinations.cuisineId,
        destinationName: destinations.name,
        locationName: locations.name,
    }).from(cuisinesToDestinations).innerJoin(destinations, eq(cuisinesToDestinations.destinationId, destinations.id))
        .innerJoin(locations, eq(destinations.locationId, locations.id));
}

export async function replaceDestinationEmbeddings(
    destinationId: string,
    chunks: Array<{
        content: string;
        embedding: number[];
    }>,
) {
    await db.transaction(
        async (tx) => {
            await tx
                .delete(
                    destinationEmbeddings,
                )
                .where(
                    eq(
                        destinationEmbeddings.destinationId,
                        destinationId,
                    ),
                );

            if (
                chunks.length === 0
            ) {
                return;
            }

            await tx
                .insert(
                    destinationEmbeddings,
                )
                .values(
                    chunks.map(
                        (
                            chunk,
                            chunkIndex,
                        ) => ({
                            destinationId,
                            chunkIndex,
                            content:
                                chunk.content,
                            embedding:
                                chunk.embedding,
                        }),
                    ),
                );
        },
    );
}

export async function replaceCuisineEmbeddings(
    cuisineId: string,
    chunks: Array<{
        content: string;
        embedding: number[];
    }>,
) {
    await db.transaction(
        async (tx) => {
            await tx
                .delete(
                    cuisineEmbeddings,
                )
                .where(
                    eq(
                        cuisineEmbeddings.cuisineId,
                        cuisineId,
                    ),
                );

            if (
                chunks.length === 0
            ) {
                return;
            }

            await tx
                .insert(
                    cuisineEmbeddings,
                )
                .values(
                    chunks.map(
                        (
                            chunk,
                            chunkIndex,
                        ) => ({
                            cuisineId,
                            chunkIndex,
                            content:
                                chunk.content,
                            embedding:
                                chunk.embedding,
                        }),
                    ),
                );
        },
    );
}

export async function searchDestinationEmbeddings(
    queryEmbedding: number[],
    options: {
        limit: number;
        minSimilarity: number;
        locationId?: string;
    },
) {
    const similarity =
        sql<number>`
            1 - (
                ${cosineDistance(
                    destinationEmbeddings.embedding,
                    queryEmbedding,
                )}
            )
        `;

    const conditions = [
        gt(
            similarity,
            options.minSimilarity,
        ),
    ];

    /**
     * AI Planner luôn truyền locationId.
     *
     * Ví dụ user chọn Đà Nẵng thì retrieval
     * tuyệt đối không lấy destination ở Huế/Hội An.
     */
    if (options.locationId) {
        conditions.push(
            eq(
                destinations.locationId,
                options.locationId,
            ),
        );
    }

    return db
        .select({
            kind:
                sql<"destination">`
                    'destination'
                `,

            destinationId:
                destinations.id,

            name:
                destinations.name,

            address:
                destinations.address,

            locationId:
                locations.id,

            locationName:
                locations.name,

            latitude:
                destinations.latitude,

            longitude:
                destinations.longitude,

            chunkIndex:
                destinationEmbeddings.chunkIndex,

            content:
                destinationEmbeddings.content,

            similarity,
        })
        .from(
            destinationEmbeddings,
        )
        .innerJoin(
            destinations,
            eq(
                destinationEmbeddings.destinationId,
                destinations.id,
            ),
        )
        .innerJoin(
            locations,
            eq(
                destinations.locationId,
                locations.id,
            ),
        )
        .where(
            and(...conditions),
        )
        .orderBy(
            desc(similarity),
        )
        .limit(options.limit);
}

/* -------------------------------------------------------------------------- */
/* Vector retrieval - cuisine                                                 */
/* -------------------------------------------------------------------------- */

export async function findCuisineIdsByLocationId(
    locationId: string,
) {
    const rows = await db
        .select({
            cuisineId:
                cuisinesToDestinations.cuisineId,
        })
        .from(
            cuisinesToDestinations,
        )
        .innerJoin(
            destinations,
            eq(
                cuisinesToDestinations.destinationId,
                destinations.id,
            ),
        )
        .where(
            eq(
                destinations.locationId,
                locationId,
            ),
        );

    return [
        ...new Set(
            rows.map(
                (row) =>
                    row.cuisineId,
            ),
        ),
    ];
}

export async function searchCuisineEmbeddings(
    queryEmbedding: number[],
    options: {
        limit: number;
        minSimilarity: number;
        locationId?: string;
    },
) {
    const similarity =
        sql<number>`
            1 - (
                ${cosineDistance(
                    cuisineEmbeddings.embedding,
                    queryEmbedding,
                )}
            )
        `;

    const conditions = [
        gt(
            similarity,
            options.minSimilarity,
        ),
    ];

    if (options.locationId) {
        const cuisineIds =
            await findCuisineIdsByLocationId(
                options.locationId,
            );

        if (
            cuisineIds.length ===
            0
        ) {
            return [];
        }

        conditions.push(
            inArray(
                cuisineEmbeddings.cuisineId,
                cuisineIds,
            ),
        );
    }

    return db
        .select({
            kind:
                sql<"cuisine">`
                    'cuisine'
                `,

            cuisineId:
                cuisines.id,

            name:
                cuisines.name,

            avgPrice:
                cuisines.avgPrice,

            chunkIndex:
                cuisineEmbeddings.chunkIndex,

            content:
                cuisineEmbeddings.content,

            similarity,
        })
        .from(
            cuisineEmbeddings,
        )
        .innerJoin(
            cuisines,
            eq(
                cuisineEmbeddings.cuisineId,
                cuisines.id,
            ),
        )
        .where(
            and(...conditions),
        )
        .orderBy(
            desc(similarity),
        )
        .limit(options.limit);
}