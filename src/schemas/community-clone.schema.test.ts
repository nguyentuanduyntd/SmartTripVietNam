import {
    describe,
    expect,
    it,
} from "vitest";

import {
    cloneCommunityItinerarySchema,
} from "@/src/schemas/community-clone.schema";

const validClone = {
    startDate: "2026-09-01",
    adultCount: 2,
    childCount: 0,
    roomCount: 1,
};

describe("cloneCommunityItinerarySchema", () => {
    it("chấp nhận dữ liệu clone tối thiểu", () => {
        expect(
            cloneCommunityItinerarySchema.parse(validClone),
        ).toEqual(validClone);
    });

    it("trim tiêu đề tùy chỉnh", () => {
        expect(
            cloneCommunityItinerarySchema.parse({
                ...validClone,
                title: "  Lịch trình Huế của tôi  ",
            }).title,
        ).toBe("Lịch trình Huế của tôi");
    });

    it("chấp nhận các giá trị biên", () => {
        expect(
            cloneCommunityItinerarySchema.safeParse({
                ...validClone,
                adultCount: 30,
                childCount: 30,
                roomCount: 20,
            }).success,
        ).toBe(true);
    });

    it.each([
        {
            patch: { startDate: "01/09/2026" },
            reason: "ngày sai định dạng",
        },
        {
            patch: { title: "   " },
            reason: "tiêu đề rỗng",
        },
        {
            patch: { title: "A".repeat(201) },
            reason: "tiêu đề quá dài",
        },
        {
            patch: { adultCount: 0 },
            reason: "không có người lớn",
        },
        {
            patch: { adultCount: 31 },
            reason: "quá 30 người lớn",
        },
        {
            patch: { childCount: -1 },
            reason: "số trẻ em âm",
        },
        {
            patch: { childCount: 31 },
            reason: "quá 30 trẻ em",
        },
        {
            patch: { roomCount: 0 },
            reason: "không có phòng",
        },
        {
            patch: { roomCount: 21 },
            reason: "quá 20 phòng",
        },
        {
            patch: { roomCount: 1.5 },
            reason: "số phòng không nguyên",
        },
    ])("từ chối clone khi $reason", ({ patch }) => {
        expect(
            cloneCommunityItinerarySchema.safeParse({
                ...validClone,
                ...patch,
            }).success,
        ).toBe(false);
    });

    it("từ chối trường dư", () => {
        expect(
            cloneCommunityItinerarySchema.safeParse({
                ...validClone,
                sourceId: "unknown",
            }).success,
        ).toBe(false);
    });
});
