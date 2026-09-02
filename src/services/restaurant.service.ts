import "server-only";

import type { RestaurantNearbyQuery } from "@/src/schemas/restaurant.schema";
import {
    findCuisinesByRestaurantIds,
    findRestaurantsForDiscovery,
} from "@/src/repositories/restaurant.repository";

const EARTH_RADIUS_KM = 6371;

function toRadians(value: number) {
    return (value * Math.PI) / 180;
}

/**
 * Haversine: đủ chính xác cho phạm vi tìm quán trong thành phố
 * mà không cần PostGIS.
 */
function calculateDistanceKm(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number,
) {
    const deltaLat = toRadians(lat2 - lat1);
    const deltaLng = toRadians(lng2 - lng1);

    const a =
        Math.sin(deltaLat / 2) ** 2 +
        Math.cos(toRadians(lat1)) *
            Math.cos(toRadians(lat2)) *
            Math.sin(deltaLng / 2) ** 2;

    return (
        EARTH_RADIUS_KM *
        2 *
        Math.atan2(
            Math.sqrt(a),
            Math.sqrt(1 - a),
        )
    );
}

function normalizeTag(value: string) {
    return value
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/g, "d")
        .replace(/Đ/g, "D")
        .toLowerCase()
        .trim();
}

function calculateMatchScore(input: {
    distanceKm: number;
    radiusKm: number;
    rating: number | null;
    reviewCount: number;
    restaurantTags: string[];
    requestedTags: string[];
    priceMin: number | null;
    priceMax: number | null;
    requestedMaxPrice?: number;
}) {
    let score = 0;

    /** Distance: tối đa 35 điểm. */
    score += Math.max(
        0,
        35 *
            (1 -
                input.distanceKm /
                    Math.max(input.radiusKm, 0.1)),
    );

    /** Rating: tối đa 25 điểm. */
    if (input.rating !== null) {
        score +=
            Math.min(
                Math.max(input.rating, 0),
                5,
            ) * 5;
    }

    /** Một ít tín hiệu độ tin cậy từ review count. */
    score += Math.min(
        8,
        Math.log10(
            Math.max(input.reviewCount, 1),
        ) * 2,
    );

    /** Tag preference: tối đa 20 điểm. */
    if (input.requestedTags.length > 0) {
        const available = new Set(
            input.restaurantTags.map(normalizeTag),
        );

        const matched =
            input.requestedTags.filter((tag) =>
                available.has(normalizeTag(tag)),
            ).length;

        score +=
            (matched /
                input.requestedTags.length) *
            20;
    }

    /** Budget: tối đa 12 điểm. */
    if (
        input.requestedMaxPrice &&
        input.priceMin !== null
    ) {
        if (
            input.priceMax !== null &&
            input.priceMax <=
                input.requestedMaxPrice
        ) {
            score += 12;
        } else if (
            input.priceMin <=
            input.requestedMaxPrice
        ) {
            score += 7;
        }
    }

    return Math.round(score * 10) / 10;
}

export async function searchNearbyRestaurantsService(
    input: RestaurantNearbyQuery,
) {
    const candidates =
        await findRestaurantsForDiscovery({
            locationId: input.locationId,
            cuisineId: input.cuisineId,
            search: input.search,
            maxPrice: input.maxPrice,
            openLate: input.openLate,
            familyFriendly:
                input.familyFriendly,
            candidateLimit: 250,
        });

    const cuisinesMap =
        await findCuisinesByRestaurantIds(
            candidates.map((item) => item.id),
        );

    const requestedTags = input.tags ?? [];

    const withDistance = candidates
        .map((restaurant) => {
            const distanceKm =
                calculateDistanceKm(
                    input.latitude,
                    input.longitude,
                    restaurant.latitude,
                    restaurant.longitude,
                );

            const restaurantCuisines =
                cuisinesMap.get(
                    restaurant.id,
                ) ?? [];

            const matchScore =
                calculateMatchScore({
                    distanceKm,
                    radiusKm: input.radiusKm,
                    rating:
                        restaurant.rating,
                    reviewCount:
                        restaurant.reviewCount,
                    restaurantTags:
                        restaurant.tags,
                    requestedTags,
                    priceMin:
                        restaurant.priceMin,
                    priceMax:
                        restaurant.priceMax,
                    requestedMaxPrice:
                        input.maxPrice,
                });

            return {
                ...restaurant,
                distanceKm:
                    Math.round(
                        distanceKm * 100,
                    ) / 100,
                distanceMeters: Math.round(
                    distanceKm * 1000,
                ),
                matchScore,
                cuisines:
                    restaurantCuisines,
            };
        })
        .filter(
            (restaurant) =>
                restaurant.distanceKm <=
                input.radiusKm,
        );

    if (input.sort === "distance") {
        withDistance.sort(
            (a, b) =>
                a.distanceKm -
                b.distanceKm,
        );
    } else if (input.sort === "rating") {
        withDistance.sort((a, b) => {
            const ratingDiff =
                (b.rating ?? 0) -
                (a.rating ?? 0);

            return ratingDiff !== 0
                ? ratingDiff
                : a.distanceKm -
                      b.distanceKm;
        });
    } else {
        withDistance.sort((a, b) => {
            const scoreDiff =
                b.matchScore - a.matchScore;

            return scoreDiff !== 0
                ? scoreDiff
                : a.distanceKm -
                      b.distanceKm;
        });
    }

    const items = withDistance.slice(
        0,
        input.limit,
    );

    return {
        items,
        meta: {
            latitude: input.latitude,
            longitude: input.longitude,
            radiusKm: input.radiusKm,
            sort: input.sort,
            totalMatched:
                withDistance.length,
            returned: items.length,
        },
    };
}
