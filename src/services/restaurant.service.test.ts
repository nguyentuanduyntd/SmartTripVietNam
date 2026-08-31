import {
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from "vitest";

import type {
    Restaurant,
} from "@/src/db/schema/restaurants";
import type {
    RestaurantNearbyQuery,
} from "@/src/schemas/restaurant.schema";

vi.mock("server-only", () => ({}));
vi.mock("@/src/repositories/restaurant.repository", () => ({
    findRestaurantsForDiscovery: vi.fn(),
    findCuisinesByRestaurantIds: vi.fn(),
}));

import {
    findCuisinesByRestaurantIds,
    findRestaurantsForDiscovery,
} from "@/src/repositories/restaurant.repository";
import {
    searchNearbyRestaurantsService,
} from "@/src/services/restaurant.service";

const mockedFindRestaurants = vi.mocked(
    findRestaurantsForDiscovery,
);
const mockedFindCuisines = vi.mocked(
    findCuisinesByRestaurantIds,
);

const BASE_LATITUDE = 16.4637;
const BASE_LONGITUDE = 107.5909;

const defaultInput: RestaurantNearbyQuery = {
    latitude: BASE_LATITUDE,
    longitude: BASE_LONGITUDE,
    radiusKm: 5,
    source: "demo",
    sort: "best_match",
    limit: 12,
};

function createRestaurant(
    overrides: Partial<Restaurant> = {},
): Restaurant {
    return {
        id: "550e8400-e29b-41d4-a716-446655440170",
        locationId:
            "550e8400-e29b-41d4-a716-446655440171",
        name: "Quán Huế",
        nameEn: null,
        slug: "quan-hue",
        description: null,
        address: "Huế",
        latitude: BASE_LATITUDE,
        longitude: BASE_LONGITUDE,
        priceMin: 50_000,
        priceMax: 100_000,
        rating: 5,
        reviewCount: 10_000,
        openingHours: null,
        tags: ["dac san"],
        isOpenLate: true,
        isFamilyFriendly: true,
        isActive: true,
        imageUrl: null,
        source: "demo",
        externalPlaceId: null,
        googleMapsUrl: null,
        createdAt: new Date("2026-08-01T00:00:00Z"),
        updatedAt: new Date("2026-08-01T00:00:00Z"),
        ...overrides,
    };
}

describe("searchNearbyRestaurantsService", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockedFindRestaurants.mockResolvedValue([]);
        mockedFindCuisines.mockResolvedValue(new Map());
    });

    it("truyền đúng bộ lọc xuống repository", async () => {
        await searchNearbyRestaurantsService({
            ...defaultInput,
            locationId:
                "550e8400-e29b-41d4-a716-446655440172",
            cuisineId:
                "550e8400-e29b-41d4-a716-446655440173",
            search: "bún bò",
            maxPrice: 200_000,
            openLate: true,
            familyFriendly: false,
        });

        expect(mockedFindRestaurants).toHaveBeenCalledWith({
            locationId:
                "550e8400-e29b-41d4-a716-446655440172",
            cuisineId:
                "550e8400-e29b-41d4-a716-446655440173",
            search: "bún bò",
            maxPrice: 200_000,
            openLate: true,
            familyFriendly: false,
            candidateLimit: 250,
        });
        expect(mockedFindCuisines).toHaveBeenCalledWith([]);
    });

    it("tính khoảng cách, gắn cuisines và loại quán ngoài bán kính", async () => {
        const nearby = createRestaurant();
        const farAway = createRestaurant({
            id: "550e8400-e29b-41d4-a716-446655440174",
            name: "Quán xa",
            latitude: BASE_LATITUDE + 0.1,
        });
        const cuisine = {
            id: "550e8400-e29b-41d4-a716-446655440175",
            name: "Bún bò Huế",
            nameEn: null,
            slug: "bun-bo-hue",
            avgPrice: 50_000,
            isSignature: true,
        };

        mockedFindRestaurants.mockResolvedValue([
            farAway,
            nearby,
        ]);
        mockedFindCuisines.mockResolvedValue(
            new Map([[nearby.id, [cuisine]]]),
        );

        const result = await searchNearbyRestaurantsService(
            defaultInput,
        );

        expect(mockedFindCuisines).toHaveBeenCalledWith([
            farAway.id,
            nearby.id,
        ]);
        expect(result.items).toHaveLength(1);
        expect(result.items[0]).toMatchObject({
            id: nearby.id,
            distanceKm: 0,
            distanceMeters: 0,
            cuisines: [cuisine],
        });
        expect(result.meta).toMatchObject({
            totalMatched: 1,
            returned: 1,
            isDemoData: true,
        });
    });

    it("sắp xếp theo khoảng cách và áp dụng limit", async () => {
        const farther = createRestaurant({
            id: "550e8400-e29b-41d4-a716-446655440176",
            latitude: BASE_LATITUDE + 0.02,
        });
        const nearer = createRestaurant({
            id: "550e8400-e29b-41d4-a716-446655440177",
            latitude: BASE_LATITUDE + 0.01,
        });

        mockedFindRestaurants.mockResolvedValue([
            farther,
            nearer,
        ]);

        const result = await searchNearbyRestaurantsService({
            ...defaultInput,
            sort: "distance",
            limit: 1,
        });

        expect(result.items.map((item) => item.id)).toEqual([
            nearer.id,
        ]);
        expect(result.meta.totalMatched).toBe(2);
        expect(result.meta.returned).toBe(1);
    });

    it("sắp xếp rating giảm dần và dùng khoảng cách khi bằng điểm", async () => {
        const lowRating = createRestaurant({
            id: "550e8400-e29b-41d4-a716-446655440178",
            rating: 3,
            latitude: BASE_LATITUDE,
        });
        const highFar = createRestaurant({
            id: "550e8400-e29b-41d4-a716-446655440179",
            rating: 5,
            latitude: BASE_LATITUDE + 0.02,
        });
        const highNear = createRestaurant({
            id: "550e8400-e29b-41d4-a716-446655440180",
            rating: 5,
            latitude: BASE_LATITUDE + 0.01,
        });

        mockedFindRestaurants.mockResolvedValue([
            lowRating,
            highFar,
            highNear,
        ]);

        const result = await searchNearbyRestaurantsService({
            ...defaultInput,
            sort: "rating",
        });

        expect(result.items.map((item) => item.id)).toEqual([
            highNear.id,
            highFar.id,
            lowRating.id,
        ]);
    });

    it("coi rating null là 0 khi sắp xếp", async () => {
        const nullFar = createRestaurant({
            id: "550e8400-e29b-41d4-a716-446655440186",
            rating: null,
            latitude: BASE_LATITUDE + 0.02,
        });
        const nullNear = createRestaurant({
            id: "550e8400-e29b-41d4-a716-446655440187",
            rating: null,
            latitude: BASE_LATITUDE + 0.01,
        });

        mockedFindRestaurants.mockResolvedValue([
            nullFar,
            nullNear,
        ]);

        const result = await searchNearbyRestaurantsService({
            ...defaultInput,
            sort: "rating",
        });

        expect(result.items.map((item) => item.id)).toEqual([
            nullNear.id,
            nullFar.id,
        ]);
    });

    it("tính điểm tối đa khi khớp tag, rating và ngân sách", async () => {
        const perfect = createRestaurant();

        mockedFindRestaurants.mockResolvedValue([perfect]);

        const result = await searchNearbyRestaurantsService({
            ...defaultInput,
            tags: ["Đặc sản"],
            maxPrice: 100_000,
        });

        expect(result.items[0]?.matchScore).toBe(100);
    });

    it("phân biệt ngân sách phù hợp toàn phần, một phần và không phù hợp", async () => {
        const fullyMatched = createRestaurant({
            id: "550e8400-e29b-41d4-a716-446655440181",
            priceMin: 50_000,
            priceMax: 100_000,
        });
        const partlyMatched = createRestaurant({
            id: "550e8400-e29b-41d4-a716-446655440182",
            priceMin: 80_000,
            priceMax: 200_000,
        });
        const notMatched = createRestaurant({
            id: "550e8400-e29b-41d4-a716-446655440183",
            priceMin: 150_000,
            priceMax: 200_000,
        });

        mockedFindRestaurants.mockResolvedValue([
            notMatched,
            partlyMatched,
            fullyMatched,
        ]);

        const result = await searchNearbyRestaurantsService({
            ...defaultInput,
            maxPrice: 100_000,
        });

        expect(result.items.map((item) => item.matchScore)).toEqual([
            80,
            75,
            68,
        ]);
    });

    it("xử lý rating null, không có tag/giá và dữ liệu không phải demo", async () => {
        const manualRestaurant = createRestaurant({
            rating: null,
            reviewCount: 0,
            tags: [],
            priceMin: null,
            priceMax: null,
            source: "manual",
        });

        mockedFindRestaurants.mockResolvedValue([
            manualRestaurant,
        ]);

        const result = await searchNearbyRestaurantsService({
            ...defaultInput,
            source: "manual",
        });

        expect(result.items[0]?.matchScore).toBe(35);
        expect(result.items[0]?.cuisines).toEqual([]);
        expect(result.meta.isDemoData).toBe(false);
    });

    it("dùng khoảng cách khi hai matchScore bằng nhau", async () => {
        const first = createRestaurant({
            id: "550e8400-e29b-41d4-a716-446655440184",
        });
        const second = createRestaurant({
            id: "550e8400-e29b-41d4-a716-446655440185",
        });

        mockedFindRestaurants.mockResolvedValue([second, first]);

        const result = await searchNearbyRestaurantsService(
            defaultInput,
        );

        expect(result.items).toHaveLength(2);
        expect(result.items[0]?.matchScore).toBe(
            result.items[1]?.matchScore,
        );
    });

    it("truyền lỗi repository lên tầng gọi", async () => {
        const error = new Error("Database unavailable");
        mockedFindRestaurants.mockRejectedValueOnce(error);

        await expect(
            searchNearbyRestaurantsService(defaultInput),
        ).rejects.toBe(error);
    });
});