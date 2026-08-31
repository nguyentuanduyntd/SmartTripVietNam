import {
    describe,
    expect,
    it,
} from "vitest";

import {
    addRestaurantToItineraryRequestSchema,
    restaurantIdParamsSchema,
} from "@/src/db/schema/restaurant-itinerary.schema";

const RESTAURANT_ID =
    "550e8400-e29b-41d4-a716-446655440160";
const ITINERARY_ID =
    "550e8400-e29b-41d4-a716-446655440161";
const DAY_ID =
    "550e8400-e29b-41d4-a716-446655440162";

const validRequest = {
    itineraryId: ITINERARY_ID,
    itineraryDayId: DAY_ID,
    mealType: "lunch" as const,
    startTime: "12:00",
    unitPrice: 150_000,
};

describe("restaurantIdParamsSchema", () => {
    it("trim và xác thực restaurant UUID", () => {
        expect(
            restaurantIdParamsSchema.parse({
                id: `  ${RESTAURANT_ID}  `,
            }),
        ).toEqual({
            id: RESTAURANT_ID,
        });
    });

    it("từ chối ID sai và params dư", () => {
        expect(
            restaurantIdParamsSchema.safeParse({
                id: "invalid-id",
            }).success,
        ).toBe(false);
        expect(
            restaurantIdParamsSchema.safeParse({
                id: RESTAURANT_ID,
                unknown: true,
            }).success,
        ).toBe(false);
    });
});

describe("addRestaurantToItineraryRequestSchema", () => {
    it("trim ID, thời gian và chấp nhận request hợp lệ", () => {
        expect(
            addRestaurantToItineraryRequestSchema.parse({
                ...validRequest,
                itineraryId: `  ${ITINERARY_ID}  `,
                itineraryDayId: `  ${DAY_ID}  `,
                startTime: "  12:00  ",
            }),
        ).toEqual(validRequest);
    });

    it.each(["breakfast", "lunch", "dinner", "snack"])(
        "chấp nhận mealType %s",
        (mealType) => {
            expect(
                addRestaurantToItineraryRequestSchema.safeParse({
                    ...validRequest,
                    mealType,
                }).success,
            ).toBe(true);
        },
    );

    it("chấp nhận giá thập phân và giá trị biên", () => {
        expect(
            addRestaurantToItineraryRequestSchema.safeParse({
                ...validRequest,
                unitPrice: 0,
            }).success,
        ).toBe(true);
        expect(
            addRestaurantToItineraryRequestSchema.safeParse({
                ...validRequest,
                unitPrice: 1.5,
            }).success,
        ).toBe(true);
        expect(
            addRestaurantToItineraryRequestSchema.safeParse({
                ...validRequest,
                unitPrice: 999_999_999_999,
            }).success,
        ).toBe(true);
    });

    it.each([
        {
            patch: { itineraryId: "invalid-id" },
            reason: "itineraryId sai",
        },
        {
            patch: { itineraryDayId: "invalid-id" },
            reason: "dayId sai",
        },
        {
            patch: { mealType: "brunch" },
            reason: "mealType sai",
        },
        {
            patch: { startTime: "8:00" },
            reason: "thiếu số 0 đầu giờ",
        },
        {
            patch: { startTime: "12:00:00" },
            reason: "thời gian có giây",
        },
        {
            patch: { startTime: "24:00" },
            reason: "giờ vượt 23",
        },
        {
            patch: { unitPrice: -1 },
            reason: "giá âm",
        },
        {
            patch: { unitPrice: 1_000_000_000_000 },
            reason: "giá vượt giới hạn",
        },
        {
            patch: { unitPrice: Number.POSITIVE_INFINITY },
            reason: "giá không hữu hạn",
        },
        {
            patch: { unknown: true },
            reason: "có trường dư",
        },
    ])("từ chối add request khi $reason", ({ patch }) => {
        expect(
            addRestaurantToItineraryRequestSchema.safeParse({
                ...validRequest,
                ...patch,
            }).success,
        ).toBe(false);
    });
});
