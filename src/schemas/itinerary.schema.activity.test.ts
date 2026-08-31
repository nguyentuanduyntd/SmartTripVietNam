import {
    describe,
    expect,
    it,
} from "vitest";

import {
    createItineraryItemRequestSchema,
    updateItineraryItemRequestSchema,
} from "@/src/db/schema/itinerary.schema";

const DESTINATION_ID =
    "550e8400-e29b-41d4-a716-446655440120";

const validItem = {
    title: "Tham quan Đại Nội",
};

describe("createItineraryItemRequestSchema", () => {
    it("thêm đầy đủ giá trị mặc định", () => {
        expect(
            createItineraryItemRequestSchema.parse(validItem),
        ).toEqual({
            title: "Tham quan Đại Nội",
            destinationId: null,
            destinationName: null,
            description: null,
            startTime: null,
            endTime: null,
            sortOrder: 0,
            transportMethod: null,
            transportNote: null,
            estimatedTravelMinutes: null,
        });
    });

    it("trim và chấp nhận hoạt động đầy đủ", () => {
        expect(
            createItineraryItemRequestSchema.parse({
                title: "  Tham quan Đại Nội  ",
                destinationId: DESTINATION_ID,
                destinationName: "  Đại Nội Huế  ",
                description: "  Khám phá Hoàng thành  ",
                startTime: "08:00:00",
                endTime: "10:00:01",
                sortOrder: 2,
                transportMethod: "walking",
                transportNote: "  Đi bộ từ khách sạn  ",
                estimatedTravelMinutes: 15,
            }),
        ).toEqual({
            title: "Tham quan Đại Nội",
            destinationId: DESTINATION_ID,
            destinationName: "Đại Nội Huế",
            description: "Khám phá Hoàng thành",
            startTime: "08:00:00",
            endTime: "10:00:01",
            sortOrder: 2,
            transportMethod: "walking",
            transportNote: "Đi bộ từ khách sạn",
            estimatedTravelMinutes: 15,
        });
    });

    it.each([
        ["08:00", "09:00"],
        ["08:00:00", "08:00:01"],
        ["23:58", "23:59"],
    ])(
        "chấp nhận khoảng thời gian %s - %s",
        (startTime, endTime) => {
            expect(
                createItineraryItemRequestSchema.safeParse({
                    ...validItem,
                    startTime,
                    endTime,
                }).success,
            ).toBe(true);
        },
    );

    it.each([
        ["09:00", "09:00"],
        ["10:00", "09:00"],
        ["09:00:01", "09:00:00"],
    ])(
        "từ chối khoảng thời gian %s - %s",
        (startTime, endTime) => {
            const result =
                createItineraryItemRequestSchema.safeParse({
                    ...validItem,
                    startTime,
                    endTime,
                });

            expect(result.success).toBe(false);

            if (!result.success) {
                expect(result.error.issues).toEqual(
                    expect.arrayContaining([
                        expect.objectContaining({
                            path: ["endTime"],
                        }),
                    ]),
                );
            }
        },
    );

    it("chấp nhận khi thiếu một hoặc cả hai mốc thời gian", () => {
        expect(
            createItineraryItemRequestSchema.safeParse({
                ...validItem,
                startTime: "08:00",
            }).success,
        ).toBe(true);
        expect(
            createItineraryItemRequestSchema.safeParse({
                ...validItem,
                endTime: "09:00",
            }).success,
        ).toBe(true);
        expect(
            createItineraryItemRequestSchema.safeParse(validItem)
                .success,
        ).toBe(true);
    });

    it.each([
        {
            patch: { title: "A" },
            reason: "title quá ngắn",
        },
        {
            patch: { destinationId: "invalid-id" },
            reason: "destinationId sai",
        },
        {
            patch: { destinationName: "A".repeat(301) },
            reason: "destinationName quá dài",
        },
        {
            patch: { startTime: "8:00" },
            reason: "startTime sai",
        },
        {
            patch: { sortOrder: -1 },
            reason: "sortOrder âm",
        },
        {
            patch: { transportMethod: "teleport" },
            reason: "transportMethod sai",
        },
        {
            patch: { estimatedTravelMinutes: -1 },
            reason: "travel minutes âm",
        },
        {
            patch: { estimatedTravelMinutes: 10_081 },
            reason: "travel minutes vượt giới hạn",
        },
        {
            patch: { estimatedTravelMinutes: 1.5 },
            reason: "travel minutes không nguyên",
        },
        {
            patch: { unknown: true },
            reason: "có trường dư",
        },
    ])("từ chối hoạt động khi $reason", ({ patch }) => {
        expect(
            createItineraryItemRequestSchema.safeParse({
                ...validItem,
                ...patch,
            }).success,
        ).toBe(false);
    });
});

describe("updateItineraryItemRequestSchema", () => {
    it("từ chối update rỗng", () => {
        expect(
            updateItineraryItemRequestSchema.safeParse({}).success,
        ).toBe(false);
    });

    it("chấp nhận null và trim dữ liệu update", () => {
        expect(
            updateItineraryItemRequestSchema.parse({
                destinationId: null,
                destinationName: null,
                title: "  Hoạt động mới  ",
                startTime: null,
                transportMethod: null,
            }),
        ).toEqual({
            destinationId: null,
            destinationName: null,
            title: "Hoạt động mới",
            startTime: null,
            transportMethod: null,
        });
    });

    it("kiểm tra khoảng thời gian khi cả hai mốc được cập nhật", () => {
        expect(
            updateItineraryItemRequestSchema.safeParse({
                startTime: "12:00",
                endTime: "11:00",
            }).success,
        ).toBe(false);
        expect(
            updateItineraryItemRequestSchema.safeParse({
                startTime: "12:00",
            }).success,
        ).toBe(true);
    });

    it("từ chối trường update sai và trường dư", () => {
        expect(
            updateItineraryItemRequestSchema.safeParse({
                title: "A",
            }).success,
        ).toBe(false);
        expect(
            updateItineraryItemRequestSchema.safeParse({
                title: "Hợp lệ",
                unknown: true,
            }).success,
        ).toBe(false);
    });
});
