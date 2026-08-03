import { relations } from "drizzle-orm";

import { cuisines } from "./cuisines";
import { destinations } from "./destinations";
import {
    itineraryCosts,
    itineraryDays,
    itineraryItems,
    itineraryMealCuisines,
    itineraryMeals,
    userItineraries,
} from "./itineraries";
import { locations } from "./locations";
import { profiles } from "./profiles";
import { tours } from "./tours";

export const userItinerariesRelations = relations(
    userItineraries,
    ({ one, many }) => ({
        user: one(profiles, {
            fields: [userItineraries.userId],
            references: [profiles.id],
        }),

        sourceTour: one(tours, {
            fields: [userItineraries.sourceTourId],
            references: [tours.id],
        }),

        startLocation: one(locations, {
            fields: [userItineraries.startLocationId],
            references: [locations.id],
        }),

        days: many(itineraryDays),

        costs: many(itineraryCosts),
    }),
);

export const itineraryDaysRelations = relations(
    itineraryDays,
    ({ one, many }) => ({
        itinerary: one(userItineraries, {
            fields: [itineraryDays.itineraryId],
            references: [userItineraries.id],
        }),

        items: many(itineraryItems),

        meals: many(itineraryMeals),

        costs: many(itineraryCosts),
    }),
);

export const itineraryItemsRelations = relations(
    itineraryItems,
    ({ one, many }) => ({
        day: one(itineraryDays, {
            fields: [itineraryItems.itineraryDayId],
            references: [itineraryDays.id],
        }),

        destination: one(destinations, {
            fields: [itineraryItems.destinationId],
            references: [destinations.id],
        }),

        costs: many(itineraryCosts),
    }),
);

export const itineraryMealsRelations = relations(
    itineraryMeals,
    ({ one, many }) => ({
        day: one(itineraryDays, {
            fields: [itineraryMeals.itineraryDayId],
            references: [itineraryDays.id],
        }),

        cuisines: many(itineraryMealCuisines),

        costs: many(itineraryCosts),
    }),
);

export const itineraryMealCuisinesRelations = relations(
    itineraryMealCuisines,
    ({ one }) => ({
        meal: one(itineraryMeals, {
            fields: [
                itineraryMealCuisines.itineraryMealId,
            ],
            references: [itineraryMeals.id],
        }),

        cuisine: one(cuisines, {
            fields: [itineraryMealCuisines.cuisineId],
            references: [cuisines.id],
        }),
    }),
);

export const itineraryCostsRelations = relations(
    itineraryCosts,
    ({ one }) => ({
        itinerary: one(userItineraries, {
            fields: [itineraryCosts.itineraryId],
            references: [userItineraries.id],
        }),

        day: one(itineraryDays, {
            fields: [itineraryCosts.itineraryDayId],
            references: [itineraryDays.id],
        }),

        item: one(itineraryItems, {
            fields: [itineraryCosts.itineraryItemId],
            references: [itineraryItems.id],
        }),

        meal: one(itineraryMeals, {
            fields: [itineraryCosts.itineraryMealId],
            references: [itineraryMeals.id],
        }),
    }),
);