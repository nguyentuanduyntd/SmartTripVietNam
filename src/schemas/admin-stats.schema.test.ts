import {
    describe,
    expect,
    it,
} from "vitest";

import {
    adminStatsQuerySchema,
} from "@/src/schemas/admin-stats.schema";

describe("adminStatsQuerySchema", () => {
    it("chấp nhận query không truyền month", () => {
        const result =
            adminStatsQuerySchema.safeParse({});

        expect(result.success).toBe(true);
        expect(result.data).toEqual({});
    });

    it.each([
        "2026-01",
        "2026-08",
        "2026-12",
    ])("chấp nhận month hợp lệ: %s", (month) => {
        const result =
            adminStatsQuerySchema.safeParse({
                month,
            });

        expect(result.success).toBe(true);

        if (result.success) {
            expect(result.data.month).toBe(month);
        }
    });

    it.each([
        "",
        "2026",
        "2026-1",
        "2026-00",
        "2026-13",
        "26-08",
        "2026/08",
        "August-2026",
    ])("từ chối month không hợp lệ: %s", (month) => {
        const result =
            adminStatsQuerySchema.safeParse({
                month,
            });

        expect(result.success).toBe(false);
    });
});