import "server-only";
import { cache } from "react";
import {getTourBySlugService,listToursService,TourServiceError,} from "@/src/services/tour.service";

export const getPublishedTourBySlug = cache(async (slug: string) => {
    return getTourBySlugService(slug, { isAdmin: false });
});

export const getRelatedPublishedTours = cache(
    async (tourId: string, startLocationId: string) => {
        const result = await listToursService(
            {
                startLocationId,
                page: 1,
                limit: 6,
                sortBy: "publishedAt",
                sortOrder: "desc",
            },
            { isAdmin: false },
        );

        return result.data
            .filter((tour) => tour.id !== tourId)
            .slice(0, 3);
    },
);

export type PublicTourDetail = Awaited<
    ReturnType<typeof getPublishedTourBySlug>
>;

export type RelatedPublishedTour = Awaited<
    ReturnType<typeof getRelatedPublishedTours>
>[number];

export { TourServiceError };