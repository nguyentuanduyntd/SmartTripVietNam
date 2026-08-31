import {
    describe,
    expect,
    it,
} from "vitest";

import {
    adminStoryIdParamSchema,
    adminStoryListQuerySchema,
    deleteAdminStorySchema,
} from "@/src/schemas/admin-story.schema";

const STORY_ID =
    "550e8400-e29b-41d4-a716-446655440080";
const LOCATION_ID =
    "550e8400-e29b-41d4-a716-446655440081";

describe("adminStoryListQuerySchema", () => {
    it("thêm query mặc định", () => {
        expect(adminStoryListQuerySchema.parse({})).toEqual({
            query: "",
            status: "all",
            locationId: "",
            page: 1,
            pageSize: 10,
        });
    });

    it("trim tìm kiếm và coerce phân trang", () => {
        expect(
            adminStoryListQuerySchema.parse({
                query: "  chuyến đi Huế  ",
                status: "approved",
                locationId: LOCATION_ID,
                page: "2",
                pageSize: "25",
            }),
        ).toEqual({
            query: "chuyến đi Huế",
            status: "approved",
            locationId: LOCATION_ID,
            page: 2,
            pageSize: 25,
        });
    });

    it.each(["all", "pending", "approved", "hidden"])(
        "chấp nhận trạng thái %s",
        (status) => {
            expect(
                adminStoryListQuerySchema.safeParse({ status })
                    .success,
            ).toBe(true);
        },
    );

    it.each([
        { query: "A".repeat(121) },
        { status: "deleted" },
        { locationId: "invalid-id" },
        { page: 0 },
        { page: "1.5" },
        { pageSize: 4 },
        { pageSize: 51 },
    ])("từ chối query sai: %o", (query) => {
        expect(
            adminStoryListQuerySchema.safeParse(query).success,
        ).toBe(false);
    });
});

describe("adminStoryIdParamSchema", () => {
    it("chấp nhận story UUID", () => {
        expect(
            adminStoryIdParamSchema.parse({
                storyId: STORY_ID,
            }),
        ).toEqual({
            storyId: STORY_ID,
        });
    });

    it("từ chối storyId sai định dạng", () => {
        expect(
            adminStoryIdParamSchema.safeParse({
                storyId: "invalid-id",
            }).success,
        ).toBe(false);
    });
});

describe("deleteAdminStorySchema", () => {
    it("trim lý do xóa hợp lệ", () => {
        expect(
            deleteAdminStorySchema.parse({
                reason: "  Nội dung vi phạm tiêu chuẩn  ",
            }),
        ).toEqual({
            reason: "Nội dung vi phạm tiêu chuẩn",
        });
    });

    it.each([
        "",
        "   ",
        "Xóa",
        "A".repeat(501),
    ])("từ chối lý do xóa không hợp lệ", (reason) => {
        expect(
            deleteAdminStorySchema.safeParse({ reason }).success,
        ).toBe(false);
    });
});
