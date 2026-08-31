import {
    describe,
    expect,
    it,
} from "vitest";

import {
    restaurantNearbyQuerySchema,
} from "@/src/schemas/restaurant.schema";

const LOCATION_ID =
    "550e8400-e29b-41d4-a716-446655440150";
const CUISINE_ID =
    "550e8400-e29b-41d4-a716-446655440151";

describe("restaurantNearbyQuerySchema", () => {
    it("coerce tọa độ và thêm query mặc định", () => {
        expect(
            restaurantNearbyQuerySchema.parse({
                latitude: "16.4637",
                longitude: "107.5909",
            }),
        ).toEqual({
            latitude: 16.4637,
            longitude: 107.5909,
            radiusKm: 5,
            source: "demo",
            sort: "best_match",
            limit: 12,
        });
    });

    it("chuẩn hóa toàn bộ bộ lọc", () => {
        expect(
            restaurantNearbyQuerySchema.parse({
                latitude: "16.46",
                longitude: "107.59",
                radiusKm: "10",
                locationId: LOCATION_ID,
                cuisineId: CUISINE_ID,
                search: "  bún bò  ",
                maxPrice: "200000",
                tags: "  đặc sản, gia đình,đặc sản, , view đẹp  ",
                openLate: "true",
                familyFriendly: "false",
                source: "manual",
                sort: "distance",
                limit: "20",
            }),
        ).toEqual({
            latitude: 16.46,
            longitude: 107.59,
            radiusKm: 10,
            locationId: LOCATION_ID,
            cuisineId: CUISINE_ID,
            search: "bún bò",
            maxPrice: 200_000,
            tags: ["đặc sản", "gia đình", "view đẹp"],
            openLate: true,
            familyFriendly: false,
            source: "manual",
            sort: "distance",
            limit: 20,
        });
    });

    it("giới hạn danh sách tag sau khi loại trùng", () => {
        const tags = Array.from(
            { length: 12 },
            (_, index) => `tag-${index}`,
        ).join(",");

        const result = restaurantNearbyQuerySchema.parse({
            latitude: 0,
            longitude: 0,
            tags,
        });

        expect(result.tags).toHaveLength(10);
        expect(result.tags?.[9]).toBe("tag-9");
    });

    it.each(["gps", "manual", "demo"])(
        "chấp nhận source %s",
        (source) => {
            expect(
                restaurantNearbyQuerySchema.safeParse({
                    latitude: 0,
                    longitude: 0,
                    source,
                }).success,
            ).toBe(true);
        },
    );

    it.each(["best_match", "distance", "rating"])(
        "chấp nhận sort %s",
        (sort) => {
            expect(
                restaurantNearbyQuerySchema.safeParse({
                    latitude: 0,
                    longitude: 0,
                    sort,
                }).success,
            ).toBe(true);
        },
    );

    it.each([
        {
            patch: { latitude: -91 },
            reason: "latitude nhỏ hơn -90",
        },
        {
            patch: { latitude: 91 },
            reason: "latitude lớn hơn 90",
        },
        {
            patch: { longitude: -181 },
            reason: "longitude nhỏ hơn -180",
        },
        {
            patch: { longitude: 181 },
            reason: "longitude lớn hơn 180",
        },
        {
            patch: { radiusKm: 0 },
            reason: "radius bằng 0",
        },
        {
            patch: { radiusKm: 51 },
            reason: "radius vượt 50",
        },
        {
            patch: { locationId: "invalid-id" },
            reason: "locationId sai",
        },
        {
            patch: { cuisineId: "invalid-id" },
            reason: "cuisineId sai",
        },
        {
            patch: { search: "   " },
            reason: "search rỗng",
        },
        {
            patch: { search: "A".repeat(121) },
            reason: "search quá dài",
        },
        {
            patch: { maxPrice: 0 },
            reason: "maxPrice bằng 0",
        },
        {
            patch: { maxPrice: 20_000_001 },
            reason: "maxPrice vượt giới hạn",
        },
        {
            patch: { maxPrice: 1.5 },
            reason: "maxPrice không nguyên",
        },
        {
            patch: { tags: "A".repeat(301) },
            reason: "tags quá dài",
        },
        {
            patch: { openLate: true },
            reason: "boolean query không phải chuỗi",
        },
        {
            patch: { source: "google" },
            reason: "source sai",
        },
        {
            patch: { sort: "price" },
            reason: "sort sai",
        },
        {
            patch: { limit: 0 },
            reason: "limit nhỏ hơn 1",
        },
        {
            patch: { limit: 31 },
            reason: "limit vượt 30",
        },
        {
            patch: { unknown: true },
            reason: "có trường dư",
        },
    ])("từ chối nearby query khi $reason", ({ patch }) => {
        expect(
            restaurantNearbyQuerySchema.safeParse({
                latitude: 16.46,
                longitude: 107.59,
                ...patch,
            }).success,
        ).toBe(false);
    });
});