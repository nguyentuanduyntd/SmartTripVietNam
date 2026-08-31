import {
    describe,
    expect,
    it,
} from "vitest";

import {
    travelWeatherCheckSchema,
} from "@/src/schemas/travel-weather.schema";

const validInput = {
    locationName: "Đà Nẵng",
    startDate: "2026-08-30",
    dayCount: 3,
};

const validActivity = {
    dayNumber: 1,
    destinationName: "Bãi biển Mỹ Khê",
    title: "Ngắm bình minh",
    startTime: "6:30",
};

describe("travelWeatherCheckSchema", () => {
    it("chuẩn hóa địa điểm và thêm danh sách hoạt động mặc định", () => {
        expect(
            travelWeatherCheckSchema.parse({
                ...validInput,
                locationName: "  Đà Nẵng  ",
            }),
        ).toEqual({
            ...validInput,
            activities: [],
        });
    });

    it("thêm mô tả mặc định cho hoạt động", () => {
        expect(
            travelWeatherCheckSchema.parse({
                ...validInput,
                activities: [
                    validActivity,
                ],
            }).activities[0],
        ).toEqual({
            ...validActivity,
            description: "",
        });
    });

    it("trim tên địa điểm và tiêu đề hoạt động", () => {
        const result = travelWeatherCheckSchema.parse({
            ...validInput,
            activities: [
                {
                    ...validActivity,
                    destinationName: "  Bán đảo Sơn Trà  ",
                    title: "  Ngắm cảnh  ",
                    description: "Ngoài trời",
                },
            ],
        });

        expect(result.activities[0]).toMatchObject({
            destinationName: "Bán đảo Sơn Trà",
            title: "Ngắm cảnh",
            description: "Ngoài trời",
        });
    });

    it.each([
        {
            field: "locationName",
            value: "A",
        },
        {
            field: "locationName",
            value: "A".repeat(121),
        },
        {
            field: "startDate",
            value: "30-08-2026",
        },
        {
            field: "startDate",
            value: "2026-8-30",
        },
        {
            field: "dayCount",
            value: 0,
        },
        {
            field: "dayCount",
            value: 8,
        },
        {
            field: "dayCount",
            value: 1.5,
        },
    ])("từ chối trường cấp lịch sai: $field=$value", ({
        field,
        value,
    }) => {
        expect(
            travelWeatherCheckSchema.safeParse({
                ...validInput,
                [field]: value,
            }).success,
        ).toBe(false);
    });

    it("giới hạn tối đa 40 hoạt động", () => {
        expect(
            travelWeatherCheckSchema.safeParse({
                ...validInput,
                activities: Array.from(
                    { length: 41 },
                    () => validActivity,
                ),
            }).success,
        ).toBe(false);
    });

    it.each([
        {
            patch: {
                dayNumber: 0,
            },
        },
        {
            patch: {
                dayNumber: 8,
            },
        },
        {
            patch: {
                dayNumber: 1.5,
            },
        },
        {
            patch: {
                destinationName: " ",
            },
        },
        {
            patch: {
                destinationName: "A".repeat(181),
            },
        },
        {
            patch: {
                title: " ",
            },
        },
        {
            patch: {
                title: "A".repeat(241),
            },
        },
        {
            patch: {
                description: "A".repeat(2001),
            },
        },
        {
            patch: {
                startTime: "08:5",
            },
        },
        {
            patch: {
                startTime: "8 giờ",
            },
        },
    ])("từ chối hoạt động sai: $patch", ({ patch }) => {
        expect(
            travelWeatherCheckSchema.safeParse({
                ...validInput,
                activities: [
                    {
                        ...validActivity,
                        ...patch,
                    },
                ],
            }).success,
        ).toBe(false);
    });

    it.each([
        "0:00",
        "09:05",
        "23:59",
    ])("chấp nhận định dạng giờ hiện tại: %s", (startTime) => {
        expect(
            travelWeatherCheckSchema.safeParse({
                ...validInput,
                activities: [
                    {
                        ...validActivity,
                        startTime,
                    },
                ],
            }).success,
        ).toBe(true);
    });
});
