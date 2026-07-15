import { pgEnum } from "drizzle-orm/pg-core";
import { CONTENT_STATUSES, MEAL_TYPES, TOUR_STATUSES, TRANSPORT_METHODS } from "@/src/constants/tour_community";

export const tourStatusEnum = pgEnum("tour_status", TOUR_STATUSES);
export const transportMethodEnum = pgEnum("transport_method", TRANSPORT_METHODS);
export const mealTypeEnum = pgEnum("meal_type", MEAL_TYPES);
export const socialContentStatusEnum = pgEnum("social_content_status", CONTENT_STATUSES);

