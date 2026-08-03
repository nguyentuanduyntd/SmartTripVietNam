import { pgEnum } from "drizzle-orm/pg-core";

import {
    COST_CALCULATION_UNITS,
    COST_CATEGORIES,
    ITINERARY_SOURCES,
    ITINERARY_STATUSES,
    TRAVELER_SCOPES,
} from "@/src/constants/itinerary";

export const itineraryStatusEnum = pgEnum(
    "itinerary_status",
    ITINERARY_STATUSES,
);

export const itinerarySourceEnum = pgEnum(
    "itinerary_source",
    ITINERARY_SOURCES,
);

export const costCategoryEnum = pgEnum(
    "itinerary_cost_category",
    COST_CATEGORIES,
);

export const costCalculationUnitEnum = pgEnum(
    "itinerary_cost_calculation_unit",
    COST_CALCULATION_UNITS,
);

export const travelerScopeEnum = pgEnum(
    "itinerary_traveler_scope",
    TRAVELER_SCOPES,
);