export const TOUR_STATUSES = ["draft", "published","hidden"] as const;

export const TRANSPORT_METHODS = [
    "walking",
    "bicycle",
    "motobike",
    "car",
    "bus",
    "train",
    "airplane",
    "boat",
    "other",
] as const;

export const MEAL_TYPES = [
    "breakfast",
    "lunch",
    "dinner",
    "snack",
] as const;

export const CONTENT_STATUSES = [
    "pending",
    "approved",
    "hidden",
] as const;

export type TourStatus = (typeof TOUR_STATUSES)[number];
export type TransportMethod = (typeof TRANSPORT_METHODS)[number];
export type MealType = (typeof MEAL_TYPES)[number];
export type ContentStatus = (typeof CONTENT_STATUSES)[number];