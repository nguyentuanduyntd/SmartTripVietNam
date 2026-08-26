export const ITINERARY_STATUSES = [
    "draft",
    "planned",
    "completed",
    "archived",
] as const;

export const ITINERARY_SOURCES = [
    "tour_template",
    "manual",
    "ai",
    "community",
] as const;

export const COST_CATEGORIES = [
    "ticket",
    "food",
    "transport",
    "accommodation",
    "activity",
    "shopping",
    "other",
] as const;

export const COST_CALCULATION_UNITS = [
    "per_person",
    "per_group",
    "per_room",
    "fixed",
] as const;

export const TRAVELER_SCOPES = [
    "all",
    "adult",
    "child",
] as const;

export type ItineraryStatus =
    (typeof ITINERARY_STATUSES)[number];

export type ItinerarySource =
    (typeof ITINERARY_SOURCES)[number];

export type CostCategory =
    (typeof COST_CATEGORIES)[number];

export type CostCalculationUnit =
    (typeof COST_CALCULATION_UNITS)[number];

export type TravelerScope =
    (typeof TRAVELER_SCOPES)[number];

export const COST_CATEGORY_DISPLAY_ORDER: CostCategory[] = [
    "accommodation",
    "transport",
    "ticket",
    "food",
    "activity",
    "shopping",
    "other",
];

export const COST_CATEGORY_LABELS: Record<CostCategory, string> = {
    accommodation: "Lưu trú",
    transport: "Di chuyển",
    ticket: "Vé & tham quan",
    food: "Ăn uống",
    activity: "Hoạt động",
    shopping: "Mua sắm",
    other: "Chi phí khác",
};

export const COST_CALCULATION_UNIT_LABELS: Record<
    CostCalculationUnit,
    string
> = {
    per_person: "Theo người",
    per_group: "Theo nhóm / chuyến",
    per_room: "Theo phòng / đêm",
    fixed: "Chi phí cố định",
};

export const TRAVELER_SCOPE_LABELS: Record<TravelerScope, string> = {
    all: "Tất cả hành khách",
    adult: "Người lớn",
    child: "Trẻ em",
};
