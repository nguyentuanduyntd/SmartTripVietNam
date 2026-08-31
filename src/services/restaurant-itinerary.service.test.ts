import {
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from "vitest";

import type {
    AddRestaurantToItineraryRepositoryResult,
} from "@/src/repositories/restaurant-itinerary.repository";

vi.mock("server-only", () => ({}));
vi.mock(
    "@/src/repositories/restaurant-itinerary.repository",
    () => ({
        addRestaurantToItinerary: vi.fn(),
        findUserItineraryFoodTargets: vi.fn(),
    }),
);
vi.mock(
    "@/src/repositories/itinerary-planner.repository",
    () => ({
        findUserItineraryPlannerDetailById: vi.fn(),
    }),
);

import {
    findUserItineraryPlannerDetailById,
} from "@/src/repositories/itinerary-planner.repository";
import {
    addRestaurantToItinerary,
    findUserItineraryFoodTargets,
} from "@/src/repositories/restaurant-itinerary.repository";
import {
    addRestaurantToItineraryService,
    getFoodItineraryTargetsService,
    RestaurantItineraryServiceError,
} from "@/src/services/restaurant-itinerary.service";

const mockedAddRestaurant = vi.mocked(
    addRestaurantToItinerary,
);
const mockedFindTargets = vi.mocked(
    findUserItineraryFoodTargets,
);
const mockedFindPlanner = vi.mocked(
    findUserItineraryPlannerDetailById,
);

const USER_ID =
    "550e8400-e29b-41d4-a716-446655440190";
const RESTAURANT_ID =
    "550e8400-e29b-41d4-a716-446655440191";
const ITINERARY_ID =
    "550e8400-e29b-41d4-a716-446655440192";
const DAY_ID =
    "550e8400-e29b-41d4-a716-446655440193";
const MEAL_ID =
    "550e8400-e29b-41d4-a716-446655440194";
const COST_ID =
    "550e8400-e29b-41d4-a716-446655440195";

const input = {
    itineraryId: ITINERARY_ID,
    itineraryDayId: DAY_ID,
    mealType: "lunch" as const,
    startTime: "12:00",
    unitPrice: 150_000,
};

const now = new Date("2026-08-29T00:00:00Z");

function createOkResult(): Extract<
    AddRestaurantToItineraryRepositoryResult,
    { status: "ok" }
> {
    return {
        status: "ok",
        itinerary: {
            id: ITINERARY_ID,
            title: "Hành trình Huế",
            adultCount: 2,
            childCount: 1,
        },
        day: {
            id: DAY_ID,
            dayNumber: 1,
            title: "Khám phá Huế",
        },
        restaurant: {
            id: RESTAURANT_ID,
            name: "Quán Huế",
            address: "Trung tâm Huế",
        },
        meal: {
            id: MEAL_ID,
            itineraryDayId: DAY_ID,
            mealType: "lunch",
            startTime: "12:00:00",
            venueName: "Quán Huế",
            note: "Trung tâm Huế",
            isIncluded: false,
            sortOrder: 0,
            createdAt: now,
            updatedAt: now,
        },
        cost: {
            id: COST_ID,
            itineraryId: ITINERARY_ID,
            itineraryDayId: null,
            itineraryItemId: null,
            itineraryMealId: MEAL_ID,
            title: "Ăn tại Quán Huế",
            category: "food",
            calculationUnit: "per_person",
            travelerScope: "all",
            unitPrice: "150000",
            quantity: "1",
            nightCount: null,
            note: "Chi phí tham khảo",
            sortOrder: 0,
            createdAt: now,
            updatedAt: now,
        },
    };
}

const costSummary = {
    currency: "VND" as const,
    travelerCount: 3,
    total: 450_000,
};

describe("getFoodItineraryTargetsService", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("trả danh sách target từ repository", async () => {
        const targets = [
            {
                id: ITINERARY_ID,
                title: "Hành trình Huế",
                startDate: "2026-09-01",
                status: "draft" as const,
                adultCount: 2,
                childCount: 1,
                travelerCount: 3,
                days: [],
            },
        ];
        mockedFindTargets.mockResolvedValue(targets);

        await expect(
            getFoodItineraryTargetsService(USER_ID),
        ).resolves.toBe(targets);
        expect(mockedFindTargets).toHaveBeenCalledWith(USER_ID);
    });
});

describe("addRestaurantToItineraryService", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockedAddRestaurant.mockResolvedValue(createOkResult());
        mockedFindPlanner.mockResolvedValue({
            costSummary,
        } as Awaited<
            ReturnType<
                typeof findUserItineraryPlannerDetailById
            >
        >);
    });

    it.each([
        {
            status: "itinerary_not_found" as const,
            expectedStatus: 404,
            message: "Không tìm thấy lịch trình",
        },
        {
            status: "itinerary_not_editable" as const,
            expectedStatus: 409,
            message:
                "Lịch trình này đã hoàn thành hoặc lưu trữ và không thể thêm món ăn.",
        },
        {
            status: "day_not_found" as const,
            expectedStatus: 404,
            message:
                "Không tìm thấy ngày đã chọn trong lịch trình",
        },
        {
            status: "restaurant_not_found" as const,
            expectedStatus: 404,
            message: "Không tìm thấy quán ăn",
        },
    ])(
        "chuyển repository status $status thành service error",
        async ({ status, expectedStatus, message }) => {
            mockedAddRestaurant.mockResolvedValueOnce({ status });

            const promise = addRestaurantToItineraryService(
                RESTAURANT_ID,
                input,
                USER_ID,
            );

            await expect(promise).rejects.toMatchObject({
                name: "RestaurantItineraryServiceError",
                status: expectedStatus,
                message,
            });
        },
    );

    it("RestaurantItineraryServiceError giữ message và status", () => {
        const error = new RestaurantItineraryServiceError(
            "Conflict",
            409,
        );

        expect(error).toBeInstanceOf(Error);
        expect(error.name).toBe("RestaurantItineraryServiceError");
        expect(error.message).toBe("Conflict");
        expect(error.status).toBe(409);
    });

    it("đọc lại planner và trả response đã chuẩn hóa", async () => {
        const result = await addRestaurantToItineraryService(
            RESTAURANT_ID,
            input,
            USER_ID,
        );

        expect(mockedAddRestaurant).toHaveBeenCalledWith({
            userId: USER_ID,
            restaurantId: RESTAURANT_ID,
            itineraryId: ITINERARY_ID,
            itineraryDayId: DAY_ID,
            mealType: "lunch",
            startTime: "12:00",
            unitPrice: 150_000,
        });
        expect(mockedFindPlanner).toHaveBeenCalledWith(
            ITINERARY_ID,
            USER_ID,
        );
        expect(result).toEqual({
            itinerary: {
                id: ITINERARY_ID,
                title: "Hành trình Huế",
            },
            day: {
                id: DAY_ID,
                dayNumber: 1,
                title: "Khám phá Huế",
            },
            restaurant: {
                id: RESTAURANT_ID,
                name: "Quán Huế",
            },
            meal: {
                id: MEAL_ID,
                mealType: "lunch",
                startTime: "12:00:00",
                venueName: "Quán Huế",
            },
            cost: {
                id: COST_ID,
                unitPrice: 150_000,
                travelerCount: 3,
                addedAmount: 450_000,
            },
            costSummary,
            redirectTo: `/planner/${ITINERARY_ID}`,
        });
    });

    it("báo lỗi khi đã thêm nhưng không đọc lại được planner", async () => {
        mockedFindPlanner.mockResolvedValueOnce(null);

        await expect(
            addRestaurantToItineraryService(
                RESTAURANT_ID,
                input,
                USER_ID,
            ),
        ).rejects.toThrow(
            "Đã thêm món nhưng không thể đọc lại lịch trình",
        );
    });

    it("truyền lỗi repository lên tầng gọi", async () => {
        const error = new Error("Database unavailable");
        mockedAddRestaurant.mockRejectedValueOnce(error);

        await expect(
            addRestaurantToItineraryService(
                RESTAURANT_ID,
                input,
                USER_ID,
            ),
        ).rejects.toBe(error);
    });
});
