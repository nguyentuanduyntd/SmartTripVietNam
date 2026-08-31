import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/src/repositories/admin-stats.repository", () => ({
    getAdminStatsData: vi.fn(),
}));

import {
    getAdminStatsData,
} from "@/src/repositories/admin-stats.repository";
import {
    getAdminStats,
} from "@/src/services/admin-stats.service";

const mockedGetAdminStatsData = vi.mocked(getAdminStatsData);

function createRepositoryData() {
    return {
        totals: {
            destinations: 10,
            cuisines: 20,
            stories: 30,
            users: 40,
        },
        monthly: {
            destinations: {
                current: 0,
                previous: 0,
            },
            cuisines: {
                current: 5,
                previous: 0,
            },
            stories: {
                current: 15,
                previous: 10,
            },
            users: {
                current: 5,
                previous: 10,
            },
            activeAuthors: {
                current: 2,
                previous: 3,
            },
        },
        timelines: {
            users: [
                {
                    day: "2026-08-01",
                    value: 2,
                },
                {
                    day: "2026-08-31",
                    value: 4,
                },
            ],
            stories: [
                {
                    day: "2026-08-15",
                    value: 3,
                },
            ],
        },
        topDestinations: [],
        mostReportedStories: [],
        statusDistribution: [],
    } satisfies Awaited<
        ReturnType<typeof getAdminStatsData>
    >;
}

describe("getAdminStats", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockedGetAdminStatsData.mockResolvedValue(
            createRepositoryData(),
        );
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("tính đúng tháng trước và khoảng ngày theo múi giờ Việt Nam", async () => {
        const result = await getAdminStats("2026-01");

        expect(result.month).toBe("2026-01");
        expect(result.previousMonth).toBe("2025-12");
        expect(mockedGetAdminStatsData).toHaveBeenCalledWith(
            {
                start: new Date("2026-01-01T00:00:00+07:00"),
                end: new Date("2026-02-01T00:00:00+07:00"),
            },
            {
                start: new Date("2025-12-01T00:00:00+07:00"),
                end: new Date("2026-01-01T00:00:00+07:00"),
            },
        );
    });

    it("tính đúng phần trăm tăng, giảm và trường hợp tháng trước bằng 0", async () => {
        const result = await getAdminStats("2026-08");

        expect(result.monthly.destinations.changePercent).toBe(0);
        expect(result.monthly.cuisines.changePercent).toBe(100);
        expect(result.monthly.stories.changePercent).toBe(50);
        expect(result.monthly.users.changePercent).toBe(-50);
        expect(result.monthly.activeAuthors.changePercent).toBe(-33.3);
    });

    it("điền đủ ngày còn thiếu trong timeline bằng giá trị 0", async () => {
        const result = await getAdminStats("2026-08");

        expect(result.timelines.users).toHaveLength(31);
        expect(result.timelines.stories).toHaveLength(31);
        expect(result.timelines.users[0]).toEqual({
            date: "2026-08-01",
            day: 1,
            value: 2,
        });
        expect(result.timelines.users[1]).toEqual({
            date: "2026-08-02",
            day: 2,
            value: 0,
        });
        expect(result.timelines.users[30]).toEqual({
            date: "2026-08-31",
            day: 31,
            value: 4,
        });
        expect(result.timelines.stories[14]).toEqual({
            date: "2026-08-15",
            day: 15,
            value: 3,
        });
    });

    it("tạo 29 ngày cho tháng 2 của năm nhuận", async () => {
        const result = await getAdminStats("2024-02");

        expect(result.previousMonth).toBe("2024-01");
        expect(result.timelines.users).toHaveLength(29);
        expect(result.timelines.users[28]).toEqual({
            date: "2024-02-29",
            day: 29,
            value: 0,
        });
    });

    it("dùng tháng hiện tại tại Việt Nam khi không truyền month", async () => {
        vi.useFakeTimers();
        vi.setSystemTime(
            new Date("2026-08-31T18:00:00.000Z"),
        );

        const result = await getAdminStats();

        expect(result.month).toBe("2026-09");
        expect(result.previousMonth).toBe("2026-08");
    });

    it("giữ nguyên totals và các danh sách xếp hạng từ repository", async () => {
        const repositoryData = createRepositoryData();
        mockedGetAdminStatsData.mockResolvedValueOnce(
            repositoryData,
        );

        const result = await getAdminStats("2026-08");

        expect(result.totals).toBe(repositoryData.totals);
        expect(result.topDestinations).toBe(
            repositoryData.topDestinations,
        );
        expect(result.mostReportedStories).toBe(
            repositoryData.mostReportedStories,
        );
        expect(result.statusDistribution).toBe(
            repositoryData.statusDistribution,
        );
    });

    it("truyền lỗi repository lên tầng gọi phía trên", async () => {
        const error = new Error("Database unavailable");
        mockedGetAdminStatsData.mockRejectedValueOnce(error);

        await expect(
            getAdminStats("2026-08"),
        ).rejects.toBe(error);
    });
});