import {
    describe,
    expect,
    it,
} from "vitest";

import {
    cloneTourToItineraryRequestSchema,
    createItineraryDayRequestSchema,
    itineraryAdultCountSchema,
    itineraryChildCountSchema,
    itineraryCostIdParamsSchema,
    itineraryDayIdParamsSchema,
    itineraryDayNumberSchema,
    itineraryDescriptionSchema,
    itineraryIdParamsSchema,
    itineraryItemIdParamsSchema,
    itineraryMealIdParamsSchema,
    itineraryMoneySchema,
    itineraryNoteSchema,
    itineraryOverviewFormSchema,
    itineraryQuantitySchema,
    itineraryRoomCountSchema,
    itinerarySetupFormSchema,
    itineraryShortTextSchema,
    itinerarySortOrderSchema,
    itineraryStartDateSchema,
    itineraryStatusSchema,
    itineraryStayIdParamsSchema,
    itineraryTimeSchema,
    itineraryTitleSchema,
    itineraryUuidSchema,
    moveItineraryEntityRequestSchema,
    plannerStatusSchema,
    updateItineraryDayRequestSchema,
    updateItineraryRequestSchema,
    updateItineraryStatusRequestSchema,
} from "@/src/db/schema/itinerary.schema";

const ITINERARY_ID =
    "550e8400-e29b-41d4-a716-446655440110";
const RESOURCE_ID =
    "550e8400-e29b-41d4-a716-446655440111";

const validSetup = {
    title: "Hành trình Huế",
    startDate: "2026-09-01",
    adultCount: 2,
    childCount: 0,
    roomCount: 1,
};

describe("itinerary primitive schemas", () => {
    it("trim và xác thực UUID", () => {
        const schema = itineraryUuidSchema("Test ID");

        expect(schema.parse(`  ${ITINERARY_ID}  `)).toBe(
            ITINERARY_ID,
        );
        expect(schema.safeParse("invalid-id").success).toBe(false);
    });

    it.each(["draft", "planned", "completed", "archived"])(
        "chấp nhận itinerary status %s",
        (status) => {
            expect(
                itineraryStatusSchema.safeParse(status).success,
            ).toBe(true);
        },
    );

    it.each(["draft", "planned", "completed"])(
        "chấp nhận planner status %s",
        (status) => {
            expect(
                plannerStatusSchema.safeParse(status).success,
            ).toBe(true);
        },
    );

    it("từ chối status không thuộc enum", () => {
        expect(
            itineraryStatusSchema.safeParse("deleted").success,
        ).toBe(false);
        expect(
            plannerStatusSchema.safeParse("archived").success,
        ).toBe(false);
    });

    it("trim và xác thực tiêu đề", () => {
        expect(itineraryTitleSchema.parse("  Đi Huế  ")).toBe(
            "Đi Huế",
        );
        expect(itineraryTitleSchema.safeParse("A").success).toBe(
            false,
        );
        expect(
            itineraryTitleSchema.safeParse("A".repeat(201)).success,
        ).toBe(false);
    });

    it("xác thực description, short text và note", () => {
        expect(itineraryDescriptionSchema.parse(null)).toBeNull();
        expect(
            itineraryDescriptionSchema.parse("  Mô tả  "),
        ).toBe("Mô tả");
        expect(
            itineraryDescriptionSchema.safeParse("A".repeat(5001))
                .success,
        ).toBe(false);

        const shortText = itineraryShortTextSchema("Địa điểm");
        expect(shortText.parse("  Ga Huế  ")).toBe("Ga Huế");
        expect(shortText.parse(null)).toBeNull();
        expect(
            shortText.safeParse("A".repeat(301)).success,
        ).toBe(false);

        expect(itineraryNoteSchema.parse("  Ghi chú  ")).toBe(
            "Ghi chú",
        );
        expect(itineraryNoteSchema.parse(null)).toBeNull();
        expect(
            itineraryNoteSchema.safeParse("A".repeat(2001)).success,
        ).toBe(false);
    });

    it.each([
        "2026-01-01",
        "2024-02-29",
        "  2026-12-31  ",
    ])("chấp nhận ngày lịch hợp lệ: %s", (date) => {
        expect(
            itineraryStartDateSchema.safeParse(date).success,
        ).toBe(true);
    });

    it.each([
        "01/09/2026",
        "2026-2-01",
        "2026-02-29",
        "2026-04-31",
        "2026-13-01",
        "invalid",
    ])("từ chối ngày lịch không hợp lệ: %s", (date) => {
        expect(
            itineraryStartDateSchema.safeParse(date).success,
        ).toBe(false);
    });

    it.each([
        "00:00",
        "23:59",
        "08:30:15",
        "  12:00  ",
    ])("chấp nhận thời gian %s", (time) => {
        expect(itineraryTimeSchema.safeParse(time).success).toBe(
            true,
        );
    });

    it.each([
        "8:00",
        "24:00",
        "12:60",
        "12:00:60",
    ])("từ chối thời gian %s", (time) => {
        expect(itineraryTimeSchema.safeParse(time).success).toBe(
            false,
        );
    });

    it.each([
        [itineraryAdultCountSchema, 1, 50],
        [itineraryChildCountSchema, 0, 50],
        [itineraryRoomCountSchema, 1, 30],
        [itinerarySortOrderSchema, 0, 100_000],
        [itineraryDayNumberSchema, 1, 365],
    ])(
        "chấp nhận giá trị biên của schema số",
        (schema, min, max) => {
            expect(schema.safeParse(min).success).toBe(true);
            expect(schema.safeParse(max).success).toBe(true);
            expect(schema.safeParse(min - 1).success).toBe(false);
            expect(schema.safeParse(max + 1).success).toBe(false);
            expect(schema.safeParse(min + 0.5).success).toBe(false);
        },
    );

    it("xác thực số tiền hữu hạn trong giới hạn", () => {
        expect(itineraryMoneySchema.safeParse(0).success).toBe(true);
        expect(
            itineraryMoneySchema.safeParse(999_999_999_999).success,
        ).toBe(true);
        expect(itineraryMoneySchema.safeParse(-1).success).toBe(
            false,
        );
        expect(
            itineraryMoneySchema.safeParse(1_000_000_000_000)
                .success,
        ).toBe(false);
        expect(
            itineraryMoneySchema.safeParse(Number.POSITIVE_INFINITY)
                .success,
        ).toBe(false);
    });

    it("xác thực số lượng dương hữu hạn", () => {
        expect(itineraryQuantitySchema.safeParse(0.01).success).toBe(
            true,
        );
        expect(
            itineraryQuantitySchema.safeParse(99_999_999.99)
                .success,
        ).toBe(true);
        expect(itineraryQuantitySchema.safeParse(0).success).toBe(
            false,
        );
        expect(
            itineraryQuantitySchema.safeParse(100_000_000).success,
        ).toBe(false);
        expect(
            itineraryQuantitySchema.safeParse(Number.NaN).success,
        ).toBe(false);
    });
});

describe("itinerary setup và overview schemas", () => {
    it("chấp nhận setup và trim dữ liệu", () => {
        expect(
            itinerarySetupFormSchema.parse({
                ...validSetup,
                title: "  Hành trình Huế  ",
            }),
        ).toEqual(validSetup);
    });

    it("từ chối tổng số khách vượt quá 50", () => {
        const result = itinerarySetupFormSchema.safeParse({
            ...validSetup,
            adultCount: 30,
            childCount: 21,
        });

        expect(result.success).toBe(false);

        if (!result.success) {
            expect(result.error.issues).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        path: ["childCount"],
                    }),
                ]),
            );
        }
    });

    it("clone tour yêu cầu sourceTourId hợp lệ", () => {
        expect(
            cloneTourToItineraryRequestSchema.safeParse({
                ...validSetup,
                sourceTourId: RESOURCE_ID,
            }).success,
        ).toBe(true);
        expect(
            cloneTourToItineraryRequestSchema.safeParse({
                ...validSetup,
                sourceTourId: "invalid-id",
            }).success,
        ).toBe(false);
    });

    it("thêm mặc định cho overview", () => {
        expect(
            itineraryOverviewFormSchema.parse(validSetup),
        ).toEqual({
            ...validSetup,
            description: null,
            meetingPoint: null,
        });
    });

    it("từ chối overview có tổng khách vượt giới hạn", () => {
        expect(
            itineraryOverviewFormSchema.safeParse({
                ...validSetup,
                adultCount: 40,
                childCount: 11,
            }).success,
        ).toBe(false);
    });

    it("từ chối trường dư trong setup và overview", () => {
        expect(
            itinerarySetupFormSchema.safeParse({
                ...validSetup,
                unknown: true,
            }).success,
        ).toBe(false);
        expect(
            itineraryOverviewFormSchema.safeParse({
                ...validSetup,
                unknown: true,
            }).success,
        ).toBe(false);
    });
});

describe("update itinerary schemas", () => {
    it("từ chối update rỗng", () => {
        expect(
            updateItineraryRequestSchema.safeParse({}).success,
        ).toBe(false);
    });

    it("chấp nhận null và trim dữ liệu update", () => {
        expect(
            updateItineraryRequestSchema.parse({
                title: "  Hành trình mới  ",
                description: null,
                meetingPoint: null,
                status: "planned",
            }),
        ).toEqual({
            title: "Hành trình mới",
            description: null,
            meetingPoint: null,
            status: "planned",
        });
    });

    it("kiểm tra tổng khách khi cả hai trường có trong update", () => {
        expect(
            updateItineraryRequestSchema.safeParse({
                adultCount: 40,
                childCount: 11,
            }).success,
        ).toBe(false);
        expect(
            updateItineraryRequestSchema.safeParse({
                adultCount: 50,
            }).success,
        ).toBe(true);
    });

    it("xác thực cập nhật status độc lập", () => {
        expect(
            updateItineraryStatusRequestSchema.safeParse({
                status: "completed",
            }).success,
        ).toBe(true);
        expect(
            updateItineraryStatusRequestSchema.safeParse({
                status: "archived",
            }).success,
        ).toBe(false);
        expect(
            updateItineraryStatusRequestSchema.safeParse({
                status: "draft",
                unknown: true,
            }).success,
        ).toBe(false);
    });
});

describe("itinerary route params và move request", () => {
    it.each([
        {
            name: "itinerary",
            schema: itineraryIdParamsSchema,
            input: { id: ITINERARY_ID },
        },
        {
            name: "day",
            schema: itineraryDayIdParamsSchema,
            input: { id: ITINERARY_ID, dayId: RESOURCE_ID },
        },
        {
            name: "item",
            schema: itineraryItemIdParamsSchema,
            input: { id: ITINERARY_ID, itemId: RESOURCE_ID },
        },
        {
            name: "meal",
            schema: itineraryMealIdParamsSchema,
            input: { id: ITINERARY_ID, mealId: RESOURCE_ID },
        },
        {
            name: "stay",
            schema: itineraryStayIdParamsSchema,
            input: { id: ITINERARY_ID, stayId: RESOURCE_ID },
        },
        {
            name: "cost",
            schema: itineraryCostIdParamsSchema,
            input: { id: ITINERARY_ID, costId: RESOURCE_ID },
        },
    ])("xác thực params $name", ({ schema, input }) => {
        expect(schema.safeParse(input).success).toBe(true);
        expect(
            schema.safeParse({
                ...input,
                id: "invalid-id",
            }).success,
        ).toBe(false);
        expect(
            schema.safeParse({
                ...input,
                unknown: true,
            }).success,
        ).toBe(false);
    });

    it.each(["up", "down"])(
        "chấp nhận hướng di chuyển %s",
        (direction) => {
            expect(
                moveItineraryEntityRequestSchema.safeParse({
                    direction,
                }).success,
            ).toBe(true);
        },
    );

    it("từ chối hướng di chuyển sai và trường dư", () => {
        expect(
            moveItineraryEntityRequestSchema.safeParse({
                direction: "left",
            }).success,
        ).toBe(false);
        expect(
            moveItineraryEntityRequestSchema.safeParse({
                direction: "up",
                unknown: true,
            }).success,
        ).toBe(false);
    });
});

describe("itinerary day schemas", () => {
    it("tạo ngày với description mặc định", () => {
        expect(
            createItineraryDayRequestSchema.parse({
                dayNumber: 1,
                title: "  Ngày đầu tiên  ",
            }),
        ).toEqual({
            dayNumber: 1,
            title: "Ngày đầu tiên",
            description: null,
        });
    });

    it.each([
        { dayNumber: 0, title: "Ngày đầu" },
        { dayNumber: 1, title: "A" },
        {
            dayNumber: 1,
            title: "Ngày đầu",
            description: "A".repeat(5001),
        },
        {
            dayNumber: 1,
            title: "Ngày đầu",
            unknown: true,
        },
    ])("từ chối create day sai: %o", (input) => {
        expect(
            createItineraryDayRequestSchema.safeParse(input).success,
        ).toBe(false);
    });

    it("từ chối update day rỗng và chấp nhận null", () => {
        expect(
            updateItineraryDayRequestSchema.safeParse({}).success,
        ).toBe(false);
        expect(
            updateItineraryDayRequestSchema.parse({
                description: null,
            }),
        ).toEqual({
            description: null,
        });
    });
});
