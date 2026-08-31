import {
    beforeAll,
    describe,
    expect,
    it,
    vi,
} from "vitest";
import {
    sql,
} from "drizzle-orm";

vi.mock("server-only", () => ({}));

type Database = typeof import("@/src/db")["db"];
type GetAdminStats = typeof import(
    "@/src/services/admin-stats.service"
)["getAdminStats"];

const REQUIRED_ADMIN_STATS_TABLES = [
    "community_posts",
    "community_reports",
    "cuisines",
    "destinations",
    "post_destinations",
    "profiles",
] as const;

describe("PostgreSQL integration", () => {
    let db: Database;
    let getAdminStats: GetAdminStats;

    beforeAll(async () => {
        if (!process.env.DATABASE_URL?.trim()) {
            throw new Error(
                "DATABASE_URL is required for PostgreSQL integration tests",
            );
        }

        const databaseModule = await import("@/src/db");
        const adminStatsModule = await import(
            "@/src/services/admin-stats.service"
        );

        db = databaseModule.db;
        getAdminStats = adminStatsModule.getAdminStats;
    });

    it("kết nối PostgreSQL và thực hiện select 1", async () => {
        const rows = await db.execute<{ ok: number }>(
            sql`select 1::int as ok`,
        );

        expect(rows[0]?.ok).toBe(1);
    });

    it("có đầy đủ các bảng cần cho admin stats", async () => {
        const rows = await db.execute<{ tableName: string }>(sql`
            select table_name as "tableName"
            from information_schema.tables
            where table_schema = 'public'
              and table_name in (
                'community_posts',
                'community_reports',
                'cuisines',
                'destinations',
                'post_destinations',
                'profiles'
              )
        `);
        const actualTableNames = new Set(
            rows.map((row) => row.tableName),
        );

        expect(actualTableNames).toEqual(
            new Set(REQUIRED_ADMIN_STATS_TABLES),
        );
    });

    it("chạy toàn bộ truy vấn admin stats mà không đóng kết nối", async () => {
        const stats = await getAdminStats("2026-08");

        expect(stats.month).toBe("2026-08");
        expect(stats.previousMonth).toBe("2026-07");
        expect(stats.totals).toEqual({
            destinations: expect.any(Number),
            cuisines: expect.any(Number),
            stories: expect.any(Number),
            users: expect.any(Number),
        });
        expect(stats.timelines.users).toHaveLength(31);
        expect(stats.timelines.stories).toHaveLength(31);
        expect(Array.isArray(stats.topDestinations)).toBe(true);
        expect(Array.isArray(stats.mostReportedStories)).toBe(true);
        expect(Array.isArray(stats.statusDistribution)).toBe(true);
    });
});
