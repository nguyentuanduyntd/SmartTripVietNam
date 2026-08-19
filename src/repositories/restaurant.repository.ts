import "server-only";

import {
    and,
    desc,
    eq,
    ilike,
    inArray,
    lte,
    or,
    type SQL,
} from "drizzle-orm";

import { db } from "@/src/db";
import { cuisines } from "@/src/db/schema/cuisines";
import {
    restaurants,
    restaurantsToCuisines,
} from "@/src/db/schema/restaurants";

export type RestaurantDiscoveryFilters = {
    locationId?: string;
    cuisineId?: string;
    search?: string;
    maxPrice?: number;
    openLate?: boolean;
    familyFriendly?: boolean;
    candidateLimit?: number;
};

export async function findRestaurantsForDiscovery(
    filters: RestaurantDiscoveryFilters,
) {
    const conditions: SQL[] = [
        eq(restaurants.isActive, true),
    ];

    if (filters.locationId) {
        conditions.push(
            eq(
                restaurants.locationId,
                filters.locationId,
            ),
        );
    }

    if (filters.search) {
        const searchCondition = or(
            ilike(
                restaurants.name,
                `%${filters.search}%`,
            ),
            ilike(
                restaurants.address,
                `%${filters.search}%`,
            ),
            ilike(
                restaurants.description,
                `%${filters.search}%`,
            ),
        );

        if (searchCondition) {
            conditions.push(searchCondition);
        }
    }

    if (filters.maxPrice) {
        /**
         * priceMin là mức tối thiểu để một người có thể ăn tại quán.
         * Nếu <= ngân sách thì quán vẫn có khả năng phù hợp.
         */
        conditions.push(
            lte(
                restaurants.priceMin,
                filters.maxPrice,
            ),
        );
    }

    if (filters.openLate !== undefined) {
        conditions.push(
            eq(
                restaurants.isOpenLate,
                filters.openLate,
            ),
        );
    }

    if (
        filters.familyFriendly !==
        undefined
    ) {
        conditions.push(
            eq(
                restaurants.isFamilyFriendly,
                filters.familyFriendly,
            ),
        );
    }

    if (filters.cuisineId) {
        const links = await db
            .select({
                restaurantId:
                    restaurantsToCuisines.restaurantId,
            })
            .from(restaurantsToCuisines)
            .where(
                eq(
                    restaurantsToCuisines.cuisineId,
                    filters.cuisineId,
                ),
            );

        const restaurantIds = links.map(
            (row) => row.restaurantId,
        );

        if (restaurantIds.length === 0) {
            return [];
        }

        conditions.push(
            inArray(
                restaurants.id,
                restaurantIds,
            ),
        );
    }

    return db
        .select()
        .from(restaurants)
        .where(and(...conditions))
        .orderBy(
            desc(restaurants.rating),
            desc(restaurants.reviewCount),
        )
        .limit(filters.candidateLimit ?? 250);
}

export async function findCuisinesByRestaurantIds(
    restaurantIds: string[],
) {
    const result = new Map<
        string,
        Array<{
            id: string;
            name: string;
            nameEn: string | null;
            slug: string;
            avgPrice: number | null;
            isSignature: boolean;
        }>
    >();

    if (restaurantIds.length === 0) {
        return result;
    }

    const rows = await db
        .select({
            restaurantId:
                restaurantsToCuisines.restaurantId,
            isSignature:
                restaurantsToCuisines.isSignature,
            cuisine: {
                id: cuisines.id,
                name: cuisines.name,
                nameEn: cuisines.nameEn,
                slug: cuisines.slug,
                avgPrice: cuisines.avgPrice,
            },
        })
        .from(restaurantsToCuisines)
        .innerJoin(
            cuisines,
            eq(
                restaurantsToCuisines.cuisineId,
                cuisines.id,
            ),
        )
        .where(
            inArray(
                restaurantsToCuisines.restaurantId,
                restaurantIds,
            ),
        );

    for (const row of rows) {
        const current =
            result.get(row.restaurantId) ?? [];

        current.push({
            ...row.cuisine,
            isSignature: row.isSignature,
        });

        result.set(
            row.restaurantId,
            current,
        );
    }

    return result;
}